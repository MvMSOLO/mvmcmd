import { createFileRoute } from "@tanstack/react-router";

function env(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env[name];
  return value?.trim() || undefined;
}

export const Route = createFileRoute("/api/rtc/config")({
  server: {
    handlers: {
      GET: async () => {
        const urls = env("TURN_URLS")?.split(",").map((v) => v.trim()).filter(Boolean) ?? [];
        const username = env("TURN_USERNAME");
        const credential = env("TURN_CREDENTIAL");
        const iceServers: Array<{ urls: string[]; username?: string; credential?: string }> = [
          { urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
        ];
        if (urls.length && username && credential) {
          iceServers.push({ urls, username, credential });
        }
        return Response.json(
          { iceServers },
          { headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } },
        );
      },
    },
  },
});
