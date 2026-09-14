import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Building2, CalendarDays, ChevronRight, Clock3, FileCheck2, FileStack, Gauge, MapPinned, PackageCheck, ReceiptText, RefreshCw, Route, Send, Sparkles } from "lucide-react";
import { supabase } from "./supabaseClient";
import { usePermissions } from "./permissions/PermissionContext";

const palette = ["#22d3ee", "#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ec4899"];
const trDays = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function Panel({ children, className = "", delay = 0 }) {
    return <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, delay }} className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)] dark:border-white/[0.08] dark:bg-[#111927] dark:shadow-[0_18px_55px_rgba(0,0,0,.18)] ${className}`}>{children}</motion.section>;
}

function MetricCard({ label, value, note, icon: Icon, color, trend, delay }) {
    const positive = trend >= 0;
    return <Panel delay={delay} className="group relative overflow-hidden p-5">
        <div className={`absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl ${color}`} />
        <div className="relative flex items-start justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-400">{label}</p><motion.p initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + .15 }} className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{Number(value || 0).toLocaleString("tr-TR")}</motion.p></div><motion.div whileHover={{ rotate: -8, scale: 1.08 }} className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-cyan-300"><Icon size={21} /></motion.div></div>
        <div className="relative mt-4 flex items-center justify-between text-xs"><span className="text-slate-500 dark:text-slate-400">{note}</span>{trend !== undefined && <span className={`flex items-center gap-1 rounded-full px-2 py-1 font-extrabold ${positive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(trend)}%</span>}</div>
    </Panel>;
}

function DailyBreakdown({ daily, loading }) {
    const todayKey = new Date().toISOString().slice(0, 10);
    const maxLoad = Math.max(...daily.map((item) => item.cargoRecords + item.documentRecords), 1);
    const visible = [...daily].reverse();
    return <Panel delay={.28} className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center dark:border-white/[0.08]">
            <div><h2 className="flex items-center gap-2 text-lg font-black"><CalendarDays size={19} className="text-cyan-500" />Günlük Operasyon Dökümü</h2><p className="mt-1 text-xs text-slate-500">Her günün kargo, evrak ve sefer rakamları ayrı ayrı gösterilir.</p></div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold"><span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-cyan-500">Kargo kaydı</span><span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-500">Kargo evrakı</span><span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-500">Evrak kaydı</span><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-500">Sefer</span></div>
        </div>
        {loading ? <div className="m-5 h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.04]" /> : <>
            <div className="hidden grid-cols-[1.25fr_repeat(4,minmax(100px,1fr))_1.3fr] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.11em] text-slate-400 md:grid dark:border-white/[0.05] dark:bg-white/[0.018]"><span>Tarih</span><span>Kargo</span><span>Kargo Evrakı</span><span>Evrak</span><span>Sefer</span><span>Günlük Yoğunluk</span></div>
            <div className="max-h-[480px] overflow-y-auto p-2">
                {visible.map((day, index) => {
                    const isToday = day.date === todayKey;
                    const load = day.cargoRecords + day.documentRecords;
                    const pct = Math.max(load ? 7 : 0, Math.round((load / maxLoad) * 100));
                    const dateText = new Date(`${day.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
                    return <motion.div key={day.date} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .018, .18) }} className={`mb-1 grid grid-cols-2 gap-3 rounded-xl border px-3 py-3 transition md:grid-cols-[1.25fr_repeat(4,minmax(100px,1fr))_1.3fr] md:items-center md:px-4 ${isToday ? "border-cyan-400/25 bg-cyan-500/[0.055]" : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/[0.06] dark:hover:bg-white/[0.025]"}`}>
                        <div className="col-span-2 flex items-center gap-2 md:col-span-1"><span className={`grid h-9 w-9 place-items-center rounded-xl text-[11px] font-black ${isToday ? "bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-md shadow-cyan-950/20" : "bg-slate-100 text-slate-500 dark:bg-white/[0.05]"}`}>{day.label.split(" ")[0]}</span><div><div className="text-sm font-extrabold">{dateText}</div>{isToday && <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-500">Bugün</div>}</div></div>
                        <div><div className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Kargo kaydı</div><div className="mt-0.5 text-lg font-black text-cyan-600 dark:text-cyan-300">{day.cargoRecords}</div></div>
                        <div><div className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Kargo evrakı</div><div className="mt-0.5 text-lg font-black text-blue-600 dark:text-blue-300">{day.cargoDocuments.toLocaleString("tr-TR")}</div></div>
                        <div><div className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Evrak kaydı</div><div className="mt-0.5 text-lg font-black text-violet-600 dark:text-violet-300">{day.documentRecords}</div></div>
                        <div><div className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Sefer</div><div className="mt-0.5 text-lg font-black text-emerald-600 dark:text-emerald-300">{day.trips.toLocaleString("tr-TR")}</div></div>
                        <div className="col-span-2 md:col-span-1"><div className="mb-1.5 flex justify-between text-[10px] font-bold text-slate-400"><span>Yoğunluk</span><span>%{pct}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .55, delay: Math.min(index * .015, .15) }} className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" /></div></div>
                    </motion.div>;
                })}
            </div>
        </>}
    </Panel>;
}

export default function Anasayfa() {
    const name = localStorage.getItem("ad") || "Kullanıcı";
    const username = (localStorage.getItem("username") || "").trim().toLocaleLowerCase("tr-TR");
    const { access } = usePermissions();
    const legacyDashboardUsers = ["yaren", "ozge", "mehmet", "rabia", "refika"];
    const canSeeDashboard = username === "admin" || (access?.configured ? access?.screen_permissions?.["/anasayfa"] === true : legacyDashboardUsers.includes(username));
    const [range, setRange] = useState(14);
    const [company, setCompany] = useState("Hepsi");
    const [companies, setCompanies] = useState(["Hepsi"]);
    const [cargoRows, setCargoRows] = useState([]);
    const [documentRows, setDocumentRows] = useState([]);
    const [locationCount, setLocationCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!canSeeDashboard) { setLoading(false); return; }
        (async () => {
            const { data, error: companyError } = await supabase.from("kargo_bilgileri").select("kargo_firmasi");
            if (!companyError) {
                const unique = [...new Set((data || []).map((item) => item.kargo_firmasi?.trim().toUpperCase()).filter(Boolean))].sort();
                setCompanies(["Hepsi", ...unique]);
            }
        })();
    }, [canSeeDashboard]);

    useEffect(() => {
        if (!canSeeDashboard) return;
        (async () => {
            setLoading(true); setError("");
            const end = new Date();
            const start = new Date(); start.setDate(end.getDate() - (range - 1));
            const startKey = start.toISOString().slice(0, 10);
            const endKey = end.toISOString().slice(0, 10);
            let cargoQuery = supabase.from("kargo_bilgileri").select("id,tarih,kargo_firmasi,gonderen_firma,irsaliye_no,evrak_adedi").gte("tarih", startKey).lte("tarih", endKey);
            if (company !== "Hepsi") cargoQuery = cargoQuery.ilike("kargo_firmasi", company);
            const [cargoResult, documentResult, locationResult] = await Promise.all([
                cargoQuery,
                supabase.from("evraklar").select("id,tarih,sefersayisi,lokasyonid").gte("tarih", startKey).lte("tarih", endKey),
                supabase.from("lokasyonlar").select("id", { count: "exact", head: true }),
            ]);
            if (cargoResult.error || documentResult.error) {
                setError("Kargo veya evrak verilerinin bir bölümü şu anda alınamadı.");
            }
            setCargoRows(cargoResult.data || []);
            setDocumentRows(documentResult.data || []);
            setLocationCount(locationResult.count || 0);
            setLoading(false);
        })();
    }, [range, company, refreshKey, canSeeDashboard]);

    const analytics = useMemo(() => {
        const end = new Date();
        const dayMap = {};
        for (let index = range - 1; index >= 0; index--) {
            const date = new Date(end); date.setDate(end.getDate() - index);
            const key = date.toISOString().slice(0, 10);
            dayMap[key] = { date: key, label: `${trDays[date.getDay()]} ${date.getDate()}`, cargoRecords: 0, cargoDocuments: 0, documentRecords: 0, trips: 0 };
        }
        const firmMap = {};
        cargoRows.forEach((row) => {
            const value = Number(row.evrak_adedi || 0);
            if (dayMap[row.tarih]) {
                dayMap[row.tarih].cargoRecords = (dayMap[row.tarih].cargoRecords || 0) + 1;
                dayMap[row.tarih].cargoDocuments = (dayMap[row.tarih].cargoDocuments || 0) + value;
            }
            const firm = (row.kargo_firmasi || "Bilinmiyor").trim().toUpperCase();
            firmMap[firm] = (firmMap[firm] || 0) + value;
        });
        documentRows.forEach((row) => {
            if (dayMap[row.tarih]) {
                dayMap[row.tarih].documentRecords = (dayMap[row.tarih].documentRecords || 0) + 1;
                dayMap[row.tarih].trips = (dayMap[row.tarih].trips || 0) + Number(row.sefersayisi || 0);
            }
        });
        const daily = Object.values(dayMap);
        const firms = Object.entries(firmMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const cargoCount = cargoRows.length;
        const cargoDocuments = cargoRows.reduce((sum, row) => sum + Number(row.evrak_adedi || 0), 0);
        const documentCount = documentRows.length;
        const tripCount = documentRows.reduce((sum, row) => sum + Number(row.sefersayisi || 0), 0);
        const todayCargo = daily[daily.length - 1]?.cargoRecords || 0;
        const yesterdayCargo = daily[daily.length - 2]?.cargoRecords || 0;
        const change = yesterdayCargo ? Math.round(((todayCargo - yesterdayCargo) / yesterdayCargo) * 100) : 0;
        const todayCargoDocuments = daily[daily.length - 1]?.cargoDocuments || 0;
        const yesterdayCargoDocuments = daily[daily.length - 2]?.cargoDocuments || 0;
        const cargoDocumentChange = yesterdayCargoDocuments
            ? Math.round(((todayCargoDocuments - yesterdayCargoDocuments) / yesterdayCargoDocuments) * 100)
            : 0;
        const peak = daily.reduce((best, item) => item.cargoDocuments > (best?.cargoDocuments || -1) ? item : best, null);
        const activeDays = daily.filter((item) => item.cargoRecords > 0 || item.documentRecords > 0).length;
        const invoiceCount = cargoRows.filter((row) => String(row.irsaliye_no || "").trim()).length;
        const senderCount = new Set(cargoRows.map((row) => row.gonderen_firma?.trim().toUpperCase()).filter(Boolean)).size;
        const avgDocumentsPerCargo = cargoCount ? cargoDocuments / cargoCount : 0;
        const documentsPerTrip = tripCount ? cargoDocuments / tripCount : 0;
        const topFirmShare = cargoDocuments && firms[0] ? Math.round((firms[0].value / cargoDocuments) * 100) : 0;
        const inactiveDays = Math.max(range - activeDays, 0);
        return {
            daily, firms, cargoCount, cargoDocuments, documentCount, tripCount,
            todayCargo, change, todayCargoDocuments, cargoDocumentChange,
            peak, activeDays, inactiveDays, invoiceCount, senderCount,
            avgDocumentsPerCargo, documentsPerTrip, topFirmShare
        };
    }, [cargoRows, documentRows, range]);

    if (!canSeeDashboard) return <div className="min-h-full bg-slate-50 p-6 dark:bg-[#080e18]"><Panel className="mx-auto mt-16 max-w-xl p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-500"><FileCheck2 size={26} /></div><h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">Hoş geldin, {name.split(" ")[0]}</h1><p className="mt-2 text-sm leading-relaxed text-slate-500">Yetkin olan işlemlere sol menüden ulaşabilirsin.</p></Panel></div>;

    return <div className="min-h-full bg-[#f5f7fa] p-4 text-slate-900 dark:bg-[#080e18] dark:text-white sm:p-6 lg:p-7">
        <div className="mx-auto max-w-[1540px] space-y-5">
            <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div><div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-cyan-600 dark:text-cyan-400"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]" />Canlı operasyon görünümü</div><h1 className="text-3xl font-black tracking-[-.035em] sm:text-4xl">Genel Bakış</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Merhaba {name.split(" ")[0]}, evrak operasyonunun güncel özeti burada.</p></div>
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/[0.08] dark:bg-[#111927]">
                    <label className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-slate-500 dark:text-slate-400"><Building2 size={16} /><select value={company} onChange={(event) => setCompany(event.target.value)} className="max-w-[180px] bg-transparent font-bold text-slate-700 outline-none dark:text-slate-200">{companies.map((item) => <option key={item} className="bg-white dark:bg-slate-900">{item}</option>)}</select></label>
                    <div className="hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block" />
                    <div className="flex gap-1">{[7, 14, 30].map((days) => <button key={days} onClick={() => setRange(days)} className={`h-9 rounded-lg px-3 text-xs font-extrabold transition ${range === days ? "bg-slate-900 text-white shadow-md dark:bg-cyan-500 dark:text-slate-950" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"}`}>{days} gün</button>)}</div>
                    <motion.button whileTap={{ rotate: 180 }} onClick={() => setRefreshKey((value) => value + 1)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-cyan-500 dark:hover:bg-white/[0.06]" title="Verileri yenile"><RefreshCw size={16} /></motion.button>
                </div>
            </motion.header>

            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{error}</div>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Kargo Kaydı" value={analytics.cargoCount} note={`${range} günlük gönderi kaydı`} icon={PackageCheck} color="bg-cyan-400/15" trend={analytics.change} delay={.03} />
                <MetricCard label="Kargo Evrakı" value={analytics.cargoDocuments} note="Kargolardaki toplam evrak" icon={Send} color="bg-blue-500/15" delay={.08} />
                <MetricCard label="Evrak Kaydı" value={analytics.documentCount} note="Operasyon evrak satırı" icon={FileStack} color="bg-violet-500/15" delay={.13} />
                <MetricCard label="Toplam Sefer" value={analytics.tripCount} note="Evraklara bağlı sefer sayısı" icon={Route} color="bg-emerald-500/15" delay={.18} />
            </div>

            <Panel delay={.19} className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden sm:grid-cols-3 sm:divide-y-0 xl:grid-cols-6 dark:divide-white/[0.06]">
                {[
                    { label: "Bugünkü Kargo", value: analytics.todayCargo, icon: PackageCheck },
                    { label: "İrsaliyeli Kayıt", value: analytics.invoiceCount, icon: ReceiptText },
                    { label: "Kargo Firması", value: analytics.firms.length, icon: Building2 },
                    { label: "Gönderici Firma", value: analytics.senderCount, icon: Send },
                    { label: "Lokasyon", value: locationCount, icon: MapPinned },
                    { label: "Aktif Gün", value: `${analytics.activeDays}/${range}`, icon: CalendarDays },
                ].map((item) => <div key={item.label} className="group flex items-center gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.025]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-cyan-500/10 group-hover:text-cyan-500 dark:bg-white/[0.05]"><item.icon size={17} /></span><div className="min-w-0"><div className="text-lg font-black">{typeof item.value === "number" ? item.value.toLocaleString("tr-TR") : item.value}</div><div className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</div></div></div>)}
            </Panel>

            <Panel delay={.18} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.08]">
                    <div>
                        <h2 className="flex items-center gap-2 text-base font-black"><Sparkles size={18} className="text-cyan-500" />Operasyon İçgörüleri</h2>
                        <p className="mt-1 text-xs text-slate-500">Seçili dönemin hacim, verim ve yoğunluk göstergeleri</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">{range} günlük analiz</span>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4 dark:divide-white/[0.06]">
                    {[
                        {
                            label: "Kayıt başına evrak",
                            value: analytics.avgDocumentsPerCargo.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
                            note: `${analytics.cargoDocuments.toLocaleString("tr-TR")} evrak / ${analytics.cargoCount.toLocaleString("tr-TR")} kargo kaydı`,
                            icon: FileStack,
                            tone: "text-blue-500 bg-blue-500/10"
                        },
                        {
                            label: "Sefer başına kargo evrakı",
                            value: analytics.documentsPerTrip.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
                            note: `${analytics.tripCount.toLocaleString("tr-TR")} toplam sefer`,
                            icon: Route,
                            tone: "text-emerald-500 bg-emerald-500/10"
                        },
                        {
                            label: "Bugünkü kargo evrakı",
                            value: analytics.todayCargoDocuments.toLocaleString("tr-TR"),
                            note: analytics.cargoDocumentChange >= 0 ? `Düne göre %${analytics.cargoDocumentChange} artış` : `Düne göre %${Math.abs(analytics.cargoDocumentChange)} düşüş`,
                            icon: PackageCheck,
                            tone: analytics.cargoDocumentChange >= 0 ? "text-cyan-500 bg-cyan-500/10" : "text-rose-500 bg-rose-500/10"
                        },
                        {
                            label: "Lider firma payı",
                            value: `%${analytics.topFirmShare}`,
                            note: analytics.firms[0]?.name || "Firma verisi yok",
                            icon: Building2,
                            tone: "text-amber-500 bg-amber-500/10"
                        }
                    ].map((item) => <div key={item.label} className="group flex items-center gap-4 p-5 transition hover:bg-slate-50 dark:hover:bg-white/[0.025]">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${item.tone}`}><item.icon size={19} /></span>
                        <div className="min-w-0">
                            <div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400">{item.label}</div>
                            <div className="mt-1 text-2xl font-black tracking-tight">{item.value}</div>
                            <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">{item.note}</div>
                        </div>
                    </div>)}
                </div>
            </Panel>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
                <Panel delay={.2} className="min-w-0 p-5 sm:p-6">
                    <div className="mb-5 flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-lg font-black"><BarChart3 size={19} className="text-cyan-500" />Kargo ve Evrak Trendi</h2><p className="mt-1 text-xs text-slate-500">Kargo kaydı, kargo evrakı ve operasyon evrakının günlük karşılaştırması</p></div><span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-extrabold text-emerald-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Güncel</span></div>
                    <div className="h-[330px]">{loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.04]" /> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.daily} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}><defs><linearGradient id="cargoArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={.28} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={.01} /></linearGradient><linearGradient id="cargoDocumentArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={.24} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={.01} /></linearGradient><linearGradient id="documentArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={.24} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(148,163,184,.14)" strokeDasharray="4 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#7c8a9d", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#7c8a9d", fontSize: 11 }} allowDecimals={false} /><Tooltip cursor={{ stroke: "#22d3ee", strokeDasharray: "4 4" }} contentStyle={{ background: "#101827", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "white", boxShadow: "0 16px 40px rgba(0,0,0,.25)" }} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Area name="Kargo Kaydı" type="monotone" dataKey="cargoRecords" stroke="#22d3ee" strokeWidth={2.5} fill="url(#cargoArea)" /><Area name="Kargo Evrakı" type="monotone" dataKey="cargoDocuments" stroke="#3b82f6" strokeWidth={2.5} fill="url(#cargoDocumentArea)" /><Area name="Evrak Kaydı" type="monotone" dataKey="documentRecords" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#documentArea)" /></AreaChart></ResponsiveContainer>}</div>
                </Panel>

                <Panel delay={.25} className="p-5 sm:p-6"><div className="mb-4"><h2 className="flex items-center gap-2 text-lg font-black"><Gauge size={19} className="text-violet-500" />Kargo Firması Dağılımı</h2><p className="mt-1 text-xs text-slate-500">Kargoyla gönderilen evrak hacmindeki paylar</p></div><div className="relative h-[210px]">{loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.04]" /> : <><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.firms.slice(0, 6)} dataKey="value" nameKey="name" innerRadius={64} outerRadius={88} paddingAngle={3} stroke="none">{analytics.firms.slice(0, 6).map((item, index) => <Cell key={item.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip contentStyle={{ background: "#101827", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "white" }} formatter={(value) => [`${value} evrak`, "Kargo evrakı"]} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-black">{analytics.firms.length}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kargo Firması</div></div></div></>}</div><div className="mt-3 space-y-2">{analytics.firms.slice(0, 4).map((firm, index) => <div key={firm.name} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: palette[index] }} /><span className="min-w-0 flex-1 truncate font-semibold text-slate-600 dark:text-slate-300">{firm.name}</span><span className="font-black">%{analytics.cargoDocuments ? Math.round((firm.value / analytics.cargoDocuments) * 100) : 0}</span></div>)}</div></Panel>
            </div>

            <DailyBreakdown daily={analytics.daily} loading={loading} />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_1fr]">
                <Panel delay={.3} className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/[0.08]"><div><h2 className="text-base font-black">Kargo Firması Performansı</h2><p className="mt-1 text-xs text-slate-500">Gönderilen evrak hacmine göre sıralama</p></div><Building2 size={19} className="text-cyan-500" /></div><div className="divide-y divide-slate-100 p-2 dark:divide-white/[0.05]">{analytics.firms.slice(0, 6).map((firm, index) => { const pct = analytics.cargoDocuments ? Math.round((firm.value / analytics.cargoDocuments) * 100) : 0; return <motion.div key={firm.name} whileHover={{ x: 3 }} className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.035]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-500 dark:bg-white/[0.05]">{index + 1}</span><div className="min-w-0 flex-1"><div className="mb-1.5 flex justify-between gap-3"><span className="truncate text-sm font-bold">{firm.name}</span><span className="text-xs font-black">{firm.value.toLocaleString("tr-TR")}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .7, delay: .3 + index * .05 }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" /></div></div><span className="w-10 text-right text-xs font-bold text-slate-400">%{pct}</span></motion.div>; })}{!loading && !analytics.firms.length && <div className="grid h-36 place-items-center text-sm text-slate-500">Bu dönemde firma verisi bulunmuyor.</div>}</div></Panel>

                <Panel delay={.34} className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-base font-black"><Sparkles size={18} className="text-amber-500" />Akıllı Özet</h2><p className="mt-1 text-xs text-slate-500">Seçili dönemden hızlı çıkarımlar</p></div></div><div className="space-y-3">{[
                    { icon: CalendarDays, color: "text-cyan-500 bg-cyan-500/10", title: "En yoğun kargo günü", value: analytics.peak ? `${analytics.peak.label} • ${analytics.peak.cargoDocuments.toLocaleString("tr-TR")} kargo evrakı` : "Veri yok" },
                    { icon: Clock3, color: "text-violet-500 bg-violet-500/10", title: "Aktif çalışma", value: `${analytics.activeDays}/${range} gün işlem kaydı var` },
                    { icon: Activity, color: "text-emerald-500 bg-emerald-500/10", title: "Bugünkü kargo durumu", value: analytics.change >= 0 ? `Kargo kaydı düne göre %${analytics.change} arttı` : `Kargo kaydı düne göre %${Math.abs(analytics.change)} düştü` },
                ].map((item) => <div key={item.title} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.color}`}><item.icon size={18} /></span><div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-400">{item.title}</div><div className="mt-0.5 truncate text-sm font-extrabold">{item.value}</div></div><ChevronRight size={16} className="text-slate-300 dark:text-slate-600" /></div>)}</div></Panel>
            </div>
        </div>
    </div>;
}
