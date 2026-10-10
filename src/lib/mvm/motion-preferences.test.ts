import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isMotionReduced,
  motionModeDescription,
  motionModeLabel,
  nextMotionMode,
  normalizeMotionMode,
} from "./motion-preferences.ts";

test("unknown stored preferences safely fall back to the system", () => {
  assert.equal(normalizeMotionMode("reduced"), "reduced");
  assert.equal(normalizeMotionMode("full"), "system");
  assert.equal(normalizeMotionMode(null), "system");
  assert.equal(normalizeMotionMode({ mode: "reduced" }), "system");
});

test("reduced motion respects both the OS preference and explicit user choice", () => {
  assert.equal(isMotionReduced("system", true), true);
  assert.equal(isMotionReduced("system", false), false);
  assert.equal(isMotionReduced("reduced", false), true);
  assert.equal(isMotionReduced("reduced", true), true);
});

test("motion control switches between explicit reduction and system mode", () => {
  assert.equal(nextMotionMode("system"), "reduced");
  assert.equal(nextMotionMode("reduced"), "system");
  assert.equal(motionModeLabel("reduced", false, "en"), "MOTION · REDUCED");
  assert.match(motionModeDescription("system", true, "en"), /system's reduced-motion preference/i);
});

test("decorative 3D assets are local, inert visuals with reduced-motion coverage", () => {
  const component = readFileSync(fileURLToPath(new URL("../../components/mvm/mvm-3d.tsx", import.meta.url)), "utf8");
  const assets = readFileSync(fileURLToPath(new URL("./3d-assets.ts", import.meta.url)), "utf8");
  const styles = readFileSync(fileURLToPath(new URL("../../styles.css", import.meta.url)), "utf8");
  assert.match(component, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.doesNotMatch(component, /window\.open|location\.(?:assign|href)/);
  assert.doesNotMatch(assets, /kernelCadUrl|app\.kernelcad\.com/i);
  assert.match(styles, /\.mvm-motion-reduced/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /:focus-visible/);
});
