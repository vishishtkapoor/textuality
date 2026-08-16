output "api_url" {
  description = "Backend API base URL (API Gateway)"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (for running migrations)"
  value       = aws_db_instance.postgres.address
}

output "frontend_bucket" {
  description = "S3 bucket holding the frontend build"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_domain" {
  description = "Live frontend URL"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}
