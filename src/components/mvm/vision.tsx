import { useEffect, useRef, useState } from "react";
import { Camera, FileText, ImageIcon, ScanLine, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type VisionMode = "AUTO" | "SCAN" | "EXTRACT" | "IDENTIFY" | "CLEAN";
type VisionState = "idle" | "camera" | "captured";

interface VisionPanelProps {
  lang: "uz" | "en";
  onExit: () => void;
}

const MODES: Array<{ id: VisionMode; icon: typeof Camera }> = [
  { id: "AUTO", icon: Sparkles },
  { id: "SCAN", icon: ScanLine },
  { id: "EXTRACT", icon: FileText },
  { id: "IDENTIFY", icon: Sparkles },
  { id: "CLEAN", icon: ImageIcon },
];

export function VisionPanel({ lang, onExit }: VisionPanelProps) {
  const [mode, setMode] = useState<VisionMode>("AUTO");
  const [status, setStatus] = useState<VisionState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uz = lang === "uz";

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stream]);

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, aspectRatio: { ideal: 4 / 3 } },
        audio: false,
      });
      setStream(next);
      setStatus("camera");
    } catch {
      setStatus("idle");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      stream?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setStatus("captured");
    }, "image/jpeg", 0.95);
  }

  function importFile(file: File | undefined) {
    if (!file) return;
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setStatus("captured");
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-micro tracking-mark text-muted">MVM VISION / SEE → UNDERSTAND → ACT</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">VISION</h2>
        </div>
        <button type="button" onClick={onExit} aria-label="Close Vision" className="mvm-frame rounded-sm bg-surface p-2.5 text-muted hover:text-fg">
          <X className="size-5" />
        </button>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <section className="relative min-h-[52dvh] overflow-hidden rounded-xl bg-surface mvm-frame">
          {status === "camera" ? (
            <video ref={videoRef} muted playsInline className="absolute inset-0 size-full object-contain bg-black" />
          ) : preview ? (
            <img src={preview} alt="Vision capture" className="absolute inset-0 size-full object-contain bg-black" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8 text-center">
              <div>
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-raised mvm-frame">
                  <Sparkles className="size-7 text-accent" />
                </div>
                <p className="mt-5 font-display text-2xl font-bold">Magic Capture</p>
                <p className="mx-auto mt-2 max-w-md font-mono text-xs leading-relaxed text-muted">
                  {uz
                    ? "Kamerani ko‘rsating yoki rasm import qiling. Native Android VISION real-time ML Kit tahlilini beradi."
                    : "Point the camera or import an image. Native Android VISION adds real-time ML Kit analysis."}
                </p>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
            <span className="rounded-full bg-black/50 px-3 py-1.5 font-mono text-micro tracking-mark text-white/80">
              {status === "camera" ? "LIVE ANALYSIS" : status === "captured" ? "CAPTURED" : "READY"}
            </span>
            <span className="rounded-full bg-black/50 px-3 py-1.5 font-mono text-micro text-white/70">{mode}</span>
          </div>

          {status === "camera" && (
            <div className="absolute bottom-0 inset-x-0 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent p-6">
              <button type="button" onClick={capture} className="grid size-20 place-items-center rounded-full border-4 border-white bg-white/10 shadow-2xl transition-transform active:scale-95">
                <span className="size-14 rounded-full bg-white" />
              </button>
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MODES.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "mvm-frame flex min-h-16 items-center gap-2 rounded-lg bg-surface px-3 font-mono text-xs",
                  mode === id ? "bg-raised text-fg" : "text-muted hover:text-fg",
                )}
              >
                <Icon className="size-4" />
                {id}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void openCamera()} className="flex min-h-16 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-display text-sm font-bold text-accent-fg">
              <Camera className="size-4" /> CAMERA
            </button>
            <button type="button" onClick={() => inputRef.current?.click()} className="mvm-frame flex min-h-16 items-center justify-center gap-2 rounded-lg bg-surface px-4 font-display text-sm font-bold">
              <ImageIcon className="size-4" /> IMPORT
            </button>
          </div>
        </section>

        {status === "captured" && preview && (
          <section className="grid gap-3 rounded-xl bg-surface p-4 mvm-frame sm:grid-cols-[1fr_auto]">
            <div>
              <p className="font-mono text-micro tracking-mark text-muted">SMART ACTIONS</p>
              <h3 className="mt-1 font-display text-lg font-bold">
                {mode === "SCAN"
                  ? "Document → PDF / JPG"
                  : mode === "EXTRACT"
                    ? "Image → text"
                    : mode === "IDENTIFY"
                      ? "Scene → object context"
                      : mode === "CLEAN"
                        ? "Image → enhanced"
                        : "Auto → next best action"}
              </h3>
              <p className="mt-2 max-w-xl font-mono text-xs leading-relaxed text-muted">
                {uz
                  ? "Browser rejimi lokal capture beradi; haqiqiy OCR, QR va object detection native Android VISION'da ishlaydi."
                  : "Browser mode keeps capture local; real OCR, QR and object detection run in native Android VISION."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={preview} download="mvm-vision.jpg" className="rounded-sm bg-accent px-4 py-2.5 font-display text-xs font-semibold text-accent-fg">SAVE</a>
              <button type="button" onClick={reset} className="mvm-frame rounded-sm px-4 py-2.5 font-display text-xs font-semibold">RESET</button>
            </div>
          </section>
        )}

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => importFile(event.target.files?.[0])} />
      </main>
    </div>
  );
}
