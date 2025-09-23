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