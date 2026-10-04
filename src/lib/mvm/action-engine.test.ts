import test from "node:test";
import assert from "node:assert/strict";
import { runMvmAction } from "./action-engine.ts";

test("action engine verifies only when completion proof exists", () => {
  const verified = runMvmAction({
    context: { skillId: "test", platform: "test" },
    execute: () => ({ started: true }),
    observe: () => ({ ok: true }),
    verify: () => ({ ok: true }),
  });
  assert.equal(verified.status, "verified");
  assert.equal(verified.verified, true);
});

test("action engine keeps unverified platform requests as started", () => {
  const started = runMvmAction({
    context: { skillId: "test", platform: "android" },
    execute: () => ({ accepted: true }),
    observe: () => ({ ok: true }),
    verify: () => ({ ok: false, reason: "completion callback unavailable" }),
  });
  assert.equal(started.status, "started");
  assert.equal(started.verified, false);
});

test("action engine uses recovery when a precondition fails", () => {
  const recovered = runMvmAction({
    context: { skillId: "test", platform: "android" },
    precondition: () => ({ ok: false, reason: "capability denied" }),
    execute: () => "never",
    recover: () => "fallback",
  });
  assert.equal(recovered.status, "recovered");
  assert.equal(recovered.value, "fallback");
});
