import test from "node:test";
import assert from "node:assert/strict";
import { getCapabilityDefinitions, getCapabilityDefinition } from "./registry.ts";

test("capability registry exposes known Android capabilities", () => {
  const defs = getCapabilityDefinitions();
  assert.ok(defs.length >= 5);
  const ids = defs.map((d) => d.id);
  assert.ok(ids.includes("camera"));
  assert.ok(ids.includes("notifications"));
  assert.ok(ids.includes("contacts"));
});

test("capability ids are unique", () => {
  const defs = getCapabilityDefinitions();
  const ids = defs.map((d) => d.id);
  assert.equal(ids.length, new Set(ids).size);
});

test("every capability has label and platform", () => {
  for (const def of getCapabilityDefinitions()) {
    assert.ok(def.id);
    assert.ok(def.label);
    assert.ok(def.platform);
  }
});

test("getCapabilityDefinition returns exact match or undefined", () => {
  assert.equal(getCapabilityDefinition("camera")?.id, "camera");
  assert.equal(getCapabilityDefinition("not-a-capability" as never), undefined);
});

test("optional flags are explicit when present", () => {
  const optional = getCapabilityDefinitions().filter((d) => d.optional);
  assert.ok(optional.length > 0);
  assert.ok(optional.every((d) => d.optional === true));
});
