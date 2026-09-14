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
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import { screenRegistry } from "../screenRegistry";
import { createTicket, fetchMyTickets } from "../services/ticketService";
import { formatTicketDate, TICKET_STATUSES } from "../utils/ticketUtils";

const emptyForm = { title: "", category: "Teknik Sorun", priority: "Normal", description: "" };
const MAX_FILES = 3;
const MAX_FILE_SIZE = 6 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function TicketCenter({ open, onClose }) {
    const location = useLocation();
    const fileRef = useRef(null);
    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState(null);
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
                    className="fixed inset-y-0 right-0 z-[11010] flex w-full max-w-[560px] flex-col border-l border-white/10 bg-[#0b1423] text-white shadow-[-30px_0_90px_rgba(0,0,0,0.38)]"
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
                            <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold"><MessageSquareText size={16} className="text-cyan-400" />Ticketlarım</h3><span className="text-xs text-slate-500">Son {tickets.length} kayıt</span></div>
                            {loadingTickets ? <div className="grid h-20 place-items-center text-xs text-slate-500"><Loader2 size={18} className="mb-1 animate-spin" />Yükleniyor…</div> : tickets.length ? <div className="space-y-2">{tickets.map((ticket) => {
                                const status = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.new;
                                return <div key={ticket.id} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 transition hover:border-cyan-400/20 hover:bg-white/[0.055]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0"><div className="truncate text-sm font-bold">{ticket.title}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span>{ticket.ticket_no}</span><span>•</span><span className="flex items-center gap-1"><Clock3 size={11} />{formatTicketDate(ticket.created_at)}</span>{ticket.screenshot_urls?.length > 0 && <><span>•</span><span className="flex items-center gap-1"><FileImage size={11} />{ticket.screenshot_urls.length} görsel</span></>}</div></div>
                                        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-black ${status.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                                    </div>
                                    {ticket.admin_note && <div className="mt-2 rounded-lg border border-cyan-400/10 bg-cyan-400/[.045] px-2.5 py-2 text-[10px] leading-4 text-cyan-100/75"><b className="text-cyan-300">Admin notu:</b> {ticket.admin_note}</div>}
                                </div>;
                            })}</div> : <div className="rounded-xl border border-white/[.06] bg-white/[.025] px-4 py-6 text-center text-xs text-slate-500"><Barcode size={20} className="mx-auto mb-2 opacity-60" />Henüz gönderilmiş ticket yok.</div>}
                        </div>
                    </div>

                    <div className="border-t border-white/10 px-5 py-3 text-center text-[10px] text-slate-600"><Camera size={12} className="mr-1 inline" />Ekran görüntüsü eklemek sorunun daha hızlı anlaşılmasını sağlar.</div>
                </motion.aside>
            </>}
        </AnimatePresence>
    );
}
