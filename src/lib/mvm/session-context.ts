export interface SessionAppReference {
  id: string;
  name: string;
}

export interface SessionContext {
  /** Safe command text kept in memory only; never written to persistent storage. */
  lastCommand?: string;
  lastCommandRepeatable: boolean;
  lastCommandWasSensitive: boolean;
  lastSummary: string;
  lastApp?: SessionAppReference;
  /** A URI is kept only in process memory and only when exactly one file was identified. */
  lastFileUri?: string;
  lastFileCount: number;
}

export interface SessionResolution {
  status: "ready" | "ambiguous";
  command: string;
  resolved: boolean;
  message?: string;
}

const REPEAT_CUE = /^(?:again|repeat|do that again|run it again|do it again|one more time|repeat that|yana|yana bir bor|qayta|shuni takrorla|yana qaytar)[.!? ]*$/i;
const APP_CUE = /^(?:(?:please\s+)?(?:open|launch|start|run|och|oching)\s+)?(?:(?:that|the previous|the last|last|previous|oldingi|avvalgi|shu|o'?sha)\s+(?:app|application|ilova|ilovani)|(?:open|launch|start|run)\s+it|(?:och|oching)\s+uni)[.!? ]*$/i;
const PRIVATE_COMMAND = /^(?:contact|contacts|dial|call|sms|text|email|mail|copy|paste|clipboard|share|send|link|url)\b/i;
const PRIVATE_FILES = /^files?\s+(?:delete|move|copy|share|zip)\b/i;
const SECRET_WORD = /\b(?:password|passwd|passcode|otp|token|secret|api[-_ ]?key|parol|maxfiy\s+kod)\b/i;

export function createSessionContext(): SessionContext {
  return {
    lastCommandRepeatable: false,
    lastCommandWasSensitive: false,
    lastSummary: "No command has been recorded in this session.",
    lastFileCount: 0,
  };
}

export function isPrivacySensitiveCommand(command: string): boolean {
  const value = command.trim();
  return PRIVATE_COMMAND.test(value) || PRIVATE_FILES.test(value) || SECRET_WORD.test(value);
}

export function isRepeatableCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed || isPrivacySensitiveCommand(trimmed)) return false;
  const parts = trimmed.split(/\s+/);
  const head = (parts[0] ?? "").toLowerCase();
  if (head === "files") {
    return ["storage", "list", "find", "large", "recent", "media", "duplicates", "downloads", "documents", "cleanup"].includes((parts[1] ?? "storage").toLowerCase());
  }
  return ["open", "o", "go", "run", "start", "launch", "find", "search", "ls", "list", "apps", "device", "sys", "status", "help", "about", "date", "time", "whoami", "recents", "recent", "wallpaper", "wall", "wp", "camera", "qr", "english", "notification", "gaming"].includes(head);
}

/** Resolve conversational references only when a single, explicit target exists. */
export function resolveSessionReference(input: string, context: SessionContext): SessionResolution {
  const trimmed = input.trim();
  if (!trimmed) return { status: "ready", command: trimmed, resolved: false };

  if (REPEAT_CUE.test(trimmed)) {
    if (!context.lastCommand) {
      return {
        status: "ambiguous",
        command: trimmed,
        resolved: false,
        message: "There is no safe previous command to repeat. Enter the command explicitly.",
      };
    }
    if (!context.lastCommandRepeatable || isPrivacySensitiveCommand(context.lastCommand)) {
      return {
        status: "ambiguous",
        command: trimmed,
        resolved: false,
        message: "The previous operation is not safe to repeat automatically. Enter the exact command again if you intend to run it.",
      };
    }
    return { status: "ready", command: context.lastCommand, resolved: true };
  }

  if (APP_CUE.test(trimmed)) {
    if (!context.lastApp) {
      return {
        status: "ambiguous",
        command: trimmed,
        resolved: false,
        message: "No single app is available in the current session context. Name the app explicitly.",
      };
    }
    return { status: "ready", command: 'open "' + context.lastApp.name.replace(/["\\]/g, "") + '"', resolved: true };
  }

  const fileCommand = trimmed.match(/^files?\s+(share|copy|move|delete)\s+(.+)$/i);
  if (fileCommand) {
    const operation = fileCommand[1].toLowerCase();
    const remainder = fileCommand[2].trim();
    const fileCue = remainder.match(/^(?:the\s+)?(?:previous|last|that|it|oldingi|avvalgi|shu|o'?sha)(?:\s+(?:file|fayl|faylni))?(?:\s+(.*))?$/i);
    if (fileCue) {
      if (!context.lastFileUri || context.lastFileCount !== 1) {
        const detail = context.lastFileCount > 1
          ? "The previous file operation returned " + context.lastFileCount + " candidate files."
          : "No single file was identified by the previous file operation.";
        return {
          status: "ambiguous",
          command: trimmed,
          resolved: false,
          message: detail + " Select or name the exact file URI before continuing.",
        };
      }
      const tail = fileCue[1]?.trim();
      return {
        status: "ready",
        command: "files " + operation + " " + context.lastFileUri + (tail ? " " + tail : ""),
        resolved: true,
      };
    }
  }

  if (/\b(?:previous|last|that)\s+file\b|\b(?:oldingi|avvalgi)\s+fayl\b/i.test(trimmed)) {
    return {
      status: "ambiguous",
      command: trimmed,
      resolved: false,
      message: "A file reference is only resolved inside a supported files command, and only when one file was identified.",
    };
  }

  return { status: "ready", command: trimmed, resolved: false };
}

export function recordSessionTurn(
  context: SessionContext,
  input: string,
  command?: string,
  app?: SessionAppReference,
): SessionContext {
  const value = (command ?? "").trim();
  if (!value) {
    return {
      ...context,
      lastCommand: undefined,
      lastCommandRepeatable: false,
      lastCommandWasSensitive: false,
      lastSummary: "The last reference was ambiguous; no action was executed.",
    };
  }

  if (isPrivacySensitiveCommand(input) || isPrivacySensitiveCommand(value) || SECRET_WORD.test(input)) {
    return {
      ...context,
      lastCommand: undefined,
      lastCommandRepeatable: false,
      lastCommandWasSensitive: true,
      lastSummary: "A privacy-sensitive command was used and its text was not retained in session context.",
      lastFileUri: undefined,
      lastFileCount: 0,
      ...(app ? { lastApp: app } : {}),
    };
  }

  return {
    ...context,
    lastCommand: value,
    lastCommandRepeatable: isRepeatableCommand(value),
    lastCommandWasSensitive: false,
    lastSummary: "Last command: " + value,
    ...(app ? { lastApp: app } : {}),
  };
}

export function recordSessionFileResults(
  context: SessionContext,
  command: string,
  messages: string[],
): SessionContext {
  const operation = command.trim().split(/\s+/)[1]?.toLowerCase() ?? "storage";
  const readOnly = ["list", "find", "large", "recent", "media", "duplicates", "downloads", "documents", "cleanup"].includes(operation);
  if (!readOnly) {
    return { ...context, lastFileUri: undefined, lastFileCount: 0 };
  }

  const uris = [...new Set((messages.join("\n").match(/content:\/\/[^\s·]+/g) ?? []).map((uri) => uri.replace(/[),;.!]+$/, "")))];
  return {
    ...context,
    lastFileUri: uris.length === 1 ? uris[0] : undefined,
    lastFileCount: uris.length,
    lastSummary: uris.length === 1
      ? "One file was identified by the last scoped file query; its URI exists in memory only."
      : uris.length > 1
        ? "The last scoped file query returned " + uris.length + " file references; no single file will be guessed."
        : context.lastSummary,
  };
}

export function formatSessionSummary(context: SessionContext): string[] {
  return [
    "SESSION  VOLATILE · current app session only",
    context.lastCommand
      ? "LAST COMMAND  " + context.lastCommand
      : context.lastCommandWasSensitive
        ? "LAST COMMAND  not retained (privacy-sensitive)"
        : "LAST COMMAND  none",
    "REPEAT  " + (context.lastCommandRepeatable ? "available for this safe command" : "disabled"),
    "LAST APP  " + (context.lastApp?.name ?? "none identified"),
    context.lastFileCount === 1 && context.lastFileUri
      ? "LAST FILE  one scoped file reference available in memory (URI hidden)"
      : context.lastFileCount > 1
        ? "LAST FILE  ambiguous · " + context.lastFileCount + " candidates; specify the file"
        : "LAST FILE  none uniquely identified",
    "PRIVACY  command history and references are cleared when the app session reloads; private command text is not stored in session context.",
    "Use session clear to erase the current session context and visible command history.",
  ];
}

/* The active context is deliberately module memory, never browser storage or native preferences. */
let activeSession = createSessionContext();

export function resolveActiveSessionReference(input: string): SessionResolution {
  return resolveSessionReference(input, activeSession);
}

export function rememberActiveSessionTurn(input: string, command?: string, app?: SessionAppReference): void {
  activeSession = recordSessionTurn(activeSession, input, command, app);
}

export function rememberActiveSessionFileResults(command: string, messages: string[]): void {
  activeSession = recordSessionFileResults(activeSession, command, messages);
}

export function getActiveSessionSummary(): string[] {
  return formatSessionSummary(activeSession);
}

export function clearActiveSessionContext(): void {
  activeSession = createSessionContext();
}
