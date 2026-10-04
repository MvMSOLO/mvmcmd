import { compact, fold, tokens } from "./normalize";

export type MvmIntent =
  | "open_app"
  | "device_snapshot"
  | "permission_status"
  | "find_app"
  | "help"
  | "unknown";

export interface IntentEntity {
  type: "app_query" | "capability" | "text";
  value: string;
}

export interface MvmIntentResult {
  intent: MvmIntent;
  confidence: number;
  entities: IntentEntity[];
  context: {
    original: string;
    normalized: string;
    language: "uz" | "en" | "mixed";
  };
  requiredCapabilities: string[];
  reason: string;
}

const UZ_OPEN = ["och", "ochir", "oching", "ishga", "ishga tushir", "ishga tushiring", "yurgiz"];
const EN_OPEN = ["open", "launch", "start", "run"];

const UZ_DEVICE = [
  "qurilma", "telefon", "device", "hardware", "monitor", "ram", "xotira",
  "batareya", "battery", "temperatura", "harorat", "cpu", "protsessor",
  "storage", "saqlash", "ekran", "display", "bluetooth", "sensor", "internet",
  "wifi", "wi fi", "tarmoq",
];
const EN_DEVICE = [
  "device", "hardware", "monitor", "ram", "memory", "battery", "temperature",
  "thermal", "cpu", "storage", "display", "bluetooth", "sensor", "network",
  "wifi",
];

function hasAny(text: string, words: string[]): boolean {
  const c = compact(text);
  return words.some((word) => {
    const w = compact(word);
    return w && (c === w || c.includes(w));
  });
}

function detectLanguage(text: string): "uz" | "en" | "mixed" {
  const f = fold(text);
  const uz = /\b(och|oching|qurilma|telefon|batareya|xotira|harorat|ekran|tarmoq|sensor)\b/i.test(f);
  const en = /\b(open|launch|start|run|device|battery|memory|temperature|display|network|sensor)\b/i.test(f);
  return uz && en ? "mixed" : uz ? "uz" : "en";
}

function extractAfterCue(text: string, cues: string[]): string {
  const f = fold(text).trim();
  for (const cue of cues) {
    const c = fold(cue);
    const index = f.indexOf(c);
    if (index >= 0) {
      return f.slice(index + c.length).replace(/^[\s:,-]+/, "").trim();
    }
  }
  return "";
}

function cleanAppQuery(value: string): string {
  return value
    .replace(/\b(please|pls|iltimos|menga|meni|ni|ga|da|dan|the|app|ilovasi|ilovasini|ilovani)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Phase 4 is deliberately deterministic and local. It converts natural language
 * into a stable intent contract; it does not claim to be an LLM and does not
 * execute actions by itself.
 */
export function understandCommand(input: string): MvmIntentResult {
  const original = input.trim();
  const normalized = fold(original).replace(/\s+/g, " ").trim();
  const language = detectLanguage(original);

  if (!normalized) {
    return { intent: "unknown", confidence: 0, entities: [], context: { original, normalized, language }, requiredCapabilities: [], reason: "empty" };
  }

  if (/^(help|man|what can you do|yordam|nima qila olasan)\b/i.test(normalized)) {
    return { intent: "help", confidence: 0.99, entities: [], context: { original, normalized, language }, requiredCapabilities: [], reason: "help cue" };
  }

  if (hasAny(normalized, UZ_DEVICE.concat(EN_DEVICE))) {
    const capability = UZ_DEVICE.concat(EN_DEVICE).find((w) => normalized.includes(compact(w)));
    return {
      intent: "device_snapshot",
      confidence: 0.94,
      entities: capability ? [{ type: "capability", value: capability }] : [],
      context: { original, normalized, language },
      requiredCapabilities: ["device"],
      reason: "device telemetry vocabulary",
    };
  }

  if (hasAny(normalized, ["permission", "permissions", "ruxsat", "ruxsatlar", "access"])) {
    return {
      intent: "permission_status",
      confidence: 0.93,
      entities: [],
      context: { original, normalized, language },
      requiredCapabilities: [],
      reason: "permission vocabulary",
    };
  }

  const openCue = EN_OPEN.concat(UZ_OPEN);
  if (hasAny(normalized, openCue)) {
    const query = cleanAppQuery(extractAfterCue(original, openCue));
    if (query) {
      return {
        intent: "open_app",
        confidence: 0.91,
        entities: [{ type: "app_query", value: query }],
        context: { original, normalized, language },
        requiredCapabilities: ["app_launch"],
        reason: "launch verb + app entity",
      };
    }
  }

  const findCue = ["find", "search", "qidir", "top", "topib ber"];
  if (hasAny(normalized, findCue)) {
    const query = cleanAppQuery(extractAfterCue(original, findCue));
    if (query) {
      return {
        intent: "find_app",
        confidence: 0.89,
        entities: [{ type: "app_query", value: query }],
        context: { original, normalized, language },
        requiredCapabilities: [],
        reason: "search verb + app entity",
      };
    }
  }

  return {
    intent: "unknown",
    confidence: 0.12,
    entities: [{ type: "text", value: original }],
    context: { original, normalized, language },
    requiredCapabilities: [],
    reason: "no supported intent pattern",
  };
}
