export const ACTION_DEFINITIONS = [
    { key: "create", label: "Yeni / Ekle", short: "Ekle" },
    { key: "save", label: "Kaydet", short: "Kaydet" },
    { key: "edit", label: "Düzenle", short: "Düzenle" },
    { key: "delete", label: "Sil", short: "Sil" },
    { key: "status", label: "Durum Değiştir", short: "Durum" },
    { key: "bulk", label: "Toplu İşlem", short: "Toplu" },
    { key: "upload", label: "Dosya Yükle", short: "Yükle" },
    { key: "export", label: "Excel / PDF / İndir", short: "Dışa Aktar" },
];

export const SCREEN_GROUPS = [
    {
        label: "Genel",
        screens: [
            { path: "/anasayfa", title: "Genel Bakış" },
        ],
    },
    {
        label: "Operasyon",
        screens: [
            { path: "/evrak-ekle", title: "Evrak Ekle" },
            { path: "/toplu-evraklar", title: "Tüm Evraklar" },
            { path: "/tahakkuk", title: "Tahakkuk" },
            { path: "/lokasyonlar", title: "Lokasyonlar" },
            { path: "/projeler", title: "Projeler" },
            { path: "/gorev-merkezi", title: "İş / Görev Merkezi" },
            { path: "/operasyon-takvimi", title: "Operasyon Takvimi" },
        ],
    },
    {
        label: "Kargo",
        screens: [
            { path: "/kargo-bilgisi-ekle", title: "Kargo Bilgisi Ekle" },
            { path: "/tum-kargo-bilgileri", title: "Tüm Kargolar" },
            { path: "/hedef-kargo", title: "Hedef Kargo" },
        ],
    },
    {
        label: "Raporlar",
        screens: [
            { path: "/evrak-raporlari", title: "Evrak Raporları" },
            { path: "/raporlar", title: "Reel Raporları" },
            { path: "/toplu-tutanak", title: "Toplu Tutanak" },
            { path: "/tutanak", title: "Tutanak" },
        ],
    },
    {
        label: "Araçlar",
        screens: [
            { path: "/ExcelDonusum", title: "Excel & Word" },
            { path: "/jpg-to-pdf", title: "JPG → PDF" },
            { path: "/pdf-sikistirma", title: "PDF Sıkıştırma" },
            { path: "/musteri-evraki", title: "Müşteri Evrakları" },
        ],
    },
    {
        label: "Yönetim",
        adminOnly: true,
        screens: [
            { path: "/ticket-yonetimi", title: "Ticket Yönetimi" },
            { path: "/yonetim-paneli", title: "Yönetim Paneli" },
            { path: "/audit-log", title: "Aktivite / Audit Log" },
            { path: "/rapor-merkezi", title: "Otomatik Rapor Merkezi" },
        ],
    },
];

export const ALL_SCREENS = SCREEN_GROUPS.flatMap((group) =>
    group.screens.map((screen) => ({ ...screen, group: group.label, adminOnly: !!group.adminOnly }))
);

export const ADMIN_ONLY_PATHS = new Set(
    ALL_SCREENS.filter((screen) => screen.adminOnly).map((screen) => screen.path)
);

export const normalizeUsername = (value) =>
    String(value || "").trim().toLocaleLowerCase("tr-TR");

export const isAdminUsername = (value) => normalizeUsername(value) === "admin";

const blankActionSet = (value = true) =>
    Object.fromEntries(ACTION_DEFINITIONS.map((action) => [action.key, value]));

export const createAllScreenPermissions = (value = true) =>
    Object.fromEntries(ALL_SCREENS.map((screen) => [screen.path, value]));

export const createAllActionPermissions = (value = true) =>
    Object.fromEntries(
        ALL_SCREENS.map((screen) => [screen.path, blankActionSet(value)])
    );

export const getLegacyScreenPermissions = (username) => {
    const userKey = normalizeUsername(username);
    if (isAdminUsername(userKey)) return createAllScreenPermissions(true);

    const isManager = ["yaren", "ozge", "mehmet", "rabia"].includes(userKey);
    const isRefika = userKey === "refika";
    const canSeeTahakkuk = ["aleynagncl", "cagla123", "didem", "canan", "merve"].includes(userKey);

    const result = createAllScreenPermissions(false);
    result["/anasayfa"] = true;
    result["/tahakkuk"] = canSeeTahakkuk;
    result["/kargo-bilgisi-ekle"] = isRefika;
    result["/tum-kargo-bilgileri"] = isManager || isRefika;
    result["/musteri-evraki"] = ["ozge", "yaren", "rabia"].includes(userKey);

    ALL_SCREENS.forEach((screen) => {
        if (ADMIN_ONLY_PATHS.has(screen.path)) return;
        if (!["/anasayfa", "/tahakkuk", "/kargo-bilgisi-ekle", "/tum-kargo-bilgileri", "/musteri-evraki"].includes(screen.path)) {
            result[screen.path] = isManager;
        }
    });

    return result;
};

export const createDefaultAccessForUser = (username) => {
    const screens = getLegacyScreenPermissions(username);
    const actions = createAllActionPermissions(false);

    Object.entries(screens).forEach(([path, visible]) => {
        if (visible) actions[path] = blankActionSet(true);
    });

    return { screens, actions };
};

const textOf = (element) => {
    const iconClass = element?.querySelector?.("svg")?.getAttribute?.("class") || "";
    return `${element?.dataset?.permissionAction || ""} ${element?.getAttribute?.("aria-label") || ""} ${element?.getAttribute?.("title") || ""} ${element?.innerText || element?.value || ""} ${iconClass}`
        .toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ")
        .trim();
};

export const detectActionFromElement = (element) => {
    const explicit = element?.dataset?.permissionAction;
    if (explicit && ACTION_DEFINITIONS.some((action) => action.key === explicit)) return explicit;

    const text = textOf(element);
    if (!text) return null;

    if (/dosya yükle|yükle|içe aktar|import|excel ile güncelle|dosya seç|upload|file-up/.test(text)) return "upload";
    if (/toplu|tümünü seç|listeyi seç|seçilenleri/.test(text)) return "bulk";
    if (/excel|pdf|word|indir|dışa aktar|export|yazdır|print|download|printer/.test(text)) return "export";
    if (/sil|kaldır|delete|çöp|🗑|trash/.test(text)) return "delete";
    if (/düzenle|edit|✏|pencil|square-pen/.test(text)) return "edit";
    if (/ödendi|ödenecek|bulunamadı|durum|status|tamamlandı|arşivle|✅|❌|⏳/.test(text)) return "status";
    if (/kaydet|onayla|tamamla|işle|save/.test(text)) return "save";
    if (/yeni kayıt|yeni kullanıcı|evrak ekle|ekle|oluştur|create|add|circle-plus|file-plus/.test(text)) return "create";

    return null;
};
