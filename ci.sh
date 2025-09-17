#!/bin/bash
set -e

# ==============================
# Helper functions
# ==============================

function command_exists() {
  command -v "$1" >/dev/null 2>&1
}

function install_npm_package() {
  PACKAGE=$1
  if ! npm list -g "$PACKAGE" >/dev/null 2>&1; then
    echo "Installing $PACKAGE globally..."
    npm install -g "$PACKAGE"
  else
    echo "$PACKAGE is already installed globally."
  fi
}

function install_docker() {
  if ! command_exists docker; then
    echo "Docker not found. Installing..."
    # Example for Ubuntu
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker "$USER"
  else
    echo "Docker already installed."
  fi
}

function install_docker_compose() {
  if ! command_exists docker-compose; then
    echo "Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.28.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
  else
    echo "Docker Compose already installed."
  fi
}

# ==============================
# Step 1: Install tools if missing (idempotent)
# ==============================

echo "Checking required tools..."

# Install global tools if missing
install_npm_package "eslint"
install_npm_package "prettier"
install_npm_package "stylelint"
install_npm_package "htmlhint"
install_docker
install_docker_compose

# Install dev dependencies if missing
if [ ! -d "node_modules" ]; then
  echo "Installing npm dependencies..."
  npm install
else
  echo "Dependencies already installed."
fi

# Initialize ESLint config if missing
if [ ! -f ".eslintrc.js" ] && [ ! -f ".eslintrc.json" ] && [ ! -f "eslint.config.mjs" ]; then
  echo "Initializing ESLint configuration..."
  npx eslint --init --yes
else
  echo "ESLint configuration already exists."
fi

# Install Jest and Supertest if missing
if ! npm list jest >/dev/null 2>&1; then
  echo "Installing Jest and Supertest..."
  npm install --save-dev jest supertest
else
  echo "Jest and Supertest already installed."
fi

echo "All required tools are installed."

# ==============================
# Step 2: Code formatting and linting (idempotent)
# ==============================

echo "Running code quality checks..."

# Run format check (read-only, idempotent)
echo "Checking code formatting with Prettier..."
npm run format:check

# Run linting checks
echo "Running ESLint..."
npm run lint:js

echo "Running Stylelint..."
npm run lint:css

echo "Running HTMLHint..."
npm run lint:html

echo "All code quality checks passed."

# ==============================
# Step 3: Run tests (idempotent)
# ==============================

echo "Running Unit and Integration Tests in parallel..."
npm run test:unit & 
npm run test:integration &
wait

echo "All tests completed."

# ==============================
# Step 4: Build Docker image
# ==============================

IMAGE_NAME="teamavail-app:latest"

echo "Building Docker image..."
docker build -t $IMAGE_NAME .

# ==============================
# Step 5: Start application with Docker Compose
# ==============================

echo "Starting application with Docker Compose..."
docker-compose up -d --build

echo "CI script completed successfully!"
