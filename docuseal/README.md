# DocuSeal

Electronic document signing application.

## Quick Start

1. **Start DocuSeal**:
   ```bash
   docker compose up -d
   ```

2. **Access**: http://localhost:3001

3. **Stop**:
   ```bash
   docker compose down
   ```

## Setup

1. Copy `.env.example` to `.env`
2. Update email settings in `.env`
3. Run `docker compose up -d`

## Email Configuration

For Gmail:
1. Enable 2-Factor Authentication
2. Generate App Password
3. Update `.env` with your email and app password 

# Railway Deployment Config
# Place this in your railway.toml

[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
# Wrap in bash -c to expand $PORT automatically
startCommand = "/bin/bash -c 'bin/rails server -b 0.0.0.0 -p $PORT'"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
healthcheckPath = "/"

Access your deployed app at: https://<your-app-name>.up.railway.app


## Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Logs
docker logs docuseal

# Status
docker ps
```
## Architecture Diagram

![DocuSeal Architecture](./assets/docuseal-architecture.png)

That's it! 🚀