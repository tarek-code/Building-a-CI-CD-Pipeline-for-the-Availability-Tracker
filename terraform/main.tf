terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.3.0"
    }
  }
}
provider "google" {
  project = "konecta task 1 hands on"
  region  = "us-central1"
  zone    = "us-central1-a"
}
