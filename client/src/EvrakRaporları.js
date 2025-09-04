import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import {
    PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
    FiRefreshCw, FiCalendar, FiTrendingUp, FiPackage, FiFileText,
} from "react-icons/fi";

const COLORS = ["#8b5cf6", "#a78bfa", "#f472b6", "#fb7185", "#38bdf8", "#60a5fa", "#34d399", "#f59e0b"];
const normalize = (str) => (str || "").trim().toLocaleUpperCase("tr").replace(/\s+/g, " ");
const fmt = (n) => Number(n || 0).toLocaleString("tr-TR");

export default function EvrakRaporlari() {
    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filtreler
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedLokasyonId, setSelectedLokasyonId] = useState("");
    const [selectedProjeId, setSelectedProjeId] = useState("");

    // Hover state
    const [activeIndex, setActiveIndex] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError("");
                const { data: evrakData, error: e1 } = await supabase
                    .from("evraklar")
                    .select(
                        `id, tarih, lokasyonid, sefersayisi,
             evrakseferler:evrakseferler!fk_evrakseferler_evrakid ( seferno, aciklama ),
             evrakproje:evrakproje!fk_evrakproje_evrakid ( projeid, sefersayisi )`
                    );
                if (e1) throw e1;
                const { data: lokasyonData, error: e2 } = await supabase.from("lokasyonlar").select("*");
                if (e2) throw e2;
                const { data: projeData, error: e3 } = await supabase.from("projeler").select("*");
                if (e3) throw e3;

                const lokasyonMap = {};
                lokasyonData?.forEach((l) => (lokasyonMap[l.id] = l.lokasyon));
                const projeMap = {};
                projeData?.forEach((p) => (projeMap[p.id] = p.proje));

                const sorted = (evrakData || []).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
                setEvraklar(sorted);
                setLokasyonlar(lokasyonMap);
                setProjeler(projeMap);
            } catch (e) {
                console.error(e);
                setError("Veriler yüklenirken bir sorun oluştu.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Seçenek listeleri
    const lokasyonOptions = useMemo(
        () => Object.entries(lokasyonlar).map(([id, ad]) => ({ id, ad })).sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
        [lokasyonlar]
    );
    const projeOptions = useMemo(
        () => Object.entries(projeler).map(([id, ad]) => ({ id, ad })).sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
        [projeler]
    );

    // Tarih filtresi
    const filteredEvraklar = useMemo(() => {
        return (evraklar || []).filter((e) => {
            const d = new Date(e.tarih);
            const after = startDate ? d >= new Date(startDate) : true;
            const before = endDate ? d <= new Date(endDate) : true;
            return after && before;
        });
    }, [evraklar, startDate, endDate]);

    // Seçime göre kapsam
    const scopedEvraklar = useMemo(() => {
        return filteredEvraklar.filter((e) => {
            const lokMatch = selectedLokasyonId ? String(e.lokasyonid) === String(selectedLokasyonId) : true;
            const projMatch = selectedProjeId
                ? (e.evrakproje || []).some((p) => String(p.projeid) === String(selectedProjeId))
                : true;
            return lokMatch && projMatch;
        });
    }, [filteredEvraklar, selectedLokasyonId, selectedProjeId]);

    // KPI
    const toplamSefer = useMemo(() => scopedEvraklar.reduce((s, e) => s + (e.sefersayisi || 0), 0), [scopedEvraklar]);
    const toplamEvrak = scopedEvraklar.length;
    const duzeltilmis = useMemo(
        () =>
            scopedEvraklar.reduce(
                (sum, e) =>
                    sum +
                    (e.evrakseferler?.filter((s) => normalize(s.aciklama) === "TARAFIMIZCA DÜZELTİLMİŞTİR").length || 0),
                0
            ),
        [scopedEvraklar]
    );
    const orjinaleCekilmis = useMemo(
        () =>
            scopedEvraklar.reduce(
                (sum, e) =>
                    sum +
                    (e.evrakseferler?.filter((s) => normalize(s.aciklama) === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR").length || 0),
                0
            ),
        [scopedEvraklar]
    );

    // Seriler
    const projeSeries = useMemo(() => {
        const cnt = {};
        scopedEvraklar.forEach((e) =>
            e.evrakproje?.forEach((p) => {
                const ad = projeler[p.projeid];
                if (!ad) return;
                cnt[ad] = (cnt[ad] || 0) + (p.sefersayisi || 0);
            })
        );
        return Object.entries(cnt).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [scopedEvraklar, projeler]);

    const lokasyonSeries = useMemo(() => {
        const cnt = {};
        scopedEvraklar.forEach((e) => {
            const ad = lokasyonlar[e.lokasyonid];
            if (!ad) return;
            cnt[ad] = (cnt[ad] || 0) + (e.sefersayisi || 0);
        });
        return Object.entries(cnt).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [scopedEvraklar, lokasyonlar]);

    const aciklamaSeries = useMemo(() => {
        const cnt = {};
        scopedEvraklar.forEach((e) =>
            e.evrakseferler?.forEach((s) => {
                const key = (s.aciklama || "").trim() || "(Boş)";
                cnt[key] = (cnt[key] || 0) + 1;
            })
        );
        const entries = Object.entries(cnt).map(([name, value]) => ({ name, value }));
        const total = toplamSefer || 1;
        return entries
            .map((x) => ({ ...x, percentOfTotal: +((x.value * 100) / total).toFixed(1) }))
            .sort((a, b) => b.value - a.value);
    }, [scopedEvraklar, toplamSefer]);

    const resetAll = () => {
        setStartDate("");
        setEndDate("");
        setSelectedLokasyonId("");
        setSelectedProjeId("");
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0a0f] text-gray-100">
            {/* Modern görünüm için küçük global stiller */}
            <style>{`
        *{ -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        /* Native select açılır menü okunaklı olsun */
        select option { color:#0b0b10; background:#ffffff; }
        select optgroup { color:#0b0b10; background:#ffffff; }
        /* Date input placeholder rengi */
        input[type="date"]::-webkit-datetime-edit { color:#e5e7eb; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.9); opacity:.8 }
      `}</style>

            <div className="w-full px-6 py-6">
                {/* Başlık */}
                <div className="mb-6 rounded-3xl bg-gradient-to-r from-purple-600/20 via-fuchsia-500/10 to-pink-500/20 border border-white/10 p-6 shadow-[0_10px_40px_rgba(100,80,255,.15)]">
                    <h1 className="text-2xl font-semibold tracking-tight">Evrak Raporları</h1>
                    <p className="text-sm opacity-80">Proje ve lokasyon seçin; tüm göstergeler seçiminize göre güncellensin.</p>
                </div>

                {/* Üst Filtreler */}
                <div className="flex flex-wrap items-end gap-4 mb-6">
                    {/* Tarih */}
                    <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
                        <FiCalendar className="opacity-80" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="gg.aa.yyyy"
                            className="px-3 py-2 rounded-lg bg-transparent border border-gray-700/60 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        />
                        <span className="text-sm opacity-70">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="gg.aa.yyyy"
                            className="px-3 py-2 rounded-lg bg-transparent border border-gray-700/60 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        />
                    </div>

                    {/* Proje */}
                    <div className="flex flex-col gap-1 bg-white/[0.03] backdrop-blur-md p-3 rounded-2xl border border-white/10">
                        <span className="text-xs opacity-80">Proje</span>
                        <div className="relative">
                            <select
                                value={selectedProjeId}
                                onChange={(e) => setSelectedProjeId(e.target.value)}
                                className="appearance-none w-[320px] px-3 py-2 rounded-lg bg-[#151523] text-gray-100 border border-gray-700/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            >
                                <option value="">Tüm Projeler</option>
                                {projeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>{o.ad}</option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70">▾</span>
                        </div>
                    </div>

                    {/* Lokasyon */}
                    <div className="flex flex-col gap-1 bg-white/[0.03] backdrop-blur-md p-3 rounded-2xl border border-white/10">
                        <span className="text-xs opacity-80">Lokasyon</span>
                        <div className="relative">
                            <select
                                value={selectedLokasyonId}
                                onChange={(e) => setSelectedLokasyonId(e.target.value)}
                                className="appearance-none w-[320px] px-3 py-2 rounded-lg bg-[#151523] text-gray-100 border border-gray-700/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            >
                                <option value="">Tüm Lokasyonlar</option>
                                {lokasyonOptions.map((o) => (
                                    <option key={o.id} value={o.id}>{o.ad}</option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70">▾</span>
                        </div>
                    </div>

                    <button
                        onClick={resetAll}
                        className="px-4 h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors"
                    >
                        Temizle
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="ml-auto flex items-center gap-2 px-4 h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors"
                    >
                        <FiRefreshCw /> Yenile
                    </button>
                </div>

                {/* Hata/Yükleniyor */}
                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-900/30 text-red-100 border border-red-800/50">
                        {error}
                    </div>
                )}
                {loading && (
                    <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10 animate-pulse">
                        Veriler yükleniyor…
                    </div>
                )}

                {/* KPI’lar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KpiCard icon={<FiFileText />} title="Toplam Evrak" value={fmt(toplamEvrak)} />
                    <KpiCard icon={<FiTrendingUp />} title="Toplam Sefer" value={fmt(toplamSefer)} />
                    <KpiCard icon={<FiPackage />} title="Düzeltilmiş" value={fmt(duzeltilmis)} subtitle="TARAFIMIZCA DÜZELTİLMİŞTİR" />
                    <KpiCard icon={<FiPackage />} title="Orijinale Çekilmiş" value={fmt(orjinaleCekilmis)} subtitle="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR" />
                </div>

                {/* Grafikler */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                    {/* Donut */}
                    <div className="col-span-1 rounded-3xl bg-[#121223] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.25)] p-6">
                        <h3 className="text-lg font-semibold mb-4">Açıklama Dağılımı</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <ReTooltip
                                        contentStyle={{ background: "#151529", border: "1px solid #2b2b45", color: "#e5e7eb" }}
                                        formatter={(value, name, props) => [`${value} adet — %${props.payload.percentOfTotal}`, name]}
                                    />
                                    <Pie
                                        data={aciklamaSeries}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={104}
                                        paddingAngle={2}
                                        onMouseEnter={(_, i) => setActiveIndex(i)}
                                        onMouseLeave={() => setActiveIndex(null)}
                                    >
                                        {aciklamaSeries.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={COLORS[i % COLORS.length]}
                                                stroke="#0a0a0f"
                                                outerRadius={activeIndex === i ? 110 : 104}
                                            />
                                        ))}
                                    </Pie>
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#f1f5f9">
                                        <tspan fontSize="13" opacity="0.75">Toplam</tspan>
                                        <tspan x="50%" dy="18" fontSize="22" fontWeight="700">
                                            {fmt(aciklamaSeries.reduce((s, x) => s + x.value, 0))}
                                        </tspan>
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Proje/Lokasyon chartları */}
                    <ChartCard title="Proje Bazlı Seferler (Top 10)" data={projeSeries.slice(0, 10)} gradId="barGradProj" />
                    <ChartCard title="Lokasyon Bazlı Seferler (Top 10)" data={lokasyonSeries.slice(0, 10)} gradId="barGradLok" />
                </div>

                {/* Seçilen Lokasyon için Açıklamalar */}
                <SingleExplain
                    kind="Lokasyon"
                    explain={buildLokasyonExplain(scopedEvraklar, selectedLokasyonId, lokasyonlar)}
                    emptyText="Lokasyon seçiniz; sadece o lokasyona ait açıklamalar listelenecektir."
                />

                {/* Seçilen Proje için Açıklamalar */}
                <SingleExplain
                    kind="Proje"
                    explain={buildProjeExplain(scopedEvraklar, selectedProjeId, projeler)}
                    emptyText="Proje seçiniz; sadece o projeye ait açıklamalar listelenecektir."
                />
            </div>
        </div>
    );
}

/* ---- helpers ---- */
function buildLokasyonExplain(list, selectedLokasyonId, lokasyonlar) {
    if (!selectedLokasyonId) return null;
    let totalSefer = 0;
    const counts = {};
    list.forEach((e) => {
        totalSefer += e.sefersayisi || 0;
        (e.evrakseferler || []).forEach((s) => {
            const key = (s.aciklama || "").trim() || "(Boş)";
            counts[key] = (counts[key] || 0) + 1;
        });
    });
    const rows = Object.entries(counts)
        .map(([name, value]) => ({
            name,
            value,
            pct: totalSefer ? +((value * 100) / totalSefer).toFixed(1) : 0,
        }))
        .sort((a, b) => b.value - a.value);
    return { group: lokasyonlar[selectedLokasyonId], totalSefer, rows };
}

function buildProjeExplain(list, selectedProjeId, projeler) {
    if (!selectedProjeId) return null;

    let totalSefer = 0;
    list.forEach((e) => {
        (e.evrakproje || []).forEach((p) => {
            if (String(p.projeid) === String(selectedProjeId)) totalSefer += p.sefersayisi || 0;
        });
    });

    const counts = {};
    list.forEach((e) => {
        const projelerThis = (e.evrakproje || [])
            .map((p) => ({ id: p.projeid, sefer: p.sefersayisi || 0 }))
            .filter((x) => x.sefer > 0);
        const toplamSeferEvrak = projelerThis.reduce((s, x) => s + x.sefer, 0);
        if (toplamSeferEvrak <= 0) return;

        const shareForSelected =
            projelerThis.find((x) => String(x.id) === String(selectedProjeId))?.sefer || 0;
        const weight = shareForSelected / toplamSeferEvrak;

        if (!weight) return;
        (e.evrakseferler || []).forEach((s) => {
            const key = (s.aciklama || "").trim() || "(Boş)";
            counts[key] = (counts[key] || 0) + weight;
        });
    });

    const rows = Object.entries(counts)
        .map(([name, value]) => ({
            name,
            value: +value.toFixed(1),
            pct: totalSefer ? +(((value) * 100) / totalSefer).toFixed(1) : 0,
        }))
        .sort((a, b) => b.value - a.value);

    return { group: projeler[selectedProjeId], totalSefer, rows };
}

/* ---- UI parçaları ---- */
function SingleExplain({ kind, explain, emptyText }) {
    return (
        <div className="rounded-3xl bg-[#121223] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.25)] p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{kind} Bazlı Açıklama</h3>
                {explain && (
                    <div className="text-xs opacity-80">
                        {kind}: <span className="font-medium">{explain.group}</span> · Toplam Sefer:{" "}
                        <span className="tabular-nums">{fmt(explain.totalSefer)}</span>
                    </div>
                )}
            </div>

            {!explain && <div className="text-sm opacity-70">{emptyText}</div>}

            {explain && (
                <div className="space-y-2">
                    {(explain.rows || []).map((r, idx) => (
                        <div key={r.name + idx} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-block w-3 h-3 rounded" style={{ background: COLORS[idx % COLORS.length] }} />
                                <span className="truncate" title={r.name}>{r.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 tabular-nums">%{r.pct}</span>
                                <span className="tabular-nums opacity-90">{fmt(r.value)}</span>
                            </div>
                        </div>
                    ))}
                    {(!explain.rows || explain.rows.length === 0) && (
                        <div className="text-sm opacity-70">Gösterilecek açıklama yok.</div>
                    )}
                </div>
            )}
        </div>
    );
}

function KpiCard({ icon, title, value, subtitle }) {
    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1b1830] to-[#161326] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,.25)] p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white flex items-center justify-center text-xl shadow-[0_0_20px_rgba(168,85,247,0.35)]">
                    {icon}
                </div>
                <div>
                    <div className="text-xs opacity-80">{title}</div>
                    <div className="text-2xl font-semibold tracking-tight">{value}</div>
                </div>
            </div>
            {subtitle && <div className="text-[11px] opacity-70">{subtitle}</div>}
        </div>
    );
}

function ChartCard({ title, data, gradId = "barGrad" }) {
    return (
        <div className="col-span-1 rounded-3xl bg-[#121223] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.25)] p-6">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ left: 8, right: 8 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f472b6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#23233a" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#e5e7eb" }}
                            interval={0}
                            angle={-22}
                            textAnchor="end"
                            height={56}
                            stroke="#9ca3af"
                        />
                        <YAxis tick={{ fill: "#e5e7eb" }} stroke="#9ca3af" />
                        <ReTooltip
                            contentStyle={{ background: "#151529", border: "1px solid #2b2b45", color: "#e5e7eb" }}
                            formatter={(v) => `${fmt(v)} sefer`}
                        />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]} fill={`url(#${gradId})`} />
                        <Legend wrapperStyle={{ color: "#e5e7eb" }} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
