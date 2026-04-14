{{/*
  ═══════════════════════════════════════════════════════════════════
   _helpers.tpl — Gym Helm Chart Helper Templates
   All templates are prefixed with "gym." to avoid collisions.
  ═══════════════════════════════════════════════════════════════════
*/}}

{{/*
  Expand the chart name.
*/}}
{{- define "gym.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
  Create a fully-qualified app name.
  Truncated to 63 chars (DNS label limit).
*/}}
{{- define "gym.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
  Chart label: name-version.
*/}}
{{- define "gym.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
  Common labels — applied to every resource so `helm uninstall` cleans up.
*/}}
{{- define "gym.labels" -}}
helm.sh/chart: {{ include "gym.chart" . }}
{{ include "gym.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: gym
{{- end }}

{{/*
  Selector labels — used in matchLabels + pod template labels.
  MUST be stable across upgrades (never include Chart version).
*/}}
{{- define "gym.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gym.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
  App-component selector labels (for the Node.js application).
*/}}
{{- define "gym.app.selectorLabels" -}}
{{ include "gym.selectorLabels" . }}
app.kubernetes.io/component: app
{{- end }}

{{/*
  DB-component selector labels (for the PostgreSQL database).
*/}}
{{- define "gym.db.selectorLabels" -}}
{{ include "gym.selectorLabels" . }}
app.kubernetes.io/component: db
{{- end }}

{{/*
  ServiceAccount name — overridable via .Values.serviceAccount.name.
*/}}
{{- define "gym.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "gym.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
  Image reference helper — produces "repository:tag".
*/}}
{{- define "gym.app.image" -}}
{{- printf "%s:%s" .Values.app.image.repository (.Values.app.image.tag | toString) }}
{{- end }}

{{- define "gym.db.image" -}}
{{- printf "%s:%s" .Values.db.image.repository (.Values.db.image.tag | toString) }}
{{- end }}
