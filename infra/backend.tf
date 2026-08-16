# --- Lambda execution role -----------------------------------------------
resource "aws_iam_role" "lambda_exec" {
  name = "textuality-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_exec" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Backend function (built by ./build-lambda.sh) -------------------------
resource "aws_lambda_function" "backend" {
  function_name    = "textuality-backend"
  filename         = "${path.module}/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda.zip")
  handler          = "dist/index.handler"
  runtime          = "nodejs20.x"
  architectures    = ["x86_64"]
  timeout          = 30
  memory_size      = 256
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      DATABASE_URL = "postgresql://${var.db_username}:${urlencode(var.db_password)}@${aws_db_instance.postgres.address}:5432/medium"
      JWT_SECRET   = var.jwt_secret
    }
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/aws/lambda/textuality-backend"
  retention_in_days = 7
}

# --- API Gateway (HTTP API, payload v2) -----------------------------------
resource "aws_apigatewayv2_api" "http" {
  name          = "textuality-http"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
