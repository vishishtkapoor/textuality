# AWS Infrastructure (Terraform)

Provisions the entire textuality backend + hosting on AWS:

- **RDS** PostgreSQL database (db.t4g.micro)
- **Lambda** function running the Hono backend (Node 20, x86_64)
- **API Gateway** HTTP API in front of Lambda (with CORS)
- **S3 + CloudFront** serving the React frontend

## One-time setup

1. **Install the AWS CLI** (already installed) and create an **IAM user**:
   - AWS console → IAM → Users → Create user → attach the policy in `iam-policy.json`
     (or simply `AdministratorAccess` for convenience).
   - Create an **access key** for that user.
   - `aws configure` — enter the Access Key ID / Secret Access Key and your region.
2. **Build the Lambda package**:
   ```bash
   ./build-lambda.sh
   ```
3. **Fill in variables**:
   ```bash
   cp example.tfvars terraform.tfvars
   # edit terraform.tfvars — db_password, jwt_secret, frontend_bucket_name
   ```

## Deploy

```bash
terraform init
terraform apply        # review the plan, then type "yes"
```

Outputs (also printed by `terraform output`):

| Output | What it is |
|---|---|
| `api_url` | Backend API base URL |
| `rds_endpoint` | Database host (for migrations) |
| `cloudfront_domain` | Live frontend URL |
| `frontend_bucket` | S3 bucket holding the frontend |

## Apply the database migration

From `backend/`:

```bash
DATABASE_URL="postgresql://<db_username>:<db_password>@<rds_endpoint>:5432/medium" npx prisma migrate deploy
```

## Deploy the frontend

```bash
./deploy-frontend.sh   # builds with VITE_BACKEND_URL=api_url, syncs S3, invalidates CloudFront
```

## Updating the backend later

```bash
./build-lambda.sh   # re-bundle + re-zip
terraform apply     # detects the new zip hash and updates Lambda
```

## Tearing everything down

```bash
terraform destroy
```

> ⚠️ The RDS database is **publicly accessible** for simplicity. Lock it down later
> (private subnets + RDS Proxy, or restrict the security group) once you're comfortable.
