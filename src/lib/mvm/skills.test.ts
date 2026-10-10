import test from "node:test";
import assert from "node:assert/strict";
import {
  MVM_SKILLS,
  getMvmSkill,
  findMvmSkill,
  listMvmSkills,
  skillForIntent,
  getSkillRequirements,
} from "./skills.ts";

test("every skill has required metadata fields", () => {
  for (const skill of MVM_SKILLS) {
    assert.ok(skill.id, "skill id required");
    assert.ok(skill.name, "skill name required");
    assert.ok(Array.isArray(skill.aliases), "aliases array required");
    assert.ok(skill.category, "category required");
    assert.ok(skill.platforms.length > 0, "at least one platform");
    assert.ok(Array.isArray(skill.requiredCapabilities), "requiredCapabilities array");
    assert.ok(["low", "medium", "high"].includes(skill.risk), "valid risk");
    assert.ok(skill.handler, "handler required");
    assert.ok(skill.verification, "verification note required");
    assert.equal(typeof skill.enabled, "boolean");
  }
});

test("skill ids are unique", () => {
  const ids = MVM_SKILLS.map((s) => s.id);
  assert.equal(ids.length, new Set(ids).size);
});

test("aliases do not collide across skills", () => {
  const seen = new Map<string, string>();
  for (const skill of MVM_SKILLS) {
    for (const alias of skill.aliases) {
      const key = alias.trim().toLocaleLowerCase();
      const previous = seen.get(key);
      assert.equal(
        previous,
        undefined,
        `alias "${alias}" collides between ${previous} and ${skill.id}`,
      );
      seen.set(key, skill.id);
    }
  }
});

test("getMvmSkill and findMvmSkill resolve known entries", () => {
  assert.equal(getMvmSkill("open-app")?.id, "open-app");
  assert.equal(findMvmSkill("open")?.id, "open-app");
  assert.equal(findMvmSkill("och")?.id, "open-app");
  assert.equal(findMvmSkill("not-a-real-skill"), undefined);
});

test("skillForIntent only maps supported Phase 4 intents", () => {
  assert.equal(skillForIntent("open_app")?.id, "open-app");
  assert.equal(skillForIntent("find_app")?.id, "find-app");
  assert.equal(skillForIntent("unknown_intent"), undefined);
});

test("listMvmSkills can filter by platform", () => {
  const androidOnly = listMvmSkills({ platform: "android" });
  assert.ok(androidOnly.length > 0);
  assert.ok(androidOnly.every((s) => s.platforms.includes("android")));
});

test("getSkillRequirements returns declared capabilities", () => {
  assert.deepEqual(getSkillRequirements("camera"), ["camera"]);
  assert.deepEqual(getSkillRequirements("missing"), []);
});
