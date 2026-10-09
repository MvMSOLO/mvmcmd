import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedShareMime, isSafeDesktopFileUrl, isSafeFilename, isSafeScopedContentUri,
  isSafeShareText, redactExternalTarget, sanitizeDiagnosticText, sanitizeZipEntryName,
  validateExternalTarget,
} from "./security-policy.ts";
import { isPrivacySensitiveCommand } from "./session-context.ts";
import { resolveBridge } from "./app-bridge.ts";
import { normalizeGlobalEntry } from "./global-entry-points.ts";

test("external target policy uses a closed URI scheme allowlist", () => {
  assert.equal(validateExternalTarget("https://example.com/path", "url").ok, true);
  assert.equal(validateExternalTarget("http://127.0.0.1:8080/", "url").ok, true);
  assert.equal(validateExternalTarget("javascript:alert(1)", "url").ok, false);
  assert.equal(validateExternalTarget("data:text/html,hello", "deeplink").ok, false);
  assert.equal(validateExternalTarget("intent://scan/#Intent;scheme=zxing;end", "deeplink").ok, false);
  assert.equal(validateExternalTarget("file:///etc/passwd", "url").ok, false);
  assert.equal(validateExternalTarget("customapp://open/secret", "deeplink").ok, false);
});
test("HTTP URLs reject embedded credentials, controls, whitespace and oversize input", () => {
  assert.equal(validateExternalTarget("https://user:pass@example.com/", "url").ok, false);
  assert.equal(validateExternalTarget("https://example.com/\r\nX:evil", "url").ok, false);
  assert.equal(validateExternalTarget("https://example.com/some path", "url").ok, false);
  assert.equal(validateExternalTarget("https://example.com/" + "a".repeat(2100), "url").ok, false);
  assert.equal(validateExternalTarget("https://", "url").ok, false);
});
test("explicit communication deep links are syntax-checked", () => {
  assert.equal(validateExternalTarget("tel:+998901234567", "deeplink").ok, true);
  assert.equal(validateExternalTarget("sms:+12025550123", "deeplink").ok, true);
  assert.equal(validateExternalTarget("tel:555-abc", "deeplink").ok, false);
  assert.equal(validateExternalTarget("mailto:hello@example.com", "deeplink").ok, true);
  assert.equal(validateExternalTarget("mailto:bad-address", "deeplink").ok, false);
});
test("scoped content URI validation rejects private paths and malformed authorities", () => {
  assert.equal(isSafeScopedContentUri("content://com.android.externalstorage.documents/tree/primary%3ADownload"), true);
  assert.equal(isSafeScopedContentUri("content://provider/document/one"), true);
  assert.equal(isSafeScopedContentUri("content://provider/document/../secret"), false);
  assert.equal(isSafeScopedContentUri("content://provider/data/private"), false);
  assert.equal(isSafeScopedContentUri("content://provider/primary%3AAndroid%2Fdata%2Fsecrets"), false);
  assert.equal(isSafeScopedContentUri("content://user:pass@provider/document/one"), false);
  assert.equal(isSafeScopedContentUri("file:///data/private"), false);
  assert.equal(isSafeScopedContentUri("content:///document/one"), false);
  assert.equal(isSafeScopedContentUri("content://provider/" + "x".repeat(2100)), false);
});
test("desktop file URLs require a local file scheme and reject sensitive system folders", () => {
  assert.equal(isSafeDesktopFileUrl("file:///C:/Users/demo/report%20draft.pdf"), true);
  assert.equal(isSafeDesktopFileUrl("https://example.com/report.pdf"), false);
  assert.equal(isSafeDesktopFileUrl("file://remotehost/share/report.pdf"), false);
  assert.equal(isSafeDesktopFileUrl("file:///C:/Windows/System32/config.pdf"), false);
  assert.equal(isSafeDesktopFileUrl("file:///C:/Users/demo/../Windows/System32/secret.pdf"), false);
});
test("share input and MIME validation enforce explicit supported data", () => {
  assert.equal(isAllowedShareMime("application/pdf"), true);
  assert.equal(isAllowedShareMime("application/x-msdownload"), false);
  assert.equal(isAllowedShareMime(undefined), true);
  assert.equal(isSafeShareText("review this file"), true);
  assert.equal(isSafeShareText("x".repeat(4001)), false);
  assert.equal(isSafeShareText("secret\u0000payload"), false);
});
test("filename and ZIP entry policies block traversal and bound provider names", () => {
  for (const bad of ["", ".", "..", "../secret.txt", "nested/name.txt", "C:\\secret.txt", "NUL", "bad\u0000name", "trailing."]) {
    assert.equal(isSafeFilename(bad), false, bad);
  }
  assert.equal(isSafeFilename("report-final.pdf"), true);
  assert.equal(sanitizeZipEntryName("../secret.txt", 2), "__secret.txt");
  assert.equal(sanitizeZipEntryName("folder\\payload.txt", 1), "folder_payload.txt");
  assert.equal(sanitizeZipEntryName("..", 4), "file-4");
  assert.ok(sanitizeZipEntryName("x".repeat(300), 0).length <= 180);
});
test("diagnostic redaction avoids leaking tokens, email, phone and URIs", () => {
  const value = sanitizeDiagnosticText("request failed token=abc123 owner@example.com +998901234567 at content://provider/private/1");
  assert.doesNotMatch(value, /abc123|owner@example\.com|998901234567|content:\/\/provider/i);
  assert.match(value, /\[redacted\]/);
  assert.match(value, /\[email\]/);
  assert.match(value, /\[URI\]/);
  assert.ok(sanitizeDiagnosticText("x".repeat(2000)).length <= 280);
});
test("bridge display targets hide private query values and phone numbers", () => {
  assert.equal(redactExternalTarget("https://example.com/path?token=supersecret"), "https://example.com");
  assert.equal(redactExternalTarget("tel:+998901234567"), "tel:[number hidden]");
  assert.equal(redactExternalTarget("mailto:private@example.com"), "mailto:[address hidden]");
});
test("privacy-sensitive commands include secret-bearing URLs and are not safe to repeat", () => {
  assert.equal(isPrivacySensitiveCommand("link https://example.com/?access_token=secret-value"), true);
  assert.equal(isPrivacySensitiveCommand("sms +998901234567 secret text"), true);
  assert.equal(isPrivacySensitiveCommand("email private@example.com private subject"), true);
  assert.equal(isPrivacySensitiveCommand("open YouTube"), false);
});
test("bridge rejects arbitrary schemes and malicious payloads before dispatch", () => {
  for (const target of ["javascript:alert(1)", "data:text/html,x", "intent://open", "customapp://run", "file:///private/secret.pdf"]) {
    assert.equal(resolveBridge({kind:"url",target,platform:"android"}).ok, false, target);
  }
  assert.equal(resolveBridge({kind:"url",target:"https://user:pass@example.com",platform:"android"}).ok, false);
  assert.equal(resolveBridge({kind:"url",target:"https://example.com/ok",platform:"android"}).ok, true);
  assert.equal(resolveBridge({kind:"share",target:"share",text:"x",fileUri:"content://provider/document/one",mime:"application/pdf",platform:"android"}).ok, true);
  assert.equal(resolveBridge({kind:"share",target:"share",fileUri:"content://provider/document/one",platform:"android"}).ok, false);
  assert.equal(resolveBridge({kind:"share",target:"share",text:"x",mime:"application/x-msdownload",platform:"android"}).ok, false);
});
test("external-entry normalizer rejects control chars, malformed links and oversized share text", () => {
  assert.equal(normalizeGlobalEntry({available:true,id:"1",source:"desktop",kind:"open-file",uri:"file:///C:/Windows/System32/secret.pdf"}), undefined);
  assert.equal(normalizeGlobalEntry({available:true,id:"2",source:"android",kind:"open-file",uri:"content://provider/document/../secret"}), undefined);
  assert.equal(normalizeGlobalEntry({available:true,id:"3",source:"android",kind:"share-text",text:"x".repeat(5000)}), undefined);
  assert.equal(normalizeGlobalEntry({available:true,id:"4",source:"android",kind:"share-text",text:"ok\u0000hidden"}), undefined);
});

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const desktopSecurity = require("../../../desktop/security.cjs");

test("desktop security helpers restrict origins, protocols and local file paths", () => {
  assert.equal(desktopSecurity.isTrustedLocalOrigin("http://127.0.0.1:8123/", "http://127.0.0.1:8123"), true);
  assert.equal(desktopSecurity.isTrustedLocalOrigin("http://127.0.0.1:8124/", "http://127.0.0.1:8123"), false);
  assert.equal(desktopSecurity.isTrustedLocalOrigin("https://127.0.0.1:8123/", "http://127.0.0.1:8123"), false);
  assert.equal(desktopSecurity.isSafeExternalWebUrl("https://example.com/path"), true);
  assert.equal(desktopSecurity.isSafeExternalWebUrl("javascript:alert(1)"), false);
  assert.equal(desktopSecurity.isSafeExternalWebUrl("https://user:password@example.com"), false);
  assert.equal(desktopSecurity.isSafeLocalFileUrl("file:///C:/Users/demo/report.pdf"), true);
  assert.equal(desktopSecurity.isSafeLocalFileUrl("file://remotehost/share/report.pdf"), false);
  assert.equal(desktopSecurity.isSafeLocalFileUrl("file:///C:/Users/demo/../Windows/System32/secret.pdf"), false);
  assert.equal(desktopSecurity.isSafeLocalFileUrl("file:///C:/Windows/System32/config.pdf"), false);
});

test("release hardening review: sensitive-data backup is off and exported Android components are guarded", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const root = resolve(process.cwd());
  const manifest = readFileSync(resolve(root, "android/app/src/main/AndroidManifest.xml"), "utf8");
  const launcher = readFileSync(resolve(root, "android/app/src/main/java/com/mvmcmd/launcher/MvmLauncherPlugin.java"), "utf8");
  const filePlugin = readFileSync(resolve(root, "android/app/src/main/java/com/mvmcmd/launcher/MvmFileToolsPlugin.java"), "utf8");
  const electronMain = readFileSync(resolve(root, "desktop/main.cjs"), "utf8");
  assert.match(manifest, /android:allowBackup="false"/);
  const exportedServices = [...manifest.matchAll(/<service\b[^>]*android:exported="true"[^>]*>/gs)].map((match) => match[0]);
  assert.ok(exportedServices.length >= 3);
  for (const tag of exportedServices) assert.match(tag, /android:permission="android\.permission\.BIND_/);
  const exportedActivities = [...manifest.matchAll(/<activity\b[^>]*android:exported="true"[^>]*>/gs)].map((match) => match[0]);
  assert.equal(exportedActivities.length, 1);
  assert.match(exportedActivities[0], /android:name="\.MainActivity"/);
  assert.match(launcher, /isAllowedExternalUri\(url\)/);
  assert.match(launcher, /Decision must be allow or skip/);
  assert.match(filePlugin, /safeZipEntryName/);
  assert.match(filePlugin, /isSafeScopedContentUri/);
  assert.match(electronMain, /assertTrustedIpcSender/);
  assert.match(electronMain, /X-Content-Type-Options/);
  assert.match(electronMain, /webSecurity: true/);
});
