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
  assert.equal(verified.attempts, 1);
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
  assert.equal(started.attempts, 1);
  assert.equal(started.recovery?.strategy, "fail");
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
  assert.equal(recovered.verified, false);
  assert.equal(recovered.recovery?.strategy, "fallback");
});

test("action engine retries only when retry policy explicitly allows it", () => {
  let executions = 0;
  const verified = runMvmAction({
    context: { skillId: "test", platform: "android" },
    execute: () => {
      executions += 1;
      return { attempt: executions };
    },
    observe: () => ({ ok: true }),
    verify: (value) =>
      value.attempt >= 2
        ? { ok: true }
        : { ok: false, reason: "temporary verification miss" },
    recovery: { maxAttempts: 2, retryOn: ["verify"] },
  });

  assert.equal(executions, 2);
  assert.equal(verified.status, "verified");
  assert.equal(verified.attempts, 2);
});

test("action engine never turns a fallback into verified success", () => {
  const recovered = runMvmAction({
    context: { skillId: "test", platform: "android" },
    execute: () => ({ accepted: true }),
    observe: () => ({ ok: true }),
    verify: () => ({ ok: false, reason: "completion unavailable" }),
    recover: () => ({ fallback: true }),
  });

  assert.equal(recovered.status, "recovered");
  assert.equal(recovered.ok, true);
  assert.equal(recovered.verified, false);
});
