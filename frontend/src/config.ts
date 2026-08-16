// Set VITE_BACKEND_URL at build time to point at a specific backend.
// Defaults to the AWS API Gateway (set via deploy-frontend.sh).
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://iko8kowogg.execute-api.ap-south-1.amazonaws.com";
