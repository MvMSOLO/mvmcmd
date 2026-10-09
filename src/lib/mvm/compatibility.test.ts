import assert from "node:assert/strict";
import test from "node:test";
import {
  androidVersionLabel, detectOemFamily, explainCapabilitySnapshot,
  formatAndroidCompatibilityReport, formatLocalDateTime, formatLocaleNumber,
  normalizeCommandHead, normalizeCommandWord, normalizeLanguageToken,
} from "./compatibility.ts";
import { parseLine } from "./commands.ts";

test("command tokens normalize English and Uzbek Latin/Cyrillic aliases", () => {
  assert.equal(normalizeCommandHead("OCH"), "open");
  assert.equal(normalizeCommandHead("KAMERA"), "camera");
  assert.equal(normalizeCommandHead("камера"), "camera");
  assert.equal(normalizeCommandHead("RUXSAT"), "perm");
  assert.equal(normalizeCommandHead("moslik"), "compat");
  assert.equal(normalizeCommandWord("O‘zbekcha"), "o'zbekcha");
  assert.equal(parseLine("OCH camera").cmd?.name, "open");
  assert.equal(parseLine("ruxsat CAMERA").cmd?.name, "perm");
  assert.equal(parseLine("MOSLIK").cmd?.name, "compat");
});
test("language aliases resolve consistently", () => {
  assert.equal(normalizeLanguageToken("UZ"), "uz");
  assert.equal(normalizeLanguageToken("o‘zbekcha"), "uz");
  assert.equal(normalizeLanguageToken("inglizcha"), "en");
  assert.equal(normalizeLanguageToken("English"), "en");
  assert.equal(normalizeLanguageToken("français"), undefined);
});
test("Android API matrix reports known versions and does not guess unknown levels", () => {
  assert.equal(androidVersionLabel(33), "Android 13");
  assert.equal(androidVersionLabel(36), "Android 16");
  assert.equal(androidVersionLabel(37), "Android 17");
  assert.equal(androidVersionLabel(undefined), undefined);
  assert.equal(androidVersionLabel(999), "Android API 999");
});
test("OEM recognition is a hint and handles common manufacturer/model strings", () => {
  assert.equal(detectOemFamily("samsung","SM-S928B"), "Samsung Galaxy");
  assert.equal(detectOemFamily("Xiaomi","Redmi Note"), "Xiaomi / Redmi / POCO");
  assert.equal(detectOemFamily("Google","Pixel 10"), "Google Pixel");
  assert.equal(detectOemFamily("Mystery","Model"), "Other / unclassified OEM");
});
test("compatibility report distinguishes API 32 and API 33 permission behavior", () => {
  const before=formatAndroidCompatibilityReport({sdk:32,manufacturer:"Google",model:"Pixel"},"en").join("\n");
  const after=formatAndroidCompatibilityReport({sdk:33,manufacturer:"Google",model:"Pixel"},"en").join("\n");
  assert.match(before,/Android 12L \(API 32\)/);
  assert.match(before,/Runtime prompt is not used on older APIs/);
  assert.match(after,/Android 13 \(API 33\)/);
  assert.match(after,/requires runtime permission/);
  assert.match(after,/Allow restricted settings/);
  assert.match(after,/there is no hidden bypass/);
});
test("restricted notification access receives localized safety guidance", () => {
  const uz=explainCapabilitySnapshot({id:"notification_listener",state:"restricted"},{sdk:34},"uz");
  const en=explainCapabilitySnapshot({id:"notification_listener",state:"restricted"},{sdk:34},"en");
  assert.match(uz.summary,/chekl/i);
  assert.match(uz.guidance??"",/Allow restricted settings/);
  assert.match(uz.guidance??"",/faqat ilovaga ishonsangiz/);
  assert.match(en.guidance??"",/only if you trust this app/);
  const noAccess=explainCapabilitySnapshot({id:"overlay",state:"unavailable"},{sdk:22},"en");
  assert.match(noAccess.summary,/unavailable/);
  assert.match(noAccess.guidance??"",/skip it/);
});
test("locale helpers are resilient and produce localized output", () => {
  assert.ok(formatLocalDateTime(new Date("2026-10-09T09:00:00Z"),"uz").length>0);
  assert.ok(formatLocalDateTime(new Date("2026-10-09T09:00:00Z"),"en").length>0);
  assert.equal(formatLocaleNumber(Number.NaN,"en"),"NaN");
  assert.ok(formatLocaleNumber(12345.67,"en").length>0);
  assert.ok(formatLocaleNumber(12345.67,"uz").length>0);
});
