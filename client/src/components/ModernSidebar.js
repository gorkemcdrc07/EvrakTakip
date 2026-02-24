// src/components/ModernSidebar.jsx
import React, { useMemo, useState, useCallback } from "react";
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
    Avatar,
    Tooltip,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

function getInitials(name = "") {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "K";
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
}

function highlightText(text, query, ui) {
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
                    px: 0.55,
                    py: 0.1,
                    mx: 0.2,
                    borderRadius: 1,
                    fontWeight: 900,
                    background: ui.dark ? "rgba(139,92,246,0.18)" : "rgba(139,92,246,0.10)",
                    border: ui.dark ? "1px solid rgba(167,139,250,0.28)" : "1px solid rgba(139,92,246,0.18)",
                }}
            >
                {match}
            </Box>
            {after}
        </span>
    );
}

function ETSMark({ ui, size = 30 }) {
    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                border: `1px solid ${ui.border}`,
                background: ui.dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.70)",
            }}
        >
            <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
                <path
                    d="M8 4h7l3 3v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                    stroke={ui.dark ? "rgba(233,213,255,0.88)" : "rgba(76,29,149,0.70)"}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                />
                <path
                    d="M15 4v3h3"
                    stroke={ui.dark ? "rgba(233,213,255,0.88)" : "rgba(76,29,149,0.70)"}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                />
            </svg>
        </Box>
    );
}

export default function ModernSidebar({ onClose, navigate, currentPath, darkMode, user, perms }) {
    const safeUser = user ?? { adSoyad: "Kullanıcı", usernameRaw: "" };
    const safePerms = perms ?? { canSeeTahakkuk: false, isAdminOrManager: false, isRefika: false, icons: {} };

    const ui = useMemo(() => {
        const dark = !!darkMode;
        return {
            dark,
            border: dark ? "rgba(167,139,250,0.18)" : "rgba(139,92,246,0.12)",
            borderStrong: dark ? "rgba(167,139,250,0.30)" : "rgba(139,92,246,0.20)",
            bg: dark ? "rgba(10,12,20,0.78)" : "rgba(255,255,255,0.92)",
            panel: dark ? "rgba(255,255,255,0.04)" : "rgba(17,24,39,0.03)",
            textDim: dark ? "rgba(255,255,255,0.70)" : "rgba(17,24,39,0.65)",
            activeBg: dark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.10)",
            hoverBg: dark ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.07)",
            shadow: dark ? "0 22px 80px rgba(0,0,0,0.55)" : "0 18px 55px rgba(17,24,39,0.10)",
        };
    }, [darkMode]);

    const [query, setQuery] = useState("");
    const [openSections, setOpenSections] = useState(() => ({
        "VERİ GİRİŞİ": true,
        NAVİGASYON: true,
        EVRAK: true,
        RAPORLAR: true,
        DİĞER: true,
        KARGO: true,
    }));

    const toggleSection = useCallback((title) => {
        setOpenSections((p) => ({ ...p, [title]: !p[title] }));
    }, []);

    const go = useCallback(
        (path) => () => {
            onClose?.();
            navigate(path);
        },
        [navigate, onClose]
    );

    const menuConfig = useMemo(() => {
        const I = safePerms.icons;
        return [
            {
                title: "VERİ GİRİŞİ",
                show: safePerms.canSeeTahakkuk,
                items: [{ label: "Tahakkuk", icon: I.Description ?? null, path: "/tahakkuk", onClick: go("/tahakkuk"), keywords: ["tahakkuk"] }],
            },
            {
                title: "NAVİGASYON",
                show: safePerms.isAdminOrManager,
                items: [
                    { label: "Lokasyonlar", icon: I.Place ?? null, path: "/lokasyonlar", onClick: go("/lokasyonlar"), keywords: ["lokasyon"] },
                    { label: "Projeler", icon: I.Folder ?? null, path: "/projeler", onClick: go("/projeler"), keywords: ["proje"] },
                ],
            },
            {
                title: "EVRAK",
                show: safePerms.isAdminOrManager,
                items: [
                    { label: "Evrak Ekle", icon: I.Grid ?? null, path: "/evrak-ekle", onClick: go("/evrak-ekle"), keywords: ["evrak", "ekle"] },
                    { label: "Tüm Evraklar", icon: I.Description ?? null, path: "/toplu-evraklar", onClick: go("/toplu-evraklar"), keywords: ["evraklar"] },
                    { label: "Tüm Kargo Bilgileri", icon: I.Shipping ?? null, path: "/tum-kargo-bilgileri", onClick: go("/tum-kargo-bilgileri"), keywords: ["kargo"] },
                ],
            },
            {
                title: "RAPORLAR",
                show: safePerms.isAdminOrManager,
                items: [
                    { label: "Evrak Raporları", icon: I.Assessment ?? null, path: "/evrak-raporlari", onClick: go("/evrak-raporlari"), keywords: ["evrak", "rapor"] },
                    { label: "Reel Raporları", icon: I.Assessment ?? null, path: "/raporlar", onClick: go("/raporlar"), keywords: ["reel", "rapor"] },
                    { label: "Toplu Tutanak", icon: I.Description ?? null, path: "/toplu-tutanak", onClick: go("/toplu-tutanak"), keywords: ["tutanak"] },
                ],
            },
            {
                title: "DİĞER",
                show: safePerms.isAdminOrManager,
                items: [
                    { label: "Hedef Kargo", icon: I.Grid ?? null, path: "/hedef-kargo", onClick: go("/hedef-kargo"), keywords: ["hedef"] },
                    { label: "Tutanak", icon: I.Description ?? null, path: "/tutanak", onClick: go("/tutanak"), keywords: ["tutanak"] },
                    { label: "Excel & Word", icon: I.Description ?? null, path: "/ExcelDonusum", onClick: go("/ExcelDonusum"), keywords: ["excel", "word"] },
                    { label: "JPG TO PDF", icon: I.Image ?? null, path: "/jpg-to-pdf", onClick: go("/jpg-to-pdf"), keywords: ["jpg", "pdf"] },
                ],
            },
            {
                title: "KARGO",
                show: safePerms.isRefika,
                items: [
                    { label: "Kargo Bilgisi Ekle", icon: I.Shipping ?? null, path: "/kargo-bilgisi-ekle", onClick: go("/kargo-bilgisi-ekle"), keywords: ["kargo"] },
                    { label: "Tüm Kargo Bilgileri", icon: I.Shipping ?? null, path: "/tum-kargo-bilgileri", onClick: go("/tum-kargo-bilgileri"), keywords: ["kargo"] },
                ],
            },
        ];
    }, [safePerms, go]);

    const visibleSections = useMemo(() => {
        const q = query.trim().toLowerCase();
        return menuConfig
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
    }, [menuConfig, query]);

    const NavItem = ({ item }) => {
        const active = currentPath === item.path;
        return (
            <ListItemButton
                onClick={item.onClick}
                sx={{
                    mx: 1,
                    mb: 0.6,
                    borderRadius: 2.2,
                    border: `1px solid ${active ? ui.borderStrong : "transparent"}`,
                    background: active ? ui.activeBg : "transparent",
                    position: "relative",
                    overflow: "hidden",
                    "&:hover": { background: active ? ui.activeBg : ui.hoverBg },
                    "&:before": active
                        ? {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: 10,
                            bottom: 10,
                            width: 3,
                            borderRadius: 8,
                            background: "linear-gradient(180deg, rgba(167,139,250,1), rgba(236,72,153,0.9))",
                        }
                        : {},
                }}
            >
                <ListItemIcon sx={{ minWidth: 42, color: "inherit" }}>
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 2,
                            display: "grid",
                            placeItems: "center",
                            border: `1px solid ${ui.border}`,
                            background: ui.panel,
                        }}
                    >
                        {item.icon}
                    </Box>
                </ListItemIcon>
                <ListItemText
                    primary={highlightText(item.label, query, ui)}
                    primaryTypographyProps={{ fontWeight: active ? 900 : 700, fontSize: 14 }}
                />
            </ListItemButton>
        );
    };

    const Section = ({ title, items }) => {
        if (!items?.length) return null;
        return (
            <Box sx={{ mt: 0.6 }}>
                <Box sx={{ px: 1.5, py: 0.8 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: "0.14em", fontWeight: 900 }}>
                            {title}
                        </Typography>
                        <IconButton size="small" onClick={() => toggleSection(title)} sx={{ borderRadius: 2 }}>
                            {openSections[title] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                    </Stack>
                </Box>

                <Collapse in={openSections[title] ?? true} timeout={160} unmountOnExit>
                    <Box sx={{ pb: 0.5 }}>
                        {items.map((item) => (
                            <NavItem key={item.path} item={item} />
                        ))}
                    </Box>
                </Collapse>
            </Box>
        );
    };

    return (
        <Box
            sx={{
                width: 320,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: ui.bg,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                boxShadow: ui.shadow,
                borderLeft: `1px solid ${ui.border}`,
            }}
        >
            {/* Top */}
            <Box sx={{ px: 2, pt: 2, pb: 1.25 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                        <ETSMark ui={ui} />
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" sx={{ opacity: 0.78, fontWeight: 900, letterSpacing: "0.14em" }}>
                                ETS
                            </Typography>
                            <Typography variant="h6" fontWeight={950} noWrap>
                                Menü
                            </Typography>
                        </Box>
                    </Stack>

                    <Tooltip title="Kapat">
                        <IconButton onClick={onClose} size="small" sx={{ borderRadius: 2 }}>
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                {/* User */}
                <Stack direction="row" alignItems="center" spacing={1.1} sx={{ mt: 1.4 }}>
                    <Avatar
                        sx={{
                            width: 36,
                            height: 36,
                            fontWeight: 950,
                            border: `1px solid ${ui.border}`,
                            background: ui.dark ? "rgba(139,92,246,0.18)" : "rgba(139,92,246,0.12)",
                        }}
                    >
                        {getInitials(safeUser.adSoyad)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={900} noWrap>
                            {safeUser.adSoyad}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }} noWrap>
                            @{safeUser.usernameRaw || "-"}
                        </Typography>
                    </Box>
                </Stack>

                {/* Search */}
                <TextField
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ara..."
                    size="small"
                    fullWidth
                    sx={{
                        mt: 1.3,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 999,
                            background: ui.panel,
                            border: `1px solid ${ui.border}`,
                            "& fieldset": { border: "none" },
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: query ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setQuery("")} sx={{ borderRadius: 2 }}>
                                    <ClearRoundedIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                />
            </Box>

            <Divider sx={{ opacity: 0.12 }} />

            {/* Menu */}
            <Box sx={{ flex: 1, overflow: "auto", py: 0.75 }}>
                <List disablePadding>
                    {visibleSections.map((section) => (
                        <Section key={section.title} title={section.title} items={section.items} />
                    ))}
                </List>
            </Box>

            <Divider sx={{ opacity: 0.12 }} />

            {/* Bottom hint (minimal) */}
            <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" sx={{ opacity: 0.65 }}>
                    İpucu: Arama ile menüyü hızlı filtreleyebilirsin.
                </Typography>
            </Box>
        </Box>
    );
}