import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function cx(...c) { return c.filter(Boolean).join(" "); }

// normalize: trim + spaces + uppercase(TR)
function normalizeSeferNo(v) {
    return String(v || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleUpperCase("tr-TR");
}

export default function EditEvrakModal({
    value,
    lokasyonlar,
    projeler,
    onClose,
    onSave, // yalnızca Kaydet'te parent'a yazacağız
}) {
    const [tab, setTab] = useState("genel"); // genel | projeler | seferler
    const [draft, setDraft] = useState(value);
    const [density, setDensity] = useState("comfortable"); // comfortable | compact
    const [seferSearch, setSeferSearch] = useState("");
    const overlayRef = useRef(null);
    const bodyRef = useRef(null);
    const [showUnsaved, setShowUnsaved] = useState(false);

    // Değişiklik algılama
    const isDirty = useMemo(() => {
        try {
            return JSON.stringify(draft ?? {}) !== JSON.stringify(value ?? {});
        } catch {
            return true;
        }
    }, [draft, value]);

    const requestClose = () => {
        if (isDirty) setShowUnsaved(true);
        else onClose?.();
    };

    const discardAndClose = () => {
        setShowUnsaved(false);
        onClose?.();
    };

    const continueEditing = () => setShowUnsaved(false);

    // Kısayollar
    useEffect(() => {
        function onKey(e) {
            if (e.key === "Escape") {
                e.preventDefault();
                requestClose();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") handleSave();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDirty, draft]);

    // Farklı evrak açılınca draft'ı yenile
    useEffect(() => setDraft(value), [value?.id]);

    // Sayfa kapanırken uyar
    useEffect(() => {
        const handler = (e) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);

    // ✅ Toplam sefer
    const toplamSefer = useMemo(() => {
        const t = (draft?.evrakproje || []).reduce(
            (s, p) => s + (parseInt(p.sefersayisi, 10) || 0),
            0
        );
        return t || 0;
    }, [draft?.evrakproje]);

    // ✅ Sefer No mükerrer kontrolü
    const seferNoCounts = useMemo(() => {
        const m = new Map();
        (draft?.evrakseferler || []).forEach((s) => {
            const key = normalizeSeferNo(s?.seferno);
            if (!key) return;
            m.set(key, (m.get(key) || 0) + 1);
        });
        return m;
    }, [draft?.evrakseferler]);

    const duplicateSeferNos = useMemo(() => {
        return Array.from(seferNoCounts.entries())
            .filter(([, c]) => c > 1)
            .map(([seferno, count]) => ({ seferno, count }))
            .sort((a, b) => b.count - a.count || a.seferno.localeCompare(b.seferno));
    }, [seferNoCounts]);

    const hasDuplicateSeferNo = duplicateSeferNos.length > 0;

    const duplicateIndexSet = useMemo(() => {
        const dset = new Set(duplicateSeferNos.map((d) => d.seferno));
        const idxs = new Set();
        (draft?.evrakseferler || []).forEach((s, i) => {
            const key = normalizeSeferNo(s?.seferno);
            if (key && dset.has(key)) idxs.add(i);
        });
        return idxs;
    }, [draft?.evrakseferler, duplicateSeferNos]);

    const handleSave = () => {
        if (hasDuplicateSeferNo) {
            // Seferler sekmesine geçirip kullanıcıyı uyaralım
            setTab("seferler");
            bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        const next = { ...draft, sefersayisi: toplamSefer };
        onSave?.(next); // parent burada supabase'e yazar
    };

    const onOverlayClick = (e) => {
        if (e.target === overlayRef.current) requestClose();
    };

    const lokasyonOptions = useMemo(
        () => Object.entries(lokasyonlar || {}).map(([id, name]) => ({ id, name })),
        [lokasyonlar]
    );
    const projeOptions = useMemo(
        () => Object.entries(projeler || {}).map(([id, name]) => ({ id, name })),
        [projeler]
    );

    const updateField = (patch) => setDraft((d) => ({ ...d, ...patch }));

    const updateProjeRow = (idx, patch) => {
        setDraft((d) => {
            const arr = [...(d.evrakproje || [])];
            arr[idx] = { ...arr[idx], ...patch };
            const total = arr.reduce((s, p) => s + (parseInt(p.sefersayisi, 10) || 0), 0) || 0;
            return { ...d, evrakproje: arr, sefersayisi: total };
        });
    };

    const addProjeRow = () => {
        setDraft((d) => {
            const arr = [{ projeid: "", sefersayisi: 0 }, ...(d.evrakproje || [])];
            const total = arr.reduce((s, p) => s + (parseInt(p.sefersayisi, 10) || 0), 0) || 0;
            return { ...d, evrakproje: arr, sefersayisi: total };
        });
        setTimeout(() => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 0);
    };

    const removeProjeRow = (idx) => {
        setDraft((d) => {
            const arr = (d.evrakproje || []).filter((_, i) => i !== idx);
            const total = arr.reduce((s, p) => s + (parseInt(p.sefersayisi, 10) || 0), 0) || 0;
            return { ...d, evrakproje: arr, sefersayisi: total };
        });
    };

    const addSeferRow = () => {
        setDraft((d) => {
            const arr = [{ seferno: "", aciklama: "" }, ...(d.evrakseferler || [])];
            return { ...d, evrakseferler: arr };
        });
        setTimeout(() => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 0);
    };

    const updateSeferRow = (idx, patch) => {
        setDraft((d) => {
            const arr = [...(d.evrakseferler || [])];
            arr[idx] = { ...arr[idx], ...patch };
            return { ...d, evrakseferler: arr };
        });
    };

    const removeSeferRow = (idx) => {
        setDraft((d) => {
            const arr = (d.evrakseferler || []).filter((_, i) => i !== idx);
            return { ...d, evrakseferler: arr };
        });
    };

    // Filtreleme (index'i koruyalım)
    const filteredSeferler = useMemo(() => {
        const all = (draft?.evrakseferler || []).map((s, idx) => ({ ...s, __idx: idx }));
        if (!seferSearch.trim()) return all;
        const q = seferSearch.toLowerCase();
        return all.filter((x) =>
            (x.seferno || "").toLowerCase().includes(q) ||
            (x.aciklama || "").toLowerCase().includes(q)
        );
    }, [draft?.evrakseferler, seferSearch]);

    const rowPad = density === "compact" ? "py-2" : "py-3";

    const Tabs = [
        { k: "genel", t: "Genel" },
        { k: "projeler", t: "Projeler" },
        { k: "seferler", t: "Seferler" },
    ];

    const canSave = !hasDuplicateSeferNo;

    return (
        <AnimatePresence>
            <motion.div
                ref={overlayRef}
                onMouseDown={onOverlayClick}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    className={cx(
                        "w-full sm:max-w-7xl xl:max-w-[1320px] h-[92vh] sm:h-[90vh] min-h-0",
                        "bg-white/85 dark:bg-gray-900/80 supports-[backdrop-filter]:backdrop-blur-2xl",
                        "rounded-t-3xl sm:rounded-3xl shadow-[0_30px_120px_-30px_rgba(0,0,0,.55)] overflow-hidden overflow-x-hidden",
                        "grid sm:grid-cols-[minmax(0,1fr)_420px] border border-white/25 dark:border-gray-700/70"
                    )}
                    initial={{ y: 40, opacity: 0, scale: 0.99 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 40, opacity: 0, scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                >
                    {/* LEFT */}
                    <div className="flex flex-col min-w-0 min-h-0">
                        {/* Sticky Header */}
                        <div className="sticky top-0 z-10 px-5 sm:px-6 pt-4 pb-4
              bg-gradient-to-b from-white/95 to-white/70 dark:from-gray-900/95 dark:to-gray-900/70
              border-b border-black/5 dark:border-white/10">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-semibold tracking-tight">Evrak Düzenle</h2>

                                        {isDirty && (
                                            <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold
                        bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-800/40">
                                                • Unsaved
                                            </span>
                                        )}

                                        {hasDuplicateSeferNo && (
                                            <button
                                                type="button"
                                                onClick={() => { setTab("seferler"); bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
                                                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold
                          bg-rose-100 text-rose-900 border border-rose-200
                          dark:bg-rose-900/25 dark:text-rose-200 dark:border-rose-800/40 hover:opacity-90"
                                                title="Mükerrer Sefer No var"
                                            >
                                                ⚠ Mükerrer Sefer No
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        #{draft?.id} • {draft?.tarih ? new Date(draft?.tarih).toLocaleDateString("tr-TR") : "—"}
                                    </p>
                                </div>

                                <button
                                    onClick={requestClose}
                                    className="inline-flex items-center justify-center h-10 w-10 rounded-2xl
                    border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                    aria-label="Kapat"
                                    title="Kapat (Esc)"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Tabs + Density */}
                            <div className="mt-4 flex items-center justify-between gap-3">
                                <div className="inline-flex rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 p-1">
                                    {Tabs.map((t) => (
                                        <button
                                            key={t.k}
                                            onClick={() => setTab(t.k)}
                                            className={cx(
                                                "relative px-4 py-2 rounded-xl text-sm font-semibold transition",
                                                tab === t.k
                                                    ? "bg-black text-white shadow-sm dark:bg-white dark:text-gray-900"
                                                    : "text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
                                            )}
                                        >
                                            {t.t}
                                            {t.k === "seferler" && hasDuplicateSeferNo && (
                                                <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-rose-500 align-middle" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Görünüm</span>
                                    <div className="inline-flex rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden bg-white/70 dark:bg-gray-900/60">
                                        <button
                                            onClick={() => setDensity("comfortable")}
                                            className={cx(
                                                "px-3 py-2 text-xs font-semibold",
                                                density === "comfortable" ? "bg-black/5 dark:bg-white/5" : ""
                                            )}
                                        >
                                            Rahat
                                        </button>
                                        <button
                                            onClick={() => setDensity("compact")}
                                            className={cx(
                                                "px-3 py-2 text-xs font-semibold",
                                                density === "compact" ? "bg-black/5 dark:bg-white/5" : ""
                                            )}
                                        >
                                            Sıkı
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div
                            ref={bodyRef}
                            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 sm:px-6 py-5 space-y-5"
                        >
                            {tab === "genel" && (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <Field label="Tarih">
                                        <input
                                            type="date"
                                            value={draft?.tarih?.slice(0, 10) || ""}
                                            onChange={(e) => updateField({ tarih: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/70
                        focus:outline-none focus:ring-4 focus:ring-blue-200/60 dark:focus:ring-blue-900/30"
                                        />
                                    </Field>

                                    <Field label="Lokasyon">
                                        <select
                                            value={draft?.lokasyonid ?? ""}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                updateField({ lokasyonid: v === "" ? "" : parseInt(v, 10) });
                                            }}
                                            className="w-full px-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/70
                        focus:outline-none focus:ring-4 focus:ring-blue-200/60 dark:focus:ring-blue-900/30"
                                        >
                                            <option value="">— Seçin —</option>
                                            {lokasyonOptions.map((o) => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Toplam Sefer (otomatik)" span>
                                        <input
                                            value={toplamSefer}
                                            readOnly
                                            className="w-full px-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                                        />
                                    </Field>

                                    {hasDuplicateSeferNo && (
                                        <div className="sm:col-span-2">
                                            <DupPanel
                                                duplicates={duplicateSeferNos}
                                                onJump={() => setTab("seferler")}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === "projeler" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-semibold">Proje Kalemleri</div>
                                        <button
                                            onClick={addProjeRow}
                                            className="px-3.5 py-2.5 rounded-2xl text-sm font-semibold
                        bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white shadow"
                                        >
                                            + Proje Ekle
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(draft?.evrakproje || []).map((p, i) => (
                                            <motion.div
                                                key={i}
                                                layout
                                                className={cx(
                                                    "rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-gray-800/70",
                                                    "shadow-sm hover:shadow-md transition",
                                                    "grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4",
                                                    rowPad
                                                )}
                                            >
                                                <select
                                                    value={p.projeid ?? ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateProjeRow(i, { projeid: val === "" ? "" : parseInt(val, 10) });
                                                    }}
                                                    className="px-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/70
                            focus:outline-none focus:ring-4 focus:ring-blue-200/60 dark:focus:ring-blue-900/30"
                                                >
                                                    <option value="">— Proje seçin —</option>
                                                    {projeOptions.map((o) => (
                                                        <option key={o.id} value={o.id}>{o.name}</option>
                                                    ))}
                                                </select>

                                                <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">
                                                    <IconBtn onClick={() => updateProjeRow(i, { sefersayisi: Math.max(0, (parseInt(p.sefersayisi, 10) || 0) - 1) })}>−</IconBtn>
                                                    <input
                                                        type="number"
                                                        value={p.sefersayisi ?? 0}
                                                        onChange={(e) =>
                                                            updateProjeRow(i, {
                                                                sefersayisi: Number.isFinite(e.target.valueAsNumber)
                                                                    ? e.target.valueAsNumber
                                                                    : Number(e.target.value) || 0
                                                            })
                                                        }
                                                        className="w-24 px-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/70 text-center
                              focus:outline-none focus:ring-4 focus:ring-blue-200/60 dark:focus:ring-blue-900/30"
                                                    />
                                                    <IconBtn onClick={() => updateProjeRow(i, { sefersayisi: (parseInt(p.sefersayisi, 10) || 0) + 1 })}>+</IconBtn>
                                                </div>

                                                <div className="text-sm text-gray-500 dark:text-gray-400 sm:justify-self-end">
                                                    Toplam: <b>{(parseInt(p.sefersayisi, 10) || 0).toLocaleString()}</b>
                                                </div>

                                                <button
                                                    onClick={() => removeProjeRow(i)}
                                                    className="justify-self-end px-3.5 py-2.5 rounded-2xl text-sm font-semibold
                            bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95 text-white"
                                                >
                                                    Sil
                                                </button>
                                            </motion.div>
                                        ))}

                                        {(draft?.evrakproje || []).length === 0 && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Henüz proje eklenmemiş.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {tab === "seferler" && (
                                <div className="space-y-4">
                                    {/* Duplicate panel */}
                                    {hasDuplicateSeferNo && (
                                        <DupPanel duplicates={duplicateSeferNos} />
                                    )}

                                    {/* Toolbar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="text-sm font-semibold">Sefer Listesi</div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={seferSearch}
                                                onChange={(e) => setSeferSearch(e.target.value)}
                                                placeholder="Sefer no / açıklama ara…"
                                                className="px-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/70
                          focus:outline-none focus:ring-4 focus:ring-blue-200/60 dark:focus:ring-blue-900/30"
                                            />
                                            <button
                                                onClick={addSeferRow}
                                                className="px-3.5 py-2.5 rounded-2xl text-sm font-semibold
                          bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white shadow"
                                            >
                                                + Sefer Ekle
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rows */}
                                    <div className="grid gap-3">
                                        {filteredSeferler.map((s) => {
                                            const idx = s.__idx;
                                            const isDup = duplicateIndexSet.has(idx);

                                            const normalized = (s.aciklama || "").trim().toLocaleUpperCase("tr");
                                            const badge =
                                                normalized === "TARAFIMIZCA DÜZELTİLMİŞTİR"
                                                    ? "bg-emerald-600 text-white"
                                                    : normalized === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100";

                                            return (
                                                <motion.div
                                                    layout
                                                    key={idx}
                                                    className={cx(
                                                        "rounded-3xl border bg-white/70 dark:bg-gray-800/70 shadow-sm hover:shadow-md transition px-4",
                                                        rowPad,
                                                        "grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3",
                                                        isDup
                                                            ? "border-rose-300 dark:border-rose-800/50 ring-2 ring-rose-200/60 dark:ring-rose-900/25"
                                                            : "border-black/10 dark:border-white/10"
                                                    )}
                                                >
                                                    <div className="space-y-1">
                                                        <input
                                                            placeholder="Sefer No"
                                                            value={s.seferno || ""}
                                                            onChange={(e) => updateSeferRow(idx, { seferno: e.target.value })}
                                                            className={cx(
                                                                "w-full px-3 py-2.5 rounded-2xl border bg-white/80 dark:bg-gray-800/70",
                                                                "focus:outline-none focus:ring-4",
                                                                isDup
                                                                    ? "border-rose-400 dark:border-rose-700 focus:ring-rose-200/70 dark:focus:ring-rose-900/30"
                                                                    : "border-black/10 dark:border-white/10 focus:ring-blue-200/60 dark:focus:ring-blue-900/30"
                                                            )}
                                                        />
                                                        {isDup && (
                                                            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-200">
                                                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 dark:bg-rose-900/25">
                                                                    Duplicate
                                                                </span>
                                                                <span>Bu Sefer No başka satırda da var.</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <select
                                                        value={s.aciklama ?? ""}
                                                        onChange={(e) => updateSeferRow(idx, { aciklama: e.target.value })}
                                                        className="px-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/70
                              focus:outline-none focus:ring-4 focus:ring-blue-200/60 dark:focus:ring-blue-900/30"
                                                    >
                                                        <option value="">— Açıklama seçin —</option>
                                                        <option value="TARAFIMIZCA DÜZELTİLMİŞTİR">TARAFIMIZCA DÜZELTİLMİŞTİR</option>
                                                        <option value="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR">TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR</option>
                                                        <option value="EKSİK TARAMA">EKSİK TARAMA</option>
                                                        <option value="HASARLI TARAMA">HASARLI TARAMA</option>
                                                        <option value="GÖRÜNTÜ TARAMA">GÖRÜNTÜ TARAMA</option>
                                                        <option value="MAİL ATILDI DÖNÜŞ BEKLENİYOR">MAİL ATILDI DÖNÜŞ BEKLENİYOR</option>
                                                    </select>

                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={cx("px-3 py-1 rounded-full text-xs font-semibold", badge)}>
                                                            {s.aciklama || "—"}
                                                        </span>
                                                        <button
                                                            onClick={() => removeSeferRow(idx)}
                                                            className="px-3.5 py-2.5 rounded-2xl text-sm font-semibold
                                bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95 text-white"
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}

                                        {filteredSeferler.length === 0 && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Eşleşen sefer yok.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        <div className="sticky bottom-0 z-10 px-5 sm:px-6 py-4
              bg-gradient-to-t from-white/95 to-white/70 dark:from-gray-900/95 dark:to-gray-900/70
              backdrop-blur border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                ⌘/Ctrl + Enter: Kaydet • Esc: Kapat
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={requestClose}
                                    className="px-4 py-2 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-semibold"
                                >
                                    İptal
                                </button>

                                <button
                                    onClick={handleSave}
                                    disabled={!canSave}
                                    title={!canSave ? "Mükerrer Sefer No var. Düzenleyin." : "Kaydet (Ctrl/⌘ + Enter)"}
                                    className={cx(
                                        "px-4 py-2 rounded-2xl font-semibold shadow text-white",
                                        canSave
                                            ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:opacity-95"
                                            : "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR */}
                    <aside className="min-h-0 flex flex-col bg-gradient-to-b from-gray-50/80 to-gray-100/60 dark:from-gray-950/70 dark:to-gray-900/60 border-l border-black/5 dark:border-white/10">
                        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lokasyon</div>
                            <div className="text-sm font-semibold">{lokasyonlar?.[draft?.lokasyonid] ?? "—"}</div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                            <Card title="Özet">
                                <ul className="text-sm space-y-1">
                                    <LI label="Toplam Sefer" value={toplamSefer.toLocaleString()} />
                                    <LI label="Proje Sayısı" value={(draft?.evrakproje || []).length} />
                                    <LI label="Sefer Kaydı" value={(draft?.evrakseferler || []).length} />
                                </ul>
                            </Card>

                            {hasDuplicateSeferNo && (
                                <Card title="Mükerrer Sefer No">
                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                        Kaydetmek için mükerrerleri düzeltin:
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {duplicateSeferNos.slice(0, 12).map((d) => (
                                            <button
                                                key={d.seferno}
                                                type="button"
                                                onClick={() => { setTab("seferler"); bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
                                                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold
                          bg-rose-100 text-rose-900 border border-rose-200
                          dark:bg-rose-900/25 dark:text-rose-200 dark:border-rose-800/40 hover:opacity-90"
                                                title="Seferler sekmesine git"
                                            >
                                                {d.seferno} <span className="opacity-80">({d.count}x)</span>
                                            </button>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            <Card title="Projeler">
                                <div className="flex flex-wrap gap-2">
                                    {(draft?.evrakproje || []).map((p, i) => (
                                        <span
                                            key={i}
                                            className="px-2.5 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300/70 dark:border-blue-700/70"
                                        >
                                            {(projeler?.[p.projeid] ?? p.projeid) + " • " + (p.sefersayisi ?? 0)}
                                        </span>
                                    ))}
                                    {(draft?.evrakproje || []).length === 0 && (
                                        <span className="text-xs text-gray-500">—</span>
                                    )}
                                </div>
                            </Card>

                            <Card title="Sefer Özetleri">
                                <SeferCountsBadge seferler={draft?.evrakseferler || []} />
                            </Card>
                        </div>
                    </aside>

                    {/* --- Kaydedilmemiş Değişiklik Paneli --- */}
                    <AnimatePresence>
                        {showUnsaved && (
                            <motion.div
                                className="fixed inset-0 z-[70] grid place-items-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                                    onClick={continueEditing}
                                />

                                <motion.div
                                    role="alertdialog"
                                    aria-modal="true"
                                    className="relative w-[min(94vw,580px)] rounded-3xl border border-black/10 dark:border-white/10
                    bg-white/95 dark:bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-2xl shadow-2xl"
                                    initial={{ y: 16, scale: 0.98, opacity: 0 }}
                                    animate={{ y: 0, scale: 1, opacity: 1 }}
                                    exit={{ y: 16, scale: 0.98, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                                >
                                    <div className="p-5 sm:p-6">
                                        <div className="flex items-start gap-3">
                                            <div className="shrink-0 h-11 w-11 rounded-2xl bg-amber-100 text-amber-900 grid place-items-center border border-amber-200">
                                                ⚠️
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-base sm:text-lg font-semibold">
                                                    Kaydedilmemiş değişiklikler var
                                                </div>
                                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                    Bu pencereyi kapatırsan yaptığın değişiklikler kaybolacak.
                                                </p>
                                            </div>
                                        </div>

                                        {hasDuplicateSeferNo && (
                                            <div className="mt-4">
                                                <DupPanel duplicates={duplicateSeferNos} />
                                            </div>
                                        )}

                                        <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
                                            <button
                                                onClick={continueEditing}
                                                className="px-4 py-2 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-semibold"
                                            >
                                                Düzenlemeye devam et
                                            </button>

                                            <button
                                                onClick={discardAndClose}
                                                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95 text-white font-semibold"
                                            >
                                                Kaydetmeden Kapat
                                            </button>

                                            <button
                                                disabled={!canSave}
                                                onClick={() => {
                                                    if (!canSave) {
                                                        setTab("seferler");
                                                        setShowUnsaved(false);
                                                        return;
                                                    }
                                                    const total =
                                                        (draft?.evrakproje || []).reduce((s, p) => s + (parseInt(p.sefersayisi, 10) || 0), 0) || 0;
                                                    const next = { ...draft, sefersayisi: total };
                                                    onSave?.(next);
                                                    setShowUnsaved(false);
                                                    onClose?.();
                                                }}
                                                className={cx(
                                                    "px-4 py-2 rounded-2xl font-semibold text-white",
                                                    canSave
                                                        ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:opacity-95"
                                                        : "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-300"
                                                )}
                                                title={!canSave ? "Mükerrer Sefer No var. Önce düzeltin." : "Kaydet ve Kapat"}
                                            >
                                                Kaydet ve Kapat
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ------------ küçük yardımcı bileşenler ------------- */
function Field({ label, children, span }) {
    return (
        <div className={span ? "sm:col-span-2 space-y-2" : "space-y-2"}>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</label>
            {children}
        </div>
    );
}

function IconBtn({ children, ...rest }) {
    return (
        <button
            {...rest}
            className="h-10 w-10 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-semibold"
            type="button"
        >
            {children}
        </button>
    );
}

function Card({ title, children }) {
    return (
        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-gray-900/55 shadow-sm p-4">
            {title && <div className="text-sm font-semibold mb-2">{title}</div>}
            {children}
        </div>
    );
}

function LI({ label, value }) {
    return (
        <li className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-200">{label}</span>
            <b className="text-gray-900 dark:text-white">{value}</b>
        </li>
    );
}

function DupPanel({ duplicates, onJump }) {
    return (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900
      dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-100">
            <div className="flex items-center justify-between gap-2">
                <div className="font-bold">⚠ Mükerrer Sefer No tespit edildi</div>
                {onJump && (
                    <button
                        type="button"
                        onClick={onJump}
                        className="rounded-full px-3 py-1 text-xs font-bold bg-rose-100 border border-rose-200 hover:opacity-90
              dark:bg-rose-900/25 dark:border-rose-800/40"
                    >
                        Seferlere Git
                    </button>
                )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                {duplicates.map((d) => (
                    <span
                        key={d.seferno}
                        className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-900 border border-rose-200
              dark:bg-rose-900/25 dark:text-rose-100 dark:border-rose-800/40"
                    >
                        {d.seferno} <span className="ml-2 opacity-80">({d.count}x)</span>
                    </span>
                ))}
            </div>
            <div className="mt-2 text-xs opacity-80">
                Karşılaştırma: trim + boşluk tekle + TR uppercase yapılır.
            </div>
        </div>
    );
}

function SeferCountsBadge({ seferler }) {
    const counts = useMemo(() => {
        const c = {};
        seferler.forEach((s) => {
            const k = (s.aciklama || "—").trim();
            c[k] = (c[k] || 0) + 1;
        });
        return Object.entries(c).sort((a, b) => b[1] - a[1]);
    }, [seferler]);

    if (!counts.length) return <div className="text-sm text-gray-500">Kayıt yok.</div>;

    return (
        <div className="flex flex-wrap gap-2">
            {counts.map(([k, v]) => {
                const n = k.toLocaleUpperCase("tr");
                let tone =
                    n === "TARAFIMIZCA DÜZELTİLMİŞTİR"
                        ? "bg-emerald-600 text-white"
                        : n === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100";
                return (
                    <span key={k} className={cx("px-2.5 py-1 rounded-full text-xs font-semibold", tone)}>
                        {k}: <b className="ml-1">{v}</b>
                    </span>
                );
            })}
        </div>
    );
}
