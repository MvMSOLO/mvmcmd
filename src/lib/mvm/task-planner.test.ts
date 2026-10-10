import test from "node:test";
import assert from "node:assert/strict";
import { planMvmTask, runMvmTaskPlan, splitTaskInput } from "./task-planner.ts";

test("planner splits only explicit sequential commands", () => {
  assert.deepEqual(splitTaskInput("open Chrome then device"), ["open Chrome", "device"]);
  assert.deepEqual(splitTaskInput("open Chrome va keyin device"), ["open Chrome", "device"]);
  assert.deepEqual(splitTaskInput("open Chrome"), []);
});

test("planner does not split free-text SMS/email bodies on va/and/then", () => {
  // Real-world Uzbek message containing "va" must stay one step
  assert.deepEqual(splitTaskInput("sms +998901234567 salom, men va sen"), []);
  assert.deepEqual(
    splitTaskInput("email ali@x.com subject Hi body bread and butter"),
    [],
  );
  // Still splits when the second part is a real command
  assert.deepEqual(
    splitTaskInput("email a@b.com subject Hi body bread and butter then open camera"),
    ["email a@b.com subject Hi body bread and butter", "open camera"],
  );
  assert.deepEqual(splitTaskInput("open camera va qr"), ["open camera", "qr"]);
});

test("planner creates an ordered dependency chain", () => {
  const plan = planMvmTask("open Chrome then device then help");
  assert.ok(plan);
  assert.deepEqual(plan?.steps.map((step) => step.dependsOn), [[], ["step-1"], ["step-2"]]);
});

test("task runner executes steps in order and preserves verification truth", async () => {
  const plan = planMvmTask("one then two")!;
  // "one" / "two" are not real command heads, so this plan should not be created
  // after the free-text guard. Use real command heads instead.
  const realPlan = planMvmTask("open Chrome then device")!;
  assert.ok(realPlan);

  const seen: string[] = [];
  const result = await runMvmTaskPlan(
    realPlan,
    async (step) => {
      seen.push(step.input);
      return { input: step.input };
    },
    (value) => ({ ok: true, verified: value.input === "device" }),
  );

  assert.deepEqual(seen, ["open Chrome", "device"]);
  assert.equal(result.ok, true);
  assert.equal(result.verified, false);
  assert.deepEqual(result.steps.map((step) => step.status), ["started", "verified"]);
});

test("failed dependency stops later steps", async () => {
  const plan = planMvmTask("open Chrome then device then help")!;
  const seen: string[] = [];
  const result = await runMvmTaskPlan(plan, async (step) => {
    seen.push(step.input);
    if (step.input === "device") throw new Error("boom");
    return step.input;
  });

  assert.deepEqual(seen, ["open Chrome", "device"]);
  assert.equal(result.ok, false);
  assert.equal(result.stoppedOnFailure, true);
});
