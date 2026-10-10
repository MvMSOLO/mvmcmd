import { compact, fold } from "./normalize";
import { skillForIntent } from "./skills";

export type MvmIntent = "open_app" | "device_snapshot" | "permission_status" | "find_app" | "help" | "unknown";
export interface IntentEntity { type: "app_query" | "capability" | "text"; value: string; }
export interface MvmIntentResult {
  intent: MvmIntent;
  skillId?: string;
  confidence: number;
  entities: IntentEntity[];
  context: { original: string; normalized: string; language: "uz" | "en" | "mixed"; };
  requiredCapabilities: string[];
  reason: string;
}

const UZ_OPEN = ["och", "oching", "ishga tushir", "ishga tushiring", "yurgiz"];
const EN_OPEN = ["open", "launch", "start", "run"];
const UZ_DEVICE = ["qurilma", "telefon", "device", "hardware", "monitor", "ram", "xotira", "batareya", "battery", "temperatura", "harorat", "cpu", "protsessor", "storage", "saqlash", "ekran", "display", "bluetooth", "sensor", "internet", "wifi", "wi fi", "tarmoq"];
const EN_DEVICE = ["device", "hardware", "monitor", "ram", "memory", "battery", "temperature", "thermal", "cpu", "storage", "display", "bluetooth", "sensor", "network", "wifi"];

function hasAny(text: string, words: string[]): boolean {
  const c = compact(text);
  return words.some((word) => { const w = compact(word); return w && (c === w || c.includes(w)); });
}
function detectLanguage(text: string): "uz" | "en" | "mixed" {
  const f = fold(text);
  const uz = /\b(och|oching|qurilma|telefon|batareya|xotira|harorat|ekran|tarmoq|sensor)\b/i.test(f);
  const en = /\b(open|launch|start|run|device|battery|memory|temperature|display|network|sensor)\b/i.test(f);
  return uz && en ? "mixed" : uz ? "uz" : "en";
}
function extractAfterCue(text: string, cues: string[]): string {
  const f = fold(text).trim();
  for (const cue of cues) { const c = fold(cue); const index = f.indexOf(c); if (index >= 0) return f.slice(index + c.length).replace(/^[\s:,-]+/, "").trim(); }
  return "";
}
function cleanAppQuery(value: string): string {
  return value.replace(/\b(please|pls|iltimos|menga|meni|ni|ga|da|dan|the|app|ilovasi|ilovasini|ilovani)\b/gi, " ").replace(/\s+/g, " ").trim();
}
function base(input: string, intent: MvmIntent, confidence: number, entities: IntentEntity[], requiredCapabilities: string[], reason: string): MvmIntentResult {
  return { intent, skillId: skillForIntent(intent)?.id, confidence, entities, context: { original: input.trim(), normalized: fold(input).replace(/\s+/g, " ").trim(), language: detectLanguage(input) }, requiredCapabilities, reason };
}

/** Deterministic local intent normalization. Skill resolution is metadata-only. */
export function understandCommand(input: string): MvmIntentResult {
  const original = input.trim();
  const normalized = fold(original).replace(/\s+/g, " ").trim();
  const language = detectLanguage(original);
  if (!normalized) return { intent: "unknown", confidence: 0, entities: [], context: { original, normalized, language }, requiredCapabilities: [], reason: "empty" };
  if (/^(help|man|what can you do|yordam|nima qila olasan)\b/i.test(normalized)) return base(original, "help", 0.99, [], [], "help cue");
  if (hasAny(normalized, UZ_DEVICE.concat(EN_DEVICE))) {
    const capability = UZ_DEVICE.concat(EN_DEVICE).find((w) => normalized.includes(compact(w)));
    return base(original, "device_snapshot", 0.94, capability ? [{ type: "capability", value: capability }] : [], ["device"], "device telemetry vocabulary");
  }
  if (hasAny(normalized, ["permission", "permissions", "ruxsat", "ruxsatlar", "access", "perm"])) {
    const capability = extractAfterCue(original, ["perm", "permission", "permissions", "ruxsat", "ruxsatlar", "access"]);
    const known = ["camera", "microphone", "notifications", "notification_listener", "contacts", "overlay", "usage_access"];
    const matched = known.find((id) => compact(capability).includes(compact(id)) || compact(normalized).includes(compact(id)));
    return base(original, "permission_status", 0.93, matched ? [{ type: "capability", value: matched }] : [], matched ? [matched] : [], matched ? "permission vocabulary + capability" : "permission vocabulary");
  }
  const openCue = EN_OPEN.concat(UZ_OPEN);
  if (hasAny(normalized, openCue)) {
    const query = cleanAppQuery(extractAfterCue(original, openCue));
    if (query) return base(original, "open_app", 0.91, [{ type: "app_query", value: query }], ["app_launch"], "launch verb + app entity");
  }
  const findCue = ["find", "search", "qidir", "top", "topib ber"];
  if (hasAny(normalized, findCue)) {
    const query = cleanAppQuery(extractAfterCue(original, findCue));
    if (query) return base(original, "find_app", 0.89, [{ type: "app_query", value: query }], [], "search verb + app entity");
  }
  return { intent: "unknown", confidence: 0.12, entities: [{ type: "text", value: original }], context: { original, normalized, language }, requiredCapabilities: [], reason: "no supported intent pattern" };
}
