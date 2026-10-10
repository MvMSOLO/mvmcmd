import { canUseNativeAndroidLauncher, nativeLookupContact, nativeOpenDialer, nativeOpenEmailComposer, nativeOpenSmsComposer } from "./native-launcher";

export type CommunicationStatus = "started" | "unavailable" | "failed";
export interface CommunicationResult {
  status: CommunicationStatus;
  operation: "contact" | "dial" | "sms" | "email" | "copy" | "paste";
  message: string;
  verified: boolean;
  detail?: string;
}
const PHONE = /^[+()0-9\s._-]{3,32}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function normalizePhone(value: string): string { return value.trim().replace(/[.()\s-]/g, ""); }
export function validatePhone(value: string): boolean {
  const normalized = normalizePhone(value);
  return PHONE.test(value) && /^\+?[0-9]{3,20}$/.test(normalized);
}
export function validateEmail(value: string): boolean { return EMAIL.test(value.trim()); }

export async function lookupContact(query: string): Promise<CommunicationResult & { name?: string; phone?: string }> {
  const target = query.trim();
  if (!target) return { status: "failed", operation: "contact", message: "Contact query is required.", verified: false };
  if (!canUseNativeAndroidLauncher()) return { status: "unavailable", operation: "contact", message: "Contact lookup requires the native Android app.", verified: false };
  try {
    const result = await nativeLookupContact(target);
    if (!result.found) return { status: "started", operation: "contact", message: "No matching contact found.", verified: true };
    return { status: "started", operation: "contact", message: result.name ? result.name + (result.phone ? ` · ${result.phone}` : "") : result.phone ?? "Contact found.", verified: true, name: result.name, phone: result.phone };
  } catch (error) {
    return { status: "failed", operation: "contact", message: "Contact lookup failed.", verified: false, detail: error instanceof Error ? error.message : "unknown error" };
  }
}
export async function openDialer(target: string): Promise<CommunicationResult> {
  if (!validatePhone(target)) return { status: "failed", operation: "dial", message: "Invalid phone number.", verified: false };
  if (!canUseNativeAndroidLauncher()) return { status: "unavailable", operation: "dial", message: "Dialer handoff requires native Android.", verified: false };
  try {
    const result = await nativeOpenDialer(normalizePhone(target));
    return result.opened ? { status: "started", operation: "dial", message: "Dialer opened. No call was placed.", verified: false } : { status: "failed", operation: "dial", message: "Dialer could not be opened.", verified: false };
  } catch (error) { return { status: "failed", operation: "dial", message: "Dialer handoff failed.", verified: false, detail: error instanceof Error ? error.message : "unknown error" }; }
}
export async function openSmsComposer(target: string, body: string): Promise<CommunicationResult> {
  if (!validatePhone(target)) return { status: "failed", operation: "sms", message: "Invalid phone number.", verified: false };
  if (!body.trim()) return { status: "failed", operation: "sms", message: "SMS body is required.", verified: false };
  if (!canUseNativeAndroidLauncher()) return { status: "unavailable", operation: "sms", message: "SMS composer handoff requires native Android.", verified: false };
  try {
    const result = await nativeOpenSmsComposer(normalizePhone(target), body);
    return result.opened ? { status: "started", operation: "sms", message: "SMS composer opened. Message delivery is not verified.", verified: false } : { status: "failed", operation: "sms", message: "SMS composer could not be opened.", verified: false };
  } catch (error) { return { status: "failed", operation: "sms", message: "SMS composer handoff failed.", verified: false, detail: error instanceof Error ? error.message : "unknown error" }; }
}
export async function openEmailComposer(target: string, subject = "", body = ""): Promise<CommunicationResult> {
  if (!validateEmail(target)) return { status: "failed", operation: "email", message: "Invalid email address.", verified: false };
  if (!canUseNativeAndroidLauncher()) return { status: "unavailable", operation: "email", message: "Email composer handoff requires native Android.", verified: false };
  try {
    const result = await nativeOpenEmailComposer(target, subject, body);
    return result.opened ? { status: "started", operation: "email", message: "Email composer opened. Delivery is not verified.", verified: false } : { status: "failed", operation: "email", message: "Email composer could not be opened.", verified: false };
  } catch (error) { return { status: "failed", operation: "email", message: "Email composer handoff failed.", verified: false, detail: error instanceof Error ? error.message : "unknown error" }; }
}
export async function copyText(text: string): Promise<CommunicationResult> {
  if (!text.trim()) return { status: "failed", operation: "copy", message: "Copy needs explicit text.", verified: false };
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return { status: "unavailable", operation: "copy", message: "Clipboard write is unavailable on this platform.", verified: false };
  try { await navigator.clipboard.writeText(text); return { status: "started", operation: "copy", message: "Text copied to the clipboard.", verified: true }; }
  catch (error) { return { status: "failed", operation: "copy", message: "Clipboard write was blocked by the platform.", verified: false, detail: error instanceof Error ? error.message : "unknown error" }; }
}
export async function pasteText(): Promise<CommunicationResult & { text?: string }> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return { status: "unavailable", operation: "paste", message: "Clipboard read is unavailable on this platform.", verified: false };
  try { const text = await navigator.clipboard.readText(); return { status: "started", operation: "paste", message: text ? "Clipboard text read explicitly." : "Clipboard is empty.", verified: true, text }; }
  catch (error) { return { status: "failed", operation: "paste", message: "Clipboard read was blocked by the platform.", verified: false, detail: error instanceof Error ? error.message : "unknown error" }; }
}