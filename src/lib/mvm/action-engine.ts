export type ActionStage = "precondition" | "execute" | "observe" | "verify" | "recover";
export type ActionStatus = "ready" | "started" | "verified" | "recovered" | "failed";
export type RecoveryReason = "precondition" | "execute" | "observe" | "verify";
export type RecoveryStrategy = "retry" | "fallback" | "fail";

export interface MvmActionContext {
  skillId: string;
  platform: string;
  requiredCapabilities?: string[];
  metadata?: Record<string, string>;
}

export interface MvmActionResult<T> {
  status: ActionStatus;
  stage: ActionStage;
  ok: boolean;
  verified: boolean;
  value?: T;
  message: string;
  reason?: string;
  trace: ActionStage[];
  attempts: number;
  recovery?: {
    reason: RecoveryReason;
    strategy: RecoveryStrategy;
  };
}

export interface MvmActionDefinition<T> {
  context: MvmActionContext;
  precondition?: () => { ok: boolean; reason?: string };
  execute: () => T;
  observe?: (value: T) => { ok: boolean; reason?: string };
  verify?: (value: T) => { ok: boolean; reason?: string };
  recover?: (reason: string) => T | undefined;
  startedWhen?: (value: T) => boolean;
  recovery?: {
    maxAttempts?: number;
    retryOn?: RecoveryReason[];
  };
}

function recoveryStrategy<T>(
  definition: MvmActionDefinition<T>,
  reason: RecoveryReason,
  attempt: number,
): RecoveryStrategy {
  const maxAttempts = Math.max(1, definition.recovery?.maxAttempts ?? 1);
  const retryOn = definition.recovery?.retryOn ?? [];
  return attempt < maxAttempts && retryOn.includes(reason) ? "retry" : definition.recover ? "fallback" : "fail";
}

function recoveredResult<T>(
  value: T,
  reason: RecoveryReason,
  recoveryReason: string,
  trace: ActionStage[],
  attempts: number,
): MvmActionResult<T> {
  return {
    status: "recovered",
    stage: "recover",
    ok: true,
    verified: false,
    value,
    message: "Action recovered with fallback.",
    reason: recoveryReason,
    trace: [...trace, "recover"],
    attempts,
    recovery: { reason, strategy: "fallback" },
  };
}

/**
 * Phase 8 verification/recovery lifecycle.
 *
 * Completion is never inferred from an attempted recovery:
 * - VERIFIED requires explicit completion evidence.
 * - STARTED means the action was accepted/started but completion is unproven.
 * - RECOVERED means a declared fallback handled a failure; it is not VERIFIED.
 * - FAILED means no declared recovery could safely resolve the problem.
 *
 * Retries are opt-in and bounded so side-effecting actions are never retried
 * merely because verification is unavailable.
 */
export function runMvmAction<T>(definition: MvmActionDefinition<T>): MvmActionResult<T> {
  const trace: ActionStage[] = ["precondition"];
  const maxAttempts = Math.max(1, definition.recovery?.maxAttempts ?? 1);
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts += 1;

    const precondition = definition.precondition?.() ?? { ok: true };
    if (!precondition.ok) {
      const strategy = recoveryStrategy(definition, "precondition", attempts);
      if (strategy === "retry") continue;

      const recovered = definition.recover?.(precondition.reason ?? "precondition failed");
      if (recovered !== undefined) {
        return recoveredResult(
          recovered,
          "precondition",
          precondition.reason ?? "precondition failed",
          trace,
          attempts,
        );
      }
      return {
        status: "failed",
        stage: "precondition",
        ok: false,
        verified: false,
        message: "Action precondition failed.",
        reason: precondition.reason,
        trace,
        attempts,
        recovery: { reason: "precondition", strategy: "fail" },
      };
    }

    trace.push("execute");
    let value: T;
    try {
      value = definition.execute();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "action execution failed";
      const strategy = recoveryStrategy(definition, "execute", attempts);
      if (strategy === "retry") continue;

      const recovered = definition.recover?.(reason);
      if (recovered !== undefined) {
        return recoveredResult(recovered, "execute", reason, trace, attempts);
      }
      return {
        status: "failed",
        stage: "execute",
        ok: false,
        verified: false,
        message: "Action execution failed.",
        reason,
        trace,
        attempts,
        recovery: { reason: "execute", strategy: "fail" },
      };
    }

    trace.push("observe");
    const observed = definition.observe?.(value) ?? { ok: definition.startedWhen?.(value) ?? true };
    if (!observed.ok) {
      const strategy = recoveryStrategy(definition, "observe", attempts);
      if (strategy === "retry") continue;

      const recovered = definition.recover?.(observed.reason ?? "observation failed");
      if (recovered !== undefined) {
        return recoveredResult(
          recovered,
          "observe",
          observed.reason ?? "observation failed",
          trace,
          attempts,
        );
      }
      return {
        status: "failed",
        stage: "observe",
        ok: false,
        verified: false,
        value,
        message: "Action did not start successfully.",
        reason: observed.reason,
        trace,
        attempts,
        recovery: { reason: "observe", strategy: "fail" },
      };
    }

    trace.push("verify");
    const verified = definition.verify?.(value);
    if (verified?.ok) {
      return {
        status: "verified",
        stage: "verify",
        ok: true,
        verified: true,
        value,
        message: "Action verified.",
        trace,
        attempts,
      };
    }

    const reason = verified?.reason ?? "no completion proof";
    const strategy = recoveryStrategy(definition, "verify", attempts);
    if (strategy === "retry") continue;

    if (definition.recover) {
      const recovered = definition.recover(reason);
      if (recovered !== undefined) {
        return recoveredResult(recovered, "verify", reason, trace, attempts);
      }
    }

    return {
      status: "started",
      stage: "observe",
      ok: true,
      verified: false,
      value,
      message: "Action started; completion is not verifiable at this boundary.",
      reason,
      trace,
      attempts,
      recovery: { reason: "verify", strategy: "fail" },
    };
  }

  return {
    status: "failed",
    stage: "recover",
    ok: false,
    verified: false,
    message: "Action recovery retry budget exhausted.",
    reason: "retry budget exhausted",
    trace: [...trace, "recover"],
    attempts,
    recovery: { reason: "execute", strategy: "retry" },
  };
}

export function actionStatusLine(result: MvmActionResult<unknown>): string {
  if (result.status === "verified") return "VERIFIED";
  if (result.status === "started") return "STARTED";
  if (result.status === "recovered") return "RECOVERED";
  if (result.status === "failed") return "FAILED";
  return "READY";
}
