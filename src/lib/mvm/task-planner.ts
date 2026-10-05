export type TaskStepStatus = "pending" | "running" | "verified" | "started" | "failed" | "skipped";

export interface MvmTaskStep {
  id: string;
  input: string;
  dependsOn: string[];
}

export interface MvmTaskPlan {
  id: string;
  input: string;
  steps: MvmTaskStep[];
  policy: {
    maxSteps: number;
    stopOnFailure: boolean;
  };
}

export interface MvmTaskStepResult<T> {
  stepId: string;
  input: string;
  status: TaskStepStatus;
  ok: boolean;
  verified: boolean;
  value?: T;
  reason?: string;
}

export interface MvmTaskRunResult<T> {
  plan: MvmTaskPlan;
  steps: MvmTaskStepResult<T>[];
  ok: boolean;
  verified: boolean;
  stoppedOnFailure: boolean;
}

/**
 * Phase 7 deterministic task planner.
 * It only decomposes explicit sequential language; it does not guess hidden actions.
 */
export function splitTaskInput(input: string): string[] {
  const raw = input.trim();
  if (!raw || /^https?:\/\//i.test(raw)) return [];

  const parts = raw.split(/\s+(?:and then|then|va keyin|keyin|va)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : [];
}

export function planMvmTask(input: string, maxSteps = 8): MvmTaskPlan | undefined {
  const stepsInput = splitTaskInput(input);
  if (stepsInput.length < 2) return undefined;
  if (stepsInput.length > maxSteps) return undefined;

  const steps: MvmTaskStep[] = stepsInput.map((stepInput, index) => ({
    id: `step-${index + 1}`,
    input: stepInput,
    dependsOn: index === 0 ? [] : [`step-${index}`],
  }));

  return {
    id: `task-${Date.now().toString(36)}`,
    input: input.trim(),
    steps,
    policy: {
      maxSteps,
      stopOnFailure: true,
    },
  };
}

export async function runMvmTaskPlan<T>(
  plan: MvmTaskPlan,
  executeStep: (step: MvmTaskStep) => T | Promise<T>,
  evaluate?: (value: T, step: MvmTaskStep) => { ok: boolean; verified?: boolean; reason?: string },
): Promise<MvmTaskRunResult<T>> {
  const results: MvmTaskStepResult<T>[] = [];

  for (const step of plan.steps) {
    const dependencyFailed = step.dependsOn.some((dependencyId) => {
      const dependency = results.find((item) => item.stepId === dependencyId);
      return !dependency || !dependency.ok;
    });

    if (dependencyFailed) {
      results.push({
        stepId: step.id,
        input: step.input,
        status: "skipped",
        ok: false,
        verified: false,
        reason: "dependency failed",
      });
      continue;
    }

    try {
      const value = await executeStep(step);
      const checked = evaluate?.(value, step) ?? { ok: true, verified: false };
      results.push({
        stepId: step.id,
        input: step.input,
        status: checked.ok ? (checked.verified ? "verified" : "started") : "failed",
        ok: checked.ok,
        verified: Boolean(checked.verified),
        value,
        reason: checked.reason,
      });

      if (!checked.ok && plan.policy.stopOnFailure) break;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "step execution failed";
      results.push({
        stepId: step.id,
        input: step.input,
        status: "failed",
        ok: false,
        verified: false,
        reason,
      });
      if (plan.policy.stopOnFailure) break;
    }
  }

  const completed = results.length === plan.steps.length;
  const ok = completed && results.every((result) => result.ok);
  const verified = ok && results.every((result) => result.verified);

  return {
    plan,
    steps: results,
    ok,
    verified,
    stoppedOnFailure: !completed && results.some((result) => result.status === "failed"),
  };
}

export function runMvmTaskPlanSync<T>(
  plan: MvmTaskPlan,
  executeStep: (step: MvmTaskStep) => T,
  evaluate?: (value: T, step: MvmTaskStep) => { ok: boolean; verified?: boolean; reason?: string },
): MvmTaskRunResult<T> {
  const results: MvmTaskStepResult<T>[] = [];

  for (const step of plan.steps) {
    const dependencyFailed = step.dependsOn.some((dependencyId) => {
      const dependency = results.find((item) => item.stepId === dependencyId);
      return !dependency || !dependency.ok;
    });
    if (dependencyFailed) {
      results.push({ stepId: step.id, input: step.input, status: "skipped", ok: false, verified: false, reason: "dependency failed" });
      continue;
    }
    try {
      const value = executeStep(step);
      const checked = evaluate?.(value, step) ?? { ok: true, verified: false };
      results.push({
        stepId: step.id,
        input: step.input,
        status: checked.ok ? (checked.verified ? "verified" : "started") : "failed",
        ok: checked.ok,
        verified: Boolean(checked.verified),
        value,
        reason: checked.reason,
      });
      if (!checked.ok && plan.policy.stopOnFailure) break;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "step execution failed";
      results.push({ stepId: step.id, input: step.input, status: "failed", ok: false, verified: false, reason });
      if (plan.policy.stopOnFailure) break;
    }
  }

  const completed = results.length === plan.steps.length;
  const ok = completed && results.every((result) => result.ok);
  const verified = ok && results.every((result) => result.verified);
  return { plan, steps: results, ok, verified, stoppedOnFailure: !completed && results.some((result) => result.status === "failed") };
}
