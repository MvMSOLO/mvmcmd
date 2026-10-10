const { URL, fileURLToPath } = require("node:url");

const MAX_URI_LENGTH = 2048;
const SUPPORTED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

function hasControls(value) {
  return typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value);
}

function isSafeExternalWebUrl(raw) {
  if (typeof raw !== "string" || !raw.trim() || raw.length > MAX_URI_LENGTH || hasControls(raw) || /\s/.test(raw)) return false;
  try {
    const parsed = new URL(raw);
    if (!SUPPORTED_EXTERNAL_PROTOCOLS.has(parsed.protocol.toLowerCase())) return false;
    return Boolean(parsed.hostname) && !parsed.username && !parsed.password && parsed.hostname.length <= 253;
  } catch {
    return false;
  }
}

function isSafeLocalFileUrl(raw) {
  if (typeof raw !== "string" || !raw.trim() || raw.length > MAX_URI_LENGTH || hasControls(raw)) return false;
  const match = /^file:\/\/([^/?#]*)(\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i.exec(raw);
  if (!match || match[1]) return false;
  if (/[?#]/.test(raw)) return false;
  let decoded = match[2] || "/";
  for (let depth = 0; depth < 3; depth++) {
    let next;
    try { next = decodeURIComponent(decoded); } catch { return false; }
    if (next.includes("\\") || next.split("/").some((part) => part === "." || part === "..")) return false;
    if (next === decoded) break;
    decoded = next;
  }
  if (/\/(?:Windows\/(?:System32|SysWOW64|WinSxS)|ProgramData(?:\/|$)|ProgramData\/Microsoft\/Windows\/Start Menu)(?:\/|$)/i.test(decoded)) return false;
  if (/^\/(?:etc|proc|sys|dev|root|boot)(?:\/|$)/i.test(decoded)) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "file:" && !parsed.host && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

function isTrustedLocalOrigin(raw, expectedOrigin) {
  if (typeof raw !== "string" || typeof expectedOrigin !== "string" || !expectedOrigin) return false;
  try {
    const parsed = new URL(raw);
    const expected = new URL(expectedOrigin);
    return parsed.origin === expected.origin && parsed.protocol === "http:"
      && parsed.hostname === "127.0.0.1" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function isTrustedRenderer(event, mainWindow, expectedOrigin) {
  try {
    if (!mainWindow || mainWindow.isDestroyed() || event?.sender !== mainWindow.webContents) return false;
    const frame = event.senderFrame;
    if (frame && event.sender.mainFrame && frame !== event.sender.mainFrame) return false;
    const senderUrl = frame?.url || event.sender.getURL();
    return isTrustedLocalOrigin(senderUrl, expectedOrigin);
  } catch {
    return false;
  }
}

function getSafeLocalFilePath(raw, options = {}) {
  if (!isSafeLocalFileUrl(raw)) return undefined;
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const target = path.resolve(fileURLToPath(new URL(raw)));
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return undefined;
    const real = fs.realpathSync(target);
    const extension = path.extname(real).toLowerCase();
    if (options.allowedExtensions && !options.allowedExtensions.has(extension)) return undefined;
    return real;
  } catch {
    return undefined;
  }
}

module.exports = {
  getSafeLocalFilePath,
  isSafeExternalWebUrl,
  isSafeLocalFileUrl,
  isTrustedLocalOrigin,
  isTrustedRenderer,
};
