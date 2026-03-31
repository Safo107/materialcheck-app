// i18n.ts - ElektroGenius Übersetzungssystem
// Sprachen: DE, EN, TR, AR, PL, RU, FR

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type Language = "de" | "en" | "tr" | "ar" | "pl" | "ru" | "fr";

export const LANGUAGES: { code: Language; name: string; flag: string; rtl: boolean }[] = [
  { code: "de", name: "Deutsch", flag: "🇩🇪", rtl: false },
  { code: "en", name: "English", flag: "🇬🇧", rtl: false },
  { code: "tr", name: "Türkçe", flag: "🇹🇷", rtl: false },
  { code: "ar", name: "العربية", flag: "🇸🇦", rtl: true },
  { code: "pl", name: "Polski", flag: "🇵🇱", rtl: false },
  { code: "ru", name: "Русский", flag: "🇷🇺", rtl: false },
  { code: "fr", name: "Français", flag: "🇫🇷", rtl: false },
];

export interface Translations {
  // App
  appName: string; tagline: string;
  // Navigation
  navOverview: string; navKI: string; navStats: string; navProfile: string;
  // Home
  myFolders: string; addFolder: string; lowEmpty: string; allOk: string;
  searchPlaceholder: string; results: string; noResults: string;
  // Folder
  materials: string; material: string; stock: string; addMaterial: string;
  renameFolder: string; deleteFolder: string; openFolder: string;
  folderContains: string; folderDeleteConfirm: string;
  // Material
  category: string; folder: string; minStock: string; status: string;
  price: string; value: string; note: string; added: string;
  edit: string; delete: string; move: string; setAmount: string;
  name: string; unit: string; minStockAlarm: string; pricePerUnit: string;
  // Status
  statusOk: string; statusLow: string; statusOut: string;
  // Stats
  overview: string; folders: string; activity: string;
  totalMaterials: string; totalValue: string; lowStock: string; outOfStock: string;
  stockOverview: string; byCategory: string; exportShare: string;
  export: string; shareApp: string; website: string;
  lastActivities: string; entries: string; reorder: string; urgent: string;
  // Profile
  profile: string; editProfile: string; syncCloud: string;
  loadProfile: string; loadProfileDesc: string;
  firmName: string; yourName: string; email: string; logo: string;
  tapLogo: string; removeLogo: string; saveSync: string;
  save: string; cancel: string; cloudSynced: string;
  syncingCloud: string; localOnly: string;
  searchLoad: string; noProfileFound: string; noConnection: string;
  savedAt: string; noProfileYet: string; tapToStart: string;
  language: string; selectLanguage: string;
  // KI
  kiTitle: string; kiSub: string; kiWelcome: string;
  askQuestion: string; offline: string; clearChat: string;
  // Forms
  required: string; enterName: string; eg: string;
  // Folder Modal
  createFolder: string; renameFolder2: string; chooseName: string; chooseIcon: string; create: string;
  // Actions
  whatToDo: string; moveMaterial: string; deleteConfirm: string; yes: string; no: string;
  // Units
  piece: string; meter: string; package: string; roll: string; kg: string; liter: string;
  // Categories
  cable: string; fuse: string; socket: string; switch: string;
  distributor: string; line: string; tool: string; other: string;
  // Shopping
  shoppingTitle: string; shoppingAll: string; shoppingEmpty: string; shoppingLow: string;
  shoppingOrder: string; shoppingDone: string; shoppingAllOk: string; shoppingAllOkSub: string;
  shoppingTotal: string; shoppingEstCost: string; shoppingWhatsapp: string; shoppingPdf: string;
  shoppingAllChecked: string; shoppingStock: string; shoppingOrder2: string;
  // Scanner
  scannerTitle: string; scannerHint: string; scannerFound: string; scannerNotFound: string;
  scannerAdd: string; scannerRescan: string; scannerRetry: string;
  scannerAddQty: string; scannerRemoveQty: string; scannerQty: string;
  scannerPermTitle: string; scannerPermText: string; scannerPermBtn: string;
  scannerBarcodeSaved: string; scannerBarcodeInfo: string;
  scannerNextScan: string; scannerDone: string; scannerAdded: string;
}

// ─── DEUTSCH ────────────────────────────────────────────
const de: Translations = {
  appName: "MaterialCheck", tagline: "ElektroGenius",
  navOverview: "Übersicht", navKI: "KI-Chat", navStats: "Statistik", navProfile: "Profil",
  myFolders: "Meine Ordner", addFolder: "+ Ordner", lowEmpty: "Niedrig / Leer", allOk: "Alle Bestände in Ordnung!",
  searchPlaceholder: "In allen Ordnern suchen...", results: "Ergebnis", noResults: "Nichts gefunden für",
  materials: "Materialien", material: "Material", stock: "Bestand", addMaterial: "+ Material",
  renameFolder: "✏️ Umbenennen", deleteFolder: "🗑️ Löschen", openFolder: "📂 Öffnen",
  folderContains: "enthält", folderDeleteConfirm: "Ordner löschen?",
  category: "Kategorie", folder: "Ordner", minStock: "Mindestbestand", status: "Status",
  price: "Preis/Einheit", value: "Lagerwert", note: "Notiz", added: "Hinzugefügt",
  edit: "✏️ Bearbeiten", delete: "🗑️", move: "Verschieben", setAmount: "Setzen",
  name: "Name", unit: "Einheit", minStockAlarm: "Min. Bestand (Alarm)", pricePerUnit: "Preis/Einheit €",
  statusOk: "OK", statusLow: "Niedrig", statusOut: "Leer",
  overview: "Übersicht", folders: "Ordner", activity: "Aktivität",
  totalMaterials: "Materialarten", totalValue: "Lagerwert", lowStock: "Niedrig", outOfStock: "Leer",
  stockOverview: "Bestandsübersicht", byCategory: "Nach Kategorie", exportShare: "Export & Teilen",
  export: "📤 Exportieren", shareApp: "🔗 App teilen", website: "🌐 Website",
  lastActivities: "Letzte Aktivitäten", entries: "Einträge", reorder: "Nachbestellen", urgent: "Dringend",
  profile: "Profil", editProfile: "Profil bearbeiten", syncCloud: "Mit Cloud synchronisieren",
  loadProfile: "📲 Profil auf diesem Gerät laden", loadProfileDesc: "Gib deine E-Mail ein um dein Profil zu laden.",
  firmName: "Firmenname", yourName: "Dein Name", email: "E-Mail", logo: "Logo",
  tapLogo: "Logo tippen", removeLogo: "Logo entfernen", saveSync: "💾 Speichern & Synchronisieren",
  save: "Speichern", cancel: "Abbrechen", cloudSynced: "✅ Cloud synchronisiert!",
  syncingCloud: "Wird synchronisiert...", localOnly: "Nur lokal gespeichert",
  searchLoad: "🔍 Profil suchen & laden", noProfileFound: "Kein Profil für diese E-Mail gefunden",
  noConnection: "Keine Verbindung zum Server", savedAt: "Gespeichert:", noProfileYet: "Noch kein Profil",
  tapToStart: "Tippe auf Bearbeiten um zu starten", language: "Sprache", selectLanguage: "Sprache wählen",
  kiTitle: "KI-Assistent", kiSub: "Elektrotechnik & Materialberatung",
  kiWelcome: "Hallo! Ich bin dein ElektroGenius KI-Assistent. 👋\n\nIch helfe dir bei Elektrotechnik, Materialberatung und Fehlerdiagnose.",
  askQuestion: "Frage stellen...", offline: "📵 Offline-Antwort", clearChat: "Chat leeren",
  required: "Pflichtfeld", enterName: "Bitte Name eingeben", eg: "z.B.",
  createFolder: "Ordner erstellen", renameFolder2: "Ordner umbenennen", chooseName: "z.B. Wagen 1, Firmen Lager...",
  chooseIcon: "Icon wählen", create: "Erstellen",
  whatToDo: "Was möchtest du tun?", moveMaterial: "Material verschieben", deleteConfirm: "wirklich löschen?", yes: "Ja", no: "Nein",
  piece: "Stk", meter: "m", package: "Pkg", roll: "Rolle", kg: "kg", liter: "Liter",
  cable: "🔌 Kabel", fuse: "⚡ Sicherung", socket: "🔋 Steckdose", switch: "💡 Schalter",
  distributor: "🗄️ Verteiler", line: "〰️ Leitung", tool: "🔧 Werkzeug", other: "📦 Sonstiges",
  shoppingTitle: "Einkaufsliste", shoppingAll: "Alle", shoppingEmpty: "🚨 Leer", shoppingLow: "⚠️ Niedrig",
  shoppingOrder: "Zum Bestellen", shoppingDone: "✅ Erledigt", shoppingAllOk: "Alles in Ordnung!",
  shoppingAllOkSub: "Kein Material unter dem Mindestbestand.", shoppingTotal: "Gesamt",
  shoppingEstCost: "~Kosten", shoppingWhatsapp: "WhatsApp", shoppingPdf: "PDF Export",
  shoppingAllChecked: "Alle Artikel bereits abgehakt!", shoppingStock: "Bestand", shoppingOrder2: "Bestellen",
  scannerTitle: "Barcode Scanner", scannerHint: "EAN / UPC Barcode scannen",
  scannerFound: "Material gefunden!", scannerNotFound: "Nicht gefunden",
  scannerAdd: "Neu hinzufügen", scannerRescan: "🔄 Nächsten scannen", scannerRetry: "🔄 Nochmal scannen",
  scannerAddQty: "➕ Menge erhöhen", scannerRemoveQty: "➖ Menge reduzieren", scannerQty: "Anzahl",
  scannerPermTitle: "Kamera-Berechtigung", scannerPermText: "Der Barcode Scanner braucht Zugriff auf deine Kamera.",
  scannerPermBtn: "Berechtigung erlauben", scannerBarcodeSaved: "Barcode gespeichert",
  scannerBarcodeInfo: "Barcode wird automatisch gespeichert für zukünftiges Scannen.",
  scannerNextScan: "Weiterscannen", scannerDone: "Fertig", scannerAdded: "wurde zu deinem Lager hinzugefügt.",
};

// ─── ENGLISCH ────────────────────────────────────────────
const en: Translations = {
  appName: "MaterialCheck", tagline: "ElektroGenius",
  navOverview: "Overview", navKI: "AI Chat", navStats: "Statistics", navProfile: "Profile",
  myFolders: "My Folders", addFolder: "+ Folder", lowEmpty: "Low / Empty", allOk: "All stocks are fine!",
  searchPlaceholder: "Search all folders...", results: "Result", noResults: "Nothing found for",
  materials: "Materials", material: "Material", stock: "Stock", addMaterial: "+ Material",
  renameFolder: "✏️ Rename", deleteFolder: "🗑️ Delete", openFolder: "📂 Open",
  folderContains: "contains", folderDeleteConfirm: "Delete folder?",
  category: "Category", folder: "Folder", minStock: "Min. Stock", status: "Status",
  price: "Price/Unit", value: "Stock Value", note: "Note", added: "Added",
  edit: "✏️ Edit", delete: "🗑️", move: "Move", setAmount: "Set",
  name: "Name", unit: "Unit", minStockAlarm: "Min. Stock (Alert)", pricePerUnit: "Price/Unit €",
  statusOk: "OK", statusLow: "Low", statusOut: "Empty",
  overview: "Overview", folders: "Folders", activity: "Activity",
  totalMaterials: "Material Types", totalValue: "Stock Value", lowStock: "Low", outOfStock: "Empty",
  stockOverview: "Stock Overview", byCategory: "By Category", exportShare: "Export & Share",
  export: "📤 Export", shareApp: "🔗 Share App", website: "🌐 Website",
  lastActivities: "Recent Activities", entries: "Entries", reorder: "Reorder", urgent: "Urgent",
  profile: "Profile", editProfile: "Edit Profile", syncCloud: "Sync with Cloud",
  loadProfile: "📲 Load Profile on this Device", loadProfileDesc: "Enter your email to load your profile.",
  firmName: "Company Name", yourName: "Your Name", email: "Email", logo: "Logo",
  tapLogo: "Tap for Logo", removeLogo: "Remove Logo", saveSync: "💾 Save & Sync",
  save: "Save", cancel: "Cancel", cloudSynced: "✅ Cloud synced!",
  syncingCloud: "Syncing...", localOnly: "Saved locally only",
  searchLoad: "🔍 Search & Load Profile", noProfileFound: "No profile found for this email",
  noConnection: "No server connection", savedAt: "Saved:", noProfileYet: "No profile yet",
  tapToStart: "Tap Edit to get started", language: "Language", selectLanguage: "Select Language",
  kiTitle: "AI Assistant", kiSub: "Electrical Engineering & Material Advice",
  kiWelcome: "Hello! I'm your ElektroGenius AI Assistant. 👋\n\nI help with electrical engineering, material advice and troubleshooting.",
  askQuestion: "Ask a question...", offline: "📵 Offline answer", clearChat: "Clear chat",
  required: "Required", enterName: "Please enter a name", eg: "e.g.",
  createFolder: "Create Folder", renameFolder2: "Rename Folder", chooseName: "e.g. Van 1, Main Warehouse...",
  chooseIcon: "Choose Icon", create: "Create",
  whatToDo: "What would you like to do?", moveMaterial: "Move Material", deleteConfirm: "really delete?", yes: "Yes", no: "No",
  piece: "pcs", meter: "m", package: "pkg", roll: "roll", kg: "kg", liter: "liter",
  cable: "🔌 Cable", fuse: "⚡ Fuse", socket: "🔋 Socket", switch: "💡 Switch",
  distributor: "🗄️ Distributor", line: "〰️ Line", tool: "🔧 Tool", other: "📦 Other",
  shoppingTitle: "Shopping List", shoppingAll: "All", shoppingEmpty: "🚨 Empty", shoppingLow: "⚠️ Low",
  shoppingOrder: "To Order", shoppingDone: "✅ Done", shoppingAllOk: "Everything is fine!",
  shoppingAllOkSub: "No material below minimum stock.", shoppingTotal: "Total",
  shoppingEstCost: "~Cost", shoppingWhatsapp: "WhatsApp", shoppingPdf: "PDF Export",
  shoppingAllChecked: "All items already checked off!", shoppingStock: "Stock", shoppingOrder2: "Order",
  scannerTitle: "Barcode Scanner", scannerHint: "Scan EAN / UPC Barcode",
  scannerFound: "Material found!", scannerNotFound: "Not found",
  scannerAdd: "Add new", scannerRescan: "🔄 Scan next", scannerRetry: "🔄 Scan again",
  scannerAddQty: "➕ Increase quantity", scannerRemoveQty: "➖ Decrease quantity", scannerQty: "Quantity",
  scannerPermTitle: "Camera Permission", scannerPermText: "The barcode scanner needs access to your camera.",
  scannerPermBtn: "Allow Permission", scannerBarcodeSaved: "Barcode saved",
  scannerBarcodeInfo: "Barcode will be saved automatically for future scanning.",
  scannerNextScan: "Scan more", scannerDone: "Done", scannerAdded: "has been added to your inventory.",
};

// ─── TÜRKISCH ────────────────────────────────────────────
const tr: Translations = {
  appName: "MaterialCheck", tagline: "ElektroGenius",
  navOverview: "Genel Bakış", navKI: "YZ Sohbet", navStats: "İstatistik", navProfile: "Profil",
  myFolders: "Klasörlerim", addFolder: "+ Klasör", lowEmpty: "Az / Boş", allOk: "Tüm stoklar yeterli!",
  searchPlaceholder: "Tüm klasörlerde ara...", results: "Sonuç", noResults: "Bulunamadı:",
  materials: "Malzemeler", material: "Malzeme", stock: "Stok", addMaterial: "+ Malzeme",
  renameFolder: "✏️ Yeniden Adlandır", deleteFolder: "🗑️ Sil", openFolder: "📂 Aç",
  folderContains: "içeriyor", folderDeleteConfirm: "Klasör silinsin mi?",
  category: "Kategori", folder: "Klasör", minStock: "Min. Stok", status: "Durum",
  price: "Birim Fiyat", value: "Stok Değeri", note: "Not", added: "Eklendi",
  edit: "✏️ Düzenle", delete: "🗑️", move: "Taşı", setAmount: "Ayarla",
  name: "Ad", unit: "Birim", minStockAlarm: "Min. Stok (Alarm)", pricePerUnit: "Fiyat/Birim €",
  statusOk: "Tamam", statusLow: "Az", statusOut: "Boş",
  overview: "Genel Bakış", folders: "Klasörler", activity: "Aktivite",
  totalMaterials: "Malzeme Türleri", totalValue: "Stok Değeri", lowStock: "Az", outOfStock: "Boş",
  stockOverview: "Stok Genel Bakışı", byCategory: "Kategoriye Göre", exportShare: "Dışa Aktar & Paylaş",
  export: "📤 Dışa Aktar", shareApp: "🔗 Uygulamayı Paylaş", website: "🌐 Web Sitesi",
  lastActivities: "Son Aktiviteler", entries: "Kayıt", reorder: "Sipariş Ver", urgent: "Acil",
  profile: "Profil", editProfile: "Profili Düzenle", syncCloud: "Bulutla Senkronize Et",
  loadProfile: "📲 Bu Cihaza Profil Yükle", loadProfileDesc: "Profilinizi yüklemek için e-postanızı girin.",
  firmName: "Şirket Adı", yourName: "Adınız", email: "E-posta", logo: "Logo",
  tapLogo: "Logo için dokun", removeLogo: "Logoyu Kaldır", saveSync: "💾 Kaydet & Senkronize Et",
  save: "Kaydet", cancel: "İptal", cloudSynced: "✅ Bulut senkronize edildi!",
  syncingCloud: "Senkronize ediliyor...", localOnly: "Yalnızca yerel olarak kaydedildi",
  searchLoad: "🔍 Profil Ara & Yükle", noProfileFound: "Bu e-posta için profil bulunamadı",
  noConnection: "Sunucuya bağlanılamadı", savedAt: "Kaydedildi:", noProfileYet: "Henüz profil yok",
  tapToStart: "Başlamak için Düzenle'ye dokun", language: "Dil", selectLanguage: "Dil Seç",
  kiTitle: "YZ Asistan", kiSub: "Elektrik Mühendisliği & Malzeme Danışmanlığı",
  kiWelcome: "Merhaba! Ben ElektroGenius YZ Asistanınım. 👋\n\nElektrik, malzeme danışmanlığı ve arıza tespitinde yardımcı oluyorum.",
  askQuestion: "Soru sor...", offline: "📵 Çevrimdışı cevap", clearChat: "Sohbeti Temizle",
  required: "Zorunlu", enterName: "Lütfen ad girin", eg: "örn.",
  createFolder: "Klasör Oluştur", renameFolder2: "Klasörü Yeniden Adlandır", chooseName: "örn. Araç 1, Ana Depo...",
  chooseIcon: "Simge Seç", create: "Oluştur",
  whatToDo: "Ne yapmak istersiniz?", moveMaterial: "Malzemeyi Taşı", deleteConfirm: "gerçekten silinsin mi?", yes: "Evet", no: "Hayır",
  piece: "adet", meter: "m", package: "pkg", roll: "rulo", kg: "kg", liter: "litre",
  cable: "🔌 Kablo", fuse: "⚡ Sigorta", socket: "🔋 Priz", switch: "💡 Anahtar",
  distributor: "🗄️ Dağıtıcı", line: "〰️ Hat", tool: "🔧 Alet", other: "📦 Diğer",
  shoppingTitle: "Alışveriş Listesi", shoppingAll: "Tümü", shoppingEmpty: "🚨 Boş", shoppingLow: "⚠️ Az",
  shoppingOrder: "Sipariş Verilecek", shoppingDone: "✅ Tamamlandı", shoppingAllOk: "Her şey yolunda!",
  shoppingAllOkSub: "Minimum stokun altında malzeme yok.", shoppingTotal: "Toplam",
  shoppingEstCost: "~Maliyet", shoppingWhatsapp: "WhatsApp", shoppingPdf: "PDF İndir",
  shoppingAllChecked: "Tüm ürünler işaretlendi!", shoppingStock: "Stok", shoppingOrder2: "Sipariş",
  scannerTitle: "Barkod Tarayıcı", scannerHint: "EAN / UPC Barkod Tara",
  scannerFound: "Malzeme bulundu!", scannerNotFound: "Bulunamadı",
  scannerAdd: "Yeni ekle", scannerRescan: "🔄 Sonrakini tara", scannerRetry: "🔄 Tekrar tara",
  scannerAddQty: "➕ Miktarı artır", scannerRemoveQty: "➖ Miktarı azalt", scannerQty: "Adet",
  scannerPermTitle: "Kamera İzni", scannerPermText: "Barkod tarayıcı kameranıza erişim gerektirir.",
  scannerPermBtn: "İzin Ver", scannerBarcodeSaved: "Barkod kaydedildi",
  scannerBarcodeInfo: "Barkod gelecekteki taramalar için otomatik kaydedilecek.",
  scannerNextScan: "Devam et", scannerDone: "Bitti", scannerAdded: "envanterine eklendi.",
};

// ─── ARABISCH ────────────────────────────────────────────
const ar: Translations = {
  appName: "MaterialCheck", tagline: "ElektroGenius",
  navOverview: "نظرة عامة", navKI: "محادثة AI", navStats: "إحصائيات", navProfile: "الملف الشخصي",
  myFolders: "مجلداتي", addFolder: "+ مجلد", lowEmpty: "منخفض / فارغ", allOk: "جميع المخزون كافٍ!",
  searchPlaceholder: "البحث في جميع المجلدات...", results: "نتيجة", noResults: "لم يتم العثور على",
  materials: "المواد", material: "مادة", stock: "المخزون", addMaterial: "+ مادة",
  renameFolder: "✏️ إعادة تسمية", deleteFolder: "🗑️ حذف", openFolder: "📂 فتح",
  folderContains: "يحتوي على", folderDeleteConfirm: "حذف المجلد؟",
  category: "الفئة", folder: "المجلد", minStock: "الحد الأدنى", status: "الحالة",
  price: "السعر/الوحدة", value: "قيمة المخزون", note: "ملاحظة", added: "تم الإضافة",
  edit: "✏️ تعديل", delete: "🗑️", move: "نقل", setAmount: "تعيين",
  name: "الاسم", unit: "الوحدة", minStockAlarm: "الحد الأدنى (تنبيه)", pricePerUnit: "السعر/الوحدة €",
  statusOk: "جيد", statusLow: "منخفض", statusOut: "فارغ",
  overview: "نظرة عامة", folders: "المجلدات", activity: "النشاط",
  totalMaterials: "أنواع المواد", totalValue: "قيمة المخزون", lowStock: "منخفض", outOfStock: "فارغ",
  stockOverview: "نظرة عامة على المخزون", byCategory: "حسب الفئة", exportShare: "تصدير ومشاركة",
  export: "📤 تصدير", shareApp: "🔗 مشاركة التطبيق", website: "🌐 الموقع",
  lastActivities: "الأنشطة الأخيرة", entries: "إدخالات", reorder: "إعادة الطلب", urgent: "عاجل",
  profile: "الملف الشخصي", editProfile: "تعديل الملف", syncCloud: "مزامنة مع السحابة",
  loadProfile: "📲 تحميل الملف على هذا الجهاز", loadProfileDesc: "أدخل بريدك الإلكتروني لتحميل ملفك.",
  firmName: "اسم الشركة", yourName: "اسمك", email: "البريد الإلكتروني", logo: "الشعار",
  tapLogo: "اضغط للشعار", removeLogo: "إزالة الشعار", saveSync: "💾 حفظ ومزامنة",
  save: "حفظ", cancel: "إلغاء", cloudSynced: "✅ تمت المزامنة!",
  syncingCloud: "جارٍ المزامنة...", localOnly: "محفوظ محلياً فقط",
  searchLoad: "🔍 بحث وتحميل الملف", noProfileFound: "لم يتم العثور على ملف",
  noConnection: "لا يوجد اتصال بالخادم", savedAt: "تم الحفظ:", noProfileYet: "لا يوجد ملف بعد",
  tapToStart: "اضغط تعديل للبدء", language: "اللغة", selectLanguage: "اختر اللغة",
  kiTitle: "مساعد الذكاء الاصطناعي", kiSub: "الهندسة الكهربائية واستشارات المواد",
  kiWelcome: "مرحباً! أنا مساعد ElektroGenius. 👋\n\nأساعدك في الهندسة الكهربائية واستشارات المواد.",
  askQuestion: "اطرح سؤالاً...", offline: "📵 إجابة غير متصلة", clearChat: "مسح المحادثة",
  required: "مطلوب", enterName: "الرجاء إدخال اسم", eg: "مثال:",
  createFolder: "إنشاء مجلد", renameFolder2: "إعادة تسمية المجلد", chooseName: "مثال: مركبة 1...",
  chooseIcon: "اختر أيقونة", create: "إنشاء",
  whatToDo: "ماذا تريد أن تفعل؟", moveMaterial: "نقل المادة", deleteConfirm: "هل تريد الحذف؟", yes: "نعم", no: "لا",
  piece: "قطعة", meter: "م", package: "علبة", roll: "لفة", kg: "كجم", liter: "لتر",
  cable: "🔌 كابل", fuse: "⚡ منصهر", socket: "🔋 مقبس", switch: "💡 مفتاح",
  distributor: "🗄️ موزع", line: "〰️ خط", tool: "🔧 أداة", other: "📦 أخرى",
  shoppingTitle: "قائمة التسوق", shoppingAll: "الكل", shoppingEmpty: "🚨 فارغ", shoppingLow: "⚠️ منخفض",
  shoppingOrder: "للطلب", shoppingDone: "✅ تم", shoppingAllOk: "كل شيء على ما يرام!",
  shoppingAllOkSub: "لا توجد مواد أقل من الحد الأدنى.", shoppingTotal: "المجموع",
  shoppingEstCost: "~التكلفة", shoppingWhatsapp: "واتساب", shoppingPdf: "تصدير PDF",
  shoppingAllChecked: "جميع العناصر تم تحديدها!", shoppingStock: "المخزون", shoppingOrder2: "طلب",
  scannerTitle: "ماسح الباركود", scannerHint: "امسح باركود EAN / UPC",
  scannerFound: "تم العثور على المادة!", scannerNotFound: "غير موجود",
  scannerAdd: "إضافة جديد", scannerRescan: "🔄 مسح التالي", scannerRetry: "🔄 مسح مجدداً",
  scannerAddQty: "➕ زيادة الكمية", scannerRemoveQty: "➖ تقليل الكمية", scannerQty: "الكمية",
  scannerPermTitle: "إذن الكاميرا", scannerPermText: "يحتاج الماسح إلى الوصول إلى الكاميرا.",
  scannerPermBtn: "السماح", scannerBarcodeSaved: "تم حفظ الباركود",
  scannerBarcodeInfo: "سيتم حفظ الباركود تلقائياً للمسح المستقبلي.",
  scannerNextScan: "استمرار", scannerDone: "تم", scannerAdded: "تمت إضافته إلى مخزونك.",
};

// ─── POLNISCH ────────────────────────────────────────────
const pl: Translations = {
  appName: "MaterialCheck", tagline: "ElektroGenius",
  navOverview: "Przegląd", navKI: "Chat AI", navStats: "Statystyki", navProfile: "Profil",
  myFolders: "Moje Foldery", addFolder: "+ Folder", lowEmpty: "Niski / Pusty", allOk: "Wszystkie stany wystarczające!",
  searchPlaceholder: "Szukaj we wszystkich folderach...", results: "Wynik", noResults: "Nie znaleziono dla",
  materials: "Materiały", material: "Materiał", stock: "Stan", addMaterial: "+ Materiał",
  renameFolder: "✏️ Zmień nazwę", deleteFolder: "🗑️ Usuń", openFolder: "📂 Otwórz",
  folderContains: "zawiera", folderDeleteConfirm: "Usunąć folder?",
  category: "Kategoria", folder: "Folder", minStock: "Min. Stan", status: "Status",
  price: "Cena/Jedn.", value: "Wartość", note: "Uwaga", added: "Dodano",
  edit: "✏️ Edytuj", delete: "🗑️", move: "Przenieś", setAmount: "Ustaw",
  name: "Nazwa", unit: "Jednostka", minStockAlarm: "Min. Stan (Alert)", pricePerUnit: "Cena/Jedn. €",
  statusOk: "OK", statusLow: "Niski", statusOut: "Pusty",
  overview: "Przegląd", folders: "Foldery", activity: "Aktywność",
  totalMaterials: "Typy Materiałów", totalValue: "Wartość", lowStock: "Niski", outOfStock: "Pusty",
  stockOverview: "Przegląd Stanu", byCategory: "Według Kategorii", exportShare: "Eksport i Udostępnianie",
  export: "📤 Eksportuj", shareApp: "🔗 Udostępnij", website: "🌐 Strona",
  lastActivities: "Ostatnie Aktywności", entries: "Wpisy", reorder: "Zamów", urgent: "Pilne",
  profile: "Profil", editProfile: "Edytuj Profil", syncCloud: "Synchronizuj z Chmurą",
  loadProfile: "📲 Załaduj Profil", loadProfileDesc: "Podaj e-mail aby załadować profil.",
  firmName: "Nazwa Firmy", yourName: "Twoje Imię", email: "E-mail", logo: "Logo",
  tapLogo: "Dotknij dla Logo", removeLogo: "Usuń Logo", saveSync: "💾 Zapisz i Synchronizuj",
  save: "Zapisz", cancel: "Anuluj", cloudSynced: "✅ Zsynchronizowano!",
  syncingCloud: "Synchronizowanie...", localOnly: "Zapisano tylko lokalnie",
  searchLoad: "🔍 Szukaj i Załaduj", noProfileFound: "Nie znaleziono profilu",
  noConnection: "Brak połączenia", savedAt: "Zapisano:", noProfileYet: "Brak profilu",
  tapToStart: "Dotknij Edytuj aby rozpocząć", language: "Język", selectLanguage: "Wybierz Język",
  kiTitle: "Asystent AI", kiSub: "Elektrotechnika i Doradztwo",
  kiWelcome: "Cześć! Jestem Asystentem AI ElektroGenius. 👋\n\nPomagam w elektrotechnice i doradztwie materiałowym.",
  askQuestion: "Zadaj pytanie...", offline: "📵 Odpowiedź offline", clearChat: "Wyczyść czat",
  required: "Wymagane", enterName: "Proszę podać nazwę", eg: "np.",
  createFolder: "Utwórz Folder", renameFolder2: "Zmień Nazwę", chooseName: "np. Samochód 1...",
  chooseIcon: "Wybierz Ikonę", create: "Utwórz",
  whatToDo: "Co chcesz zrobić?", moveMaterial: "Przenieś Materiał", deleteConfirm: "naprawdę usunąć?", yes: "Tak", no: "Nie",
  piece: "szt", meter: "m", package: "op", roll: "rol", kg: "kg", liter: "litr",
  cable: "🔌 Kabel", fuse: "⚡ Bezpiecznik", socket: "🔋 Gniazdo", switch: "💡 Przełącznik",
  distributor: "🗄️ Rozdzielnia", line: "〰️ Przewód", tool: "🔧 Narzędzie", other: "📦 Inne",
  shoppingTitle: "Lista Zakupów", shoppingAll: "Wszystkie", shoppingEmpty: "🚨 Puste", shoppingLow: "⚠️ Niskie",
  shoppingOrder: "Do Zamówienia", shoppingDone: "✅ Gotowe", shoppingAllOk: "Wszystko w porządku!",
  shoppingAllOkSub: "Brak materiałów poniżej minimum.", shoppingTotal: "Łącznie",
  shoppingEstCost: "~Koszt", shoppingWhatsapp: "WhatsApp", shoppingPdf: "Eksport PDF",
  shoppingAllChecked: "Wszystkie pozycje odznaczone!", shoppingStock: "Stan", shoppingOrder2: "Zamów",
  scannerTitle: "Skaner Kodów", scannerHint: "Skanuj kod EAN / UPC",
  scannerFound: "Znaleziono materiał!", scannerNotFound: "Nie znaleziono",
  scannerAdd: "Dodaj nowy", scannerRescan: "🔄 Skanuj następny", scannerRetry: "🔄 Skanuj ponownie",
  scannerAddQty: "➕ Zwiększ ilość", scannerRemoveQty: "➖ Zmniejsz ilość", scannerQty: "Ilość",
  scannerPermTitle: "Uprawnienia Kamery", scannerPermText: "Skaner wymaga dostępu do kamery.",
  scannerPermBtn: "Zezwól", scannerBarcodeSaved: "Kod zapisany",
  scannerBarcodeInfo: "Kod zostanie automatycznie zapisany do przyszłego skanowania.",
  scannerNextScan: "Skanuj więcej", scannerDone: "Gotowe", scannerAdded: "został dodany do magazynu.",
};

// ─── RUSSISCH ────────────────────────────────────────────
const ru: Translations = {
  appName: "MaterialCheck", tagline: "ElektroGenius",
  navOverview: "Обзор", navKI: "ИИ Чат", navStats: "Статистика", navProfile: "Профиль",
  myFolders: "Мои Папки", addFolder: "+ Папка", lowEmpty: "Мало / Пусто", allOk: "Все запасы в норме!",
  searchPlaceholder: "Поиск во всех папках...", results: "Результат", noResults: "Ничего не найдено для",
  materials: "Материалы", material: "Материал", stock: "Запас", addMaterial: "+ Материал",
  renameFolder: "✏️ Переименовать", deleteFolder: "🗑️ Удалить", openFolder: "📂 Открыть",
  folderContains: "содержит", folderDeleteConfirm: "Удалить папку?",
  category: "Категория", folder: "Папка", minStock: "Мин. Запас", status: "Статус",
  price: "Цена/Ед.", value: "Стоимость", note: "Примечание", added: "Добавлено",
  edit: "✏️ Редактировать", delete: "🗑️", move: "Переместить", setAmount: "Установить",
  name: "Название", unit: "Единица", minStockAlarm: "Мин. Запас (Сигнал)", pricePerUnit: "Цена/Ед. €",
  statusOk: "ОК", statusLow: "Мало", statusOut: "Пусто",
  overview: "Обзор", folders: "Папки", activity: "Активность",
  totalMaterials: "Виды Материалов", totalValue: "Стоимость", lowStock: "Мало", outOfStock: "Пусто",
  stockOverview: "Обзор Запасов", byCategory: "По Категориям", exportShare: "Экспорт и Поделиться",
  export: "📤 Экспортировать", shareApp: "🔗 Поделиться", website: "🌐 Сайт",
  lastActivities: "Последние Действия", entries: "Записи", reorder: "Дозаказать", urgent: "Срочно",
  profile: "Профиль", editProfile: "Редактировать Профиль", syncCloud: "Синхронизировать с Облаком",
  loadProfile: "📲 Загрузить Профиль", loadProfileDesc: "Введите email для загрузки профиля.",
  firmName: "Название Компании", yourName: "Ваше Имя", email: "Email", logo: "Логотип",
  tapLogo: "Нажмите для Логотипа", removeLogo: "Удалить Логотип", saveSync: "💾 Сохранить и Синхронизировать",
  save: "Сохранить", cancel: "Отмена", cloudSynced: "✅ Синхронизировано!",
  syncingCloud: "Синхронизация...", localOnly: "Сохранено только локально",
  searchLoad: "🔍 Найти и Загрузить", noProfileFound: "Профиль не найден",
  noConnection: "Нет подключения", savedAt: "Сохранено:", noProfileYet: "Профиль отсутствует",
  tapToStart: "Нажмите Редактировать", language: "Язык", selectLanguage: "Выбрать Язык",
  kiTitle: "ИИ Ассистент", kiSub: "Электротехника и Консультации",
  kiWelcome: "Привет! Я ИИ Ассистент ElektroGenius. 👋\n\nПомогаю с электротехникой и подбором материалов.",
  askQuestion: "Задать вопрос...", offline: "📵 Ответ офлайн", clearChat: "Очистить чат",
  required: "Обязательно", enterName: "Введите название", eg: "напр.",
  createFolder: "Создать Папку", renameFolder2: "Переименовать Папку", chooseName: "напр. Машина 1...",
  chooseIcon: "Выбрать Иконку", create: "Создать",
  whatToDo: "Что вы хотите сделать?", moveMaterial: "Переместить Материал", deleteConfirm: "удалить?", yes: "Да", no: "Нет",
  piece: "шт", meter: "м", package: "уп", roll: "рул", kg: "кг", liter: "л",
  cable: "🔌 Кабель", fuse: "⚡ Предохранитель", socket: "🔋 Розетка", switch: "💡 Выключатель",
  distributor: "🗄️ Распределитель", line: "〰️ Провод", tool: "🔧 Инструмент", other: "📦 Прочее",
  shoppingTitle: "Список Покупок", shoppingAll: "Все", shoppingEmpty: "🚨 Пусто", shoppingLow: "⚠️ Мало",
  shoppingOrder: "К Заказу", shoppingDone: "✅ Выполнено", shoppingAllOk: "Всё в порядке!",
  shoppingAllOkSub: "Нет материалов ниже минимума.", shoppingTotal: "Итого",
  shoppingEstCost: "~Стоимость", shoppingWhatsapp: "WhatsApp", shoppingPdf: "Экспорт PDF",
  shoppingAllChecked: "Все позиции отмечены!", shoppingStock: "Запас", shoppingOrder2: "Заказать",
  scannerTitle: "Сканер Штрихкодов", scannerHint: "Сканировать EAN / UPC",
  scannerFound: "Материал найден!", scannerNotFound: "Не найдено",
  scannerAdd: "Добавить новый", scannerRescan: "🔄 Следующий", scannerRetry: "🔄 Сканировать снова",
  scannerAddQty: "➕ Увеличить количество", scannerRemoveQty: "➖ Уменьшить количество", scannerQty: "Количество",
  scannerPermTitle: "Разрешение Камеры", scannerPermText: "Сканеру необходим доступ к камере.",
  scannerPermBtn: "Разрешить", scannerBarcodeSaved: "Штрихкод сохранён",
  scannerBarcodeInfo: "Штрихкод будет автоматически сохранён для будущего сканирования.",
  scannerNextScan: "Продолжить", scannerDone: "Готово", scannerAdded: "добавлен в ваш склад.",
};

// ─── FRANZÖSISCH ────────────────────────────────────────
const fr: Translations = {
  appName: "MaterialCheck", tagline: "ElektroGenius",
  navOverview: "Aperçu", navKI: "Chat IA", navStats: "Statistiques", navProfile: "Profil",
  myFolders: "Mes Dossiers", addFolder: "+ Dossier", lowEmpty: "Faible / Vide", allOk: "Tous les stocks sont suffisants!",
  searchPlaceholder: "Rechercher dans tous les dossiers...", results: "Résultat", noResults: "Rien trouvé pour",
  materials: "Matériaux", material: "Matériau", stock: "Stock", addMaterial: "+ Matériau",
  renameFolder: "✏️ Renommer", deleteFolder: "🗑️ Supprimer", openFolder: "📂 Ouvrir",
  folderContains: "contient", folderDeleteConfirm: "Supprimer le dossier?",
  category: "Catégorie", folder: "Dossier", minStock: "Stock Min.", status: "Statut",
  price: "Prix/Unité", value: "Valeur", note: "Note", added: "Ajouté",
  edit: "✏️ Modifier", delete: "🗑️", move: "Déplacer", setAmount: "Définir",
  name: "Nom", unit: "Unité", minStockAlarm: "Stock Min. (Alarme)", pricePerUnit: "Prix/Unité €",
  statusOk: "OK", statusLow: "Faible", statusOut: "Vide",
  overview: "Aperçu", folders: "Dossiers", activity: "Activité",
  totalMaterials: "Types de Matériaux", totalValue: "Valeur", lowStock: "Faible", outOfStock: "Vide",
  stockOverview: "Aperçu du Stock", byCategory: "Par Catégorie", exportShare: "Exporter et Partager",
  export: "📤 Exporter", shareApp: "🔗 Partager", website: "🌐 Site Web",
  lastActivities: "Activités Récentes", entries: "Entrées", reorder: "Commander", urgent: "Urgent",
  profile: "Profil", editProfile: "Modifier le Profil", syncCloud: "Synchroniser avec le Cloud",
  loadProfile: "📲 Charger le Profil", loadProfileDesc: "Entrez votre email pour charger votre profil.",
  firmName: "Nom de l'Entreprise", yourName: "Votre Nom", email: "E-mail", logo: "Logo",
  tapLogo: "Appuyez pour le Logo", removeLogo: "Supprimer le Logo", saveSync: "💾 Enregistrer et Synchroniser",
  save: "Enregistrer", cancel: "Annuler", cloudSynced: "✅ Cloud synchronisé!",
  syncingCloud: "Synchronisation...", localOnly: "Enregistré localement",
  searchLoad: "🔍 Rechercher et Charger", noProfileFound: "Aucun profil trouvé",
  noConnection: "Pas de connexion", savedAt: "Enregistré:", noProfileYet: "Pas encore de profil",
  tapToStart: "Appuyez sur Modifier", language: "Langue", selectLanguage: "Sélectionner la Langue",
  kiTitle: "Assistant IA", kiSub: "Électrotechnique et Conseil",
  kiWelcome: "Bonjour! Je suis votre Assistant IA ElektroGenius. 👋\n\nJe vous aide avec l'électrotechnique et les conseils en matériaux.",
  askQuestion: "Poser une question...", offline: "📵 Réponse hors ligne", clearChat: "Effacer le chat",
  required: "Obligatoire", enterName: "Veuillez entrer un nom", eg: "ex.",
  createFolder: "Créer un Dossier", renameFolder2: "Renommer le Dossier", chooseName: "ex. Véhicule 1...",
  chooseIcon: "Choisir une Icône", create: "Créer",
  whatToDo: "Que voulez-vous faire?", moveMaterial: "Déplacer le Matériau", deleteConfirm: "vraiment supprimer?", yes: "Oui", no: "Non",
  piece: "pcs", meter: "m", package: "pkg", roll: "roul", kg: "kg", liter: "litre",
  cable: "🔌 Câble", fuse: "⚡ Fusible", socket: "🔋 Prise", switch: "💡 Interrupteur",
  distributor: "🗄️ Distributeur", line: "〰️ Ligne", tool: "🔧 Outil", other: "📦 Autre",
  shoppingTitle: "Liste de Courses", shoppingAll: "Tout", shoppingEmpty: "🚨 Vide", shoppingLow: "⚠️ Faible",
  shoppingOrder: "À Commander", shoppingDone: "✅ Fait", shoppingAllOk: "Tout va bien!",
  shoppingAllOkSub: "Aucun matériau sous le stock minimum.", shoppingTotal: "Total",
  shoppingEstCost: "~Coût", shoppingWhatsapp: "WhatsApp", shoppingPdf: "Export PDF",
  shoppingAllChecked: "Tous les articles sont cochés!", shoppingStock: "Stock", shoppingOrder2: "Commander",
  scannerTitle: "Scanner Code-barres", scannerHint: "Scanner un code EAN / UPC",
  scannerFound: "Matériau trouvé!", scannerNotFound: "Non trouvé",
  scannerAdd: "Ajouter nouveau", scannerRescan: "🔄 Scanner suivant", scannerRetry: "🔄 Scanner à nouveau",
  scannerAddQty: "➕ Augmenter la quantité", scannerRemoveQty: "➖ Diminuer la quantité", scannerQty: "Quantité",
  scannerPermTitle: "Permission Caméra", scannerPermText: "Le scanner nécessite l'accès à votre caméra.",
  scannerPermBtn: "Autoriser", scannerBarcodeSaved: "Code-barres sauvegardé",
  scannerBarcodeInfo: "Le code-barres sera automatiquement sauvegardé pour les futurs scans.",
  scannerNextScan: "Continuer", scannerDone: "Terminé", scannerAdded: "a été ajouté à votre inventaire.",
};

const translations: Record<Language, Translations> = { de, en, tr, ar, pl, ru, fr };

export function t(lang: Language): Translations {
  return translations[lang] ?? translations.de;
}

const LANG_KEY = "eg-language";
interface LangStore { lang: Language; setLang: (l: Language) => Promise<void>; loadLang: () => Promise<void>; }

export const useLang = create<LangStore>((set) => ({
  lang: "de",
  setLang: async (l) => { set({ lang: l }); await AsyncStorage.setItem(LANG_KEY, l); },
  loadLang: async () => {
    try {
      const saved = await AsyncStorage.getItem(LANG_KEY) as Language | null;
      if (saved && translations[saved]) set({ lang: saved });
    } catch {}
  },
}));
