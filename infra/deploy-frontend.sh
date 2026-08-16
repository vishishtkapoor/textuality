#!/usr/bin/env bash
# Builds the frontend against the live API Gateway URL and deploys to S3+CloudFront.
# Run after `terraform apply` has finished.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/infra"

# Prefer the repo-local terraform binary if present
TF="${ROOT}/infra/bin/terraform"
[ -x "$TF" ] || TF="terraform"

API_URL="$($TF output -raw api_url)"
BUCKET="$($TF output -raw frontend_bucket)"
DIST_ID="$($TF output -raw cloudfront_distribution_id)"
DOMAIN="$($TF output -raw cloudfront_domain)"

cd "$ROOT/frontend"
echo "▶ building frontend (VITE_BACKEND_URL=$API_URL)"
VITE_BACKEND_URL="$API_URL" npm run build

echo "▶ uploading to s3://$BUCKET"
aws s3 sync dist/ "s3://$BUCKET" --delete

echo "▶ invalidating CloudFront cache"
aws cloudfront create-invalidation \
    --distribution-id "$DIST_ID" \
    --paths "/*" \
    --output text --query 'Invalidation.Status'

echo "✅ live at https://$DOMAIN"
