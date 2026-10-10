# MVMCMD — Privacy and Permission Explanation (Draft for Review)

This document describes the permission areas present in the Android application. It is not a substitute for a final privacy-policy review of the exact release build.

## Why Android may ask for access

- **Camera:** camera and QR scanning workflows.
- **Microphone:** voice input or video-audio workflows where supported.
- **Contacts:** contact-related commands where the user chooses to use them.
- **Notifications:** posting a notification on supported Android versions.
- **Notification access (special access):** reading notification content for a notification-listening feature. This is controlled separately in Android settings and should remain optional unless the user explicitly enables the related feature.
- **Bluetooth:** Bluetooth-related actions on supported Android versions.
- **Usage access / overlay access (special access):** context or interface features that require these Android-controlled capabilities.
- **Internet:** network-backed application features and content when used.
- **Legacy storage permission:** applies only to older Android versions that require it.

The Android manifest and OS settings determine what is actually requested or granted on a given device. A declared permission is not proof that it was granted or that the associated action succeeded.

## Permission principles

1. Explain each capability before requesting access, using a separate decision for normal runtime permissions and Android special access.
2. Let users skip optional capabilities; do not describe a skipped capability as ready.
3. Re-check access when a capability is used. Android versions and OEM settings can change availability.
4. If Android displays a restricted-settings warning, explain the supported settings path and provide a safe fallback. Do not claim the setting was enabled automatically.
5. Keep notification and contact content out of diagnostic output. Demonstrations must use synthetic data.
6. Do not claim that all information remains local or that no data is transmitted without completing a release-specific storage/network audit.

## Before public release

- Confirm the permission onboarding and denial paths on physical Android devices.
- Verify the current network, storage, backup, logging, and third-party SDK behavior.
- Publish a final privacy policy that accurately describes the shipped behavior and retention.
- Re-check the Android manifest whenever the feature set or target SDK changes.
