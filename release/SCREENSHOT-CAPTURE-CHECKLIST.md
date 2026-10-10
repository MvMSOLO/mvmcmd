# MVMCMD — Authentic Screenshot and Vertical Video Capture Checklist

**Status: NOT CAPTURED — physical-device footage still requires a real phone and a human operator.** No placeholder image, generated image, or hosted-emulator capture should be described as a physical-device screenshot.

## Required images

- [ ] App home / command input.
- [ ] A real command with its actual response and action state.
- [ ] Camera or QR flow (use synthetic/non-sensitive content).
- [ ] Wallpaper selection or preview.
- [ ] English Lab or English Studio.
- [ ] Notification-center demo using synthetic notifications.
- [ ] Permission explanation / safe fallback screen.
- [ ] Final brand screen showing the correct version.

## Capture quality

- Prefer a real Android phone for launch media. If an emulator is used for an internal engineering preview, label it explicitly as emulator footage and do not use it to close the physical-device acceptance matrix.
- Record the physical phone locally; this coding session has no attached physical device or camera feed, so it cannot honestly produce a real-phone recording remotely.


- Capture directly from the installed candidate build; preserve an unedited original.
- Record device model, Android version, app commit, APK artifact link, and date with the source files.
- For Instagram Reels, capture a native 9:16 vertical recording and retain a clean version without captions for later editing.
- Use consistent brightness and legible text. Avoid excessive zoom, fake interface elements, synthetic result badges, or AI-generated replacement screenshots.
- Hide contacts, notification text, account information, personal files, and unrelated system UI.
- Keep captions outside important UI areas; add subtitles only after preserving the source video.
- If a feature is blocked by an OEM permission restriction, capture the real fallback or leave the shot out.

## Sign-off

- [ ] Product owner reviewed all source captures.
- [ ] Every visible success state is backed by the actual app result.
- [ ] Permission and privacy surfaces are reviewed.
- [ ] Public-post text discloses any remaining device-specific limitations.
