// src/pages/Anasayfa.jsx

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
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import DonutLargeRoundedIcon from "@mui/icons-material/DonutLargeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";

function ETSMark({ size = 28, darkMode }) {
    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.08)",
                background: darkMode ? "rgba(255,255,255,0.04)" : "#fff",
            }}
        >
            <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
                <path
                    d="M8 4h7l3 3v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                    stroke={darkMode ? "rgba(255,255,255,0.86)" : "#111827"}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                />
                <path
                    d="M15 4v3h3"
                    stroke={darkMode ? "rgba(255,255,255,0.86)" : "#111827"}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                />
                <path
                    d="M9 11h6M9 14h6M9 17h4"
                    stroke={darkMode ? "rgba(255,255,255,0.52)" : "rgba(17,24,39,0.55)"}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            </svg>
        </Box>
    );
}

function InsightMiniCard({ title, value, sub, icon, darkMode }) {
    return (
        <Box
            sx={{
                p: 1.6,
                borderRadius: 3,
                bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(15,23,42,0.05)",
                minHeight: 112,
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.75 }}>
                        {title}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 22,
                            fontWeight: 800,
                            lineHeight: 1.15,
                            letterSpacing: "-0.02em",
                            wordBreak: "break-word",
                        }}
                    >
                        {value}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.8 }}>
                        {sub}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2.5,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(99,102,241,0.08)",
                        color: "primary.main",
                        flexShrink: 0,
                        ml: 1,
                    }}
                >
                    {icon}
                </Box>
            </Stack>
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

    const [chartType, setChartType] = useState("area");
    const [rangeDays, setRangeDays] = useState(14);

    const [loading, setLoading] = useState(true);
    const [dailyData, setDailyData] = useState([]);
    const [firmTotals, setFirmTotals] = useState([]);
    const [firmalar, setFirmalar] = useState(["Hepsi"]);
    const [selectedFirma, setSelectedFirma] = useState("Hepsi");

    const isRefika = usernameLower === "refika";
    const isAdminOrManager = ["yaren", "ozge", "mehmet", "rabia"].includes(usernameLower);

    const tahakkukAllowedUsers = ["aleynagncl", "cagla123", "didem", "canan"].map((u) => u.trim().toLowerCase());
    const tahakkukBlockedUsers = ["yaren", "ozge", "refika", "mehmet"];
    const canSeeTahakkuk =
        tahakkukAllowedUsers.includes(usernameLower) && !tahakkukBlockedUsers.includes(usernameLower);

    const theme = useMemo(() => {
        const mode = darkMode ? "dark" : "light";

        return createTheme({
            palette: {
                mode,
                primary: { main: "#6366F1" },
                ...(mode === "dark"
                    ? {
                        background: {
                            default: "#0B1120",
                            paper: "#111827",
                        },
                        text: {
                            primary: "rgba(255,255,255,0.94)",
                            secondary: "rgba(255,255,255,0.62)",
                        },
                    }
                    : {
                        background: {
                            default: "#F8FAFC",
                            paper: "#FFFFFF",
                        },
                        text: {
                            primary: "#0F172A",
                            secondary: "rgba(15,23,42,0.62)",
                        },
                    }),
            },
            shape: { borderRadius: 16 },
            typography: {
                fontFamily: `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
                h3: { fontWeight: 800, letterSpacing: "-0.03em" },
                h4: { fontWeight: 800, letterSpacing: "-0.03em" },
                h5: { fontWeight: 750, letterSpacing: "-0.02em" },
                h6: { fontWeight: 700, letterSpacing: "-0.02em" },
                button: { fontWeight: 700, textTransform: "none" },
            },
            components: {
                MuiCssBaseline: {
                    styleOverrides: {
                        body: {
                            backgroundColor: mode === "dark" ? "#0B1120" : "#F8FAFC",
                        },
                    },
                },
                MuiAppBar: {
                    styleOverrides: {
                        root: {
                            background: mode === "dark" ? "rgba(11,17,32,0.86)" : "rgba(248,250,252,0.86)",
                            backdropFilter: "blur(10px)",
                            boxShadow: "none",
                            borderBottom:
                                mode === "dark"
                                    ? "1px solid rgba(255,255,255,0.06)"
                                    : "1px solid rgba(15,23,42,0.06)",
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            backgroundColor: mode === "dark" ? "#111827" : "#FFFFFF",
                            boxShadow: mode === "dark" ? "none" : "0 1px 2px rgba(15,23,42,0.05)",
                            border:
                                mode === "dark"
                                    ? "1px solid rgba(255,255,255,0.06)"
                                    : "1px solid rgba(15,23,42,0.06)",
                        },
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 12,
                            minHeight: 40,
                        },
                    },
                },
                MuiChip: {
                    styleOverrides: {
                        root: {
                            borderRadius: 999,
                            fontWeight: 600,
                        },
                    },
                },
                MuiToggleButton: {
                    styleOverrides: {
                        root: {
                            textTransform: "none",
                            borderRadius: 10,
                            paddingInline: 14,
                        },
                    },
                },
            },
        });
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem("theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    const handleLogout = useCallback(() => {
        localStorage.clear();
        navigate("/login");
    }, [navigate]);

    const drawerPaperSx = useMemo(
        () => ({
            bgcolor: darkMode ? "#0F172A" : "#FFFFFF",
            color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
            borderRight: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)",
            boxShadow: "none",
        }),
        [darkMode]
    );

    const formatTRDate = useCallback((iso) => {
        if (!iso) return "";
        const dt = new Date(`${iso}T00:00:00`);
        return dt.toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }, []);

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

                if (selectedFirma !== "Hepsi") {
                    query = query.ilike("kargo_firmasi", selectedFirma);
                }

                const { data, error } = await query;
                if (error) throw error;

                const firmMap = new Map();

                (data ?? []).forEach(({ tarih, kargo_firmasi, evrak_adedi }) => {
                    const val = Number(evrak_adedi || 0);

                    if (dayMap[tarih]) {
                        dayMap[tarih].count += val;
                    }

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

    const totalCount = useMemo(() => dailyData.reduce((sum, item) => sum + (item.count || 0), 0), [dailyData]);

    const todayCount = useMemo(() => {
        const todayKey = new Date().toISOString().split("T")[0];
        return dailyData.find((d) => d.date === todayKey)?.count ?? 0;
    }, [dailyData]);

    const avgCount = useMemo(() => {
        if (!dailyData.length) return 0;
        return Math.round((totalCount / dailyData.length) * 10) / 10;
    }, [dailyData, totalCount]);

    const maxDay = useMemo(() => {
        if (!dailyData.length) return null;
        return dailyData.reduce((a, b) => (b.count > a.count ? b : a), dailyData[0]);
    }, [dailyData]);

    const minDay = useMemo(() => {
        if (!dailyData.length) return null;
        return dailyData.reduce((a, b) => (b.count < a.count ? b : a), dailyData[0]);
    }, [dailyData]);

    const top5 = useMemo(() => firmTotals.slice(0, 5).reverse(), [firmTotals]);

    const dateRangeText = useMemo(() => {
        if (!dailyData.length) return `Son ${rangeDays} gün`;
        const first = formatTRDate(dailyData[0].date);
        const last = formatTRDate(dailyData[dailyData.length - 1].date);
        return `${first} - ${last}`;
    }, [dailyData, rangeDays, formatTRDate]);

    const yesterdayCount = useMemo(() => {
        if (dailyData.length < 2) return 0;
        return dailyData[dailyData.length - 2]?.count ?? 0;
    }, [dailyData]);

    const dayChange = useMemo(() => {
        const diff = todayCount - yesterdayCount;
        const pct = yesterdayCount > 0 ? (diff / yesterdayCount) * 100 : 0;
        return {
            diff,
            pct: Math.round(pct * 10) / 10,
        };
    }, [todayCount, yesterdayCount]);

    const activeDays = useMemo(() => dailyData.filter((d) => Number(d.count || 0) > 0).length, [dailyData]);

    const zeroDays = useMemo(() => dailyData.filter((d) => Number(d.count || 0) === 0).length, [dailyData]);

    const topFirmShare = useMemo(() => {
        if (!firmTotals.length || !totalCount) return 0;
        return Math.round((firmTotals[0].value / totalCount) * 1000) / 10;
    }, [firmTotals, totalCount]);

    const top3Share = useMemo(() => {
        if (!firmTotals.length || !totalCount) return 0;
        const top3 = firmTotals.slice(0, 3).reduce((sum, f) => sum + f.value, 0);
        return Math.round((top3 / totalCount) * 1000) / 10;
    }, [firmTotals, totalCount]);

    const weekdayStats = useMemo(() => {
        const map = new Map();

        dailyData.forEach((d) => {
            const prev = map.get(d.label) || { total: 0, count: 0 };
            map.set(d.label, {
                total: prev.total + d.count,
                count: prev.count + 1,
            });
        });

        const arr = Array.from(map.entries()).map(([label, val]) => ({
            label,
            avg: val.count ? val.total / val.count : 0,
        }));

        arr.sort((a, b) => b.avg - a.avg);

        return {
            best: arr[0] || null,
            worst: arr[arr.length - 1] || null,
        };
    }, [dailyData]);

    const volatilityScore = useMemo(() => {
        if (!dailyData.length || !avgCount) return 0;
        const variance =
            dailyData.reduce((sum, d) => sum + Math.pow((d.count || 0) - avgCount, 2), 0) / dailyData.length;
        const std = Math.sqrt(variance);
        return Math.round((std / avgCount) * 100);
    }, [dailyData, avgCount]);

    const volatilityLabel = useMemo(() => {
        if (volatilityScore < 20) return "Dengeli";
        if (volatilityScore < 40) return "Orta dalgalı";
        return "Dalgalı";
    }, [volatilityScore]);

    const last7Avg = useMemo(() => {
        if (!dailyData.length) return 0;
        const slice = dailyData.slice(-7);
        if (!slice.length) return 0;
        const total = slice.reduce((sum, d) => sum + (d.count || 0), 0);
        return Math.round((total / slice.length) * 10) / 10;
    }, [dailyData]);

    const prev7Avg = useMemo(() => {
        if (dailyData.length <= 7) return 0;
        const slice = dailyData.slice(-14, -7);
        if (!slice.length) return 0;
        const total = slice.reduce((sum, d) => sum + (d.count || 0), 0);
        return Math.round((total / slice.length) * 10) / 10;
    }, [dailyData]);

    const trendDirection = useMemo(() => {
        if (!dailyData.length) return "Stabil";
        if (!prev7Avg) {
            if (last7Avg > avgCount) return "Yükselişte";
            if (last7Avg < avgCount) return "Düşüşte";
            return "Stabil";
        }

        const ratio = ((last7Avg - prev7Avg) / prev7Avg) * 100;
        if (ratio > 8) return "Yükselişte";
        if (ratio < -8) return "Düşüşte";
        return "Stabil";
    }, [dailyData, last7Avg, prev7Avg, avgCount]);

    const trendDeltaPct = useMemo(() => {
        if (!prev7Avg) return 0;
        return Math.round((((last7Avg - prev7Avg) / prev7Avg) * 100) * 10) / 10;
    }, [last7Avg, prev7Avg]);

    const MainChart = useCallback(() => {
        const ChartComp = chartType === "bar" ? BarChart : chartType === "line" ? LineChart : AreaChart;

        return (
            <ResponsiveContainer width="100%" height="100%">
                <ChartComp data={dailyData} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="mainArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#6366F1" stopOpacity={0.04} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}
                    />

                    <XAxis
                        dataKey="label"
                        tick={{ fill: darkMode ? "#CBD5E1" : "#64748B", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />

                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: darkMode ? "#CBD5E1" : "#64748B", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />

                    <Tooltip
                        contentStyle={{
                            background: darkMode ? "#111827" : "#FFFFFF",
                            border: darkMode
                                ? "1px solid rgba(255,255,255,0.08)"
                                : "1px solid rgba(15,23,42,0.08)",
                            borderRadius: 12,
                            boxShadow: "none",
                        }}
                        formatter={(value) => [`${value} evrak`, "Toplam"]}
                    />

                    {chartType === "bar" && <Bar dataKey="count" fill="#6366F1" radius={[8, 8, 0, 0]} />}

                    {chartType === "line" && (
                        <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2.5} dot={false} />
                    )}

                    {chartType === "area" && (
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#6366F1"
                            strokeWidth={2.2}
                            fill="url(#mainArea)"
                        />
                    )}
                </ChartComp>
            </ResponsiveContainer>
        );
    }, [chartType, dailyData, darkMode]);

    const statCards = [
        {
            title: "Bugün",
            value: todayCount,
            sub: "güncel evrak",
            icon: <DescriptionRoundedIcon fontSize="small" />,
        },
        {
            title: "Toplam",
            value: totalCount,
            sub: `${rangeDays} günlük toplam`,
            icon: <AssessmentRoundedIcon fontSize="small" />,
        },
        {
            title: "Ortalama",
            value: avgCount,
            sub: "evrak / gün",
            icon: <BoltIcon fontSize="small" />,
        },
        {
            title: "Pik Gün",
            value: maxDay ? `${maxDay.label} • ${maxDay.count}` : "-",
            sub: "en yoğun gün",
            icon: <AutoGraphIcon fontSize="small" />,
        },
    ];

    const insightCards = [
        {
            title: "Bugün vs Dün",
            value: `${dayChange.diff >= 0 ? "+" : ""}${dayChange.diff}`,
            sub: `${dayChange.pct >= 0 ? "+" : ""}${dayChange.pct}% değişim`,
            icon: dayChange.diff >= 0 ? <TrendingUpRoundedIcon fontSize="small" /> : <TrendingDownRoundedIcon fontSize="small" />,
        },
        {
            title: "Trend",
            value: trendDirection,
            sub: prev7Avg ? `${trendDeltaPct >= 0 ? "+" : ""}${trendDeltaPct}% / önceki 7 gün` : "ilk dönem kıyaslaması yok",
            icon: <InsightsRoundedIcon fontSize="small" />,
        },
        {
            title: "Aktif Gün",
            value: `${activeDays} / ${dailyData.length}`,
            sub: `${zeroDays} gün sıfır kayıt`,
            icon: <CalendarMonthRoundedIcon fontSize="small" />,
        },
        {
            title: "Dalgalanma",
            value: volatilityLabel,
            sub: `skor: ${volatilityScore}`,
            icon: <AutoGraphIcon fontSize="small" />,
        },
        {
            title: "Top Firma Payı",
            value: `%${topFirmShare}`,
            sub: firmTotals[0]?.name ?? "-",
            icon: <DonutLargeRoundedIcon fontSize="small" />,
        },
        {
            title: "Top 3 Yoğunluğu",
            value: `%${top3Share}`,
            sub: "toplam pay",
            icon: <AssessmentRoundedIcon fontSize="small" />,
        },
        {
            title: "En Güçlü Gün",
            value: weekdayStats.best?.label ?? "-",
            sub: `ortalama ${weekdayStats.best ? weekdayStats.best.avg.toFixed(1) : 0} evrak`,
            icon: <TrendingUpRoundedIcon fontSize="small" />,
        },
        {
            title: "En Sakin Gün",
            value: weekdayStats.worst?.label ?? "-",
            sub: `minimum ${minDay?.count ?? 0} evrak`,
            icon: <TrendingDownRoundedIcon fontSize="small" />,
        },
    ];

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Layout>
                <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
                    <AppBar position="sticky" elevation={0}>
                        <Toolbar sx={{ maxWidth: 1400, width: "100%", mx: "auto", gap: 1.5 }}>
                            <IconButton onClick={() => setMenuOpen(true)} edge="start">
                                <MenuIcon />
                            </IconButton>

                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                                <ETSMark darkMode={darkMode} />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={800} noWrap>
                                        ETS Evrak Dashboard
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
                                        {selectedFirma === "Hepsi" ? "Tüm firmalar" : selectedFirma}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Chip
                                icon={<PersonIcon />}
                                label={adSoyad}
                                variant="outlined"
                                sx={{ display: { xs: "none", sm: "inline-flex" } }}
                            />

                            <IconButton onClick={() => setDarkMode((prev) => !prev)} title="Tema değiştir">
                                {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
                            </IconButton>

                            <Button variant="outlined" startIcon={<LogoutIcon />} onClick={handleLogout}>
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

                    <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
                        {(isRefika || isAdminOrManager) && (
                            <Stack spacing={2}>
                                <Card sx={{ borderRadius: 4 }}>
                                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                        <Stack
                                            direction={{ xs: "column", lg: "row" }}
                                            spacing={2}
                                            justifyContent="space-between"
                                            alignItems={{ lg: "center" }}
                                        >
                                            <Box>
                                                <Typography variant="h4" sx={{ fontSize: { xs: 28, md: 34 }, mb: 0.75 }}>
                                                    Evrak akışı
                                                </Typography>
                                                <Typography sx={{ color: "text.secondary", maxWidth: 680 }}>
                                                    Günlük evrak hareketini, firma dağılımını ve yoğunluk trendini sade
                                                    bir görünümle takip et.
                                                </Typography>
                                            </Box>

                                            <Stack
                                                direction={{ xs: "column", sm: "row" }}
                                                spacing={1}
                                                useFlexGap
                                                flexWrap="wrap"
                                            >
                                                <FormControl size="small" sx={{ minWidth: 130 }}>
                                                    <InputLabel>Aralık</InputLabel>
                                                    <Select
                                                        value={rangeDays}
                                                        label="Aralık"
                                                        onChange={(e) => setRangeDays(Number(e.target.value))}
                                                    >
                                                        <MenuItem value={7}>7 Gün</MenuItem>
                                                        <MenuItem value={14}>14 Gün</MenuItem>
                                                        <MenuItem value={30}>30 Gün</MenuItem>
                                                    </Select>
                                                </FormControl>

                                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                                    <InputLabel>Firma</InputLabel>
                                                    <Select
                                                        value={selectedFirma}
                                                        label="Firma"
                                                        onChange={(e) => setSelectedFirma(e.target.value)}
                                                    >
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
                                                >
                                                    <ToggleButton value="area">Area</ToggleButton>
                                                    <ToggleButton value="line">Line</ToggleButton>
                                                    <ToggleButton value="bar">Bar</ToggleButton>
                                                </ToggleButtonGroup>

                                                <Button variant="contained" onClick={() => setSelectedFirma("Hepsi")}>
                                                    Sıfırla
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" },
                                        gap: 2,
                                    }}
                                >
                                    {statCards.map((item) => (
                                        <Card key={item.title} sx={{ borderRadius: 4 }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                    <Box>
                                                        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1 }}>
                                                            {item.title}
                                                        </Typography>
                                                        <Typography
                                                            sx={{
                                                                fontSize:
                                                                    item.title === "Pik Gün"
                                                                        ? { xs: 22, md: 24 }
                                                                        : { xs: 30, md: 34 },
                                                                fontWeight: 800,
                                                                lineHeight: 1.1,
                                                            }}
                                                        >
                                                            {item.value}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 1 }}>
                                                            {item.sub}
                                                        </Typography>
                                                    </Box>

                                                    <Box
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 2.5,
                                                            display: "grid",
                                                            placeItems: "center",
                                                            bgcolor: darkMode
                                                                ? "rgba(255,255,255,0.05)"
                                                                : "rgba(99,102,241,0.08)",
                                                            color: "primary.main",
                                                        }}
                                                    >
                                                        {item.icon}
                                                    </Box>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>

                                <Card sx={{ borderRadius: 4 }}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            justifyContent="space-between"
                                            alignItems={{ md: "center" }}
                                            spacing={1}
                                            sx={{ mb: 2 }}
                                        >
                                            <Box>
                                                <Typography variant="h6" fontWeight={700}>
                                                    Detay analizi
                                                </Typography>
                                                <Typography sx={{ color: "text.secondary", mt: 0.25 }}>
                                                    Aynı veri üzerinden ekstra içgörüler
                                                </Typography>
                                            </Box>

                                            <Chip label={dateRangeText} variant="outlined" />
                                        </Stack>

                                        <Box
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns: {
                                                    xs: "1fr",
                                                    sm: "repeat(2, 1fr)",
                                                    xl: "repeat(4, 1fr)",
                                                },
                                                gap: 1.5,
                                            }}
                                        >
                                            {insightCards.map((item) => (
                                                <InsightMiniCard
                                                    key={item.title}
                                                    title={item.title}
                                                    value={item.value}
                                                    sub={item.sub}
                                                    icon={item.icon}
                                                    darkMode={darkMode}
                                                />
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
                                        gap: 2,
                                        alignItems: "stretch",
                                    }}
                                >
                                    <Card sx={{ borderRadius: 4 }}>
                                        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                                            <Stack
                                                direction={{ xs: "column", md: "row" }}
                                                justifyContent="space-between"
                                                alignItems={{ md: "center" }}
                                                spacing={1}
                                                sx={{ mb: 2 }}
                                            >
                                                <Box>
                                                    <Typography variant="h6" fontWeight={700}>
                                                        Evrak trendi
                                                    </Typography>
                                                    <Typography sx={{ color: "text.secondary", mt: 0.25 }}>
                                                        {dateRangeText}
                                                    </Typography>
                                                </Box>

                                                <Chip label={`Toplam ${totalCount}`} variant="outlined" />
                                            </Stack>

                                            <Box
                                                sx={{
                                                    height: { xs: 320, md: 430 },
                                                    borderRadius: 3,
                                                    p: 1,
                                                    bgcolor: darkMode ? "rgba(255,255,255,0.02)" : "#F8FAFC",
                                                    border: darkMode
                                                        ? "1px solid rgba(255,255,255,0.05)"
                                                        : "1px solid rgba(15,23,42,0.05)",
                                                }}
                                            >
                                                {loading ? (
                                                    <Stack
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        sx={{ height: "100%" }}
                                                        spacing={1}
                                                    >
                                                        <CircularProgress size={26} />
                                                        <Typography sx={{ color: "text.secondary" }}>
                                                            Veriler yükleniyor...
                                                        </Typography>
                                                    </Stack>
                                                ) : (
                                                    <MainChart />
                                                )}
                                            </Box>

                                            {!loading && (
                                                <Box
                                                    sx={{
                                                        mt: 2,
                                                        display: "grid",
                                                        gridTemplateColumns: {
                                                            xs: "repeat(2, 1fr)",
                                                            sm: "repeat(3, 1fr)",
                                                            md: "repeat(4, 1fr)",
                                                            xl: "repeat(7, 1fr)",
                                                        },
                                                        gap: 1,
                                                    }}
                                                >
                                                    {dailyData.map((d) => (
                                                        <Box
                                                            key={d.date}
                                                            sx={{
                                                                p: 1.25,
                                                                borderRadius: 3,
                                                                bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                                                                border: darkMode
                                                                    ? "1px solid rgba(255,255,255,0.05)"
                                                                    : "1px solid rgba(15,23,42,0.05)",
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 12,
                                                                    color: "text.secondary",
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                {d.label}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                                                                {formatTRDate(d.date)}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 1 }}>
                                                                {d.count}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card sx={{ borderRadius: 4 }}>
                                        <CardContent sx={{ p: 2.25 }}>
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                alignItems="center"
                                                sx={{ mb: 1.5 }}
                                            >
                                                <Box>
                                                    <Typography variant="h6" fontWeight={700}>
                                                        Top 5 firma
                                                    </Typography>
                                                    <Typography sx={{ color: "text.secondary", mt: 0.25 }}>
                                                        Evrak toplamı
                                                    </Typography>
                                                </Box>

                                                <Chip
                                                    label={selectedFirma === "Hepsi" ? "Tümü" : selectedFirma}
                                                    variant="outlined"
                                                />
                                            </Stack>

                                            <Box
                                                sx={{
                                                    height: 220,
                                                    borderRadius: 3,
                                                    p: 1,
                                                    bgcolor: darkMode ? "rgba(255,255,255,0.02)" : "#F8FAFC",
                                                    border: darkMode
                                                        ? "1px solid rgba(255,255,255,0.05)"
                                                        : "1px solid rgba(15,23,42,0.05)",
                                                }}
                                            >
                                                {loading ? (
                                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                                        <CircularProgress size={24} />
                                                    </Stack>
                                                ) : top5.length === 0 ? (
                                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                                        <Typography sx={{ color: "text.secondary" }}>Veri yok</Typography>
                                                    </Stack>
                                                ) : (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={top5}
                                                            layout="vertical"
                                                            margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
                                                        >
                                                            <CartesianGrid
                                                                strokeDasharray="3 3"
                                                                horizontal={false}
                                                                stroke={
                                                                    darkMode
                                                                        ? "rgba(255,255,255,0.08)"
                                                                        : "rgba(15,23,42,0.08)"
                                                                }
                                                            />
                                                            <XAxis type="number" hide />
                                                            <YAxis
                                                                type="category"
                                                                dataKey="name"
                                                                width={100}
                                                                tick={{
                                                                    fill: darkMode ? "#CBD5E1" : "#64748B",
                                                                    fontSize: 12,
                                                                }}
                                                                axisLine={false}
                                                                tickLine={false}
                                                            />
                                                            <Tooltip
                                                                contentStyle={{
                                                                    background: darkMode ? "#111827" : "#FFFFFF",
                                                                    border: darkMode
                                                                        ? "1px solid rgba(255,255,255,0.08)"
                                                                        : "1px solid rgba(15,23,42,0.08)",
                                                                    borderRadius: 12,
                                                                    boxShadow: "none",
                                                                }}
                                                                formatter={(v) => [`${v} evrak`, "Toplam"]}
                                                            />
                                                            <Bar dataKey="value" fill="#6366F1" radius={[8, 8, 8, 8]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                )}
                                            </Box>

                                            <Divider sx={{ my: 1.5 }} />

                                            <Stack spacing={1}>
                                                {firmTotals.slice(0, 5).map((f, i) => (
                                                    <Box
                                                        key={f.name}
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            p: 1.1,
                                                            borderRadius: 3,
                                                            bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                                                            border: darkMode
                                                                ? "1px solid rgba(255,255,255,0.05)"
                                                                : "1px solid rgba(15,23,42,0.05)",
                                                        }}
                                                    >
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Box
                                                                sx={{
                                                                    width: 24,
                                                                    height: 24,
                                                                    borderRadius: 99,
                                                                    display: "grid",
                                                                    placeItems: "center",
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                    bgcolor: darkMode
                                                                        ? "rgba(255,255,255,0.06)"
                                                                        : "rgba(99,102,241,0.10)",
                                                                }}
                                                            >
                                                                {i + 1}
                                                            </Box>
                                                            <Typography fontWeight={600}>{f.name}</Typography>
                                                        </Stack>

                                                        <Typography fontWeight={700}>{f.value}</Typography>
                                                    </Box>
                                                ))}
                                            </Stack>
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