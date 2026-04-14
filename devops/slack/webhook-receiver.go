// ═══════════════════════════════════════════════════════════════════════════
//  Slack Interactive Webhook Receiver — Go implementation (Option B)
//
//  Why Go instead of Python?
//    • Single self-contained binary — no virtualenv, no pip, no runtime deps
//    • Statically linked → minimal Docker image (~5 MB scratch/distroless)
//    • Standard library only — no external frameworks needed
//    • Goroutines replace Python threading with less overhead
//    • Fast startup time — important for short-lived sidecar containers
//
//  Flow:
//    1. User clicks Approve/Reject in Slack
//    2. Slack POSTs to this server at POST /slack/actions
//    3. Server validates X-Slack-Signature (HMAC-SHA256 + replay guard)
//    4. Server returns HTTP 200 immediately (Slack 3-second rule)
//    5. Goroutine: calls Jenkins /wfapi/pendingInputActions → gets input ID
//    6. Goroutine: POSTs to Jenkins input proceed/abort endpoint
//    7. Goroutine: posts threaded Slack reply with decision confirmation
//
//  Environment variables (injected via Kubernetes Secret — no plaintext):
//    SLACK_SIGNING_SECRET  — from Slack App settings (HMAC validation)
//    JENKINS_URL           — e.g. http://jenkins.jenkins.svc.cluster.local:8080
//    JENKINS_USER          — Jenkins API user
//    JENKINS_TOKEN         — Jenkins API token
//    SLACK_BOT_TOKEN       — Slack Bot OAuth token (for threaded reply)
//    CD_JOB_NAME           — Jenkins CD job name (default: gym-cd)
//    PORT                  — listening port (default: 5000)
//
//  Build:
//    go build -ldflags="-s -w" -o webhook-receiver ./webhook-receiver.go
//
//  Docker (distroless — zero CVE surface):
//    FROM golang:1.22-alpine AS builder
//    WORKDIR /app
//    COPY webhook-receiver.go .
//    RUN go build -ldflags="-s -w" -o webhook-receiver .
//
//    FROM gcr.io/distroless/static-debian12
//    COPY --from=builder /app/webhook-receiver /webhook-receiver
//    EXPOSE 5000
//    ENTRYPOINT ["/webhook-receiver"]
// ═══════════════════════════════════════════════════════════════════════════

package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// ── Config ─────────────────────────────────────────────────────────────────

type Config struct {
	SlackSigningSecret string
	JenkinsURL         string
	JenkinsUser        string
	JenkinsToken       string
	SlackBotToken      string
	CDJobName          string
	Port               string
}

func loadConfig() Config {
	cfg := Config{
		SlackSigningSecret: mustEnv("SLACK_SIGNING_SECRET"),
		JenkinsURL:         strings.TrimRight(mustEnv("JENKINS_URL"), "/"),
		JenkinsUser:        mustEnv("JENKINS_USER"),
		JenkinsToken:       mustEnv("JENKINS_TOKEN"),
		SlackBotToken:      mustEnv("SLACK_BOT_TOKEN"),
		CDJobName:          envOr("CD_JOB_NAME", "gym-cd"),
		Port:               envOr("PORT", "5000"),
	}
	return cfg
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("FATAL: required environment variable %q is not set", key)
	}
	return v
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ── Slack payload types ────────────────────────────────────────────────────

// BlockAction is the relevant subset of a Slack block_actions payload.
type BlockAction struct {
	Type    string `json:"type"`
	User    struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"user"`
	Channel struct {
		ID string `json:"id"`
	} `json:"channel"`
	Message struct {
		Ts string `json:"ts"`
	} `json:"message"`
	Actions []struct {
		ActionID string `json:"action_id"`
		Value    string `json:"value"`
	} `json:"actions"`
}

// ── Jenkins API types ──────────────────────────────────────────────────────

// PendingInputAction is returned by Jenkins /wfapi/pendingInputActions.
type PendingInputAction struct {
	ID string `json:"id"`
}

// ── HMAC signature validation ──────────────────────────────────────────────

// validateSlackSignature verifies the HMAC-SHA256 X-Slack-Signature header.
// Rejects requests older than 5 minutes to prevent replay attacks.
// Reference: https://api.slack.com/authentication/verifying-requests-from-slack
func validateSlackSignature(secret, body, timestamp, signature string) bool {
	// Replay-attack guard: reject if request is older than 5 minutes
	ts, err := parseInt64(timestamp)
	if err != nil {
		log.Printf("WARN: invalid Slack timestamp %q: %v", timestamp, err)
		return false
	}
	if math.Abs(float64(time.Now().Unix()-ts)) > 300 {
		log.Printf("WARN: Slack request timestamp too old (%s) — possible replay attack", timestamp)
		return false
	}

	// Compute expected HMAC
	baseString := fmt.Sprintf("v0:%s:%s", timestamp, body)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(baseString))
	expected := "v0=" + hex.EncodeToString(mac.Sum(nil))

	// Constant-time comparison to prevent timing attacks
	return hmac.Equal([]byte(expected), []byte(signature))
}

func parseInt64(s string) (int64, error) {
	var n int64
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}

// ── Jenkins API helpers ────────────────────────────────────────────────────

// getPendingInputID calls /wfapi/pendingInputActions and returns the first
// pending input step ID for the given build number, or "" if none found.
func getPendingInputID(cfg Config, buildNumber string) string {
	apiURL := fmt.Sprintf(
		"%s/job/%s/%s/wfapi/pendingInputActions",
		cfg.JenkinsURL, cfg.CDJobName, buildNumber,
	)

	req, _ := http.NewRequest(http.MethodGet, apiURL, nil)
	req.SetBasicAuth(cfg.JenkinsUser, cfg.JenkinsToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("ERROR: Jenkins pendingInputActions GET failed: %v", err)
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("ERROR: Jenkins pendingInputActions returned %d", resp.StatusCode)
		return ""
	}

	var actions []PendingInputAction
	if err := json.NewDecoder(resp.Body).Decode(&actions); err != nil {
		log.Printf("ERROR: decoding pendingInputActions: %v", err)
		return ""
	}
	if len(actions) == 0 {
		return ""
	}
	return actions[0].ID
}

// resolveJenkinsInput posts APPROVE (proceed) or REJECT (abort) to the
// Jenkins Pipeline Input Step REST API.
func resolveJenkinsInput(cfg Config, buildNumber, inputID, decision, approver string) bool {
	var endpoint string
	if decision == "APPROVE" {
		endpoint = fmt.Sprintf(
			"%s/job/%s/%s/input/%s/proceed",
			cfg.JenkinsURL, cfg.CDJobName, buildNumber, inputID,
		)
	} else {
		endpoint = fmt.Sprintf(
			"%s/job/%s/%s/input/%s/abort",
			cfg.JenkinsURL, cfg.CDJobName, buildNumber, inputID,
		)
	}

	// Body: pipeline parameter map
	paramBody := map[string]interface{}{
		"parameter": []map[string]string{
			{"name": "DEPLOY_DECISION", "value": decision},
			{"name": "APPROVER_ID", "value": approver},
		},
	}
	bodyBytes, _ := json.Marshal(paramBody)

	req, _ := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	req.SetBasicAuth(cfg.JenkinsUser, cfg.JenkinsToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("ERROR: Jenkins input resolution failed: %v", err)
		return false
	}
	defer resp.Body.Close()

	ok := resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent
	log.Printf("INFO: Jenkins input resolved | build=%s decision=%s status=%d",
		buildNumber, decision, resp.StatusCode)
	return ok
}

// ── Slack helpers ──────────────────────────────────────────────────────────

// postSlackReply sends a threaded reply on the original approval message.
// Always uses the bot token from config — never hardcoded.
func postSlackReply(cfg Config, channelID, threadTS, text string) {
	payload := map[string]string{
		"channel":   channelID,
		"thread_ts": threadTS,
		"text":      text,
	}
	bodyBytes, _ := json.Marshal(payload)

	req, _ := http.NewRequest(
		http.MethodPost,
		"https://slack.com/api/chat.postMessage",
		bytes.NewReader(bodyBytes),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.SlackBotToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("ERROR: Slack reply failed: %v", err)
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	if ok, _ := result["ok"].(bool); !ok {
		log.Printf("WARN: Slack API replied with error: %v", result["error"])
	}
}

// ── HTTP handlers ──────────────────────────────────────────────────────────

// healthHandler serves GET /health — used by Kubernetes liveness/readiness probes.
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	io.WriteString(w, `{"status":"ok"}`)
}

// actionsHandler handles POST /slack/actions — the Slack interactive webhook.
func actionsHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// ── Read raw body (needed for HMAC validation) ──────────────────────
		rawBody, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1 MB limit
		if err != nil {
			log.Printf("ERROR: reading request body: %v", err)
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		// ── Validate Slack signature ────────────────────────────────────────
		timestamp := r.Header.Get("X-Slack-Request-Timestamp")
		signature := r.Header.Get("X-Slack-Signature")

		if timestamp == "" || signature == "" {
			log.Printf("WARN: missing Slack signature headers — request rejected")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if !validateSlackSignature(cfg.SlackSigningSecret, string(rawBody), timestamp, signature) {
			log.Printf("WARN: invalid Slack HMAC signature — request rejected (possible spoof)")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// ── Parse URL-encoded Slack payload ────────────────────────────────
		// Slack sends: payload=<url-encoded json>
		formValues, err := url.ParseQuery(string(rawBody))
		if err != nil {
			log.Printf("ERROR: parsing form body: %v", err)
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		payloadJSON := formValues.Get("payload")
		if payloadJSON == "" {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		var payload BlockAction
		if err := json.Unmarshal([]byte(payloadJSON), &payload); err != nil {
			log.Printf("ERROR: unmarshalling Slack payload: %v", err)
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		// ── Only handle block_actions ───────────────────────────────────────
		if payload.Type != "block_actions" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if len(payload.Actions) == 0 {
			w.WriteHeader(http.StatusOK)
			return
		}

		action := payload.Actions[0]
		actionID := action.ActionID
		actionValue := action.Value // format: "DECISION|BUILD_NUM|IMAGE_TAG"

		// Only handle our deploy actions
		if actionID != "deploy_approve" && actionID != "deploy_reject" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// ── Parse action value ──────────────────────────────────────────────
		parts := strings.SplitN(actionValue, "|", 3)
		if len(parts) != 3 {
			log.Printf("ERROR: malformed action value: %q", actionValue)
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}
		decision    := parts[0] // "APPROVE" or "REJECT"
		buildNumber := parts[1]
		imageTag    := parts[2]

		approverID   := payload.User.ID
		approverName := payload.User.Name
		channelID    := payload.Channel.ID
		msgTS        := payload.Message.Ts

		log.Printf("INFO: action received | action_id=%s decision=%s build=%s image=%s user=%s",
			actionID, decision, buildNumber, imageTag, approverName)

		// ── Return 200 immediately — Slack requires response within 3 seconds ─
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"response_action":"clear"}`))

		// ── Resolve Jenkins asynchronously ────────────────────────────────────
		go func() {
			inputID := getPendingInputID(cfg, buildNumber)
			if inputID == "" {
				log.Printf("ERROR: no pending input found for build %s", buildNumber)
				postSlackReply(cfg, channelID, msgTS,
					fmt.Sprintf(
						"⚠️ Could not find a pending approval for build `#%s`. "+
							"It may have already timed out or been resolved.",
						buildNumber,
					),
				)
				return
			}

			approverFull := fmt.Sprintf("%s/%s", approverID, approverName)
			success := resolveJenkinsInput(cfg, buildNumber, inputID, decision, approverFull)

			if success {
				emoji := "✅"
				if decision == "REJECT" {
					emoji = "🚫"
				}
				postSlackReply(cfg, channelID, msgTS,
					fmt.Sprintf(
						"%s *Deployment %sD* by `%s` for `gym:%s` (Build #%s)\n"+
							"⚠️ _This action is final — the pipeline will %s immediately._",
						emoji, decision, approverName, imageTag, buildNumber,
						map[string]string{"APPROVE": "proceed with deployment", "REJECT": "halt"}[decision],
					),
				)

				// Audit log — structured so it can be parsed by log aggregators
				log.Printf(
					"AUDIT | decision=%s | build=%s | image_tag=%s | approver_id=%s | approver_name=%s | ts=%s",
					decision, buildNumber, imageTag, approverID, approverName,
					time.Now().UTC().Format(time.RFC3339),
				)
			} else {
				postSlackReply(cfg, channelID, msgTS,
					fmt.Sprintf(
						"⚠️ Failed to forward `%s` to Jenkins for build `#%s`. "+
							"Please check Jenkins logs or resolve manually.",
						decision, buildNumber,
					),
				)
			}
		}()
	}
}

// ── Main ───────────────────────────────────────────────────────────────────

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.LUTC | log.Lmsgprefix)
	log.SetPrefix("[webhook-receiver] ")

	cfg := loadConfig()

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/slack/actions", actionsHandler(cfg))

	addr := ":" + cfg.Port
	log.Printf("INFO: Slack webhook receiver starting | port=%s job=%s jenkins=%s",
		cfg.Port, cfg.CDJobName, cfg.JenkinsURL)

	server := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("FATAL: server exited: %v", err)
	}
}
