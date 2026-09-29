import { useEffect, useMemo, useRef, useState } from "react";
import { X, Maximize2, RotateCcw } from "lucide-react";

interface WebVideoProps {
  open: boolean;
  initialUrl?: string;
  onClose: () => void;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function looksLikeMedia(value: string): boolean {
  const clean = value.split("?")[0].split("#")[0].toLowerCase();
  return /\.(mp4|webm|ogg|m4v|mov|m3u8)$/.test(clean);
}

export function WebVideo({ open, initialUrl = "", onClose }: WebVideoProps) {
  const [url, setUrl] = useState(initialUrl);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    setSource(initialUrl);
    setError("");
  }, [open, initialUrl]);

  const directMedia = useMemo(() => looksLikeMedia(source), [source]);

  if (!open) return null;

  function load() {
    const next = url.trim();
    if (!isHttpUrl(next)) {
      setError("Faqat http:// yoki https:// URL kiriting.");
      return;
    }
    setError("");
    setSource(next);
  }

  async function fullscreen() {
    const el = videoRef.current;
    if (el?.requestFullscreen) {
      await el.requestFullscreen().catch(() => undefined);
      return;
    }
    const iframe = document.querySelector<HTMLIFrameElement>("[data-webvideo-frame]");
    await iframe?.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#08090b] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
          <span className="font-display text-sm font-bold tracking-wide text-white">WEBVIDEO</span>
          <span className="hidden truncate font-mono text-[10px] text-white/40 sm:block">allowed embed / direct media</span>
          <button type="button" onClick={onClose} className="ml-auto rounded p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-white/10 p-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            placeholder="https://..."
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-white/25"
            autoFocus
          />
          <button type="button" onClick={load} className="rounded-md bg-white px-4 py-2 font-display text-xs font-bold text-black">LOAD</button>
        </div>

        {error && <p className="px-3 pt-2 font-mono text-xs text-red-300">{error}</p>}

        <div className="relative min-h-0 flex-1 bg-black">
          {!source ? (
            <div className="flex aspect-video items-center justify-center font-mono text-xs text-white/40">URL kuting</div>
          ) : directMedia ? (
            <div className="relative aspect-video">
              <video
                ref={videoRef}
                className="size-full object-contain"
                src={source}
                controls
                playsInline
                preload="metadata"
                onError={() => setError("Media URL ochilmadi yoki brauzer formatni qo‘llamaydi.")}
              />
              <button type="button" onClick={() => void fullscreen()} className="absolute right-3 top-3 rounded-md bg-black/60 p-2 text-white/80 hover:bg-black/80" aria-label="Fullscreen">
                <Maximize2 className="size-4" />
              </button>
            </div>
          ) : (
            <div className="aspect-video">
              <iframe
                data-webvideo-frame
                title="MVMCMD WebVideo"
                src={source}
                className="size-full border-0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 px-3 py-2">
          <button type="button" onClick={() => setSource("")} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-white/50 hover:text-white">
            <RotateCcw className="size-3" /> RESET
          </button>
          <span className="ml-auto font-mono text-[10px] text-white/30">Quality is provided by the source player/manifest.</span>
        </div>
      </div>
    </div>
  );
}
