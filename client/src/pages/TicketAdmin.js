import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Clock3,
    FileImage,
    Inbox,
    Loader2,
    MessageSquareText,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import Layout from "../components/Layout";
import useDarkMode from "../hooks/useDarkMode";
import { fetchAdminTickets, updateTicketAdmin } from "../services/ticketService";
import { formatTicketDate, isTicketAdmin, TICKET_PRIORITIES, TICKET_STATUSES } from "../utils/ticketUtils";
import { supabase } from "../supabaseClient";

export default function TicketAdmin() {
    useDarkMode();
    const admin = isTicketAdmin();
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [adminNote, setAdminNote] = useState("");

    const load = async () => {
        if (!admin) return;
        setLoading(true);
        try {
            const data = await fetchAdminTickets();
            setRows(data);
            setSelected((current) => current ? data.find((item) => item.id === current.id) || null : null);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!admin) return undefined;
        load();
        const channel = supabase
            .channel("ticket-admin-page")
            .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => load())
            .subscribe();
        const localHandler = () => load();
        window.addEventListener("ticket:changed", localHandler);
        return () => {
            window.removeEventListener("ticket:changed", localHandler);
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin]);

    const counts = useMemo(() => ({
        all: rows.length,
        new: rows.filter((r) => r.status === "new").length,
        reviewing: rows.filter((r) => r.status === "reviewing").length,
        resolved: rows.filter((r) => r.status === "resolved").length,
    }), [rows]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLocaleLowerCase("tr-TR");
        return rows.filter((row) => {
            const matchesStatus = statusFilter === "all" || row.status === statusFilter;
            const haystack = `${row.ticket_no} ${row.title} ${row.description} ${row.created_by_name} ${row.created_by_username}`.toLocaleLowerCase("tr-TR");
            return matchesStatus && (!needle || haystack.includes(needle));
        });
    }, [rows, q, statusFilter]);

    const openTicket = (ticket) => {
        setSelected(ticket);
        setAdminNote(ticket.admin_note || "");
        if (ticket.status === "new") changeStatus(ticket, "reviewing", false);
    };

    const changeStatus = async (ticket, status, showSaving = true) => {
        if (showSaving) setSaving(true);
        try {
            const updated = await updateTicketAdmin(ticket.id, { status });
            setRows((old) => old.map((item) => item.id === updated.id ? updated : item));
            setSelected((current) => current?.id === updated.id ? updated : current);
        } finally {
            if (showSaving) setSaving(false);
        }
    };

    const saveNote = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const updated = await updateTicketAdmin(selected.id, { admin_note: adminNote.trim() || null });
            setRows((old) => old.map((item) => item.id === updated.id ? updated : item));
            setSelected(updated);
        } finally {
            setSaving(false);
        }
    };

    if (!admin) {
        return <Layout><div className="grid min-h-[70vh] place-items-center bg-slate-50 p-6 dark:bg-[#0b1220]"><div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-500/20 dark:bg-[#111927]"><ShieldCheck size={34} className="mx-auto text-rose-500" /><h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Bu alan sadece admin içindir</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ticket yönetim ekranına erişim yetkiniz bulunmuyor.</p></div></div></Layout>;
    }

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100 sm:p-6 lg:p-7">
                <div className="mx-auto w-full max-w-[1800px]">
                    <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#111927] sm:p-6">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-600 via-cyan-400 to-emerald-400" />
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-400 text-white shadow-lg shadow-sky-500/20"><ShieldCheck size={23} /></div><div><div className="text-[9px] font-black uppercase tracking-[.14em] text-sky-600 dark:text-sky-300">Admin Merkezi</div><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Ticket Yönetimi</h1><p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Kullanıcı isteklerini, hataları ve ekran görüntülerini tek yerden takip edin.</p></div></div>
                            <button onClick={load} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Yenile</button>
                        </div>
                    </header>

                    <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[{ k: "all", l: "Toplam", v: counts.all, c: "text-slate-700 dark:text-slate-100" }, { k: "new", l: "Yeni", v: counts.new, c: "text-sky-600" }, { k: "reviewing", l: "İnceleniyor", v: counts.reviewing, c: "text-amber-600" }, { k: "resolved", l: "Çözüldü", v: counts.resolved, c: "text-emerald-600" }].map((item) => <button key={item.k} onClick={() => setStatusFilter(item.k)} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition dark:bg-[#111927] ${statusFilter === item.k ? "border-sky-400 ring-4 ring-sky-100 dark:ring-sky-500/10" : "border-slate-200/80 dark:border-white/[.08]"}`}><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{item.l}</div><div className={`mt-1 text-2xl font-black ${item.c}`}>{item.v}</div></button>)}
                    </section>

                    <div className="mt-4 grid min-h-[620px] gap-4 xl:grid-cols-[minmax(440px,.8fr)_minmax(0,1.2fr)]">
                        <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm dark:border-white/[.08] dark:bg-[#111927]">
                            <div className="border-b border-slate-200/80 p-4 dark:border-white/[.07]"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticket no, başlık veya kullanıcı ara…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-sky-400 dark:border-white/10 dark:bg-[#0d141f] dark:text-white" /></div></div>
                            <div className="max-h-[720px] overflow-y-auto p-2">
                                {loading ? <div className="grid h-52 place-items-center text-sm text-slate-400"><Loader2 size={22} className="animate-spin" /></div> : filtered.length ? filtered.map((ticket) => {
                                    const status = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.new;
                                    return <button key={ticket.id} onClick={() => openTicket(ticket)} className={`mb-2 w-full rounded-2xl border p-4 text-left transition ${selected?.id === ticket.id ? "border-sky-400 bg-sky-50 dark:bg-sky-500/[.06]" : "border-slate-200/70 bg-white hover:border-sky-200 hover:bg-slate-50 dark:border-white/[.07] dark:bg-white/[.02] dark:hover:bg-white/[.04]"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${TICKET_PRIORITIES[ticket.priority] || "bg-slate-400"}`} /><span className="truncate text-sm font-black text-slate-900 dark:text-white">{ticket.title}</span></div><div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400"><span>{ticket.ticket_no}</span><span>•</span><span>{ticket.created_by_name || ticket.created_by_username}</span><span>•</span><span>{formatTicketDate(ticket.created_at)}</span></div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${status.badge}`}>{status.label}</span></div><div className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{ticket.description}</div></button>;
                                }) : <div className="grid h-48 place-items-center text-center text-xs text-slate-400"><div><Inbox size={26} className="mx-auto mb-2 opacity-50" />Bu filtrede ticket bulunamadı.</div></div>}
                            </div>
                        </section>

                        <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#111927] sm:p-6">
                            {selected ? <div>
                                <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/[.07] lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.12em] text-sky-600 dark:text-sky-300">{selected.ticket_no}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black ${(TICKET_STATUSES[selected.status] || TICKET_STATUSES.new).badge}`}>{(TICKET_STATUSES[selected.status] || TICKET_STATUSES.new).label}</span></div><h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">{selected.title}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-400"><span className="flex items-center gap-1"><UserRound size={12} />{selected.created_by_name} (@{selected.created_by_username})</span><span className="flex items-center gap-1"><Clock3 size={12} />{formatTicketDate(selected.created_at)}</span><span>{selected.category}</span><span>{selected.priority}</span></div></div><select value={selected.status} onChange={(e) => changeStatus(selected, e.target.value)} disabled={saving} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black outline-none focus:border-sky-400 dark:border-white/10 dark:bg-[#0d141f] dark:text-white">{Object.entries(TICKET_STATUSES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}</select></div>

                                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                                    <div className="space-y-4"><div><div className="mb-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Açıklama</div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-7 text-slate-700 dark:border-white/[.07] dark:bg-[#0d141f] dark:text-slate-200 whitespace-pre-wrap">{selected.description}</div></div>
                                    {selected.screenshot_urls?.length > 0 && <div><div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-400"><FileImage size={13} />Ekran görüntüleri</div><div className="grid gap-2 sm:grid-cols-2">{selected.screenshot_urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/[.08] dark:bg-black/20"><img src={url} alt={`Ticket ekran görüntüsü ${index + 1}`} className="aspect-video h-full w-full object-cover transition group-hover:scale-[1.02]" /></a>)}</div></div>}
                                    <div><div className="mb-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Admin Notu</div><textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={4} placeholder="Kullanıcının görebileceği çözüm veya bilgilendirme notu…" className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-sky-400 dark:border-white/[.08] dark:bg-[#0d141f] dark:text-white" /><button onClick={saveNote} disabled={saving} className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-black text-white transition hover:bg-sky-500 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <MessageSquareText size={14} />}Notu Kaydet</button></div></div>
                                    <aside className="space-y-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[.07] dark:bg-[#0d141f]"><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Ekran</div><div className="mt-1 text-sm font-black text-slate-800 dark:text-white">{selected.screen_title || "-"}</div><div className="mt-1 break-all text-[10px] text-slate-400">{selected.screen_path || "-"}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[.07] dark:bg-[#0d141f]"><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Son Güncelleme</div><div className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">{formatTicketDate(selected.updated_at)}</div>{selected.assigned_admin && <div className="mt-1 text-[10px] text-slate-400">{selected.assigned_admin}</div>}</div></aside>
                                </div>
                            </div> : <div className="grid min-h-[520px] place-items-center text-center"><div><ShieldCheck size={38} className="mx-auto text-slate-300 dark:text-slate-600" /><h2 className="mt-4 text-lg font-black text-slate-800 dark:text-white">Bir ticket seçin</h2><p className="mt-1 text-xs text-slate-400">Detayları, ekran görüntülerini ve yönetim araçlarını burada göreceksiniz.</p></div></div>}
                        </section>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
