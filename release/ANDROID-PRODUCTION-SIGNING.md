# MVMCMD — Android Production Signing Runbook

**Status: PIPELINE PREPARED; first signed release NOT RUN.** CI must never be used to create, reveal, or commit a signing key. The signed-release workflow runs only when manually dispatched from `main`, after the candidate review has been merged.

## Required repository secrets

Create these secrets in GitHub repository settings under **Settings → Secrets and variables → Actions → New repository secret**:

- `ANDROID_KEYSTORE_BASE64` — Base64-encoded private keystore file.
- `ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `ANDROID_KEY_ALIAS` — the key alias inside the keystore.
- `ANDROID_KEY_PASSWORD` — key password.

Never put the keystore, raw Base64 string, passwords, or key alias secret value into a commit, issue, pull-request comment, chat message, or build log. The workflow reads the Base64 value from a secret, writes the keystore to the ephemeral hosted runner with restrictive permissions, and attempts to delete it at the end of the job.

## Create and protect a key

Generate a dedicated upload/release keystore on a trusted local machine using the JDK `keytool`. Let `keytool` prompt for the passwords interactively; do not put the passwords directly in the command line.

```bash
keytool -genkeypair -v -keystore mvmcmd-production.jks -alias mvmcmd-release -keyalg RSA -keysize 4096 -validity 10000
```

Keep an encrypted offline backup of the keystore and its credentials in a separate secure location. Losing the key can prevent future updates if the same signing identity is required. Do not reuse a personal or unrelated application's key. Check the distribution channel's current Android signing requirements before publishing.

Encode the keystore without printing the secret to terminal logs. Linux/macOS:

```bash
base64 < mvmcmd-production.jks | tr -d '\n' > mvmcmd-production.jks.base64
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\mvmcmd-production.jks")) | Set-Content -NoNewline ".\mvmcmd-production.jks.base64"
```

Copy the contents of the Base64 file directly into the `ANDROID_KEYSTORE_BASE64` GitHub secret field, then securely remove temporary copies after confirming an encrypted backup exists. Add the three password/alias secrets separately. Do not use Actions variables for secret values.

## Run and verify

1. Merge the reviewed release-candidate branch into `main`; the workflow intentionally refuses to sign a non-`main` ref.
2. Confirm all four repository secrets exist and correspond to the same keystore.
3. Open **Actions → Build Signed Android Production APK → Run workflow** on `main`.
4. The workflow restores and verifies the 17 original wallpaper assets, repeats typecheck/release metadata validation and a production-dependency-only audit, then builds `assembleRelease`. It verifies the exact wallpaper payload inside the APK, verifies the APK signature with `apksigner`, rejects a detected Android debug certificate, and prints both the signing-certificate SHA-256 and APK SHA-256 in the Actions summary.
5. Download only the artifact from a successful run. Retain the source commit, artifact SHA-256, certificate digest, and review approval with the release record.

## Evidence boundary

This workflow has **not** produced a signed release yet because repository secret configuration and a reviewed merge are not available from this coding session. A debug APK is not a production-signed APK. Signing success also does not constitute privacy/legal approval, physical-device qualification, Play Console approval, or permission to publish marketing claims.
