import React, { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import useDarkMode from "./hooks/useDarkMode";
import { ArrowLeft, CalendarDays, Check, CircleDollarSign, Download, Edit3, FileSpreadsheet, History, Plus, Search, Trash2, Users, X } from "lucide-react";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import ExcelJS from "exceljs";
import { logAudit } from "./services/operationsHub";

const formatTR = (dateStr, time = false) => {
    if (!dateStr) return "-";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))
        ? new Date(`${dateStr}T12:00:00`)
        : new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "-";
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

    // Geçmiş yalnızca yetkili Supabase sorgusu başarılı olursa görüntülenir.
    const [historyRows, setHistoryRows] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyFirm, setHistoryFirm] = useState(null);
    const [historyQuery, setHistoryQuery] = useState("");
    const [historyType, setHistoryType] = useState("all");
    const [historyUser, setHistoryUser] = useState("all");
    const [expandedHistory, setExpandedHistory] = useState({});

    const loadHistory = async (firm = null) => {
        setHistoryLoading(true);
        setHistoryError("");
        try {
            // PostgREST'in varsayılan 1000 satır sınırını sayfalayarak aş.
            const result = [];
            for (let offset = 0; ; offset += 500) {
                let query = supabase.from("tahakkuk_islem_gecmisi")
                    .select("id,tahakkuk_id,firma_adi,islem_tipi,kullanici_id,kullanici_adi,islem_tarihi,eski_veri,yeni_veri,degisen_alanlar,aciklama")
                    .order("islem_tarihi", { ascending: false })
                    .order("id", { ascending: false })
                    .range(offset, offset + 499);
                if (firm?.id) query = query.eq("tahakkuk_id", firm.id);
                const { data, error } = await query;
                if (error) throw error;
                result.push(...(data || []));
                if (!data || data.length < 500) break;
            }
            setHistoryRows(result);
            return result;
        } catch (error) {
            setHistoryRows([]);
            setHistoryError("İşlem geçmişi okunamadı. Yetkilerinizi kontrol edin: " + error.message);
            throw error;
        } finally {
            setHistoryLoading(false);
        }
    };

    const openHistory = async (firm = null) => {
        setHistoryFirm(firm);
        setHistoryQuery("");
        setHistoryType("all");
        setHistoryUser("all");
        setExpandedHistory({});
        setHistoryOpen(true);
        try { await loadHistory(firm); } catch (_) { /* Hata panelde gösterilir. */ }
    };

    const HISTORY_FIELDS = {
        tedarikci_firma: "Firma adı", aciklama: "Kullanıcı açıklaması", odeme_gunu: "Ödeme günü",
        tarih: "Tahakkuk tarihi", durum: "Ödeme durumu", tutar: "Tutar", para_birimi: "Para birimi",
        fatura_no: "Fatura numarası", olusturan_kullanici: "Oluşturan kullanıcı",
        olusturulma_tarihi: "Oluşturulma zamanı", guncelleyen_kullanici: "Güncelleyen kullanıcı",
        guncelleme_tarihi: "Güncelleme zamanı", son_islem: "Son işlem"
    };
    const historyKind = (r) => ({ INSERT: "EKLEME", UPDATE: "GUNCELLEME", DELETE: "SILME" }[r.islem_tipi] || r.islem_tipi || "DİĞER");
    const historyValue = (value) => {
        if (value === null || value === undefined || value === "") return "—";
        if (typeof value === "object") return JSON.stringify(value, null, 2);
        return String(value);
    };
    const historyChanges = (r) => {
        const oldData = r.eski_veri && typeof r.eski_veri === "object" ? r.eski_veri : {};
        const newData = r.yeni_veri && typeof r.yeni_veri === "object" ? r.yeni_veri : {};
        const kind = historyKind(r);
        const diffs = r.degisen_alanlar && typeof r.degisen_alanlar === "object" ? r.degisen_alanlar : {};
        if (kind === "EKLEME") return Object.entries(newData).map(([field, value]) => ({ field, old: null, next: value }));
        if (kind === "SILME") return Object.entries(oldData).map(([field, value]) => ({ field, old: value, next: null }));
        const keys = new Set([...Object.keys(diffs), ...Object.keys(oldData), ...Object.keys(newData)]);
        return Array.from(keys).filter(field => {
            if (field in diffs) return true;
            return JSON.stringify(oldData[field] ?? null) !== JSON.stringify(newData[field] ?? null);
        }).map(field => ({
            field,
            old: field in diffs ? (diffs[field]?.eski ?? oldData[field]) : oldData[field],
            next: field in diffs ? (diffs[field]?.yeni ?? newData[field]) : newData[field]
        }));
    };
    const describeChanges = (record) => {
        const kind = historyKind(record);
        if (kind === "EKLEME") return "Yeni tahakkuk kaydı oluşturuldu";
        if (kind === "SILME") return "Tahakkuk kaydı silindi";
        return historyChanges(record).map(x => `${HISTORY_FIELDS[x.field] || x.field}: ${historyValue(x.old)} → ${historyValue(x.next)}`).join(" | ") || "Kayıt güncellendi";
    };
    const historyUsers = [...new Set(historyRows.map(r => r.kullanici_adi || "Belirlenemedi"))].sort((a,b) => a.localeCompare(b,"tr"));
    const filteredHistory = historyRows.filter(r => {
        const text = `${r.firma_adi || ""} ${r.kullanici_adi || ""} ${r.islem_tipi || ""} ${r.aciklama || ""} ${r.eski_veri?.aciklama || ""} ${r.yeni_veri?.aciklama || ""} ${describeChanges(r)}`;
        return (historyType === "all" || historyKind(r) === historyType) &&
            (historyUser === "all" || (r.kullanici_adi || "Belirlenemedi") === historyUser) &&
            normalizeTurkishKey(text).includes(normalizeTurkishKey(historyQuery));
    });
    const historyCount = kind => historyRows.filter(r => historyKind(r) === kind).length;

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
            await logAudit("Tahakkuk toplu durum değiştirdi", "tahakkuk", selectedIds.join(","), { ids: selectedIds }, { durum: newStatus }, "/tahakkuk");
            await fetchRows();
            setSelectedIds([]);
        } else {
            alert("Toplu durum güncellenemedi: " + error.message);
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
            await logAudit("Tahakkuk geçmiş tarihli kayıtları toplu sildi", "tahakkuk", selectedExpiredIds.join(","), { ids: selectedExpiredIds }, null, "/tahakkuk");

            await fetchRows();
            await checkExpiredRows();
        } catch (error) {
            console.error(error);
            alert("Silme sırasında hata oluştu: " + error.message);
        } finally {
            setDeletingExpired(false);
        }
    };

    const exportToExcel = async () => {
        if (filteredRows.length === 0) {
            alert("Excel aktarımı için filtreye uygun tahakkuk kaydı bulunamadı.");
            return;
        }
        let allHistory;
        try {
            allHistory = await loadHistory(null);
            if (allHistory.length === 0 && filteredRows.length > 0) {
                alert("İşlem geçmişi henüz boş. Eksik rapor oluşturulmadı.");
                return;
            }
        } catch (error) {
            alert("İşlem geçmişi okunamadığı için eksik Excel hazırlanmadı: " + error.message);
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "ODAK Tahakkuk Paneli";
            workbook.created = new Date();
            workbook.properties.date1904 = false;
            const now = new Date();
            const C = {
                navy: "111C35", navy2: "1D3056", blue: "2563EB", cyan: "06B6D4",
                purple: "7C3AED", green: "059669", mint: "D1FAE5", red: "DC2626",
                rose: "FFE4E6", amber: "D97706", yellow: "FEF3C7", pale: "EFF6FF",
                white: "FFFFFF", ink: "17243B", muted: "64748B", stripe: "F3F7FD",
                border: "DCE5F1", lilac: "F3E8FF"
            };
            const colorFor = (kind) => kind === "EKLEME" ? C.green : kind === "SILME" ? C.red : kind === "GUNCELLEME" ? C.amber : C.blue;
            const fill = (hex) => ({ type: "pattern", pattern: "solid", fgColor: { argb: "FF" + hex } });
            const safe = (value) => {
                if (value === null || value === undefined) return "";
                if (typeof value === "object") return JSON.stringify(value);
                // Excel formül enjeksiyonunu önle; kullanıcı açıklamalarını olduğu gibi metin olarak sakla.
                const str = String(value);
                return /^[\s]*[=+@\-]/.test(str) ? "'" + str : str;
            };
            const display = (v) => v === null || v === undefined || v === "" ? "—" : safe(v);
            const dateText = (v) => v ? formatTR(v, true) : "—";
            const dateOnly = (v) => v ? formatTR(v) : "—";
            const typeOf = (r) => historyKind(r);
            const noteOf = (r, source) => display(source?.aciklama ?? source?.not ?? (source ? "" : r.aciklama));
            const allFields = [...new Set([...filteredRows.flatMap(r => Object.keys(r)), ...allHistory.flatMap(r => [...Object.keys(r.eski_veri || {}), ...Object.keys(r.yeni_veri || {})])])]
                .filter(k => k !== "id").sort((a,b) => a.localeCompare(b,"tr"));
            const orderedFields = ["tedarikci_firma","aciklama","tarih","odeme_gunu","durum","tutar","para_birimi","fatura_no","odeme_tarihi","odeme_yontemi","olusturan_kullanici","guncelleyen_kullanici","son_islem",...allFields].filter((x,i,a)=>a.indexOf(x)===i);
            const pretty = (k) => HISTORY_FIELDS[k] || k.replace(/_/g," ").toLocaleUpperCase("tr-TR");

            const createSheet = (name, subtitle, headers, widths, rowsData, opts = {}) => {
                const ws = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
                    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
                ws.properties.tabColor = { argb: "FF" + (opts.tab || C.blue) };
                ws.columns = headers.map((_,i) => ({ width: widths[i] || 20 }));
                const last = Math.max(1, headers.length);
                ws.mergeCells(1, 1, 2, last);
                const title = ws.getCell(1,1);
                title.value = "ODAK  /  " + name.toLocaleUpperCase("tr-TR");
                title.font = { name: "Aptos Display", size: 21, bold: true, color: { argb: "FFFFFFFF" } };
                title.fill = fill(C.navy);
                title.alignment = { vertical: "middle", indent: 1 };
                ws.getRow(1).height = 27; ws.getRow(2).height = 20;
                ws.mergeCells(3,1,3,last);
                const subtitleCell = ws.getCell(3,1);
                subtitleCell.value = subtitle + "   •   " + dateText(now.toISOString());
                subtitleCell.font = { name: "Aptos", size: 10, italic: true, color: { argb: "FF" + C.navy2 } };
                subtitleCell.fill = fill(C.pale);
                subtitleCell.alignment = { vertical: "middle", indent: 2 };
                ws.getRow(3).height = 28;
                ws.getRow(4).height = 9;
                const headerRow = ws.getRow(5);
                headers.forEach((h,i) => {
                    const cell = headerRow.getCell(i+1);
                    cell.value = h;
                    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
                    cell.fill = fill(opts.tab || C.blue);
                    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
                    cell.border = { bottom: { style: "medium", color: { argb: "FF" + C.navy } } };
                });
                headerRow.height = 36;
                rowsData.forEach((row, idx) => {
                    const rr = ws.getRow(idx + 6);
                    row.forEach((v, ci) => {
                        const cell = rr.getCell(ci+1);
                        cell.value = typeof v === "number" ? v : safe(v);
                        cell.fill = fill(idx % 2 === 0 ? C.white : C.stripe);
                        cell.font = { name: "Aptos", size: 10, color: { argb: "FF" + C.ink }, bold: ci === 0 };
                        cell.alignment = { vertical: "top", wrapText: true, indent: 1 };
                        cell.border = { bottom: { style: "hair", color: { argb: "FF" + C.border } } };
                    });
                    if (opts.typeIndex !== undefined) {
                        const kind = String(row[opts.typeIndex] || "");
                        const c = rr.getCell(opts.typeIndex+1);
                        c.fill = fill(kind === "EKLEME" ? C.mint : kind === "SILME" ? C.rose : kind === "GUNCELLEME" ? C.yellow : C.pale);
                        c.font = { name: "Aptos", bold: true, color: { argb: "FF" + colorFor(kind) }, size: 10 };
                    }
                    if (opts.statusIndex !== undefined) {
                        const c = rr.getCell(opts.statusIndex+1);
                        const status = String(row[opts.statusIndex] || "").toLocaleLowerCase("tr-TR");
                        const tone = status.includes("ödendi") && !status.includes("ödenecek") ? [C.mint,C.green] : status.includes("bulunamadı") ? [C.rose,C.red] : [C.yellow,C.amber];
                        c.fill = fill(tone[0]); c.font = { name: "Aptos", bold: true, color: { argb: "FF" + tone[1] } };
                    }
                    const long = row.some(v => String(v ?? "").length > 120);
                    rr.height = long ? 66 : row.some(v => String(v ?? "").length > 55) ? 43 : 27;
                });
                ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, rowsData.length + 5), column: last } };
                ws.headerFooter.oddFooter = "ODAK Tahakkuk  •  Sayfa &P / &N";
                ws.pageSetup.printTitlesRow = "1:5";
                return ws;
            };
            // İlk sekme: ekranda filtre sonrası görünen kayıtların birebir dökümü.
            // Her tahakkuk kaydı tek bir veri satırına karşılık gelir.
            // Son güncelleme bilgisi, kayıt bazında gerçek UPDATE audit olayından alınır.
            const latestUpdateById = new Map();
            for (const event of allHistory) {
                if (historyKind(event) !== "GUNCELLEME") continue;
                const id = String(event.tahakkuk_id ?? "");
                if (!id || !event.islem_tarihi) continue;
                const previous = latestUpdateById.get(id);
                if (!previous || new Date(event.islem_tarihi) > new Date(previous.islem_tarihi)) {
                    latestUpdateById.set(id, event);
                }
            }
            const listColumns = [
                ["TEDARİKÇİ FİRMA", "tedarikci_firma"],
                ["AÇIKLAMA", "aciklama"],
                ["TAHAKKUK TARİHİ", "tarih"],
                ["ÖDEME GÜNÜ", "odeme_gunu"],
                ["TUTAR", "tutar"],
                ["PARA BİRİMİ", "para_birimi"],
                ["DURUM", "durum"],
                ["FATURA NO", "fatura_no"],
                ["VADE TARİHİ", "vade_tarihi"],
                ["ÖDEME TARİHİ", "odeme_tarihi"],
                ["ÖDEME YÖNTEMİ", "odeme_yontemi"],
                ["KATEGORİ", "kategori"],
                ["PROJE", "proje"],
                ["OLUŞTURAN", "olusturan_kullanici"],
                ["OLUŞTURULMA TARİHİ", "olusturulma_tarihi"],
                ["SON GÜNCELLEYEN", "_son_guncelleyen"],
                ["SON GÜNCELLEME TARİHİ", "_son_guncelleme_tarihi"]
            ];
            const listDates = new Set(["tarih", "odeme_gunu", "vade_tarihi", "odeme_tarihi"]);
            const listDateTimes = new Set(["olusturulma_tarihi"]);
            const listData = filteredRows.map(r => listColumns.map(([, key]) => {
                const lastUpdate = latestUpdateById.get(String(r.id));
                if (key === "_son_guncelleyen") return lastUpdate
                    ? (lastUpdate.kullanici_adi || lastUpdate.yeni_veri?.guncelleyen_kullanici || "") : "";
                if (key === "_son_guncelleme_tarihi") return lastUpdate ? dateText(lastUpdate.islem_tarihi) : "";
                const v = r[key];
                if (listDates.has(key)) return dateOnly(v);
                if (listDateTimes.has(key)) return dateText(v);
                if (key === "durum") return STATUS_MAP[v]?.label || v || "";
                if (key === "tutar" && v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v))) return Number(v);
                return v ?? "";
            }));
            const listSheet = createSheet(
                "Filtrelenmiş Tahakkuk Listesi",
                `${filteredRows.length} kayıt • Ekrandaki aktif filtrelerin birebir sonucu • Her kayıt tek satır`,
                listColumns.map(([label]) => label),
                [38, 75, 22, 22, 20, 17, 23, 26, 22, 22, 26, 28, 30, 32, 27, 27],
                listData,
                { tab: C.green, statusIndex: 6 }
            );
            listSheet.getColumn(5).numFmt = '#,##0.00';
            if (listData.length !== filteredRows.length) throw new Error("Excel kayıt sayısı filtre sonucuyla uyuşmuyor.");

            // Geçmişi en eskiden yeniye sırala: kim oluşturdu, kim değiştirdi, kim sildi.
            // Excel'in tüm sekmeleri ekrandaki filtrelenmiş kayıtlara bağlıdır.
            const exportIds = new Set(filteredRows.map(r => String(r.id)));
            const chronological = allHistory.filter(r =>
                exportIds.has(String(r.tahakkuk_id ?? r.id))
            ).sort((a,b) => new Date(a.islem_tarihi) - new Date(b.islem_tarihi));
            const technicalFields = new Set(["id","tahakkuk_id","kullanici_id","gecmis_id","olusturulma_tarihi","guncellenme_tarihi","guncelleme_tarihi","olusturan_kullanici","guncelleyen_kullanici","son_islem"]);
            const businessChanges = (r) => historyChanges(r).filter(c => !technicalFields.has(c.field));
            const userOf = r => r.kullanici_adi || r.yeni_veri?.guncelleyen_kullanici || r.yeni_veri?.olusturan_kullanici || "Kullanıcı belirtilmemiş";
            const firmOf = r => r.firma_adi || r.yeni_veri?.tedarikci_firma || r.eski_veri?.tedarikci_firma || "Firma belirtilmemiş";
            const typeLabel = kind => ({EKLEME:"OLUŞTURDU",GUNCELLEME:"DÜZENLEDİ",SILME:"SİLDİ"}[kind] || kind);
            const eventNote = r => {
                const before = r.eski_veri?.aciklama;
                const after = r.yeni_veri?.aciklama;
                const kind = typeOf(r);
                if (kind === "EKLEME") return after ? String(after) : "";
                if (kind === "GUNCELLEME" && before !== after) return after ? String(after) : "(Açıklama kaldırıldı)";
                return ""; // Önceki açıklamayı başka kullanıcıya mal etme.
            };
            const eventSummary = r => {
                const kind = typeOf(r);
                if (kind === "EKLEME") return `${userOf(r)} bu tahakkuk kaydını oluşturdu.`;
                if (kind === "SILME") return `${userOf(r)} bu tahakkuk kaydını sildi.`;
                const changes = businessChanges(r);
                return `${userOf(r)} kaydı düzenledi${changes.length ? ": " + changes.map(c=>pretty(c.field)).join(", ") : "."}`;
            };
            const historyByRecord = new Map();
            chronological.forEach(r => {
                const key = r.tahakkuk_id || r.id;
                if (!historyByRecord.has(key)) historyByRecord.set(key, []);
                historyByRecord.get(key).push(r);
            });
            const visibleHistory = chronological;
            const timelineRows = visibleHistory.map((r,i)=>{
                const kind=typeOf(r);
                const changes=businessChanges(r);
                const before=r.eski_veri || {};
                const after=r.yeni_veri || {};
                const last=after.tedarikci_firma ? after : before;
                const noteChange=kind==="GUNCELLEME" && before.aciklama !== after.aciklama;
                return [i+1,dateText(r.islem_tarihi),firmOf(r),typeLabel(kind),userOf(r),eventSummary(r),
                    eventNote(r),noteChange ? display(before.aciklama) : "",noteChange ? display(after.aciklama) : "",
                    display(last.aciklama),dateOnly(last.odeme_gunu),display(STATUS_MAP[last.durum]?.label || last.durum),
                    changes.map(c=>`${pretty(c.field)}: ${display(c.old)} → ${display(c.next)}`).join("\n"),
                    kind==="SILME" ? "SİLİNDİ" : "KAYIT HAREKETİ"];
            });
            const wsList=createSheet("01 Kronolojik Akış","Olay akışı • İlk kayıttan silinmeye kadar kronolojik sıra • Açıklamayı yazan kişi sadece değiştiği işlemde belirtilir",
                ["SIRA","İŞLEM TARİHİ / SAATİ","FİRMA","YAPILAN İŞLEM","İŞLEMİ YAPAN","NE OLDU?","BU İŞLEMDE YAZILAN AÇIKLAMA","ÖNCEKİ AÇIKLAMA","YENİ AÇIKLAMA","KAYITTAKİ SON AÇIKLAMA","ÖDEME GÜNÜ","DURUM","DEĞİŞEN BİLGİLER (ESKİ → YENİ)","KAYIT DURUMU"],
                [10,25,37,20,30,85,95,80,80,95,20,23,110,23],timelineRows,{tab:C.cyan});
            timelineRows.forEach((r,i)=>{
                const c=wsList.getRow(i+6).getCell(4);
                const kind=r[3];
                const tone=kind==="OLUŞTURDU"?[C.mint,C.green]:kind==="SİLDİ"?[C.rose,C.red]:[C.yellow,C.amber];
                c.fill=fill(tone[0]);c.font={name:"Aptos",size:10,bold:true,color:{argb:"FF"+tone[1]}};
            });
            createSheet("02 İşlem Geçmişi","Bütün işlem hareketleri • İlk işlemden son işleme tarih ve saat sıralı",
                ["SIRA","İŞLEM TARİHİ / SAATİ","FİRMA","İŞLEM","İŞLEMİ YAPAN","İŞLEMİN AÇIKLAMASI","BU İŞLEMDE YAZILAN AÇIKLAMA","ÖNCEKİ AÇIKLAMA","YENİ AÇIKLAMA","ÖNCEKİ DURUM","SONRAKİ DURUM","ÖNCEKİ ÖDEME GÜNÜ","SONRAKİ ÖDEME GÜNÜ","DEĞİŞEN İŞ ALANI SAYISI"],
                [10,26,38,20,30,95,95,85,85,22,22,24,24,24],
                chronological.map((r,i)=>[i+1,dateText(r.islem_tarihi),firmOf(r),typeLabel(typeOf(r)),userOf(r),eventSummary(r),eventNote(r),
                    typeOf(r)==="GUNCELLEME" && r.eski_veri?.aciklama!==r.yeni_veri?.aciklama ? display(r.eski_veri?.aciklama) : "",
                    typeOf(r)==="GUNCELLEME" && r.eski_veri?.aciklama!==r.yeni_veri?.aciklama ? display(r.yeni_veri?.aciklama) : "",
                    display(r.eski_veri?.durum),display(r.yeni_veri?.durum),dateOnly(r.eski_veri?.odeme_gunu),dateOnly(r.yeni_veri?.odeme_gunu),businessChanges(r).length]),
                {tab:C.blue});
            const diffs=chronological.filter(r=>typeOf(r)==="GUNCELLEME").flatMap(r=>
                businessChanges(r).map(c=>[dateText(r.islem_tarihi),firmOf(r),userOf(r),pretty(c.field),display(c.old),display(c.next),
                    c.field==="aciklama" ? "Açıklamayı bu kullanıcı değiştirdi" : eventSummary(r)]));
            createSheet("03 Alan Değişiklikleri","Sadece gerçek güncellemeler • Teknik ID alanları ve ilk ekleme alanları gösterilmez",
                ["GÜNCELLEME TARİHİ / SAATİ","FİRMA","GÜNCELLEYEN KULLANICI","DEĞİŞEN ALAN","ESKİ DEĞER","YENİ DEĞER","DEĞİŞİKLİK AÇIKLAMASI"],
                [27,39,31,35,100,100,92],diffs,{tab:C.amber});
            const analysis = source => {
                const map=new Map();
                chronological.forEach(r=>{
                    const key=source==="user"?userOf(r):firmOf(r);
                    if(!map.has(key)) map.set(key,{name:key,add:0,edit:0,del:0,events:[],notes:[],last:""});
                    const a=map.get(key),kind=typeOf(r);
                    if(kind==="EKLEME")a.add++;
                    if(kind==="GUNCELLEME")a.edit++;
                    if(kind==="SILME")a.del++;
                    a.last=r.islem_tarihi;
                    a.events.push(`${dateText(r.islem_tarihi)} — ${userOf(r)} ${typeLabel(kind).toLocaleLowerCase("tr-TR")}: ${firmOf(r)}`);
                    if(eventNote(r)) a.notes.push(`${dateText(r.islem_tarihi)} — ${userOf(r)}: ${eventNote(r)}`);
                });
                return [...map.values()].sort((a,b)=>b.events.length-a.events.length).map(a=>[a.name,a.events.length,a.add,a.edit,a.del,dateText(a.last),a.events.join("\n"),a.notes.join("\n")]);
            };
            createSheet("04 Kullanıcı Analizi","İşlem yapan kişi • Tarih-saat sıralı işlem akışı ve kendisinin yazdığı açıklamalar",
                ["KULLANICI","TOPLAM","OLUŞTURMA","GÜNCELLEME","SİLME","SON İŞLEM TARİHİ / SAATİ","KRONOLOJİK İŞLEM AKIŞI","KULLANICININ YAZDIĞI AÇIKLAMALAR"],
                [36,14,17,17,14,27,120,120],analysis("user"),{tab:C.purple});
            createSheet("05 Firma Analizi","Firma bazında olay sırası • Açıklamalar tarih ve kullanıcıyla birlikte",
                ["FİRMA","TOPLAM","OLUŞTURMA","GÜNCELLEME","SİLME","SON İŞLEM TARİHİ / SAATİ","KRONOLOJİK İŞLEM AKIŞI","AÇIKLAMA GEÇMİŞİ"],
                [42,14,17,17,14,27,120,120],analysis("firm"),{tab:C.green});
            const archivedFields=orderedFields.filter(f=>!technicalFields.has(f));
            createSheet("06 Tam Veri Arşivi","İşlem öncesi ve sonrası iş verileri • Kimlik ve teknik ID alanları gizli",
                ["TARİH / SAAT","FİRMA","İŞLEM","KULLANICI","İŞLEM ÖZETİ",...archivedFields.map(f=>"ÖNCE • "+pretty(f)),...archivedFields.map(f=>"SONRA • "+pretty(f))],
                [26,38,20,30,85,...archivedFields.map(f=>f==="aciklama"?100:27),...archivedFields.map(f=>f==="aciklama"?100:27)],
                chronological.map(r=>[dateText(r.islem_tarihi),firmOf(r),typeLabel(typeOf(r)),userOf(r),eventSummary(r),...archivedFields.map(f=>display(r.eski_veri?.[f])),...archivedFields.map(f=>display(r.yeni_veri?.[f]))]),
                {tab:C.navy2});
            const output = await workbook.xlsx.writeBuffer();
            const blob = new Blob([output],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href=url;
            link.download=`Tahakkuk_Kronolojik_Detayli_Rapor_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(()=>URL.revokeObjectURL(url),60000);
        } catch (error) {
            console.error("Excel raporu oluşturulamadı",error);
            alert("Detaylı Excel raporu oluşturulamadı: " + error.message);
        }
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
                {/* Ayrıntılı tahakkuk işlem geçmişi: diğer ekranların görünümü korunur. */}
                <AnimatePresence>
                    {historyOpen && (
                        <div className="fixed inset-0 z-[12000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-5">
                            <motion.div initial={{ opacity: 0, scale: .97, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
                                className="w-full max-w-7xl max-h-[96vh] overflow-hidden flex flex-col rounded-[26px] bg-slate-50 dark:bg-[#101827] border border-slate-200 dark:border-white/10 shadow-2xl">
                                <div className="shrink-0 bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-700 p-5 sm:p-6 text-white">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-white/15"><History size={25}/></div>
                                            <div><h2 className="text-xl sm:text-2xl font-black">Tahakkuk İşlem Geçmişi</h2>
                                                <p className="text-xs sm:text-sm text-blue-100 mt-1">{historyFirm?.tedarikci_firma || "Tüm firmalar"} · Kayıt ve değişiklik takip merkezi</p></div>
                                        </div>
                                        <button onClick={() => setHistoryOpen(false)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20" aria-label="Kapat"><X size={21}/></button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5">
                                        {[["Toplam işlem",historyRows.length,"bg-white/15"],["Ekleme",historyCount("EKLEME"),"bg-emerald-400/20"],["Güncelleme",historyCount("GUNCELLEME"),"bg-amber-300/20"],["Silme",historyCount("SILME"),"bg-rose-400/20"]].map(([label,count,color]) => (
                                            <div key={label} className={`rounded-2xl p-3 sm:p-4 border border-white/15 ${color}`}><div className="text-xs text-white/80 font-semibold">{label}</div><div className="text-2xl sm:text-3xl font-black mt-1">{count}</div></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="shrink-0 p-3 sm:p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#111927]">
                                    <div className="flex flex-wrap gap-2">
                                        <div className="flex-1 min-w-[200px] relative"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/>
                                            <input className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0c1422] text-slate-900 dark:text-white pl-10 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500" placeholder="Firma, kişi, açıklama veya değişiklik ara..." value={historyQuery} onChange={e => setHistoryQuery(e.target.value)}/>
                                        </div>
                                        <select aria-label="İşlem türü" className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0c1422] text-slate-900 dark:text-white px-3 py-3 text-sm" value={historyType} onChange={e => setHistoryType(e.target.value)}>
                                            <option value="all">Tüm işlemler</option><option value="EKLEME">Eklemeler</option><option value="GUNCELLEME">Güncellemeler</option><option value="SILME">Silmeler</option>
                                        </select>
                                        <select aria-label="Kullanıcı" className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0c1422] text-slate-900 dark:text-white px-3 py-3 text-sm max-w-[230px]" value={historyUser} onChange={e => setHistoryUser(e.target.value)}>
                                            <option value="all">Tüm kullanıcılar</option>{historyUsers.map(name => <option key={name} value={name}>{name}</option>)}
                                        </select>
                                        <button onClick={() => loadHistory(historyFirm).catch(() => {})} disabled={historyLoading} className="rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-3 font-bold text-sm text-white">{historyLoading ? "Yükleniyor..." : "↻ Yenile"}</button>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">{filteredHistory.length} işlem görüntüleniyor · Kullanıcı isimleri kayıt verisinden gelir; doğrulanmış oturum kimliği yerine geçmez.</p>
                                </div>
                                <div className="overflow-y-auto flex-1 p-3 sm:p-5 space-y-3">
                                    {historyLoading && <p className="p-5 text-slate-500">Geçmiş yükleniyor...</p>}
                                    {historyError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{historyError}</p>}
                                    {!historyLoading && !historyError && filteredHistory.length === 0 && <p className="p-8 text-center text-slate-500">Arama veya filtreye uygun işlem bulunamadı.</p>}
                                    {!historyLoading && !historyError && filteredHistory.map(r => {
                                        const kind = historyKind(r);
                                        const details = historyChanges(r);
                                        const expanded = Boolean(expandedHistory[r.id]);
                                        const before = r.eski_veri || {};
                                        const after = r.yeni_veri || {};
                                        const note = kind === "SILME" ? before.aciklama : after.aciklama;
                                        const noteBefore = before.aciklama;
                                        const noteAfter = after.aciklama;
                                        const color = kind === "EKLEME" ? "emerald" : kind === "SILME" ? "rose" : "amber";
                                        const accent = {emerald:"border-l-emerald-500",rose:"border-l-rose-500",amber:"border-l-amber-500"}[color];
                                        const badge = {emerald:"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",rose:"bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",amber:"bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}[color];
                                        return <article key={r.id} className={`rounded-2xl border border-l-4 ${accent} border-slate-200 dark:border-white/10 bg-white dark:bg-[#172235] shadow-sm overflow-hidden`}>
                                            <div className="p-4 sm:p-5">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1"><div className="flex items-center flex-wrap gap-2"><span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${badge}`}>{kind === "GUNCELLEME" ? "DÜZENLEME" : kind}</span>
                                                        <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white break-words">{r.firma_adi || after.tedarikci_firma || before.tedarikci_firma || "Firma bilinmiyor"}</h3></div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 dark:text-slate-300"><span>👤 <strong>{r.kullanici_adi || "Kullanıcı belirtilmemiş"}</strong></span><span>🕒 {formatTR(r.islem_tarihi, true)}</span></div>
                                                    </div>
                                                    <button onClick={() => setExpandedHistory(prev => ({...prev,[r.id]:!prev[r.id]}))} className="shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 px-3 py-2 text-xs font-black hover:bg-indigo-100 dark:hover:bg-indigo-500/25">{expanded ? "Detayı gizle ▲" : `Tüm detaylar (${details.length}) ▼`}</button>
                                                </div>
                                                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-[#0d1726] p-3 border border-slate-100 dark:border-white/5">
                                                    <p className="text-[11px] font-black tracking-wide text-slate-500 dark:text-slate-400 uppercase mb-1">Kullanıcı açıklaması</p>
                                                    <p className="text-sm whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">{historyValue(note)}</p>
                                                </div>
                                                {r.aciklama && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-words">İşlem notu: {r.aciklama}</p>}
                                                <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-600 dark:text-slate-300">
                                                    {(after.odeme_gunu || before.odeme_gunu) && <span className="rounded-lg bg-slate-100 dark:bg-white/5 px-3 py-2">📅 Ödeme: <b>{formatTR(after.odeme_gunu || before.odeme_gunu)}</b></span>}
                                                    {(after.durum || before.durum) && <span className="rounded-lg bg-slate-100 dark:bg-white/5 px-3 py-2">Durum: <b>{STATUS_MAP[after.durum || before.durum]?.label || after.durum || before.durum}</b></span>}
                                                    {(after.tarih || before.tarih) && <span className="rounded-lg bg-slate-100 dark:bg-white/5 px-3 py-2">Tahakkuk: <b>{formatTR(after.tarih || before.tarih)}</b></span>}
                                                </div>
                                            </div>
                                            {expanded && <div className="border-t border-slate-200 dark:border-white/10 p-4 sm:p-5 bg-slate-50/80 dark:bg-[#111b2b]">
                                                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-3">{kind === "EKLEME" ? "Oluşturulan kaydın tüm alanları" : kind === "SILME" ? "Silinmeden önceki kayıt" : "Değişen alanlar: önce / sonra"}</h4>
                                                {noteBefore !== undefined && noteAfter !== undefined && historyValue(noteBefore) !== historyValue(noteAfter) && <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2"><div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3"><div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-1">Eski açıklama</div><div className="whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{historyValue(noteBefore)}</div></div><div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3"><div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">Yeni açıklama</div><div className="whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{historyValue(noteAfter)}</div></div></div>}
                                                {details.length === 0 ? <p className="text-sm text-slate-500">Alan detayı kayıtlı değil.</p> : <div className="space-y-2">{details.map(({field,old,next}) => <div key={field} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172235] p-3"><div className="text-xs font-black text-indigo-600 dark:text-indigo-300 mb-2">{HISTORY_FIELDS[field] || field}</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm"><div className="min-w-0"><div className="text-[10px] uppercase text-slate-500 font-bold mb-1">{kind === "EKLEME" ? "Öncesi" : "Eski değer"}</div><div className="whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">{historyValue(old)}</div></div><div className="min-w-0"><div className="text-[10px] uppercase text-slate-500 font-bold mb-1">{kind === "SILME" ? "Silme sonrası" : "Yeni değer"}</div><div className="whitespace-pre-wrap break-words font-semibold text-slate-900 dark:text-white">{historyValue(next)}</div></div></div></div>)}</div>}
                                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 break-all">İşlem ID: {r.id} · Tahakkuk ID: {r.tahakkuk_id || "—"} · {r.kullanici_id ? `Oturum kimliği kaydı: ${r.kullanici_id} (ayrıca doğrulanmalı)` : "Doğrulanmış oturum kimliği kaydedilmemiş"}</div>
                                            </div>}
                                        </article>;
                                    })}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

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
                            onClick={() => openHistory()}
                            className="h-11 px-4 rounded-xl font-black text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center gap-2"
                        ><History size={16} /> İŞLEM GEÇMİŞİ</button>

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
                                    onClick={() => openHistory(r)}
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