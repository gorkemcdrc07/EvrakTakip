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

// Basit UI yardımcıları (yalın Tailwind)
const Button = ({ children, className = "", ...props }) => (
    <button
        className={`px-3 py-2 rounded-xl font-medium shadow-sm hover:shadow-md transition bg-white/80 dark:bg-gray-800/80 border border-black/5 dark:border-white/10 ${className}`}
        {...props}
    >
        {children}
    </button>
);

const Card = ({ children, className = "" }) => (
    <div
        className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 shadow backdrop-blur p-5 ${className}`}
    >
        {children}
    </div>
);

const Select = ({ value, onChange, options, className = "" }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-3 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-black/5 dark:border-white/10 ${className}`}
    >
        {options.map((opt) => (
            <option key={opt} value={opt}>
                {opt}
            </option>
        ))}
    </select>
);

// Küçük “section” başlığı
const SectionTitle = ({ icon, children }) => (
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <span className="text-base">{icon}</span>
        <span>{children}</span>
    </div>
);

// Bölüm kartı (yan menü grupları için)
const SectionCard = ({ children }) => (
    <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 shadow-sm p-3">
        {children}
    </div>
);

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

    // --- THEME ---
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

    // --- DATA: firmalar ---
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

    // --- DATA: last 7 days ---
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
                    query = query.ilike("kargo_firmasi", selectedFirma);
                }

                const { data, error } = await query;
                if (error) throw error;

                (data ?? []).forEach(({ tarih, evrak_adedi, kargo_firmasi }) => {
                    if (
                        selectedFirma !== "Hepsi" &&
                        (kargo_firmasi ?? "").toUpperCase() !== selectedFirma.toUpperCase()
                    ) {
                        return;
                    }
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

    const isYonetici = username === "yaren" || username === "ozge";
    const isRefika = username === "refika";

    const Chart = () => {
        const ChartComp =
            chartType === "bar" ? BarChart : chartType === "line" ? LineChart : AreaChart;
        return (
            <ResponsiveContainer width="100%" height={340}>
                <ChartComp data={dailyData} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#f9a8d4" stopOpacity={0.5} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
                    <XAxis dataKey="label" tick={{ fill: "#9ca3af" }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#9ca3af" }} />
                    <Tooltip
                        contentStyle={{
                            background: "#ffffff",
                            border: "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 12,
                        }}
                        labelStyle={{ color: "#374151" }}
                        itemStyle={{ color: "#111827" }}
                    />
                    {chartType === "bar" && (
                        <Bar dataKey="count" fill="url(#pinkGrad)" radius={[10, 10, 0, 0]} />
                    )}
                    {chartType === "line" && (
                        <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={3} dot={false} />
                    )}
                    {chartType === "area" && (
                        <Area type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={2} fill="url(#pinkGrad)" />
                    )}
                </ChartComp>
            </ResponsiveContainer>
        );
    };

    return (
        <Layout>
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-pink-50 via-white to-purple-100 dark:from-gray-950 dark:via-gray-900 dark:to-black text-gray-900 dark:text-gray-100">
                {/* TOP BAR */}
                <div className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-gray-900/50 border-b border-black/5 dark:border-white/10">
                    <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button onClick={() => setMenuOpen(!menuOpen)} className="bg-pink-100 dark:bg-gray-700">
                                ☰
                            </Button>
                            <span className="text-lg font-semibold tracking-tight">📁 Evrak Takip Sistemi</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline text-sm md:text-base font-medium">{adSoyad}</span>
                            <Button
                                onClick={toggleDarkMode}
                                className="rounded-full w-10 h-10 flex items-center justify-center"
                                title="Tema"
                            >
                                {darkMode ? "🌙" : "☀️"}
                            </Button>
                            <Button onClick={handleLogout} className="bg-rose-500 hover:bg-rose-600 text-white">
                                ⇦ Çıkış
                            </Button>
                        </div>
                    </div>
                </div>

                {/* SIDE DRAWER */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.aside
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 120 }}
                            className="fixed top-0 left-0 h-full w-80 p-4 z-50"
                        >
                            <div className="rounded-2xl h-full p-4 border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/70 shadow backdrop-blur flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="font-semibold">Aksiyonlar</div>
                                    <Button onClick={() => setMenuOpen(false)}>✖</Button>
                                </div>

                                {/* Yönetici (yaren/ozge) için gruplar */}
                                {isYonetici && (
                                    <div className="flex-1 overflow-auto pr-1 space-y-4">
                                        {/* 1) Lokasyonlar / Projeler */}
                                        <SectionCard>
                                            <SectionTitle icon="🗂️">Navigasyon</SectionTitle>
                                            <div className="mt-3 grid gap-2">
                                                <Button
                                                    onClick={() => window.open("/lokasyonlar", "_blank")}
                                                    className="justify-start"
                                                    title="Lokasyonlar"
                                                >
                                                    📍 Lokasyonlar
                                                </Button>
                                                <Button
                                                    onClick={() => window.open("/projeler", "_blank")}
                                                    className="justify-start"
                                                    title="Projeler"
                                                >
                                                    📁 Projeler
                                                </Button>
                                            </div>
                                        </SectionCard>

                                        {/* 2) Evrak işlemleri */}
                                        <SectionCard>
                                            <SectionTitle icon="📄">Evrak İşlemleri</SectionTitle>
                                            <div className="mt-3 grid gap-2">
                                                <Button
                                                    onClick={() => window.open("/evrak-ekle", "_blank")}
                                                    className="justify-start"
                                                    title="Evrak Ekle"
                                                >
                                                    📝 Evrak Ekle
                                                </Button>
                                                <Button
                                                    onClick={() => window.open("/toplu-evraklar", "_blank")}
                                                    className="justify-start"
                                                    title="Tüm Evraklar"
                                                >
                                                    📄 Tüm Evraklar
                                                </Button>
                                                <Button
                                                    onClick={() => window.open("/tum-kargo-bilgileri", "_blank")}
                                                    className="justify-start"
                                                    title="Tüm Kargo Bilgileri"
                                                >
                                                    📋 Tüm Kargo Bilgileri
                                                </Button>
                                            </div>
                                        </SectionCard>

                                        {/* 3) Raporlar */}
                                        <SectionCard>
                                            <SectionTitle icon="📊">Raporlama</SectionTitle>
                                            <div className="mt-3 grid gap-2">
                                                <Button
                                                    onClick={() => window.open("/evrak-raporlari", "_blank")}
                                                    className="justify-start"
                                                    title="Evrak Raporları"
                                                >
                                                    📑 Evrak Raporları
                                                </Button>
                                                <Button
                                                    onClick={() => window.open("/raporlar", "_blank")}
                                                    className="justify-start"
                                                    title="Reel Raporları"
                                                >
                                                    📈 Reel Raporları
                                                </Button>
                                            </div>
                                        </SectionCard>

                                        {/* 4) Diğer */}
                                        <SectionCard>
                                            <SectionTitle icon="🧩">Diğer</SectionTitle>
                                            <div className="mt-3 grid gap-2">
                                                <Button
                                                    onClick={() => window.open("/hedef-kargo", "_blank")}
                                                    className="justify-start"
                                                    title="HEDEF KARGO"
                                                >
                                                    🎯 Hedef Kargo
                                                </Button>
                                                <Button
                                                    onClick={() => window.open("/tutanak", "_blank")}
                                                    className="justify-start"
                                                    title="Tutanak"
                                                >
                                                    📝 Tutanak
                                                </Button>
                                            </div>
                                        </SectionCard>
                                    </div>
                                )}

                                {/* Refika için (mevcut yetkilerle sade grup) */}
                                {isRefika && (
                                    <div className="flex-1 overflow-auto pr-1 space-y-4">
                                        <SectionCard>
                                            <SectionTitle icon="📦">Kargo</SectionTitle>
                                            <div className="mt-3 grid gap-2">
                                                <Button
                                                    onClick={() => window.open("/kargo-bilgisi-ekle", "_blank")}
                                                    className="justify-start"
                                                    title="Kargo Bilgisi Ekle"
                                                >
                                                    📦 Kargo Bilgisi Ekle
                                                </Button>
                                                <Button
                                                    onClick={() => window.open("/tum-kargo-bilgileri", "_blank")}
                                                    className="justify-start"
                                                    title="Tüm Kargo Bilgileri"
                                                >
                                                    📋 Tüm Kargo Bilgileri
                                                </Button>
                                            </div>
                                        </SectionCard>
                                    </div>
                                )}

                                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                                    Giriş: <span className="font-medium">{username || "-"}</span>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* CONTENT */}
                <main className="mx-auto max-w-7xl px-4 py-6">
                    {isRefika && (
                        <>
                            {/* Welcome */}
                            <Card>
                                <div className="text-3xl font-bold">👋 Hoş geldin, {adSoyad}</div>
                                <p className="mt-1 text-gray-600 dark:text-gray-300">
                                    Bugün ne yapmak istersin?
                                </p>
                            </Card>

                            {/* Stats */}
                            <div className="grid gap-4 sm:grid-cols-3 mt-6">
                                <Card className="border-l-4 border-pink-500">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Bugünkü Evrak (örnek)
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-pink-600">
                                        📦 12
                                    </div>
                                </Card>
                                <Card className="border-l-4 border-pink-500">
                                    <div className="text-sm text-gray-50 0 dark:text-gray-400">
                                        Toplam Firma
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-pink-600">
                                        🏬 {Math.max(0, firmalar.length - 1)}
                                    </div>
                                </Card>
                                <Card className="border-l-4 border-pink-500">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Kullanıcı
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-pink-600">
                                        👤 {adSoyad}
                                    </div>
                                </Card>
                            </div>

                            {/* Controls */}
                            <div className="mt-6 flex flex-col md:flex-row md:items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 text-sm text-gray-600 dark:text-gray-300">Metri̇k</span>
                                    <Select value={metric} onChange={setMetric} options={["kargo", "evrak"]} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="px-2 text-sm text-gray-600 dark:text-gray-300">Firma</span>
                                    <Select value={selectedFirma} onChange={setSelectedFirma} options={firmalar} />
                                </div>

                                <div className="ml-0 md:ml-auto flex gap-2">
                                    <Button
                                        onClick={() => setChartType("bar")}
                                        className={chartType === "bar" ? "bg-pink-100" : ""}
                                    >
                                        📊 Bar
                                    </Button>
                                    <Button
                                        onClick={() => setChartType("line")}
                                        className={chartType === "line" ? "bg-pink-100" : ""}
                                    >
                                        📉 Line
                                    </Button>
                                    <Button
                                        onClick={() => setChartType("area")}
                                        className={chartType === "area" ? "bg-pink-100" : ""}
                                    >
                                        📈 Area
                                    </Button>
                                </div>
                            </div>

                            {/* Chart Card */}
                            <Card className="mt-6">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <h3 className="text-xl font-bold">
                                        {metric === "kargo" ? "📦 Günlük Kargo Sayısı" : "📄 Günlük Evrak Adedi"} (Son 7 Gün)
                                    </h3>
                                    <span className="inline-flex items-center gap-2 rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300 px-3 py-1 text-sm">
                                        Toplam: <strong className="ml-1">{totalCount}</strong> kayıt
                                    </span>
                                </div>
                                <div className="h-[360px] mt-3">
                                    <AnimatePresence>
                                        {loading ? (
                                            <motion.div
                                                key="skeleton"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="h-full w-full animate-pulse rounded-xl bg-gradient-to-b from-white/70 to-gray-100/70 dark:from-gray-800/50 dark:to-gray-700/50"
                                            />
                                        ) : (
                                            <motion.div
                                                key="chart"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="h-full"
                                            >
                                                <Chart />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </Card>

                            {/* Day Cards */}
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {dailyData.map((item) => (
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        key={item.date}
                                        className="p-5 rounded-2xl border bg-white dark:bg-gray-800 shadow hover:shadow-lg transition-all border-l-4 border-pink-500"
                                    >
                                        <div className="text-xl font-semibold mb-1">📅 {item.label}</div>
                                        <div className="text-pink-600 dark:text-pink-300 font-bold text-lg">
                                            {item.count} kayıt
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </Layout>
    );
}

export default Anasayfa;
