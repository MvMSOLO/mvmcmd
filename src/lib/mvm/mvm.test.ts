import test from "node:test";
import assert from "node:assert/strict";

import { lookupCommand, parseLine } from "./commands.ts";
import { CATALOG, findByIdOrName } from "./catalog.ts";
import { execute } from "./executor.ts";
import { loadState, EMPTY } from "./persist.ts";
import { launchRawUrl } from "./intents.ts";

test("command parser handles aliases and quoted arguments", () => {
  assert.equal(parseLine("o github").cmd?.name, "open");
  assert.equal(parseLine('bind "my app" github').args[0], "my app");
  assert.equal(lookupCommand("rescan")?.name, "refresh");
});

test("catalog contains unique identifiers and real package ids are searchable", () => {
  const ids = CATALOG.map((app) => app.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(findByIdOrName("github")?.androidPackage, "com.github.android");
});

test("static alias binding and unbinding are persisted in the command state", async () => {
  let raw = "";
  globalThis.localStorage = {
    getItem: () => raw || null,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
    removeItem: () => {
      raw = "";
    },
    clear: () => {
      raw = "";
    },
    key: () => null,
    length: 0,
  } as unknown as Storage;

  const bound = await execute("bind gh github", { state: EMPTY, lang: "en" });
  assert.equal(bound.state.aliases[0]?.alias, "gh");
  assert.equal(bound.state.aliases[0]?.target, "github");

  const restored = loadState();
  assert.equal(restored.aliases[0]?.alias, "gh");

  const unbound = await execute("unbind gh", { state: bound.state, lang: "en" });
  assert.equal(unbound.state.aliases.some((row) => row.alias === "gh"), false);
});

test("unknown input returns an actual failure instead of fake success", async () => {
  const result = await execute("definitely-not-an-app-xyz", { state: EMPTY, lang: "en" });
  assert.equal(result.lines[0]?.kind, "warn");
  assert.match(result.lines[0]?.text ?? "", /No match/);
});

test("dangerous URL schemes are rejected by the web launcher", () => {
  assert.equal(launchRawUrl("javascript:alert(1)"), false);
});


test("catalog does not duplicate concrete Android package ids", () => {
  const packages = CATALOG.map((app) => app.androidPackage).filter((pkg): pkg is string => Boolean(pkg));
  assert.equal(new Set(packages).size, packages.length);
});

test("raw Android package names resolve as real launch targets", async () => {
  const result = await execute("open com.example.unlisted", { state: EMPTY, lang: "en" });
  assert.equal(result.hits?.[0]?.app.androidPackage, "com.example.unlisted");
  assert.equal(result.hits?.[0]?.reason, "package");
});
