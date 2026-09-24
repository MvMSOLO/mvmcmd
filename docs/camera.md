# Camera

The camera is implemented natively in `MvmCameraActivity` using CameraX and Media3.

The implementation covers preview, photo capture, video capture, camera switching, zoom, focus, filters/effects, MediaStore export and post-processing.

## Resolution and FPS

The app distinguishes:

1. requested resolution/FPS
2. actual supported resolution/FPS
3. fallback resolution/FPS

4K and 60 FPS are device capabilities, not unconditional guarantees. Unsupported requests fall back to supported device modes and the encoded result is measured where possible.

## Processing

Photo reconstruction uses a native processing pipeline. Runtime heap checks choose a safer working resolution on lower-memory devices before the final reconstruction step.

Reconstruction/upscaling must not be described as genuine optical 4K detail when the source does not contain that detail.

## Storage and lifecycle

Camera exports use MediaStore with pending-item handling, cleanup on write/finalization failure and collision-safe display names. Camera resources and executors are released with the activity lifecycle.

## Physical-device validation

CI proves compilation and packaging. Actual camera sensor modes, encoder profiles, flash, autofocus, stabilization, thermal behavior, low-storage behavior and lifecycle interruption still require physical Android devices.
