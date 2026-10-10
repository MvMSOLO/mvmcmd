import assert from "node:assert/strict";
import test from "node:test";
import { resolveBridge, runAppBridge, validateMime } from "./app-bridge.ts";

test("package targets resolve to the Android package bridge", () => {
  assert.deepEqual(
    resolveBridge({ kind: "launch", target: "com.example.app", platform: "android" }),
    { ok: true, method: "package" },
  );
});

test("invalid package names are rejected before dispatch", () => {
  assert.equal(
    resolveBridge({ kind: "launch", target: "not a package", platform: "android" }).ok,
    false,
  );
});

test("private file paths are never silently shareable", () => {
  const result = resolveBridge({
    kind: "share",
    target: "share",
    text: "x",
    fileUri: "/data/data/com.example/file.pdf",
    platform: "android",
    chooser: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /scoped grant/i);
});

test("content URIs are allowed for explicit scoped sharing", () => {
  const result = resolveBridge({
    kind: "share",
    target: "share",
    fileUri: "content://com.example.provider/file.pdf",
    mime: "application/pdf",
    platform: "android",
    chooser: true,
  });
  assert.deepEqual(result, { ok: true, method: "chooser" });
});

test("unsupported MIME types are rejected", () => {
  assert.equal(validateMime("application/x-executable").ok, false);
});

test("blocked URL schemes are rejected", () => {
  assert.equal(
    resolveBridge({ kind: "url", target: "javascript:alert(1)", platform: "android" }).ok,
    false,
  );
});

test("desktop custom deep links use a truthful fallback", () => {
  assert.deepEqual(
    resolveBridge({ kind: "deeplink", target: "myapp://open/item", platform: "desktop" }),
    { ok: true, method: "desktop-fallback" },
  );
});

test("external bridge completion remains STARTED, never VERIFIED", () => {
  const result = runAppBridge({
    kind: "url",
    target: "https://example.com",
    platform: "web",
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "started");
  assert.equal(result.verified, false);
});
