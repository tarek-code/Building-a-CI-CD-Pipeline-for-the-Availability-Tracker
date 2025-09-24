# Availability Tracker

A Node.js web application for tracking team availability with Redis persistence and CI/CD pipeline.

## Directory Structure & File Details

### `/public/` - Frontend Web Files

Contains all client-side files served by Express server

- **`index.html`** - Main HTML page with form for selecting team members and their availability status
- **`script.js`** - JavaScript that handles form submissions, sends data to `/save-history` endpoint, loads saved data from `/output/history.json`
- **`styles.css`** - CSS styling for the web interface including status colors and responsive design

### `/input/` - Static Data Files

JSON configuration files used by the frontend

- **`names.json`** - Array of team member names displayed in dropdown menus
- **`selection.json`** - Available selection options for the form
- **`status.json`** - Status definitions with colors and labels (Office, Remote, Sick, etc.)

### `/terraform/` - Infrastructure as Code

Google Cloud Platform infrastructure definitions

- **`main.tf`** - Creates Memorystore Redis instance, VPC Access Connector for Cloud Run to reach Redis, Cloud Run service with Redis URL environment variable

### `/ansible/` - Configuration Management

Automation scripts for server setup

- **`playbook.yml`** - Ansible playbook that installs Docker on EC2 instances, updates packages, starts Docker service

### `/__mocks__/` - Test Utilities

Mock objects for testing

- **`redis.js`** - Mock Redis client used in unit tests to simulate Redis operations without actual Redis connection

### Root Directory Files

#### Core Application

- **`server.js`** - Main Express server that:
  - Serves static files from `/public/` and `/input/`
  - Handles POST `/save-history` - saves data to Redis (if available) and file
  - Handles GET `/output/history.json` - retrieves data from Redis or file fallback
  - Provides GET `/healthz` - health check endpoint for Cloud Run
  - Connects to Redis in background, doesn't block startup
- **`package.json`** - Node.js project configuration with dependencies (express, redis, body-parser) and npm scripts for testing, linting, formatting
- **`package-lock.json`** - Locked dependency versions for reproducible builds

#### Containerization

- **`Dockerfile`** - Multi-stage Docker build:
  - Builder stage: installs production dependencies
  - Runtime stage: copies built app, sets PORT=8080, exposes port 8080, runs `node server.js`
- **`docker-compose.yml`** - Local development setup:
  - `app` service: runs teamavail image on port 3000:8080 with Redis URL
  - `redis` service: Redis 7-alpine with persistent volume

#### Testing

- **`server.unit.test.js`** - Unit tests for `saveHistoryToFile()` and `readHistoryFromFile()` functions
- **`server.integration.test.js`** - Integration tests for Express routes (GET /, POST /save-history, 404 handling)

#### CI/CD Pipeline

- **`Jenkinsfile.cloud`** - Jenkins pipeline that:
  - Checks out code, installs dependencies
  - Runs code quality checks (ESLint, Stylelint, HTMLHint, Prettier)
  - Executes unit and integration tests
  - Builds Docker image, pushes to registry
  - Runs Terraform to deploy to GCP
- **`ci.sh`** - Shell script for CI operations (if used)

#### Infrastructure & Configuration

- **`terraform/main.tf`** - GCP resources:
  - `google_redis_instance` - Memorystore Redis instance
  - `google_vpc_access_connector` - VPC connector for Cloud Run to reach Redis
  - `google_cloud_run_service` - Cloud Run service with Redis URL and VPC annotations
  - `google_cloud_run_service_iam_member` - Public access permissions
- **`eslint.config.mjs`** - ESLint configuration for JavaScript code quality
- **`.stylelintrc.json`** - Stylelint configuration for CSS linting rules

## How It Works

1. **Local Development**: `docker-compose up` runs app on port 3000 with Redis
2. **Cloud Deployment**: Jenkins builds image, pushes to registry, Terraform deploys to Cloud Run with Memorystore Redis
3. **Data Persistence**: Saves to Redis when available, falls back to file storage
4. **VPC Access**: Cloud Run connects to Memorystore via VPC Access Connector

## Quick Start

```bash
# Local development
docker-compose up -d

# Access at http://localhost:3000
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `REDIS_URL` - Redis connection string (e.g., `redis://host:port`)
- `NODE_ENV` - Environment (production/development)

## What Happened When Starting This Project (Timeline & Fixes)

### Local Environment Setup (CentOS VM on VMware Workstation)
- First, I provisioned a VM running CentOS to host the project locally.
- Cloned the repository and ensured a proper `.gitignore` existed.

![1758734265373](image/1758734265373.png)

- Created a `.gitignore` (if missing):

![1758734463140](image/README/1758734463140.png)

- Installed required dependencies. Initially, `npm install` failed due to outdated Node.js and npm.

![1758734509187](image/README/1758734509187.png)

- Upgraded Node.js/npm:
```bash
sudo yum remove -y nodejs npm
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
npm --version && node --version
```
- Re-ran installation and started the app successfully:

![1758734597883](image/README/1758734597883.png)
![1758734621522](image/README/1758734621522.png)

### CI Script (ci.sh)
- Goal: Add formatting, linting, and tests to a single script.
- Formatter: Prettier (works for JS/HTML/CSS)
```bash
npm install --save-dev prettier
```
![1758734682796](image/README/1758734682796.png)
- Added Prettier config:
![1758734707444](image/README/1758734707444.png)
- package.json scripts:
```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{js,html,css,json}\"",
    "format:check": "prettier --check \"**/*.{js,html,css,json}\""
  }
}
```
![1758734720528](image/README/1758734720528.png)
- Usage:
```bash
npm run format:check
npm run format
npx prettier --write public/script.js
```
![1758734734040](image/README/1758734734040.png)

### Linting
- Linters: ESLint (JS), Stylelint (CSS), HTMLHint (HTML)
```bash
npm install --save-dev eslint stylelint stylelint-config-standard htmlhint
npx eslint --init
```
![1758734746098](image/README/1758734746098.png)
![1758734750748](image/README/1758734750748.png)
- Added config files:
![1758734763378](image/README/1758734763378.png)
- package.json scripts:
```json
{
  "scripts": {
    "lint:js": "eslint . --ext .js",
    "lint:css": "stylelint \"**/*.css\"",
    "lint:html": "htmlhint \"**/*.html\"",
    "lint": "npm run lint:js && npm run lint:css && npm run lint:html"
  }
}
```

### Unit & Integration Tests
- Test tools: Jest + Supertest
```bash
npm install --save-dev jest supertest
```
- package.json scripts:
```json
{
  "scripts": {
    "test:unit": "jest *.unit.test.js",
    "test:integration": "jest *.integration.test.js"
  }
}
```
- A background process was binding to port 3000. Identified and disabled it:
```bash
ps -fp <PID>
systemctl list-units | grep my_node_app
sudo systemctl status my_node_app
sudo systemctl stop my_node_app
```
- Ensured `server.js` aligns with tests; then ran:
```bash
npm run test:unit
npm run test:integration
```
![1758735267888](image/README/1758735267888.png)

- ESLint errors for Jest globals (describe/test/expect): added a Jest section to ESLint config:
```json
{
  "files": ["**/*.test.js", "**/*.spec.js"],
  "languageOptions": {
    "globals": {
      "...globals.node": true,
      "...globals.jest": true
    }
  }
}
```

### Docker and Jenkins
- Built Docker image and started via Compose.
- Created a custom Jenkins image to include all pipeline prerequisites.
- Ran Jenkins:
```bash
docker run -d \
  -p 9090:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins-custom:latest
```

#### Disk Space Issue (Resolved)
- Docker reported insufficient space. Extended the VM disk and resized the filesystem:
```bash
sudo fdisk /dev/sda
# Recreate/resize partition 2 as LVM (type 8E), write, then
sudo partprobe /dev/sda
lsblk
sudo pvresize /dev/sda2
sudo lvextend -l +100%FREE /dev/mapper/cs-root
sudo xfs_growfs /
df -h /
```
```
Filesystem           Size  Used Avail Use% Mounted on
/dev/mapper/cs-root   37G   17G   21G  46% /
```

- Relaunched Jenkins successfully:
```bash
docker run -d -p 9090:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins-custom:latest
```

#### GitHub Webhook (Local env via ngrok)
- Used ngrok to expose Jenkins locally for GitHub webhooks:
```bash
ngrok http 9090
```
![1758735780021](image/README/1758735780021.png)
![1758735815741](image/README/1758735815741.png)
![1758735828605](image/README/1758735828605.png)
![1758735836433](image/README/1758735836433.png)

- Set up a Jenkins pipeline (alternative to `ci.sh`). After running it, the project was available at localhost:8080.
![1758735924041](image/README/1758735924041.png)

### Cloud Deployment (GCP via Terraform)
- Wrote Terraform to provision:
  - Serverless VPC Access connector (to reach Memorystore from Cloud Run)
  - Memorystore (Redis) instance for persistence
  - Cloud Run service to host the container image
- Jenkins builds and pushes the Docker image, then runs Terraform to deploy infra.
![1758736453805](image/README/1758736453805.png)
- Enabled required GCP services (e.g., Redis API) before running the pipeline.
![1758736566206](image/README/1758736566206.png)
- Deployed resources (Redis + Cloud Run) via Terraform:
![1758736607904](image/README/1758736607904.png)
![1758736613280](image/README/1758736613280.png)
![1758736622162](image/README/1758736622162.png)
![1758736634750](image/README/1758736634750.png)
- Accessed the Cloud Run URL; data is saved in Redis.
![1758736666603](image/README/1758736666603.png)

### Key Issues and Resolutions (Recap)
- Cloud Run failed to become ready (PORT 8080):
  - Cause: Server attempted Redis connect during startup and bound only after success.
  - Fix: `server.js` now listens immediately on `0.0.0.0:${PORT}` and connects to Redis in the background; added `/healthz`.

- Container failed health checks due to PORT mismatch:
  - Cause: Cloud Run expects 8080; clarified app PORT logic and Dockerfile exposes 8080.
  - Fix: Ensure no custom PORT in Cloud Run; compose maps host 3000 → container 8080 for local use.

- Terraform used `REDIS_HOST`/`REDIS_PORT` (unused by app):
  - Fix: Switched to `REDIS_URL=redis://<memorystore-ip>:6379` in Cloud Run env.

- Cloud Run couldn’t reach Redis (private IP):
  - Cause: No Serverless VPC Access connector.
  - Fix: Added `google_vpc_access_connector` and Cloud Run annotations; ensured same region/network.

- VPC connector API/quotas/states:
  - Error: Connector required min/max instances; set `min_instances=2`, `max_instances=2`.
  - Error: Existing broken connector → 409/bad state.
  - Fix: Delete broken connector, recreate with non-overlapping `/28` range (e.g., `10.9.0.0/28`).

- IAM/API permissions during Terraform:
  - Error: `run.services.setIamPolicy` denied and Cloud Resource Manager API disabled.
  - Fix: Enable APIs (`run`, `vpcaccess`, `redis`, `cloudresourcemanager`) and grant roles to Jenkins SA (`run.admin`, `iam.serviceAccountUser`, `vpcaccess.user`).

- Local Docker Compose networking:
  - Updated compose to map host `3000:8080`; removed PORT env so app defaults to 8080.
  - Use `REDIS_URL=redis://redis:6379` to reach the Redis service.

- Lint/test issues:
  - ESLint `no-empty` fixed; CSS vendor prefixes simplified; tests passing (unit + integration).

With these fixes, local and cloud deployments run reliably, and data persists in Redis when `REDIS_URL` is configured.
