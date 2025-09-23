terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.3.0"
    }
  }
}

provider "google" {
  project = "konecta-task-1-hands-on"
  region  = "us-central1"
  zone    = "us-central1-a"
}

# Redis
resource "google_redis_instance" "my_redis" {
  name           = "my-redis"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = "us-central1"
}

# Cloud Run Service
resource "google_cloud_run_service" "my_service" {
  name     = "teamavail-cloudrun-service"
  location = "us-central1"

  template {
    metadata {
      annotations = {
        "run.googleapis.com/vpc-access-connector" = "projects/konecta-task-1-hands-on/locations/us-central1/connectors/run-to-redis"
        "run.googleapis.com/vpc-access-egress"    = "all-traffic"
      }
    }
    spec {
      timeout_seconds = 300

      containers {
        image = "docker.io/tarekadel/teamavail:latest"
        env {
          name  = "REDIS_URL"
          value = "redis://${google_redis_instance.my_redis.host}:${google_redis_instance.my_redis.port}"
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Allow unauthenticated access (optional)
resource "google_cloud_run_service_iam_member" "noauth" {
  service  = google_cloud_run_service.my_service.name
  location = google_cloud_run_service.my_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
