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
  const joined = messages.join("\n");
  if (/\b(?:FAILED|ERROR|DENIED|UNAVAILABLE|REJECTED|AMBIGUOUS|NEEDS_CONFIRMATION|NOT FOUND|NO MATCH|TOPILMADI|RAD ETILDI)\b/i.test(joined)) return "warning";
  if (/\b(?:VERIFIED|READY|ACHIEVED|COMPLETED|COMPLETE)\b/i.test(joined)) return "verified";
  if (/\b(?:STARTED|OPENED|INTENT)\b/i.test(joined)) return "started";
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
