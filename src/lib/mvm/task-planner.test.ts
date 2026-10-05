import test from "node:test";
import assert from "node:assert/strict";
import { planMvmTask, runMvmTaskPlan, splitTaskInput } from "./task-planner.ts";

test("planner splits only explicit sequential commands", () => {
  assert.deepEqual(splitTaskInput("open Chrome then device"), ["open Chrome", "device"]);
  assert.deepEqual(splitTaskInput("open Chrome va keyin device"), ["open Chrome", "device"]);
  assert.deepEqual(splitTaskInput("open Chrome"), []);
});

test("planner creates an ordered dependency chain", () => {
  const plan = planMvmTask("open Chrome then device then help");
  assert.ok(plan);
  assert.deepEqual(plan?.steps.map((step) => step.dependsOn), [[], ["step-1"], ["step-2"]]);
});

test("task runner executes steps in order and preserves verification truth", async () => {
  const plan = planMvmTask("one then two")!;
  const seen: string[] = [];
  const result = await runMvmTaskPlan(
    plan,
    async (step) => {
      seen.push(step.input);
      return { input: step.input };
    },
    (value) => ({ ok: true, verified: value.input === "two" }),
  );

  assert.deepEqual(seen, ["one", "two"]);
  assert.equal(result.ok, true);
  assert.equal(result.verified, false);
  assert.deepEqual(result.steps.map((step) => step.status), ["started", "verified"]);
});

test("failed dependency stops later steps", async () => {
  const plan = planMvmTask("one then two then three")!;
  const seen: string[] = [];
  const result = await runMvmTaskPlan(plan, async (step) => {
    seen.push(step.input);
    if (step.input === "two") throw new Error("boom");
    return step.input;
  });

  assert.deepEqual(seen, ["one", "two"]);
  assert.equal(result.ok, false);
  assert.equal(result.stoppedOnFailure, true);
});
