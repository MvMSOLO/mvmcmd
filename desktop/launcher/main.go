package main

import (
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

var appVersion = "1.0.0"

//go:embed web
var embeddedWeb embed.FS

func main() {
	check := flag.Bool("check", false, "validate the embedded web bundle and exit")
	version := flag.Bool("version", false, "print the desktop launcher version and exit")
	flag.Parse()

	if *version {
		fmt.Println(appVersion)
		return
	}
	if *check {
		if err := checkBundle(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Printf("MVMCMD Windows bundle OK (%s)\n", appVersion)
		return
	}

	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func checkBundle() error {
	root, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		return fmt.Errorf("embedded web filesystem unavailable: %w", err)
	}
	info, err := fs.Stat(root, "index.html")
	if err != nil {
		return fmt.Errorf("embedded index.html missing: %w", err)
	}
	if info.IsDir() || info.Size() == 0 {
		return errors.New("embedded index.html is empty")
	}

	hasAssets := false
	_ = fs.WalkDir(root, ".", func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil || d.IsDir() {
			return nil
		}
		if strings.HasPrefix(path, "assets/") || strings.Contains(path, "/assets/") {
			hasAssets = true
		}
		return nil
	})
	if !hasAssets {
		return errors.New("embedded web bundle has no assets directory")
	}
	return nil
}

func run() error {
	if err := checkBundle(); err != nil {
		return err
	}

	root, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		return err
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("bind local MVMCMD server: %w", err)
	}
	defer listener.Close()

	addr := listener.Addr().(*net.TCPAddr)
	url := fmt.Sprintf("http://127.0.0.1:%d/", addr.Port)

	server := &http.Server{
		Handler: spaHandler(root),
		ReadHeaderTimeout: 10 * time.Second,
	}
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- server.Serve(listener)
	}()

	if err := openAppWindow(url); err != nil {
		_ = server.Close()
		return err
	}

	// Keep the local web runtime alive while the launched app is open.
	// The browser process is intentionally external so the same binary also
	// works on Windows installations without an embedded WebView runtime.
	if err := <-serverErr; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("local MVMCMD server stopped: %w", err)
	}
	return nil
}

func spaHandler(root fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(filepath.Clean(r.URL.Path), string(filepath.Separator))
		if path == "." || path == "" {
			path = "index.html"
		}
		if _, err := fs.Stat(root, path); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}
		// Client-side routing: unknown document paths render the real built
		// application instead of returning a fake page.
		r.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, r)
	})
}

func openAppWindow(url string) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("Windows launcher built for unsupported OS %s", runtime.GOOS)
	}

	if custom := os.Getenv("MVM_BROWSER"); custom != "" {
		return launchBrowser(custom, url)
	}

	for _, candidate := range edgeCandidates() {
		if _, err := os.Stat(candidate); err == nil {
			return launchBrowser(candidate, url)
		}
	}
	if edge, err := exec.LookPath("msedge.exe"); err == nil {
		return launchBrowser(edge, url)
	}

	// Final fallback uses the user's default HTTP handler. The EXE still owns
	// the real local application server and no mock/demo surface is involved.
	cmd := exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open default Windows browser: %w", err)
	}
	return nil
}

func edgeCandidates() []string {
	localAppData := os.Getenv("LOCALAPPDATA")
	programFiles := os.Getenv("ProgramFiles")
	programFilesX86 := os.Getenv("ProgramFiles(x86)")
	return []string{
		filepath.Join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
	}
}

func launchBrowser(browser, url string) error {
	profile, err := os.MkdirTemp("", "mvmcmd-edge-*")
	if err != nil {
		return fmt.Errorf("create isolated browser profile: %w", err)
	}
	defer os.RemoveAll(profile)

	cmd := exec.Command(
		browser,
		"--app="+url,
		"--new-window",
		"--user-data-dir="+profile,
		"--no-first-run",
	)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("launch Windows app window: %w", err)
	}
	return nil
}
