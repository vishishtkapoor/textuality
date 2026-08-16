import { handle } from "hono/aws-lambda";
import app from "./index";

// AWS Lambda entry point (API Gateway HTTP API, payload v2)
export const handler = handle(app);
