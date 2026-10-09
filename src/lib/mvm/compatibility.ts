export type MvmLanguage = "uz" | "en";

export interface AndroidCompatibilityEnvironment {
  sdk?: number;
  release?: string;
  manufacturer?: string;
  model?: string;
}
export type CompatibleCapabilityState = "ready" | "denied" | "restricted" | "unavailable" | "error" | "unknown";
export interface CompatibleCapabilitySnapshot { id: string; state: CompatibleCapabilityState; detail?: string; }
export interface CapabilityExplanation { label: string; stateLabel: string; summary: string; guidance?: string; }

const COMMAND_HEAD_ALIASES: Record<string, string> = {
  och: "open", ochish: "open", "ishga-tushir": "open", "ishga-tushur": "open",
  kamera: "camera", камера: "camera", skaner: "qr", skan: "qr", "qr-kod": "qr",
  ruxsat: "perm", ruxsatlar: "perm", ruhsat: "perm", qurilma: "device", "qurilma-info": "device",
  moslik: "compat", mosliklar: "compat", "moslikni-tekshir": "compat", "uyg'unlik": "compat",
  uygunlik: "compat", "telefon-mosligi": "compat", bildirishnoma: "notification",
  bildirishnomalar: "notification", xabarnoma: "notification", xabarnomalar: "notification",
  til: "lang", "tilni-almashtir": "lang", yordam: "help", buyruqlar: "help",
  sana: "date", vaqt: "date", fayllar: "files", qidir: "find", qidiruv: "find",
  ilovalar: "ls", oyin: "gaming", "o'yin": "gaming", "fon-rasmi": "wallpaper",
  "fon-rasmlar": "wallpaper", kontaktlar: "contact", aloqa: "contact", tozalash: "clear",
};
const ANDROID_API_VERSIONS: Record<number, string> = {
  21:"Android 5.0 Lollipop",22:"Android 5.1 Lollipop",23:"Android 6 Marshmallow",
  24:"Android 7.0 Nougat",25:"Android 7.1 Nougat",26:"Android 8.0 Oreo",27:"Android 8.1 Oreo",
  28:"Android 9 Pie",29:"Android 10",30:"Android 11",31:"Android 12",32:"Android 12L",
  33:"Android 13",34:"Android 14",35:"Android 15",36:"Android 16",37:"Android 17",
};
const CAPABILITY_LABELS: Record<string,{uz:string;en:string}> = {
  camera:{uz:"Kamera",en:"Camera"}, microphone:{uz:"Mikrofon",en:"Microphone"},
  notifications:{uz:"Bildirishnomalar",en:"Notifications"},
  notification_listener:{uz:"Bildirishnomalarga kirish",en:"Notification access"},
  contacts:{uz:"Kontaktlar",en:"Contacts"}, overlay:{uz:"Boshqa ilovalar ustida ko‘rsatish",en:"Display over other apps"},
  usage_access:{uz:"Foydalanish statistikasi",en:"Usage access"},
};

export function normalizeCommandWord(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US")
    .replace(/[ʻʼ‘’\u0060´]/g, "'").replace(/\s+/g, "-");
}
export function normalizeCommandHead(value: string): string {
  const token = normalizeCommandWord(value);
  return COMMAND_HEAD_ALIASES[token] ?? token;
}
const CAPABILITY_ALIASES: Record<string, string> = {
  camera: "camera", kamera: "camera", камера: "camera",
  microphone: "microphone", mic: "microphone", mikrofon: "microphone",
  notification: "notifications", notifications: "notifications", notify: "notifications",
  bildirishnoma: "notifications", bildirishnomalar: "notifications",
  xabarnoma: "notifications", xabarnomalar: "notifications",
  notification_listener: "notification_listener", "notification-listener": "notification_listener",
  "notification-access": "notification_listener", "bildirishnomalarga-kirish": "notification_listener",
  "xabarnomalarga-kirish": "notification_listener",
  contact: "contacts", contacts: "contacts", kontakt: "contacts", kontaktlar: "contacts",
  overlay: "overlay", "display-over-other-apps": "overlay", "boshqa-ilovalar-ustida": "overlay",
  usage: "usage_access", usage_access: "usage_access", "usage-access": "usage_access",
  "foydalanish-statistikasi": "usage_access", "ilova-foydalanish": "usage_access",
};

export function normalizeCapabilityId(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const token = normalizeCommandWord(value);
  return CAPABILITY_ALIASES[token] ?? token;
}

export function normalizeLanguageToken(value?: string): MvmLanguage | undefined {
  if (!value) return undefined;
  const token = normalizeCommandWord(value);
  if (["uz","uzbek","uzbekcha","o'zbek","o'zbekcha","uzbek-tili","o'zbek-tili"].includes(token)) return "uz";
  if (["en","eng","english","ingliz","inglizcha","ingliz-tili"].includes(token)) return "en";
  return undefined;
}
export function androidVersionLabel(sdk?: number): string | undefined {
  if (!Number.isInteger(sdk) || !sdk || sdk < 1) return undefined;
  return ANDROID_API_VERSIONS[sdk] ?? ("Android API " + sdk);
}
export function detectOemFamily(manufacturer?: string, model?: string): string {
  const value = ((manufacturer ?? "") + " " + (model ?? "")).trim().toLocaleLowerCase("en-US");
  if (!value) return "Unknown OEM";
  if (/\b(samsung|galaxy)\b/.test(value)) return "Samsung Galaxy";
  if (/\b(xiaomi|redmi|poco)\b/.test(value)) return "Xiaomi / Redmi / POCO";
  if (/\b(google|pixel)\b/.test(value)) return "Google Pixel";
  if (/\b(oppo)\b/.test(value)) return "OPPO";
  if (/\b(oneplus|one plus)\b/.test(value)) return "OnePlus";
  if (/\b(vivo|iqoo)\b/.test(value)) return "vivo / iQOO";
  if (/\b(huawei|honor)\b/.test(value)) return "Huawei / HONOR";
  if (/\b(realme)\b/.test(value)) return "realme";
  if (/\b(motorola|moto)\b/.test(value)) return "Motorola";
  if (/\b(nothing)\b/.test(value)) return "Nothing";
  if (/\b(tecno|infinix)\b/.test(value)) return "TECNO / Infinix";
  if (/\b(sony)\b/.test(value)) return "Sony";
  if (/\b(asus|rog)\b/.test(value)) return "ASUS";
  return "Other / unclassified OEM";
}
export function formatLocaleNumber(value: number, lang: MvmLanguage, maximumFractionDigits=2): string {
  if (!Number.isFinite(value)) return String(value);
  try { return new Intl.NumberFormat(lang==="uz"?"uz-UZ":"en-GB",{maximumFractionDigits}).format(value); }
  catch { return String(value); }
}
export function formatLocalDateTime(date: Date, lang: MvmLanguage): string {
  try { return new Intl.DateTimeFormat(lang==="uz"?"uz-UZ":"en-GB",{dateStyle:"medium",timeStyle:"short"}).format(date); }
  catch { return date.toLocaleString(); }
}
export function formatAndroidCompatibilityReport(env: AndroidCompatibilityEnvironment, lang: MvmLanguage): string[] {
  const uz = lang==="uz";
  const apiLabel = androidVersionLabel(env.sdk);
  const sdkLabel = Number.isInteger(env.sdk) && (env.sdk??0)>0 ? "API "+formatLocaleNumber(env.sdk as number,lang,0) : (uz?"API aniqlanmadi":"API unknown");
  const release = env.release?.trim();
  const version = apiLabel ? apiLabel+" ("+sdkLabel+")"+(release&&!apiLabel.includes(release)?" · release "+release:"") :
    (uz?"Android versiyasi noma’lum ("+sdkLabel+")":"Android version unknown ("+sdkLabel+")");
  const manufacturer = [env.manufacturer,env.model].filter((part)=>Boolean(part?.trim())).join(" ").trim();
  const family = detectOemFamily(env.manufacturer,env.model);
  const device = manufacturer||(uz?"Qurilma aniqlanmadi":"Device not reported");
  return [
    "ANDROID  "+version,
    uz?"OEM  "+device+" · guruh: "+family+" (faqat vendor ishorasi)":"OEM  "+device+" · family: "+family+" (vendor hint only)",
    env.sdk!==undefined&&env.sdk>=33
      ?(uz?"BILDIRISHNOMA  Android 13+ da runtime ruxsati va tizimdagi bildirishnoma sozlamasi alohida tekshiriladi.":"NOTIFICATIONS  Android 13+ requires runtime permission; system notification settings are checked separately.")
      :(uz?"BILDIRISHNOMA  Eski API’larda runtime prompt ishlatilmaydi; tizimdagi bildirishnoma sozlamasi o‘chirilgan bo‘lishi mumkin.":"NOTIFICATIONS  Runtime prompt is not used on older APIs; system notification settings may still be disabled."),
    env.sdk!==undefined&&env.sdk<23
      ?(uz?"MAXSUS RUXSATLAR  Overlay Android 6 / API 23 dan boshlab mavjud.":"SPECIAL ACCESS  Overlay access requires Android 6 / API 23 or newer.")
      :(uz?"MAXSUS RUXSATLAR  Overlay, foydalanish statistikasi va notification-listener mustaqil tekshiriladi; READY bo‘lmasa amal bajarildi hisoblanmaydi.":"SPECIAL ACCESS  Overlay, usage access and notification-listener are checked independently; non-READY is never treated as success."),
    (env.sdk===undefined||env.sdk>=33)
      ?(uz?"RESTRICTED SETTINGS  Android 13+ maxsus kirishni bloklasa, faqat tizim ko‘rsatsa: Settings → Apps → MVMCMD → ⋮ → Allow restricted settings. Faqat ilovaga ishonsangiz yoqing.":"RESTRICTED SETTINGS  If Android 13+ blocks special access, use Settings → Apps → MVMCMD → ⋮ → Allow restricted settings only if shown by the system and you trust this app.")
      :(uz?"RESTRICTED SETTINGS  Android 13+ yo‘riqnomasi bu API darajasiga taalluqli emas.":"RESTRICTED SETTINGS  The Android 13+ path does not apply to this API level."),
    family==="Samsung Galaxy"
      ?(uz?"FON REJIMI  Samsung’da kechikish kuzatilsa, Settings → Device care → Battery → Background usage limits bo‘limini tekshiring; Never sleeping apps faqat zarur bo‘lsa.":"BACKGROUND  If delayed work is observed on Samsung, inspect Settings → Device care → Battery → Background usage limits; use Never sleeping apps only when needed.")
      :(uz?"FON REJIMI  Ish kechiksa, Settings → Battery / App battery usage bo‘limini tekshiring. OEM menyusi farq qiladi; cheklovlarni birdaniga o‘chirmang.":"BACKGROUND  If work is delayed, inspect Settings → Battery / App battery usage. OEM menus vary; do not disable all restrictions pre-emptively."),
    uz?"FALLBACK  MVMCMD real capability holatiga tayanadi. Tizim yoki OEM bloklasa, cheklangan/mavjud emas deb ko‘rsatadi; yashirin bypass yo‘q.":"FALLBACK  MVMCMD relies on real capability snapshots. If Android or an OEM blocks access, it reports restricted/unavailable; there is no hidden bypass.",
  ];
}
export function explainCapabilitySnapshot(snapshot: CompatibleCapabilitySnapshot, env: AndroidCompatibilityEnvironment, lang: MvmLanguage): CapabilityExplanation {
  const uz = lang==="uz";
  const label = CAPABILITY_LABELS[snapshot.id]?.[lang] ?? snapshot.id.replace(/_/g," ");
  const states: Record<CompatibleCapabilityState,string> = {
    ready:uz?"tayyor":"ready", denied:uz?"ruxsat berilmagan":"permission denied",
    restricted:uz?"tizim tomonidan cheklangan":"restricted by system", unavailable:uz?"mavjud emas":"unavailable",
    error:uz?"tekshiruv xatosi":"check error", unknown:uz?"noma’lum":"unknown",
  };
  let summary = "";
  let guidance: string|undefined;
  switch(snapshot.state) {
    case "ready": summary=uz?label+": Android holatni READY deb tasdiqladi.":label+": Android confirmed the capability is READY."; break;
    case "denied":
      summary=uz?label+" ruxsati yoqilmagan yoki tizim sozlamasida o‘chirilgan.":label+" permission is not granted or is disabled in system settings.";
      guidance=uz?"Android Settings → Apps → MVMCMD → Permissions bo‘limini tekshiring; ruxsatni faqat kerak bo‘lsa bering, keyin perm buyrug‘ini qayta ishlating.":"Check Android Settings → Apps → MVMCMD → Permissions; grant only what is needed, then rerun the perm command.";
      break;
    case "restricted":
      summary=uz?label+" Android sozlamasi yoki vendor siyosati bilan cheklangan. MVMCMD bu cheklovni chetlab o‘tmaydi.":label+" is restricted by Android settings or vendor policy. MVMCMD does not bypass the restriction.";
      if(snapshot.id==="notification_listener"&&(env.sdk===undefined||env.sdk>=33)) {
        guidance=uz
          ?"Agar Android menyuda Allow restricted settings ko‘rsatsa: Settings → Apps → MVMCMD → ⋮ → Allow restricted settings. Bu maxfiy xabarlarga kirish beradi; faqat ilovaga ishonsangiz yoqing. Menyu bo‘lmasa, majburlamang."
          :"If Android shows Allow restricted settings: Settings → Apps → MVMCMD → ⋮ → Allow restricted settings. This can expose sensitive notifications; enable it only if you trust this app. If the option is absent, do not force this path.";
      } else guidance=uz?"Android Settings ichida aynan shu maxsus ruxsatni tekshiring. OEM menyusi farq qilishi mumkin; qaytgach perm buyrug‘i bilan qayta tekshiring.":"Inspect this specific special-access setting in Android Settings. OEM menus vary; return to MVMCMD and recheck with perm.";
      break;
    case "unavailable":
      summary=uz?label+" bu qurilma/API yoki tizim sozlamalari sahifasida mavjud emas.":label+" is unavailable on this device/API level or its system settings screen.";
      guidance=uz?"Bu ixtiyoriy ruxsat bo‘lsa, uni o‘tkazib yuboring; boshqa asosiy buyruqlar ishlashi kerak.":"If this is optional, skip it; unrelated core commands should remain usable.";
      break;
    case "error":
      summary=uz?label+" holatini Android’dan ishonchli tasdiqlab bo‘lmadi.":"Android could not reliably confirm the "+label.toLocaleLowerCase("en-US")+" state.";
      guidance=uz?"Bajarildi deb hisoblamang. Qayta tekshiring; xato davom etsa qurilma/API farqi bo‘lishi mumkin.":"Do not treat it as completed. Retry the check; persistent errors may indicate device/API differences.";
      break;
    default: summary=uz?label+" holati hali tekshirilmagan.":label+" has not been checked yet.";
  }
  if(!guidance&&snapshot.detail&&snapshot.state!=="ready"&&lang==="en") guidance=snapshot.detail;
  return {label,stateLabel:states[snapshot.state],summary,...(guidance?{guidance}:{})};
}
