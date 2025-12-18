import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
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
import { motion, AnimatePresence } from "framer-motion";

// --- UI YARDIMCI BİLEŞENLER (İyileştirilmiş) ---

const Button = ({ children, className = "", primary = false, ...props }) => {
    const baseStyle =
        "px-4 py-2 rounded-xl font-medium shadow-sm hover:shadow-lg transition-all duration-200 border border-black/5 dark:border-white/10 text-sm";
    const defaultStyle = "bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700";
    const primaryStyle =
        "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/50 border-transparent";

    return (
        <button
            className={`${baseStyle} ${primary ? primaryStyle : defaultStyle} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// Card Bileşeni: Daha belirgin bir gölge ve blur
const Card = ({ children, className = "" }) => (
    <div
        className={`rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-900/50 shadow-2xl dark:shadow-black/50 backdrop-blur-md p-6 ${className}`}
    >
        {children}
    </div>
);

const Select = ({ value, onChange, options, className = "" }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-black/10 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition ${className}`}
    >
        {options.map((opt) => (
            <option key={opt} value={opt}>
                {opt}
            </option>
        ))}
    </select>
);

const SectionTitle = ({ icon, children }) => (
    <div className="flex items-center gap-2 mb-3 text-xs uppercase font-bold text-indigo-500 dark:text-cyan-400 tracking-wider">
        <span className="text-base">{icon}</span>
        <span>{children}</span>
    </div>
);

const SectionCard = ({ children }) => (
    <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 shadow-sm p-4">
        {children}
    </div>
);

// --- ANA BİLEŞEN ---

function Anasayfa() {
    const navigate = useNavigate();

    const adSoyad = localStorage.getItem("ad") ?? "Kullanıcı";
    const username = localStorage.getItem("username") ?? "";

    const [menuOpen, setMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(
        () => localStorage.getItem("theme") === "dark"
    );

    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metric, setMetric] = useState("kargo");
    const [chartType, setChartType] = useState("bar");
    const [firmalar, setFirmalar] = useState(["Hepsi"]);
    const [selectedFirma, setSelectedFirma] = useState("Hepsi");

    // --- ROL TANIMLARI ---
    const isRefika = username === "refika";
    const isAdminOrManager = username === "yaren" || username === "ozge" || username === "mehmet";

    // --- THEME & LOGOUT ---
    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
    }, [darkMode]);

    const toggleDarkMode = () => {
        const next = !darkMode;
        setDarkMode(next);
        localStorage.setItem("theme", next ? "dark" : "light");
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    // --- DATA FETCHING (Firmalar) ---
    useEffect(() => {
        (async () => {
            try {
                const { data, error } = await supabase
                    .from("kargo_bilgileri")
                    .select("kargo_firmasi");
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

    // --- DATA FETCHING (Günlük Veri) ---
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const today = new Date();
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(today.getDate() - 6);

                const gunIsimleri = [
                    "Pazar",
                    "Pazartesi",
                    "Salı",
                    "Çarşamba",
                    "Perşembe",
                    "Cuma",
                    "Cumartesi",
                ];

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

                if (selectedFirma !== "Hepsi") {
                    // Supabase'de case-insensitive arama için 'ilike' kullanıyoruz.
                    query = query.ilike("kargo_firmasi", selectedFirma);
                }

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

    const totalCount = useMemo(
        () => dailyData.reduce((sum, i) => sum + (i.count || 0), 0),
        [dailyData]
    );

    const metricLabel = metric === "kargo" ? "Kargo" : "Evrak";

    // --- Recharts Chart Bileşeni ---
    const Chart = () => {
        const ChartComp =
            chartType === "bar" ? BarChart : chartType === "line" ? LineChart : AreaChart;
        return (
            <ResponsiveContainer width="100%" height={340}>
                <ChartComp data={dailyData} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={darkMode ? 0.1 : 0.4} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: darkMode ? "#9ca3af" : "#6b7280", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: darkMode ? "#9ca3af" : "#6b7280", fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            background: darkMode ? "rgba(31, 41, 55, 0.9)" : "rgba(255, 255, 255, 0.9)",
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                            borderRadius: 12,
                            backdropFilter: "blur(8px)",
                        }}
                        labelStyle={{ color: darkMode ? "#f3f4f6" : "#1f2937", fontWeight: "bold" }}
                        formatter={(value) => [`${value} ${metricLabel}`, "Toplam"]}
                    />
                    {chartType === "bar" && (
                        <Bar dataKey="count" fill="url(#mainGrad)" radius={[8, 8, 0, 0]} />
                    )}
                    {chartType === "line" && (
                        <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={false} />
                    )}
                    {chartType === "area" && (
                        <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#mainGrad)" />
                    )}
                </ChartComp>
            </ResponsiveContainer>
        );
    };

    return (
        <Layout>
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-50/70 via-white/80 to-cyan-100/70 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">

                {/* TOP BAR */}
                <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-900/70 border-b border-black/5 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20">
                    <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button onClick={() => setMenuOpen(!menuOpen)} className="bg-indigo-50 dark:bg-gray-700 hover:ring-2 ring-indigo-500/50">
                                ☰
                            </Button>
                            <span className="text-xl font-bold tracking-tight text-indigo-600 dark:text-cyan-400">📁 Evrak Yönetimi</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300">{adSoyad}</span>
                            <Button
                                onClick={toggleDarkMode}
                                className="rounded-full w-10 h-10 flex items-center justify-center text-lg"
                                title="Tema"
                            >
                                {darkMode ? "🌙" : "☀️"}
                            </Button>
                            <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-semibold">
                                ⇦ Çıkış
                            </Button>
                        </div>
                    </div>
                </div>

                {/* SIDE DRAWER (Menu) */}
                <AnimatePresence>
                    {menuOpen && (
                        <>
                            {/* Overlay/Perde */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMenuOpen(false)}
                                className="fixed inset-0 bg-black/50 z-40 lg:hidden cursor-pointer"
                            />

                            <motion.aside
                                initial={{ x: -320, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -320, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                                className="fixed top-0 left-0 h-full w-80 p-4 z-50 pt-[70px]"
                            >
                                <div className="rounded-2xl h-full p-5 border border-black/5 dark:border-white/10 bg-white/90 dark:bg-gray-900/90 shadow-2xl backdrop-blur-lg flex flex-col">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="text-lg font-bold text-gray-700 dark:text-gray-200">Menü</div>
                                        <Button onClick={() => setMenuOpen(false)} className="text-lg w-8 h-8 flex items-center justify-center">
                                            ✖
                                        </Button>
                                    </div>

                                    {/* Menü grupları: YÖNETİCİ/ADMİN GRUPLARI */}
                                    <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                                        {isAdminOrManager && (
                                            <>
                                                <SectionCard>
                                                    <SectionTitle icon="🗂️">Navigasyon</SectionTitle>
                                                    <div className="grid gap-2">
                                                        <Button onClick={() => window.open("/lokasyonlar", "_blank")} className="justify-start hover:text-indigo-600">📍 Lokasyonlar</Button>
                                                        <Button onClick={() => window.open("/projeler", "_blank")} className="justify-start hover:text-indigo-600">📁 Projeler</Button>
                                                    </div>
                                                </SectionCard>

                                                <SectionCard>
                                                    <SectionTitle icon="📄">Evrak İşlemleri</SectionTitle>
                                                    <div className="grid gap-2">
                                                        <Button onClick={() => window.open("/evrak-ekle", "_blank")} className="justify-start hover:text-indigo-600">📝 Evrak Ekle</Button>
                                                        <Button onClick={() => window.open("/toplu-evraklar", "_blank")} className="justify-start hover:text-indigo-600">📄 Tüm Evraklar</Button>
                                                        <Button onClick={() => window.open("/tum-kargo-bilgileri", "_blank")} className="justify-start hover:text-indigo-600">📋 Tüm Kargo Bilgileri</Button>
                                                    </div>
                                                </SectionCard>

                                                <SectionCard>
                                                    <SectionTitle icon="📊">Raporlama</SectionTitle>
                                                    <div className="grid gap-2">
                                                        <Button
                                                            onClick={() => window.open("/evrak-raporlari", "_blank")}
                                                            className="justify-start hover:text-indigo-600"
                                                        >
                                                            📑 Evrak Raporları
                                                        </Button>

                                                        <Button
                                                            onClick={() => window.open("/raporlar", "_blank")}
                                                            className="justify-start hover:text-indigo-600"
                                                        >
                                                            📈 Reel Raporları
                                                        </Button>

                                                        {/* ✅ YENİ: Toplu Tutanak */}
                                                        <Button
                                                            onClick={() => window.open("/toplu-tutanak", "_blank")}
                                                            className="justify-start hover:text-indigo-600"
                                                        >
                                                            🧾 Toplu Tutanak
                                                        </Button>
                                                    </div>
                                                </SectionCard>

                                                <SectionCard>
                                                    <SectionTitle icon="🧩">Diğer</SectionTitle>
                                                    <div className="grid gap-2">
                                                        <Button onClick={() => window.open("/hedef-kargo", "_blank")} className="justify-start hover:text-indigo-600">🎯 Hedef Kargo</Button>
                                                        <Button onClick={() => window.open("/tutanak", "_blank")} className="justify-start hover:text-indigo-600">📝 Tutanak</Button>
                                                        <Button onClick={() => window.open("/ExcelDonusum", "_blank")} className="justify-start hover:text-indigo-600">
                                                            📑 Excel & Word
                                                        </Button>
                                                    </div>
                                                </SectionCard>
                                            </>
                                        )}

                                        {/* REFİKA GRUPLARI */}
                                        {isRefika && (
                                            <SectionCard>
                                                <SectionTitle icon="📦">Kargo</SectionTitle>
                                                <div className="grid gap-2">
                                                    <Button onClick={() => window.open("/kargo-bilgisi-ekle", "_blank")} className="justify-start hover:text-indigo-600">📦 Kargo Bilgisi Ekle</Button>
                                                    <Button onClick={() => window.open("/tum-kargo-bilgileri", "_blank")} className="justify-start hover:text-indigo-600">📋 Tüm Kargo Bilgileri</Button>
                                                </div>
                                            </SectionCard>
                                        )}
                                    </div>
                                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t pt-3 border-gray-200 dark:border-gray-700">
                                        Giriş Kullanıcısı: <span className="font-medium text-gray-700 dark:text-gray-300">{username || "-"}</span>
                                    </div>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* CONTENT: Ana içerik gösterimi */}
                <main className="mx-auto max-w-7xl px-4 py-6">
                    {(isRefika || isAdminOrManager) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

                            {/* Welcome Card */}
                            <Card className="p-8 border-l-4 border-indigo-500">
                                <h2 className="text-4xl font-extrabold text-indigo-600 dark:text-cyan-400">👋 Hoş Geldin, {adSoyad}</h2>
                                <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                                    Gösterge tablosuna genel bakış ve hızlı aksiyonlar.
                                </p>
                            </Card>

                            {/* Stats Cards (Animasyon Eklendi) */}
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                                {/* İstatistik Kart 1 */}
                                <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                                    <Card className="border-l-4 border-cyan-500 hover:shadow-cyan-500/20 transition-shadow">
                                        <div className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                                            Bugünkü Kargo (Örnek)
                                        </div>
                                        <div className="mt-2 flex items-center gap-3 text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">
                                            <span className="text-4xl">📦</span> 12
                                        </div>
                                    </Card>
                                </motion.div>

                                {/* İstatistik Kart 2 */}
                                <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                                    <Card className="border-l-4 border-indigo-500 hover:shadow-indigo-500/20 transition-shadow">
                                        <div className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                                            Toplam Firma
                                        </div>
                                        <div className="mt-2 flex items-center gap-3 text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                                            <span className="text-4xl">🏢</span> {Math.max(0, firmalar.length - 1)}
                                        </div>
                                    </Card>
                                </motion.div>

                                {/* İstatistik Kart 3 */}
                                <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                                    <Card className="border-l-4 border-purple-500 hover:shadow-purple-500/20 transition-shadow">
                                        <div className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                                            Kullanıcı Rolü
                                        </div>
                                        <div className="mt-2 flex items-center gap-3 text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                                            <span className="text-4xl">👤</span> {adSoyad}
                                        </div>
                                    </Card>
                                </motion.div>
                            </div>

                            {/* Controls */}
                            <div className="mt-6 flex flex-col gap-4">
                                <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
                                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 min-w-[80px]">Filtreler:</h3>

                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600 dark:text-gray-300">Metrik:</label>
                                        <Select value={metric} onChange={setMetric} options={["kargo", "evrak"]} />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600 dark:text-gray-300">Firma:</label>
                                        <Select value={selectedFirma} onChange={setSelectedFirma} options={firmalar} />
                                    </div>

                                    <div className="flex gap-2 ml-auto">
                                        <Button
                                            onClick={() => setChartType("bar")}
                                            className={chartType === "bar" ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" : ""}
                                        >
                                            📊 Bar
                                        </Button>
                                        <Button
                                            onClick={() => setChartType("line")}
                                            className={chartType === "line" ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" : ""}
                                        >
                                            📉 Line
                                        </Button>
                                        <Button
                                            onClick={() => setChartType("area")}
                                            className={chartType === "area" ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" : ""}
                                        >
                                            📈 Area
                                        </Button>
                                    </div>
                                </Card>
                            </div>

                            {/* Chart Card */}
                            <Card className="mt-6">
                                <div className="flex items-center justify-between flex-wrap gap-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                                    <h3 className="text-xl font-bold">
                                        {metric === "kargo" ? "📦 Günlük Kargo Sayısı" : "📄 Günlük Evrak Adedi"} <span className="text-gray-500 dark:text-gray-400 font-normal text-base">(Son 7 Gün)</span>
                                    </h3>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-cyan-500/15 dark:text-cyan-300 px-4 py-1.5 text-sm font-semibold">
                                        TOPLAM: <strong className="ml-1">{totalCount}</strong> kayıt
                                    </span>
                                </div>
                                <div className="h-[360px] relative">
                                    <AnimatePresence>
                                        {loading ? (
                                            <motion.div
                                                key="skeleton"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 h-full w-full rounded-xl p-4 bg-gray-100/50 dark:bg-gray-800/50 flex flex-col items-center justify-center"
                                            >
                                                <svg className="h-10 w-10 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                <span className="mt-3 text-lg font-medium text-gray-600 dark:text-gray-300">
                                                    {metricLabel} Verileri Yükleniyor...
                                                </span>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="chart"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.5 }}
                                                className="h-full"
                                            >
                                                <Chart />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </Card>

                            {/* Day Cards (Daha Belirgin Hover Efekti) */}
                            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                {dailyData.map((item) => (
                                    <motion.div
                                        whileHover={{ scale: 1.05, boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3), 0 4px 6px -2px rgba(99, 102, 241, 0.05)" }}
                                        key={item.date}
                                        className="p-4 rounded-2xl border bg-white dark:bg-gray-800 shadow-xl transition-all duration-200 border-l-4 border-indigo-500 cursor-pointer"
                                    >
                                        <div className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">📅 {item.label}</div>
                                        <div className="text-indigo-600 dark:text-cyan-400 font-bold text-3xl">
                                            {item.count}
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium ml-1">{metricLabel.toLowerCase()}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </main>
            </div>
        </Layout>
    );
}

export default Anasayfa;