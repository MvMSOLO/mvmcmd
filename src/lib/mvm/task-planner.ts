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
 * Known command heads that can start a sequential step.
 * Used so free-text arguments (sms/email/copy) are not split on "va" / "and" / "then".
 */
const COMMAND_HEADS = new Set([
  "open", "o", "go", "run", "start", "launch",
  "ls", "list", "apps",
  "find", "search", "q",
  "bind", "alias",
  "unbind", "unalias",
  "pin", "unpin",
  "session", "context", "memory",
  "hist", "history",
  "recents", "recent",
  "clear", "cls",
  "perm", "perms", "permissions",
  "install", "pwa",
  "store", "market",
  "pack", "package", "apk",
  "contact", "contacts",
  "dial", "call",
  "sms", "text",
  "email", "mail",
  "copy", "paste", "clipboard",
  "share", "send",
  "link", "url", "deeplink",
  "openfile", "open-file",
  "files", "file", "storage", "large-files", "file-search",
  "device", "hardware", "monitor", "device-info",
  "sys", "info", "status",
  "about",
  "lang", "language",
  "compat", "compatibility", "oem", "device-compatibility", "moslik", "mosliklar",
  "help", "?", "man",
  "perf", "performance", "benchmark",
  "date", "time",
  "whoami",
  "birthday", "bday", "tavallud", "sogbol",
  "reset",
  "camera", "qr", "wallpaper", "wall", "wp",
  "gaming", "game", "game-mode", "game-booster", "gaming-mode", "oyin", "o'yin",
  "english", "en", "english-learning", "ielts",
  "notification", "notifications", "notify",
]);

function looksLikeCommandStart(text: string): boolean {
  const head = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return COMMAND_HEADS.has(head);
}

/**
 * Phase 7 deterministic task planner.
 * It only decomposes explicit sequential language; it does not guess hidden actions.
 * Free-text arguments (sms / email / copy bodies) are never split on "va" / "and" / "then".
 */
export function splitTaskInput(input: string): string[] {
  const raw = input.trim();
  if (!raw || /^https?:\/\//i.test(raw)) return [];

  // Split only on explicit sequential separators.
  const candidates = raw.split(/\s+(?:and then|then|va keyin|keyin|va|and)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (candidates.length < 2) return [];

  // Only keep the split when every part after the first looks like a real command head.
  // This prevents "sms ... men va sen" from being broken in the middle of the message body.
  for (let i = 1; i < candidates.length; i++) {
    if (!looksLikeCommandStart(candidates[i])) {
      return []; // treat the whole input as a single non-sequential command
    }
  }

  return candidates;
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
