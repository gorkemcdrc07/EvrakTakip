import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Headphones, X, Send, Clock3, AlertCircle, CheckCircle2, MessageSquareText, Sparkles } from "lucide-react";

const emptyForm = { title: "", category: "Teknik Sorun", priority: "Normal", description: "" };

export default function TicketCenter({ open, onClose }) {
    const [form, setForm] = useState(emptyForm);
    const [saved, setSaved] = useState(false);
    const [tickets, setTickets] = useState(() => {
        try { return JSON.parse(localStorage.getItem("ets-ticket-drafts") || "[]"); } catch { return []; }
    });
    const valid = form.title.trim().length >= 4 && form.description.trim().length >= 10;
    const priorities = useMemo(() => ({ Düşük: "bg-slate-500", Normal: "bg-cyan-500", Yüksek: "bg-amber-500", Acil: "bg-red-500" }), []);

    useEffect(() => {
        const handler = (event) => { if (event.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const saveDraft = (event) => {
        event.preventDefault();
        if (!valid) return;
        const item = { ...form, id: `TK-${String(Date.now()).slice(-6)}`, createdAt: new Date().toISOString(), status: "Taslak" };
        const next = [item, ...tickets].slice(0, 6);
        setTickets(next);
        localStorage.setItem("ets-ticket-drafts", JSON.stringify(next));
        setForm(emptyForm);
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
    };

    return <AnimatePresence>{open && <>
        <motion.button aria-label="Ticket merkezini kapat" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[11000] bg-slate-950/65 backdrop-blur-[5px]" />
        <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 330, damping: 34 }} className="fixed inset-y-0 right-0 z-[11010] flex w-full max-w-[520px] flex-col border-l border-white/10 bg-[#0b1423] text-white shadow-[-30px_0_90px_rgba(0,0,0,0.38)]">
            <div className="relative overflow-hidden border-b border-white/10 p-6">
                <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-500/15 blur-3xl" />
                <div className="relative flex items-start justify-between"><div className="flex gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 shadow-lg shadow-cyan-950/40"><Headphones size={21} /></div><div><div className="flex items-center gap-2"><h2 className="text-lg font-black">Ticket Merkezi</h2><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">BETA</span></div><p className="mt-1 text-xs text-slate-400">Sorunu anlat, takip edilebilir bir talep oluştur.</p></div></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={19} /></button></div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
                <form onSubmit={saveDraft} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3"><label className="space-y-1.5"><span className="text-xs font-bold text-slate-400">Kategori</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold outline-none focus:border-cyan-400/50"><option className="bg-slate-900">Teknik Sorun</option><option className="bg-slate-900">Veri Hatası</option><option className="bg-slate-900">Yeni Özellik</option><option className="bg-slate-900">Yetki Talebi</option></select></label><label className="space-y-1.5"><span className="text-xs font-bold text-slate-400">Öncelik</span><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold outline-none focus:border-cyan-400/50"><option className="bg-slate-900">Düşük</option><option className="bg-slate-900">Normal</option><option className="bg-slate-900">Yüksek</option><option className="bg-slate-900">Acil</option></select></label></div>
                    <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-400">Kısa başlık</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Örn. Excel aktarımında satırlar eksik" className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10" /></label>
                    <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-400">Açıklama</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ne yaptığını, ne beklediğini ve ne olduğunu yaz…" rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] p-3 text-sm leading-relaxed outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10" /></label>
                    <div className="flex items-center justify-between rounded-xl border border-blue-400/10 bg-blue-400/[0.06] px-3 py-2 text-xs text-blue-200/70"><span className="flex items-center gap-2"><Sparkles size={14} />Aktif ekran bilgisi talebe otomatik eklenir.</span><span>{form.description.length}/1000</span></div>
                    <motion.button whileHover={valid ? { y: -2 } : {}} whileTap={valid ? { scale: .98 } : {}} disabled={!valid} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-extrabold shadow-lg shadow-cyan-950/30 transition disabled:cursor-not-allowed disabled:opacity-35"><Send size={17} />Ticket taslağını kaydet</motion.button>
                </form>

                <AnimatePresence>{saved && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-300"><CheckCircle2 size={17} />Taslak kaydedildi.</motion.div>}</AnimatePresence>

                {tickets.length > 0 && <div className="mt-7"><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold"><MessageSquareText size={16} className="text-cyan-400" />Son ticket taslakları</h3><span className="text-xs text-slate-500">Bu cihazda</span></div><div className="space-y-2">{tickets.map((ticket) => <div key={ticket.id} className="group rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 transition hover:border-cyan-400/20 hover:bg-white/[0.055]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{ticket.title}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500"><span>{ticket.id}</span><span>•</span><span className="flex items-center gap-1"><Clock3 size={11} />{new Date(ticket.createdAt).toLocaleDateString("tr-TR")}</span></div></div><span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-slate-300"><span className={`h-1.5 w-1.5 rounded-full ${priorities[ticket.priority]}`} />{ticket.priority}</span></div></div>)}</div></div>}
            </div>
            <div className="border-t border-white/10 px-5 py-3 text-center text-[11px] text-slate-600"><AlertCircle size={12} className="mr-1 inline" />Taslaklar henüz destek ekibine gönderilmez.</div>
        </motion.aside>
    </>}</AnimatePresence>;
}
