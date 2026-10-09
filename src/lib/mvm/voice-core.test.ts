import assert from "node:assert/strict";
import test from "node:test";
import { classifyVoiceOutcome, normalizeVoiceCommand, voiceOutcomeText } from "./voice-core.ts";

test("removes a spoken wake phrase and preserves the command intent", () => {
  assert.equal(normalizeVoiceCommand("Hey MVM, open YouTube!"), "open YouTube");
  assert.equal(normalizeVoiceCommand("MVM command, files list"), "files list");
  assert.equal(normalizeVoiceCommand("hello M.V.M: device"), "device");
});

test("normalizes spacing and speech punctuation without rewriting entities", () => {
  assert.equal(normalizeVoiceCommand("  open   WhatsApp,  "), "open WhatsApp,");
  assert.equal(normalizeVoiceCommand("email alex@example.com subject hello."), "email alex@example.com subject hello");
});

test("does not invent a command from an empty transcript", () => {
  assert.equal(normalizeVoiceCommand("   "), "");
  assert.equal(normalizeVoiceCommand("MVM"), "");
});

test("does not execute or confirm commands during normalization", () => {
  assert.equal(normalizeVoiceCommand("MVM, files delete content://provider/item confirm"), "files delete content://provider/item confirm");
});

test("warning status takes precedence over a started action", () => {
  assert.equal(classifyVoiceOutcome(["SMS STARTED", "SMS delivery is not confirmed", "FAILED permission"]), "warning");
  assert.match(voiceOutcomeText(["SMS STARTED", "FAILED permission"], "en"), /warning or error/i);
});

test("only explicit success-state wording is described as verified", () => {
  assert.equal(classifyVoiceOutcome(["CAPABILITY MICROPHONE READY"]), "verified");
  assert.equal(classifyVoiceOutcome(["TASK STARTED", "completion is not verified"]), "started");
  assert.equal(classifyVoiceOutcome(["Command returned; no success is claimed"]), "response");
});

test("started actions are spoken without overstating completion", () => {
  assert.match(voiceOutcomeText(["DIAL STARTED"], "en"), /completion is not verified/i);
  assert.match(voiceOutcomeText(["DIAL STARTED"], "uz"), /tasdiqlanmagan/i);
});
