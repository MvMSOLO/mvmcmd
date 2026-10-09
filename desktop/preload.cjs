const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("mvmcmdEntry", {
  getPending: () => ipcRenderer.invoke("mvmcmd:entry:get"),
  acknowledge: (id) => ipcRenderer.invoke("mvmcmd:entry:acknowledge", id),
  openFile: (uri, mimeType) => ipcRenderer.invoke("mvmcmd:file:open", uri, mimeType),
  onEntry: (listener) => {
    if (typeof listener !== "function") return () => undefined;
    const handler = (_event, entry) => listener(entry);
    ipcRenderer.on("mvmcmd:entry", handler);
    return () => ipcRenderer.removeListener("mvmcmd:entry", handler);
  },
  onFocusCommand: (listener) => {
    if (typeof listener !== "function") return () => undefined;
    const handler = () => listener();
    ipcRenderer.on("mvmcmd:focus-command", handler);
    return () => ipcRenderer.removeListener("mvmcmd:focus-command", handler);
  }
});
