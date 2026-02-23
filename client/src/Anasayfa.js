// src/pages/Anasayfa.jsx
// ✅ Modern dashboard (hero + gradient KPI + sparkline + modern chart card) + ModernSidebar entegre + morumsu tema

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import ModernSidebar from "./components/ModernSidebar";
import { supabase } from "./supabaseClient";

import {
    BarChart,
    AreaChart,
    LineChart,
    Bar,
    Line,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box,
    Drawer,
    Stack,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
    CssBaseline,
} from "@mui/material";

import { ThemeProvider, createTheme } from "@mui/material/styles";

import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import BusinessIcon from "@mui/icons-material/Business";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PersonIcon from "@mui/icons-material/Person";

function Anasayfa() {
    const navigate = useNavigate();
    const location = useLocation();

    const adSoyad = localStorage.getItem("ad") ?? "Kullanıcı";
    const usernameRaw = localStorage.getItem("username") ?? "";
    const usernameLower = usernameRaw.trim().toLowerCase();

    const [menuOpen, setMenuOpen] = useState(false);

    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "dark") return true;
        if (saved === "light") return false;
        return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    });

    // 🎨 Morumsu accent palet
    const accent = useMemo(
        () => ({
            primary: "#8B5CF6", // violet-500
            primary2: "#A78BFA", // violet-400
            pink: "#EC4899", // pink-500
            cyan: "#22D3EE", // cyan-400
        }),
        []
    );

    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [metric, setMetric] = useState("kargo");
    const [chartType, setChartType] = useState("bar");
    const [firmalar, setFirmalar] = useState(["Hepsi"]);
    const [selectedFirma, setSelectedFirma] = useState("Hepsi");

    // --- ROL ---
    const isRefika = usernameLower === "refika";
    const isAdminOrManager = ["yaren", "ozge", "mehmet"].includes(usernameLower);

    const tahakkukAllowedUsers = ["aleynagncl", "cagla123", "didem", "canan"].map((u) => u.trim().toLowerCase());
    const tahakkukBlockedUsers = ["yaren", "ozge", "refika", "mehmet"];
    const canSeeTahakkuk =
        tahakkukAllowedUsers.includes(usernameLower) && !tahakkukBlockedUsers.includes(usernameLower);

    const metricLabel = metric === "kargo" ? "Kargo" : "Evrak";
    const totalCount = useMemo(() => dailyData.reduce((s, i) => s + (i.count || 0), 0), [dailyData]);

    const mode = darkMode ? "dark" : "light";

    const theme = useMemo(() => {
        return createTheme({
            palette: {
                mode,
                primary: { main: accent.primary },
                secondary: { main: accent.pink },
                ...(mode === "dark"
                    ? {
                        background: { default: "#070A13", paper: "rgba(255,255,255,0.04)" },
                        text: { primary: "rgba(255,255,255,0.92)", secondary: "rgba(255,255,255,0.70)" },
                    }
                    : {
                        background: { default: "#F7F5FF", paper: "#ffffff" },
                        text: { primary: "rgba(17,24,39,0.92)", secondary: "rgba(17,24,39,0.70)" },
                    }),
            },
            shape: { borderRadius: 16 },
            typography: {
                fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
            },
            components: {
                MuiCssBaseline: {
                    styleOverrides: {
                        body: {
                            WebkitFontSmoothing: "antialiased",
                            MozOsxFontSmoothing: "grayscale",
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            border:
                                mode === "dark"
                                    ? "1px solid rgba(167,139,250,0.20)"
                                    : "1px solid rgba(139,92,246,0.18)",
                            background:
                                mode === "dark"
                                    ? "linear-gradient(180deg, rgba(139,92,246,0.10) 0%, rgba(255,255,255,0.04) 55%, rgba(0,0,0,0.12) 120%)"
                                    : "linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(255,255,255,0.92) 55%)",
                            backdropFilter: "blur(12px)",
                            boxShadow: mode === "dark" ? "0 18px 70px rgba(0,0,0,0.55)" : "0 18px 50px rgba(139,92,246,0.16)",
                        },
                    },
                },
                MuiAppBar: {
                    styleOverrides: {
                        root: {
                            background: mode === "dark" ? "rgba(10,12,20,0.72)" : "rgba(255,255,255,0.78)",
                            color: mode === "dark" ? "rgba(255,255,255,0.92)" : "rgba(17,24,39,0.92)",
                            backdropFilter: "blur(14px)",
                            borderBottom:
                                mode === "dark" ? "1px solid rgba(167,139,250,0.18)" : "1px solid rgba(139,92,246,0.14)",
                            boxShadow:
                                mode === "dark"
                                    ? "0 10px 40px rgba(139,92,246,0.10)"
                                    : "0 10px 30px rgba(139,92,246,0.12)",
                        },
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: { textTransform: "none", borderRadius: 14, fontWeight: 800 },
                    },
                },
                MuiToggleButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 14,
                            borderColor: mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
                            "&.Mui-selected": {
                                backgroundColor: mode === "dark" ? "rgba(139,92,246,0.22)" : "rgba(139,92,246,0.16)",
                                borderColor: mode === "dark" ? "rgba(167,139,250,0.35)" : "rgba(139,92,246,0.25)",
                            },
                            "&.Mui-selected:hover": {
                                backgroundColor: mode === "dark" ? "rgba(139,92,246,0.28)" : "rgba(139,92,246,0.20)",
                            },
                        },
                    },
                },
            },
        });
    }, [mode, accent.primary, accent.pink]);

    useEffect(() => {
        localStorage.setItem("theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    const toggleTheme = useCallback(() => setDarkMode((p) => !p), []);

    const handleLogout = useCallback(() => {
        localStorage.clear();
        navigate("/login");
    }, [navigate]);

    // --- Firmalar ---
    useEffect(() => {
        (async () => {
            try {
                const { data, error } = await supabase.from("kargo_bilgileri").select("kargo_firmasi");
                if (error) throw error;

                const unique = Array.from(
                    new Set(
                        (data ?? [])
                            .map((i) => i.kargo_firmasi?.trim())
                            .filter(Boolean)
                            .map((s) => s.toUpperCase())
                    )
                );
                setFirmalar(["Hepsi", ...unique]);
            } catch (e) {
                console.error("Firmalar alınamadı", e);
            }
        })();
    }, []);

    // --- Günlük veri ---
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const today = new Date();
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(today.getDate() - 6);

                const gunIsimleri = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

                const dayMap = {};
                for (let i = 0; i < 7; i++) {
                    const d = new Date(oneWeekAgo);
                    d.setDate(d.getDate() + i);
                    const key = d.toISOString().split("T")[0];
                    const label = gunIsimleri[d.getDay()];
                    dayMap[key] = { date: key, label, count: 0 };
                }

                let query = supabase
                    .from("kargo_bilgileri")
                    .select("tarih, kargo_firmasi, evrak_adedi")
                    .gte("tarih", oneWeekAgo.toISOString().split("T")[0])
                    .lte("tarih", today.toISOString().split("T")[0]);

                if (selectedFirma !== "Hepsi") query = query.ilike("kargo_firmasi", selectedFirma);

                const { data, error } = await query;
                if (error) throw error;

                (data ?? []).forEach(({ tarih, evrak_adedi }) => {
                    if (dayMap[tarih]) {
                        if (metric === "kargo") dayMap[tarih].count += 1;
                        else dayMap[tarih].count += evrak_adedi || 0;
                    }
                });

                setDailyData(Object.values(dayMap));
            } catch (e) {
                console.error("Veri alınamadı", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [metric, selectedFirma]);

    const drawerPaperSx = useMemo(
        () => ({
            bgcolor: darkMode ? "rgba(10,12,20,0.78)" : "rgba(255,255,255,0.92)",
            color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(17,24,39,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRight: darkMode ? "1px solid rgba(167,139,250,0.16)" : "1px solid rgba(139,92,246,0.12)",
            boxShadow: darkMode ? "0 30px 90px rgba(0,0,0,0.60)" : "0 18px 60px rgba(139,92,246,0.14)",
        }),
        [darkMode]
    );

    const Chart = () => {
        const ChartComp = chartType === "bar" ? BarChart : chartType === "line" ? LineChart : AreaChart;

        return (
            <ResponsiveContainer width="100%" height={340}>
                <ChartComp data={dailyData} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={darkMode ? accent.primary2 : accent.primary} stopOpacity={0.9} />
                            <stop offset="55%" stopColor={darkMode ? accent.primary : accent.pink} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={darkMode ? accent.cyan : accent.primary2} stopOpacity={0.18} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={darkMode ? 0.12 : 0.35} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: darkMode ? "#c4b5fd" : "#6b7280", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: darkMode ? "#c4b5fd" : "#6b7280", fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            background: darkMode ? "rgba(10,12,20,0.94)" : "rgba(255,255,255,0.94)",
                            border: `1px solid ${darkMode ? "rgba(167,139,250,0.18)" : "rgba(139,92,246,0.16)"
                                }`,
                            borderRadius: 14,
                            backdropFilter: "blur(10px)",
                        }}
                        labelStyle={{ color: darkMode ? "#f4f4f5" : "#111827", fontWeight: 900 }}
                        formatter={(value) => [`${value} ${metricLabel}`, "Toplam"]}
                    />

                    {chartType === "bar" && <Bar dataKey="count" fill="url(#mainGrad)" radius={[10, 10, 0, 0]} />}
                    {chartType === "line" && (
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke={darkMode ? accent.primary2 : accent.primary}
                            strokeWidth={3}
                            dot={false}
                        />
                    )}
                    {chartType === "area" && (
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke={darkMode ? accent.primary2 : accent.primary}
                            strokeWidth={2}
                            fill="url(#mainGrad)"
                        />
                    )}
                </ChartComp>
            </ResponsiveContainer>
        );
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Layout>
                <Box
                    sx={{
                        minHeight: "100vh",
                        bgcolor: "background.default",
                        backgroundImage: darkMode
                            ? `
                radial-gradient(900px circle at 18% 10%, rgba(139,92,246,0.18), transparent 55%),
                radial-gradient(850px circle at 82% 40%, rgba(236,72,153,0.10), transparent 60%),
                radial-gradient(700px circle at 50% 85%, rgba(34,211,238,0.08), transparent 55%)
              `
                            : `
                radial-gradient(900px circle at 18% 10%, rgba(139,92,246,0.14), transparent 55%),
                radial-gradient(850px circle at 82% 40%, rgba(236,72,153,0.10), transparent 60%)
              `,
                    }}
                >
                    <AppBar position="sticky" elevation={0}>
                        <Toolbar sx={{ maxWidth: 1280, width: "100%", mx: "auto", gap: 1.5 }}>
                            <IconButton onClick={() => setMenuOpen(true)} edge="start">
                                <MenuIcon />
                            </IconButton>

                            <Typography variant="h6" fontWeight={950} sx={{ flex: 1 }}>
                                Evrak Yönetimi
                            </Typography>

                            <Chip
                                icon={<PersonIcon />}
                                label={adSoyad}
                                variant="outlined"
                                sx={{
                                    display: { xs: "none", sm: "inline-flex" },
                                    borderColor: darkMode ? "rgba(167,139,250,0.35)" : "rgba(139,92,246,0.25)",
                                }}
                            />

                            <IconButton onClick={toggleTheme} title="Tema">
                                {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
                            </IconButton>

                            <Button variant="contained" color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
                                Çıkış
                            </Button>
                        </Toolbar>
                    </AppBar>

                    <Drawer
                        open={menuOpen}
                        onClose={() => setMenuOpen(false)}
                        anchor="left"
                        ModalProps={{ keepMounted: true }}
                        PaperProps={{ sx: drawerPaperSx }}
                    >
                        <ModernSidebar
                            onClose={() => setMenuOpen(false)}
                            navigate={navigate}
                            currentPath={location.pathname}
                            darkMode={darkMode}
                            user={{ adSoyad, usernameRaw }}
                            perms={{
                                canSeeTahakkuk,
                                isAdminOrManager,
                                isRefika,
                                icons: {
                                    Description: <DescriptionRoundedIcon />,
                                    Place: <PlaceRoundedIcon />,
                                    Folder: <FolderRoundedIcon />,
                                    Assessment: <AssessmentRoundedIcon />,
                                    Shipping: <LocalShippingRoundedIcon />,
                                    Grid: <GridViewRoundedIcon />,
                                },
                            }}
                        />
                    </Drawer>

                    {/* ✅ DASHBOARD (DAHA MODERN) */}
                    <Box sx={{ maxWidth: 1280, mx: "auto", px: 2, py: 3 }}>
                        {(isRefika || isAdminOrManager) && (
                            <Stack spacing={2.5}>
                                {/* HERO */}
                                <Card
                                    sx={{
                                        position: "relative",
                                        overflow: "hidden",
                                        borderRadius: 4,
                                        "&:before": {
                                            content: '""',
                                            position: "absolute",
                                            inset: 0,
                                            background: darkMode
                                                ? `
                          radial-gradient(900px circle at 10% 20%, rgba(139,92,246,0.28), transparent 60%),
                          radial-gradient(700px circle at 90% 30%, rgba(236,72,153,0.16), transparent 60%),
                          radial-gradient(700px circle at 60% 120%, rgba(34,211,238,0.12), transparent 55%)
                        `
                                                : `
                          radial-gradient(900px circle at 10% 20%, rgba(139,92,246,0.20), transparent 60%),
                          radial-gradient(700px circle at 90% 30%, rgba(236,72,153,0.14), transparent 60%)
                        `,
                                            opacity: 1,
                                            pointerEvents: "none",
                                        },
                                        "&:after": {
                                            content: '""',
                                            position: "absolute",
                                            inset: 0,
                                            background: darkMode
                                                ? "linear-gradient(180deg, rgba(0,0,0,0.20), rgba(0,0,0,0.45))"
                                                : "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.85))",
                                            pointerEvents: "none",
                                        },
                                    }}
                                >
                                    <CardContent sx={{ position: "relative", zIndex: 1, py: 3 }}>
                                        <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            spacing={2.5}
                                            alignItems={{ md: "center" }}
                                            justifyContent="space-between"
                                        >
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography
                                                    variant="overline"
                                                    sx={{
                                                        letterSpacing: "0.18em",
                                                        fontWeight: 950,
                                                        opacity: 0.85,
                                                    }}
                                                >
                                                    DASHBOARD
                                                </Typography>

                                                <Typography variant="h4" fontWeight={980} sx={{ mt: 0.25, lineHeight: 1.1 }}>
                                                    Hoş geldin, {adSoyad}
                                                </Typography>

                                                <Typography sx={{ mt: 0.8, opacity: 0.82, maxWidth: 680 }}>
                                                    Son 7 güne ait genel durum, firma bazlı filtre ve hızlı aksiyonlar.
                                                </Typography>

                                                <Stack direction="row" spacing={1} sx={{ mt: 1.6, flexWrap: "wrap", rowGap: 1 }}>
                                                    <Chip
                                                        label={`Tema: ${darkMode ? "Dark" : "Light"}`}
                                                        sx={{
                                                            fontWeight: 900,
                                                            border: "1px solid",
                                                            borderColor: darkMode ? "rgba(167,139,250,0.25)" : "rgba(139,92,246,0.20)",
                                                            bgcolor: darkMode ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.08)",
                                                        }}
                                                    />
                                                    <Chip
                                                        label={`Firma: ${selectedFirma}`}
                                                        sx={{
                                                            fontWeight: 900,
                                                            border: "1px solid",
                                                            borderColor: darkMode ? "rgba(236,72,153,0.22)" : "rgba(236,72,153,0.18)",
                                                            bgcolor: darkMode ? "rgba(236,72,153,0.10)" : "rgba(236,72,153,0.07)",
                                                        }}
                                                    />
                                                    <Chip
                                                        label={`Metrik: ${metric}`}
                                                        sx={{
                                                            fontWeight: 900,
                                                            border: "1px solid",
                                                            borderColor: darkMode ? "rgba(34,211,238,0.22)" : "rgba(34,211,238,0.18)",
                                                            bgcolor: darkMode ? "rgba(34,211,238,0.10)" : "rgba(34,211,238,0.07)",
                                                        }}
                                                    />
                                                </Stack>
                                            </Box>

                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => setSelectedFirma("Hepsi")}
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        borderColor: darkMode ? "rgba(167,139,250,0.26)" : "rgba(139,92,246,0.18)",
                                                        bgcolor: darkMode ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)",
                                                    }}
                                                >
                                                    Filtreyi Sıfırla
                                                </Button>

                                                <Button
                                                    variant="contained"
                                                    onClick={() => setChartType("area")}
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: darkMode ? "rgba(139,92,246,0.90)" : accent.primary,
                                                        color: "#fff",
                                                        boxShadow: darkMode
                                                            ? "0 18px 60px rgba(139,92,246,0.18)"
                                                            : "0 18px 55px rgba(139,92,246,0.22)",
                                                        "&:hover": { bgcolor: accent.primary2 },
                                                    }}
                                                >
                                                    Modern Grafik
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                {/* KPI GRID */}
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                                        gap: 2,
                                    }}
                                >
                                    {[
                                        {
                                            title: "Bugünkü Kargo (Örnek)",
                                            value: "12",
                                            icon: <Inventory2Icon />,
                                            tint: darkMode ? "rgba(139,92,246,0.30)" : "rgba(139,92,246,0.22)",
                                            grad: `linear-gradient(90deg, ${accent.primary2}, ${accent.pink})`,
                                        },
                                        {
                                            title: "Toplam Firma",
                                            value: `${Math.max(0, firmalar.length - 1)}`,
                                            icon: <BusinessIcon />,
                                            tint: darkMode ? "rgba(236,72,153,0.24)" : "rgba(236,72,153,0.18)",
                                            grad: `linear-gradient(90deg, ${accent.pink}, ${accent.primary})`,
                                        },
                                        {
                                            title: "Kullanıcı",
                                            value: `${adSoyad}`,
                                            icon: <PersonIcon />,
                                            tint: darkMode ? "rgba(34,211,238,0.22)" : "rgba(34,211,238,0.16)",
                                            grad: `linear-gradient(90deg, ${accent.cyan}, ${accent.primary2})`,
                                        },
                                    ].map((k) => (
                                        <Card
                                            key={k.title}
                                            sx={{
                                                position: "relative",
                                                overflow: "hidden",
                                                borderRadius: 4,
                                                transition: "transform .18s ease, box-shadow .18s ease",
                                                "&:before": {
                                                    content: '""',
                                                    position: "absolute",
                                                    inset: 0,
                                                    padding: "1px",
                                                    borderRadius: "inherit",
                                                    background: k.grad,
                                                    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                                                    WebkitMaskComposite: "xor",
                                                    maskComposite: "exclude",
                                                    opacity: darkMode ? 0.55 : 0.45,
                                                    pointerEvents: "none",
                                                },
                                                "&:after": {
                                                    content: '""',
                                                    position: "absolute",
                                                    inset: 0,
                                                    background: darkMode
                                                        ? `radial-gradient(600px circle at 10% 0%, ${k.tint}, transparent 55%)`
                                                        : `radial-gradient(600px circle at 10% 0%, ${k.tint}, transparent 60%)`,
                                                    pointerEvents: "none",
                                                },
                                                "&:hover": {
                                                    transform: "translateY(-2px)",
                                                    boxShadow: darkMode
                                                        ? "0 22px 80px rgba(139,92,246,0.14)"
                                                        : "0 18px 60px rgba(139,92,246,0.18)",
                                                },
                                            }}
                                        >
                                            <CardContent sx={{ position: "relative", zIndex: 1 }}>
                                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                    <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 950 }}>
                                                        {k.title}
                                                    </Typography>

                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 3,
                                                            display: "grid",
                                                            placeItems: "center",
                                                            border: darkMode ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(139,92,246,0.14)",
                                                            bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.65)",
                                                            boxShadow: darkMode ? "0 14px 40px rgba(0,0,0,0.35)" : "0 10px 24px rgba(0,0,0,0.08)",
                                                        }}
                                                    >
                                                        {React.cloneElement(k.icon, {
                                                            style: { color: darkMode ? "rgba(196,181,253,0.95)" : accent.primary },
                                                        })}
                                                    </Box>
                                                </Stack>

                                                <Typography
                                                    variant={k.title === "Kullanıcı" ? "h6" : "h3"}
                                                    fontWeight={980}
                                                    sx={{ mt: 1.2, lineHeight: 1.1 }}
                                                    noWrap={k.title === "Kullanıcı"}
                                                >
                                                    {k.value}
                                                </Typography>

                                                {k.title !== "Kullanıcı" && (
                                                    <Box sx={{ mt: 1.2, height: 46, opacity: 0.95 }}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={dailyData}>
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="count"
                                                                    stroke={darkMode ? accent.primary2 : accent.primary}
                                                                    strokeWidth={2}
                                                                    dot={false}
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>

                                {/* CHART + FILTERS */}
                                <Card sx={{ borderRadius: 4, overflow: "hidden" }}>
                                    <CardContent sx={{ pb: 2.5 }}>
                                        <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            spacing={1.5}
                                            alignItems={{ md: "center" }}
                                            justifyContent="space-between"
                                            sx={{ mb: 1.5 }}
                                        >
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="h6" fontWeight={980}>
                                                    {metric === "kargo" ? "Günlük Kargo Sayısı" : "Günlük Evrak Adedi"}{" "}
                                                    <Typography component="span" sx={{ opacity: 0.72, fontWeight: 600 }}>
                                                        (Son 7 Gün)
                                                    </Typography>
                                                </Typography>
                                                <Typography sx={{ opacity: 0.72, mt: 0.25 }}>
                                                    Filtre ve grafik tipi değiştirerek hızlı analiz yap.
                                                </Typography>
                                            </Box>

                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                                                <Chip
                                                    label={`TOPLAM: ${totalCount} kayıt`}
                                                    sx={{
                                                        fontWeight: 950,
                                                        border: "1px solid",
                                                        borderColor: darkMode ? "rgba(167,139,250,0.35)" : "rgba(139,92,246,0.25)",
                                                        bgcolor: darkMode ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.10)",
                                                    }}
                                                />

                                                <ToggleButtonGroup
                                                    value={chartType}
                                                    exclusive
                                                    onChange={(_, v) => v && setChartType(v)}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "rgba(139,92,246,0.05)",
                                                        borderRadius: 999,
                                                        p: 0.25,
                                                    }}
                                                >
                                                    <ToggleButton value="bar" sx={{ borderRadius: 999, px: 2 }}>
                                                        Bar
                                                    </ToggleButton>
                                                    <ToggleButton value="line" sx={{ borderRadius: 999, px: 2 }}>
                                                        Line
                                                    </ToggleButton>
                                                    <ToggleButton value="area" sx={{ borderRadius: 999, px: 2 }}>
                                                        Area
                                                    </ToggleButton>
                                                </ToggleButtonGroup>
                                            </Stack>
                                        </Stack>

                                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
                                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                                <InputLabel>Metrik</InputLabel>
                                                <Select value={metric} label="Metrik" onChange={(e) => setMetric(e.target.value)}>
                                                    <MenuItem value="kargo">kargo</MenuItem>
                                                    <MenuItem value="evrak">evrak</MenuItem>
                                                </Select>
                                            </FormControl>

                                            <FormControl size="small" sx={{ minWidth: 220 }}>
                                                <InputLabel>Firma</InputLabel>
                                                <Select value={selectedFirma} label="Firma" onChange={(e) => setSelectedFirma(e.target.value)}>
                                                    {firmalar.map((f) => (
                                                        <MenuItem key={f} value={f}>
                                                            {f}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            <Box sx={{ flex: 1 }} />

                                            <Button
                                                variant="outlined"
                                                onClick={() => setSelectedFirma("Hepsi")}
                                                sx={{
                                                    borderRadius: 999,
                                                    fontWeight: 950,
                                                    borderColor: darkMode ? "rgba(167,139,250,0.26)" : "rgba(139,92,246,0.18)",
                                                    bgcolor: darkMode ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)",
                                                }}
                                            >
                                                Firma Sıfırla
                                            </Button>
                                        </Stack>

                                        <Box
                                            sx={{
                                                height: 380,
                                                position: "relative",
                                                borderRadius: 4,
                                                overflow: "hidden",
                                                border: darkMode ? "1px solid rgba(167,139,250,0.16)" : "1px solid rgba(139,92,246,0.12)",
                                                bgcolor: darkMode ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.75)",
                                            }}
                                        >
                                            {loading ? (
                                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={1.5}>
                                                    <CircularProgress />
                                                    <Typography sx={{ opacity: 0.82 }}>{metricLabel} verileri yükleniyor...</Typography>
                                                </Stack>
                                            ) : (
                                                <Box sx={{ p: 1.5 }}>
                                                    <Chart />
                                                </Box>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>

                                {/* DAILY TILES */}
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)", md: "repeat(7, 1fr)" },
                                        gap: 1.5,
                                    }}
                                >
                                    {dailyData.map((item) => (
                                        <Card
                                            key={item.date}
                                            sx={{
                                                borderRadius: 4,
                                                overflow: "hidden",
                                                position: "relative",
                                                transition: "transform .18s ease, box-shadow .18s ease",
                                                "&:after": {
                                                    content: '""',
                                                    position: "absolute",
                                                    inset: 0,
                                                    background: darkMode
                                                        ? "radial-gradient(300px circle at 20% 0%, rgba(139,92,246,0.16), transparent 60%)"
                                                        : "radial-gradient(300px circle at 20% 0%, rgba(139,92,246,0.10), transparent 65%)",
                                                    pointerEvents: "none",
                                                },
                                                "&:hover": {
                                                    transform: "translateY(-2px)",
                                                    boxShadow: darkMode ? "0 18px 60px rgba(139,92,246,0.12)" : "0 18px 55px rgba(139,92,246,0.16)",
                                                },
                                            }}
                                        >
                                            <CardContent sx={{ position: "relative", zIndex: 1, py: 1.6 }}>
                                                <Typography fontWeight={950} sx={{ opacity: 0.85 }}>
                                                    {item.label}
                                                </Typography>
                                                <Typography variant="h5" fontWeight={980} sx={{ mt: 0.6, lineHeight: 1.1 }}>
                                                    {item.count}
                                                </Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                    {metricLabel.toLowerCase()}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            </Stack>
                        )}
                    </Box>
                </Box>
            </Layout>
        </ThemeProvider>
    );
}

export default Anasayfa;