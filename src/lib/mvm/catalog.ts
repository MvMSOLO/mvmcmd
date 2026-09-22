import type { CatalogApp, Category } from "./types";

type Row = [
  id: string,
  name: string,
  aliases: string,
  pkg: string,
  ios: string,
  web: string,
  category: Category,
  weight: number,
];

function expand(rows: Row[]): CatalogApp[] {
  return rows.map(([id, name, aliases, pkg, ios, web, category, weight]) => ({
    id,
    name,
    aliases: aliases
      ? aliases
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    androidPackage: pkg || undefined,
    iosScheme: ios || undefined,
    webUrl: web || undefined,
    category,
    weight,
  }));
}

const SOCIAL_CHAT: Row[] = [
  ["telegram", "Telegram", "tg,tele,telegramm,tdesktop", "org.telegram.messenger", "tg://", "https://web.telegram.org/", "chat", 100],
  ["whatsapp", "WhatsApp", "wa,whats,wapp", "com.whatsapp", "whatsapp://", "https://web.whatsapp.com/", "chat", 98],
  ["instagram", "Instagram", "ig,insta,igram", "com.instagram.android", "instagram://", "https://www.instagram.com/", "social", 99],
  ["tiktok", "TikTok", "tt,tiktak,douyin", "com.zhiliaoapp.musically", "tiktok://", "https://www.tiktok.com/", "social", 97],
  ["youtube", "YouTube", "yt,utube,youtub,video", "com.google.android.youtube", "youtube://", "https://www.youtube.com/", "video", 100],
  ["facebook", "Facebook", "fb,face,meta", "com.facebook.katana", "fb://", "https://www.facebook.com/", "social", 86],
  ["messenger", "Messenger", "msgr,fbmsg", "com.facebook.orca", "fb-messenger://", "https://www.messenger.com/", "chat", 80],
  ["x", "X", "twitter,tw,tweet,xtwitter", "com.twitter.android", "twitter://", "https://x.com/", "social", 84],
  ["snapchat", "Snapchat", "snap,sc", "com.snapchat.android", "snapchat://", "https://www.snapchat.com/", "social", 78],
  ["discord", "Discord", "dc,ds", "com.discord", "discord://", "https://discord.com/app", "chat", 82],
  ["threads", "Threads", "thrd", "com.instagram.barcelona", "barcelona://", "https://www.threads.net/", "social", 70],
  ["reddit", "Reddit", "rd,redditapp", "com.reddit.frontpage", "reddit://", "https://www.reddit.com/", "social", 72],
  ["pinterest", "Pinterest", "pin", "com.pinterest", "pinterest://", "https://www.pinterest.com/", "social", 60],
  ["linkedin", "LinkedIn", "in,linkedinapp", "com.linkedin.android", "linkedin://", "https://www.linkedin.com/", "social", 64],
  ["vk", "VK", "vkontakte,вк", "com.vkontakte.android", "vk://", "https://vk.com/", "social", 74],
  ["ok", "Odnoklassniki", "okru,одноклассники", "ru.ok.android", "odnoklassniki://", "https://ok.ru/", "social", 62],
  ["imo", "IMO", "imoapp", "com.imo.android.imoim", "imo://", "https://imo.im/", "chat", 76],
  ["viber", "Viber", "vbr", "com.viber.voip", "viber://", "https://www.viber.com/", "chat", 68],
  ["signal", "Signal", "sgnl", "org.thoughtcrime.securesms", "sgnl://", "https://signal.org/", "chat", 58],
  ["wechat", "WeChat", "weixin,wc", "com.tencent.mm", "weixin://", "https://www.wechat.com/", "chat", 55],
  ["line", "LINE", "lineapp", "jp.naver.line.android", "line://", "https://line.me/", "chat", 54],
  ["skype", "Skype", "skp", "com.skype.raider", "skype://", "https://web.skype.com/", "chat", 50],
  ["zoom", "Zoom", "zoomus", "us.zoom.videomeetings", "zoomus://", "https://zoom.us/", "chat", 66],
];

const GOOGLE: Row[] = [
  ["chrome", "Chrome", "browser,googlechrome", "com.android.chrome", "googlechrome://", "https://www.google.com/", "browser", 90],
  ["gmail", "Gmail", "mail,googlemail", "com.google.android.gm", "googlegmail://", "https://mail.google.com/", "google", 88],
  ["maps", "Google Maps", "gmaps,map,xarita,maps", "com.google.android.apps.maps", "comgooglemaps://", "https://maps.google.com/", "map", 90],
  ["drive", "Google Drive", "gdrive,disk", "com.google.android.apps.docs", "googledrive://", "https://drive.google.com/", "google", 70],
  ["photos", "Google Photos", "gphotos,gallery,rasm", "com.google.android.apps.photos", "googlephotos://", "https://photos.google.com/", "google", 72],
  ["play", "Play Store", "playstore,market,store,googleplay", "com.android.vending", "itms-apps://", "https://play.google.com/store", "google", 88],
  ["google", "Google", "search,qsb", "com.google.android.googlequicksearchbox", "google://", "https://www.google.com/", "google", 80],
  ["meet", "Google Meet", "gmeet,hangouts", "com.google.android.apps.meetings", "gmeet://", "https://meet.google.com/", "google", 62],
  ["gcal", "Google Calendar", "calendar,kalendar", "com.google.android.calendar", "googlecalendar://", "https://calendar.google.com/", "google", 64],
  ["keep", "Google Keep", "notes,keepnotes", "com.google.android.keep", "keep://", "https://keep.google.com/", "google", 55],
  ["translate", "Google Translate", "tarjima,translate", "com.google.android.apps.translate", "googletranslate://", "https://translate.google.com/", "google", 68],
  ["ytmusic", "YouTube Music", "ytm,youtubemusic", "com.google.android.apps.youtube.music", "youtubemusic://", "https://music.youtube.com/", "music", 70],
  ["gemini", "Google Gemini", "bard,geminiapp", "com.google.android.apps.bard", "", "https://gemini.google.com/", "google", 60],
  ["docs", "Google Docs", "gdocs", "com.google.android.apps.docs.editors.docs", "googledocs://", "https://docs.google.com/", "google", 52],
  ["sheets", "Google Sheets", "gsheets,excelalt", "com.google.android.apps.docs.editors.sheets", "googlesheets://", "https://sheets.google.com/", "google", 50],
];

const GAMES: Row[] = [
  ["efootball", "eFootball", "ef,pes,efoot,efootball,pes2024,pes2025,pes2026,winningeleven,uie", "jp.konami.pesam", "", "https://www.konami.com/efootball/", "game", 96],
  ["pubg", "PUBG Mobile", "pubg,bgmi,battlegrounds", "com.tencent.ig", "", "https://www.pubgmobile.com/", "game", 94],
  ["freefire", "Free Fire", "ff,freefire,garena", "com.dts.freefireth", "", "https://ff.garena.com/", "game", 93],
  ["mlbb", "Mobile Legends", "ml,mlbb,mobilelegends,legend", "com.mobile.legends", "", "https://www.mobilelegends.com/", "game", 91],
  ["codm", "Call of Duty Mobile", "cod,codm,callofduty", "com.activision.callofduty.shooter", "", "https://www.callofduty.com/mobile", "game", 85],
  ["fcmobile", "EA Sports FC Mobile", "fifa,fc,fcmobile,fifamobile", "com.ea.gp.fifamobile", "", "https://www.ea.com/games/ea-sports-fc/fc-mobile", "game", 88],
  ["coc", "Clash of Clans", "coc,clash,clashofclans", "com.supercell.clashofclans", "", "https://supercell.com/en/games/clashofclans/", "game", 80],
  ["cr", "Clash Royale", "cr,clashroyale", "com.supercell.clashroyale", "", "https://supercell.com/en/games/clashroyale/", "game", 74],
  ["brawl", "Brawl Stars", "bs,brawl,brawlstars", "com.supercell.brawlstars", "", "https://supercell.com/en/games/brawlstars/", "game", 82],
  ["roblox", "Roblox", "rbx,robloxapp", "com.roblox.client", "roblox://", "https://www.roblox.com/", "game", 84],
  ["minecraft", "Minecraft", "mc,mcpe,minecraftpe", "com.mojang.minecraftpe", "", "https://www.minecraft.net/", "game", 83],
  ["standoff", "Standoff 2", "standoff,so2,standoff2", "com.axlebolt.standoff2", "", "https://standoff2.com/", "game", 86],
  ["genshin", "Genshin Impact", "gi,genshin", "com.miHoYo.GenshinImpact", "", "https://genshin.hoyoverse.com/", "game", 70],
  ["subway", "Subway Surfers", "subwaysurfers,subway", "com.kiloo.subwaysurf", "", "https://www.sybogames.com/games/subway-surfers/", "game", 65],
  ["amongus", "Among Us", "among,amongus", "com.innersloth.spacemafia", "", "https://www.innersloth.com/games/among-us/", "game", 58],
  ["carpark", "Car Parking Multiplayer", "cpm,carparking", "com.olzhas.carparking.multyplayer", "", "https://olzhass.com/", "game", 72],
  ["stumble", "Stumble Guys", "stumble,stumbleguys", "com.kitkagames.fallbuddies", "", "https://www.stumbleguys.com/", "game", 68],
  ["brawlhalla", "Brawlhalla", "brawlhalla", "com.ubisoft.brawlhalla", "", "https://www.brawlhalla.com/", "game", 48],
  ["wotb", "World of Tanks Blitz", "wot,wotb,tanks", "net.wargaming.wot.blitz", "", "https://wotblitz.com/", "game", 60],
  ["asphalt", "Asphalt 9", "asphalt,asphalt9", "com.gameloft.android.ANMP.GloftA9HM", "", "https://www.gameloft.com/game/asphalt-9", "game", 55],
  ["candy", "Candy Crush", "candycrush,candy", "com.king.candycrushsaga", "", "https://www.king.com/game/candycrush", "game", 50],
  ["pool", "8 Ball Pool", "8ball,pool,eightball", "com.miniclip.eightballpool", "", "https://miniclip.com/games/8-ball-pool-multiplayer/", "game", 58],
  ["ludo", "Ludo King", "ludo,ludoking", "com.ludo.king", "", "https://www.ludo-king.com/", "game", 64],
  ["hill", "Hill Climb Racing", "hcr,hillclimb", "com.fingersoft.hillclimb", "", "https://www.fingersoft.com/games/hill-climb-racing/", "game", 48],
  ["hok", "Honor of Kings", "hok,honorofkings,aov", "com.levelinfinite.sgameGlobal", "", "https://www.honorofkings.com/", "game", 52],
  ["wildrift", "League of Legends Wild Rift", "lol,wildrift,wr", "com.riotgames.league.wildrift", "", "https://wildrift.leagueoflegends.com/", "game", 54],
  ["chess", "Chess.com", "chess,shaxmat", "com.chess", "", "https://www.chess.com/", "game", 56],
];

const MEDIA: Row[] = [
  ["spotify", "Spotify", "spot,music,musiqa", "com.spotify.music", "spotify://", "https://open.spotify.com/", "music", 90],
  ["netflix", "Netflix", "nflx,netflixapp", "com.netflix.mediaclient", "nflx://", "https://www.netflix.com/", "video", 86],
  ["twitch", "Twitch", "ttv,twitchapp", "tv.twitch.android.app", "twitch://", "https://www.twitch.tv/", "video", 70],
  ["prime", "Prime Video", "primevideo,amazonprime", "com.amazon.avod.thirdpartyclient", "aiv://", "https://www.primevideo.com/", "video", 62],
  ["disney", "Disney+", "disneyplus,disney", "com.disney.disneyplus", "disneyplus://", "https://www.disneyplus.com/", "video", 58],
  ["applemusic", "Apple Music", "am,applemusic", "com.apple.android.music", "music://", "https://music.apple.com/", "music", 60],
  ["soundcloud", "SoundCloud", "sccloud,soundcloud", "com.soundcloud.android", "soundcloud://", "https://soundcloud.com/", "music", 55],
  ["capcut", "CapCut", "capcutapp,cap", "com.lemon.lvoverseas", "", "https://www.capcut.com/", "video", 84],
  ["vlc", "VLC", "vlcplayer", "org.videolan.vlc", "", "https://www.videolan.org/vlc/", "video", 52],
  ["mxplayer", "MX Player", "mx,mxplayer", "com.mxtech.videoplayer.ad", "", "https://mxplayer.in/", "video", 58],
  ["shazam", "Shazam", "shazamapp", "com.shazam.android", "shazam://", "https://www.shazam.com/", "music", 50],
  ["likee", "Likee", "likeeapp", "video.like", "", "https://likee.video/", "video", 60],
];

const TOOLS_BROWSERS: Row[] = [
  ["firefox", "Firefox", "ffox,mozilla", "org.mozilla.firefox", "firefox://", "https://www.mozilla.org/firefox/", "browser", 62],
  ["edge", "Edge", "msedge,edged", "com.microsoft.emmx", "microsoft-edge://", "https://www.microsoft.com/edge", "browser", 55],
  ["opera", "Opera", "operaapp", "com.opera.browser", "", "https://www.opera.com/", "browser", 50],
  ["brave", "Brave", "bravebrowser", "com.brave.browser", "", "https://brave.com/", "browser", 52],
  ["samsung", "Samsung Internet", "sbrowser", "com.sec.android.app.sbrowser", "", "https://www.samsung.com/internet", "browser", 48],
  ["yandexbrowser", "Yandex Browser", "ya,yandex", "com.yandex.browser", "yandexbrowser://", "https://browser.yandex.com/", "browser", 66],
  ["opera-gx", "Opera GX", "operagx", "com.opera.gx", "", "https://www.opera.com/gx", "browser", 40],
  ["uc", "UC Browser", "ucbrowser", "com.UCMobile.intl", "", "https://www.ucweb.com/", "browser", 44],
  ["acrobat", "Adobe Acrobat", "pdf,acrobat", "com.adobe.reader", "", "https://www.adobe.com/acrobat.html", "tool", 48],
  ["canva", "Canva", "canvaapp", "com.canva.editor", "", "https://www.canva.com/", "tool", 58],
  ["notion", "Notion", "notionapp", "notion.id", "notion://", "https://www.notion.so/", "tool", 54],
  ["chatgpt", "ChatGPT", "gpt,openai", "com.openai.chatgpt", "", "https://chatgpt.com/", "tool", 80],
  ["deepseek", "DeepSeek", "deepseekapp", "com.deepseek.chat", "", "https://chat.deepseek.com/", "tool", 62],
  ["grok", "Grok", "grokapp,xai", "ai.x.grok", "", "https://grok.com/", "tool", 70],
  ["clock", "Clock", "soat,alarm,timer", "com.google.android.deskclock", "", "", "tool", 50],
  ["calculator", "Calculator", "calc,kalkulyator", "com.google.android.calculator", "", "", "tool", 52],
  ["files", "Files", "file,fayl,myfiles", "com.google.android.apps.nbu.files", "", "", "tool", 56],
  ["contacts", "Contacts", "contact,kontaktlar", "com.google.android.contacts", "", "", "tool", 54],
  ["weather", "Weather", "obhavo,pogoda", "com.google.android.googlequicksearchbox", "", "https://weather.google.com/", "tool", 44],
];

const SHOP_MONEY_MAP: Row[] = [
  ["click", "Click SuperApp", "clickuz,click,klik", "air.com.ssdsoftwaresolutions.clickuz", "", "https://click.uz/", "money", 94],
  ["payme", "Payme", "paymeuz,peymi,payme", "uz.dida.payme", "", "https://payme.uz/", "money", 95],
  ["uzum", "Uzum Market", "uzum,uzummarket", "uz.uzum.app", "", "https://uzum.uz/", "shop", 90],
  ["uzumbank", "Uzum Bank", "uzumbank,apelsin", "uz.uzum.bank", "", "https://uzumbank.uz/", "money", 78],
  ["uzumnasiya", "Uzum Nasiya", "nasiya,uzumnasiya", "uz.uzum.nasiya", "", "https://nasiya.uzum.uz/", "money", 70],
  ["yandexgo", "Yandex Go", "yandex,taxi,taksi,yandeks", "ru.yandex.taxi", "yandextaxi://", "https://go.yandex/", "map", 88],
  ["yandexmaps", "Yandex Maps", "yamaps,yandexmaps", "ru.yandex.yandexmaps", "yandexmaps://", "https://yandex.com/maps", "map", 76],
  ["twogis", "2GIS", "2gis,dgis,dva", "ru.dublgis.dgismobile", "dgis://", "https://2gis.uz/", "map", 82],
  ["express24", "Express24", "e24,express,express24", "uz.express24.android", "", "https://express24.uz/", "shop", 80],
  ["olx", "OLX", "olxuz,olx", "com.olx.uz", "", "https://www.olx.uz/", "shop", 78],
  ["wildberries", "Wildberries", "wb,wildberries", "com.wildberries.ru", "", "https://www.wildberries.ru/", "shop", 74],
  ["aliexpress", "AliExpress", "ali,aliexpress", "com.alibaba.aliexpresshd", "aliexpress://", "https://www.aliexpress.com/", "shop", 72],
  ["wolt", "Wolt", "woltapp", "com.wolt.android", "", "https://wolt.com/", "shop", 64],
  ["glovo", "Glovo", "glovoapp", "com.glovo", "", "https://glovoapp.com/", "shop", 60],
  ["paypal", "PayPal", "paypalapp", "com.paypal.android.p2pmobile", "paypal://", "https://www.paypal.com/", "money", 55],
  ["wise", "Wise", "transferwise,wiseapp", "com.transferwise.android", "", "https://wise.com/", "money", 50],
  ["humo", "Humo Pay", "humo,humopay", "uz.humo.pay", "", "https://humocard.uz/", "money", 66],
  ["anor", "Anorbank", "anor,anorbank", "uz.anorbank.mobile", "", "https://anorbank.uz/", "money", 58],
  ["kapital", "Kapitalbank", "kapital,kapitalbank", "uz.kapitalbank.mobile", "", "https://kapitalbank.uz/", "money", 60],
  ["sqb", "SQB", "sqb,sqbbank,nbu", "uz.nbu.mobile", "", "https://nbu.uz/", "money", 52],
  ["mygov", "my.gov.uz", "mygov,govuz,davlat", "uz.gov.mygov", "", "https://my.gov.uz/", "tool", 70],
  ["uzcard", "Uzcard", "uzcardapp", "uz.uzcard.app", "", "https://uzcard.uz/", "money", 54],
  ["uber", "Uber", "uberapp", "com.ubercab", "uber://", "https://uber.com/", "map", 50],
];

const SYSTEM: CatalogApp[] = [
  {
    id: "phone",
    name: "Phone",
    aliases: ["call", "dialer", "tel", "qongiroq", "telefon"],
    androidPackage: "com.google.android.dialer",
    androidAction: "android.intent.action.DIAL",
    androidData: "tel:",
    iosScheme: "tel://",
    webUrl: "tel:",
    category: "system",
    weight: 85,
  },
  {
    id: "sms",
    name: "Messages",
    aliases: ["sms", "message", "xabar", "messages"],
    androidPackage: "com.google.android.apps.messaging",
    androidAction: "android.intent.action.VIEW",
    androidData: "sms:",
    iosScheme: "sms://",
    webUrl: "sms:",
    category: "system",
    weight: 82,
  },
  {
    id: "settings",
    name: "Settings",
    aliases: ["sozlama", "settings", "androidsettings"],
    androidPackage: "com.android.settings",
    androidAction: "android.settings.SETTINGS",
    iosScheme: "app-settings:",
    category: "system",
    weight: 80,
  },
  {
    id: "camera",
    name: "Camera",
    aliases: ["kamera", "cam", "photo", "camera"],
    androidPackage: "com.android.camera2",
    androidAction: "android.media.action.STILL_IMAGE_CAMERA",
    iosScheme: "camera://",
    category: "system",
    weight: 78,
  },
  {
    id: "email",
    name: "Mail",
    aliases: ["email", "mailto", "pochta"],
    androidAction: "android.intent.action.VIEW",
    androidData: "mailto:",
    iosScheme: "mailto:",
    webUrl: "mailto:",
    category: "system",
    weight: 60,
  },
];

const MORE: Row[] = [
  ["telegramx", "Telegram X", "tgx,telegramx", "org.thunderdog.challegram", "tg://", "https://telegram.org/", "chat", 72],
  ["whatsapp-business", "WhatsApp Business", "wab,businesswhatsapp", "com.whatsapp.w4b", "whatsapp://", "https://business.whatsapp.com/", "chat", 58],
  ["truecaller", "Truecaller", "truecaller,callerid", "com.truecaller", "", "https://www.truecaller.com/", "tool", 60],
  ["shein", "SHEIN", "sheinapp", "com.zzkko", "", "https://www.shein.com/", "shop", 58],
  ["temu", "Temu", "temuapp", "com.einnovation.temu", "", "https://www.temu.com/", "shop", 62],
  ["amazon", "Amazon", "amazonapp", "com.amazon.mShop.android.shopping", "amazon://", "https://www.amazon.com/", "shop", 55],
  ["duolingo", "Duolingo", "duo,duolingo", "com.duolingo", "", "https://www.duolingo.com/", "tool", 58],
  ["pinterest2", "Pinterest Lite", "pinlite", "com.pinterest.twa", "", "https://www.pinterest.com/", "social", 40],
  ["outlook", "Outlook", "outlookapp,hotmail", "com.microsoft.office.outlook", "ms-outlook://", "https://outlook.live.com/", "tool", 56],
  ["teams", "Microsoft Teams", "teams,msteams", "com.microsoft.teams", "msteams://", "https://teams.microsoft.com/", "chat", 54],
  ["word", "Microsoft Word", "word,msword", "com.microsoft.office.word", "ms-word://", "https://www.office.com/", "tool", 50],
  ["excel", "Microsoft Excel", "excel,msexcel", "com.microsoft.office.excel", "ms-excel://", "https://www.office.com/", "tool", 50],
  ["powerpoint", "PowerPoint", "ppt,powerpoint", "com.microsoft.office.powerpoint", "ms-powerpoint://", "https://www.office.com/", "tool", 46],
  ["dropbox", "Dropbox", "dropboxapp", "com.dropbox.android", "dbapi-2://", "https://www.dropbox.com/", "tool", 44],
  ["onedrive", "OneDrive", "onedriveapp", "com.microsoft.skydrive", "ms-onedrive://", "https://onedrive.live.com/", "tool", 46],
  ["github", "GitHub", "gh,githubapp", "com.github.android", "", "https://github.com/", "tool", 52],
  ["reddit-sync", "Reddit", "reddit", "com.reddit.frontpage", "reddit://", "https://www.reddit.com/", "social", 1],
  ["instagram-lite", "Instagram Lite", "iglite", "com.instagram.lite", "instagram://", "https://www.instagram.com/", "social", 50],
  ["facebook-lite", "Facebook Lite", "fblite", "com.facebook.lite", "fb://", "https://www.facebook.com/", "social", 52],
  ["tiktok-lite", "TikTok Lite", "ttlite", "com.zhiliaoapp.musically.go", "tiktok://", "https://www.tiktok.com/", "social", 48],
  ["youtube-go", "YouTube", "ytgo", "com.google.android.apps.youtube.mango", "youtube://", "https://m.youtube.com/", "video", 40],
  ["telegram-web", "Telegram Web", "tgweb", "", "tg://", "https://web.telegram.org/a/", "chat", 30],
  ["booking", "Booking.com", "booking,mehmonxona", "com.booking", "booking://", "https://www.booking.com/", "shop", 50],
  ["airbnb", "Airbnb", "airbnbapp", "com.airbnb.android", "airbnb://", "https://www.airbnb.com/", "shop", 48],
  ["aviasales", "Aviasales", "aviasales,wayaway", "ru.aviasales", "", "https://www.aviasales.com/", "shop", 54],
  ["kiwi", "Kiwi.com", "kiwi", "com.skypicker.main", "", "https://www.kiwi.com/", "shop", 42],
  ["iutv", "iTV", "itv,milliy", "uz.itv.app", "", "https://itv.uz/", "video", 58],
  ["mobiuz", "Mobiuz", "mobiuz,ums", "uz.mobiuz.app", "", "https://mobiuz.uz/", "tool", 50],
  ["beeline", "Beeline", "beelineuz,beeline", "uz.beeline.app", "", "https://beeline.uz/", "tool", 50],
  ["ucell", "Ucell", "ucellapp", "uz.ucell.app", "", "https://ucell.uz/", "tool", 50],
  ["uztelecom", "Uztelecom", "uztelecom,online", "uz.uztelecom.app", "", "https://uztelecom.uz/", "tool", 48],
];

function dedupe(apps: CatalogApp[]): CatalogApp[] {
  const seen = new Set<string>();
  const out: CatalogApp[] = [];
  for (const app of apps) {
    if (seen.has(app.id)) continue;
    seen.add(app.id);
    out.push(app);
  }
  return out;
}

export const CATALOG: CatalogApp[] = dedupe([
  ...SYSTEM,
  ...expand(SOCIAL_CHAT),
  ...expand(GOOGLE),
  ...expand(GAMES),
  ...expand(MEDIA),
  ...expand(TOOLS_BROWSERS),
  ...expand(SHOP_MONEY_MAP),
  ...expand(MORE),
]);

export const CATALOG_BY_ID: Record<string, CatalogApp> = Object.fromEntries(
  CATALOG.map((a) => [a.id, a]),
);

export function findByIdOrName(target: string): CatalogApp | undefined {
  const lower = target.trim().toLowerCase();
  return (
    CATALOG_BY_ID[lower] ??
    CATALOG.find(
      (a) =>
        a.id === lower ||
        a.name.toLowerCase() === lower ||
        a.aliases.some((al) => al.toLowerCase() === lower) ||
        a.androidPackage === target.trim(),
    )
  );
}

export const CATEGORIES: Category[] = [
  "system",
  "chat",
  "social",
  "game",
  "video",
  "music",
  "map",
  "shop",
  "money",
  "tool",
  "browser",
  "google",
];
