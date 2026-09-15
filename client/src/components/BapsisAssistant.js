import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, ChevronRight, Loader2, MessageCircle, Minimize2, Search, Send, Sparkles, Truck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useTabStore from "../stores/tabStore";
import { screenRegistry } from "../screenRegistry";

const trLower = (v) => String(v || "").toLocaleLowerCase("tr-TR");
const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const tomorrowKey = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const formatDate = (value) => value ? new Date(value).toLocaleDateString("tr-TR") : "—";

const starter = {
  id: "welcome", role: "bot",
  text: "Merhaba! Ben BAPSİS Operasyon Asistanı. Kargo kayıtlarını sorgulayabilir, bekleyenleri ve bugün eklenenleri sayabilir, irsaliye/gönderi numarası arayabilirim.",
  chips: ["Bugün kaç kargo eklendi?", "Kaç kargo bekliyor?", "Son 7 günü özetle", "Kargo ara"]
};

export default function BapsisAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([starter]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const openTab = useTabStore((s) => s.openTab);
  const name = localStorage.getItem("ad") || "Kullanıcı";

  useEffect(() => { if (open) setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 60); }, [messages, open, busy]);
  useEffect(() => {
    const key = (e) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") { e.preventDefault(); setOpen(v => !v); } };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, []);

  const go = (path) => {
    const screen = screenRegistry[path];
    if (screen) openTab({ path, title: screen.title });
    navigate(`/app${path}`); setOpen(false);
  };

  const addBot = (text, extra = {}) => setMessages(v => [...v, { id: `${Date.now()}-b`, role: "bot", text, ...extra }]);

  const count = async (table, build) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    q = build ? build(q) : q;
    const { count: n, error } = await q; if (error) throw error; return n || 0;
  };

  const searchCargo = async (term) => {
    const safe = String(term).replace(/[,%()]/g, " ").trim();
    if (!safe) return [];
    const { data, error } = await supabase.from("kargo_bilgileri").select("id,tarih,kargo_firmasi,gonderi_numarasi,gonderen_firma,irsaliye_adi,irsaliye_no,odak_evrak_no,evrak_adedi")
      .or(`gonderi_numarasi.ilike.%${safe}%,irsaliye_no.ilike.%${safe}%,odak_evrak_no.ilike.%${safe}%,kargo_firmasi.ilike.%${safe}%,gonderen_firma.ilike.%${safe}%`).order("tarih", { ascending: false }).limit(8);
    if (error) throw error; return data || [];
  };

  const answer = async (raw) => {
    const q = trLower(raw).trim();
    const today = todayKey(); const tomorrow = tomorrowKey();
    if (/yardım|neler yap|ne yapabil/.test(q)) return addBot("Şunları sorabilirsin: bugün eklenen kargolar, bekleyen Hedef Kargo kayıtları, son 7 gün özeti veya irsaliye/gönderi/Odak evrak numarasıyla arama.", { chips: ["Bugün eklenenler", "Bekleyenleri say", "Son 7 günü özetle"] });

    if (/bekleyen|teslim edilme|teslim olmam/.test(q)) {
      const n = await count("hedef_kargo", x => x.is("teslim_tarihi", null));
      return addBot(`Hedef Kargo'da şu anda ${n.toLocaleString("tr-TR")} bekleyen kayıt var. Durum/teslim tarihi boş olan kayıtları da bu sayıya dahil ettim.`, { action: { label: "Hedef Kargo'yu aç", path: "/hedef-kargo" } });
    }
    if (/bugün/.test(q) && /kargo|eklen|kayıt/.test(q)) {
      const [all, target] = await Promise.all([
        count("kargo_bilgileri", x => x.gte("tarih", today).lt("tarih", tomorrow)),
        count("hedef_kargo", x => x.gte("tarih", today).lt("tarih", tomorrow))
      ]);
      return addBot(`Bugün Tüm Kargolar'a ${all.toLocaleString("tr-TR")}, Hedef Kargo'ya ${target.toLocaleString("tr-TR")} kayıt eklenmiş.`, { chips: ["Kaç kargo bekliyor?", "Son 7 günü özetle"], action: { label: "Tüm Kargolar'ı aç", path: "/tum-kargo-bilgileri" } });
    }
    if (/son 7|hafta|7 gün/.test(q)) {
      const d = new Date(); d.setDate(d.getDate() - 6); const start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const [all, target, pending] = await Promise.all([
        count("kargo_bilgileri", x => x.gte("tarih", start).lt("tarih", tomorrow)),
        count("hedef_kargo", x => x.gte("tarih", start).lt("tarih", tomorrow)),
        count("hedef_kargo", x => x.is("teslim_tarihi", null))
      ]);
      return addBot(`Son 7 gün özeti: Tüm Kargolar'da ${all.toLocaleString("tr-TR")} yeni kayıt, Hedef Kargo'da ${target.toLocaleString("tr-TR")} yeni kayıt var. Güncel bekleyen sayısı ${pending.toLocaleString("tr-TR")}.`);
    }

    let term = raw.trim();
    term = term.replace(/^(kargo|irsaliye|irsaliye no|gönderi|gönderi no|odak evrak|ara|bul)\s*[:#-]?\s*/i, "").trim();
    if (/kargo ara|ara$|bul$/.test(q) || term.length < 2) return addBot("Aramak istediğin irsaliye, gönderi, Odak evrak numarasını veya firma adını yaz. Örnek: “123456 irsaliyeyi bul”.");
    term = term.replace(/\s+(irsaliye(si|yi)?|gönderi(si|yi)?|kargo(su|yu)?|kaydı|kaydını|bul|ara)$/i, "").trim();
    const rows = await searchCargo(term);
    if (!rows.length) return addBot(`“${term}” için Tüm Kargolar'da eşleşen kayıt bulamadım. Numaranın veya firma adının bir bölümünü de yazabilirsin.`);
    return addBot(`${rows.length} eşleşme buldum${rows.length === 8 ? " (ilk 8 sonuç)" : ""}.`, { rows, action: { label: "Tüm Kargolar'ı aç", path: "/tum-kargo-bilgileri" } });
  };

  const send = async (value = input) => {
    const text = String(value || "").trim(); if (!text || busy) return;
    setMessages(v => [...v, { id: `${Date.now()}-u`, role: "user", text }]); setInput(""); setBusy(true);
    try { await answer(text); } catch (e) { console.error("BAPSİS Asistan:", e); addBot(`Veriyi okurken bir sorun oluştu: ${e?.message || "Bağlantı hatası"}. Tekrar deneyebilirsin.`); }
    finally { setBusy(false); }
  };

  const lastBot = useMemo(() => [...messages].reverse().find(x => x.role === "bot"), [messages]);

  return <>
    <AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: 24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .96 }} transition={{ type: "spring", stiffness: 360, damping: 30 }} className="fixed bottom-5 right-5 z-[12000] flex h-[min(720px,calc(100vh-110px))] w-[min(430px,calc(100vw-28px))] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,.30)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b1423]/96">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1930] via-[#102b4c] to-[#0d6472] px-5 pb-4 pt-5 text-white">
        <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-cyan-300/15 blur-2xl" />
        <div className="relative flex items-center gap-3"><div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15"><Bot size={25}/><span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#12324d] bg-emerald-400" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-black tracking-tight">BAPSİS Asistan</h3><span className="rounded-full bg-cyan-300/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-200">Operasyon</span></div><p className="mt-0.5 text-[11px] font-medium text-cyan-100/65">{name}, kargo verilerini birlikte inceleyelim.</p></div><button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"><Minimize2 size={17}/></button></div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 dark:bg-[#08111e]/60">
        {messages.map((m) => <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] ${m.role === "user" ? "rounded-2xl rounded-br-md bg-gradient-to-br from-blue-600 to-cyan-600 px-4 py-3 text-white shadow-lg shadow-cyan-900/10" : ""}`}>
          {m.role === "bot" && <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300"><Sparkles size={12}/> BAPSİS</div>}
          <div className={m.role === "bot" ? "rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium leading-5 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[.055] dark:text-slate-200" : "text-[13px] font-semibold leading-5"}>{m.text}</div>
          {m.rows?.length > 0 && <div className="mt-2 space-y-2">{m.rows.map(r => <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[.05]"><div className="flex items-center gap-2"><Truck size={14} className="text-cyan-600"/><span className="min-w-0 flex-1 truncate text-xs font-black text-slate-800 dark:text-white">{r.kargo_firmasi || "Kargo kaydı"}</span><span className="text-[10px] font-bold text-slate-400">{formatDate(r.tarih)}</span></div><div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-500 dark:text-slate-400"><span>Gönderi: <b>{r.gonderi_numarasi || "—"}</b></span><span>Gönderen: <b>{r.gonderen_firma || "—"}</b></span><span className="col-span-2 truncate">İrsaliye: <b>{r.irsaliye_no || "—"}</b></span></div></div>)}</div>}
          {m.action && <button onClick={() => go(m.action.path)} className="mt-2 flex w-full items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-black text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-400/15 dark:bg-cyan-400/10 dark:text-cyan-200">{m.action.label}<ChevronRight size={15}/></button>}
          {m.chips && <div className="mt-2 flex flex-wrap gap-1.5">{m.chips.map(c => <button key={c} onClick={() => send(c)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300">{c}</button>)}</div>}
        </div></div>)}
        {busy && <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><Loader2 size={15} className="animate-spin text-cyan-500"/> Veriler kontrol ediliyor…</div>}
      </div>
      <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0b1423]"><div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-cyan-400 dark:border-white/10 dark:bg-white/[.04]"><Search size={17} className="mb-2 ml-1 shrink-0 text-slate-400"/><textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Kargo, irsaliye veya operasyon hakkında sor…" className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"/><button disabled={!input.trim() || busy} onClick={() => send()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md disabled:opacity-35"><Send size={15}/></button></div><div className="mt-2 text-center text-[9px] font-medium text-slate-400">Canlı sistem verisini okur • Ctrl + Shift + A</div></div>
    </motion.div>}</AnimatePresence>
    <motion.button onClick={() => setOpen(v => !v)} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: .95 }} className="fixed bottom-5 right-5 z-[11990] flex h-14 items-center gap-3 rounded-2xl bg-gradient-to-br from-[#102a4a] to-[#0e7490] px-4 text-white shadow-[0_18px_50px_rgba(8,145,178,.32)] ring-1 ring-white/15" title="BAPSİS Asistan"><span className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/12"><MessageCircle size={20}/><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#155e75] bg-emerald-400"/></span><span className="hidden pr-1 text-left sm:block"><span className="block text-xs font-black">BAPSİS Asistan</span><span className="block text-[9px] font-semibold text-cyan-100/65">Operasyona sor</span></span>{open && <X size={15}/>}</motion.button>
  </>;
}
