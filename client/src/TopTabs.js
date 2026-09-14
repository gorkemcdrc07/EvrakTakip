import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Menu, X, Moon, Sun, LogOut, LayoutDashboard, FilePlus2, Files, MapPinned, FolderKanban, ChartNoAxesCombined, Truck, FileSpreadsheet, ImageDown, FileArchive, ReceiptText, LifeBuoy, Command, Search, ChevronLeft, ChevronRight, Layers3 } from "lucide-react";
import useDarkMode from "./hooks/useDarkMode";
import useTabStore from "./stores/tabStore";
import TicketCenter from "./components/TicketCenter";

const tabIcons = { "/anasayfa": LayoutDashboard, "/evrak-ekle": FilePlus2, "/toplu-evraklar": Files, "/lokasyonlar": MapPinned, "/projeler": FolderKanban, "/evrak-raporlari": ChartNoAxesCombined, "/raporlar": ChartNoAxesCombined, "/kargo-bilgisi-ekle": Truck, "/tum-kargo-bilgileri": Truck, "/ExcelDonusum": FileSpreadsheet, "/jpg-to-pdf": ImageDown, "/pdf-sikistirma": FileArchive, "/tahakkuk": ReceiptText };

export default function TopTabs({ onMenuClick }) {
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useDarkMode();
    const [ticketOpen, setTicketOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [quickQuery, setQuickQuery] = useState("");
    const [scrollState, setScrollState] = useState({ left: false, right: false });
    const tabStripRef = useRef(null);
    const tabRefs = useRef({});
    const tabs = useTabStore((s) => s.tabs);
    const activeTabId = useTabStore((s) => s.activeTabId);
    const setActiveTab = useTabStore((s) => s.setActiveTab);
    const closeTab = useTabStore((s) => s.closeTab);
    const name = localStorage.getItem("ad") || "Kullanıcı";
    const filteredTabs = useMemo(() => {
        const needle = quickQuery.trim().toLocaleLowerCase("tr-TR");
        return needle ? tabs.filter((tab) => tab.title.toLocaleLowerCase("tr-TR").includes(needle)) : tabs;
    }, [quickQuery, tabs]);

    const refreshScrollState = () => {
        const node = tabStripRef.current;
        if (!node) return;
        setScrollState({ left: node.scrollLeft > 4, right: node.scrollLeft + node.clientWidth < node.scrollWidth - 4 });
    };

    useEffect(() => {
        const shortcut = (event) => {
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "t") { event.preventDefault(); setTicketOpen(true); }
            if (event.ctrlKey && event.key.toLowerCase() === "k") { event.preventDefault(); setQuickOpen(true); }
            if (event.key === "Escape") setQuickOpen(false);
        };
        window.addEventListener("keydown", shortcut);
        return () => window.removeEventListener("keydown", shortcut);
    }, []);

    useEffect(() => {
        refreshScrollState();
        const activeNode = tabRefs.current[activeTabId];
        activeNode?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        const onResize = () => refreshScrollState();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [tabs.length, activeTabId]);

    const selectTab = (tab) => { setActiveTab(tab.id); navigate(`/app${tab.path}`); setQuickOpen(false); setQuickQuery(""); };
    const closeOne = (event, tab) => {
        event.stopPropagation();
        const remaining = tabs.filter((item) => item.id !== tab.id);
        const index = tabs.findIndex((item) => item.id === tab.id);
        const next = remaining[Math.min(index, remaining.length - 1)];
        closeTab(tab.id);
        if (tab.id === activeTabId && next) navigate(`/app${next.path}`);
    };
    const scrollTabs = (direction) => tabStripRef.current?.scrollBy({ left: direction * 360, behavior: "smooth" });
    const logout = () => { localStorage.clear(); navigate("/login"); };

    return <>
        <header className="relative z-[10010] shrink-0 border-b border-white/[0.08] bg-[#0b1524]/95 text-white shadow-[0_10px_35px_rgba(2,8,23,0.20)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
            <div className="flex h-[68px] items-center gap-3 px-3 lg:px-4">
                <motion.button whileTap={{ scale: .9 }} onClick={onMenuClick} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/10 hover:text-cyan-300 lg:hidden"><Menu size={19} /></motion.button>

                <div className="relative flex min-w-0 flex-1 items-center gap-1">
                    <AnimatePresence>{scrollState.left && <motion.button initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={() => scrollTabs(-1)} className="grid h-9 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-slate-400 hover:bg-white/10 hover:text-cyan-300" title="Önceki sekmeler"><ChevronLeft size={17} /></motion.button>}</AnimatePresence>
                    <div ref={tabStripRef} onScroll={refreshScrollState} onWheel={(event) => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { event.currentTarget.scrollLeft += event.deltaY; } }} className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {tabs.map((tab) => {
                            const active = tab.id === activeTabId;
                            const Icon = tabIcons[tab.path] || Files;
                            return <motion.div ref={(node) => { tabRefs.current[tab.id] = node; }} layout key={tab.id} onClick={() => selectTab(tab)} whileHover={{ y: -2 }} whileTap={{ scale: .98 }} className={`group relative flex h-11 w-[176px] shrink-0 cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 transition-colors ${active ? "border-cyan-400/30 bg-gradient-to-r from-blue-500/20 to-cyan-400/10 text-white shadow-[0_8px_24px_rgba(8,145,178,0.12)]" : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.055] hover:text-white"}`}>
                                {active && <motion.span layoutId="navbar-active-tab" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_10px_#22d3ee]" />}
                                <motion.span animate={active ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 2.2, repeat: Infinity }} className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-md shadow-cyan-950/30" : "bg-white/[0.055] text-slate-400 group-hover:text-cyan-300"}`}><Icon size={16} /></motion.span>
                                <span className="relative min-w-0 flex-1 truncate text-[13px] font-bold">{tab.title}</span>
                                <button onClick={(event) => closeOne(event, tab)} className="relative grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-500 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100" aria-label={`${tab.title} sekmesini kapat`}><X size={13} /></button>
                            </motion.div>;
                        })}
                    </div>
                    <AnimatePresence>{scrollState.right && <motion.button initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={() => scrollTabs(1)} className="grid h-9 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-slate-400 hover:bg-white/10 hover:text-cyan-300" title="Sonraki sekmeler"><ChevronRight size={17} /></motion.button>}</AnimatePresence>
                </div>

                <button onClick={() => setQuickOpen(true)} className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-white xl:flex" title="Tüm açık uygulamalar"><Layers3 size={15} /><span>{tabs.length}</span><kbd className="ml-1 flex items-center gap-0.5 rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-slate-500"><Command size={10} />K</kbd></button>

                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .96 }} onClick={() => setTicketOpen(true)} className="relative flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-cyan-400/25 bg-cyan-400/[0.09] px-3 text-xs font-extrabold text-cyan-200 shadow-[0_8px_22px_rgba(8,145,178,0.10)] hover:bg-cyan-400/[0.14]">
                    <motion.span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" animate={{ x: ["-120%", "120%"] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2 }} />
                    <LifeBuoy size={16} className="relative" /><span className="relative hidden sm:inline">Ticket</span><span className="relative hidden rounded-md border border-cyan-300/15 bg-black/10 px-1.5 py-0.5 text-[9px] text-cyan-300/60 lg:inline">Ctrl ⇧ T</span>
                </motion.button>

                <motion.button whileHover={{ rotate: 12 }} whileTap={{ scale: .9 }} onClick={() => setDarkMode(!darkMode)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-white/[0.07] hover:text-cyan-300" title="Temayı değiştir">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</motion.button>
                <div className="hidden items-center gap-2 border-l border-white/10 pl-3 md:flex"><div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-xs font-extrabold shadow-md shadow-cyan-950/30">{name.slice(0, 1).toUpperCase()}</div><span className="max-w-[110px] truncate text-xs font-bold text-slate-300">{name}</span></div>
                <motion.button whileHover={{ x: 2 }} whileTap={{ scale: .9 }} onClick={logout} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-300" title="Çıkış"><LogOut size={18} /></motion.button>
            </div>
        </header>
        <AnimatePresence>{quickOpen && <>
            <motion.button aria-label="Hızlı geçişi kapat" onClick={() => setQuickOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10600] bg-slate-950/60 backdrop-blur-[5px]" />
            <motion.div initial={{ opacity: 0, y: -18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: .98 }} transition={{ type: "spring", stiffness: 350, damping: 30 }} className="fixed left-1/2 top-[12vh] z-[10610] w-[min(620px,calc(100vw-28px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1829]/98 text-white shadow-[0_35px_100px_rgba(0,0,0,.48)]">
                <div className="flex h-14 items-center gap-3 border-b border-white/10 px-4"><Search size={18} className="text-cyan-400" /><input autoFocus value={quickQuery} onChange={(event) => setQuickQuery(event.target.value)} placeholder="Açık uygulamalarda ara…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" /><kbd className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] text-slate-500">ESC</kbd></div>
                <div className="max-h-[430px] overflow-y-auto p-2">{filteredTabs.length ? filteredTabs.map((tab, index) => { const Icon = tabIcons[tab.path] || Files; const active = tab.id === activeTabId; return <motion.button key={tab.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .025, .16) }} onClick={() => selectTab(tab)} className={`mb-1 flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition ${active ? "bg-cyan-400/10 text-cyan-200" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}><span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-gradient-to-br from-blue-600 to-cyan-400 text-white" : "bg-white/[0.05] text-slate-500"}`}><Icon size={16} /></span><span className="min-w-0 flex-1 truncate text-sm font-bold">{tab.title}</span>{active && <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Aktif</span>}</motion.button>; }) : <div className="grid h-28 place-items-center text-sm text-slate-500">Eşleşen açık uygulama yok.</div>}</div>
                <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[10px] text-slate-600"><span>Yazarak filtrele, uygulamaya tıklayarak geç</span><span>{filteredTabs.length} uygulama</span></div>
            </motion.div>
        </>}</AnimatePresence>
        <TicketCenter open={ticketOpen} onClose={() => setTicketOpen(false)} />
    </>;
}
