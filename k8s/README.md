# Kubernetes (Minikube) Deployment

This directory contains the necessary files to deploy the Gym Application on Minikube.

## Steps to Deploy

### 1. Start Minikube
```bash
minikube start
minikube addons enable ingress
```

### 2. Generate Self-Signed Certificate
Run the following commands to create a self-signed certificate for `gym.local`:

```bash
# Generate key and cert
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=gym.local/O=gym"

# Create the secret in Kubernetes
kubectl create secret tls gym-tls-secret \
  --key tls.key \
  --cert tls.crt \
  -n gym-app
```

### 3. Apply Kubernetes Files
```bash
kubectl apply -f base.yaml
kubectl apply -f db.yaml
kubectl apply -f app.yaml
kubectl apply -f ingress.yaml
```

### 4. Update Hosts File
Add the following line to your `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
```text
<minikube-ip> gym.local
```
*(Get `<minikube-ip>` by running `minikube ip`)*

### 5. Access the App
Open your browser and navigate to `https://gym.local`. You will see a security warning due to the self-signed certificate; you can safely click "Advanced -> Proceed".

## Note on Image
Make sure to update the image name in `app.yaml` to point to your GHCR image or build the image locally in Minikube:
```bash
eval $(minikube docker-env)
docker build -t gym:latest .
```
(Then update `app.yaml` to use `gym:latest` and set `imagePullPolicy: UnlessPresent`)
