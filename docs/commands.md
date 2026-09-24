# Commands

MVMCMD commands are real operations. A success line is emitted only after the underlying web/native operation reports success.

## Launch

### `open <name>`
Searches the static catalog, persisted bindings and launchable installed Android apps, then launches the selected target.

### `find <text>`
Searches catalog entries, persisted bindings and launchable installed Android apps by app name, alias and Android package without launching.

### `ls [category]`
Lists known catalog entries, persisted bindings and launchable installed Android apps, optionally filtered by category.

## Android package binding

### `bind <package>`
Binds an arbitrary installed Android package using PackageManager metadata.

### `bind <package> <alias>`
Binds an arbitrary installed Android package to a custom alias.

### `bind <alias> <app>`
Legacy/known-app form that binds a catalog app to a personal alias.

### `unbind <alias>`
Removes a saved alias/package binding.

### `refresh`
Revalidates every saved Android package binding and removes packages that are no longer installed.

## Package/store

### `pack <package.name>`
Launches a raw Android package. It is an Android launcher command, not a package export/archive command.

### `store <app>`
Opens the platform store target. Native Android reports whether the Play Store or web fallback actually opened.

## Camera and installation

### `camera`
Opens the real native CameraX camera on Android. Non-Android runtimes return an explicit unsupported message.

### `perm`
Requests the browser capabilities MVMCMD actually uses: persistent storage and notifications when supported.

### `install`
Uses the real PWA installation prompt when the browser provides one; otherwise shows the platform-specific manual path.

## Persistence and safety

Aliases, bindings, pins, recents, usage and history persist in versioned local storage. Legacy `mvmcmd.v1` state is loaded into the current v2 shape.

Invalid package names and unsafe URL schemes are rejected. Native launch failures return explicit failure/error information rather than fake success.
