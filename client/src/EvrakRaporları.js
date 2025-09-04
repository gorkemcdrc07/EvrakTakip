import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip as ReTooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
} from "recharts";
import {
    FiRefreshCw,
    FiCalendar,
    FiFilter,
    FiTrendingUp,
    FiPackage,
    FiFileText,
} from "react-icons/fi";

// ===================== Dashboard (High-contrast, modernized) =====================

const COLORS = [
    "#7c3aed",
    "#a855f7",
    "#ec4899",
    "#f472b6",
    "#e879f9",
    "#d946ef",
    "#9333ea",
    "#c084fc",
];

export default function EvrakRaporlari() {
    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Donut hover state (for a nicer, interactive feel)
    const [activeIndex, setActiveIndex] = useState(null);

    const normalize = (str) => (str || "").trim().toLocaleUpperCase("tr").replace(/\s+/g, " ");

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError("");
                const { data: evrakData } = await supabase
                    .from("evraklar")
                    .select(
                        `id, tarih, lokasyonid, sefersayisi,
             evrakseferler:evrakseferler!fk_evrakseferler_evrakid ( seferno, aciklama ),
             evrakproje:evrakproje!fk_evrakproje_evrakid ( projeid, sefersayisi )`
                    );

                const { data: lokasyonData } = await supabase.from("lokasyonlar").select("*");
                const { data: projeData } = await supabase.from("projeler").select("*");

                const lokasyonMap = {};
                lokasyonData?.forEach((l) => (lokasyonMap[l.id] = l.lokasyon));
                const projeMap = {};
                projeData?.forEach((p) => (projeMap[p.id] = p.proje));

                const sorted = (evrakData || []).sort(
                    (a, b) => new Date(b.tarih) - new Date(a.tarih)
                );
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

    // Tarih filtresi
    const filteredEvraklar = useMemo(() => {
        return (evraklar || []).filter((e) => {
            const d = new Date(e.tarih);
            const after = startDate ? d >= new Date(startDate) : true;
            const before = endDate ? d <= new Date(endDate) : true;
            return after && before;
        });
    }, [evraklar, startDate, endDate]);

    // KPI
    const toplamSefer = useMemo(
        () => filteredEvraklar.reduce((sum, e) => sum + (e.sefersayisi || 0), 0),
        [filteredEvraklar]
    );
    const toplamEvrak = filteredEvraklar.length;
    const duzeltilmis = useMemo(
        () =>
            filteredEvraklar.reduce(
                (sum, e) =>
                    sum +
                    (e.evrakseferler?.filter(
                        (s) => normalize(s.aciklama) === "TARAFIMIZCA DÜZELTİLMİŞTİR"
                    ).length || 0),
                0
            ),
        [filteredEvraklar]
    );
    const orjinaleCekilmis = useMemo(
        () =>
            filteredEvraklar.reduce(
                (sum, e) =>
                    sum +
                    (e.evrakseferler?.filter(
                        (s) => normalize(s.aciklama) === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR"
                    ).length || 0),
                0
            ),
        [filteredEvraklar]
    );

    // Proje ve lokasyon serileri (sefer toplamı)
    const projeSeries = useMemo(() => {
        const cnt = {};
        filteredEvraklar.forEach((e) =>
            e.evrakproje?.forEach((p) => {
                const ad = projeler[p.projeid];
                if (!ad) return;
                cnt[ad] = (cnt[ad] || 0) + (p.sefersayisi || 0);
            })
        );
        return Object.entries(cnt)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredEvraklar, projeler]);

    const lokasyonSeries = useMemo(() => {
        const cnt = {};
        filteredEvraklar.forEach((e) => {
            const ad = lokasyonlar[e.lokasyonid];
            if (!ad) return;
            cnt[ad] = (cnt[ad] || 0) + (e.sefersayisi || 0);
        });
        return Object.entries(cnt)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredEvraklar, lokasyonlar]);

    // Açıklama: adet + % toplam sefer
    const aciklamaSeries = useMemo(() => {
        const cnt = {};
        filteredEvraklar.forEach((e) =>
            e.evrakseferler?.forEach((s) => {
                const key = (s.aciklama || "").trim() || "(Boş)";
                cnt[key] = (cnt[key] || 0) + 1;
            })
        );
        const entries = Object.entries(cnt).map(([name, value]) => ({ name, value }));
        const total = toplamSefer || 1; // yüzde tabanı toplam sefer
        return entries
            .map((x) => ({ ...x, percentOfTotal: +((x.value * 100) / total).toFixed(1) }))
            .sort((a, b) => b.value - a.value);
    }, [filteredEvraklar, toplamSefer]);

    // ===================== EKLENENLER =====================

    // LOKASYON bazlı açıklama: her lokasyon için { totalSefer, rows:[{name, value, pct}] }
    const lokasyonAciklamaGroups = useMemo(() => {
        const map = {};
        filteredEvraklar.forEach((e) => {
            const lok = lokasyonlar[e.lokasyonid];
            if (!lok) return;
            if (!map[lok]) map[lok] = { totalSefer: 0, counts: {} };
            map[lok].totalSefer += e.sefersayisi || 0;

            (e.evrakseferler || []).forEach((s) => {
                const key = (s.aciklama || "").trim() || "(Boş)";
                map[lok].counts[key] = (map[lok].counts[key] || 0) + 1;
            });
        });

        const arr = Object.entries(map).map(([lok, obj]) => {
            const rows = Object.entries(obj.counts)
                .map(([name, value]) => ({
                    name,
                    value,
                    pct: obj.totalSefer ? +((value * 100) / obj.totalSefer).toFixed(1) : 0,
                }))
                .sort((a, b) => b.value - a.value);
            return { group: lok, totalSefer: obj.totalSefer, rows };
        });

        return arr.sort((a, b) => (b.totalSefer || 0) - (a.totalSefer || 0));
    }, [filteredEvraklar, lokasyonlar]);

    // PROJE bazlı açıklama: açıklama adetleri proje sefer paylarına göre oransal dağıtılır
    const projeAciklamaGroups = useMemo(() => {
        // Proje toplam seferleri
        const projeTotalSefer = {};
        filteredEvraklar.forEach((e) => {
            (e.evrakproje || []).forEach((p) => {
                const ad = projeler[p.projeid];
                if (!ad) return;
                projeTotalSefer[ad] = (projeTotalSefer[ad] || 0) + (p.sefersayisi || 0);
            });
        });

        // Oransal dağıtım
        const projeCounts = {};
        filteredEvraklar.forEach((e) => {
            const projelerThis = (e.evrakproje || [])
                .map((p) => ({ name: projeler[p.projeid], sefer: p.sefersayisi || 0 }))
                .filter((x) => x.name && x.sefer > 0);

            const toplamSeferEvrak = projelerThis.reduce((s, x) => s + x.sefer, 0);
            if (toplamSeferEvrak <= 0) return;

            const shares = projelerThis.map((x) => ({
                name: x.name,
                w: x.sefer / toplamSeferEvrak,
            }));

            (e.evrakseferler || []).forEach((s) => {
                const key = (s.aciklama || "").trim() || "(Boş)";
                shares.forEach(({ name, w }) => {
                    if (!projeCounts[name]) projeCounts[name] = {};
                    projeCounts[name][key] = (projeCounts[name][key] || 0) + w; // fractional
                });
            });
        });

        const groups = Object.keys(projeCounts).map((projName) => {
            const totalSefer = projeTotalSefer[projName] || 0;
            const rows = Object.entries(projeCounts[projName])
                .map(([name, value]) => ({
                    name,
                    value: +value.toFixed(1),
                    pct: totalSefer ? +(((value) * 100) / totalSefer).toFixed(1) : 0,
                }))
                .sort((a, b) => b.value - a.value);
            return { group: projName, totalSefer, rows };
        });

        return groups.sort((a, b) => (b.totalSefer || 0) - (a.totalSefer || 0));
    }, [filteredEvraklar, projeler]);

    const resetFilters = () => {
        setStartDate("");
        setEndDate("");
    };

    return (
        <div className="min-h-screen w-full bg-[#0b0b10] text-gray-100">
            <div className="w-full px-6 py-6">
                {/* Üst Bar */}
                <div className="flex flex-wrap items-end gap-3 mb-6">
                    <div className="flex items-center gap-2 bg-[#141421]/95 backdrop-blur p-3 rounded-xl border border-gray-800/80 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                        <FiCalendar className="opacity-80" />
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 rounded-md bg-transparent border border-gray-700/80 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            />
                            <span className="text-sm opacity-70">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 rounded-md bg-transparent border border-gray-700/80 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            />
                        </div>
                        <button
                            onClick={resetFilters}
                            className="ml-2 text-sm px-3 py-2 rounded-md bg-gray-800/80 hover:bg-gray-700 transition-colors"
                        >
                            Temizle
                        </button>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-4 h-[44px] rounded-xl bg-gray-800/80 hover:bg-gray-700 transition-colors text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                    >
                        <FiRefreshCw /> Yenile
                    </button>

                    <div className="ml-auto flex items-center gap-2 text-sm opacity-80">
                        <FiFilter /> {startDate || endDate ? "Filtre uygulanıyor" : "Filtre yok"}
                    </div>
                </div>

                {/* Hata/Yükleniyor */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-900/30 text-red-200 border border-red-800">
                        {error}
                    </div>
                )}
                {loading && (
                    <div className="mb-6 p-4 rounded-xl bg-[#141421] border border-gray-800 animate-pulse">
                        Veriler yükleniyor…
                    </div>
                )}

                {/* KPI Kartları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KpiCard icon={<FiFileText />} title="Toplam Evrak" value={toplamEvrak.toLocaleString("tr-TR")} />
                    <KpiCard icon={<FiTrendingUp />} title="Toplam Sefer" value={toplamSefer.toLocaleString("tr-TR")} />
                    <KpiCard icon={<FiPackage />} title="Düzeltilmiş" value={duzeltilmis.toLocaleString("tr-TR")} subtitle="TARAFIMIZCA DÜZELTİLMİŞTİR" />
                    <KpiCard icon={<FiPackage />} title="Orijinale Çekilmiş" value={orjinaleCekilmis.toLocaleString("tr-TR")} subtitle="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR" />
                </div>

                {/* Grafikler */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                    {/* Donut: Açıklama Dağılımı */}
                    <div className="col-span-1 rounded-2xl bg-[#141421] border border-gray-800 shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Açıklama Dağılımı (Toplam Sefere Göre)</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <ReTooltip
                                        contentStyle={{ background: "#1f1f2d", border: "1px solid #3f3f54", color: "#e5e7eb" }}
                                        formatter={(value, name, props) => [
                                            `${value} adet — %${props.payload.percentOfTotal}`,
                                            name,
                                        ]}
                                    />
                                    <Pie
                                        data={aciklamaSeries}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        onMouseEnter={(_, i) => setActiveIndex(i)}
                                        onMouseLeave={() => setActiveIndex(null)}
                                    >
                                        {aciklamaSeries.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={COLORS[i % COLORS.length]}
                                                stroke="#0b0b10"
                                                // aktif dilime hafif büyüme efekti
                                                outerRadius={activeIndex === i ? 106 : 100}
                                            />
                                        ))}
                                    </Pie>
                                    {/* Merkezde toplam göstergesi */}
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#e5e7eb">
                                        <tspan fontSize="14" opacity="0.75">Toplam</tspan>
                                        <tspan x="50%" dy="18" fontSize="20" fontWeight="700">
                                            {aciklamaSeries.reduce((s, x) => s + x.value, 0).toLocaleString("tr-TR")}
                                        </tspan>
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Etiket listesi */}
                        <div className="mt-4 space-y-2 max-h-48 overflow-auto pr-1">
                            {aciklamaSeries.map((x, i) => (
                                <div key={i} className="flex items-center justify-between text-sm gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="inline-block w-3 h-3 rounded"
                                            style={{ background: COLORS[i % COLORS.length] }}
                                        />
                                        <span className="truncate" title={x.name}>
                                            {x.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 tabular-nums">
                                            %{x.percentOfTotal}
                                        </span>
                                        <span className="tabular-nums opacity-80">
                                            {x.value.toLocaleString("tr-TR")}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <ChartCard title="Proje Bazlı Seferler (Top 10)" data={projeSeries.slice(0, 10)} gradId="barGradProj" />
                    <ChartCard title="Lokasyon Bazlı Seferler (Top 10)" data={lokasyonSeries.slice(0, 10)} gradId="barGradLok" />
                </div>

                {/* ===================== YENİ BÖLÜMLER ===================== */}
                <div className="mb-8">
                    <GroupExplanationCard
                        title="Lokasyon Bazlı Açıklama"
                        groups={lokasyonAciklamaGroups}
                    />
                </div>

                <div className="mb-8">
                    <GroupExplanationCard
                        title="Proje Bazlı Açıklama (Oransal Dağıtım)"
                        groups={projeAciklamaGroups}
                    />
                </div>

                {/* Açıklama Detay Tablosu */}
                <div className="rounded-2xl bg-[#141421] border border-gray-800 shadow">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Açıklama Detay Tablosu (Toplam Sefere Oran)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-[#17172a] sticky top-0 z-10">
                                <tr>
                                    <Th>#</Th>
                                    <Th>Açıklama</Th>
                                    <Th className="text-right">Adet</Th>
                                    <Th className="text-right">% Toplam Sefer</Th>
                                    <Th>Görsel Gösterge</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {aciklamaSeries.map((row, idx) => (
                                    <tr key={row.name} className="border-b border-gray-800 odd:bg-[#141421] even:bg-[#10101a]">
                                        <Td>{idx + 1}</Td>
                                        <Td>
                                            <span className="line-clamp-2" title={row.name}>{row.name}</span>
                                        </Td>
                                        <Td className="text-right tabular-nums">{row.value.toLocaleString("tr-TR")}</Td>
                                        <Td className="text-right tabular-nums">%{row.percentOfTotal}</Td>
                                        <Td>
                                            <div className="w-full h-2 rounded bg-gray-800 overflow-hidden">
                                                <div
                                                    className="h-full"
                                                    style={{ width: `${row.percentOfTotal}%`, background: COLORS[idx % COLORS.length] }}
                                                />
                                            </div>
                                        </Td>
                                    </tr>
                                ))}
                                {!aciklamaSeries.length && (
                                    <tr>
                                        <Td colSpan={5} className="text-center py-10 opacity-70">
                                            Kayıt bulunamadı.
                                        </Td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ================ EK BİLEŞEN: Grup Kartı (Lokasyon/Proje bazlı açıklama) ================
function GroupExplanationCard({ title, groups, colorScale = COLORS, limitGroups = 6, limitRows = 6 }) {
    const list = groups.slice(0, limitGroups);
    return (
        <div className="rounded-2xl bg-[#141421] border border-gray-800 shadow p-6">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>

            {list.length === 0 && (
                <div className="text-sm opacity-70">Gösterilecek veri yok.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {list.map((g, gi) => (
                    <div key={g.group} className="rounded-xl border border-gray-800 overflow-hidden">
                        <div className="px-4 py-3 bg-[#17172a] flex items-center justify-between">
                            <div className="font-semibold truncate" title={g.group}>{g.group}</div>
                            <div className="text-xs opacity-70">
                                Toplam Sefer: <span className="tabular-nums">{(g.totalSefer || 0).toLocaleString("tr-TR")}</span>
                            </div>
                        </div>

                        <div className="p-4 space-y-2">
                            {(g.rows || []).slice(0, limitRows).map((r, ri) => (
                                <div key={r.name + ri} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="inline-block w-3 h-3 rounded"
                                            style={{ background: colorScale[ri % colorScale.length] }}
                                        />
                                        <span className="truncate" title={r.name}>{r.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 tabular-nums">
                                            %{r.pct}
                                        </span>
                                        <span className="tabular-nums opacity-80">
                                            {Number(r.value).toLocaleString("tr-TR")}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {(g.rows || []).length > limitRows && (
                                <div className="text-xs opacity-60 mt-2">+{(g.rows.length - limitRows)} daha…</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function KpiCard({ icon, title, value, subtitle }) {
    return (
        <div className="rounded-2xl bg-[#141421] border border-gray-800/80 shadow p-5 hover:shadow-lg hover:border-gray-700 transition-shadow">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#ec4899] text-white flex items-center justify-center text-xl shadow-[0_0_20px_rgba(168,85,247,0.25)]">
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
        <div className="col-span-1 rounded-2xl bg-[#141421] border border-gray-800 shadow p-6">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ left: 8, right: 8 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ec4899" stopOpacity={1} />
                                <stop offset="100%" stopColor="#7c3aed" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#2a2a3b" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#e5e7eb" }}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={60}
                            stroke="#9ca3af"
                        />
                        <YAxis tick={{ fill: "#e5e7eb" }} stroke="#9ca3af" />
                        <ReTooltip
                            contentStyle={{ background: "#1f1f2d", border: "1px solid #3f3f54", color: "#e5e7eb" }}
                            formatter={(v) => `${Number(v).toLocaleString("tr-TR")} sefer`}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={`url(#${gradId})`} />
                        <Legend wrapperStyle={{ color: "#e5e7eb" }} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function Th({ children, className = "" }) {
    return (
        <th className={`px-4 py-3 text-left font-semibold text-gray-100 ${className}`}>
            {children}
        </th>
    );
}
function Td({ children, className = "", ...rest }) {
    return (
        <td className={`px-4 py-3 align-top ${className}`} {...rest}>
            {children}
        </td>
    );
}
