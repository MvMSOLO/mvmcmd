const { app, BrowserWindow, shell, ipcMain, Tray, Menu, globalShortcut, nativeImage } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL, pathToFileURL, fileURLToPath } = require("node:url");
const crypto = require("node:crypto");

let server = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;
let pendingEntries = [];
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();
if (hasSingleInstanceLock) {
  if (process.defaultApp && process.argv[1]) app.setAsDefaultProtocolClient("mvmcmd", process.execPath, [path.resolve(process.argv[1])]);
  else app.setAsDefaultProtocolClient("mvmcmd");
}
const COMMAND_LINKS = new Set(["camera","qr","english","wallpaper","notification","device","sys","help","files","session"]);
const INCOMING_EXTENSIONS = new Set([".pdf",".txt",".md",".csv",".json",".png",".jpg",".jpeg",".webp",".gif",".doc",".docx",".xls",".xlsx",".ppt",".pptx",".mp3",".wav",".mp4",".webm"]);
function mimeForFile(filePath) {
  const ext=path.extname(filePath).toLowerCase();
  return ({".pdf":"application/pdf",".txt":"text/plain",".md":"text/markdown",".csv":"text/csv",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif",".doc":"application/msword",".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",".xls":"application/vnd.ms-excel",".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",".ppt":"application/vnd.ms-powerpoint",".pptx":"application/vnd.openxmlformats-officedocument.presentationml.presentation",".mp3":"audio/mpeg",".wav":"audio/wav",".mp4":"video/mp4",".webm":"video/webm"})[ext] || "application/octet-stream";
}
function queueEntry(entry) {
  if (!entry) return;
  pendingEntries.push(entry); pendingEntries=pendingEntries.slice(-20);
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.webContents.send("mvmcmd:entry",entry); mainWindow.show(); mainWindow.focus(); }
}
function parseProtocolEntry(rawUrl) {
  try {
    const u=new URL(rawUrl);
    if(u.protocol!=="mvmcmd:"||u.hostname.toLowerCase()!=="command")return null;
    const command=(u.pathname.split("/").filter(Boolean).pop()||u.searchParams.get("command")||"").toLowerCase();
    if(!COMMAND_LINKS.has(command))return null;
    return {available:true,id:"desktop-"+Date.now()+"-"+crypto.randomUUID(),source:"desktop",kind:"command",action:"protocol",command};
  } catch { return null; }
}
function makeFileEntry(inputPath) {
  try {
    const resolved=path.resolve(inputPath), ext=path.extname(resolved).toLowerCase();
    if(!INCOMING_EXTENSIONS.has(ext)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile())return null;
    return {available:true,id:"desktop-"+Date.now()+"-"+crypto.randomUUID(),source:"desktop",kind:"open-file",action:"open-file",uri:pathToFileURL(resolved).href,displayName:path.basename(resolved).slice(0,180),mimeType:mimeForFile(resolved)};
  } catch { return null; }
}
function handleLaunchArgument(arg) {
  if(typeof arg!=="string"||!arg)return false;
  if(/^mvmcmd:\/\//i.test(arg)){const entry=parseProtocolEntry(arg);if(entry)queueEntry(entry);return Boolean(entry);}
  const entry=makeFileEntry(arg);if(entry)queueEntry(entry);return Boolean(entry);
}
ipcMain.handle("mvmcmd:entry:get",()=>pendingEntries[0]||null);
ipcMain.handle("mvmcmd:entry:acknowledge",(_event,id)=>{const count=pendingEntries.length;pendingEntries=pendingEntries.filter(entry=>entry.id!==id);return{acknowledged:pendingEntries.length<count};});
ipcMain.handle("mvmcmd:file:open",async(_event,uri)=>{
  try {
    if(typeof uri!=="string"||uri.length>2048)return{opened:false,reason:"invalid file URL"};
    const parsed=new URL(uri);if(parsed.protocol!=="file:"||parsed.host)return{opened:false,reason:"only local file URLs are supported"};
    const target=path.resolve(fileURLToPath(parsed));
    if(!INCOMING_EXTENSIONS.has(path.extname(target).toLowerCase()))return{opened:false,reason:"unsupported file type"};
    if(!fs.existsSync(target)||!fs.statSync(target).isFile())return{opened:false,reason:"file not found"};
    const err=await shell.openPath(target);
    return err?{opened:false,reason:err}:{opened:true,reason:"system handler accepted request; external handling is not verified"};
  } catch(error) { return {opened:false,reason:error instanceof Error?error.message:"file handoff failed"}; }
});
app.on("open-url",(event,url)=>{event.preventDefault();handleLaunchArgument(url);if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus();}});
app.on("open-file",(event,file)=>{event.preventDefault();handleLaunchArgument(file);if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus();}});
app.on("second-instance",(_event,argv)=>{for(const arg of argv.slice(1)){if(handleLaunchArgument(arg))break;}if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus();}});

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
    ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".csv": "text/csv",
    ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".wav": "audio/wav", ".webm": "video/webm",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
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
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
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
  mainWindow.on("close", (event) => {
    if (tray && process.platform !== "darwin" && !isQuitting) { event.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.webContents.on("did-finish-load", () => { if (pendingEntries.length) mainWindow.webContents.send("mvmcmd:entry", pendingEntries[0]); });
  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
}

function showMainWindow(focusCommand) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show(); mainWindow.focus();
  if (focusCommand) mainWindow.webContents.send("mvmcmd:focus-command");
}
function createTray() {
  if (tray) return;
  const root=getWebRoot(), png=path.join(root,"__grok","icon-180.png"), svg=path.join(root,"favicon.svg");
  const icon=nativeImage.createFromPath(fs.existsSync(png)?png:svg);
  if (icon.isEmpty()) { console.warn("[MVMCMD] Tray icon unavailable; global shortcut remains enabled."); return; }
  tray=new Tray(icon); tray.setToolTip("MVMCMD");
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:"Open MVMCMD",click:()=>showMainWindow(false)},
    {label:"Focus command input",click:()=>showMainWindow(true)},
    {type:"separator"},
    {label:"Quit MVMCMD",click:()=>{isQuitting=true;app.quit();}}
  ]));
  tray.on("double-click",()=>showMainWindow(true));
}
app.whenReady().then(async()=>{
  if(!hasSingleInstanceLock)return;
  for(const arg of process.argv.slice(1))handleLaunchArgument(arg);
  await createWindow(); createTray();
  if(!globalShortcut.register("CommandOrControl+Shift+M",()=>showMainWindow(true)))console.warn("[MVMCMD] Ctrl/Command+Shift+M unavailable.");
}).catch(error=>{console.error("[MVMCMD] startup failed",error);app.quit();});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  if (server) {
    server.close();
    server = null;
  }
});
