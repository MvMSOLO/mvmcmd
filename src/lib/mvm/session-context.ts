export interface SessionAppReference { id: string; name: string; }
export type SessionResultStatus = "none" | "verified" | "started" | "failed" | "ambiguous";

export interface SessionContext {
  /** Monotonic process-local turn id prevents stale async results from overwriting newer context. */
  turnId: number;
  lastCommand?: string;
  lastCommandRepeatable: boolean;
  lastCommandWasSensitive: boolean;
  lastSummary: string;
  lastResultStatus: SessionResultStatus;
  /** Content-free summary only; never stores output, message bodies, or file URIs. */
  lastResultSummary: string;
  lastApp?: SessionAppReference;
  /** A unique scoped URI exists only in process memory. */
  lastFileUri?: string;
  lastFileCount: number;
}
export interface SessionResolution { status: "ready" | "ambiguous"; command: string; resolved: boolean; message?: string; }

const REPEAT_CUE = /^(?:again|repeat|do that again|run it again|do it again|one more time|repeat that|yana|yana bir bor|qayta|shuni takrorla|yana qaytar)[.!? ]*$/i;
const CONTINUE_CUE = /^(?:continue|continue task|resume|resume task|keep going|davom et|davom ettir|ishga davom et)[.!? ]*$/i;
const APP_CUE = /^(?:(?:please\s+)?(?:open|launch|start|run|och|oching)\s+)?(?:(?:that|the previous|the last|last|previous|oldingi|avvalgi|shu|o'?sha)\s+(?:app|application|ilova|ilovani)|(?:open|launch|start|run)\s+it|(?:och|oching)\s+uni)[.!? ]*$/i;
const PRIVATE_COMMAND = /^(?:contact|contacts|dial|call|sms|text|email|mail|copy|paste|clipboard|share|send|link|url)\b/i;
const PRIVATE_FILES = /^files?\s+(?:delete|move|copy|share|zip)\b/i;
const SECRET_WORD = /\b(?:password|passwd|passcode|otp|token|secret|api[-_ ]?key|parol|maxfiy\s+kod)\b/i;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_VALUE = /(?:^|\s)\+?\d[\d\s().-]{7,}\d(?=$|\s)/g;
const URI_VALUE = /(?:content|file):\/\//i;
const SENSITIVE_QUERY = /[?&#](?:token|access_token|refresh_token|auth|authorization|api[_-]?key|secret|password|signature|sig|session|code)=/i;
function hasPhoneLikeValue(value: string): boolean {
  return Array.from(value.matchAll(new RegExp(PHONE_VALUE.source, "g"))).some(([candidate]) => candidate.replace(/\D/g, "").length >= 9);
}

export function createSessionContext(): SessionContext {
  return {
    turnId: 0,
    lastCommandRepeatable: false,
    lastCommandWasSensitive: false,
    lastSummary: "No command has been recorded in this session.",
    lastResultStatus: "none",
    lastResultSummary: "No result has been recorded in this session.",
    lastFileCount: 0,
  };
}
export function isPrivacySensitiveCommand(command: string): boolean {
  const value = command.trim();
  return PRIVATE_COMMAND.test(value) || PRIVATE_FILES.test(value) || SECRET_WORD.test(value) || EMAIL_VALUE.test(value) || URI_VALUE.test(value) || SENSITIVE_QUERY.test(value) || /\bBearer\s+[A-Za-z0-9._~+/=-]+/i.test(value) || hasPhoneLikeValue(value);
}
export function isRepeatableCommand(command: string): boolean {
  const value = command.trim();
  if (!value || isPrivacySensitiveCommand(value)) return false;
  const parts = value.split(/\s+/);
  const head = (parts[0] ?? "").toLowerCase();
  if (head === "files") return ["storage","list","find","large","recent","media","duplicates","downloads","documents","cleanup"].includes((parts[1] ?? "storage").toLowerCase());
  return ["open","o","go","run","start","launch","find","search","ls","list","apps","device","sys","status","help","about","date","time","whoami","recents","recent","wallpaper","wall","wp","camera","qr","english","notification","gaming"].includes(head);
}
export function resolveSessionReference(input: string, context: SessionContext): SessionResolution {
  const trimmed = input.trim();
  if (!trimmed) return { status: "ready", command: trimmed, resolved: false };
  if (REPEAT_CUE.test(trimmed)) {
    if (!context.lastCommand) return { status: "ambiguous", command: trimmed, resolved: false, message: "There is no safe previous command to repeat. Enter the command explicitly." };
    if (!context.lastCommandRepeatable || isPrivacySensitiveCommand(context.lastCommand)) return { status: "ambiguous", command: trimmed, resolved: false, message: "The previous operation is not safe to repeat automatically. Enter the exact command again if you intend to run it." };
    return { status: "ready", command: context.lastCommand, resolved: true };
  }
  if (CONTINUE_CUE.test(trimmed)) {
    const previous = context.lastCommand
      ? "Last recorded result: " + context.lastResultStatus.toUpperCase() + ". "
      : "No previous command is available. ";
    return {
      status: "ambiguous",
      command: trimmed,
      resolved: false,
      message: previous + "No background task is currently resumable. Name the next step explicitly; use " + '"again"' + " only when you intend to repeat a safe command.",
    };
  }
  if (APP_CUE.test(trimmed)) {
    if (!context.lastApp) return { status: "ambiguous", command: trimmed, resolved: false, message: "No single app is available in the current session context. Name the app explicitly." };
    return { status: "ready", command: 'open "' + context.lastApp.name.replace(/["\\]/g, "") + '"', resolved: true };
  }
  const fileCommand = trimmed.match(/^files?\s+(share|copy|move|delete)\s+(.+)$/i);
  if (fileCommand) {
    const operation = fileCommand[1].toLowerCase();
    const fileCue = fileCommand[2].trim().match(/^(?:the\s+)?(?:previous|last|that|it|oldingi|avvalgi|shu|o'?sha)(?:\s+(?:file|fayl|faylni))?(?:\s+(.*))?$/i);
    if (fileCue) {
      if (!context.lastFileUri || context.lastFileCount !== 1) {
        const detail = context.lastFileCount > 1 ? "The previous file operation returned " + context.lastFileCount + " candidate files." : "No single file was identified by the previous file operation.";
        return { status: "ambiguous", command: trimmed, resolved: false, message: detail + " Select or name the exact file URI before continuing." };
      }
      return { status: "ready", command: "files " + operation + " " + context.lastFileUri + (fileCue[1]?.trim() ? " " + fileCue[1].trim() : ""), resolved: true };
    }
  }
  if (/\b(?:previous|last|that)\s+file\b|\b(?:oldingi|avvalgi)\s+fayl\b/i.test(trimmed)) return { status: "ambiguous", command: trimmed, resolved: false, message: "A file reference is only resolved inside a supported files command, and only when one file was identified." };
  return { status: "ready", command: trimmed, resolved: false };
}
export function recordSessionTurn(context: SessionContext, input: string, command?: string, app?: SessionAppReference): SessionContext {
  const turnId = context.turnId + 1;
  const value = (command ?? "").trim();
  const base = { ...context, turnId, lastFileUri: undefined, lastFileCount: 0, lastResultStatus: "none" as const, lastResultSummary: "Waiting for the current command result." };
  if (!value) return { ...base, lastCommand: undefined, lastCommandRepeatable: false, lastCommandWasSensitive: false, lastSummary: "The last reference was ambiguous; no action was executed." };
  if (isPrivacySensitiveCommand(input) || isPrivacySensitiveCommand(value) || SECRET_WORD.test(input)) {
    return { ...base, lastCommand: undefined, lastCommandRepeatable: false, lastCommandWasSensitive: true, lastSummary: "A privacy-sensitive command was used and its text was not retained in session context.", lastFileUri: undefined, lastFileCount: 0, ...(app ? { lastApp: app } : {}) };
  }
  const repeatable = isRepeatableCommand(value);
  if (!repeatable) {
    return {
      ...base,
      lastCommand: undefined,
      lastCommandRepeatable: false,
      lastCommandWasSensitive: false,
      lastSummary: "A non-repeatable command was not retained in session context.",
      ...(app ? { lastApp: app } : {}),
    };
  }
  return { ...base, lastCommand: value, lastCommandRepeatable: true, lastCommandWasSensitive: false, lastSummary: "Last command: " + value, ...(app ? { lastApp: app } : {}) };
}
function classifyResult(messages: string[]): { status: SessionResultStatus; summary: string } {
  const joined = messages.join("\n");
  if (/NEEDS_CONFIRMATION|NEEDS_FOLDER|AMBIGUOUS|no safe previous command|no single file/i.test(joined)) return { status: "ambiguous", summary: "More explicit input is required; no action was guessed." };
  if (/\bFAILED\b|\bUNAVAILABLE\b|\bERROR\b|\bDENIED\b|\bREJECTED\b|\bNO MATCH\b|TOPILMADI/i.test(joined)) return { status: "failed", summary: "The latest command reported a failure or platform limitation." };

  // Count only an explicit result-state token. Explanations saying "not verified"
  // must not upgrade a STARTED action to VERIFIED.
  const explicitSuccess = messages.some((message) => {
    const line = message.trim();
    return /^(?:STORAGE|FILES|FILE|DELETE|COPY|MOVE|ZIP|CONTACT|CAPABILITY|SESSION|TASK|GOAL|DEVICE|PERMISSION|CAMERA|QR|WALLPAPER|NOTIFICATION|ENGLISH|DIAL|SMS|EMAIL)\s+(?:[A-Z0-9_.-]+\s+)?(?:VERIFIED|READY|ACHIEVED|COMPLETE|COMPLETED)\b/i.test(line)
      || /(?:·|:)\s*(?:VERIFIED|READY|ACHIEVED|COMPLETE|COMPLETED)\b/i.test(line);
  });
  if (explicitSuccess) return { status: "verified", summary: "The command returned an explicit verified or ready state." };
  if (/\bSTARTED\b|\bOPENED\b|\bINTENT\b/i.test(joined)) return { status: "started", summary: "The action was accepted or started; external completion is not implied." };
  return { status: "started", summary: "The command returned; external completion is not assumed." };
}
export function recordSessionResult(context: SessionContext, input: string, messages: string[], expectedTurnId = context.turnId, forcedStatus?: SessionResultStatus): SessionContext {
  if (expectedTurnId !== context.turnId) return context;
  const classified = forcedStatus
    ? { status: forcedStatus, summary: forcedStatus === "ambiguous" ? "More explicit input is required; no action was guessed." : "The command returned without retaining its content." }
    : classifyResult(messages);
  return { ...context, lastResultStatus: classified.status, lastResultSummary: isPrivacySensitiveCommand(input) ? "The private command outcome was checked; its content was not retained." : classified.summary };
}
export function recordSessionFileResults(context: SessionContext, command: string, messages: string[], expectedTurnId = context.turnId): SessionContext {
  if (expectedTurnId !== context.turnId) return context;
  const operation = command.trim().split(/\s+/)[1]?.toLowerCase() ?? "storage";
  const readOnly = ["list","find","large","recent","media","duplicates","downloads","documents","cleanup"].includes(operation);
  const classified = classifyResult(messages);
  if (!readOnly) return { ...context, lastFileUri: undefined, lastFileCount: 0, lastResultStatus: classified.status, lastResultSummary: classified.summary };
  const uris = [...new Set((messages.join("\n").match(/content:\/\/[^\s·]+/g) ?? []).map((uri) => uri.replace(/[),;.!]+$/, "")))];
  return {
    ...context,
    lastFileUri: uris.length === 1 ? uris[0] : undefined,
    lastFileCount: uris.length,
    lastResultStatus: classified.status,
    lastResultSummary: classified.summary,
    lastSummary: uris.length === 1 ? "One file was identified by the last scoped file query; its URI exists in memory only." : uris.length > 1 ? "The last scoped file query returned " + uris.length + " file references; no single file will be guessed." : context.lastSummary,
  };
}
export function formatSessionSummary(context: SessionContext): string[] {
  return [
    "SESSION  VOLATILE · current app session only",
    context.lastCommand ? "LAST COMMAND  " + context.lastCommand : context.lastCommandWasSensitive ? "LAST COMMAND  not retained (privacy-sensitive)" : "LAST COMMAND  none",
    "LAST RESULT  " + context.lastResultStatus.toUpperCase() + " · " + context.lastResultSummary,
    "REPEAT  " + (context.lastCommandRepeatable ? "available for this safe command" : "disabled"),
    "LAST APP  " + (context.lastApp?.name ?? "none identified"),
    context.lastFileCount === 1 && context.lastFileUri ? "LAST FILE  one scoped file reference available in memory (URI hidden)" : context.lastFileCount > 1 ? "LAST FILE  ambiguous · " + context.lastFileCount + " candidates; specify the file" : "LAST FILE  none uniquely identified",
    "PRIVACY  context and command history are memory-only; private command text is not persisted.",
    "Use session clear to erase the current context and visible command log.",
  ];
}
let activeSession = createSessionContext();
export function resolveActiveSessionReference(input: string): SessionResolution { return resolveSessionReference(input, activeSession); }
export function rememberActiveSessionTurn(input: string, command?: string, app?: SessionAppReference): number {
  activeSession = recordSessionTurn(activeSession, input, command, app);
  return activeSession.turnId;
}
export function rememberActiveSessionResult(input: string, messages: string[], turnId?: number, forcedStatus?: SessionResultStatus): void {
  activeSession = recordSessionResult(activeSession, input, messages, turnId ?? activeSession.turnId, forcedStatus);
}
export function rememberActiveSessionFileResults(command: string, messages: string[], turnId?: number): void {
  activeSession = recordSessionFileResults(activeSession, command, messages, turnId ?? activeSession.turnId);
}
export function getActiveSessionSummary(): string[] { return formatSessionSummary(activeSession); }
export function clearActiveSessionContext(): void { activeSession = { ...createSessionContext(), turnId: activeSession.turnId + 1 }; }
