import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CheckCheck, ChevronRight, Clock3, MessageCircle, Megaphone, Settings2, TicketCheck, X } from "lucide-react";
import { fetchNotifications, markNotificationRead } from "../services/operationsHub";

const timeAgo = (value) => {
  if (!value) return "";
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Şimdi";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün önce`;
  return new Date(value).toLocaleDateString("tr-TR");
};

const metaFor = (item) => {
  if (item.type === "ticket") return { Icon: item.title?.toLowerCase().includes("mesaj") ? MessageCircle : TicketCheck, label: "TICKET", tone: "cyan" };
  if (item.type === "announcement") return { Icon: Megaphone, label: "DUYURU", tone: "violet" };
  return { Icon: Clock3, label: "BİLDİRİM", tone: "amber" };
};

export default function NotificationCenter({ open, onClose, onNavigate, onOpenTicket }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { setItems(await fetchNotifications()); } finally { setLoading(false); }
  };

  useEffect(() => { if (open) { setFilter("all"); load(); } }, [open]);
  useEffect(() => {
    const refresh = () => open && load();
    window.addEventListener("ticket:changed", refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => { window.removeEventListener("ticket:changed", refresh); window.clearInterval(timer); };
  }, [open]);

  const unread = useMemo(() => items.filter(x => !x.read).length, [items]);
  const visible = useMemo(() => filter === "unread" ? items.filter(x => !x.read) : filter === "ticket" ? items.filter(x => x.type === "ticket") : items, [items, filter]);

  const readOne = async (item) => {
    if (!item.read) {
      await markNotificationRead(item.id);
      setItems(current => current.map(row => row.id === item.id ? { ...row, read: true } : row));
    }
    if (item.type === "ticket") {
      const ticketId = String(item.source_id || "").split(":")[0] || null;
      if (ticketId && onOpenTicket) {
        onOpenTicket(ticketId);
        onClose();
        return;
      }
    }
    if (item.action_path) { onNavigate(item.action_path); onClose(); }
  };

  const readAll = async () => {
    const pending = items.filter(x => !x.read);
    await Promise.all(pending.map(x => markNotificationRead(x.id)));
    setItems(current => current.map(x => ({ ...x, read: true })));
  };

  return <AnimatePresence>{open && <>
    <motion.button initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 z-[10700] bg-slate-950/65 backdrop-blur-[4px]" aria-label="Bildirimleri kapat" />
    <motion.aside initial={{x:520,opacity:.7}} animate={{x:0,opacity:1}} exit={{x:520,opacity:.7}} transition={{type:"spring",stiffness:300,damping:31}} className="fixed right-0 top-0 z-[10710] flex h-full w-[min(500px,100vw)] flex-col overflow-hidden border-l border-white/10 bg-[#08111f] text-white shadow-[0_0_80px_rgba(0,0,0,.55)]">
      <div className="relative border-b border-white/[.08] px-6 pb-5 pt-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="relative grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><BellRing size={21}/>{unread>0&&<i className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-cyan-400 px-1 text-[10px] font-black not-italic text-slate-950 ring-4 ring-[#08111f]">{unread>99?"99+":unread}</i>}</span>
          <div className="min-w-0 flex-1"><h2 className="text-lg font-black tracking-tight">Bildirimler</h2><p className="mt-1 text-xs text-slate-400">Ticket gelişmeleri ve önemli sistem duyuruları burada.</p></div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.07] bg-white/[.03] text-slate-400 transition hover:bg-white/[.08] hover:text-white"><X size={18}/></button>
        </div>
        <div className="relative mt-5 flex items-center gap-2">
          {[['all','Tümü'],['unread',`Okunmamış ${unread?`(${unread})`:''}`],['ticket','Ticket']].map(([key,label])=><button key={key} onClick={()=>setFilter(key)} className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${filter===key?'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10':'bg-white/[.04] text-slate-400 hover:bg-white/[.08] hover:text-white'}`}>{label}</button>)}
          <div className="flex-1" />
          {unread>0&&<button onClick={readAll} className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold text-cyan-300 hover:bg-cyan-400/10"><CheckCheck size={15}/> Tümünü oku</button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-color:#26364b_transparent]">
        {loading&&!items.length ? <div className="grid h-48 place-items-center text-sm text-slate-500">Bildirimler yükleniyor…</div> : visible.map((item,index)=>{
          const {Icon,label,tone}=metaFor(item); const ticket=tone==='cyan';
          const d = new Date(item.created_at); const now = new Date();
          const dayKey = d.toDateString() === now.toDateString() ? "Bugün" : (new Date(now.getFullYear(),now.getMonth(),now.getDate()-1).toDateString() === d.toDateString() ? "Dün" : "Daha eski");
          const prev = visible[index-1]; const pd = prev ? new Date(prev.created_at) : null;
          const prevKey = !pd ? null : (pd.toDateString() === now.toDateString() ? "Bugün" : (new Date(now.getFullYear(),now.getMonth(),now.getDate()-1).toDateString() === pd.toDateString() ? "Dün" : "Daha eski"));
          return <div key={`wrap-${item.id}`}>{dayKey!==prevKey&&<div className="mb-2 mt-4 px-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-600">{dayKey}</div>}<motion.button initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index*.025,.2)}} key={item.id} onClick={()=>readOne(item)} className={`group relative mb-2.5 w-full overflow-hidden rounded-2xl border p-4 text-left transition ${item.read?'border-white/[.055] bg-white/[.022] hover:bg-white/[.045]':'border-cyan-400/20 bg-gradient-to-r from-cyan-400/[.09] to-blue-500/[.035] hover:border-cyan-400/35'}`}>
            {!item.read&&<span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-cyan-400"/>}
            <div className="flex gap-3.5">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${ticket?'border-cyan-400/15 bg-cyan-400/10 text-cyan-300':'border-violet-400/15 bg-violet-400/10 text-violet-300'}`}><Icon size={19}/></span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2"><span className={`text-[9px] font-black tracking-[.14em] ${ticket?'text-cyan-400':'text-violet-400'}`}>{label}</span><span className="h-1 w-1 rounded-full bg-slate-700"/><span className="text-[10px] font-semibold text-slate-500">{timeAgo(item.created_at)}</span>{!item.read&&<span className="ml-auto h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,.7)]"/>}</div>
                <div className="pr-5 text-sm font-extrabold leading-5 text-slate-100">{String(item.title||item.message||'Bildirim')}</div>
                {item.message&&String(item.message).trim()!==String(item.title||'').trim()&&<div className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-400">{item.message}</div>}
                {item.action_path&&<div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-cyan-400 opacity-80 transition group-hover:opacity-100">Detayları görüntüle <ChevronRight size={13}/></div>}
              </div>
            </div>
          </motion.button></div>;
        })}
        {!loading&&!visible.length&&<div className="grid h-64 place-items-center px-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[.06] bg-white/[.03] text-slate-500"><CheckCheck size={23}/></span><div className="mt-4 text-sm font-extrabold text-slate-300">Her şey güncel</div><p className="mt-1.5 text-xs leading-5 text-slate-600">Yeni bir ticket mesajı veya durum değişikliği olduğunda burada göreceksin.</p></div></div>}
      </div>
      <div className="border-t border-white/[.07] bg-white/[.015] px-5 py-3 text-center text-[10px] font-semibold text-slate-600">Bildirimler ticket hareketlerinde otomatik yenilenir</div>
    </motion.aside>
  </>}</AnimatePresence>;
}
