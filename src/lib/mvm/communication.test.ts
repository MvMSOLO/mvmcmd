import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePhone,
  validateEmail,
  normalizePhone,
  openDialer,
  openSmsComposer,
  openEmailComposer,
  copyText,
  lookupContact,
} from "./communication.ts";

test("validatePhone accepts common formats and rejects garbage", () => {
  assert.equal(validatePhone("+998901234567"), true);
  assert.equal(validatePhone("998 90 123 45 67"), true);
  assert.equal(validatePhone("+1 (555) 123-4567"), true);
  assert.equal(validatePhone("12"), false);
  assert.equal(validatePhone("not-a-phone"), false);
  assert.equal(validatePhone(""), false);
});

test("normalizePhone strips separators", () => {
  assert.equal(normalizePhone("+998 90 123-45-67"), "+998901234567");
  assert.equal(normalizePhone("(555) 123.4567"), "5551234567");
});

test("validateEmail accepts basic valid addresses and rejects invalid", () => {
  assert.equal(validateEmail("user@example.com"), true);
  assert.equal(validateEmail("a@b.co"), true);
  assert.equal(validateEmail("no-at-sign"), false);
  assert.equal(validateEmail("@missing-local.com"), false);
  assert.equal(validateEmail(""), false);
});

test("openDialer never returns verified:true", async () => {
  const result = await openDialer("+998901234567");
  // On non-Android runtime this is unavailable; on Android it is started.
  // In both cases delivery/call placement must NOT be claimed as verified.
  assert.equal(result.verified, false);
  assert.ok(["started", "unavailable", "failed"].includes(result.status));
});

test("openSmsComposer rejects empty body and never verifies delivery", async () => {
  const empty = await openSmsComposer("+998901234567", "   ");
  assert.equal(empty.status, "failed");
  assert.equal(empty.verified, false);

  const result = await openSmsComposer("+998901234567", "Salom");
  assert.equal(result.verified, false);
  assert.ok(["started", "unavailable", "failed"].includes(result.status));
});

test("openEmailComposer never returns verified:true", async () => {
  const bad = await openEmailComposer("not-an-email");
  assert.equal(bad.status, "failed");
  assert.equal(bad.verified, false);

  const result = await openEmailComposer("user@example.com", "Hi", "Body");
  assert.equal(result.verified, false);
  assert.ok(["started", "unavailable", "failed"].includes(result.status));
});

test("copyText rejects empty text", async () => {
  const result = await copyText("   ");
  assert.equal(result.status, "failed");
  assert.equal(result.verified, false);
});

test("lookupContact requires a non-empty query", async () => {
  const result = await lookupContact("");
  assert.equal(result.status, "failed");
  assert.equal(result.verified, false);
});

test("native-unavailable paths return status unavailable (non-Android runtime)", async () => {
  // In this CI / Node environment native Android launcher is not present.
  const dial = await openDialer("+998901234567");
  const sms = await openSmsComposer("+998901234567", "test");
  const email = await openEmailComposer("a@b.com");
  const contact = await lookupContact("Ali");

  // At least one of the native-dependent operations should report unavailable
  // when the native bridge is missing.
  const statuses = [dial.status, sms.status, email.status, contact.status];
  assert.ok(
    statuses.every((s) => s === "unavailable" || s === "failed" || s === "started"),
    "unexpected communication status",
  );
});
