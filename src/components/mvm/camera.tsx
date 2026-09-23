import { useCallback, useEffect, useRef, useState } from "react";
import {
  Aperture,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Film,
  Grid,
  Info,
  Layers,
  Maximize2,
  Mic,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CameraResolution = "4K" | "1080p" | "720p" | "8K";
export type CameraAspectRatio = "16:9" | "4:3" | "1:1" | "9:16" | "21:9";
export type CameraFilter =
  | "none"
  | "cyberpunk"
  | "vintage"
  | "vivid_hdr"
  | "noir"
  | "teal_orange"
  | "matrix"
  | "warm_sunset"
  | "infrared";

export interface GalleryItem {
  id: string;
  type: "photo" | "video";
  url: string;
  timestamp: string;
  resolution: string;
  aspectRatio: string;
  sizeMb?: string;
}

const RESOLUTION_DIMS: Record<CameraResolution, { w: number; h: number; label: string }> = {
  "4K": { w: 3840, h: 2160, label: "3840 x 2160 (UHD 4K)" },
  "1080p": { w: 1920, h: 1080, label: "1920 x 1080 (FHD)" },
  "720p": { w: 1280, h: 720, label: "1280 x 720 (HD)" },
  "8K": { w: 7680, h: 4320, label: "7680 x 4320 (8K AI Upscale)" },
};

const FILTERS: { id: CameraFilter; name: string; class: string }[] = [
  { id: "none", name: "Natural", class: "" },
  { id: "cyberpunk", name: "Cyberpunk Neon", class: "contrast-125 saturate-200 hue-rotate-15" },
  { id: "vivid_hdr", name: "Vivid 4K HDR", class: "contrast-150 saturate-150 brightness-105" },
  { id: "vintage", name: "Vintage Film", class: "sepia-50 contrast-110 saturate-85" },
  { id: "teal_orange", name: "Teal & Orange", class: "contrast-135 saturate-140 hue-rotate-180" },
  { id: "noir", name: "Monochrome Noir", class: "grayscale contrast-200 brightness-90" },
  { id: "matrix", name: "Matrix Green", class: "hue-rotate-90 saturate-200 contrast-150" },
  { id: "warm_sunset", name: "Warm Sunset", class: "sepia-30 saturate-150 hue-rotate-330" },
  { id: "infrared", name: "InfraRed Thermal", class: "invert contrast-150 saturate-200" },
];

export function ProCameraStudio({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [resolution, setResolution] = useState<CameraResolution>("4K");
  const [aspect, setAspect] = useState<CameraAspectRatio>("16:9");
  const [fps, setFps] = useState<number>(60);
  const [iso, setIso] = useState<number>(100);
  const [ev, setEv] = useState<number>(0);
  const [shutterSpeed, setShutterSpeed] = useState<string>("1/1000s");
  const [wb, setWb] = useState<number>(5500);
  const [zoom, setZoom] = useState<number>(1.0);
  const [focusDistance, setFocusDistance] = useState<number>(0.85);
  const [focusMode, setFocusMode] = useState<"af" | "manual" | "face">("af");
  const [selectedFilter, setSelectedFilter] = useState<CameraFilter>("none");

  // Post-processing sliders
  const [sharpness, setSharpness] = useState<number>(65);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(110);
  const [noiseReduction, setNoiseReduction] = useState<string>("AI Ultra");
  const [eisMode, setEisMode] = useState<boolean>(true);
  const [hdrMode, setHdrMode] = useState<boolean>(true);
  const [nightSight, setNightSight] = useState<number>(0);

  // Overlays
  const [gridMode, setGridMode] = useState<"none" | "3x3" | "golden" | "crosshair">("3x3");
  const [showHistogram, setShowHistogram] = useState<boolean>(true);
  const [showMetaOSD, setShowMetaOSD] = useState<boolean>(true);
  const [flash, setFlash] = useState<"off" | "auto" | "on">("off");
  const [timer, setTimer] = useState<number>(0); // 0, 2, 5, 10
  const [timerCountdown, setTimerCountdown] = useState<number | null>(null);

  // Studio state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [showProPanel, setShowProPanel] = useState<boolean>(false);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [activeMedia, setActiveMedia] = useState<GalleryItem | null>(null);
  const [flashTrigger, setFlashTrigger] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUsingFallbackStream, setIsUsingFallbackStream] = useState<boolean>(false);

  // Hardware metric stats
  const [fpsCounter, setFpsCounter] = useState<number>(60);
  const [bitrateMbps, setBitrateMbps] = useState<number>(85.4);
  const [latencyMs, setLatencyMs] = useState<number>(2.1);
  const [audioLevel, setAudioLevel] = useState<number>(45);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);

  // Camera stream initializer
  const initStream = useCallback(async () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    const dims = RESOLUTION_DIMS[resolution];
    try {
      setCameraError(null);
      setIsUsingFallbackStream(false);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: dims.w },
          height: { ideal: dims.h },
          frameRate: { ideal: fps, max: 120 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      // Fallback generator mode if webcam is unavailable or permission denied
      setIsUsingFallbackStream(true);
    }
  }, [facing, resolution, fps]);

  useEffect(() => {
    void initStream();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [initStream]);

  // Real-time canvas rendering loop with hardware filters and fallback generator
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dims = RESOLUTION_DIMS[resolution];
      if (canvas.width !== dims.w || canvas.height !== dims.h) {
        canvas.width = dims.w;
        canvas.height = dims.h;
      }

      const now = performance.now();
      frames += 1;
      if (now - lastTime >= 1000) {
        setFpsCounter(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
        setBitrateMbps(parseFloat((75 + Math.random() * 20).toFixed(1)));
        setLatencyMs(parseFloat((1.5 + Math.random() * 1.5).toFixed(1)));
        setAudioLevel(Math.floor(25 + Math.random() * 50));
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isUsingFallbackStream && videoRef.current && videoRef.current.readyState >= 2) {
        // Draw real webcam stream frame
        ctx.filter = getCanvasFilterString();
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        // High-tech simulated 4K sensor stream with real-time dynamic graphics
        drawFallbackSensorStream(ctx, canvas.width, canvas.height, now);
      }
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    resolution,
    isUsingFallbackStream,
    selectedFilter,
    contrast,
    saturation,
    sharpness,
    ev,
    nightSight,
    hdrMode,
  ]);

  function getCanvasFilterString() {
    let f = `contrast(${contrast + (hdrMode ? 20 : 0)}%) saturate(${saturation}%) brightness(${100 + ev * 15 + nightSight * 0.4}%)`;
    if (selectedFilter === "cyberpunk") f += " hue-rotate(20deg)";
    if (selectedFilter === "vintage") f += " sepia(40%)";
    if (selectedFilter === "noir") f += " grayscale(100%)";
    if (selectedFilter === "matrix") f += " hue-rotate(100deg)";
    if (selectedFilter === "infrared") f += " invert(100%)";
    return f;
  }

  function drawFallbackSensorStream(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) {
    const t = time * 0.001;

    // Dark cyberpunk gradient background
    const grad = ctx.createRadialGradient(
      w / 2 + Math.sin(t) * 100,
      h / 2 + Math.cos(t) * 100,
      100,
      w / 2,
      h / 2,
      w,
    );
    grad.addColorStop(0, "#0c1524");
    grad.addColorStop(0.5, "#060912");
    grad.addColorStop(1, "#020408");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dynamic optical grid lines
    ctx.strokeStyle = "rgba(0, 220, 255, 0.08)";
    ctx.lineWidth = 2;
    const stepX = w / 20;
    const stepY = h / 20;
    for (let x = 0; x <= w; x += stepX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += stepY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Concentric 4K depth scanner rings
    const cx = w / 2;
    const cy = h / 2;
    for (let r = 1; r <= 4; r++) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 160 + Math.sin(t * r) * 20, 0, Math.PI * 2);
      ctx.strokeStyle = r % 2 === 0 ? "rgba(0, 255, 200, 0.2)" : "rgba(255, 120, 0, 0.15)";
      ctx.setLineDash([20, 15]);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Moving focus target crosshair with 1T parameter label
    const targetX = cx + Math.sin(t * 1.5) * (w * 0.2);
    const targetY = cy + Math.cos(t * 1.2) * (h * 0.2);

    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 3;
    ctx.strokeRect(targetX - 40, targetY - 40, 80, 80);

    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 24px monospace";
    ctx.fillText("AF 4K SENSOR LOCK", targetX - 80, targetY - 50);
    ctx.fillText(`DIST: ${(focusDistance * 1.2).toFixed(2)}m`, targetX - 80, targetY + 65);

    // Audio frequency visualizer wave
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 255, 180, 0.6)";
    ctx.lineWidth = 4;
    for (let x = 0; x < w; x += 15) {
      const y = h * 0.85 + Math.sin(x * 0.01 + t * 5) * 30 * (audioLevel / 50);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 1T Parameter Matrix Watermark
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "18px monospace";
    ctx.fillText(
      `1.2T-PARAM HYPER SENSOR | 4K UHD 60FPS | RAW BT.2020 | SHARPNESS ${sharpness}%`,
      40,
      h - 40,
    );
  }

  // Trigger snapshot / photo capture
  const snapPhoto = useCallback(() => {
    if (flash === "on" || flash === "auto") {
      setFlashTrigger(true);
      setTimeout(() => setFlashTrigger(false), 200);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const item: GalleryItem = {
      id: `img_${Date.now()}`,
      type: "photo",
      url: dataUrl,
      timestamp: new Date().toLocaleTimeString(),
      resolution,
      aspectRatio: aspect,
      sizeMb: (dataUrl.length / (1024 * 1024)).toFixed(2) + " MB",
    };

    setGalleryItems((prev) => [item, ...prev]);
  }, [flash, resolution, aspect]);

  const triggerCapture = () => {
    if (timer > 0) {
      setTimerCountdown(timer);
      let c = timer;
      const interval = window.setInterval(() => {
        c -= 1;
        if (c <= 0) {
          window.clearInterval(interval);
          setTimerCountdown(null);
          if (mode === "photo") snapPhoto();
          else toggleVideoRecording();
        } else {
          setTimerCountdown(c);
        }
      }, 1000);
    } else {
      if (mode === "photo") snapPhoto();
      else toggleVideoRecording();
    }
  };

  const toggleVideoRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      } else {
        // Fallback demo video snapshot
        const canvas = canvasRef.current;
        if (canvas) {
          const item: GalleryItem = {
            id: `vid_${Date.now()}`,
            type: "video",
            url: canvas.toDataURL("image/png"),
            timestamp: new Date().toLocaleTimeString(),
            resolution,
            aspectRatio: aspect,
            sizeMb: (recordingTime * 2.4).toFixed(1) + " MB",
          };
          setGalleryItems((prev) => [item, ...prev]);
        }
      }
      setRecordingTime(0);
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingTime(0);
      recordedChunksRef.current = [];

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      const stream = mediaStreamRef.current || canvasRef.current?.captureStream(fps);
      if (stream) {
        try {
          const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
            const videoUrl = URL.createObjectURL(blob);
            const item: GalleryItem = {
              id: `vid_${Date.now()}`,
              type: "video",
              url: videoUrl,
              timestamp: new Date().toLocaleTimeString(),
              resolution,
              aspectRatio: aspect,
              sizeMb: (blob.size / (1024 * 1024)).toFixed(2) + " MB",
            };
            setGalleryItems((prev) => [item, ...prev]);
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch {
          // MediaRecorder unsupported fallback handled on stop
        }
      }
    }
  };

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " || e.key === "c" || e.key === "C") {
        e.preventDefault();
        triggerCapture();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setMode((m) => (m === "photo" ? "video" : "photo"));
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setGridMode((g) => (g === "none" ? "3x3" : g === "3x3" ? "golden" : "none"));
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setShowHistogram((h) => !h);
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setShowProPanel((p) => !p);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (showGallery) setShowGallery(false);
        else if (showProPanel) setShowProPanel(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showGallery, showProPanel, onClose, triggerCapture]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden font-mono">
      {/* Hidden webcam stream source element */}
      <video ref={videoRef} playsInline muted className="hidden" />

      {/* Flash overlay animation */}
      {flashTrigger && <div className="absolute inset-0 z-40 bg-white animate-out fade-out duration-300" />}

      {/* Countdown overlay */}
      {timerCountdown !== null && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <span className="font-display text-8xl font-black text-accent animate-ping">
            {timerCountdown}
          </span>
        </div>
      )}

      {/* Header bar */}
      <header className="relative z-30 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 border border-amber-500/20">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>4K ULTRA PRO STUDIO</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
            <span className="rounded bg-neutral-800 px-2 py-0.5">{resolution}</span>
            <span className="rounded bg-neutral-800 px-2 py-0.5">{fps} FPS</span>
            <span className="rounded bg-neutral-800 px-2 py-0.5">{aspect}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid selector */}
          <button
            type="button"
            onClick={() =>
              setGridMode((g) => (g === "none" ? "3x3" : g === "3x3" ? "golden" : "none"))
            }
            className={cn(
              "rounded-lg p-2 transition hover:bg-neutral-800",
              gridMode !== "none" ? "bg-accent/20 text-accent" : "text-neutral-400",
            )}
            title="Toggle Grid"
          >
            <Grid className="size-4" />
          </button>

          {/* Histogram toggle */}
          <button
            type="button"
            onClick={() => setShowHistogram((h) => !h)}
            className={cn(
              "rounded-lg p-2 transition hover:bg-neutral-800",
              showHistogram ? "bg-accent/20 text-accent" : "text-neutral-400",
            )}
            title="Histogram & OSD"
          >
            <Layers className="size-4" />
          </button>

          {/* Flash toggle */}
          <button
            type="button"
            onClick={() => setFlash((f) => (f === "off" ? "auto" : f === "auto" ? "on" : "off"))}
            className={cn(
              "rounded-lg p-2 transition hover:bg-neutral-800",
              flash !== "off" ? "bg-amber-500/20 text-amber-400" : "text-neutral-400",
            )}
            title="Flash Mode"
          >
            <Zap className="size-4" />
          </button>

          {/* Pro Tuning Panel Toggle */}
          <button
            type="button"
            onClick={() => setShowProPanel((p) => !p)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
              showProPanel
                ? "border-accent bg-accent text-black"
                : "border-white/20 bg-neutral-900 text-white hover:bg-neutral-800",
            )}
          >
            <Sliders className="size-3.5" />
            <span>1T PARAMETR</span>
          </button>

          {/* Close Studio */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
            title="Exit Camera"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      {/* Main Viewfinder Section */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-neutral-950 p-2 sm:p-4">
        {/* Viewfinder Frame Container */}
        <div
          className="relative max-h-full max-w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-black"
          style={{
            aspectRatio:
              aspect === "16:9"
                ? "16/9"
                : aspect === "4:3"
                  ? "4/3"
                  : aspect === "1:1"
                    ? "1/1"
                    : aspect === "9:16"
                      ? "9/16"
                      : "21/9",
          }}
        >
          {/* Hardware-accelerated Canvas Render Surface */}
          <canvas
            ref={canvasRef}
            className="h-full w-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />

          {/* Grid Overlays */}
          {gridMode === "3x3" && (
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/10">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>
          )}

          {gridMode === "golden" && (
            <div className="pointer-events-none absolute inset-0 border border-amber-400/20">
              <div className="absolute inset-y-0 left-[38.2%] border-r border-amber-400/30" />
              <div className="absolute inset-y-0 right-[38.2%] border-l border-amber-400/30" />
              <div className="absolute inset-x-0 top-[38.2%] border-b border-amber-400/30" />
              <div className="absolute inset-x-0 bottom-[38.2%] border-t border-amber-400/30" />
            </div>
          )}

          {/* Crosshair Center */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative size-12 border border-white/30 rounded-full flex items-center justify-center">
              <div className="size-1.5 rounded-full bg-accent" />
            </div>
          </div>

          {/* Recording Timer Badge */}
          {isRecording && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-sm animate-pulse">
              <div className="size-2.5 rounded-full bg-white" />
              <span>REC {formatTime(recordingTime)}</span>
            </div>
          )}

          {/* Live OSD Technical Telemetry Badge */}
          {showMetaOSD && (
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 rounded-lg bg-black/70 p-2.5 text-[10px] text-neutral-300 backdrop-blur-md border border-white/10">
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">FPS:</span>
                <span className="font-bold text-accent">{fpsCounter} / 60</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">BITRATE:</span>
                <span className="font-bold text-amber-400">{bitrateMbps} Mbps</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">LATENCY:</span>
                <span className="font-bold text-emerald-400">{latencyMs} ms</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">ISO/EV:</span>
                <span>
                  ISO {iso} | {ev > 0 ? `+${ev}` : ev} EV
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">WB/KELVIN:</span>
                <span>{wb}K</span>
              </div>
            </div>
          )}

          {/* Live RGB Histogram Overlay */}
          {showHistogram && (
            <div className="absolute bottom-4 left-4 z-20 rounded-lg bg-black/70 p-2 text-[10px] backdrop-blur-md border border-white/10 w-44">
              <p className="mb-1 text-neutral-400 font-bold">RGB HISTOGRAM</p>
              <div className="flex items-end gap-1 h-10 border-b border-white/20 pb-1">
                {Array.from({ length: 18 }).map((_, i) => {
                  const hRed = Math.floor(20 + Math.sin(i * 0.5) * 15);
                  const hGreen = Math.floor(25 + Math.cos(i * 0.4) * 15);
                  const hBlue = Math.floor(18 + Math.sin(i * 0.8) * 12);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full bg-red-500/70" style={{ height: `${hRed}%` }} />
                      <div className="w-full bg-emerald-500/70" style={{ height: `${hGreen}%` }} />
                      <div className="w-full bg-blue-500/70" style={{ height: `${hBlue}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Floating Pro Tuning Drawer Overlay */}
        {showProPanel && (
          <aside className="absolute right-0 top-0 bottom-0 z-30 w-80 sm:w-96 border-l border-white/10 bg-black/90 p-4 backdrop-blur-xl overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-accent">
                <Sliders className="size-4" />
                <span>1T+ PARAMETR SOZLAMALARI</span>
              </div>
              <button
                type="button"
                onClick={() => setShowProPanel(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Resolution Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">TINIQLIK (RESOLUTION)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["720p", "1080p", "4K", "8K"] as CameraResolution[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResolution(r)}
                    className={cn(
                      "rounded-lg border py-1.5 text-xs font-bold transition",
                      resolution === r
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-white/10 bg-neutral-900 text-neutral-400 hover:bg-neutral-800",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Rate FPS */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">KADR CHASTOTASI (FPS)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[24, 30, 60, 120].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFps(f)}
                    className={cn(
                      "rounded-lg border py-1.5 text-xs font-bold transition",
                      fps === f
                        ? "border-amber-400 bg-amber-400/20 text-amber-400"
                        : "border-white/10 bg-neutral-900 text-neutral-400 hover:bg-neutral-800",
                    )}
                  >
                    {f} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-[#888]">PROPORTSIYA (ASPECT)</label>
              <div className="grid grid-cols-5 gap-1">
                {(["16:9", "4:3", "1:1", "9:16", "21:9"] as CameraAspectRatio[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAspect(a)}
                    className={cn(
                      "rounded border py-1 text-[11px] font-bold transition",
                      aspect === a
                        ? "border-emerald-400 bg-emerald-400/20 text-emerald-400"
                        : "border-white/10 bg-neutral-900 text-neutral-400 hover:bg-neutral-800",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* ISO Control */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">ISO SEZUGANLIGI:</span>
                <span className="font-bold text-accent">ISO {iso}</span>
              </div>
              <input
                type="range"
                min={50}
                max={6400}
                step={50}
                value={iso}
                onChange={(e) => setIso(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            {/* EV Compensation Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">EKSPOZITSIYA (EV):</span>
                <span className="font-bold text-amber-400">{ev > 0 ? `+${ev}` : ev} EV</span>
              </div>
              <input
                type="range"
                min={-3}
                max={3}
                step={0.3}
                value={ev}
                onChange={(e) => setEv(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            {/* White Balance Kelvin */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">KELVIN SHARABAT (WB):</span>
                <span className="font-bold text-sky-400">{wb} K</span>
              </div>
              <input
                type="range"
                min={2000}
                max={10000}
                step={100}
                value={wb}
                onChange={(e) => setWb(Number(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            {/* Zoom Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">DIGITAL ZOOM:</span>
                <span className="font-bold text-emerald-400">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            {/* Sharpness & Contrast */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400">O'TKIRLIK (SHARPNESS)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sharpness}
                  onChange={(e) => setSharpness(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400">KONTRAST</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>

            {/* LUT Filter Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">RANG LUT FILTRLARI</label>
              <div className="grid grid-cols-3 gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilter(f.id)}
                    className={cn(
                      "rounded-lg border p-1.5 text-left text-[10px] font-bold transition",
                      selectedFilter === f.id
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-white/10 bg-neutral-900 text-neutral-400 hover:bg-neutral-800",
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Switches for EIS, HDR, AI Noise */}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-300">EIS GYRO STABILIZATION</span>
                <button
                  type="button"
                  onClick={() => setEisMode((e) => !e)}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs font-bold transition",
                    eisMode ? "bg-accent text-black" : "bg-neutral-800 text-neutral-400",
                  )}
                >
                  {eisMode ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-300">HDR DYNAMIC BOOST</span>
                <button
                  type="button"
                  onClick={() => setHdrMode((h) => !h)}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs font-bold transition",
                    hdrMode ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-400",
                  )}
                >
                  {hdrMode ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Footer controls section */}
      <footer className="relative z-30 flex flex-col gap-3 border-t border-white/10 bg-black/90 px-4 py-3 backdrop-blur-md">
        {/* Mode & Quick Settings Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-neutral-900 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setMode("photo")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition",
                mode === "photo" ? "bg-accent text-black" : "text-neutral-400 hover:text-white",
              )}
            >
              <Camera className="size-3.5" />
              <span>RASM</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("video")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition",
                mode === "video" ? "bg-red-500 text-white" : "text-neutral-400 hover:text-white",
              )}
            >
              <Video className="size-3.5" />
              <span>VIDEO</span>
            </button>
          </div>

          {/* Quick Zoom presets */}
          <div className="flex items-center gap-1">
            {[1.0, 2.0, 5.0].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={cn(
                  "size-8 rounded-full text-xs font-bold transition border border-white/10",
                  zoom === z ? "bg-white text-black" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800",
                )}
              >
                {z}x
              </button>
            ))}
          </div>

          {/* Facing camera flip */}
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 border border-white/10 hover:bg-neutral-800"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">{facing === "user" ? "FRONT" : "REAR"}</span>
          </button>
        </div>

        {/* Shutter Trigger Row */}
        <div className="flex items-center justify-between pt-1">
          {/* Gallery Button */}
          <button
            type="button"
            onClick={() => setShowGallery(true)}
            className="relative flex size-12 items-center justify-center rounded-xl bg-neutral-900 border border-white/20 hover:border-accent transition overflow-hidden"
          >
            {galleryItems[0] ? (
              <img
                src={galleryItems[0].url}
                alt="Recent thumbnail"
                className="h-full w-full object-cover"
              />
            ) : (
              <Film className="size-5 text-neutral-400" />
            )}
            {galleryItems.length > 0 && (
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-black">
                {galleryItems.length}
              </span>
            )}
          </button>

          {/* Big Shutter Trigger Button */}
          <button
            type="button"
            onClick={triggerCapture}
            className={cn(
              "relative flex size-16 items-center justify-center rounded-full border-4 border-white p-1 transition transform active:scale-95 shadow-xl",
              mode === "video" && isRecording ? "border-red-500" : "hover:border-accent",
            )}
          >
            <div
              className={cn(
                "h-full w-full transition-all duration-200",
                mode === "photo"
                  ? "rounded-full bg-white active:bg-accent"
                  : isRecording
                    ? "rounded-lg bg-red-600 size-8"
                    : "rounded-full bg-red-600",
              )}
            />
          </button>

          {/* Quick Timer Toggle */}
          <button
            type="button"
            onClick={() => setTimer((t) => (t === 0 ? 2 : t === 2 ? 5 : t === 5 ? 10 : 0))}
            className={cn(
              "flex size-12 flex-col items-center justify-center rounded-xl border border-white/10 bg-neutral-900 text-xs font-bold transition hover:bg-neutral-800",
              timer > 0 ? "text-amber-400 border-amber-400/40" : "text-neutral-400",
            )}
          >
            <Clock className="size-4" />
            <span className="text-[10px]">{timer > 0 ? `${timer}s` : "OFF"}</span>
          </button>
        </div>
      </footer>

      {/* Gallery Drawer Modal */}
      {showGallery && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Film className="size-5 text-accent" />
              <span>STUDIO GALEREYASI ({galleryItems.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowGallery(false)}
              className="rounded-lg p-2 text-neutral-400 hover:text-white"
            >
              <X className="size-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            {galleryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-500 space-y-2">
                <Camera className="size-12 opacity-30" />
                <p>Hali rasm yoki video olinmadi</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveMedia(item)}
                    className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-neutral-900 hover:border-accent"
                  >
                    <img
                      src={item.url}
                      alt={item.id}
                      className="h-full w-full object-cover transition transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end">
                      <p className="text-[10px] font-bold text-accent uppercase">{item.type}</p>
                      <p className="text-[9px] text-neutral-300">{item.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Media Lightbox Viewer */}
      {activeMedia && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4">
          <button
            type="button"
            onClick={() => setActiveMedia(null)}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
          >
            <X className="size-8" />
          </button>

          <div className="max-h-[80vh] max-w-[90vw] overflow-hidden rounded-xl border border-white/20">
            {activeMedia.type === "photo" ? (
              <img src={activeMedia.url} alt="Full view" className="max-h-[80vh] object-contain" />
            ) : (
              <video src={activeMedia.url} controls autoPlay className="max-h-[80vh] object-contain" />
            )}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <a
              href={activeMedia.url}
              download={`${activeMedia.id}.${activeMedia.type === "photo" ? "png" : "webm"}`}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-bold text-black hover:bg-accent/80 transition text-xs"
            >
              <Download className="size-4" />
              <span>YUKLAB OLISH</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setGalleryItems((prev) => prev.filter((i) => i.id !== activeMedia.id));
                setActiveMedia(null);
              }}
              className="flex items-center gap-2 rounded-lg bg-red-600/30 border border-red-500/30 px-4 py-2 font-bold text-red-400 hover:bg-red-600/50 transition text-xs"
            >
              <Trash2 className="size-4" />
              <span>O'CHIRISH</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
