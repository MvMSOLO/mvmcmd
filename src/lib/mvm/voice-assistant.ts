import { canUseNativeAndroidLauncher, nativeSpeakVoice, nativeStartVoiceRecognition, nativeStopVoiceRecognition, nativeStopVoiceSpeech } from "./native-launcher";
import { ensureCapability } from "./capabilities/manager";
import { normalizeVoiceCommand, voiceOutcomeText } from "./voice-core";

interface BrowserSpeechAlternative { transcript?: string; confidence?: number; }
interface BrowserSpeechResult extends ArrayLike<BrowserSpeechAlternative> { isFinal?: boolean; }
interface BrowserSpeechEvent { results: ArrayLike<BrowserSpeechResult>; }
interface BrowserSpeechErrorEvent { error?: string; message?: string; }
interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: BrowserSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type BrowserSpeechConstructor = new () => BrowserSpeechRecognition;
interface SpeechWindow extends Window {
  SpeechRecognition?: BrowserSpeechConstructor;
  webkitSpeechRecognition?: BrowserSpeechConstructor;
}
let activeBrowserRecognition: BrowserSpeechRecognition | null = null;

function browserRecognitionConstructor(): BrowserSpeechConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function isVoiceCaptureSupported(): boolean {
  return canUseNativeAndroidLauncher() || Boolean(browserRecognitionConstructor());
}

function recognitionErrorMessage(code?: string): string {
  switch ((code ?? "").toLowerCase()) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was denied. Allow it in system or browser settings, then retry.";
    case "audio-capture":
      return "No working microphone was found.";
    case "network":
      return "Speech recognition service failed. Check connectivity or type the command.";
    case "no-speech":
      return "No speech detected. Try again or type the command.";
    case "aborted":
      return "Voice recognition was cancelled.";
    default:
      return "Speech recognition failed. Type the command instead.";
  }
}

export async function startVoiceCapture(locale: string): Promise<string> {
  if (canUseNativeAndroidLauncher()) {
    const capability = await ensureCapability("microphone");
    if (!capability.ok) {
      if (capability.reason === "denied") throw new Error("Microphone permission is not granted. No voice command was run.");
      if (capability.reason === "settings") throw new Error("Enable microphone access in Android Settings, then return and retry.");
      throw new Error(capability.detail || "Microphone capability is unavailable on this device.");
    }
    const result = await nativeStartVoiceRecognition(locale);
    return result.cancelled ? "" : normalizeVoiceCommand(result.transcript ?? "");
  }

  const Recognition = browserRecognitionConstructor();
  if (!Recognition) throw new Error("Speech recognition is unsupported here. Type the command instead.");
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is unavailable in this browser. Type the command instead.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());

  return await new Promise<string>((resolve, reject) => {
    const recognition = new Recognition();
    activeBrowserRecognition = recognition;
    let settled = false;
    const finish = (value?: string, error?: Error) => {
      if (settled) return;
      settled = true;
      if (activeBrowserRecognition === recognition) activeBrowserRecognition = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      if (error) reject(error);
      else resolve(value ?? "");
    };
    recognition.lang = locale;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      finish(normalizeVoiceCommand(transcript));
    };
    recognition.onerror = (event) => finish(undefined, new Error(recognitionErrorMessage(event.error)));
    recognition.onend = () => finish(undefined, new Error("No speech result was received. Try again or type the command."));
    try {
      recognition.start();
    } catch {
      finish(undefined, new Error("The microphone could not start. Check permissions and retry."));
    }
  });
}

export async function stopVoiceCapture(cancel = false): Promise<void> {
  if (canUseNativeAndroidLauncher()) {
    await nativeStopVoiceRecognition(cancel);
    return;
  }
  const recognition = activeBrowserRecognition;
  if (!recognition) return;
  try {
    if (cancel) recognition.abort();
    else recognition.stop();
  } catch {
    /* The recognition session may have ended between the UI action and this call. */
  }
}

export async function cancelVoiceCapture(): Promise<void> {
  await stopVoiceCapture(true);
}

function localeFor(lang: "uz" | "en"): string {
  return lang === "uz" ? "uz-UZ" : "en-US";
}

function speakInBrowser(text: string, locale: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* Text remains visible when speech synthesis is unavailable. */
  }
}

function speak(text: string, lang: "uz" | "en"): void {
  const locale = localeFor(lang);
  if (canUseNativeAndroidLauncher()) {
    void nativeSpeakVoice(text, locale).catch(() => speakInBrowser(text, locale));
    return;
  }
  speakInBrowser(text, locale);
}

export function speakVoiceInstruction(lang: "uz" | "en"): void {
  speak(
    lang === "uz"
      ? "Buyruq tanildi. Uni tekshiring va Launch tugmasini bosing. Hali hech qanday amal bajarilmadi."
      : "Command recognized. Review it and press Launch. No action has run yet.",
    lang,
  );
}

export function speakVoiceOutcome(messages: string[], lang: "uz" | "en"): void {
  speak(voiceOutcomeText(messages, lang), lang);
}

export function cancelVoiceSpeech(): void {
  if (canUseNativeAndroidLauncher()) void nativeStopVoiceSpeech().catch(() => undefined);
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
