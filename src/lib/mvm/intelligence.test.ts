import assert from "node:assert/strict";
import test from "node:test";
import { understandCommand } from "./intelligence.ts";
import { skillForIntent } from "./skills.ts";

test("permission command keeps the requested capability", () => {
  const result = understandCommand("perm camera");
  assert.equal(result.intent, "permission_status");
  assert.equal(result.skillId, "permission-status");
  assert.equal(result.entities[0]?.value, "camera");
});

test("find-app resolves to a skill and does not launch", () => {
  const result = understandCommand("find telegram");
  assert.equal(result.intent, "find_app");
  assert.equal(result.skillId, skillForIntent("find_app")?.id);
  assert.equal(result.entities[0]?.value, "telegram");
});

test("same input is deterministic", () => {
  const a = understandCommand("och youtube");
  const b = understandCommand("och youtube");
  assert.deepEqual(a, b);
  assert.equal(a.intent, "open_app");
});
