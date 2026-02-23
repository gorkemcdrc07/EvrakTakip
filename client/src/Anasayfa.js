// src/pages/Anasayfa.jsx  (veya senin dosya yolun neyse)
// ✅ Dashboard alanını GERİ koydum + ModernSidebar entegre + theme aynı mantık

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
    Divider,
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
                ...(mode === "dark"
                    ? {
                        background: { default: "#0b0f19", paper: "rgba(255,255,255,0.04)" },
                        text: { primary: "rgba(255,255,255,0.92)", secondary: "rgba(255,255,255,0.70)" },
                    }
                    : { background: { default: "#f6f7fb", paper: "#ffffff" } }),
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
                                    ? "1px solid rgba(255,255,255,0.08)"
                                    : "1px solid rgba(0,0,0,0.06)",
                            backdropFilter: "blur(10px)",
                            boxShadow:
                                mode === "dark"
                                    ? "0 20px 60px rgba(0,0,0,0.45)"
                                    : "0 16px 40px rgba(0,0,0,0.10)",
                        },
                    },
                },
                MuiAppBar: {
                    styleOverrides: {
                        root: {
                            background: mode === "dark" ? "rgba(15,18,28,0.72)" : "rgba(255,255,255,0.78)",
                            color: mode === "dark" ? "rgba(255,255,255,0.92)" : "rgba(17,24,39,0.92)",
                            backdropFilter: "blur(14px)",
                            borderBottom:
                                mode === "dark"
                                    ? "1px solid rgba(255,255,255,0.08)"
                                    : "1px solid rgba(0,0,0,0.06)",
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
                        },
                    },
                },
            },
        });
    }, [mode]);

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
            bgcolor: darkMode ? "rgba(15,18,28,0.72)" : "rgba(255,255,255,0.92)",
            color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(17,24,39,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRight: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            boxShadow: darkMode ? "0 30px 90px rgba(0,0,0,0.55)" : "0 18px 60px rgba(0,0,0,0.14)",
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
                            <stop offset="0%" stopColor={darkMode ? "#e5e7eb" : "#111827"} stopOpacity={0.85} />
                            <stop offset="100%" stopColor={darkMode ? "#64748b" : "#6b7280"} stopOpacity={0.45} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={darkMode ? 0.12 : 0.35} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: darkMode ? "#a1a1aa" : "#6b7280", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: darkMode ? "#a1a1aa" : "#6b7280", fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            background: darkMode ? "rgba(15,18,28,0.92)" : "rgba(255,255,255,0.92)",
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                            borderRadius: 14,
                            backdropFilter: "blur(10px)",
                        }}
                        labelStyle={{ color: darkMode ? "#f4f4f5" : "#111827", fontWeight: 900 }}
                        formatter={(value) => [`${value} ${metricLabel}`, "Toplam"]}
                    />

                    {chartType === "bar" && <Bar dataKey="count" fill="url(#mainGrad)" radius={[10, 10, 0, 0]} />}
                    {chartType === "line" && <Line type="monotone" dataKey="count" stroke={darkMode ? "#e5e7eb" : "#111827"} strokeWidth={3} dot={false} />}
                    {chartType === "area" && <Area type="monotone" dataKey="count" stroke={darkMode ? "#e5e7eb" : "#111827"} strokeWidth={2} fill="url(#mainGrad)" />}
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
                            ? "radial-gradient(900px circle at 20% 10%, rgba(255,255,255,0.06), transparent 55%), radial-gradient(800px circle at 80% 40%, rgba(255,255,255,0.04), transparent 55%)"
                            : "radial-gradient(900px circle at 20% 10%, rgba(17,24,39,0.08), transparent 55%), radial-gradient(800px circle at 80% 40%, rgba(107,114,128,0.08), transparent 55%)",
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

                            <Chip icon={<PersonIcon />} label={adSoyad} variant="outlined" sx={{ display: { xs: "none", sm: "inline-flex" } }} />

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

                    {/* ✅ DASHBOARD (senin eski alanın) */}
                    <Box sx={{ maxWidth: 1280, mx: "auto", px: 2, py: 3 }}>
                        {(isRefika || isAdminOrManager) && (
                            <Stack spacing={2.5}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h4" fontWeight={950} sx={{ mb: 0.5 }}>
                                            Hoş geldin, {adSoyad}
                                        </Typography>
                                        <Typography sx={{ opacity: 0.75 }}>
                                            Gösterge tablosuna genel bakış ve hızlı aksiyonlar.
                                        </Typography>
                                    </CardContent>
                                </Card>

                                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                                    <Card sx={{ flex: 1 }}>
                                        <CardContent>
                                            <Typography variant="overline" sx={{ opacity: 0.75 }}>
                                                Bugünkü Kargo (Örnek)
                                            </Typography>
                                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
                                                <Inventory2Icon />
                                                <Typography variant="h4" fontWeight={950}>
                                                    12
                                                </Typography>
                                            </Stack>
                                        </CardContent>
                                    </Card>

                                    <Card sx={{ flex: 1 }}>
                                        <CardContent>
                                            <Typography variant="overline" sx={{ opacity: 0.75 }}>
                                                Toplam Firma
                                            </Typography>
                                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
                                                <BusinessIcon />
                                                <Typography variant="h4" fontWeight={950}>
                                                    {Math.max(0, firmalar.length - 1)}
                                                </Typography>
                                            </Stack>
                                        </CardContent>
                                    </Card>

                                    <Card sx={{ flex: 1 }}>
                                        <CardContent>
                                            <Typography variant="overline" sx={{ opacity: 0.75 }}>
                                                Kullanıcı
                                            </Typography>
                                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
                                                <PersonIcon />
                                                <Typography variant="h6" fontWeight={900}>
                                                    {adSoyad}
                                                </Typography>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Stack>

                                <Card>
                                    <CardContent>
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                                            <Typography variant="h6" fontWeight={950} sx={{ minWidth: 90 }}>
                                                Filtreler
                                            </Typography>

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

                                            <ToggleButtonGroup
                                                value={chartType}
                                                exclusive
                                                onChange={(_, v) => v && setChartType(v)}
                                                size="small"
                                            >
                                                <ToggleButton value="bar">Bar</ToggleButton>
                                                <ToggleButton value="line">Line</ToggleButton>
                                                <ToggleButton value="area">Area</ToggleButton>
                                            </ToggleButtonGroup>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent>
                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1.5}
                                            alignItems={{ sm: "center" }}
                                            justifyContent="space-between"
                                            sx={{ mb: 1.5 }}
                                        >
                                            <Typography variant="h6" fontWeight={950}>
                                                {metric === "kargo" ? "Günlük Kargo Sayısı" : "Günlük Evrak Adedi"}{" "}
                                                <Typography component="span" sx={{ opacity: 0.7, fontWeight: 500 }}>
                                                    (Son 7 Gün)
                                                </Typography>
                                            </Typography>
                                            <Chip label={`TOPLAM: ${totalCount} kayıt`} />
                                        </Stack>

                                        <Box sx={{ height: 360, position: "relative" }}>
                                            {loading ? (
                                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={1.5}>
                                                    <CircularProgress />
                                                    <Typography sx={{ opacity: 0.8 }}>{metricLabel} verileri yükleniyor...</Typography>
                                                </Stack>
                                            ) : (
                                                <Chart />
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>

                                <Stack direction="row" flexWrap="wrap" gap={2}>
                                    {dailyData.map((item) => (
                                        <Card
                                            key={item.date}
                                            sx={{ width: { xs: "calc(50% - 8px)", sm: 160, md: 170 }, flexGrow: 1 }}
                                        >
                                            <CardContent>
                                                <Typography fontWeight={950}>{item.label}</Typography>
                                                <Typography variant="h4" fontWeight={950} sx={{ mt: 0.5 }}>
                                                    {item.count}
                                                    <Typography component="span" sx={{ ml: 1, fontSize: 13, opacity: 0.7 }}>
                                                        {metricLabel.toLowerCase()}
                                                    </Typography>
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            </Stack>
                        )}
                    </Box>
                </Box>
            </Layout>
        </ThemeProvider>
    );
}

export default Anasayfa;