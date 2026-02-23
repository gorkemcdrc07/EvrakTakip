// src/components/ModernSidebar.jsx
// ✅ Morumsu (violet/pink) tema ile uyumlu hale getirildi: section header, active item, hover, search focus ring,
// ✅ icon kutuları, chipler ve footer kartı mor vurgulu + glow

import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
    Box,
    Stack,
    Typography,
    IconButton,
    Divider,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    TextField,
    InputAdornment,
    Chip,
    Card,
    Avatar,
    Tooltip,
    Button,
    Zoom,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

import ImageRoundedIcon from "@mui/icons-material/ImageRounded";

// ⭐ modern extras
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PushPinRoundedIcon from "@mui/icons-material/PushPinRounded";

function getInitials(name = "") {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "K";
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
}

function safeParseJSON(value, fallback) {
    try {
        const parsed = JSON.parse(value);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function highlightText(text, query, darkMode, accent) {
    const q = (query ?? "").trim();
    if (!q) return text;

    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);

    return (
        <span>
            {before}
            <Box
                component="span"
                sx={{
                    px: 0.6,
                    py: 0.1,
                    borderRadius: 1,
                    fontWeight: 950,
                    color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(17,24,39,0.92)",
                    background: darkMode ? "rgba(139,92,246,0.18)" : "rgba(139,92,246,0.12)",
                    border: darkMode ? "1px solid rgba(167,139,250,0.30)" : "1px solid rgba(139,92,246,0.22)",
                    boxShadow: darkMode
                        ? "0 10px 30px rgba(139,92,246,0.10)"
                        : "0 10px 26px rgba(139,92,246,0.12)",
                }}
            >
                {match}
            </Box>
            {after}
        </span>
    );
}

export default function ModernSidebar({ onClose, navigate, currentPath, darkMode, user, perms }) {
    const safeUser = user ?? { adSoyad: "Kullanıcı", usernameRaw: "" };
    const safePerms = perms ?? {
        canSeeTahakkuk: false,
        isAdminOrManager: false,
        isRefika: false,
        icons: {},
    };

    // 🎨 Morumsu accent palet (Anasayfa ile aynı)
    const accent = useMemo(
        () => ({
            primary: "#8B5CF6",
            primary2: "#A78BFA",
            pink: "#EC4899",
            cyan: "#22D3EE",
        }),
        []
    );

    // ✅ LocalStorage keys
    const LS_FAVS = "modern_sidebar_favorites_v1";
    const LS_RECENTS = "modern_sidebar_recents_v1";

    const [query, setQuery] = useState("");

    const [favorites, setFavorites] = useState(() => {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_FAVS) : null;
        return safeParseJSON(raw, []);
    });

    const [recents, setRecents] = useState(() => {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_RECENTS) : null;
        return safeParseJSON(raw, []);
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(LS_FAVS, JSON.stringify(favorites));
        } catch { }
    }, [favorites]);

    useEffect(() => {
        try {
            window.localStorage.setItem(LS_RECENTS, JSON.stringify(recents));
        } catch { }
    }, [recents]);

    const [openSections, setOpenSections] = useState(() => ({
        FAVORİLER: true,
        "SON KULLANILAN": true,
        "VERİ GİRİŞİ": true,
        NAVİGASYON: true,
        EVRAK: true,
        RAPORLAR: true,
        DİĞER: true,
        KARGO: true,
    }));

    const toggleSection = useCallback(
        (title) => setOpenSections((p) => ({ ...p, [title]: !p[title] })),
        []
    );

    const openSectionOnHover = useCallback((title) => {
        setOpenSections((p) => (p[title] ? p : { ...p, [title]: true }));
    }, []);

    const addRecent = useCallback((path) => {
        setRecents((prev) => [path, ...prev.filter((x) => x !== path)].slice(0, 8));
    }, []);

    const toggleFavorite = useCallback((path) => {
        setFavorites((prev) => {
            const has = prev.includes(path);
            const next = has ? prev.filter((p) => p !== path) : [path, ...prev];
            return next.slice(0, 30);
        });
    }, []);

    const go = useCallback(
        (path, opts = {}) => () => {
            onClose?.();
            addRecent(path);
            if (opts.newTab) window.open(path, "_blank");
            else navigate(path);
        },
        [navigate, onClose, addRecent]
    );

    const menuConfig = useMemo(() => {
        const I = safePerms.icons;

        return [
            {
                title: "VERİ GİRİŞİ",
                show: safePerms.canSeeTahakkuk,
                items: [
                    {
                        label: "Tahakkuk",
                        icon: I.Description ?? null,
                        path: "/tahakkuk",
                        onClick: go("/tahakkuk"),
                        keywords: ["tahakkuk", "veri", "giriş"],
                    },
                ],
            },
            {
                title: "NAVİGASYON",
                show: safePerms.isAdminOrManager,
                items: [
                    {
                        label: "Lokasyonlar",
                        icon: I.Place ?? null,
                        path: "/lokasyonlar",
                        onClick: go("/lokasyonlar", { newTab: true }),
                        keywords: ["lokasyon", "konum"],
                    },
                    {
                        label: "Projeler",
                        icon: I.Folder ?? null,
                        path: "/projeler",
                        onClick: go("/projeler", { newTab: true }),
                        keywords: ["proje"],
                    },
                ],
            },
            {
                title: "EVRAK",
                show: safePerms.isAdminOrManager,
                items: [
                    {
                        label: "Evrak Ekle",
                        icon: I.Grid ?? null,
                        path: "/evrak-ekle",
                        onClick: go("/evrak-ekle", { newTab: true }),
                        keywords: ["evrak", "ekle"],
                    },
                    {
                        label: "Tüm Evraklar",
                        icon: I.Description ?? null,
                        path: "/toplu-evraklar",
                        onClick: go("/toplu-evraklar", { newTab: true }),
                        keywords: ["toplu", "evraklar"],
                    },
                    {
                        label: "Tüm Kargo Bilgileri",
                        icon: I.Shipping ?? null,
                        path: "/tum-kargo-bilgileri",
                        onClick: go("/tum-kargo-bilgileri", { newTab: true }),
                        keywords: ["kargo", "bilgileri"],
                    },
                ],
            },
            {
                title: "RAPORLAR",
                show: safePerms.isAdminOrManager,
                items: [
                    {
                        label: "Evrak Raporları",
                        icon: I.Assessment ?? null,
                        path: "/evrak-raporlari",
                        onClick: go("/evrak-raporlari", { newTab: true }),
                        keywords: ["evrak", "rapor"],
                    },
                    {
                        label: "Reel Raporları",
                        icon: I.Assessment ?? null,
                        path: "/raporlar",
                        onClick: go("/raporlar", { newTab: true }),
                        keywords: ["reel", "rapor"],
                    },
                    {
                        label: "Toplu Tutanak",
                        icon: I.Description ?? null,
                        path: "/toplu-tutanak",
                        onClick: go("/toplu-tutanak", { newTab: true }),
                        keywords: ["tutanak", "toplu"],
                    },
                ],
            },
            {
                title: "DİĞER",
                show: safePerms.isAdminOrManager,
                items: [
                    {
                        label: "Hedef Kargo",
                        icon: I.Grid ?? null,
                        path: "/hedef-kargo",
                        onClick: go("/hedef-kargo", { newTab: true }),
                        keywords: ["hedef", "kargo"],
                    },
                    {
                        label: "Tutanak",
                        icon: I.Description ?? null,
                        path: "/tutanak",
                        onClick: go("/tutanak", { newTab: true }),
                        keywords: ["tutanak"],
                    },
                    {
                        label: "Excel & Word",
                        icon: I.Description ?? null,
                        path: "/ExcelDonusum",
                        onClick: go("/ExcelDonusum", { newTab: true }),
                        keywords: ["excel", "word", "dönüşüm"],
                    },
                    {
                        label: "JPG TO PDF",
                        icon: <ImageRoundedIcon />,
                        path: "/jpg-to-pdf",
                        onClick: go("/jpg-to-pdf", { newTab: true }),
                        keywords: ["jpg", "jpeg", "pdf", "dönüştür", "converter"],
                    },
                ],
            },
            {
                title: "KARGO",
                show: safePerms.isRefika,
                items: [
                    {
                        label: "Kargo Bilgisi Ekle",
                        icon: I.Shipping ?? null,
                        path: "/kargo-bilgisi-ekle",
                        onClick: go("/kargo-bilgisi-ekle", { newTab: true }),
                        keywords: ["kargo", "ekle"],
                    },
                    {
                        label: "Tüm Kargo Bilgileri",
                        icon: I.Shipping ?? null,
                        path: "/tum-kargo-bilgileri",
                        onClick: go("/tum-kargo-bilgileri", { newTab: true }),
                        keywords: ["kargo", "liste"],
                    },
                ],
            },
        ];
    }, [safePerms.canSeeTahakkuk, safePerms.isAdminOrManager, safePerms.isRefika, safePerms.icons, go]);

    const allVisibleItems = useMemo(() => {
        return menuConfig.filter((s) => s.show).flatMap((s) => s.items.map((it) => ({ ...it, section: s.title })));
    }, [menuConfig]);

    const favoritesItems = useMemo(() => {
        const map = new Map(allVisibleItems.map((it) => [it.path, it]));
        return favorites.map((p) => map.get(p)).filter(Boolean);
    }, [favorites, allVisibleItems]);

    const recentItems = useMemo(() => {
        const map = new Map(allVisibleItems.map((it) => [it.path, it]));
        return recents.map((p) => map.get(p)).filter(Boolean);
    }, [recents, allVisibleItems]);

    const visibleSections = useMemo(() => {
        const q = query.trim().toLowerCase();

        const base = menuConfig
            .filter((s) => s.show)
            .map((s) => {
                if (!q) return s;
                const items = s.items.filter((it) => {
                    const hay = [it.label, ...(it.keywords ?? [])].join(" ").toLowerCase();
                    return hay.includes(q);
                });
                return { ...s, items };
            })
            .filter((s) => s.items.length > 0);

        if (q) {
            const toOpen = {};
            base.forEach((s) => (toOpen[s.title] = true));
            setTimeout(() => setOpenSections((prev) => ({ ...prev, ...toOpen })), 0);
        }

        return base;
    }, [menuConfig, query]);

    // 🔮 Sidebar "glass" arkaplan + mor glow
    const sidebarRootSx = useMemo(
        () => ({
            width: 340,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            "&:before": {
                content: '""',
                position: "absolute",
                inset: -2,
                pointerEvents: "none",
                background: darkMode
                    ? `
            radial-gradient(900px circle at 20% 10%, rgba(139,92,246,0.22), transparent 55%),
            radial-gradient(700px circle at 90% 30%, rgba(236,72,153,0.12), transparent 55%),
            radial-gradient(700px circle at 40% 90%, rgba(34,211,238,0.10), transparent 55%)
          `
                    : `
            radial-gradient(900px circle at 20% 10%, rgba(139,92,246,0.16), transparent 55%),
            radial-gradient(700px circle at 90% 30%, rgba(236,72,153,0.10), transparent 55%)
          `,
                opacity: darkMode ? 0.9 : 0.8,
            },
        }),
        [darkMode]
    );

    const sectionHeaderSx = useMemo(
        () => ({
            position: "sticky",
            top: 0,
            zIndex: 2,
            px: 1.5,
            py: 0.75,
            mt: 1,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            background: darkMode
                ? "linear-gradient(180deg, rgba(10,12,20,0.92), rgba(10,12,20,0.56))"
                : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.58))",
            borderTop: darkMode ? "1px solid rgba(167,139,250,0.14)" : "1px solid rgba(139,92,246,0.12)",
            "&:after": {
                content: '""',
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: darkMode
                    ? "radial-gradient(600px circle at 10% 0%, rgba(139,92,246,0.12), transparent 55%)"
                    : "radial-gradient(600px circle at 10% 0%, rgba(139,92,246,0.08), transparent 55%)",
            },
        }),
        [darkMode]
    );

    const iconBoxSx = useMemo(
        () => ({
            width: 34,
            height: 34,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.16)",
            background: darkMode
                ? "linear-gradient(180deg, rgba(139,92,246,0.16), rgba(255,255,255,0.03))"
                : "linear-gradient(180deg, rgba(139,92,246,0.10), rgba(17,24,39,0.02))",
            boxShadow: darkMode ? "0 12px 34px rgba(139,92,246,0.12)" : "0 10px 24px rgba(139,92,246,0.10)",
        }),
        [darkMode]
    );

    const smallPillSx = useMemo(
        () => ({
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 900,
            borderColor: darkMode ? "rgba(167,139,250,0.22)" : "rgba(139,92,246,0.16)",
            background: darkMode ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.08)",
            "&:hover": {
                borderColor: darkMode ? "rgba(167,139,250,0.30)" : "rgba(139,92,246,0.22)",
                background: darkMode ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.10)",
            },
        }),
        [darkMode]
    );

    const NavItem = ({ item }) => {
        const active = currentPath === item.path;
        const isFav = favorites.includes(item.path);

        return (
            <ListItemButton
                onClick={item.onClick}
                sx={{
                    mx: 1,
                    mb: 0.6,
                    borderRadius: 2,
                    position: "relative",
                    overflow: "hidden",
                    border: active
                        ? darkMode
                            ? "1px solid rgba(167,139,250,0.30)"
                            : "1px solid rgba(139,92,246,0.22)"
                        : "1px solid transparent",
                    background: active
                        ? darkMode
                            ? "linear-gradient(90deg, rgba(139,92,246,0.18), rgba(255,255,255,0.03))"
                            : "linear-gradient(90deg, rgba(139,92,246,0.12), rgba(255,255,255,0.60))"
                        : "transparent",
                    "&:hover": {
                        background: darkMode
                            ? "linear-gradient(90deg, rgba(139,92,246,0.12), rgba(255,255,255,0.03))"
                            : "linear-gradient(90deg, rgba(139,92,246,0.08), rgba(255,255,255,0.65))",
                    },
                    ...(active && {
                        boxShadow: darkMode ? "0 18px 60px rgba(139,92,246,0.14)" : "0 16px 42px rgba(139,92,246,0.14)",
                        "&:before": {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: 10,
                            bottom: 10,
                            width: 3,
                            borderRadius: 8,
                            background: `linear-gradient(180deg, ${accent.primary2}, ${accent.pink})`,
                        },
                        "&:after": {
                            content: '""',
                            position: "absolute",
                            inset: 0,
                            background: darkMode
                                ? "radial-gradient(700px circle at 20% 0%, rgba(139,92,246,0.18), transparent 55%)"
                                : "radial-gradient(700px circle at 20% 0%, rgba(139,92,246,0.12), transparent 60%)",
                            pointerEvents: "none",
                        },
                    }),
                    "& .favBtn": {
                        opacity: isFav ? 1 : 0,
                        transform: isFav ? "scale(1)" : "scale(0.92)",
                        transition: "all 160ms ease",
                    },
                    "&:hover .favBtn": {
                        opacity: 1,
                        transform: "scale(1)",
                    },
                }}
            >
                <ListItemIcon sx={{ minWidth: 44, color: "inherit" }}>
                    <Box sx={iconBoxSx}>{item.icon}</Box>
                </ListItemIcon>

                <ListItemText
                    primary={highlightText(item.label, query, darkMode, accent)}
                    primaryTypographyProps={{
                        fontWeight: active ? 950 : 760,
                        fontSize: 14,
                    }}
                />

                <Tooltip title={isFav ? "Favorilerden kaldır" : "Favorilere ekle"} TransitionComponent={Zoom} arrow>
                    <IconButton
                        className="favBtn"
                        size="small"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(item.path);
                        }}
                        sx={{
                            mr: 0.5,
                            borderRadius: 2,
                            border: darkMode ? "1px solid rgba(167,139,250,0.20)" : "1px solid rgba(139,92,246,0.14)",
                            background: darkMode ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)",
                            "&:hover": {
                                background: darkMode ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.09)",
                            },
                        }}
                    >
                        {isFav ? <StarRoundedIcon fontSize="small" /> : <StarBorderRoundedIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>

                <ChevronRightRoundedIcon sx={{ opacity: active ? 0.6 : 0.35 }} />
            </ListItemButton>
        );
    };

    const renderSection = (sectionTitle, items, opts = {}) => {
        const { icon, chipLabel } = opts;
        if (!items?.length) return null;

        return (
            <Box key={sectionTitle}>
                <Box sx={sectionHeaderSx} onMouseEnter={() => openSectionOnHover(sectionTitle)}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1}>
                            {icon ? (
                                <Box
                                    sx={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 2,
                                        display: "grid",
                                        placeItems: "center",
                                        border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.16)",
                                        background: darkMode ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)",
                                        boxShadow: darkMode ? "0 10px 24px rgba(139,92,246,0.10)" : "0 10px 22px rgba(139,92,246,0.08)",
                                    }}
                                >
                                    {icon}
                                </Box>
                            ) : null}

                            <Typography
                                variant="overline"
                                sx={{
                                    opacity: 0.82,
                                    letterSpacing: "0.16em",
                                    fontWeight: 950,
                                }}
                            >
                                {sectionTitle}
                            </Typography>

                            {chipLabel ? (
                                <Chip
                                    size="small"
                                    label={chipLabel}
                                    sx={{
                                        height: 20,
                                        opacity: 0.95,
                                        fontWeight: 950,
                                        borderRadius: 999,
                                        border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.16)",
                                        background: darkMode ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.08)",
                                    }}
                                />
                            ) : null}
                        </Stack>

                        <IconButton
                            size="small"
                            onClick={() => toggleSection(sectionTitle)}
                            sx={{
                                borderRadius: 2,
                                border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.16)",
                                background: darkMode ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)",
                                "&:hover": {
                                    background: darkMode ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.09)",
                                },
                            }}
                        >
                            {openSections[sectionTitle] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                    </Stack>
                </Box>

                <Collapse in={openSections[sectionTitle] ?? true} timeout={180} unmountOnExit>
                    <Box sx={{ pb: 0.75, pt: 0.75 }}>
                        {items.map((item) => (
                            <NavItem key={item.path} item={item} />
                        ))}
                    </Box>
                </Collapse>
            </Box>
        );
    };

    return (
        <Box sx={sidebarRootSx}>
            {/* Top header */}
            <Box sx={{ px: 2, pt: 2, pb: 1.5, position: "relative", zIndex: 1 }}>
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: darkMode
                            ? "linear-gradient(90deg, rgba(167,139,250,0.10), rgba(255,255,255,0.03), rgba(236,72,153,0.08))"
                            : "linear-gradient(90deg, rgba(139,92,246,0.08), rgba(255,255,255,0.35), rgba(236,72,153,0.06))",
                        opacity: darkMode ? 0.65 : 0.55,
                        borderBottom: darkMode ? "1px solid rgba(167,139,250,0.14)" : "1px solid rgba(139,92,246,0.10)",
                    }}
                />

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: "relative" }}>
                    <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ opacity: 0.78, fontWeight: 950, letterSpacing: "0.14em" }}>
                            EVRAK YÖNETİMİ
                        </Typography>
                        <Typography variant="h6" fontWeight={950}>
                            Menü
                        </Typography>
                    </Stack>

                    <Tooltip title="Kapat">
                        <IconButton
                            onClick={onClose}
                            size="small"
                            sx={{
                                borderRadius: 2,
                                border: darkMode ? "1px solid rgba(167,139,250,0.20)" : "1px solid rgba(139,92,246,0.14)",
                                background: darkMode ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)",
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                {/* User row */}
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 1.5, position: "relative" }}>
                    <Avatar
                        sx={{
                            width: 38,
                            height: 38,
                            fontWeight: 950,
                            border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.16)",
                            background: darkMode
                                ? "linear-gradient(180deg, rgba(139,92,246,0.18), rgba(255,255,255,0.05))"
                                : "linear-gradient(180deg, rgba(139,92,246,0.14), rgba(255,255,255,0.55))",
                            color: "inherit",
                        }}
                    >
                        {getInitials(safeUser.adSoyad)}
                    </Avatar>

                    <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={950} noWrap>
                            {safeUser.adSoyad}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.72 }} noWrap>
                            @{safeUser.usernameRaw || "-"}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    <Chip
                        size="small"
                        label="Online"
                        sx={{
                            height: 22,
                            fontWeight: 900,
                            opacity: 0.95,
                            borderRadius: 999,
                            border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.16)",
                            background: darkMode ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.08)",
                        }}
                    />
                </Stack>

                {/* Search */}
                <TextField
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Menüde ara..."
                    size="small"
                    fullWidth
                    sx={{
                        mt: 1.5,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 999,
                            background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(139,92,246,0.05)",
                            border: darkMode ? "1px solid rgba(167,139,250,0.18)" : "1px solid rgba(139,92,246,0.14)",
                            "& fieldset": { border: "none" },
                            "&.Mui-focused": {
                                boxShadow: darkMode
                                    ? "0 0 0 4px rgba(139,92,246,0.18)"
                                    : "0 0 0 4px rgba(139,92,246,0.14)",
                            },
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Quick actions */}
                <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                    <Button size="small" variant="outlined" startIcon={<SettingsRoundedIcon />} sx={smallPillSx}>
                        Ayarlar
                    </Button>

                    <Button size="small" variant="outlined" startIcon={<HelpOutlineRoundedIcon />} sx={smallPillSx}>
                        Yardım
                    </Button>

                    <Box sx={{ flex: 1 }} />

                    {favoritesItems.length ? (
                        <Tooltip title="Favori sayısı">
                            <Chip
                                size="small"
                                icon={<StarRoundedIcon />}
                                label={favoritesItems.length}
                                sx={{
                                    height: 26,
                                    fontWeight: 950,
                                    borderRadius: 999,
                                    border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.16)",
                                    background: darkMode ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.08)",
                                }}
                            />
                        </Tooltip>
                    ) : null}
                </Stack>
            </Box>

            <Divider sx={{ opacity: 0.12, position: "relative", zIndex: 1 }} />

            {/* Menu */}
            <Box sx={{ flex: 1, overflow: "auto", py: 0.75, position: "relative", zIndex: 1 }}>
                <List disablePadding>
                    {renderSection("FAVORİLER", favoritesItems, {
                        icon: <StarRoundedIcon fontSize="small" />,
                        chipLabel: favoritesItems.length ? favoritesItems.length : null,
                    })}

                    {renderSection("SON KULLANILAN", recentItems, {
                        icon: <HistoryRoundedIcon fontSize="small" />,
                        chipLabel: recentItems.length ? recentItems.length : null,
                    })}

                    {visibleSections.map((section) =>
                        renderSection(section.title, section.items, {
                            chipLabel: query ? section.items.length : null,
                        })
                    )}
                </List>
            </Box>

            <Divider sx={{ opacity: 0.12, position: "relative", zIndex: 1 }} />

            {/* Footer */}
            <Box sx={{ p: 2, position: "relative", zIndex: 1 }}>
                <Card
                    sx={{
                        p: 1.25,
                        border: darkMode ? "1px solid rgba(167,139,250,0.18)" : "1px solid rgba(139,92,246,0.12)",
                        background: darkMode
                            ? "linear-gradient(180deg, rgba(139,92,246,0.10), rgba(255,255,255,0.03))"
                            : "linear-gradient(180deg, rgba(139,92,246,0.07), rgba(255,255,255,0.70))",
                        boxShadow: darkMode ? "0 18px 60px rgba(139,92,246,0.10)" : "0 16px 45px rgba(139,92,246,0.12)",
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Avatar
                            sx={{
                                width: 34,
                                height: 34,
                                fontWeight: 950,
                                border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.16)",
                                background: darkMode
                                    ? "linear-gradient(180deg, rgba(139,92,246,0.18), rgba(255,255,255,0.05))"
                                    : "linear-gradient(180deg, rgba(139,92,246,0.14), rgba(255,255,255,0.55))",
                                color: "inherit",
                            }}
                        >
                            {getInitials(safeUser.adSoyad)}
                        </Avatar>

                        <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={950} noWrap>
                                {safeUser.adSoyad}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.72 }} noWrap>
                                @{safeUser.usernameRaw || "-"}
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1 }} />

                        <Tooltip title="Favoriler & Son kullanılanlar">
                            <Box
                                sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 2,
                                    display: "grid",
                                    placeItems: "center",
                                    border: darkMode ? "1px solid rgba(167,139,250,0.20)" : "1px solid rgba(139,92,246,0.14)",
                                    background: darkMode ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)",
                                    opacity: 0.9,
                                }}
                            >
                                <PushPinRoundedIcon fontSize="small" />
                            </Box>
                        </Tooltip>
                    </Stack>
                </Card>
            </Box>
        </Box>
    );
}