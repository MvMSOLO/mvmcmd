import assert from "node:assert/strict";
import test from "node:test";
import { createSessionContext, formatSessionSummary, isPrivacySensitiveCommand, isRepeatableCommand, recordSessionFileResults, recordSessionResult, recordSessionTurn, resolveSessionReference } from "./session-context.ts";

test("repeat resolves only when a safe previous command exists", () => {
  const ctx = recordSessionTurn(createSessionContext(), "open settings", "open settings", { id: "settings", name: "Settings" });
  assert.deepEqual(resolveSessionReference("again", ctx), { status: "ready", command: "open settings", resolved: true });
  assert.equal(resolveSessionReference("again", createSessionContext()).status, "ambiguous");
});
test("side-effecting and private commands are neither replayed nor retained", () => {
  assert.equal(isPrivacySensitiveCommand("sms +998901234567 hello"), true);
  assert.equal(isPrivacySensitiveCommand("files delete content://private/item confirm"), true);
  assert.equal(isPrivacySensitiveCommand("open someone@example.com"), true);
  assert.equal(isPrivacySensitiveCommand("files find content://provider/secret"), true);
  assert.equal(isPrivacySensitiveCommand("find event 2026-10-09"), false);
  assert.equal(isRepeatableCommand("files delete content://private/item confirm"), false);
  const ctx = recordSessionTurn(createSessionContext(), "sms +998901234567 secret text", "sms +998901234567 secret text");
  assert.equal(ctx.lastCommand, undefined);
  assert.equal(ctx.lastCommandWasSensitive, true);
  assert.equal(resolveSessionReference("again", ctx).status, "ambiguous");
});
test("app references resolve only to a uniquely remembered app", () => {
  const ctx = recordSessionTurn(createSessionContext(), "open settings", "open settings", { id: "settings", name: "Settings" });
  assert.equal(resolveSessionReference("open that app", ctx).command, 'open "Settings"');
  assert.equal(resolveSessionReference("open that app", createSessionContext()).status, "ambiguous");
});
test("previous file requires one result from a read-only scoped query", () => {
  const base = createSessionContext();
  const one = recordSessionFileResults(base, "files find report", ["FILES VERIFIED", "PDF · report.pdf · 12 bytes · content://provider/document/one"]);
  assert.equal(one.lastFileCount, 1);
  assert.equal(resolveSessionReference("files share previous file", one).command, "files share content://provider/document/one");
  const many = recordSessionFileResults(base, "files list", ["TXT · a.txt · content://provider/document/a", "PDF · b.pdf · content://provider/document/b"]);
  assert.equal(resolveSessionReference("files delete previous file confirm", many).status, "ambiguous");
});
test("stale async turns cannot overwrite newer result or file context", () => {
  let ctx = recordSessionTurn(createSessionContext(), "files find report", "files find report");
  const staleToken = ctx.turnId;
  ctx = recordSessionTurn(ctx, "device", "device");
  assert.equal(recordSessionFileResults(ctx, "files find report", ["content://private/secret"], staleToken).lastFileUri, undefined);
  assert.equal(recordSessionResult(ctx, "files find report", ["FILES VERIFIED"], staleToken).lastResultStatus, "none");
  assert.equal(ctx.lastFileUri, undefined);
  assert.equal(ctx.lastFileCount, 0);
});
test("destructive commands never become a remembered file reference", () => {
  const ctx = recordSessionFileResults(createSessionContext(), "files delete content://provider/document/a confirm", ["DELETE VERIFIED content://provider/document/a"]);
  assert.equal(ctx.lastFileUri, undefined);
  assert.equal(ctx.lastFileCount, 0);
});
test("session summaries hide raw sensitive data and file URIs", () => {
  let ctx = recordSessionTurn(createSessionContext(), "email private@example.com private subject", "email private@example.com private subject");
  ctx = recordSessionFileResults(ctx, "files find report", ["PDF · report.pdf · content://private/secret"]);
  const summary = formatSessionSummary(ctx).join("\n");
  assert.equal(summary.includes("private@example.com"), false);
  assert.equal(summary.includes("content://private/secret"), false);
  assert.match(summary, /privacy-sensitive/);
  assert.match(summary, /LAST RESULT/);
});
test("result summary records a status without retaining raw output", () => {
  const ctx = recordSessionTurn(createSessionContext(), "open settings", "open settings");
  const result = recordSessionResult(ctx, "open settings", ["LAUNCH Settings", "STARTED", "content://private/path"]);
  assert.equal(result.lastResultStatus, "started");
  assert.equal(formatSessionSummary(result).join("\n").includes("content://private/path"), false);
});
test("unknown references are not guessed", () => {
  const ctx = recordSessionTurn(createSessionContext(), "device", "device");
  assert.equal(resolveSessionReference("the previous file", ctx).status, "ambiguous");
  assert.equal(resolveSessionReference("hello world", ctx).command, "hello world");
});
