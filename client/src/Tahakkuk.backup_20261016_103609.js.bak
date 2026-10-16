import React, { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import useDarkMode from "./hooks/useDarkMode";
import { ArrowLeft, CalendarDays, Check, CircleDollarSign, Download, Edit3, FileSpreadsheet, Plus, Search, Trash2, Users, X } from "lucide-react";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { logAudit } from "./services/operationsHub";

const formatTR = (dateStr, time = false) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    if (time) {
        options.hour = "2-digit";
        options.minute = "2-digit";
    }
    return new Intl.DateTimeFormat("tr-TR", options).format(date);
};

// Turkish-safe comparison/display helpers.
// Comparison intentionally treats Turkish diacritics as equivalent:
// i/ı/İ/I, u/ü, o/ö, c/ç, s/ş, g/ğ.
const normalizeTurkishKey = (value) =>
    String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("tr-TR")
        .replace(/ı/g, "i")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");

const canonicalTurkishName = (value) =>
    String(value ?? "")
        .normalize("NFC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleUpperCase("tr-TR");

const uppercaseTurkishLive = (value) =>
    String(value ?? "")
        .normalize("NFC")
        .toLocaleUpperCase("tr-TR");

const dedupeTahakkukRows = (list = []) => {
    const seen = new Map();

    list.forEach((row) => {
        const key = normalizeTurkishKey(row?.tedarikci_firma);
        if (!key) {
            seen.set(`__id_${row?.id}`, row);
            return;
        }

        // Query is already newest-first, so keep the latest record on screen.
        if (!seen.has(key)) seen.set(key, row);
    });

    return Array.from(seen.values());
};

const LargeButton = ({ children, primary = false, disabled = false, ...props }) => (
    <button
        {...props}
        disabled={disabled}
        className={`px-5 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-95"
            } ${primary
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-500"
                : "bg-white dark:bg-white/[.05] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-sky-300"
            }`}
    >
        {children}
    </button>
);

const STATUS_MAP = {
    odenecek: { label: "Ödenecek", color: "bg-amber-500", light: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", icon: "⏳" },
    odendi: { label: "Ödendi", color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", icon: "✅" },
    bulunamadi: { label: "Bulunamadı", color: "bg-rose-500", light: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", icon: "❌" }
};

export default function Tahakkuk() {
    useDarkMode();
    const adSoyad = canonicalTurkishName(localStorage.getItem("ad") ?? "Kullanıcı");
    const [rows, setRows] = useState([]);
    const [firmCatalogRows, setFirmCatalogRows] = useState([]);
    const [q, setQ] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPaymentDay, setFilterPaymentDay] = useState("all");
    const [selectedIds, setSelectedIds] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, isBulk: false });

    // Geçmiş tarihli kayıt paneli
    const [expiredPanelOpen, setExpiredPanelOpen] = useState(false);
    const [expiredRows, setExpiredRows] = useState([]);
    const [selectedExpiredIds, setSelectedExpiredIds] = useState([]);
    const [deletingExpired, setDeletingExpired] = useState(false);

    const paymentOptions = useMemo(() => {
        const options = [];
        const targets = [2, 5];

        targets.forEach((targetDay) => {
            for (let i = 0; i < 3; i++) {
                const d = new Date();
                d.setHours(12, 0, 0, 0);
                const todayIdx = d.getDay();
                let diff = targetDay - todayIdx;
                if (diff <= 0) diff += 7;
                d.setDate(d.getDate() + diff + i * 7);

                const val = d.toISOString().split("T")[0];
                const labelPrefix = i === 0 ? "En Yakın" : i === 1 ? "Gelecek" : "Sonraki";

                options.push({
                    v: val,
                    l: `${labelPrefix} ${targetDay === 2 ? "Salı" : "Cuma"} (${formatTR(val)})`,
                    dateObj: new Date(d)
                });
            }
        });

        return options.sort((a, b) => a.dateObj - b.dateObj);
    }, []);

    const [form, setForm] = useState({
        tedarikci_firma: "",
        odeme_gunu: paymentOptions[0]?.v || "",
        tarih: new Date().toISOString().split("T")[0],
        not: ""
    });

    const normalizedFirmName = (value) => normalizeTurkishKey(value);

    const existingFirmNames = useMemo(() => {
        const uniqueMap = new Map();

        // Supabase sonucu newest-first geliyor. Reverse ile ilk/eskiden kayıtlı yazımı
        // canonical kabul ediyoruz; sonradan girilen ARAŞ/ARAS varyasyonları master adı bozmaz.
        [...firmCatalogRows].reverse().forEach((r) => {
            const original = canonicalTurkishName(r.tedarikci_firma);
            const normalized = normalizedFirmName(original);

            if (!original || !normalized) return;
            if (editingId && r.id === editingId) return;
            if (!uniqueMap.has(normalized)) uniqueMap.set(normalized, original);
        });

        return Array.from(uniqueMap.values()).sort((a, b) =>
            a.localeCompare(b, "tr-TR", { sensitivity: "base" })
        );
    }, [firmCatalogRows, editingId]);

    const canonicalWordMap = useMemo(() => {
        const map = new Map();

        // Firma adlarının içindeki kelimeleri de öğren:
        // ör. sistemde "ARAS" varsa kullanıcı "ARAŞ" yazdığında normalized token "aras"
        // üzerinden mevcut yazım "ARAS" olarak geri kullanılır.
        [...firmCatalogRows].reverse().forEach((row) => {
            const original = canonicalTurkishName(row.tedarikci_firma);
            original.split(/\s+/).filter(Boolean).forEach((word) => {
                const key = normalizedFirmName(word);
                if (key && !map.has(key)) map.set(key, word);
            });
        });

        return map;
    }, [firmCatalogRows]);

    const applyKnownFirmSpelling = (value) => {
        const upperValue = uppercaseTurkishLive(value);
        const fullKey = normalizedFirmName(upperValue);
        const exact = existingFirmNames.find(
            (name) => normalizedFirmName(name) === fullKey
        );
        if (exact) return exact;

        return upperValue
            .split(/(\s+)/)
            .map((part) => {
                if (/^\s+$/.test(part)) return part;
                return canonicalWordMap.get(normalizedFirmName(part)) || part;
            })
            .join("");
    };

    const firmSuggestions = useMemo(() => {
        const query = normalizedFirmName(form.tedarikci_firma);
        if (!query) return [];

        return existingFirmNames
            .filter((name) => normalizedFirmName(name).includes(query))
            .slice(0, 6);
    }, [form.tedarikci_firma, existingFirmNames]);

    const exactMatchedFirm = useMemo(() => {
        const current = normalizedFirmName(form.tedarikci_firma);
        if (!current) return "";

        return existingFirmNames.find(
            (name) => normalizedFirmName(name) === current
        ) || "";
    }, [form.tedarikci_firma, existingFirmNames]);

    const handleFirmNameChange = (rawValue) => {
        setForm((prev) => ({
            ...prev,
            // Hem tam firma eşleşmesini hem de bilinen kelime yazımlarını uygula.
            tedarikci_firma: applyKnownFirmSpelling(rawValue)
        }));
        setShowSuggestions(true);
    };

    const duplicateFirm = useMemo(() => {
        const current = normalizedFirmName(form.tedarikci_firma);
        if (!current) return false;

        return firmCatalogRows.some((r) => {
            if (editingId && r.id === editingId) return false;
            return normalizedFirmName(r.tedarikci_firma) === current;
        });
    }, [form.tedarikci_firma, firmCatalogRows, editingId]);

    useEffect(() => {
        if (open && !editingId) {
            setForm((prev) => ({ ...prev, odeme_gunu: paymentOptions[0]?.v || "" }));
        }
    }, [open, editingId, paymentOptions]);

    const fetchRows = async () => {
        const { data } = await supabase
            .from("tahakkuk")
            .select("*")
            .order("olusturulma_tarihi", { ascending: false });

        if (data) {
            setFirmCatalogRows(data);
            setRows(dedupeTahakkukRows(data));
        }
    };

    const checkExpiredRows = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        const { data, error } = await supabase
            .from("tahakkuk")
            .select("*")
            .lt("odeme_gunu", todayStr)
            .order("odeme_gunu", { ascending: true });

        if (error || !data || data.length === 0) {
            setExpiredRows([]);
            setSelectedExpiredIds([]);
            setExpiredPanelOpen(false);
            return;
        }

        const uniqueExpired = dedupeTahakkukRows(data);
        setExpiredRows(uniqueExpired);
        setSelectedExpiredIds(uniqueExpired.map((r) => r.id));
        setExpiredPanelOpen(true);
    };

    useEffect(() => {
        const init = async () => {
            await fetchRows();
            await checkExpiredRows();
        };

        init();
    }, []);

    const handleBulkStatusUpdate = async (newStatus) => {
        const now = new Date().toISOString();
        const islemNotu = `TOPLU ${STATUS_MAP[newStatus].label.toLocaleUpperCase("tr-TR")} YAPILDI`;

        const { error } = await supabase
            .from("tahakkuk")
            .update({
                durum: newStatus,
                guncelleyen_kullanici: adSoyad,
                guncelleme_tarihi: now,
                son_islem: islemNotu
            })
            .in("id", selectedIds);

        if (!error) {
            fetchRows();
            setSelectedIds([]);
        }
    };
    const chunkArray = (arr, size = 100) => {
        const chunks = [];

        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }

        return chunks;
    };

    const deleteByChunks = async (ids) => {
        for (const chunk of chunkArray(ids, 100)) {
            const { error } = await supabase
                .from("tahakkuk")
                .delete()
                .in("id", chunk);

            if (error) throw error;
        }
    };

    const executeDelete = async () => {
        const targetIds = confirmDelete.isBulk ? selectedIds : [confirmDelete.id];

        try {
            await deleteByChunks(targetIds);
            await logAudit(confirmDelete.isBulk ? "Tahakkuk kayıtlarını toplu sildi" : "Tahakkuk kaydını sildi", "tahakkuk", targetIds.join(","), { ids: targetIds }, null, "/tahakkuk");

            await fetchRows();
            await checkExpiredRows();

            setSelectedIds([]);
            setConfirmDelete({ open: false, id: null, isBulk: false });
        } catch (error) {
            console.error(error);
            alert("Silme sırasında hata oluştu: " + error.message);
        }
    };
    const deleteSelectedExpiredRows = async () => {
        if (selectedExpiredIds.length === 0) {
            alert("Silmek için en az bir kayıt seçmelisiniz.");
            return;
        }

        setDeletingExpired(true);

        try {
            await deleteByChunks(selectedExpiredIds);

            await fetchRows();
            await checkExpiredRows();
        } catch (error) {
            console.error(error);
            alert("Silme sırasında hata oluştu: " + error.message);
        } finally {
            setDeletingExpired(false);
        }
    };

    const exportToExcel = () => {
        const excelData = filteredRows.map((r) => ({
            FİRMA: canonicalTurkishName(r.tedarikci_firma),
            "NOT / AÇIKLAMA": String(r.aciklama || "-").toLocaleUpperCase("tr-TR"),
            "ÖDEME GÜNÜ": formatTR(r.odeme_gunu),
            DURUM: STATUS_MAP[r.durum].label.toLocaleUpperCase("tr-TR")
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tahakkuk Listesi");
        XLSX.writeFile(workbook, `Tahakkuk_Listesi_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    const updateStatus = async (id, newStatus) => {
        const now = new Date().toISOString();
        const islemNotu = STATUS_MAP[newStatus].label.toLocaleUpperCase("tr-TR") + " YAPILDI";

        const { error } = await supabase
            .from("tahakkuk")
            .update({
                durum: newStatus,
                guncelleyen_kullanici: adSoyad,
                guncelleme_tarihi: now,
                son_islem: islemNotu
            })
            .eq("id", id);

        if (!error) {
            await logAudit("Tahakkuk durumunu değiştirdi", "tahakkuk", id, selectedRow?.id === id ? selectedRow : null, { durum: newStatus }, "/tahakkuk");
            fetchRows();
            checkExpiredRows();

            if (selectedRow?.id === id) {
                setSelectedRow({
                    ...selectedRow,
                    durum: newStatus,
                    guncelleyen_kullanici: adSoyad,
                    guncelleme_tarihi: now,
                    son_islem: islemNotu
                });
            }
        }
    };

    const handleSave = async () => {
        if (!form.tedarikci_firma.trim()) return alert("Firma adı giriniz!");

        const correctedFirmName = canonicalTurkishName(applyKnownFirmSpelling(form.tedarikci_firma));
        const correctedKey = normalizedFirmName(correctedFirmName);

        // Ekrandaki liste eski kalmış olsa bile kaydetmeden hemen önce DB'den kontrol et.
        const { data: latestFirms, error: firmCheckError } = await supabase
            .from("tahakkuk")
            .select("id,tedarikci_firma,olusturulma_tarihi")
            .order("olusturulma_tarihi", { ascending: true });

        if (firmCheckError) {
            return alert("Firma kontrolü yapılamadı. Lütfen tekrar deneyin.");
        }

        const dbDuplicate = (latestFirms || []).find((row) =>
            (!editingId || row.id !== editingId) &&
            normalizedFirmName(row.tedarikci_firma) === correctedKey
        );

        if (dbDuplicate) {
            const registeredName = canonicalTurkishName(dbDuplicate.tedarikci_firma);
            setForm((prev) => ({ ...prev, tedarikci_firma: registeredName }));
            return alert(`Bu firma zaten kayıtlı: ${registeredName}`);
        }

        setSaving(true);

        const payload = {
            tedarikci_firma: correctedFirmName,
            tarih: form.tarih,
            odeme_gunu: form.odeme_gunu,
            aciklama: form.not,
            guncelleyen_kullanici: adSoyad,
            guncelleme_tarihi: new Date().toISOString(),
            son_islem: editingId ? "KAYIT DÜZENLENDİ" : "YENİ KAYIT AÇILDI"
        };

        let error;

        if (editingId) {
            const res = await supabase.from("tahakkuk").update(payload).eq("id", editingId);
            error = res.error;
        } else {
            const res = await supabase
                .from("tahakkuk")
                .insert([{ ...payload, durum: "odenecek", olusturan_kullanici: adSoyad }]);
            error = res.error;
        }

        if (!error) {
            await logAudit(editingId ? "Tahakkuk kaydını düzenledi" : "Tahakkuk kaydı ekledi", "tahakkuk", editingId || correctedFirmName, editingId ? selectedRow : null, payload, "/tahakkuk");
            setOpen(false);
            setEditingId(null);
            setShowSuggestions(false);
            setForm({
                tedarikci_firma: "",
                odeme_gunu: paymentOptions[0]?.v || "",
                tarih: new Date().toISOString().split("T")[0],
                not: ""
            });
            await fetchRows();
            await checkExpiredRows();
        }

        setSaving(false);
    };

    const openEdit = (e, r) => {
        e.stopPropagation();
        setEditingId(r.id);
        setShowSuggestions(false);
        setForm({
            tedarikci_firma: canonicalTurkishName(r.tedarikci_firma),
            odeme_gunu: r.odeme_gunu,
            tarih: r.tarih,
            not: r.aciklama
        });
        setOpen(true);
    };

    const filteredRows = rows.filter((r) => {
        const matchesSearch = normalizeTurkishKey(
            `${r.tedarikci_firma || ""} ${r.aciklama || ""}`
        ).includes(normalizeTurkishKey(q));

        const matchesStatus = filterStatus === "all" || r.durum === filterStatus;
        const matchesPaymentDay = filterPaymentDay === "all" || r.odeme_gunu === filterPaymentDay;

        return matchesSearch && matchesStatus && matchesPaymentDay;
    });

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleExpiredSelect = (id) => {
        setSelectedExpiredIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50 dark:bg-[#0b1220] text-slate-900 dark:text-slate-100 p-5 sm:p-6 lg:p-8 font-sans w-full transition-colors">
                {/* Geçmiş Tarihli Kayıtlar Paneli */}
                <AnimatePresence>
                    {expiredPanelOpen && expiredRows.length > 0 && (
                        <div className="fixed inset-0 z-[11050] flex items-center justify-center p-8 bg-black/95 backdrop-blur-xl">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-slate-900 w-full max-w-5xl rounded-[3rem] p-10 border border-rose-900/30 shadow-2xl"
                            >
                                <div className="flex items-start justify-between gap-6 mb-8">
                                    <div>
                                        <h2 className="text-4xl font-black text-white uppercase italic">
                                            Geçmiş Tarihli Kayıtlar
                                        </h2>
                                        <p className="text-slate-400 font-bold mt-3 uppercase">
                                            Ödeme tarihi geçmiş kayıtlar bulundu. Silmek istiyor musun?
                                        </p>
                                        <p className="text-rose-400 font-bold mt-2 uppercase">
                                            İstersen aradan ayıklayıp sadece seçtiklerini silebilirsin.
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-5xl font-black text-rose-500">
                                            {expiredRows.length}
                                        </div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black">
                                            kayıt bulundu
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mb-6">
                                    <button
                                        onClick={() =>
                                            setSelectedExpiredIds(
                                                selectedExpiredIds.length === expiredRows.length
                                                    ? []
                                                    : expiredRows.map((r) => r.id)
                                            )
                                        }
                                        className="px-6 py-3 rounded-2xl bg-slate-800 text-white font-black hover:bg-slate-700 transition-all"
                                    >
                                        {selectedExpiredIds.length === expiredRows.length
                                            ? "SEÇİMİ KALDIR"
                                            : "TÜMÜNÜ SEÇ"}
                                    </button>

                                    <button
                                        onClick={deleteSelectedExpiredRows}
                                        disabled={deletingExpired || selectedExpiredIds.length === 0}
                                        className={`px-6 py-3 rounded-2xl font-black transition-all ${deletingExpired || selectedExpiredIds.length === 0
                                                ? "bg-rose-900/40 text-rose-300/40 cursor-not-allowed"
                                                : "bg-rose-600 text-white hover:bg-rose-500"
                                            }`}
                                    >
                                        {deletingExpired
                                            ? "SİLİNİYOR..."
                                            : `SEÇİLENLERİ SİL (${selectedExpiredIds.length})`}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setExpiredPanelOpen(false);
                                            setSelectedExpiredIds([]);
                                        }}
                                        className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-300 font-black hover:bg-slate-700 transition-all"
                                    >
                                        VAZGEÇ
                                    </button>
                                </div>

                                <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                                    {expiredRows.map((r) => (
                                        <div
                                            key={r.id}
                                            className={`rounded-[2rem] border p-6 flex items-center gap-5 transition-all ${selectedExpiredIds.includes(r.id)
                                                    ? "bg-rose-900/20 border-rose-500"
                                                    : "bg-black/40 border-slate-800"
                                                }`}
                                        >
                                            <button
                                                onClick={() => toggleExpiredSelect(r.id)}
                                                className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 ${selectedExpiredIds.includes(r.id)
                                                        ? "bg-rose-500 border-rose-500"
                                                        : "border-slate-700 bg-black/40"
                                                    }`}
                                            >
                                                {selectedExpiredIds.includes(r.id) && (
                                                    <span className="text-white text-2xl font-black">✓</span>
                                                )}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-2xl font-black text-white uppercase truncate">
                                                    {r.tedarikci_firma}
                                                </div>
                                                <div className="text-sm text-slate-400 font-bold uppercase mt-2">
                                                    {r.aciklama || "---"}
                                                </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                                <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                                                    ÖDEME GÜNÜ
                                                </div>
                                                <div className="text-xl font-black text-white">
                                                    {formatTR(r.odeme_gunu)}
                                                </div>
                                            </div>

                                            <div className="shrink-0 text-right min-w-[180px]">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    DURUM
                                                </div>
                                                <div className={`inline-block mt-1 px-4 py-2 rounded-2xl text-sm font-black uppercase ${STATUS_MAP[r.durum]?.light || "bg-slate-700 text-white"}`}>
                                                    {STATUS_MAP[r.durum]?.icon} {STATUS_MAP[r.durum]?.label || r.durum}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {selectedIds.length > 0 && (
                        <motion.div
                            initial={{ y: -100 }}
                            animate={{ y: 0 }}
                            exit={{ y: -100 }}
                            className="fixed top-[68px] left-0 right-0 z-[10000] bg-indigo-600 p-6 flex justify-between items-center shadow-2xl"
                        >
                            <div className="flex items-center gap-8 pl-10">
                                <span className="text-3xl font-black text-white">
                                    {selectedIds.length} KAYIT SEÇİLDİ
                                </span>

                                <div className="flex gap-2">
                                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleBulkStatusUpdate(key)}
                                            className="px-6 py-2 bg-white/20 hover:bg-white/40 rounded-xl font-bold text-sm uppercase transition-all"
                                        >
                                            {val.icon} {val.label} YAP
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pr-10">
                                <button
                                    onClick={() =>
                                        setConfirmDelete({ open: true, id: null, isBulk: true })
                                    }
                                    className="px-8 py-3 bg-rose-500 hover:bg-rose-400 rounded-xl font-black text-white"
                                >
                                    🗑️ TOPLU SİL
                                </button>

                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="px-8 py-3 bg-black/20 text-white font-bold rounded-xl"
                                >
                                    İPTAL
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="w-full mb-6 flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 border border-slate-200/80 dark:border-white/[.08] bg-white dark:bg-[#111927] rounded-[22px] p-5 sm:p-6 shadow-sm">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                            Tahakkuk <span className="text-sky-600 dark:text-sky-400">Paneli</span>
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1.5">
                            Kullanıcı: {adSoyad}
                        </p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <select
                            className="h-11 bg-slate-50 dark:bg-[#0d141f] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-100 px-3 rounded-xl font-bold text-xs focus:border-sky-400 outline-none"
                            value={filterPaymentDay}
                            onChange={(e) => setFilterPaymentDay(e.target.value)}
                        >
                            <option value="all">TÜM ÖDEME GÜNLERİ</option>
                            {paymentOptions.map((o) => (
                                <option key={o.v} value={o.v}>
                                    {o.l}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={exportToExcel}
                            className="h-11 px-4 rounded-xl font-black text-xs bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                        >
                            📊 EXCEL
                        </button>

                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="ARA..."
                            className="h-11 w-full xl:w-[260px] px-4 rounded-xl bg-slate-50 dark:bg-[#0d141f] border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-sky-400 transition-all"
                        />

                        <LargeButton
                            primary
                            onClick={() => {
                                setEditingId(null);
                                setShowSuggestions(false);
                                setForm({
                                    tedarikci_firma: "",
                                    odeme_gunu: paymentOptions[0]?.v || "",
                                    tarih: new Date().toISOString().split("T")[0],
                                    not: ""
                                });
                                setOpen(true);
                            }}
                        >
                            ＋ YENİ KAYIT
                        </LargeButton>
                    </div>
                </header>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button
                        onClick={() => setFilterStatus("all")}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${filterStatus === "all"
                                ? "bg-sky-600 text-white"
                                : "bg-white dark:bg-[#111927] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-sky-600"
                            }`}
                    >
                        TÜMÜ
                    </button>

                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(key)}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${filterStatus === key
                                    ? `${val.color} text-white`
                                    : "bg-white dark:bg-[#111927] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-sky-600"
                                }`}
                        >
                            {val.label.toUpperCase()}
                        </button>
                    ))}

                    <button
                        onClick={() =>
                            setSelectedIds(
                                selectedIds.length === filteredRows.length
                                    ? []
                                    : filteredRows.map((r) => r.id)
                            )
                        }
                        className="ml-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111927] text-slate-500 dark:text-slate-400 text-xs font-bold hover:text-sky-600 transition-all"
                    >
                        {selectedIds.length === filteredRows.length ? "SEÇİMİ SIFIRLA" : "LİSTEYİ SEÇ"}
                    </button>
                </div>

                <div className="w-full space-y-3">
                    {filteredRows.map((r) => (
                        <div
                            key={r.id}
                            className={`w-full rounded-[20px] border p-4 sm:p-5 flex items-center justify-between gap-4 transition-all relative shadow-sm ${selectedIds.includes(r.id)
                                    ? "bg-sky-50 dark:bg-sky-500/[.06] border-sky-400"
                                    : "bg-white dark:bg-[#111927] border-slate-200/80 dark:border-white/[.08] hover:border-sky-200 dark:hover:border-sky-500/20"
                                }`}
                        >
                            <div className="shrink-0">
                                <button
                                    onClick={() => toggleSelect(r.id)}
                                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${selectedIds.includes(r.id)
                                            ? "bg-indigo-500 border-indigo-500"
                                            : "border-slate-700 bg-black/40"
                                        }`}
                                >
                                    {selectedIds.includes(r.id) && (
                                        <span className="text-white text-2xl font-black">✓</span>
                                    )}
                                </button>
                            </div>

                            <div
                                className="flex-1 min-w-[200px] max-w-[25%] overflow-hidden cursor-pointer"
                                onClick={() => setSelectedRow(r)}
                            >
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                                    {r.tedarikci_firma}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 line-clamp-1 break-all">
                                    {r.aciklama || "---"}
                                </p>
                            </div>

                            <div className="flex gap-4 shrink-0">
                                <div className="bg-slate-50 dark:bg-[#0d141f] px-4 py-3 rounded-xl border border-slate-200 dark:border-white/[.08] text-center">
                                    <div className="text-[10px] font-black text-indigo-500 mb-1 uppercase tracking-widest">
                                        ÖDEME GÜNÜ
                                    </div>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">
                                        {formatTR(r.odeme_gunu)}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:flex gap-4 border-l border-slate-200 dark:border-white/[.08] pl-4 shrink-0">
                                <div className="min-w-[130px]">
                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                                        OLUŞTURAN
                                    </div>
                                    <div className="text-sm font-black text-slate-200 truncate max-w-[130px]">
                                        {r.olusturan_kullanici}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-bold">
                                        {formatTR(r.olusturulma_tarihi, true)}
                                    </div>
                                </div>

                                {r.guncelleyen_kullanici && (
                                    <div className="min-w-[180px] border-l border-slate-800/50 pl-6">
                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">
                                            SON İŞLEM
                                        </div>
                                        <div className="text-sm font-black text-indigo-300">
                                            {r.guncelleyen_kullanici}
                                        </div>
                                        <div className="text-[10px] font-black text-white bg-indigo-600/20 px-2 py-0.5 rounded inline-block mt-1">
                                            {r.son_islem || "GÜNCELLEME"}
                                        </div>
                                        <div className="text-[11px] text-indigo-900 font-bold mt-1">
                                            {formatTR(r.guncelleme_tarihi, true)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div
                                className="flex items-center gap-4 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div
                                    className={`px-6 py-4 rounded-[1.5rem] text-lg font-black uppercase shadow-2xl ${STATUS_MAP[r.durum].light}`}
                                >
                                    {STATUS_MAP[r.durum].icon} {STATUS_MAP[r.durum].label}
                                </div>

                                <div className="flex gap-1 bg-slate-100 dark:bg-[#0d141f] p-1.5 rounded-xl border border-slate-200 dark:border-white/[.08]">
                                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                                        <button
                                            key={key}
                                            onClick={() => updateStatus(r.id, key)}
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${r.durum === key
                                                    ? `${val.color} text-white scale-110 shadow-lg`
                                                    : "hover:bg-slate-800 text-slate-700"
                                                }`}
                                        >
                                            <span className="text-xl">{val.icon}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={(e) => openEdit(e, r)}
                                        className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/[.05] text-slate-500 hover:bg-sky-600 hover:text-white transition-all flex items-center justify-center text-sm"
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDelete({
                                                open: true,
                                                id: r.id,
                                                isBulk: false
                                            });
                                        }}
                                        className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/[.05] text-slate-500 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center text-sm"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <AnimatePresence>
                    {confirmDelete.open && (
                        <div className="fixed inset-0 z-[11050] flex items-center justify-center p-8 bg-black/95 backdrop-blur-xl">
                            <motion.div
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className="bg-slate-900 w-full max-w-lg rounded-[3rem] p-12 border-2 border-rose-900/30 text-center"
                            >
                                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                                    ⚠️
                                </div>

                                <h2 className="text-3xl font-black text-white mb-4 uppercase italic">
                                    {confirmDelete.isBulk
                                        ? `${selectedIds.length} KAYIT SİLİNSİN Mİ?`
                                        : "BU KAYIT SİLİNSİN Mİ?"}
                                </h2>

                                <p className="text-slate-400 font-bold uppercase tracking-tighter mb-8">
                                    Bu işlem geri alınamaz.
                                </p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={executeDelete}
                                        className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xl transition-all"
                                    >
                                        SİLMEYİ ONAYLA
                                    </button>

                                    <button
                                        onClick={() =>
                                            setConfirmDelete({
                                                open: false,
                                                id: null,
                                                isBulk: false
                                            })
                                        }
                                        className="w-full py-5 bg-slate-800 text-slate-400 rounded-2xl font-black text-xl"
                                    >
                                        VAZGEÇ
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {open && (
                        <div className="fixed inset-0 z-[11050] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                className="bg-white dark:bg-[#111927] w-full max-w-2xl rounded-[24px] p-6 sm:p-7 border border-slate-200 dark:border-white/[.08] shadow-2xl"
                            >
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 text-center tracking-tight">
                                    {editingId ? "KAYIT DÜZENLE" : "YENİ KAYIT"}
                                </h2>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            value={form.tedarikci_firma}
                                            className={`w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-[#0d141f] border text-base font-black text-slate-900 dark:text-white focus:border-sky-400 outline-none ${duplicateFirm ? "border-rose-500" : "border-slate-800"
                                                }`}
                                            placeholder="FİRMA ADI"
                                            onChange={(e) => handleFirmNameChange(e.target.value)}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => {
                                                setForm((prev) => {
                                                    const currentKey = normalizedFirmName(prev.tedarikci_firma);
                                                    const existingMatch = existingFirmNames.find(
                                                        (name) => normalizedFirmName(name) === currentKey
                                                    );

                                                    return {
                                                        ...prev,
                                                        tedarikci_firma: existingMatch || canonicalTurkishName(applyKnownFirmSpelling(prev.tedarikci_firma))
                                                    };
                                                });
                                                setTimeout(() => setShowSuggestions(false), 150);
                                            }}
                                        />

                                        {exactMatchedFirm && (
                                            <div className="mt-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                                ✓ Mevcut kayıtla eşleştirildi: {exactMatchedFirm}
                                            </div>
                                        )}

                                        {duplicateFirm && (
                                            <div className="mt-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-bold">
                                                ⚠️ Bu firma zaten listede mevcut. Yeni bir kopya oluşturulamaz.
                                            </div>
                                        )}

                                        <AnimatePresence>
                                            {showSuggestions && firmSuggestions.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 8 }}
                                                    className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0d141f] border border-slate-200 dark:border-white/[.08] rounded-xl shadow-2xl overflow-hidden z-[999]"
                                                >
                                                    {firmSuggestions.map((name) => (
                                                        <button
                                                            key={name}
                                                            type="button"
                                                            onMouseDown={() => {
                                                                setForm({
                                                                    ...form,
                                                                    tedarikci_firma: canonicalTurkishName(name)
                                                                });
                                                                setShowSuggestions(false);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-600 hover:text-white transition-all border-b border-slate-100 dark:border-white/[.06] last:border-b-0"
                                                        >
                                                            {name}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input
                                            type="date"
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-[#0d141f] border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white"
                                            value={form.tarih}
                                            onChange={(e) =>
                                                setForm({ ...form, tarih: e.target.value })
                                            }
                                        />

                                        <select
                                            value={form.odeme_gunu}
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-[#0d141f] border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white outline-none"
                                            onChange={(e) =>
                                                setForm({ ...form, odeme_gunu: e.target.value })
                                            }
                                        >
                                            {paymentOptions.map((o) => (
                                                <option key={o.v} value={o.v}>
                                                    {o.l}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <textarea
                                        value={form.not}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0d141f] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none"
                                        placeholder="AÇIKLAMA..."
                                        onChange={(e) => setForm({ ...form, not: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black text-slate-500 dark:text-slate-300 hover:text-sky-600 transition-all"
                                        onClick={() => {
                                            setOpen(false);
                                            setEditingId(null);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        İPTAL
                                    </button>

                                    <LargeButton
                                        primary
                                        onClick={handleSave}
                                        disabled={saving || duplicateFirm}
                                    >
                                        {saving ? "İŞLENİYOR..." : editingId ? "GÜNCELLE" : "KAYDET"}
                                    </LargeButton>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
}