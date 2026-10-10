const DEV_MOTION_RAIN_SRC =
  "https://assets.devmotion.app/2HWAv7QvZ3DN5H0SDqA0dDp6Uffmokij/media/video/zad0w9Hd8LzUM74x36v_w.mp4";

/**
 * Real camera-recorded rain footage imported into DevMotion.
 * Kept as a non-interactive visual layer; no generated rain particles are used here.
 */
export function MvmRainBackdrop({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="mvm-rain-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <video
        className="mvm-rain-backdrop__video"
        src={DEV_MOTION_RAIN_SRC}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      />
      <div className="mvm-rain-backdrop__veil" />
    </div>
  );
}
