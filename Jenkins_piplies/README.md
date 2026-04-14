# Gym Application CI/CD Pipeline

Welcome to the CI/CD pipeline documentation for the Gym Application. This guide is designed to be easily copied to **Notion** or any other internal knowledge base tool. It covers the pipeline architecture, steps, and how notifications, logs, and artifacts are handled.

---

## 🏗 Pipeline Overview

This project uses a declarative Jenkins pipeline (`Jenkinsfile`) to automate the CI/CD process. The pipeline ensures code quality, scans for security vulnerabilities, runs tests, and builds/pushes Docker images to Docker Hub.

### ⚙️ Environment Variables
The following environment variables are predefined in the pipeline for consistency:
- `NODE_VERSION`: NodeJS 25
- Database configurations (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_PASS`)
- Application secrets (`JWT_SECRET`, `NODE_ENV = 'test'`)

---

## 🚀 Pipeline Stages

1. **Checkout**: Pulls the latest source code from the repository.
2. **Debug Info**: Prints useful Git branch, commit, and workspace information to the Jenkins logs.
3. **Install Dependencies**: Executes `npm ci` using NodeJS 25.
4. **Lint**: Runs `npm run lint` to enforce code styling and formatting.
5. **Security Scans (Parallel execution)**:
   - **Gitleaks**: Scans the repository for hardcoded secrets and credentials.
   - **Trivy**: Scans the filesystem for vulnerable dependencies and misconfigurations.
   - **njsscan**: Runs a Static Application Security Testing (SAST) tool optimized for Node.js.
6. **Test**: 
   - Spins up a temporary PostgreSQL Docker container (`postgres:17-alpine`).
   - Runs tests and generates a test coverage report (`npm run test:cov`).
   - Cleans up the database container after tests finish.
7. **Build & Push Docker Image**:
   - Only triggers on `main` or `master` branches.
   - Builds a Docker image tagged with the short Git commit hash and `latest`.
   - Logs into Docker Hub using configured Jenkins credentials (`dockerhub-credentials`).
   - Pushes the images to Docker Hub.

---

## 📦 Artifacts & Logs Collection

A dedicated stage at the end of the pipeline automatically executes the `collectLogsAndArtifacts()` function. 

### What it collects:
- **Code Coverage Reports**: Retrieves anything under the `coverage/` directory generated during the testing phase.
- **Pipeline Summary Log**: Generates a quick text file summary containing Git information (`pipeline_summary.log`) and archives it.

*Archived artifacts can be easily downloaded directly from the Jenkins UI for each build.*

---

## 🔔 Notifications

Notifications provide immediate feedback to the DevOps and engineering teams whenever a build finishes. This is handled by the `sendNotification(buildStatus)` function.

The pipeline triggers notifications on:
- **Success** ✅
- **Failure** ❌
- **Aborted** ⚠️

### How to Enable Notifications
By default, the notification function simply logs the status to the Jenkins console. You can enable actual Slack or Email integrations by uncommenting the relevant sections in the `Jenkinsfile` and ensuring the appropriate Jenkins plugins are installed:

- **For Slack:**
  1. Install the [Slack Notification Plugin](https://plugins.jenkins.io/slack/) in Jenkins.
  2. Configure your workspace and credentials in Jenkins System Config.
  3. Uncomment the `slackSend` line in the `sendNotification` function and set up the Slack webhook URL.

- **For Email:**
  1. Install the [Email Extension Plugin](https://plugins.jenkins.io/email-ext/) in Jenkins.
  2. Configure SMTP settings in Jenkins System Config.
  3. Uncomment the `emailext` block and update the `to:` field with your team's distribution email address.

---

## 🔧 Prerequisites for Jenkins

To ensure this pipeline runs smoothly, verify the following are configured on your Jenkins server:
- **NodeJS Installation**: Configured as `NodeJS 25` in *Global Tool Configuration*.
- **Docker**: Jenkins runner must have Docker installed and permissions to run containers (`docker run`, `docker build`).
- **Credentials**: Add a username/password credential with the ID `dockerhub-credentials` for Docker Hub authentication.
