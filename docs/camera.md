# Camera

The camera is implemented natively in `MvmCameraActivity` using CameraX and Media3.

The implementation covers preview, photo capture, video capture, camera switching, zoom, focus, filters/effects, MediaStore export and post-processing.

## Resolution and FPS

The app must distinguish:

1. requested resolution/FPS
2. actual supported resolution/FPS
3. fallback resolution/FPS

4K and 60 FPS are device capabilitiees, not unconditional guarantees.

## Processing

Photo reconstruction uses a native processing pipeline. Runtime heap checks choose a safer working resolution on lower-memory devices before the final reconstruction step.

This does not turn a low-resolution source into genuine optical 4K Detail; output should be described as reconstruction/upscaling where appropriate.

## Physical-device validation

CI proves compilation and packaging. Actual camera sensor modes, encoder profiles, flash, autofocus, stabilization, thermal behavior, low-storage behavior and lifecycle interruption still require physical Android devices.
