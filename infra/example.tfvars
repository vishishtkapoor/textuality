# Copy this file to terraform.tfvars and fill in your values:
#   cp example.tfvars terraform.tfvars

region            = "ap-south-1"          # change to your preferred AWS region
db_username       = "postgres"
db_password       = "CHANGE_ME_strong_password"
jwt_secret        = "CHANGE_ME_run_openssl_rand_-base64_32"
frontend_bucket_name = "textuality-frontend"  # must be globally unique
