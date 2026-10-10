import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AppWindow,
  Bell,
  BookOpen,
  Camera,
  CircleHelp,
  Clipboard,
  Clock3,
  Cpu,
  FolderOpen,
  History,
  Image,
  Info,
  Languages,
  Link2,
  Mail,
  MessageSquare,
  Package,
  Phone,
  QrCode,
  Search,
  Settings,
  Share2,
  Shield,
  Smartphone,
  Terminal,
} from "lucide-react";

/**
 * Visual identity for MVMCMD commands.
 *
 * Icon choices are aligned with Material Symbols semantics from Google Design
 * (camera, qr_code_scanner, wallpaper, translate, notifications, help, devices, …)
 * and implemented with lucide-react so the existing React tree stays consistent
 * with Mic / Activity usage in the shell.
 */
const COMMAND_ICONS: Record<string, LucideIcon> = {
  camera: Camera,
  qr: QrCode,
  wallpaper: Image,
  english: BookOpen,
  notification: Bell,
  notifications: Bell,

  help: CircleHelp,
  recents: History,
  sys: Cpu,
  device: Smartphone,
  about: Info,

  sms: MessageSquare,
  text: MessageSquare,
  email: Mail,
  mail: Mail,
  dial: Phone,
  call: Phone,
  contact: Phone,
  contacts: Phone,

  open: AppWindow,
  find: Search,
  search: Search,
  ls: AppWindow,
  list: AppWindow,
  pack: Package,
  package: Package,

  files: FolderOpen,
  file: FolderOpen,
  storage: FolderOpen,
  copy: Clipboard,
  paste: Clipboard,
  clipboard: Clipboard,
  share: Share2,
  send: Share2,
  link: Link2,

  perm: Shield,
  perms: Shield,
  permissions: Shield,
  compat: Settings,
  compatibility: Settings,
  perf: Activity,
  performance: Activity,
  session: Clock3,
  hist: History,
  history: History,
  lang: Languages,
  language: Languages,

  clear: Terminal,
  cls: Terminal,
};

const ALIAS_TO_COMMAND: Record<string, string> = {
  kamera: "camera",
  oyin: "gaming",
  "o'yin": "gaming",
  yordam: "help",
  qurilma: "device",
  xabarlar: "notification",
  bildirishnoma: "notification",
};

export function resolveCommandIconKey(command: string): string {
  const raw = command.trim().toLowerCase();
  if (!raw) return "";
  if (COMMAND_ICONS[raw]) return raw;
  const aliased = ALIAS_TO_COMMAND[raw];
  if (aliased && COMMAND_ICONS[aliased]) return aliased;
  return raw;
}

export function getCommandIcon(command: string): LucideIcon {
  const key = resolveCommandIconKey(command);
  return COMMAND_ICONS[key] ?? Terminal;
}

export function CommandIcon({
  command,
  size = 14,
  className,
}: {
  command: string;
  size?: number;
  className?: string;
}) {
  const Icon = getCommandIcon(command);
  return <Icon size={size} className={className} aria-hidden="true" strokeWidth={1.75} />;
}

/** Material Symbol names used as design reference (documentation only). */
export const MATERIAL_SYMBOL_REFERENCE = {
  camera: "photo_camera",
  qr: "qr_code_scanner",
  wallpaper: "wallpaper",
  english: "translate",
  notification: "notifications",
  help: "help",
  device: "smartphone",
  sms: "sms",
  email: "mail",
  files: "folder_open",
} as const;
