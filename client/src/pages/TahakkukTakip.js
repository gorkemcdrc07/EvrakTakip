import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    ReceiptText,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const dateKey = (value) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(`${String(value).slice(0,10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const addDays = (base, days) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
};
const statusPaid = (value) => {
    const v = String(value || "").toLocaleLowerCase("tr-TR");
    return v === "odendi" || v === "ödendi";
};
const formatTR = (value) => {
    if (!value) return "-";
    return new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString("tr-TR", {
        day: "2-digit", month: "short", year: "numeric"
    });
};

export default function TahakkukTakip() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));

    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("tahakkuk")
            .select("*")
            .order("odeme_gunu", { ascending: true });
        if (!error) setRows(data || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const analytics = useMemo(() => {
        const today = dateKey(new Date());
        const tomorrow = dateKey(addDays(new Date(), 1));
        const in3 = dateKey(addDays(new Date(), 3));
        const in7 = dateKey(addDays(new Date(), 7));

        const openRows = rows.filter((row) => !statusPaid(row.durum));
        const paidRows = rows.filter((row) => statusPaid(row.durum));
        const overdue = openRows.filter((row) => row.odeme_gunu && row.odeme_gunu < today);
        const dueToday = openRows.filter((row) => row.odeme_gunu === today);
        const dueTomorrow = openRows.filter((row) => row.odeme_gunu === tomorrow);
        const next3 = openRows.filter((row) => row.odeme_gunu > today && row.odeme_gunu <= in3);
        const next7 = openRows.filter((row) => row.odeme_gunu > today && row.odeme_gunu <= in7);
        const upcoming = openRows
            .filter((row) => row.odeme_gunu && row.odeme_gunu >= today)
            .slice()
            .sort((a,b) => String(a.odeme_gunu).localeCompare(String(b.odeme_gunu)))
            .slice(0, 20);

        return { today, tomorrow, overdue, dueToday, dueTomorrow, next3, next7, upcoming, openRows, paidRows };
    }, [rows]);

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const calendarCells = useMemo(() => {
        const first = new Date(year, month, 1);
        const total = new Date(year, month + 1, 0).getDate();
        const cells = [];
        for (let i=0; i<(first.getDay()+6)%7; i++) cells.push(null);
        for (let day=1; day<=total; day++) cells.push(new Date(year, month, day));
        return cells;
    }, [year, month]);

    const selectedRows = useMemo(
        () => rows.filter((row) => row.odeme_gunu === selectedDate),
        [rows, selectedDate]
    );

    const countForDay = (key) => rows.filter((row) => row.odeme_gunu === key && !statusPaid(row.durum)).length;

    const cards = [
        { label:"Geciken", value:analytics.overdue.length, note:"Ödeme tarihi geçmiş", icon:AlertTriangle, tone:"text-rose-500 bg-rose-500/10" },
        { label:"Bugün", value:analytics.dueToday.length, note:"Bugün kontrol edilmeli", icon:Clock3, tone:"text-amber-500 bg-amber-500/10" },
        { label:"Yarın", value:analytics.dueTomorrow.length, note:"Yarın ödeme günü", icon:CalendarDays, tone:"text-cyan-500 bg-cyan-500/10" },
        { label:"7 Gün", value:analytics.next7.length, note:"Yaklaşan tahakkuk", icon:Sparkles, tone:"text-blue-500 bg-blue-500/10" },
    ];

    return (
        <div className="min-h-full bg-slate-50 p-4 text-slate-900 dark:bg-[#080e18] dark:text-white sm:p-6">
            <div className="mx-auto max-w-[1500px] space-y-5">
                <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[.16em] text-cyan-500">Tahakkuk Operasyonu</p>
                        <h1 className="mt-1 text-3xl font-black tracking-tight">Tahakkuk Takip</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Yaklaşan ödeme günlerini, geciken kayıtları ve yapılacak kontrolleri tek ekrandan takip et.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={load} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-[#111927]">
                            <RefreshCw size={17}/>
                        </button>
                        <button onClick={() => navigate("/app/tahakkuk")} className="flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-xs font-black text-slate-950">
                            <ReceiptText size={16}/>Tahakkuk Ekranı
                        </button>
                    </div>
                </header>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card,index) => (
                        <motion.div key={card.label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*.05}} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#111927]">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</div>
                                    <div className="mt-2 text-3xl font-black">{card.value}</div>
                                    <div className="mt-1 text-xs text-slate-500">{card.note}</div>
                                </div>
                                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${card.tone}`}><card.icon size={19}/></span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/[.08] dark:bg-[#111927]">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/[.07]">
                            <div>
                                <h2 className="font-black">Ödeme Takvimi</h2>
                                <p className="mt-1 text-xs text-slate-500">Güne tıklayarak o tarihteki tahakkukları gör.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCursor(new Date(year,month-1,1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 dark:border-white/10"><ChevronLeft size={17}/></button>
                                <b className="min-w-36 text-center text-sm">{cursor.toLocaleDateString("tr-TR",{month:"long",year:"numeric"})}</b>
                                <button onClick={() => setCursor(new Date(year,month+1,1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 dark:border-white/10"><ChevronRight size={17}/></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7">
                            {["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map((day) => (
                                <div key={day} className="border-b border-r border-slate-100 p-2 text-center text-[10px] font-black uppercase text-slate-400 dark:border-white/5">{day}</div>
                            ))}
                            {calendarCells.map((date,index) => {
                                const key = date ? dateKey(date) : "";
                                const openCount = date ? countForDay(key) : 0;
                                const allCount = date ? rows.filter((row) => row.odeme_gunu === key).length : 0;
                                const selected = key === selectedDate;
                                const isToday = key === analytics.today;
                                return (
                                    <button
                                        key={index}
                                        disabled={!date}
                                        onClick={() => date && setSelectedDate(key)}
                                        className={`min-h-28 border-b border-r border-slate-100 p-2 text-left transition dark:border-white/5 ${
                                            selected ? "bg-cyan-50 dark:bg-cyan-500/[.08]" : "hover:bg-slate-50 dark:hover:bg-white/[.025]"
                                        }`}
                                    >
                                        {date && <>
                                            <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black ${isToday ? "bg-cyan-500 text-slate-950" : ""}`}>{date.getDate()}</span>
                                            {openCount > 0 && <span className="mt-2 block rounded-lg bg-amber-500/10 px-2 py-1 text-[9px] font-black text-amber-600">{openCount} BEKLEYEN</span>}
                                            {allCount > openCount && <span className="mt-1 block rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-600">{allCount-openCount} ÖDENDİ</span>}
                                        </>}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[.08] dark:bg-[#111927]">
                        <div className="mb-4">
                            <h2 className="font-black">{formatTR(selectedDate)}</h2>
                            <p className="mt-1 text-xs text-slate-500">Seçili tarihteki tahakkuklar</p>
                        </div>
                        <div className="max-h-[520px] space-y-2 overflow-y-auto">
                            {selectedRows.map((row) => (
                                <button key={row.id} onClick={() => navigate("/app/tahakkuk")} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-cyan-200 dark:border-white/[.06]">
                                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${statusPaid(row.durum) ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                                        {statusPaid(row.durum) ? <CheckCircle2 size={17}/> : <Clock3 size={17}/>}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <b className="block truncate text-sm">{row.tedarikci_firma || "Firma"}</b>
                                        <span className="mt-1 block text-[10px] font-bold uppercase text-slate-400">{statusPaid(row.durum) ? "Ödendi" : "Ödenecek"}</span>
                                    </span>
                                </button>
                            ))}
                            {!loading && !selectedRows.length && <div className="p-10 text-center text-xs text-slate-500">Bu tarihte tahakkuk yok.</div>}
                        </div>
                    </section>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/[.08] dark:bg-[#111927]">
                    <div className="border-b border-slate-200 px-5 py-4 dark:border-white/[.07]">
                        <h2 className="font-black">Yaklaşan İşlemler</h2>
                        <p className="mt-1 text-xs text-slate-500">Ödeme tarihine göre en yakın bekleyen tahakkuklar.</p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-white/[.05]">
                        {analytics.upcoming.map((row) => {
                            const diff = Math.ceil((new Date(`${row.odeme_gunu}T12:00:00`) - new Date(`${analytics.today}T12:00:00`))/86400000);
                            return <div key={row.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_150px_130px] sm:items-center">
                                <div>
                                    <b className="text-sm">{row.tedarikci_firma || "Firma"}</b>
                                    <p className="mt-1 text-xs text-slate-500">{row.aciklama || "Açıklama yok"}</p>
                                </div>
                                <div className="text-xs font-bold text-slate-500">{formatTR(row.odeme_gunu)}</div>
                                <div className={`rounded-full px-3 py-1.5 text-center text-[10px] font-black ${diff===0?"bg-amber-500/10 text-amber-600":diff<=3?"bg-cyan-500/10 text-cyan-600":"bg-slate-100 text-slate-500 dark:bg-white/5"}`}>
                                    {diff===0 ? "BUGÜN" : `${diff} GÜN KALDI`}
                                </div>
                            </div>;
                        })}
                        {!loading && !analytics.upcoming.length && <div className="p-12 text-center text-sm text-slate-500">Yaklaşan tahakkuk bulunmuyor.</div>}
                    </div>
                </section>
            </div>
        </div>
    );
}
