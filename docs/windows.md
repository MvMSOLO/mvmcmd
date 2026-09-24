# Windows

## Build

The Windows artifact is a real native Go x64 executable from `desktop/launcher/main.go`.

The workflow builds the production web bundle once on Ubuntu, downloads that verified bundle on `windows-latest`, embeds it with Go `//go:embed`, runs Go module tests, builds `MVMCMD.exe`, validates the MZ/PE structure and embedded application bundle, then uploads the EXE with a SHA-256 manifest.

## Runtime

The executable hosts the embedded web application on a loopback HTTP server and opens an Edge app window when Edge is available. It falls back to the default Windows handler when needed.

The EXE is not a mock/demo binary: it contains the same verified production web bundle used by the cross-platform pipeline.

## Limitation

The current launcher relies on an installed browser/WebView-capable runtime for its application window. A separate Chromium/WebView engine is not bundled.
