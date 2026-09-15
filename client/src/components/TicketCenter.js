import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import {
    AlertCircle,
    Barcode,
    Camera,
    CheckCircle2,
    Clock3,
    FileImage,
    Headphones,
    ImagePlus,
    Loader2,
    MessageSquareText,
    Send,
    Eye,
    PlayCircle,
    CircleCheckBig,
    ArrowLeft,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import { screenRegistry } from "../screenRegistry";
import { createTicket, fetchMyTickets, fetchTicketMessages, sendTicketMessage } from "../services/ticketService";
import { supabase } from "../supabaseClient";
import { formatTicketDate, TICKET_STATUSES } from "../utils/ticketUtils";

const emptyForm = { title: "", category: "Teknik Sorun", priority: "Normal", description: "" };
const MAX_FILES = 3;
const MAX_FILE_SIZE = 6 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function TicketCenter({ open, onClose, initialTicketId = null }) {
    const location = useLocation();
    const fileRef = useRef(null);
    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatText, setChatText] = useState("");
    const [chatSending, setChatSending] = useState(false);
    const username = localStorage.getItem("username") || "";
    const screenPath = location.pathname.replace(/^\/app/, "") || "/anasayfa";
    const screenTitle = screenRegistry[screenPath]?.title || "Bilinmeyen ekran";
    const valid = form.title.trim().length >= 4 && form.description.trim().length >= 10;

    const previews = useMemo(
        () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [files]
    );

    useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);

    const loadTickets = async () => {
        if (!username) return;
        setLoadingTickets(true);
        try {
            setTickets(await fetchMyTickets(username));
        } catch (error) {
            console.error("Ticket listesi alınamadı", error);
        } finally {
            setLoadingTickets(false);
        }
    };

    const addFiles = (incoming) => {
        const picked = Array.from(incoming || []);
        const invalid = picked.find((file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE);
        if (invalid) {
            setFeedback({ type: "error", text: "Sadece PNG, JPG veya WEBP yükleyebilirsiniz. Her görsel en fazla 6 MB olabilir." });
            return;
        }
        setFiles((old) => [...old, ...picked].slice(0, MAX_FILES));
    };

    useEffect(() => {
        if (!open) return;
        loadTickets();
        const handler = (event) => { if (event.key === "Escape") onClose(); };
        const pasteHandler = (event) => {
            const imageFiles = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
            if (imageFiles.length) {
                event.preventDefault();
                addFiles(imageFiles);
                setFeedback({ type: "success", text: "Ekran görüntüsü panodan eklendi." });
            }
        };
        window.addEventListener("keydown", handler);
        window.addEventListener("paste", pasteHandler);
        return () => {
            window.removeEventListener("keydown", handler);
            window.removeEventListener("paste", pasteHandler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, username, onClose, files.length]);



    const openMyTicket = async (ticket) => {
        setActiveTicket(ticket);
        try { setMessages(await fetchTicketMessages(ticket.id)); } catch (error) { console.error(error); }
    };

    useEffect(() => {
        if (!open || !initialTicketId) return;
        const openTarget = async () => {
            let list = tickets;
            if (!list.length) {
                try { list = await fetchMyTickets(username); setTickets(list); } catch (error) { console.error(error); return; }
            }
            const target = list.find((ticket) => String(ticket.id) === String(initialTicketId));
            if (target) await openMyTicket(target);
        };
        openTarget();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialTicketId, username]);

    useEffect(() => {
        if (!open || !activeTicket?.id) return undefined;
        const channel = supabase.channel(`ticket-user-chat-${activeTicket.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${activeTicket.id}` }, (payload) => {
                setMessages((old) => old.some((m) => m.id === payload.new.id) ? old : [...old, payload.new]);
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${activeTicket.id}` }, (payload) => {
                setActiveTicket(payload.new);
                setTickets((old) => old.map((t) => t.id === payload.new.id ? payload.new : t));
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [open, activeTicket?.id]);

    const sendUserMessage = async (event) => {
        event?.preventDefault();
        if (!chatText.trim() || !activeTicket || chatSending) return;
        setChatSending(true);
        try {
            const sent = await sendTicketMessage(activeTicket, chatText, "user");
            if (sent) setMessages((old) => old.some((m) => m.id === sent.id) ? old : [...old, sent]);
            setChatText("");
        } catch (error) { setFeedback({ type: "error", text: `Mesaj gönderilemedi: ${error?.message || "Bilinmeyen hata"}` }); }
        finally { setChatSending(false); }
    };

    const submitTicket = async (event) => {
        event.preventDefault();
        if (!valid || sending) return;
        setSending(true);
        setFeedback(null);
        try {
            const created = await createTicket({ form, files, screenPath, screenTitle });
            setForm(emptyForm);
            setFiles([]);
            setFeedback({ type: "success", text: `${created.ticket_no} numaralı ticket destek ekibine gönderildi.` });
            await loadTickets();
        } catch (error) {
            console.error(error);
            const storageHint = String(error?.message || "").toLowerCase().includes("bucket")
                ? " Ticket storage kurulumu yapılmamış olabilir."
                : "";
            setFeedback({ type: "error", text: `Ticket gönderilemedi: ${error?.message || "Bilinmeyen hata"}.${storageHint}` });
        } finally {
            setSending(false);
        }
    };

    return (
        <AnimatePresence>
            {open && <>
                <motion.button
                    aria-label="Ticket merkezini kapat"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[11000] bg-slate-950/65 backdrop-blur-[5px]"
                />
                <motion.aside
                    data-permission-scope="global"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", stiffness: 330, damping: 34 }}
                    className="fixed inset-y-0 right-0 z-[11010] flex w-full max-w-[720px] flex-col border-l border-white/10 bg-[#0b1423] text-white shadow-[-30px_0_90px_rgba(0,0,0,0.38)]"
                >
                    <div className="relative overflow-hidden border-b border-white/10 p-5 sm:p-6">
                        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-500/15 blur-3xl" />
                        <div className="relative flex items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 shadow-lg shadow-cyan-950/40">
                                    <Headphones size={21} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-black">Destek & Ticket</h2>
                                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black text-emerald-300">CANLI</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">Sorunu veya isteği gönder; durumunu buradan takip et.</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white">
                                <X size={19} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                        <form onSubmit={submitTicket} className="space-y-4">
                            <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[.055] px-3 py-2.5 text-xs text-cyan-100/75">
                                <div className="flex items-center gap-2 font-bold text-cyan-300"><Sparkles size={14} /> Aktif ekran otomatik eklenecek</div>
                                <div className="mt-1 truncate text-[11px] text-slate-400">{screenTitle} · {screenPath}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1.5">
                                    <span className="text-xs font-bold text-slate-400">Kategori</span>
                                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold outline-none focus:border-cyan-400/50">
                                        <option className="bg-slate-900">Teknik Sorun</option>
                                        <option className="bg-slate-900">Veri Hatası</option>
                                        <option className="bg-slate-900">Güncelleme İsteği</option>
                                        <option className="bg-slate-900">Yeni Özellik</option>
                                        <option className="bg-slate-900">Yetki Talebi</option>
                                        <option className="bg-slate-900">Diğer</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-xs font-bold text-slate-400">Öncelik</span>
                                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold outline-none focus:border-cyan-400/50">
                                        <option className="bg-slate-900">Düşük</option>
                                        <option className="bg-slate-900">Normal</option>
                                        <option className="bg-slate-900">Yüksek</option>
                                        <option className="bg-slate-900">Acil</option>
                                    </select>
                                </label>
                            </div>

                            <label className="block space-y-1.5">
                                <span className="text-xs font-bold text-slate-400">Kısa başlık</span>
                                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="Örn. Tüm Evraklar Excel çıktısında iki satır eksik" className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10" />
                            </label>

                            <label className="block space-y-1.5">
                                <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">Açıklama</span><span className="text-[10px] text-slate-600">{form.description.length}/1500</span></div>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 1500) })} placeholder="Ne yaptınız, ne olmasını bekliyordunuz ve ne oldu? Mümkünse hata mesajını da yazın…" rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] p-3 text-sm leading-relaxed outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10" />
                            </label>

                            <div>
                                <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-400">Ekran görüntüsü</span><span className="text-[10px] text-slate-600">En fazla {MAX_FILES} görsel · 6 MB</span></div>
                                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                                {files.length < MAX_FILES && (
                                    <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-[82px] w-full items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[.035] text-sm font-bold text-slate-400 transition hover:border-cyan-400/35 hover:bg-cyan-400/[.05] hover:text-cyan-200">
                                        <ImagePlus size={20} />
                                        <span>Görsel seç veya Ctrl+V ile ekran görüntüsü yapıştır</span>
                                    </button>
                                )}
                                {previews.length > 0 && <div className="mt-2 grid grid-cols-3 gap-2">{previews.map(({ file, url }, index) => (
                                    <div key={`${file.name}-${index}`} className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/25">
                                        <img src={url} alt="Ticket ekran görüntüsü" className="h-full w-full object-cover" />
                                        <button type="button" onClick={() => setFiles((old) => old.filter((_, i) => i !== index))} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-slate-950/80 text-slate-300 opacity-0 transition hover:text-rose-300 group-hover:opacity-100"><Trash2 size={13} /></button>
                                        <div className="absolute inset-x-0 bottom-0 truncate bg-slate-950/75 px-2 py-1 text-[9px] text-slate-300">{file.name}</div>
                                    </div>
                                ))}</div>}
                            </div>

                            {feedback && (
                                <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-semibold ${feedback.type === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-rose-400/20 bg-rose-400/10 text-rose-300"}`}>
                                    {feedback.type === "success" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
                                    <span>{feedback.text}</span>
                                </div>
                            )}

                            <motion.button whileHover={valid && !sending ? { y: -2 } : {}} whileTap={valid && !sending ? { scale: .98 } : {}} disabled={!valid || sending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-extrabold shadow-lg shadow-cyan-950/30 transition disabled:cursor-not-allowed disabled:opacity-35">
                                {sending ? <><Loader2 size={17} className="animate-spin" />Gönderiliyor…</> : <><Send size={17} />Ticket Gönder</>}
                            </motion.button>
                        </form>

                        <div className="mt-7">
                            {!activeTicket ? <>
                                <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold"><MessageSquareText size={16} className="text-cyan-400" />Ticketlarım</h3><span className="text-xs text-slate-500">Detay için ticket'a tıkla</span></div>
                                {loadingTickets ? <div className="grid h-20 place-items-center text-xs text-slate-500"><Loader2 size={18} className="mb-1 animate-spin" />Yükleniyor…</div> : tickets.length ? <div className="space-y-2">{tickets.map((ticket) => {
                                    const status = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.new;
                                    return <button type="button" onClick={() => openMyTicket(ticket)} key={ticket.id} className="w-full rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 text-left transition hover:border-cyan-400/30 hover:bg-white/[0.06]">
                                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{ticket.title}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span>{ticket.ticket_no}</span><span>•</span><span><Clock3 size={11} className="mr-1 inline" />{formatTicketDate(ticket.created_at)}</span></div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${status.badge}`}>{status.label}</span></div>
                                        <div className="mt-2 text-[10px] font-bold text-cyan-300">Takip et & canlı görüşmeyi aç →</div>
                                    </button>;
                                })}</div> : <div className="rounded-xl border border-white/[.06] bg-white/[.025] px-4 py-6 text-center text-xs text-slate-500"><Barcode size={20} className="mx-auto mb-2 opacity-60" />Henüz gönderilmiş ticket yok.</div>}
                            </> : <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
                                <div className="border-b border-white/10 p-4">
                                    <button type="button" onClick={() => { setActiveTicket(null); setMessages([]); }} className="mb-3 flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white"><ArrowLeft size={14}/> Ticketlarıma dön</button>
                                    <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black text-cyan-400">{activeTicket.ticket_no}</div><div className="mt-1 text-base font-black">{activeTicket.title}</div></div><span className={`rounded-full px-2 py-1 text-[9px] font-black ${(TICKET_STATUSES[activeTicket.status] || TICKET_STATUSES.new).badge}`}>{(TICKET_STATUSES[activeTicket.status] || TICKET_STATUSES.new).label}</span></div>
                                </div>
                                <div className="grid grid-cols-4 gap-1 border-b border-white/10 p-3 text-center">
                                    {[{ok:true,icon:CheckCircle2,label:"Oluşturuldu",date:activeTicket.created_at},{ok:!!activeTicket.seen_at,icon:Eye,label:"Görüldü",date:activeTicket.seen_at},{ok:!!activeTicket.started_at,icon:PlayCircle,label:"İşleme alındı",date:activeTicket.started_at},{ok:!!activeTicket.resolved_at || activeTicket.status === "resolved",icon:CircleCheckBig,label:"Çözüldü",date:activeTicket.resolved_at}].map((step,i)=>{const I=step.icon;return <div key={i} className={step.ok?"text-cyan-300":"text-slate-600"}><I size={17} className="mx-auto"/><div className="mt-1 text-[9px] font-black">{step.label}</div><div className="mt-0.5 text-[8px] opacity-70">{step.date?formatTicketDate(step.date):"Bekleniyor"}</div></div>})}
                                </div>
                                {activeTicket.assigned_admin && <div className="border-b border-white/10 px-4 py-2 text-[10px] text-slate-400">İlgilenen: <b className="text-slate-200">{activeTicket.assigned_admin}</b></div>}
                                <div className="max-h-[42vh] space-y-3 overflow-y-auto bg-gradient-to-b from-transparent to-slate-950/20 p-4">
                                    <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-white/[.07] p-3 text-xs leading-5 text-slate-200"><b className="mb-1 block text-[9px] uppercase text-slate-400">Ticket açıklaması</b>{activeTicket.description}</div>
                                    {messages.map((m)=><div key={m.id} className={`flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl p-3 text-xs leading-5 ${m.sender_role === "user" ? "rounded-tr-md bg-cyan-500 text-slate-950" : "rounded-tl-md bg-white/[.08] text-slate-100"}`}><div className={`mb-1 text-[9px] font-black ${m.sender_role === "user" ? "text-cyan-950/60" : "text-cyan-300"}`}>{m.sender_role === "admin" ? (m.sender_name || "Destek") : "Siz"} · {formatTicketDate(m.created_at)}</div><div className="whitespace-pre-wrap">{m.message}</div></div></div>)}
                                    {!messages.length && <div className="py-4 text-center text-[10px] text-slate-600">Henüz mesaj yok. Destek ekibine buradan soru sorabilirsiniz.</div>}
                                </div>
                                <form onSubmit={sendUserMessage} className="flex gap-2 border-t border-white/10 p-3"><textarea value={chatText} onChange={(e)=>setChatText(e.target.value.slice(0,3000))} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendUserMessage();}}} rows={2} placeholder="Destek ekibine mesaj yaz…" className="min-h-[46px] flex-1 resize-none rounded-xl border border-white/10 bg-white/[.05] p-3 text-xs outline-none focus:border-cyan-400/40"/><button disabled={!chatText.trim()||chatSending} className="grid w-12 place-items-center rounded-xl bg-cyan-500 text-slate-950 disabled:opacity-30">{chatSending?<Loader2 size={17} className="animate-spin"/>:<Send size={17}/>}</button></form>
                            </div>}
                        </div>
                    </div>

                    <div className="border-t border-white/10 px-5 py-3 text-center text-[10px] text-slate-600"><Camera size={12} className="mr-1 inline" />Ekran görüntüsü eklemek sorunun daha hızlı anlaşılmasını sağlar.</div>
                </motion.aside>
            </>}
        </AnimatePresence>
    );
}
