export type VoiceOutcomeStatus = "warning" | "verified" | "started" | "response";

export function normalizeVoiceCommand(transcript: string): string {
  let value = (transcript ?? "")
    .normalize("NFKC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  value = value.replace(/^(?:(?:hey|ok|okay|hello)\s+)?(?:mvm|m\.v\.m)(?:\s+(?:command|assistant|please))?[\s,:-]*/i, "");
  return value
    .replace(/^[,;:]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?。！？]+$/u, "")
    .trim();
}

export function classifyVoiceOutcome(messages: string[]): VoiceOutcomeStatus {
  // Only structured status lines count. Prose such as "completion is not verified"
  // must never turn a STARTED result into VERIFIED.
  const has = (pattern: RegExp) => messages.some((message) => pattern.test(message.trim().toUpperCase()));
  const warningLine = /^(?:[A-Z0-9_.-]+\s+){0,3}(?:FAILED|ERROR|DENIED|UNAVAILABLE|REJECTED|AMBIGUOUS|NEEDS_CONFIRMATION|NOT FOUND|NO MATCH|TOPILMADI|RAD ETILDI)\b/;
  const verifiedLine = /^(?:[A-Z0-9_.-]+\s+){0,3}(?:VERIFIED|READY|ACHIEVED|COMPLETED|COMPLETE)\b/;
  const startedLine = /^(?:[A-Z0-9_.-]+\s+){0,3}(?:STARTED|OPENED|INTENT)\b/;
  const labeledWarning = /(?:·|:)\s*(?:FAILED|ERROR|DENIED|UNAVAILABLE|REJECTED|AMBIGUOUS|NEEDS_CONFIRMATION|NOT FOUND|NO MATCH|TOPILMADI|RAD ETILDI)\b/;
  const labeledVerified = /(?:·|:)\s*(?:VERIFIED|READY|ACHIEVED|COMPLETED|COMPLETE)\b/;
  const labeledStarted = /(?:·|:)\s*(?:STARTED|OPENED|INTENT)\b/;
  if (has(warningLine) || has(labeledWarning)) return "warning";
  if (has(verifiedLine) || has(labeledVerified)) return "verified";
  if (has(startedLine) || has(labeledStarted)) return "started";
  return "response";
}

export function voiceOutcomeText(messages: string[], lang: "uz" | "en"): string {
  const status = classifyVoiceOutcome(messages);
  if (lang === "uz") {
    if (status === "warning") return "Buyruqda ogohlantirish yoki xatolik bor. Tafsilotlarni ekrandan tekshiring.";
    if (status === "verified") return "Buyruq natijasida tasdiqlangan holat qaytdi. Tafsilotlarni ekranda ko‘ring.";
    if (status === "started") return "Buyruq ishga tushirildi, lekin yakunlangani tasdiqlanmagan. Ekranni tekshiring.";
    return "Buyruq javobi tayyor. Tafsilotlarni ekrandan tekshiring.";
  }
  if (status === "warning") return "The command reported a warning or error. Check the screen for details.";
  if (status === "verified") return "The command returned a verified state. Check the screen for details.";
  if (status === "started") return "The command started, but completion is not verified. Check the screen.";
  return "The command returned a response. Check the screen for details.";
}
