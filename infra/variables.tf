variable "region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "db_username" {
  description = "Master username for the RDS PostgreSQL database"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Master password for the RDS PostgreSQL database (use a strong one!)"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret used to sign JWTs. Generate with: openssl rand -base64 32"
  type        = string
  sensitive   = true
}

variable "frontend_bucket_name" {
  description = "Globally unique S3 bucket name for the frontend build"
  type        = string
  default     = "textuality-frontend"
}
