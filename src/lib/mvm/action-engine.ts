export type ActionStage = "precondition" | "execute" | "observe" | "verify" | "recover";
export type ActionStatus = "ready" | "started" | "verified" | "recovered" | "failed";

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
}

export interface MvmActionDefinition<T> {
  context: MvmActionContext;
  precondition?: () => { ok: boolean; reason?: string };
  execute: () => T;
  observe?: (value: T) => { ok: boolean; reason?: string };
  verify?: (value: T) => { ok: boolean; reason?: string };
  recover?: (reason: string) => T | undefined;
  startedWhen?: (value: T) => boolean;
}

/**
 * Phase 6 action lifecycle.
 * "started" is not "verified": a platform Intent can be accepted without
 * proving that the target app rendered successfully.
 */
export function runMvmAction<T>(definition: MvmActionDefinition<T>): MvmActionResult<T> {
  const trace: ActionStage[] = ["precondition"];
  const precondition = definition.precondition?.() ?? { ok: true };

  if (!precondition.ok) {
    const recovered = definition.recover?.(precondition.reason ?? "precondition failed");
    if (recovered !== undefined) {
      return {
        status: "recovered",
        stage: "recover",
        ok: true,
        verified: false,
        value: recovered,
        message: "Action recovered with fallback.",
        reason: precondition.reason,
        trace: [...trace, "recover"],
      };
    }
    return {
      status: "failed",
      stage: "precondition",
      ok: false,
      verified: false,
      message: "Action precondition failed.",
      reason: precondition.reason,
      trace,
    };
  }

  trace.push("execute");
  let value: T;
  try {
    value = definition.execute();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "action execution failed";
    const recovered = definition.recover?.(reason);
    if (recovered !== undefined) {
      return {
        status: "recovered",
        stage: "recover",
        ok: true,
        verified: false,
        value: recovered,
        message: "Action recovered with fallback.",
        reason,
        trace: [...trace, "recover"],
      };
    }
    return {
      status: "failed",
      stage: "execute",
      ok: false,
      verified: false,
      message: "Action execution failed.",
      reason,
      trace,
    };
  }

  trace.push("observe");
  const observed = definition.observe?.(value) ?? { ok: definition.startedWhen?.(value) ?? true };
  if (!observed.ok) {
    const recovered = definition.recover?.(observed.reason ?? "observation failed");
    if (recovered !== undefined) {
      return {
        status: "recovered",
        stage: "recover",
        ok: true,
        verified: false,
        value: recovered,
        message: "Action recovered with fallback.",
        reason: observed.reason,
        trace: [...trace, "recover"],
      };
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
    };
  }

  return {
    status: "started",
    stage: "observe",
    ok: true,
    verified: false,
    value,
    message: "Action started; completion is not verifiable at this boundary.",
    reason: verified?.reason ?? "no completion proof",
    trace,
  };
}

export function actionStatusLine(result: MvmActionResult<unknown>): string {
  if (result.status === "verified") return "VERIFIED";
  if (result.status === "started") return "STARTED";
  if (result.status === "recovered") return "RECOVERED";
  if (result.status === "failed") return "FAILED";
  return "READY";
}
