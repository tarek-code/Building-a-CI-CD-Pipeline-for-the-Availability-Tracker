# Project Files Overview

This document explains each file and directory in the repository and its role in the system.

## Root files
- Dockerfile: Builds the application image (multi-stage). Copies `public/` and `input/` into the image and sets the runtime to start the Express server.
- Dockerfile.jenkins: Custom Jenkins image with Node.js, Docker CLI, Docker Compose, AWS CLI, Terraform, Ansible, and global npm tools for CI/CD.
- docker-compose.yml: Orchestrates services: the app (`availability-tracker`), Redis (`availability-redis`), and the history sync sidecar. Exposes ports and mounts `output/` for persistence.
- Jenkinsfile: Declarative Jenkins pipeline. Stages: Checkout → Install Dependencies → Code Quality (Prettier/ESLint/Stylelint/HTMLHint) → Tests (Jest/Supertest) → Docker Build → Docker Compose Deploy.
- package.json: Node.js package manifest. Scripts for formatting, linting, tests, and app start; declares dependencies and devDependencies.
- package-lock.json: Auto-generated lockfile for exact dependency versions (npm).
- LICENSE: License for the project.
- README.md: Main documentation for setup, architecture, CI/CD and troubleshooting.
- ci.sh: Standalone CI helper script (idempotent). Installs tools if missing, runs format/lint/tests, builds image, and starts the stack via docker-compose.
- eslint.config.mjs: ESLint configuration (Node + browser where needed). Includes Jest globals for `*.test.js` files.

## Server and tests
- server.js: Express server.
  - Serves static UI from `public/` and seed JSON from `input/`.
  - Explicit `GET /` route serves `public/index.html`.
  - `POST /save-history` persists the consolidated history to `output/history.json`.
- server.unit.test.js: Unit tests for file persistence functions (`saveHistoryToFile`, `readHistoryFromFile`).
- server.integration.test.js: Integration tests for Express endpoints (`GET /`, `POST /save-history`, unknown route 404).

## Frontend and data
- public/: Static frontend assets served by Express.
  - index.html: App UI shell.
  - script.js: Renders table, loads JSON from `/input/*`, saves via `/save-history`.
  - styles.css: UI styles and status color classes.
- input/: Seed data consumed by the frontend.
  - names.json: List of team members (ids and names).
  - selection.json: Available weeks/periods.
  - status.json: Allowed status values (e.g., Empty, Office, Remote, etc.).
- output/: Persistent app state.
  - history.json: Saved availability history (bind-mounted so changes persist across container restarts and are accessible to the sync sidecar).

## CI/CD and runtime services
- redis_volume/: Host directory used by Redis container for durable storage (AOF/RDB).
- history-sync (service in docker-compose): A small process based on `redis:alpine` that watches `output/history.json` and the Redis `history` key to sync changes both ways.

## Supporting/config files
- .htmlhintrc: Rules for HTMLHint.
- .stylelintrc.json: Rules for Stylelint (CSS).
- .prettierrc: Rules for Prettier formatting.
- .gitignore: VCS ignores (node_modules, build artifacts, etc.).

## How the pieces fit together
1) The frontend (public/) loads seed data from `/input/*.json`, renders the weekly availability table, and posts edited history to `/save-history`.
2) The server (server.js) writes the JSON to `output/history.json` and serves the UI and data endpoints.
3) Redis stores a canonical copy of the history for durability and integration needs.
4) The history-sync sidecar mirrors changes between the file and Redis in both directions.
5) The Jenkins pipeline builds the image and brings up the stack with Docker Compose, running quality checks and tests before deploy.

## Common edits
- Add/remove people: edit `input/names.json`.
- Change weeks: edit `input/selection.json`.
- Add a new status: edit `input/status.json` and ensure a corresponding CSS class exists in `public/styles.css`.
- Reset history: clear or edit `output/history.json` (the sidecar will propagate to Redis).
