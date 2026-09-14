import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useTabStore from "../stores/tabStore";
import { screenRegistry } from "../screenRegistry";
import { LayoutDashboard, FilePlus2, Files, MapPinned, FolderKanban, ChartNoAxesCombined, Truck, ClipboardCheck, FileSpreadsheet, ImageDown, FileArchive, ReceiptText, Search, ChevronDown, X, Sparkles } from "lucide-react";

const groups = [
    { label: "Genel", items: [["/anasayfa", "Genel Bakış", LayoutDashboard]] },
    { label: "Operasyon", items: [["/evrak-ekle", "Evrak Ekle", FilePlus2], ["/toplu-evraklar", "Tüm Evraklar", Files], ["/tahakkuk", "Tahakkuk", ReceiptText], ["/lokasyonlar", "Lokasyonlar", MapPinned], ["/projeler", "Projeler", FolderKanban]] },
    { label: "Kargo", items: [["/kargo-bilgisi-ekle", "Kargo Bilgisi Ekle", Truck], ["/tum-kargo-bilgileri", "Tüm Kargolar", ClipboardCheck], ["/hedef-kargo", "Hedef Kargo", Sparkles]] },
    { label: "Raporlar", items: [["/evrak-raporlari", "Evrak Raporları", ChartNoAxesCombined], ["/raporlar", "Reel Raporları", ChartNoAxesCombined], ["/toplu-tutanak", "Toplu Tutanak", FileArchive], ["/tutanak", "Tutanak", ReceiptText]] },
    { label: "Araçlar", items: [["/ExcelDonusum", "Excel & Word", FileSpreadsheet], ["/jpg-to-pdf", "JPG → PDF", ImageDown], ["/pdf-sikistirma", "PDF Sıkıştırma", FileArchive], ["/musteri-evraki", "Müşteri Evrakları", Files]] },
];

export default function ModernSidebar({ mobileOpen, onMobileClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const openTab = useTabStore((s) => s.openTab);
    const [query, setQuery] = useState("");
    const [closedGroups, setClosedGroups] = useState({});
    const [hovered, setHovered] = useState(false);
    const name = localStorage.getItem("ad") || "Kullanıcı";
    const username = localStorage.getItem("username") || "personel";
    const userKey = username.trim().toLowerCase();
    const isManager = ["yaren", "ozge", "mehmet", "rabia"].includes(userKey);
    const isRefika = userKey === "refika";
    const canSeeTahakkuk = ["aleynagncl", "cagla123", "didem", "canan", "merve"].includes(userKey);
    const canSeePath = (path) => {
        if (path === "/anasayfa") return true;
        if (path === "/tahakkuk") return canSeeTahakkuk;
        if (path === "/kargo-bilgisi-ekle") return isRefika;
        if (path === "/musteri-evraki") return ["ozge", "yaren", "rabia"].includes(userKey);
        return isManager || (isRefika && path === "/tum-kargo-bilgileri");
    };
    const visibleGroups = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase("tr-TR");
        return groups.map((group) => ({ ...group, items: group.items.filter(([path, title]) => canSeePath(path) && (!needle || title.toLocaleLowerCase("tr-TR").includes(needle))) })).filter((group) => group.items.length);
    }, [query, userKey]);
    const go = (path, title) => { openTab({ path, title: screenRegistry[path]?.title || title }); navigate(`/app${path}`); onMobileClose?.(); };
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    const compact = !hovered && !mobileOpen;

    return <>
        {mobileOpen && <button className="fixed inset-0 z-[10020] bg-slate-950/45 backdrop-blur-[2px] lg:hidden" onClick={onMobileClose} aria-label="Menüyü kapat" />}
        <aside onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={`fixed inset-y-0 left-0 z-[10030] flex flex-col overflow-hidden border-r border-cyan-400/10 bg-[radial-gradient(circle_at_30%_0%,rgba(15,104,190,0.22),transparent_28%),linear-gradient(180deg,#0b172a_0%,#08111f_100%)] text-white shadow-2xl shadow-slate-950/40 transition-[width,transform] duration-300 ease-out lg:static lg:z-auto lg:shadow-none ${compact ? "lg:w-[88px]" : "lg:w-[292px]"} ${mobileOpen ? "w-[292px] translate-x-0" : "w-[292px] -translate-x-full lg:translate-x-0"}`}>
            <div className="relative flex h-[94px] shrink-0 items-center justify-center border-b border-white/[0.08] px-3">
                <motion.img
                    src="/ets-logo.webp"
                    alt=""
                    animate={{ scale: hovered ? 1.08 : 1, rotate: hovered ? -2 : 0 }}
                    whileHover={{ rotate: [0, -4, 4, 0] }}
                    transition={{ type: "spring", stiffness: 240, damping: 17 }}
                    className="h-16 w-16 rounded-[18px] object-cover drop-shadow-[0_10px_22px_rgba(14,165,233,0.28)]"
                />
                <button onClick={onMobileClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"><X size={19} /></button>
            </div>
            <div className={`px-3 pt-4 ${compact ? "lg:px-4" : ""}`}>
                {!compact ? <motion.label initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-10 items-center gap-2 rounded-xl border border-cyan-300/10 bg-white/[0.055] px-3 text-slate-300 transition focus-within:border-cyan-400/40 focus-within:bg-white/[0.08]"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Menüde ara" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /><kbd className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-slate-500">⌘K</kbd></motion.label> : <div className="hidden h-10 place-items-center rounded-xl bg-white/[0.06] text-slate-400 lg:grid"><Search size={18} /></div>}
            </div>
            <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
                {visibleGroups.map((group) => <div key={group.label} className="mb-3">
                    {!compact && <button onClick={() => setClosedGroups((old) => ({ ...old, [group.label]: !old[group.label] }))} className="flex w-full items-center justify-between px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"><span>{group.label}</span><ChevronDown size={14} className={`transition ${closedGroups[group.label] ? "-rotate-90" : ""}`} /></button>}
                    {!closedGroups[group.label] && group.items.map(([path, title, Icon], itemIndex) => { const active = location.pathname === `/app${path}`; return <motion.button initial={false} whileHover={{ x: compact ? 0 : 4 }} whileTap={{ scale: 0.97 }} key={path} title={compact ? title : undefined} onClick={() => go(path, title)} className={`group relative mb-1 flex h-12 w-full items-center overflow-hidden rounded-xl transition-colors ${compact ? "justify-center px-0" : "gap-3 px-2.5"} ${active ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-950/35" : "text-slate-400 hover:bg-white/[0.075] hover:text-white"}`}>
                        {active && <motion.span layoutId="active-nav-glow" className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.13),transparent)]" animate={{ x: ["-120%", "120%"] }} transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4 }} />}
                        <motion.span whileHover={{ rotate: [0, -8, 8, 0], scale: 1.12 }} transition={{ duration: 0.38 }} className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-white/15 shadow-inner" : "bg-white/[0.04] group-hover:bg-cyan-400/10 group-hover:text-cyan-300"}`}><Icon size={19} strokeWidth={active ? 2.4 : 1.9} /></motion.span>
                        {!compact && <motion.span initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(itemIndex * 0.025, 0.12) }} className="relative truncate text-sm font-semibold">{title}</motion.span>}
                        {active && !compact && <motion.span animate={{ scale: [1, 1.45, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.8, repeat: Infinity }} className="relative ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                    </motion.button>; })}
                </div>)}
            </nav>
            <div className="border-t border-white/[0.08] p-3"><div className={`flex items-center p-2 ${compact ? "justify-center" : ""}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-extrabold shadow-lg shadow-blue-950/30">{initials}</div>{!compact && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-2 min-w-0 flex-1"><div className="truncate text-sm font-bold">{name}</div><div className="truncate text-xs text-slate-500">@{username}</div></motion.div>}</div></div>
        </aside>
    </>;
}
