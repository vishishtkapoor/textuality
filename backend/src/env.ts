import type { Context } from "hono";

// Reads config from whichever platform the app runs on:
// - AWS Lambda exposes env vars via process.env
// - Cloudflare Workers expose bindings via c.env
export function getEnv(c: Context, key: string): string {
    const binding = (c.env as Record<string, string> | undefined)?.[key];
    return binding || process.env[key] || "";
}
