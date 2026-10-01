const { app, BrowserWindow, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

let server = null;
let mainWindow = null;

function getWebRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "web")
    : path.join(__dirname, "..", ".vercel", "output", "static");
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".map": "application/json; charset=utf-8",
  }[ext] || "application/octet-stream";
}

function startStaticServer() {
  const root = getWebRoot();

  if (!fs.existsSync(path.join(root, "index.html"))) {
    throw new Error(`MVMCMD web bundle not found: ${root}`);
  }

  server = http.createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === "/") pathname = "/index.html";

      const candidate = path.resolve(root, "." + pathname);
      if (!candidate.startsWith(path.resolve(root) + path.sep)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const servePath = fs.existsSync(candidate) && fs.statSync(candidate).isFile()
        ? candidate
        : path.join(root, "index.html");

      const body = fs.createReadStream(servePath);
      body.on("error", () => {
        if (!res.headersSent) res.writeHead(500);
        res.end("Internal server error");
      });
      res.writeHead(200, {
        "Content-Type": mimeType(servePath),
        "Cache-Control": servePath.endsWith("index.html")
          ? "no-cache"
          : "public, max-age=31536000, immutable",
      });
      body.pipe(res);
    } catch (error) {
      console.error("[MVMCMD] static server error", error);
      if (!res.headersSent) res.writeHead(500);
      res.end("Internal server error");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not determine local server port."));
        return;
      }
      resolve(address.port);
    });
  });
}

async function createWindow() {
  const port = await startStaticServer();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#08090c",
    icon: path.join(getWebRoot(), "brand", "mvmcmd-logo.webp"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://127.0.0.1:")) {
      event.preventDefault();
      if (/^https?:/i.test(url)) void shell.openExternal(url);
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady()
  .then(createWindow)
  .catch((error) => {
    console.error("[MVMCMD] startup failed", error);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (server) {
    server.close();
    server = null;
  }
});
