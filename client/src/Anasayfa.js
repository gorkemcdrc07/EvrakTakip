// src/pages/Anasayfa.jsx
// ✅ ETS Modern (sade) Dashboard: sadece EVRAK + 1 büyük trend grafiği + mini Top 5 + KPI
// ModernSidebar entegre + morumsu koyu tema

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
    Divider,
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
import PersonIcon from "@mui/icons-material/Person";
import BoltIcon from "@mui/icons-material/Bolt";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

function ETSMark({ size = 28 }) {
    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: 2.2,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(216,180,254,0.22)",
                background:
                    "radial-gradient(120% 120% at 10% 10%, rgba(139,92,246,0.26), rgba(0,0,0,0) 60%), rgba(255,255,255,0.04)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            }}
            aria-hidden="true"
        >
            <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
                <path
                    d="M8 4h7l3 3v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                    stroke="rgba(233,213,255,0.85)"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                />
                <path d="M15 4v3h3" stroke="rgba(233,213,255,0.85)" strokeWidth="1.6" strokeLinejoin="round" />
                <path
                    d="M9 11h6M9 14h6M9 17h4"
                    stroke="rgba(233,213,255,0.55)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            </svg>
        </Box>
    );
}

export default function Anasayfa() {
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

    const accent = useMemo(
        () => ({
            primary: "#8B5CF6",
            primary2: "#A78BFA",
            pink: "#EC4899",
            cyan: "#22D3EE",
        }),
        []
    );

    // SADE: sadece evrak
    const metricLabel = "Evrak";

    const [chartType, setChartType] = useState("area"); // area | line | bar (opsiyon)
    const [rangeDays, setRangeDays] = useState(14); // 7 | 14 | 30

    const [loading, setLoading] = useState(true);
    const [dailyData, setDailyData] = useState([]);
    const [firmTotals, setFirmTotals] = useState([]);
    const [firmalar, setFirmalar] = useState(["Hepsi"]);
    const [selectedFirma, setSelectedFirma] = useState("Hepsi");

    // --- ROL ---
    const isRefika = usernameLower === "refika";
    const isAdminOrManager = ["yaren", "ozge", "mehmet"].includes(usernameLower);

    const tahakkukAllowedUsers = ["aleynagncl", "cagla123", "didem", "canan"].map((u) => u.trim().toLowerCase());
    const tahakkukBlockedUsers = ["yaren", "ozge", "refika", "mehmet"];
    const canSeeTahakkuk =
        tahakkukAllowedUsers.includes(usernameLower) && !tahakkukBlockedUsers.includes(usernameLower);

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
            typography: { fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif` },
            components: {
                MuiAppBar: {
                    styleOverrides: {
                        root: {
                            background: mode === "dark" ? "rgba(10,12,20,0.72)" : "rgba(255,255,255,0.78)",
                            backdropFilter: "blur(14px)",
                            borderBottom: mode === "dark" ? "1px solid rgba(167,139,250,0.16)" : "1px solid rgba(139,92,246,0.12)",
                            boxShadow: mode === "dark" ? "0 10px 40px rgba(139,92,246,0.10)" : "0 10px 30px rgba(139,92,246,0.12)",
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            border: mode === "dark" ? "1px solid rgba(167,139,250,0.18)" : "1px solid rgba(139,92,246,0.16)",
                            background:
                                mode === "dark"
                                    ? "linear-gradient(180deg, rgba(139,92,246,0.10) 0%, rgba(255,255,255,0.04) 55%, rgba(0,0,0,0.12) 120%)"
                                    : "linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(255,255,255,0.92) 55%)",
                            backdropFilter: "blur(12px)",
                            boxShadow: mode === "dark" ? "0 18px 70px rgba(0,0,0,0.55)" : "0 18px 50px rgba(139,92,246,0.16)",
                        },
                    },
                },
                MuiButton: { styleOverrides: { root: { textTransform: "none", borderRadius: 14, fontWeight: 900 } } },
                MuiToggleButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 14,
                            borderColor: mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
                            "&.Mui-selected": {
                                backgroundColor: mode === "dark" ? "rgba(139,92,246,0.22)" : "rgba(139,92,246,0.16)",
                                borderColor: mode === "dark" ? "rgba(167,139,250,0.35)" : "rgba(139,92,246,0.25)",
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

    const drawerPaperSx = useMemo(
        () => ({
            bgcolor: darkMode ? "rgba(10,12,20,0.78)" : "rgba(255,255,255,0.92)",
            color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(17,24,39,0.92)",
            backdropFilter: "blur(16px)",
            borderRight: darkMode ? "1px solid rgba(167,139,250,0.16)" : "1px solid rgba(139,92,246,0.12)",
            boxShadow: darkMode ? "0 30px 90px rgba(0,0,0,0.60)" : "0 18px 60px rgba(139,92,246,0.14)",
        }),
        [darkMode]
    );

    // firmalar
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

    // daily + firm totals (ONLY evrak)
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const today = new Date();
                const start = new Date();
                start.setDate(today.getDate() - (rangeDays - 1));

                const gunIsimleri = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

                const dayMap = {};
                for (let i = 0; i < rangeDays; i++) {
                    const d = new Date(start);
                    d.setDate(d.getDate() + i);
                    const key = d.toISOString().split("T")[0];
                    const label = gunIsimleri[d.getDay()];
                    dayMap[key] = { date: key, label, count: 0 };
                }

                let query = supabase
                    .from("kargo_bilgileri")
                    .select("tarih, kargo_firmasi, evrak_adedi")
                    .gte("tarih", start.toISOString().split("T")[0])
                    .lte("tarih", today.toISOString().split("T")[0]);

                if (selectedFirma !== "Hepsi") query = query.ilike("kargo_firmasi", selectedFirma);

                const { data, error } = await query;
                if (error) throw error;

                const firmMap = new Map();
                (data ?? []).forEach(({ tarih, kargo_firmasi, evrak_adedi }) => {
                    const val = Number(evrak_adedi || 0);
                    if (dayMap[tarih]) dayMap[tarih].count += val;

                    const firm = (kargo_firmasi || "BİLİNMİYOR").trim().toUpperCase();
                    firmMap.set(firm, (firmMap.get(firm) || 0) + val);
                });

                const daily = Object.values(dayMap);
                setDailyData(daily);

                const firmsSorted = Array.from(firmMap.entries())
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);

                setFirmTotals(firmsSorted);
            } catch (e) {
                console.error("Veri alınamadı", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [rangeDays, selectedFirma]);

    // KPIs
    const totalCount = useMemo(() => dailyData.reduce((s, i) => s + (i.count || 0), 0), [dailyData]);
    const todayCount = useMemo(() => {
        const todayKey = new Date().toISOString().split("T")[0];
        return dailyData.find((d) => d.date === todayKey)?.count ?? 0;
    }, [dailyData]);
    const avgCount = useMemo(() => (dailyData.length ? Math.round((totalCount / dailyData.length) * 10) / 10 : 0), [dailyData, totalCount]);
    const maxDay = useMemo(() => (dailyData.length ? dailyData.reduce((a, b) => (b.count > a.count ? b : a), dailyData[0]) : null), [dailyData]);

    const top5 = useMemo(() => firmTotals.slice(0, 5).reverse(), [firmTotals]);

    const dateRangeText = useMemo(() => {
        if (!dailyData.length) return `Son ${rangeDays} gün`;
        const first = dailyData[0].date;
        const last = dailyData[dailyData.length - 1].date;
        return `${first} → ${last}`;
    }, [dailyData, rangeDays]);

    const MainChart = useCallback(() => {
        const ChartComp = chartType === "bar" ? BarChart : chartType === "line" ? LineChart : AreaChart;

        return (
            <ResponsiveContainer width="100%" height="100%">
                <ChartComp data={dailyData} margin={{ top: 12, right: 26, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={darkMode ? accent.primary2 : accent.primary} stopOpacity={0.95} />
                            <stop offset="55%" stopColor={darkMode ? accent.primary : accent.pink} stopOpacity={0.30} />
                            <stop offset="100%" stopColor={darkMode ? accent.cyan : accent.primary2} stopOpacity={0.12} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={darkMode ? 0.12 : 0.28} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: darkMode ? "#c4b5fd" : "#6b7280", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: darkMode ? "#c4b5fd" : "#6b7280", fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            background: darkMode ? "rgba(10,12,20,0.94)" : "rgba(255,255,255,0.94)",
                            border: `1px solid ${darkMode ? "rgba(167,139,250,0.18)" : "rgba(139,92,246,0.16)"}`,
                            borderRadius: 14,
                            backdropFilter: "blur(10px)",
                        }}
                        labelStyle={{ color: darkMode ? "#f4f4f5" : "#111827", fontWeight: 900 }}
                        formatter={(value) => [`${value} ${metricLabel}`, "Toplam"]}
                    />

                    {chartType === "bar" && <Bar dataKey="count" fill="url(#mainGrad)" radius={[10, 10, 0, 0]} />}
                    {chartType === "line" && <Line type="monotone" dataKey="count" stroke={accent.primary2} strokeWidth={3} dot={false} />}
                    {chartType === "area" && <Area type="monotone" dataKey="count" stroke={accent.primary2} strokeWidth={2} fill="url(#mainGrad)" />}
                </ChartComp>
            </ResponsiveContainer>
        );
    }, [chartType, dailyData, darkMode, accent, metricLabel]);

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
                    {/* AppBar */}
                    <AppBar position="sticky" elevation={0}>
                        <Toolbar sx={{ maxWidth: 1400, width: "100%", mx: "auto", gap: 1.5 }}>
                            <IconButton onClick={() => setMenuOpen(true)} edge="start">
                                <MenuIcon />
                            </IconButton>

                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                                <ETSMark />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                        variant="h6"
                                        fontWeight={980}
                                        noWrap
                                        sx={{
                                            lineHeight: 1.05,
                                            background: darkMode
                                                ? "linear-gradient(90deg, rgba(233,213,255,0.95), rgba(167,139,250,0.95), rgba(34,211,238,0.85))"
                                                : "linear-gradient(90deg, rgba(76,29,149,1), rgba(124,58,237,1))",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent",
                                        }}
                                    >
                                        ETS • Evrak Dashboard
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.72 }} noWrap>
                                        {dateRangeText} • {selectedFirma === "Hepsi" ? "Tüm firmalar" : selectedFirma}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Chip
                                icon={<PersonIcon />}
                                label={adSoyad}
                                variant="outlined"
                                sx={{
                                    display: { xs: "none", sm: "inline-flex" },
                                    borderColor: darkMode ? "rgba(167,139,250,0.35)" : "rgba(139,92,246,0.25)",
                                }}
                            />

                            <IconButton onClick={() => setDarkMode((p) => !p)} title="Tema">
                                {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
                            </IconButton>

                            <Button variant="contained" color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
                                Çıkış
                            </Button>
                        </Toolbar>
                    </AppBar>

                    {/* Drawer */}
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

                    {/* Content */}
                    <Box sx={{ maxWidth: 1400, mx: "auto", px: 2, py: 3 }}>
                        {(isRefika || isAdminOrManager) && (
                            <Stack spacing={2.2}>
                                {/* Header card (sade) */}
                                <Card sx={{ borderRadius: 4, overflow: "hidden" }}>
                                    <CardContent sx={{ position: "relative" }}>
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
                                            <Box>
                                                <Typography
                                                    variant="overline"
                                                    sx={{ letterSpacing: "0.22em", fontWeight: 950, opacity: 0.9, display: "inline-flex", alignItems: "center", gap: 1 }}
                                                >
                                                    <CalendarMonthIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                                                    SADE ANALİZ
                                                </Typography>
                                                <Typography variant="h5" fontWeight={980} sx={{ mt: 0.25 }}>
                                                    Hoş geldin, {adSoyad}
                                                </Typography>
                                                <Typography sx={{ mt: 0.6, opacity: 0.75 }}>
                                                    Evrak trendini hızlıca gör, firma filtresiyle incele.
                                                </Typography>
                                            </Box>

                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                                    <InputLabel>Aralık</InputLabel>
                                                    <Select value={rangeDays} label="Aralık" onChange={(e) => setRangeDays(Number(e.target.value))}>
                                                        <MenuItem value={7}>Son 7 gün</MenuItem>
                                                        <MenuItem value={14}>Son 14 gün</MenuItem>
                                                        <MenuItem value={30}>Son 30 gün</MenuItem>
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

                                                <ToggleButtonGroup
                                                    value={chartType}
                                                    exclusive
                                                    onChange={(_, v) => v && setChartType(v)}
                                                    size="small"
                                                    sx={{ bgcolor: "rgba(255,255,255,0.03)", borderRadius: 999, p: 0.25 }}
                                                >
                                                    <ToggleButton value="area" sx={{ borderRadius: 999, px: 2 }}>
                                                        Area
                                                    </ToggleButton>
                                                    <ToggleButton value="line" sx={{ borderRadius: 999, px: 2 }}>
                                                        Line
                                                    </ToggleButton>
                                                    <ToggleButton value="bar" sx={{ borderRadius: 999, px: 2 }}>
                                                        Bar
                                                    </ToggleButton>
                                                </ToggleButtonGroup>

                                                <Button
                                                    variant="outlined"
                                                    onClick={() => setSelectedFirma("Hepsi")}
                                                    sx={{ borderRadius: 999, borderColor: "rgba(167,139,250,0.26)", bgcolor: "rgba(139,92,246,0.08)" }}
                                                >
                                                    Sıfırla
                                                </Button>
                                            </Stack>
                                        </Stack>

                                        <Box
                                            sx={{
                                                position: "absolute",
                                                inset: 0,
                                                pointerEvents: "none",
                                                background:
                                                    "radial-gradient(900px circle at 10% 10%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(900px circle at 90% 60%, rgba(236,72,153,0.10), transparent 60%)",
                                                opacity: 0.9,
                                            }}
                                        />
                                    </CardContent>
                                </Card>

                                {/* KPI row */}
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(4, 1fr)" },
                                        gap: 2,
                                    }}
                                >
                                    {[
                                        { title: "Bugün", value: todayCount, icon: <DescriptionRoundedIcon />, sub: "evrak" },
                                        { title: `Toplam (${rangeDays}g)`, value: totalCount, icon: <AssessmentRoundedIcon />, sub: "evrak" },
                                        { title: "Ortalama", value: avgCount, icon: <BoltIcon />, sub: "evrak/gün" },
                                        { title: "Pik Gün", value: maxDay ? `${maxDay.label} • ${maxDay.count}` : "-", icon: <AutoGraphIcon />, sub: "en yoğun" },
                                    ].map((k) => (
                                        <Card key={k.title} sx={{ borderRadius: 4, overflow: "hidden", position: "relative" }}>
                                            <CardContent sx={{ position: "relative", zIndex: 1 }}>
                                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                    <Typography variant="overline" sx={{ opacity: 0.84, fontWeight: 950 }}>
                                                        {k.title}
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 3,
                                                            display: "grid",
                                                            placeItems: "center",
                                                            border: "1px solid rgba(167,139,250,0.18)",
                                                            bgcolor: "rgba(255,255,255,0.03)",
                                                        }}
                                                    >
                                                        {React.cloneElement(k.icon, { style: { color: "rgba(196,181,253,0.95)" } })}
                                                    </Box>
                                                </Stack>

                                                <Typography variant={k.title === "Pik Gün" ? "h6" : "h3"} fontWeight={980} sx={{ mt: 1.1, lineHeight: 1.1 }} noWrap>
                                                    {k.value}
                                                </Typography>

                                                <Typography variant="caption" sx={{ opacity: 0.72 }}>
                                                    {k.sub}
                                                </Typography>
                                            </CardContent>

                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    pointerEvents: "none",
                                                    background: "radial-gradient(520px circle at 10% 0%, rgba(139,92,246,0.18), transparent 55%)",
                                                }}
                                            />
                                        </Card>
                                    ))}
                                </Box>

                                {/* Main chart + mini Top5 (tek satır, sade) */}
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
                                        gap: 2,
                                        alignItems: "stretch",
                                    }}
                                >
                                    {/* Main Chart */}
                                    <Card sx={{ borderRadius: 4, overflow: "hidden" }}>
                                        <CardContent sx={{ pb: 2.5 }}>
                                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={980}>
                                                        Evrak Trend
                                                    </Typography>
                                                    <Typography sx={{ opacity: 0.72 }}>Günlük toplam evrak adedi</Typography>
                                                </Box>
                                                <Chip
                                                    label={`TOPLAM: ${totalCount}`}
                                                    sx={{ fontWeight: 950, border: "1px solid rgba(167,139,250,0.35)", bgcolor: "rgba(139,92,246,0.14)" }}
                                                />
                                            </Stack>

                                            <Box
                                                sx={{
                                                    height: { xs: 380, md: 460 },
                                                    position: "relative",
                                                    borderRadius: 4,
                                                    overflow: "hidden",
                                                    border: "1px solid rgba(167,139,250,0.16)",
                                                    bgcolor: "rgba(255,255,255,0.02)",
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        pointerEvents: "none",
                                                        background:
                                                            "radial-gradient(900px circle at 10% 10%, rgba(139,92,246,0.16), transparent 60%), radial-gradient(900px circle at 90% 60%, rgba(236,72,153,0.10), transparent 60%)",
                                                    }}
                                                />

                                                {loading ? (
                                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", position: "relative" }} spacing={1.5}>
                                                        <CircularProgress />
                                                        <Typography sx={{ opacity: 0.82 }}>Evrak verileri yükleniyor...</Typography>
                                                    </Stack>
                                                ) : (
                                                    <Box sx={{ p: 1.5, height: "100%", position: "relative" }}>
                                                        <MainChart />
                                                    </Box>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>

                                    {/* Mini Top 5 */}
                                    <Card sx={{ borderRadius: 4, overflow: "hidden" }}>
                                        <CardContent>
                                            <Typography variant="h6" fontWeight={980}>
                                                Top 5 Firma
                                            </Typography>
                                            <Typography sx={{ opacity: 0.72, mt: 0.2 }}>Evrak toplamı</Typography>

                                            <Divider sx={{ my: 1.6, borderColor: "rgba(167,139,250,0.14)" }} />

                                            <Box sx={{ height: { xs: 260, lg: 360 } }}>
                                                {loading ? (
                                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={1.2}>
                                                        <CircularProgress size={26} />
                                                        <Typography sx={{ opacity: 0.82 }}>Yükleniyor...</Typography>
                                                    </Stack>
                                                ) : top5.length === 0 ? (
                                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                                        <Typography sx={{ opacity: 0.82 }}>Veri yok</Typography>
                                                    </Stack>
                                                ) : (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={top5} layout="vertical" margin={{ top: 6, right: 18, bottom: 6, left: 12 }}>
                                                            <defs>
                                                                <linearGradient id="miniGrad" x1="0" y1="0" x2="1" y2="0">
                                                                    <stop offset="0%" stopColor={accent.primary2} stopOpacity={0.9} />
                                                                    <stop offset="65%" stopColor={accent.pink} stopOpacity={0.26} />
                                                                    <stop offset="100%" stopColor={accent.cyan} stopOpacity={0.18} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} horizontal={false} />
                                                            <XAxis type="number" tick={{ fill: "#c4b5fd", fontSize: 12 }} />
                                                            <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#c4b5fd", fontSize: 12 }} />
                                                            <Tooltip
                                                                contentStyle={{
                                                                    background: "rgba(10,12,20,0.94)",
                                                                    border: "1px solid rgba(167,139,250,0.18)",
                                                                    borderRadius: 14,
                                                                }}
                                                                formatter={(v) => [`${v} evrak`, "Toplam"]}
                                                            />
                                                            <Bar dataKey="value" fill="url(#miniGrad)" radius={[10, 10, 10, 10]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                )}
                                            </Box>

                                            <Box sx={{ mt: 1.2 }}>
                                                <Chip
                                                    label={selectedFirma === "Hepsi" ? "Tüm firmalar" : `Filtre: ${selectedFirma}`}
                                                    sx={{ fontWeight: 900, border: "1px solid rgba(167,139,250,0.22)", bgcolor: "rgba(139,92,246,0.10)" }}
                                                />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Box>
                            </Stack>
                        )}
                    </Box>
                </Box>
            </Layout>
        </ThemeProvider>
    );
}