import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionContext,
  formatSessionSummary,
  isPrivacySensitiveCommand,
  isRepeatableCommand,
  recordSessionFileResults,
  recordSessionTurn,
  resolveSessionReference,
} from "./session-context.ts";

test("repeat resolves only when a safe previous command exists", () => {
  const context = recordSessionTurn(createSessionContext(), "open settings", "open settings", { id: "settings", name: "Settings" });
  assert.deepEqual(resolveSessionReference("again", context), { status: "ready", command: "open settings", resolved: true });
  assert.equal(resolveSessionReference("again", createSessionContext()).status, "ambiguous");
});

test("side-effecting and privacy-sensitive commands are never replayed", () => {
  assert.equal(isPrivacySensitiveCommand("sms +998901234567 hello"), true);
  assert.equal(isPrivacySensitiveCommand("files delete content://private/item confirm"), true);
  assert.equal(isRepeatableCommand("files delete content://private/item confirm"), false);
  const context = recordSessionTurn(createSessionContext(), "sms +998901234567 secret text", "sms +998901234567 secret text");
  assert.equal(context.lastCommand, undefined);
  assert.equal(context.lastCommandWasSensitive, true);
  assert.equal(resolveSessionReference("again", context).status, "ambiguous");
});

test("last app resolves only to one explicitly remembered app", () => {
  const context = recordSessionTurn(createSessionContext(), "open settings", "open settings", { id: "settings", name: "Settings" });
  const resolved = resolveSessionReference("open that app", context);
  assert.equal(resolved.status, "ready");
  assert.equal(resolved.command, 'open "Settings"');
  assert.equal(resolveSessionReference("open that app", createSessionContext()).status, "ambiguous");
});

test("previous file resolves only when a read-only query found one file", () => {
  const base = createSessionContext();
  const one = recordSessionFileResults(base, "files find report", ["FILES VERIFIED", "PDF · report.pdf · 12 bytes · content://provider/document/one"]);
  assert.equal(one.lastFileCount, 1);
  assert.equal(resolveSessionReference("files share previous file", one).command, "files share content://provider/document/one");
  const many = recordSessionFileResults(base, "files list", [
    "TXT · a.txt · content://provider/document/a",
    "PDF · b.pdf · content://provider/document/b",
  ]);
  const ambiguous = resolveSessionReference("files delete previous file confirm", many);
  assert.equal(ambiguous.status, "ambiguous");
  assert.match(ambiguous.message ?? "", /2 candidate files/);
});

test("file references are not retained from destructive file commands", () => {
  const context = recordSessionFileResults(createSessionContext(), "files delete content://provider/document/a confirm", [
    "DELETE VERIFIED content://provider/document/a",
  ]);
  assert.equal(context.lastFileUri, undefined);
  assert.equal(context.lastFileCount, 0);
});

test("session summary does not reveal scoped file URIs or sensitive command text", () => {
  let context = recordSessionTurn(createSessionContext(), "email private@example.com private subject", "email private@example.com private subject");
  context = recordSessionFileResults(context, "files find report", ["PDF · report.pdf · content://private/secret"]);
  const summary = formatSessionSummary(context).join("\n");
  assert.equal(summary.includes("private@example.com"), false);
  assert.equal(summary.includes("content://private/secret"), false);
  assert.match(summary, /privacy-sensitive/);
});

test("empty and unrelated commands do not resolve by guessing", () => {
  const context = recordSessionTurn(createSessionContext(), "device", "device");
  assert.equal(resolveSessionReference("the previous file", context).status, "ambiguous");
  assert.equal(resolveSessionReference("hello world", context).command, "hello world");
});
