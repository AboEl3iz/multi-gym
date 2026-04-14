# Kubernetes (Minikube) Deployment

This directory contains the files needed to deploy the Gym Application on Minikube.

> [!IMPORTANT]
> **Windows + Docker Driver users**: Minikube runs inside Docker on Windows.
> The Minikube IP (`192.168.x.x`) is **not reachable** from your Windows browser.
> You MUST use `minikube tunnel` and point your hosts file to `127.0.0.1`.

---

## Step-by-Step Guide

### 1. Start Minikube and Enable Ingress
```powershell
minikube start --driver=docker
minikube addons enable ingress
```

### 2. Apply Kubernetes Manifests
```powershell
kubectl apply -f k8s/base.yaml
kubectl apply -f k8s/db.yaml
kubectl apply -f k8s/app.yaml
kubectl apply -f k8s/ingress.yaml
```

### 3. Verify All Pods Are Running
```powershell
kubectl get all -n gym-app
```
Wait until all pods show `STATUS: Running` before continuing.

### 4. Generate the Self-Signed TLS Certificate
Run in **Git Bash** or **WSL** (not PowerShell — `openssl` works best there):
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=gym.local/O=gym"
```
Then create the Kubernetes TLS secret:
```bash
kubectl create secret tls gym-tls-secret \
  --key tls.key --cert tls.crt \
  -n gym-app
```

### 5. Update Your Windows Hosts File (Run as Administrator)
Open **Notepad as Administrator** and edit:
```
C:\Windows\System32\drivers\etc\hosts
```
Remove any old `192.168.x.x gym.local` entry and add this line:
```
127.0.0.1 gym.local
```
Save the file.

### 6. Start Minikube Tunnel (Keep This Terminal Open)
Open a **new PowerShell window as Administrator** and run:
```powershell
minikube tunnel
```
> This command stays running in the foreground. It routes traffic from
> `127.0.0.1` into your Minikube cluster. Do not close this window.

### 7. Access the App
Open your browser and navigate to:
```
https://gym.local
```
You will see a browser security warning because the certificate is self-signed.
Click **Advanced → Proceed to gym.local (unsafe)**.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `https://gym.local` shows "This site can't be reached" | Make sure `minikube tunnel` is running in a separate Admin terminal |
| Hosts file shows `192.168.49.2` instead of `127.0.0.1` | Update hosts file (Step 5) — the old IP is not routable on Windows Docker driver |
| Pod stuck in `Pending` or `CrashLoopBackOff` | Run `kubectl describe pod -n gym-app <pod-name>` to see the error |
| Image pull error | Update image name in `app.yaml` to your Docker Hub image, e.g. `aboelaiz/gym:latest` |
| `gym-tls-secret` not found | Re-run Step 4 to generate and apply the TLS secret |

---

## Updating Your Local Build (Minikube Docker Env)
If you want to test local code changes without pushing to Docker Hub:
```powershell
# Point your shell's Docker to Minikube's internal Docker
minikube docker-env | Invoke-Expression

# Build the image directly inside Minikube
docker build -t aboelaiz/gym:latest .
```
Then restart the deployment to pick up the new image:
```powershell
kubectl rollout restart deployment/gym-app-deployment -n gym-app
```
