import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { canUseNativeAndroidLauncher, nativeOpenIncomingFile } from "./native-launcher";

interface NativeEntryPlugin {
  getPendingEntry(): Promise<unknown>;
  acknowledgeEntry(options: {id:string}): Promise<{acknowledged:boolean}>;
  addListener(eventName: "entryPoint", listener: (entry:unknown)=>void): Promise<PluginListenerHandle>;
}
interface DesktopEntryBridge {
  getPending(): Promise<unknown>; acknowledge(id:string): Promise<{acknowledged:boolean}>;
  onEntry(listener:(entry:unknown)=>void):()=>void; onFocusCommand(listener:()=>void):()=>void;
  openFile(uri:string,mimeType?:string):Promise<{opened:boolean;reason?:string}>;
}
declare global { interface Window { mvmcmdEntry?: DesktopEntryBridge; } }
const NativeEntry=registerPlugin<NativeEntryPlugin>("MvmEntryPoint");
export async function subscribeGlobalEntryPoints(onEntry:(entry:unknown)=>void,onFocusCommand:()=>void):Promise<()=>void> {
  if (typeof window === "undefined") return ()=>undefined;
  if (window.mvmcmdEntry) {
    const b=window.mvmcmdEntry, removeEntry=b.onEntry(onEntry), removeFocus=b.onFocusCommand(onFocusCommand);
    try { const p=await b.getPending(); if(p) onEntry(p); } catch { /* command input still works */ }
    return ()=>{removeEntry();removeFocus();};
  }
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform()==="android") {
    const listener=await NativeEntry.addListener("entryPoint",onEntry);
    try {const p=await NativeEntry.getPendingEntry();if(p)onEntry(p);} catch { /* optional entry points must not block boot */ }
    return ()=>{void listener.remove();};
  }
  window.addEventListener("mvm:focus-command",onFocusCommand);
  return ()=>window.removeEventListener("mvm:focus-command",onFocusCommand);
}
export async function acknowledgeGlobalEntry(e:{id:string;source:"android"|"desktop"}):Promise<void> {
  try {
    if(e.source==="desktop"&&typeof window!=="undefined"&&window.mvmcmdEntry) await window.mvmcmdEntry.acknowledge(e.id);
    else if(e.source==="android"&&Capacitor.isNativePlatform()) await NativeEntry.acknowledgeEntry({id:e.id});
  } catch { /* renderer-side ID dedupe prevents repeat staging during this process */ }
}
function report(opened:boolean,reason?:string):void {
  if(typeof window!=="undefined") window.dispatchEvent(new CustomEvent("mvm:entry-action-result",{detail:{action:"openfile",opened,reason}}));
}
export function requestExternalFileOpen(uri:string,mimeType?:string):{started:boolean;method?:string;reason?:string} {
  const target=uri.trim();
  if(target.length>2048||/[\u0000-\u001f]/.test(target))return{started:false,reason:"invalid file reference"};
  if(canUseNativeAndroidLauncher()){
    if(!/^content:\/\//i.test(target)||/\/data\/|\/proc\//i.test(target))return{started:false,reason:"Android file open requires a scoped content URI"};
    void nativeOpenIncomingFile(target,mimeType).then(r=>report(r.opened,r.reason)).catch(e=>report(false,e instanceof Error?e.message:"Android file handoff failed"));
    return{started:true,method:"android-view-chooser",reason:"system open request dispatched; external handling is not verified"};
  }
  if(typeof window!=="undefined"&&window.mvmcmdEntry){
    if(!/^file:\/\//i.test(target))return{started:false,reason:"desktop file open requires a local file URL"};
    void window.mvmcmdEntry.openFile(target,mimeType).then(r=>report(r.opened,r.reason)).catch(e=>report(false,e instanceof Error?e.message:"Desktop file handoff failed"));
    return{started:true,method:"desktop-default-app",reason:"system open request dispatched; external handling is not verified"};
  }
  return{started:false,reason:"file open is available only from a supported native or desktop entry point"};
}
