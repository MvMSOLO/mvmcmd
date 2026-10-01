export type MotionFamily = "custom" | "handcrafted" | "trending";

export type MotionRecipe = {
  id: string;
  family: MotionFamily;
  label: string;
  cssClass: string;
};

export const MVMCMD_MOTION_RECIPES: MotionRecipe[] = [
  { id: "custom-command-bloom", family: "custom", label: "Command Bloom", cssClass: "mvm-motion-command-bloom" },
  { id: "custom-vector-scan", family: "custom", label: "Vector Scan", cssClass: "mvm-motion-vector-scan" },
  { id: "custom-core-breathe", family: "custom", label: "Core Breathe", cssClass: "mvm-motion-core-breathe" },
  { id: "custom-terminal-flicker", family: "custom", label: "Terminal Flicker", cssClass: "mvm-motion-terminal-flicker" },
  { id: "custom-log-cascade", family: "custom", label: "Log Cascade", cssClass: "mvm-motion-log-cascade" },
  { id: "custom-rail-drift", family: "custom", label: "Rail Drift", cssClass: "mvm-motion-rail-drift" },
  { id: "custom-mvm-scanline", family: "custom", label: "MVM Scanline", cssClass: "mvm-motion-scanline" },
  { id: "custom-status-bloom", family: "custom", label: "Status Bloom", cssClass: "mvm-motion-status-bloom" },
  { id: "custom-input-ignite", family: "custom", label: "Input Ignite", cssClass: "mvm-motion-input-ignite" },
  { id: "custom-card-orbit", family: "custom", label: "Card Orbit", cssClass: "mvm-motion-card-orbit" },

  { id: "handcrafted-spring-snap", family: "handcrafted", label: "Spring Snap", cssClass: "mvm-hand-spring-snap" },
  { id: "handcrafted-magnetic-pull", family: "handcrafted", label: "Magnetic Pull", cssClass: "mvm-hand-magnetic" },
  { id: "handcrafted-ripple-press", family: "handcrafted", label: "Ripple Press", cssClass: "mvm-hand-ripple" },
  { id: "handcrafted-tilt-parallax", family: "handcrafted", label: "Tilt Parallax", cssClass: "mvm-hand-tilt" },
  { id: "handcrafted-glass-sweep", family: "handcrafted", label: "Glass Sweep", cssClass: "mvm-hand-glass-sweep" },
  { id: "handcrafted-text-shimmer", family: "handcrafted", label: "Text Shimmer", cssClass: "mvm-hand-shimmer" },
  { id: "handcrafted-focus-pulse", family: "handcrafted", label: "Focus Pulse", cssClass: "mvm-hand-focus" },
  { id: "handcrafted-3d-hover", family: "handcrafted", label: "3D Hover", cssClass: "mvm-hand-3d" },
  { id: "handcrafted-ink-reveal", family: "handcrafted", label: "Ink Reveal", cssClass: "mvm-hand-ink" },
  { id: "handcrafted-beam-trace", family: "handcrafted", label: "Beam Trace", cssClass: "mvm-hand-beam" },

  { id: "trending-kinetic-type", family: "trending", label: "Kinetic Type", cssClass: "mvm-trend-kinetic" },
  { id: "trending-scroll-reveal", family: "trending", label: "Scroll Reveal", cssClass: "mvm-trend-scroll" },
  { id: "trending-bento-stagger", family: "trending", label: "Bento Stagger", cssClass: "mvm-trend-bento" },
  { id: "trending-liquid-glass", family: "trending", label: "Liquid Glass", cssClass: "mvm-trend-glass" },
  { id: "trending-3d-depth", family: "trending", label: "Selective 3D Depth", cssClass: "mvm-trend-depth" },
  { id: "trending-cursor-micro", family: "trending", label: "Cursor Microinteraction", cssClass: "mvm-trend-cursor" },
  { id: "trending-svg-draw", family: "trending", label: "SVG Draw", cssClass: "mvm-trend-draw" },
  { id: "trending-variable-type", family: "trending", label: "Variable Type", cssClass: "mvm-trend-variable" },
  { id: "trending-scroll-parallax", family: "trending", label: "Scroll Parallax", cssClass: "mvm-trend-parallax" },
  { id: "trending-view-transition", family: "trending", label: "View Transition", cssClass: "mvm-trend-view" },
];

export const MOTION_COUNTS = {
  custom: MVMCMD_MOTION_RECIPES.filter((m) => m.family === "custom").length,
  handcrafted: MVMCMD_MOTION_RECIPES.filter((m) => m.family === "handcrafted").length,
  trending: MVMCMD_MOTION_RECIPES.filter((m) => m.family === "trending").length,
  total: MVMCMD_MOTION_RECIPES.length,
} as const;
