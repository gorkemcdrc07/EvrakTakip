// src/EvrakRaporları.js  (dosya adın buysa aynen böyle bırak)
// NOT: En alttaki "DEBUG" div'i artık return içinde. Component dışına JSX YOK.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

import { FiRefreshCw, FiCalendar, FiTrendingUp, FiPackage, FiHome, FiFilter, FiX } from "react-icons/fi";

function cx(...c) {
    return c.filter(Boolean).join(" ");
}

const COLORS = ["#8b5cf6", "#a78bfa", "#f472b6", "#fb7185", "#38bdf8", "#60a5fa", "#34d399", "#f59e0b"];
const normalize = (str) => (str || "").trim().toLocaleUpperCase("tr").replace(/\s+/g, " ");
const normalizeProject = (str) =>
    (str || "")
        .toLocaleUpperCase("tr")
        .replace(/["“”'`]+/g, "")
        .replace(/\s+/g, " ")
        .trim();

function canonicalProjectName(raw) {
    const n = normalizeProject(raw);

    if (n === "HEDEF DIŞ TEDARİK" || n.startsWith("HEDEF DIŞ TİCARET")) return "HEDEF DIŞ TEDARİK";
    if (n.startsWith("LEVENT OFSET")) return "LEVENT OFSET";
    if (n.startsWith("PAPİKS")) return "PAPİKS";
    if (n.includes("PARSİYEL")) return "PARSİYEL";
    if (n.startsWith("PEKER")) return "PEKER";
    if (n.startsWith("PETROL OFİSİ")) return "PETROL OFİSİ";
    if (n.startsWith("SARUHAN")) return "SARUHAN";
    if (n === "SGS") return "SGS";

    return n;
}

const fmt = (n) => Number(n || 0).toLocaleString("tr-TR");

function Pill({ tone = "neutral", children }) {
    const tones = {
        neutral:
            "bg-black/5 text-gray-800 dark:bg-white/10 dark:text-white border border-black/10 dark:border-white/10",
        purple:
            "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200 border border-violet-200/70 dark:border-violet-800/40",
    };
    return (
        <span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold", tones[tone])}>
            {children}
        </span>
    );
}

function MiniStat({ icon, label, value, tone = "purple" }) {
    const tones = {
        purple: "bg-violet-600/10 border-violet-500/20 text-violet-800 dark:text-violet-200",
        indigo: "bg-indigo-600/10 border-indigo-500/20 text-indigo-800 dark:text-indigo-200",
        emerald: "bg-emerald-600/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200",
    };
    return (
        <div className={cx("inline-flex items-center gap-2 rounded-2xl px-3 py-2 border", tones[tone])}>
            <span className="opacity-90">{icon}</span>
            <div className="leading-tight">
                <div className="text-[11px] font-extrabold opacity-70">{label}</div>
                <div className="text-sm font-extrabold tabular-nums">{value}</div>
            </div>
        </div>
    );
}

function Card({ title, right, children, className }) {
    return (
        <div
            className={cx(
                "rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-950/55 backdrop-blur-2xl shadow-sm overflow-hidden",
                className
            )}
        >
            {(title || right) && (
                <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                    <div className="font-extrabold">{title}</div>
                    {right}
                </div>
            )}
            <div className="p-5">{children}</div>
        </div>
    );
}

function SkeletonBlock({ h = 56 }) {
    return (
        <div
            style={{ height: h }}
            className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 animate-pulse"
        />
    );
}

function SelectNative({ label, value, onChange, options, placeholder = "Seçiniz", widthClass = "w-[320px]" }) {
    return (
        <div className="space-y-1.5">
            <div className="text-xs font-extrabold text-gray-600 dark:text-gray-300">{label}</div>
            <div className="relative">
                <select
                    value={value}
                    onChange={onChange}
                    className={cx(
                        "appearance-none w-full px-3 py-2.5 rounded-2xl",
                        "bg-white/85 dark:bg-zinc-900/60",
                        "border border-black/10 dark:border-white/10",
                        "outline-none focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30",
                        widthClass
                    )}
                >
                    <option value="">{placeholder}</option>
                    {options.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.ad}
                        </option>
                    ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70">▾</span>
            </div>
        </div>
    );
}

/* ---- explain builders ---- */
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

function buildProjeExplain(list, selectedProjeKey, projeKeyById, projeNameByKey) {
    if (!selectedProjeKey) return null;

    let totalSefer = 0;
    list.forEach((e) => {
        (e.evrakproje || []).forEach((p) => {
            if (projeKeyById[p.projeid] === selectedProjeKey) totalSefer += p.sefersayisi || 0;
        });
    });

    const counts = {};
    list.forEach((e) => {
        const projelerThis = (e.evrakproje || [])
            .map((p) => ({ key: projeKeyById[p.projeid], sefer: p.sefersayisi || 0 }))
            .filter((x) => x.sefer > 0);
        const toplamSeferEvrak = projelerThis.reduce((s, x) => s + x.sefer, 0);
        if (toplamSeferEvrak <= 0) return;

        const shareForSelected = projelerThis.find((x) => x.key === selectedProjeKey)?.sefer || 0;
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
            pct: totalSefer ? +((value * 100) / totalSefer).toFixed(1) : 0,
        }))
        .sort((a, b) => b.value - a.value);

    return { group: projeNameByKey[selectedProjeKey] || selectedProjeKey, totalSefer, rows };
}

function ExplainList({ title, explain, emptyText }) {
    return (
        <Card
            title={title}
            right={
                explain ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Seçim: <b className="text-gray-700 dark:text-gray-200">{explain.group}</b> · Toplam:{" "}
                        <b className="tabular-nums text-gray-700 dark:text-gray-200">{fmt(explain.totalSefer)}</b>
                    </div>
                ) : null
            }
        >
            {!explain ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">{emptyText}</div>
            ) : (
                <div className="space-y-2">
                    {(explain.rows || []).map((r, idx) => (
                        <div
                            key={r.name + idx}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-3"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-block w-3 h-3 rounded" style={{ background: COLORS[idx % COLORS.length] }} />
                                <span className="truncate font-semibold" title={r.name}>
                                    {r.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-800 dark:text-violet-200 tabular-nums text-xs font-extrabold">
                                    %{r.pct}
                                </span>
                                <span className="tabular-nums font-extrabold">{fmt(r.value)}</span>
                            </div>
                        </div>
                    ))}
                    {(!explain.rows || explain.rows.length === 0) && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">Gösterilecek açıklama yok.</div>
                    )}
                </div>
            )}
        </Card>
    );
}

export default function EvrakRaporlari() {
    const navigate = useNavigate();

    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeKeyById, setProjeKeyById] = useState({});
    const [projeNameByKey, setProjeNameByKey] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filtreler
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedLokasyonId, setSelectedLokasyonId] = useState("");
    const [selectedProjeKey, setSelectedProjeKey] = useState("");

    const [activeIndex, setActiveIndex] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(true);

    // --- KAYDEDİLMEMİŞ DEĞİŞİKLİK KORUMASI ---
    const [originalFilters] = useState({
        startDate: "",
        endDate: "",
        selectedLokasyonId: "",
        selectedProjeKey: "",
    });

    const hasDirtyFilters = useMemo(() => {
        const now = { startDate, endDate, selectedLokasyonId, selectedProjeKey };
        try {
            return JSON.stringify(now) !== JSON.stringify(originalFilters);
        } catch {
            return !!(startDate || endDate || selectedLokasyonId || selectedProjeKey);
        }
    }, [startDate, endDate, selectedLokasyonId, selectedProjeKey, originalFilters]);

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

                const _projeKeyById = {};
                const _projeNameByKey = {};
                projeData?.forEach((p) => {
                    const key = canonicalProjectName(p.proje);
                    if (!_projeNameByKey[key]) _projeNameByKey[key] = (p.proje || "").trim();
                    _projeKeyById[p.id] = key;
                });

                const sorted = (evrakData || []).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
                setEvraklar(sorted);
                setLokasyonlar(lokasyonMap);
                setProjeKeyById(_projeKeyById);
                setProjeNameByKey(_projeNameByKey);
            } catch (e) {
                console.error(e);
                setError("Veriler yüklenirken bir sorun oluştu.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (!hasDirtyFilters) return;
            e.preventDefault();
            e.returnValue = "";
        };
        if (hasDirtyFilters) window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasDirtyFilters]);

    useEffect(() => {
        const onAnchorClick = (e) => {
            if (!hasDirtyFilters) return;
            const a = e.target.closest("a");
            if (!a) return;

            if (a.origin === window.location.origin && a.target !== "_blank") {
                const ok = window.confirm("Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?");
                if (!ok) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        if (hasDirtyFilters) document.addEventListener("click", onAnchorClick, true);
        return () => document.removeEventListener("click", onAnchorClick, true);
    }, [hasDirtyFilters]);

    // Seçenek listeleri
    const lokasyonOptions = useMemo(
        () =>
            Object.entries(lokasyonlar)
                .map(([id, ad]) => ({ id, ad }))
                .sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
        [lokasyonlar]
    );

    const projeOptions = useMemo(
        () =>
            Object.entries(projeNameByKey)
                .map(([key, ad]) => ({ id: key, ad }))
                .sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
        [projeNameByKey]
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
            const projMatch = selectedProjeKey
                ? (e.evrakproje || []).some((p) => projeKeyById[p.projeid] === selectedProjeKey)
                : true;
            return lokMatch && projMatch;
        });
    }, [filteredEvraklar, selectedLokasyonId, selectedProjeKey, projeKeyById]);

    // KPI
    const toplamSefer = useMemo(() => scopedEvraklar.reduce((s, e) => s + (e.sefersayisi || 0), 0), [scopedEvraklar]);

    const duzeltilmis = useMemo(
        () =>
            scopedEvraklar.reduce(
                (sum, e) =>
                    sum + (e.evrakseferler?.filter((s) => normalize(s.aciklama) === "TARAFIMIZCA DÜZELTİLMİŞTİR").length || 0),
                0
            ),
        [scopedEvraklar]
    );

    const orjinaleCekilmis = useMemo(
        () =>
            scopedEvraklar.reduce(
                (sum, e) =>
                    sum + (e.evrakseferler?.filter((s) => normalize(s.aciklama) === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR").length || 0),
                0
            ),
        [scopedEvraklar]
    );

    // Seriler
    const projeSeries = useMemo(() => {
        const cnt = {};
        (scopedEvraklar || []).forEach((e) =>
            e.evrakproje?.forEach((p) => {
                const key = projeKeyById[p.projeid];
                if (!key) return;
                cnt[key] = (cnt[key] || 0) + (p.sefersayisi || 0);
            })
        );
        return Object.entries(cnt)
            .map(([key, value]) => ({ name: projeNameByKey[key] || key, value }))
            .sort((a, b) => b.value - a.value);
    }, [scopedEvraklar, projeKeyById, projeNameByKey]);

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
        setSelectedProjeKey("");
    };

    const explainLok = useMemo(
        () => buildLokasyonExplain(scopedEvraklar, selectedLokasyonId, lokasyonlar),
        [scopedEvraklar, selectedLokasyonId, lokasyonlar]
    );

    const explainProj = useMemo(
        () => buildProjeExplain(scopedEvraklar, selectedProjeKey, projeKeyById, projeNameByKey),
        [scopedEvraklar, selectedProjeKey, projeKeyById, projeNameByKey]
    );

    const hasAnyFilter = !!(startDate || endDate || selectedLokasyonId || selectedProjeKey);

    return (
        <div className="min-h-screen w-full bg-zinc-50 text-gray-900 dark:bg-[#0a0a0f] dark:text-white">
            {/* Premium background */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-[32rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500/25 via-purple-500/20 to-indigo-500/25 blur-3xl" />
                <div className="absolute bottom-[-8rem] right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-gradient-to-tr from-purple-400/15 to-indigo-400/10 blur-3xl" />
                <div className="absolute bottom-24 left-6 h-[18rem] w-[18rem] rounded-full bg-gradient-to-tr from-fuchsia-400/10 to-violet-400/10 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,.06)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.06)_1px,transparent_0)] [background-size:20px_20px] opacity-40 dark:opacity-20" />
            </div>

            {/* Page */}
            <div className="mx-auto max-w-7xl px-4 py-6">
                {/* Sticky header */}
                <div className="sticky top-0 z-20 mb-6 rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-950/60 backdrop-blur-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="inline-flex items-center gap-2 rounded-2xl bg-violet-600/10 dark:bg-violet-500/10 px-3 py-2 border border-violet-500/20">
                                        <span className="text-lg">📊</span>
                                        <span className="font-extrabold tracking-tight text-violet-700 dark:text-violet-200">
                                            Evrak Raporları
                                        </span>
                                    </div>

                                    <Pill tone={hasAnyFilter ? "purple" : "neutral"}>{hasAnyFilter ? "Filtre aktif" : "Filtre yok"}</Pill>

                                    {hasDirtyFilters && (
                                        <span className="text-xs font-extrabold text-amber-700 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                            Kaydedilmemiş değişiklik
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Tarih / proje / lokasyon seçin — KPI ve grafikler anında güncellenir.
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => navigate("/anasayfa")}
                                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    <FiHome /> Anasayfa
                                </button>

                                <button
                                    onClick={() => setFiltersOpen((v) => !v)}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold border",
                                        filtersOpen
                                            ? "border-violet-500/30 bg-violet-600/10 text-violet-800 dark:text-violet-200 dark:bg-violet-500/10"
                                            : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                    )}
                                >
                                    <FiFilter /> {filtersOpen ? "Filtreyi Gizle" : "Filtreyi Göster"}
                                </button>

                                <button
                                    onClick={resetAll}
                                    disabled={!hasAnyFilter}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold",
                                        hasAnyFilter
                                            ? "bg-zinc-950 text-white hover:opacity-90 dark:bg-white dark:text-zinc-950"
                                            : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-zinc-800 dark:text-gray-400"
                                    )}
                                >
                                    <FiX /> Temizle
                                </button>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-white font-semibold shadow-sm hover:opacity-95"
                                >
                                    <FiRefreshCw /> Yenile
                                </button>
                            </div>
                        </div>

                        {/* KPI mini row */}
                        <div className="mt-5 flex flex-wrap gap-2">
                            <MiniStat icon={<FiTrendingUp />} label="Toplam Sefer" value={fmt(toplamSefer)} tone="purple" />
                            <MiniStat icon={<FiPackage />} label="Düzeltilmiş" value={fmt(duzeltilmis)} tone="indigo" />
                            <MiniStat icon={<FiPackage />} label="Orijinale Çekilmiş" value={fmt(orjinaleCekilmis)} tone="emerald" />
                        </div>

                        {/* Error / Loading */}
                        {(error || loading) && (
                            <div className="mt-4">
                                {error && (
                                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
                                        {error}
                                    </div>
                                )}
                                {loading && !error && (
                                    <div className="mt-3 grid gap-3">
                                        <SkeletonBlock h={52} />
                                        <SkeletonBlock h={52} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main grid: Filters + Content */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
                    {/* Filters */}
                    <div className={cx(filtersOpen ? "block" : "hidden", "lg:block")}>
                        <Card
                            title="Filtreler"
                            right={<Pill tone={hasAnyFilter ? "purple" : "neutral"}>{hasAnyFilter ? "Aktif" : "Pasif"}</Pill>}
                        >
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <div className="text-xs font-extrabold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                            <FiCalendar /> Başlangıç
                                        </div>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-zinc-900/60 px-3 py-2.5 outline-none focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="text-xs font-extrabold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                            <FiCalendar /> Bitiş
                                        </div>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-zinc-900/60 px-3 py-2.5 outline-none focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                        />
                                    </div>
                                </div>

                                <SelectNative
                                    label="Proje"
                                    value={selectedProjeKey}
                                    onChange={(e) => setSelectedProjeKey(e.target.value)}
                                    options={projeOptions}
                                    placeholder="Tüm Projeler"
                                    widthClass="w-full"
                                />

                                <SelectNative
                                    label="Lokasyon"
                                    value={selectedLokasyonId}
                                    onChange={(e) => setSelectedLokasyonId(e.target.value)}
                                    options={lokasyonOptions}
                                    placeholder="Tüm Lokasyonlar"
                                    widthClass="w-full"
                                />

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        onClick={resetAll}
                                        disabled={!hasAnyFilter}
                                        className={cx(
                                            "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-extrabold border",
                                            hasAnyFilter
                                                ? "border-violet-500/30 bg-violet-600/10 text-violet-800 dark:text-violet-200 dark:bg-violet-500/10 hover:opacity-90"
                                                : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                        )}
                                    >
                                        <FiX /> Temizle
                                    </button>

                                    <button
                                        onClick={() => window.location.reload()}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-white font-extrabold hover:opacity-95"
                                    >
                                        <FiRefreshCw /> Yenile
                                    </button>
                                </div>

                                <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Not: Filtre değişiklikleri otomatik uygulanır. Sayfadan ayrılırsan tarayıcı uyarı verir.
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 grid gap-5">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                            <Card
                                title="Açıklama Dağılımı"
                                right={<span className="text-xs text-gray-500 dark:text-gray-400">Donut</span>}
                                className="xl:col-span-1"
                            >
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <ReTooltip
                                                contentStyle={{
                                                    background: "rgba(9,9,11,.95)",
                                                    border: "1px solid rgba(255,255,255,.12)",
                                                    color: "#e5e7eb",
                                                    borderRadius: 14,
                                                }}
                                                formatter={(value, name, props) => [`${value} adet — %${props.payload.percentOfTotal}`, name]}
                                            />
                                            <Pie
                                                data={aciklamaSeries}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={72}
                                                outerRadius={106}
                                                paddingAngle={2}
                                                onMouseEnter={(_, i) => setActiveIndex(i)}
                                                onMouseLeave={() => setActiveIndex(null)}
                                            >
                                                {aciklamaSeries.map((_, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={COLORS[i % COLORS.length]}
                                                        stroke="rgba(9,9,11,.65)"
                                                        strokeWidth={2}
                                                        opacity={activeIndex === null ? 1 : activeIndex === i ? 1 : 0.45}
                                                    />
                                                ))}
                                            </Pie>
                                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#e5e7eb">
                                                <tspan fontSize="12" opacity="0.7">
                                                    Toplam
                                                </tspan>
                                                <tspan x="50%" dy="18" fontSize="22" fontWeight="800">
                                                    {fmt(aciklamaSeries.reduce((s, x) => s + x.value, 0))}
                                                </tspan>
                                            </text>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            <BarCard title="Proje Bazlı Seferler" subtitle="Top 10" data={projeSeries.slice(0, 10)} gradId="barGradProj" />
                            <BarCard
                                title="Lokasyon Bazlı Seferler"
                                subtitle="Top 10"
                                data={lokasyonSeries.slice(0, 10)}
                                gradId="barGradLok"
                            />
                        </div>

                        <ExplainList
                            title="Lokasyon Bazlı Açıklama"
                            explain={explainLok}
                            emptyText="Lokasyon seçiniz; sadece o lokasyona ait açıklamalar listelenecektir."
                        />

                        <ExplainList
                            title="Proje Bazlı Açıklama"
                            explain={explainProj}
                            emptyText="Proje seçiniz; sadece o projeye ait açıklamalar listelenecektir."
                        />
                    </div>
                </div>
            </div>

            {/* ✅ DEBUG (GEÇİCİ) - return İÇİNDE */}
            <div className="fixed bottom-4 right-4 z-50 rounded-xl px-3 py-2 text-xs font-bold bg-white text-black dark:bg-black dark:text-white border border-black/10 dark:border-white/10">
                HTML dark mı? {document.documentElement.classList.contains("dark") ? "EVET" : "HAYIR"}
            </div>
        </div>
    );
}

function BarCard({ title, subtitle, data, gradId }) {
    return (
        <Card
            title={title}
            right={<span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>}
            className="xl:col-span-1"
        >
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ left: 6, right: 6 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f472b6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid stroke="rgba(255,255,255,.10)" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#cbd5e1" }}
                            interval={0}
                            angle={-22}
                            textAnchor="end"
                            height={56}
                            stroke="rgba(255,255,255,.20)"
                        />
                        <YAxis tick={{ fill: "#cbd5e1" }} stroke="rgba(255,255,255,.20)" />
                        <ReTooltip
                            contentStyle={{
                                background: "rgba(9,9,11,.95)",
                                border: "1px solid rgba(255,255,255,.12)",
                                color: "#e5e7eb",
                                borderRadius: 14,
                            }}
                            formatter={(v) => `${fmt(v)} sefer`}
                        />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]} fill={`url(#${gradId})`} />
                        <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}