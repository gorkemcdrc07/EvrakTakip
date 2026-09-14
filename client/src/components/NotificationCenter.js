import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    BellRing,
    CheckCheck,
    ChevronLeft,
    Clock3,
    Megaphone,
    Save,
    Settings2,
    TicketCheck,
    ToggleLeft,
    ToggleRight,
    X,
} from "lucide-react";
import {
    fetchAvailableNotificationSources,
    fetchNotificationPreferences,
    fetchNotifications,
    markNotificationRead,
    saveNotificationPreferences,
} from "../services/operationsHub";

export default function NotificationCenter({ open, onClose, onNavigate }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState("list");
    const [sources, setSources] = useState([]);
    const [preferences, setPreferences] = useState({});
    const [savingPreferences, setSavingPreferences] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setItems(await fetchNotifications());
        } finally {
            setLoading(false);
        }
    };

    const loadPreferences = async () => {
        const [available, current] = await Promise.all([
            fetchAvailableNotificationSources(),
            fetchNotificationPreferences(),
        ]);
        setSources(available);
        setPreferences(current);
    };

    useEffect(() => {
        if (!open) return;
        setView("list");
        load();
        loadPreferences();
    }, [open]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (open && view === "list") load();
        }, 30000);
        return () => window.clearInterval(timer);
    }, [open, view]);

    const unread = useMemo(() => items.filter((item) => !item.read).length, [items]);

    const iconFor = (item) =>
        item.type === "announcement"
            ? Megaphone
            : item.type === "ticket"
                ? TicketCheck
                : item.priority === "high"
                    ? AlertTriangle
                    : Clock3;

    const toggleSource = (key) => {
        setPreferences((prev) => ({ ...prev, [key]: prev[key] === false }));
        setSaved(false);
    };

    const savePreferences = async () => {
        setSavingPreferences(true);
        try {
            const next = await saveNotificationPreferences(preferences);
            setPreferences(next);
            await load();
            setSaved(true);
            window.setTimeout(() => setSaved(false), 1800);
        } finally {
            setSavingPreferences(false);
        }
    };

    const setAll = (enabled) => {
        setPreferences((prev) => ({
            ...prev,
            ...Object.fromEntries(sources.map((source) => [source.key, enabled])),
        }));
        setSaved(false);
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[10700] bg-slate-950/55 backdrop-blur-[3px]"
                        aria-label="Bildirim merkezini kapat"
                    />

                    <motion.aside
                        initial={{ x: 460 }}
                        animate={{ x: 0 }}
                        exit={{ x: 460 }}
                        transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        className="fixed right-0 top-0 z-[10710] flex h-full w-[min(460px,100vw)] flex-col border-l border-white/10 bg-[#0c1625] text-white shadow-2xl"
                    >
                        <div className="flex items-center gap-3 border-b border-white/10 p-5">
                            {view === "preferences" ? (
                                <button
                                    onClick={() => setView("list")}
                                    className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.06] text-slate-300 transition hover:bg-white/10 hover:text-white"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            ) : (
                                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                                    <BellRing size={20} />
                                </span>
                            )}

                            <div className="min-w-0 flex-1">
                                <h2 className="font-black">
                                    {view === "preferences" ? "Bildirim Tercihleri" : "Bildirim Merkezi"}
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {view === "preferences"
                                        ? "Sadece görmek istediğin ve yetkili olduğun kaynakları seç."
                                        : `${unread} okunmamış bildirim`}
                                </p>
                            </div>

                            {view === "list" && (
                                <button
                                    onClick={() => setView("preferences")}
                                    className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-cyan-300"
                                    title="Bildirim tercihleri"
                                >
                                    <Settings2 size={18} />
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {view === "list" ? (
                            <div className="flex-1 overflow-y-auto p-3">
                                {loading && !items.length ? (
                                    <div className="p-8 text-center text-sm text-slate-500">
                                        Bildirimler yükleniyor…
                                    </div>
                                ) : (
                                    items.map((item) => {
                                        const Icon = iconFor(item);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={async () => {
                                                    await markNotificationRead(item.id);
                                                    setItems((current) =>
                                                        current.map((row) =>
                                                            row.id === item.id ? { ...row, read: true } : row
                                                        )
                                                    );
                                                    if (item.action_path) onNavigate(item.action_path);
                                                }}
                                                className={`mb-2 flex w-full gap-3 rounded-2xl border p-4 text-left transition ${
                                                    item.read
                                                        ? "border-white/5 bg-white/[.025]"
                                                        : "border-cyan-400/20 bg-cyan-400/[.06]"
                                                }`}
                                            >
                                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.06] text-cyan-300">
                                                    <Icon size={18} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-2">
                                                        <b className="truncate text-sm">
                                                            {String(item.title || item.message || "").trim()}
                                                        </b>
                                                        {!item.read && (
                                                            <i className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                                                        )}
                                                    </span>
                                                    {String(item.message || "").trim() &&
                                                        String(item.message || "").trim() !==
                                                            String(item.title || "").trim() && (
                                                            <span className="mt-1 block text-xs leading-5 text-slate-400">
                                                                {item.message}
                                                            </span>
                                                        )}
                                                    {item.created_at && (
                                                        <span className="mt-2 block text-[10px] font-bold text-slate-600">
                                                            {new Date(item.created_at).toLocaleString("tr-TR")}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}

                                {!loading && !items.length && (
                                    <div className="grid h-52 place-items-center text-center text-sm text-slate-500">
                                        <div>
                                            <CheckCheck className="mx-auto mb-3" />
                                            <div className="font-bold text-slate-400">Bildirim yok</div>
                                            <div className="mt-1 text-xs text-slate-600">
                                                Sadece yetkili olduğun ve açık bıraktığın kaynaklardan bildirim gelir.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-1 flex-col overflow-hidden">
                                <div className="border-b border-white/10 px-5 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs leading-5 text-slate-400">
                                            Ekran yetkin olmayan kaynaklar burada gösterilmez ve o ekranlardan
                                            bildirim alamazsın.
                                        </p>
                                        <div className="flex shrink-0 gap-1">
                                            <button
                                                onClick={() => setAll(true)}
                                                className="rounded-lg bg-white/[.06] px-2.5 py-1.5 text-[10px] font-black text-slate-300 hover:bg-white/10"
                                            >
                                                Tümünü Aç
                                            </button>
                                            <button
                                                onClick={() => setAll(false)}
                                                className="rounded-lg bg-white/[.06] px-2.5 py-1.5 text-[10px] font-black text-slate-300 hover:bg-white/10"
                                            >
                                                Kapat
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3">
                                    {sources.map((source) => {
                                        const enabled = preferences[source.key] !== false;
                                        return (
                                            <button
                                                key={source.key}
                                                type="button"
                                                onClick={() => toggleSource(source.key)}
                                                className={`mb-2 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                                                    enabled
                                                        ? "border-cyan-400/20 bg-cyan-400/[.05]"
                                                        : "border-white/5 bg-white/[.018]"
                                                }`}
                                            >
                                                <span
                                                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                                                        enabled
                                                            ? "bg-cyan-500/10 text-cyan-300"
                                                            : "bg-white/[.04] text-slate-600"
                                                    }`}
                                                >
                                                    <BellRing size={17} />
                                                </span>

                                                <span className="min-w-0 flex-1">
                                                    <b className={enabled ? "text-sm text-white" : "text-sm text-slate-500"}>
                                                        {source.label}
                                                    </b>
                                                    <span className="mt-1 block text-xs leading-4 text-slate-500">
                                                        {source.description}
                                                    </span>
                                                </span>

                                                {enabled ? (
                                                    <ToggleRight size={28} className="shrink-0 text-cyan-400" />
                                                ) : (
                                                    <ToggleLeft size={28} className="shrink-0 text-slate-600" />
                                                )}
                                            </button>
                                        );
                                    })}

                                    {!sources.length && (
                                        <div className="p-10 text-center text-sm text-slate-500">
                                            Bildirim alınabilecek yetkili ekran bulunmuyor.
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-white/10 p-4">
                                    <button
                                        onClick={savePreferences}
                                        disabled={savingPreferences}
                                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-xs font-black text-white shadow-lg shadow-cyan-950/20 disabled:opacity-50"
                                    >
                                        <Save size={15} />
                                        {savingPreferences
                                            ? "Kaydediliyor…"
                                            : saved
                                                ? "Tercihler Kaydedildi"
                                                : "Tercihleri Kaydet"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
