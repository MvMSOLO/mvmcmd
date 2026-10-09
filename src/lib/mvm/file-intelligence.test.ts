import test from "node:test";
import assert from "node:assert/strict";
import { classifyMedia, formatStorageOverview, isSafeFileEntry } from "./file-intelligence.ts";

test("storage overview validates real non-negative consistent numbers", () => {
  assert.equal(formatStorageOverview(1000, 400, 600).valid, true);
  assert.equal(formatStorageOverview(-1, 400, 600).valid, false);
  assert.equal(formatStorageOverview(1000, 900, 20).valid, false);
});

test("scoped file entry validator rejects paths and empty identities", () => {
  assert.equal(isSafeFileEntry({ uri: "content://provider/tree/primary%3ADownload", name: "notes.pdf", isDirectory: false }), true);
  assert.equal(isSafeFileEntry({ uri: "file:///data/local/tmp/a", name: "a", isDirectory: false }), false);
  assert.equal(isSafeFileEntry({ uri: "content://provider/item/1", name: "../secret", isDirectory: false }), false);
  assert.equal(isSafeFileEntry({ uri: "", name: "notes.pdf", isDirectory: false }), false);
});

test("media classification uses MIME and common extensions", () => {
  assert.equal(classifyMedia("image/jpeg", "photo.bin"), "image");
  assert.equal(classifyMedia("application/octet-stream", "archive.zip"), "archive");
  assert.equal(classifyMedia("application/pdf", "scan"), "document");
  assert.equal(classifyMedia("video/mp4", "clip"), "video");
  assert.equal(classifyMedia("application/octet-stream", "misc"), "other");
});


test("storage percentages remain bounded for valid readings", () => {
  assert.equal(formatStorageOverview(1024, 0, 1024).percentUsed, 100);
  assert.equal(formatStorageOverview(0, 0, 0).percentUsed, 0);
});

test("media classifier is case-insensitive and supports common document formats", () => {
  assert.equal(classifyMedia("APPLICATION/OCTET-STREAM", "REPORT.PDF"), "document");
  assert.equal(classifyMedia("application/octet-stream", "movie.MP4"), "video");
});
