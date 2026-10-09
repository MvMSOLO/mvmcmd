import assert from "node:assert/strict";
import test from "node:test";
import { COMMANDS, lookupCommand, parseLine } from "./commands.ts";

test("command registry resolves every canonical name and alias deterministically", () => {
  for (const command of COMMANDS) {
    assert.equal(lookupCommand(command.name)?.name, command.name, "canonical command: " + command.name);
    for (const alias of command.aliases) {
      assert.equal(lookupCommand(alias)?.name, command.name, "alias " + JSON.stringify(alias) + " for " + command.name);
    }
  }
});

test("parser treats blank input as a non-action", () => {
  for (const input of ["", " ", "\t", "\n  \r\n"]) {
    const parsed = parseLine(input);
    assert.equal(parsed.cmd, undefined);
    assert.deepEqual(parsed.args, []);
    assert.equal(parsed.raw, input.trim());
  }
});

test("parser normalizes command heads while retaining canonical command identity", () => {
  const cases: Array<[string, string]> = [
    ["HELP", "help"],
    ["performance", "perf"],
    ["BENCHMARK", "perf"],
    ["time", "date"],
    ["WALL", "wallpaper"],
    ["launch YouTube", "open"],
    ["SEARCH weather", "find"],
    ["game-mode", "gaming"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(parseLine(input).cmd?.name, expected, input);
  }
});

test("quoted arguments remain a single argument, including multilingual text", () => {
  assert.deepEqual(parseLine('open "YouTube Music"').args, ["YouTube Music"]);
  assert.deepEqual(parseLine('sms +998901234567 "Salom dunyo"').args, ["+998901234567", "Salom dunyo"]);
  assert.deepEqual(parseLine('find "toshkent ob-havo"').args, ["toshkent ob-havo"]);
  assert.equal(parseLine('open "YouTube Music"').cmd?.name, "open");
});

test("deterministic parser stress corpus never throws or returns an unregistered command", () => {
  const fragments = [
    "", "open", "HELP", "performance", '"quoted value"', '"unterminated',
    "\u0000", "🔥", "../secret", "https://example.com/?token=secret", "o'yin", "x".repeat(4096),
  ];
  for (const left of fragments) {
    for (const right of fragments) {
      const input = left + " " + right;
      assert.doesNotThrow(() => {
        const parsed = parseLine(input);
        assert.equal(typeof parsed.raw, "string");
        assert.ok(Array.isArray(parsed.args));
        if (parsed.cmd) {
          assert.ok(COMMANDS.some((entry) => entry.name === parsed.cmd?.name), "unregistered command for " + JSON.stringify(input));
        }
      }, "input should not crash parser: " + JSON.stringify(input.slice(0, 100)));
    }
  }
});

test("oversized and malformed inputs remain inert unless a known command is parsed", () => {
  const malformed = [
    "\u0000",
    '"open"',
    'open "unterminated value',
    "unknown-command payload",
    "x".repeat(16_384),
    'open "' + "x".repeat(4096) + '"',
  ];
  for (const input of malformed) {
    const parsed = parseLine(input);
    assert.equal(typeof parsed.raw, "string");
    assert.ok(Array.isArray(parsed.args));
    if (parsed.cmd) assert.ok(COMMANDS.some((entry) => entry.name === parsed.cmd?.name));
  }
  assert.equal(parseLine("unknown-command payload").cmd, undefined);
});
