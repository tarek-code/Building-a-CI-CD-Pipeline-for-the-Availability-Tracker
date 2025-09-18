# Availability Tracker – End‑to‑End Guide (App + CI/CD)

This repository contains a small Express (Node.js) application used to track team availability, plus a complete local CI/CD workflow using Bash, Docker, Docker Compose, and Jenkins. This README explains the project goals, how to run it, what each file does, and how the pipeline works.

If you only need the TL;DR:
- Run locally with Docker Compose: `docker compose up -d --build`
- App: http://localhost:3000
- History is stored in Redis under key `history` (file write is best‑effort)

---

## 1. Project Overview

- Purpose: Provide a simple UI for setting weekly availability for a list of team members.
- Frontend: Static web app loaded from `public/` and seed data in `input/*.json`.
- Backend: Express server (`server.js`) that serves content and persists changes primarily in Redis (`history` key). A best‑effort file write to `output/history.json` is kept for local visibility.
- CI/CD: Bash script (`ci.sh`) and a Jenkins pipeline (`Jenkinsfile`) to run code quality checks, tests, build the Docker image, and run the stack via Docker Compose.

---

## 2. Files and Directories – What Each Does

Root
- Dockerfile: Builds the application image (multi‑stage). Copies `public/` and `input/` into the image; the runtime starts `server.js`.
- Dockerfile.jenkins: Custom Jenkins image (Node 20, Docker CLI & Compose, AWS CLI, Terraform, Ansible, npm tools) to run the pipeline inside Jenkins reliably.
- docker-compose.yml: Defines the local stack:
  - `app` (the Express service),
  - `redis` (for storing history)
- Jenkinsfile: Declarative pipeline. Stages:
  1) Checkout,
  2) Install Dependencies,
  3) Code Quality (Prettier/ESLint/Stylelint/HTMLHint),
  4) Tests (Jest/Supertest),
  5) Docker Build,
  6) Docker Compose Deploy.
- package.json: Scripts and dependencies (express). Dev dependencies: jest, supertest, prettier, eslint, stylelint, htmlhint.
- ci.sh: Idempotent Bash CI helper (optional alternative to Jenkins). Installs tools if needed, runs format/lint/tests, builds the image, and brings stack up.
- eslint.config.mjs: ESLint configuration (Node + browser where needed). Adds Jest globals for `*.test.js` / `*.spec.js`.
- LICENSE: Project license.
- README.md: Step‑by‑step setup guide and notes.

Server and tests
- server.js: Express server.
  - Serves UI from `public/` (and seed data from `input/`).
  - Explicit `GET /` route serves `public/index.html`.
- `POST /save-history` writes history to Redis and best‑effort to `output/history.json` (pretty‑printed JSON).
- server.unit.test.js: Unit tests for `saveHistoryToFile` and `readHistoryFromFile`.
- server.integration.test.js: Integration tests for `GET /`, `POST /save-history`, and 404s.

Frontend and data
- public/
  - index.html: App UI (table of names × days with status selectors).
  - script.js: Renders data, loads `/input/*.json`, saves via `/save-history`.
  - styles.css: Base styles and status color classes.
- input/
  - names.json: Team list (id + name).
  - selection.json: Available weeks.
  - status.json: Allowed statuses (e.g., Empty, Office, Remote, …).
- output/
  - history.json: Saved history (bind‑mounted so it persists; also mirrored to Redis).

Runtime data
- redis_volume/: Host directory attached to the Redis container for durable storage (AOF/RDB) when enabled.

Supporting config
- .prettierrc, .htmlhintrc, .stylelintrc.json, .gitignore: Format/lint rules and ignores.

---

## 3. How It Works (High‑Level)

```
Browser  ⇄  Express (server.js)
            ├─ GET /, serves public/index.html
            ├─ GET /input/*.json (seed data)
            ├─ GET /output/history.json (reads from Redis; falls back to file)
            └─ POST /save-history → write to Redis (and best‑effort file)

Redis (key: history)
```

- The UI loads names/weeks/status lists from `input/` and renders a table.
- When you click Save, the UI consolidates changes and posts them to `/save-history`.
- The server writes primarily to Redis; it also writes a best‑effort file `output/history.json` for convenience.

---

## 4. Run Locally (Docker Compose)

Requirements: Docker and Docker Compose.

```bash
docker compose up -d --build
# App: http://localhost:3000
```

Check Redis value (optional):
```bash
docker exec -it availability-redis redis-cli GET history
```

Bring down the stack:
```bash
docker compose down
```

---

## 5. CI/CD – Two Options

Option A: Bash script (`ci.sh`)
- Run code formatting check (`prettier --check`).
- Run linters (ESLint, Stylelint, HTMLHint).
- Run unit + integration tests (Jest/Supertest).
- Build Docker image and start stack with Docker Compose.

```bash
bash ci.sh
```

Option B: Jenkins
- Use the provided `Dockerfile.jenkins` to run Jenkins with Docker permissions.
- Pipeline (`Jenkinsfile`) mirrors the same steps as `ci.sh`:
  - Checkout → Quality checks → Tests → Docker build → Compose up

Example Jenkins container run:
```bash
docker run -d --name jenkins-custom \
  --privileged --user root \
  -p 9090:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins-custom:latest
```

If you need a public webhook for GitHub on a local machine, use ngrok:
```bash
ngrok http 9090
```

---

## 6. Code Quality & Tests

Formatting
- Prettier:
  - `npm run format` (write) / `npm run format:check` (read‑only)

Linting
- ESLint (JS), Stylelint (CSS), HTMLHint (HTML):
  - `npm run lint` runs all three

Tests
- Jest + Supertest:
  - `npm run test:unit` (unit)
  - `npm run test:integration` (integration)

ESLint and Jest
- `eslint.config.mjs` marks `**/*.test.js` and `**/*.spec.js` with Jest globals so `describe/test/expect` are recognized.

---

## 7. Troubleshooting

“Cannot GET /”
- Ensure `public/index.html` is present in the container (the image bakes `public/`).
- An explicit `/` route exists in the server.
- Check that a host bind mount isn’t shadowing `public/` with an empty folder.

UI table blank
- Confirm `/input/names.json`, `/input/selection.json`, `/input/status.json` return 200.
- If running under Jenkins, prefer baking `input/` into the image or ensure the compose mounts point to the correct absolute path and have proper permissions.

Distroless vs shell
- The production base can be distroless (no shell). For debugging, a Node Alpine runtime is used to allow `sh`/inspection.

Jenkins can’t access Docker
- Run Jenkins container with `--privileged --user root` and mount `/var/run/docker.sock`.

SELinux host
- If mounts appear empty in containers, add `:z` to bind mounts (e.g., `./output:/app/output:z`).

---

## 8. Tasks vs Outcomes (Checklist)

- Set up the project (clone, `.gitignore`, dependencies)
- CI script `ci.sh` runs: format/lint/tests → build → compose up
- Dockerfile builds a small, reproducible app image
- Compose runs app + Redis
- Jenkins pipeline mirrors CI script (optional)
- (Optional) Terraform stub for infra simulation

---

## 9. Run Without Docker (Dev Only)

```bash
npm install
npm start
# http://localhost:3000
```

Note: The Compose stack is the recommended way to ensure the Redis integration and sync behavior.

---

## 10. Appendix – Key Commands

Update Node on CentOS (example used during setup):
```bash
yum remove -y nodejs npm
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
npm install
```

Basic Docker commands:
```bash
docker compose up -d --build
docker compose down
```

Jenkins webhook via ngrok:
```bash
ngrok http 9090
```

---

## 11. License

See LICENSE.
