import assert from "node:assert/strict";
import test from "node:test";
import { describeGlobalEntry, draftFromGlobalEntry, normalizeExternalCommand, normalizeGlobalEntry } from "./global-entry-points.ts";

test("external commands are allow-listed", () => {
  assert.equal(normalizeExternalCommand("QR"), "qr");
  assert.equal(normalizeExternalCommand("notifications"), "notification");
  assert.equal(normalizeExternalCommand("reset"), undefined);
  assert.equal(normalizeExternalCommand("qr confirm"), undefined);
  assert.equal(normalizeExternalCommand("javascript:alert(1)"), undefined);
});
test("deep links stage drafts without executing them", () => {
  const e=normalizeGlobalEntry({available:true,id:"1",source:"android",kind:"command",command:"qr"});
  assert.ok(e); assert.equal(draftFromGlobalEntry(e!),"qr");
  assert.match(describeGlobalEntry(e!,"en"),/review it before pressing Launch/i);
});
test("shared text is staged for explicit review", () => {
  const e=normalizeGlobalEntry({available:true,id:"2",source:"android",kind:"share-text",text:"open YouTube"});
  assert.ok(e); assert.equal(draftFromGlobalEntry(e!),"open YouTube");
  assert.match(describeGlobalEntry(e!,"en"),/nothing has executed/i);
});
test("Android incoming files require a scoped content URI", () => {
  const e=normalizeGlobalEntry({available:true,id:"3",source:"android",kind:"share-file",uri:"content://provider/document/1",mimeType:"application/pdf"});
  assert.ok(e); assert.equal(draftFromGlobalEntry(e!),"openfile content://provider/document/1");
  assert.equal(normalizeGlobalEntry({available:true,id:"4",source:"android",kind:"open-file",uri:"file:///data/data/private.pdf"}),undefined);
});
test("desktop file entries require a local file URL", () => {
  const e=normalizeGlobalEntry({available:true,id:"5",source:"desktop",kind:"open-file",uri:"file:///C:/Users/test/report%20draft.pdf"});
  assert.ok(e); assert.equal(draftFromGlobalEntry(e!),"openfile file:///C:/Users/test/report%20draft.pdf");
  assert.equal(normalizeGlobalEntry({available:true,id:"6",source:"desktop",kind:"open-file",uri:"https://example.com/a.pdf"}),undefined);
});
test("malformed payloads are ignored", () => {
  assert.equal(normalizeGlobalEntry(null),undefined);
  assert.equal(normalizeGlobalEntry({available:false}),undefined);
  assert.equal(normalizeGlobalEntry({id:"x",source:"desktop",kind:"command",command:"unknown"}),undefined);
});
