import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function cx(...c) { return c.filter(Boolean).join(" "); }

export default function EditEvrakModal({
    value,
    lokasyonlar,
    projeler,
    onClose,
    onSave,   // yalnızca Kaydet'te parent'a yazacağız
}) {
    const [tab, setTab] = useState("genel"); // genel | projeler | seferler
    const [draft, setDraft] = useState(value);
    const [density, setDensity] = useState("comfortable"); // comfortable | compact
    const [seferSearch, setSeferSearch] = useState("");
    const overlayRef = useRef(null);
    const bodyRef = useRef(null);
    const [showUnsaved, setShowUnsaved] = useState(false);

    // Değişiklik algılama (pratik JSON karşılaştırma)
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
    }, []);

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

    // ✅ Toplam sefer: proje kalemleri değiştikçe hesapla
    const toplamSefer = useMemo(() => {
        const t = (draft?.evrakproje || []).reduce(
            (s, p) => s + (parseInt(p.sefersayisi, 10) || 0),
            0
        );
        return t || 0;
    }, [draft?.evrakproje]);

    // ❗ Parent'a otomatik yazma YOK. Sadece local draft güncellenir.
    // (React uyarısını doğuran durum buydu.)

    const handleSave = () => {
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

    // Proje satırı değiştiğinde sadece local draft güncelliyoruz
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

    const filteredSeferler = useMemo(() => {
        const s = (draft?.evrakseferler || []);
        if (!seferSearch.trim()) return s;
        const q = seferSearch.toLowerCase();
        return s.filter(x =>
            (x.seferno || "").toLowerCase().includes(q) ||
            (x.aciklama || "").toLowerCase().includes(q)
        );
    }, [draft?.evrakseferler, seferSearch]);

    const rowPad = density === "compact" ? "py-2" : "py-3";

    return (
        <AnimatePresence>
            <motion.div
                ref={overlayRef}
                onMouseDown={onOverlayClick}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Sheet on mobile, wide modal on desktop */}
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    className={cx(
                        "w-full sm:max-w-7xl xl:max-w-[1320px] h-[92vh] sm:h-[90vh] min-h-0",
                        "bg-white/90 dark:bg-gray-900/90 supports-[backdrop-filter]:backdrop-blur-xl",
                        "rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden overflow-x-hidden",
                        "grid sm:grid-cols-[minmax(0,1fr)_400px] border border-white/20 dark:border-gray-700/60"
                    )}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                >
                    {/* LEFT: header + scrollable body + sticky footer */}
                    <div className="flex flex-col min-w-0 min-h-0">
                        {/* Sticky Header */}
                        <div className="sticky top-0 z-10 px-5 sm:px-6 pt-4 pb-3 bg-gradient-to-b from-white/95 to-white/70 dark:from-gray-900/95 dark:to-gray-900/70 border-b border-black/5 dark:border-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight">Evrak Düzenle</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        #{draft?.id} • {draft?.tarih ? new Date(draft?.tarih).toLocaleDateString("tr-TR") : "—"}
                                    </p>
                                </div>
                                <button
                                    onClick={requestClose}
                                    className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                    aria-label="Kapat"
                                    title="Kapat (Esc)"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Tabs + Density */}
                            <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex gap-1">
                                    {[
                                        { k: "genel", t: "Genel" },
                                        { k: "projeler", t: "Projeler" },
                                        { k: "seferler", t: "Seferler" },
                                    ].map((t) => (
                                        <button
                                            key={t.k}
                                            onClick={() => setTab(t.k)}
                                            className={cx(
                                                "px-3 py-2 rounded-lg text-sm font-medium transition",
                                                tab === t.k
                                                    ? "bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 shadow-sm"
                                                    : "text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
                                            )}
                                        >
                                            {t.t}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Görünüm</span>
                                    <div className="inline-flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
                                        <button
                                            onClick={() => setDensity("comfortable")}
                                            className={cx(
                                                "px-3 py-1 text-xs",
                                                density === "comfortable" ? "bg-black/5 dark:bg-white/5" : ""
                                            )}
                                        >
                                            Rahat
                                        </button>
                                        <button
                                            onClick={() => setDensity("compact")}
                                            className={cx(
                                                "px-3 py-1 text-xs",
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
                                            className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/80"
                                        />
                                    </Field>

                                    <Field label="Lokasyon">
                                        <select
                                            value={draft?.lokasyonid ?? ""}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                updateField({ lokasyonid: v === "" ? "" : parseInt(v, 10) });
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/80"
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
                                            className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                                        />
                                    </Field>
                                </div>
                            )}

                            {tab === "projeler" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium">Proje Kalemleri</div>
                                        <button
                                            onClick={addProjeRow}
                                            className="px-3 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white shadow"
                                        >
                                            + Proje Ekle
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(draft?.evrakproje || []).map((p, i) => (
                                            <div
                                                key={i}
                                                className={cx(
                                                    "rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-gray-800/70",
                                                    "shadow-sm hover:shadow transition",
                                                    "grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4",
                                                    density === "compact" ? "py-2" : "py-3"
                                                )}
                                            >
                                                <select
                                                    value={p.projeid ?? ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateProjeRow(i, { projeid: val === "" ? "" : parseInt(val, 10) });
                                                    }}
                                                    className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/80"
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
                                                        className="w-24 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/80 text-center"
                                                    />
                                                    <IconBtn onClick={() => updateProjeRow(i, { sefersayisi: (parseInt(p.sefersayisi, 10) || 0) + 1 })}>+</IconBtn>
                                                </div>

                                                <div className="text-sm text-gray-500 dark:text-gray-400 sm:justify-self-end">
                                                    Toplam: <b>{(parseInt(p.sefersayisi, 10) || 0).toLocaleString()}</b>
                                                </div>

                                                <button
                                                    onClick={() => removeProjeRow(i)}
                                                    className="justify-self-end px-3 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white"
                                                >
                                                    Sil
                                                </button>
                                            </div>
                                        ))}

                                        {(draft?.evrakproje || []).length === 0 && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Henüz proje eklenmemiş.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {tab === "seferler" && (
                                <div className="space-y-4">
                                    {/* Toolbar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="text-sm font-medium">Sefer Listesi</div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={seferSearch}
                                                onChange={(e) => setSeferSearch(e.target.value)}
                                                placeholder="Sefer no / açıklama ara…"
                                                className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/80"
                                            />
                                            <button
                                                onClick={addSeferRow}
                                                className="px-3 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white shadow"
                                            >
                                                + Sefer Ekle
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rows */}
                                    <div className="grid gap-3">
                                        {filteredSeferler.map((s) => {
                                            const idx = (draft?.evrakseferler || []).indexOf(s);
                                            const normalized = (s.aciklama || "").trim().toLocaleUpperCase("tr");
                                            const badge =
                                                normalized === "TARAFIMIZCA DÜZELTİLMİŞTİR"
                                                    ? "bg-green-600 text-white"
                                                    : normalized === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100";

                                            return (
                                                <div
                                                    key={idx}
                                                    className={cx(
                                                        "rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-gray-800/70",
                                                        "shadow-sm hover:shadow transition px-4",
                                                        density === "compact" ? "py-2" : "py-3",
                                                        "grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3"
                                                    )}
                                                >
                                                    <input
                                                        placeholder="Sefer No"
                                                        value={s.seferno || ""}
                                                        onChange={(e) => updateSeferRow(idx, { seferno: e.target.value })}
                                                        className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/80"
                                                    />
                                                    <select
                                                        value={s.aciklama ?? ""}
                                                        onChange={(e) => updateSeferRow(idx, { aciklama: e.target.value })}
                                                        className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/80"
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
                                                        <span className={cx("px-3 py-1 rounded-full text-xs", badge)}>
                                                            {s.aciklama || "—"}
                                                        </span>
                                                        <button
                                                            onClick={() => removeSeferRow(idx)}
                                                            className="px-3 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white"
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                </div>
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
                        <div className="sticky bottom-0 z-10 px-5 sm:px-6 py-4 bg-gradient-to-t from-white/95 to-white/70 dark:from-gray-900/95 dark:to-gray-900/70 backdrop-blur border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                            <div className="text-xs text-gray-500 dark:text-gray-400">⌘/Ctrl + Enter: Kaydet • Esc: Kapat</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={requestClose}
                                    className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: bağımsız scrollable sidebar */}
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
                                {/* arka plan */}
                                <div
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                                    onClick={continueEditing}
                                />

                                {/* panel */}
                                <motion.div
                                    role="alertdialog"
                                    aria-modal="true"
                                    className="relative w-[min(94vw,560px)] rounded-2xl border border-black/10 dark:border-white/10
                   bg-white/95 dark:bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-xl shadow-2xl"
                                    initial={{ y: 16, scale: 0.98, opacity: 0 }}
                                    animate={{ y: 0, scale: 1, opacity: 1 }}
                                    exit={{ y: 16, scale: 0.98, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                                >
                                    <div className="p-5 sm:p-6">
                                        <div className="flex items-start gap-3">
                                            <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-100 text-amber-800 grid place-items-center">
                                                ⚠️
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-base sm:text-lg font-semibold">
                                                    Kaydedilmemiş değişiklikler var
                                                </div>
                                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                    Bu pencereyi kapatırsan yaptığın değişiklikler kaybolacak.
                                                    Ne yapmak istersin?
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
                                            <button
                                                onClick={continueEditing}
                                                className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                            >
                                                Düzenlemeye devam et
                                            </button>

                                            <button
                                                onClick={discardAndClose}
                                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                Kaydetmeden Kapat
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const total = (draft?.evrakproje || []).reduce((s, p) => s + (parseInt(p.sefersayisi, 10) || 0), 0) || 0;
                                                    const next = { ...draft, sefersayisi: total };
                                                    onSave?.(next); // payload ver
                                                    setShowUnsaved(false);
                                                    onClose?.();
                                                }}
                                                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white"
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
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
            {children}
        </div>
    );
}

function IconBtn({ children, ...rest }) {
    return (
        <button
            {...rest}
            className="h-9 w-9 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
            type="button"
        >
            {children}
        </button>
    );
}

function Card({ title, children }) {
    return (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-gray-900/60 shadow-sm p-4">
            {title && <div className="text-sm font-semibold mb-2">{title}</div>}
            {children}
        </div>
    );
}

function LI({ label, value }) {
    return (
        <li className="flex items-center justify-between">
            <span>{label}</span>
            <b>{value}</b>
        </li>
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
                        ? "bg-green-600 text-white"
                        : n === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100";
                return (
                    <span key={k} className={cx("px-2.5 py-1 rounded-full text-xs", tone)}>
                        {k}: <b className="ml-1">{v}</b>
                    </span>
                );
            })}
        </div>
    );
}
