/**
 * Shared LIVE-PREVIEW OAuth configuration (server-only).
 *
 * Preview OAuth credentials are deployment configuration and are never stored
 * in source control. Supply GROK_AUTH_CLIENT_ID / GROK_AUTH_CLIENT_SECRET
 * through the server environment when preview auth is enabled.
 */

const env = (key: string): string | undefined =>
  typeof process !== "undefined" ? process.env[key]?.trim() || undefined : undefined;

export const PREVIEW_CLIENT_ID = env("GROK_AUTH_CLIENT_ID") ?? "grok_preview";
export const PREVIEW_CLIENT_SECRET = env("GROK_AUTH_CLIENT_SECRET") ?? "";

export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;
