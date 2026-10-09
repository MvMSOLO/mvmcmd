import assert from "node:assert/strict";
import test from "node:test";
import { assessPerformanceMetric, clearPerformanceMeasurements, formatPerformanceReport, getPerformanceMeasurements, latestPerformanceAssessment, recordPerformanceMeasurement } from "./performance-budget.ts";

test("performance assessments are evidence-based and missing samples stay unmeasured", () => {
  clearPerformanceMeasurements();
  assert.equal(latestPerformanceAssessment("renderer-ready-ms").verdict, "unmeasured");
  assert.equal(assessPerformanceMetric("command-parse-ms", 8).verdict, "pass");
  assert.equal(assessPerformanceMetric("input-route-ms", 175).verdict, "warning");
  assert.equal(assessPerformanceMetric("frame-rate-fps", 20).verdict, "fail");
  assert.equal(assessPerformanceMetric("heap-mb", undefined).verdict, "unmeasured");
});
test("invalid or implausible values cannot be recorded as measured results", () => {
  clearPerformanceMeasurements();
  assert.equal(recordPerformanceMeasurement("command-parse-ms", Number.NaN, "test"), false);
  assert.equal(recordPerformanceMeasurement("heap-mb", -1, "test"), false);
  assert.equal(recordPerformanceMeasurement("frame-rate-fps", 999, "test"), false);
  assert.equal(getPerformanceMeasurements().length, 0);
});
test("samples are bounded, copied on read, and retain measurement provenance", () => {
  clearPerformanceMeasurements();
  for (let i=0;i<80;i++) assert.equal(recordPerformanceMeasurement("command-parse-ms", i % 12, "performance.now", i+1), true);
  const samples=getPerformanceMeasurements();
  assert.equal(samples.length,60);
  samples[0].value=999;
  assert.notEqual(getPerformanceMeasurements()[0].value,999);
  assert.equal(latestPerformanceAssessment("command-parse-ms").source,"performance.now");
  assert.equal(latestPerformanceAssessment("command-parse-ms").verdict,"pass");
});
test("report never invents battery drain or hardware results", () => {
  clearPerformanceMeasurements();
  const reportUz=formatPerformanceReport("uz").join("\n");
  const reportEn=formatPerformanceReport("en").join("\n");
  assert.match(reportUz,/O‘LCHANMAGAN/);
  assert.match(reportEn,/UNMEASURED/);
  assert.match(reportEn,/not a GPU-only rendering benchmark/i);
  assert.match(reportEn,/Command understanding \+ parse: unmeasured/);
});
