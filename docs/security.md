# Security

Production credentials are environment-only. Database URLs, Better Auth credentials and TURN credentials are represented by names in `.env.example`; real values must come from deployment configuration.

The live-preview OAuth client secret is intentionally absent from source control. Enabling preview auth requires `GROK_AUTH_CLIENT_SECRET` to be supplied by the deployment environment.

Android app discovery uses an explicit `MAIN` + `LAUNCHER` package-visibility query and does not request `QUERY_ALL_PACKAGES`.

Native package names and external URL schemes are validated before Android launch operations. Unexpected WebRTC data-channel message types are ignored before application callbacks.
