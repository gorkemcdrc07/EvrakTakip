import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Select from "react-select";
import {
    FiFilter,
    FiDownload,
    FiRotateCcw,
    FiSearch,
    FiEdit2,
    FiX,
    FiCalendar,
    FiTruck,
    FiFileText,
    FiPackage,
    FiUsers,
    FiCopy,
    FiCheck,
} from "react-icons/fi";

function cx(...c) { return c.filter(Boolean).join(" "); }

function splitCodes(str) {
    return String(str || "")
        .split("-")
        .map((s) => s.trim())
        .filter(Boolean);
}

function Toast({ show, type = "success", text }) {
    if (!show) return null;
    const cls =
        type === "success"
            ? "bg-emerald-600 text-white"
            : type === "error"
                ? "bg-rose-600 text-white"
                : "bg-gray-900 text-white";

    return (
        <div className="fixed right-5 top-5 z-[80]">
            <div className={cx("rounded-2xl px-4 py-3 shadow-2xl", cls, "animate-[toast_.18s_ease-out]")}>
                <div className="text-sm font-semibold">{text}</div>
            </div>
            <style>{`@keyframes toast{0%{transform:translateY(-10px);opacity:0}100%{transform:none;opacity:1}}`}</style>
        </div>
    );
}

function Pill({ tone = "neutral", children }) {
    const tones = {
        neutral: "bg-black/5 text-gray-800 dark:bg-white/10 dark:text-white border border-black/10 dark:border-white/10",
        ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200 border border-emerald-200/70 dark:border-emerald-800/40",
        warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/25 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800/40",
        info: "bg-sky-100 text-sky-800 dark:bg-sky-900/25 dark:text-sky-200 border border-sky-200/70 dark:border-sky-800/40",
        pink: "bg-pink-100 text-pink-800 dark:bg-pink-900/25 dark:text-pink-200 border border-pink-200/70 dark:border-pink-800/40",
    };
    return (
        <span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold", tones[tone])}>
            {children}
        </span>
    );
}

function StatCard({ icon, title, value, tone = "pink" }) {
    const tones = {
        pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/35 dark:text-pink-200",
        indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-200",
        emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
    };
    return (
        <div className="rounded-3xl bg-white/70 dark:bg-gray-900/55 border border-black/10 dark:border-white/10 backdrop-blur-2xl shadow-sm p-4">
            <div className="flex items-center gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", tones[tone])}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{title}</div>
                    <div className="text-xl font-extrabold tracking-tight">{value}</div>
                </div>
            </div>
        </div>
    );
}

function ModalShell({ title, onClose, children, footer }) {
    return (
        <div className="fixed inset-0 z-50 grid place-items-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-[min(96vw,920px)] rounded-3xl bg-white/90 dark:bg-gray-900/85 border border-black/10 dark:border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                    <div className="text-base font-bold">{title}</div>
                    <button
                        onClick={onClose}
                        className="h-10 w-10 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 grid place-items-center"
                        aria-label="Kapat"
                    >
                        <FiX />
                    </button>
                </div>
                <div className="p-5">{children}</div>
                {footer && <div className="px-5 py-4 border-t border-black/5 dark:border-white/10">{footer}</div>}
            </div>
        </div>
    );
}

const rsStyles = (isDark) => ({
    control: (base, state) => ({
        ...base,
        borderRadius: 16,
        minHeight: 44,
        borderColor: state.isFocused ? (isDark ? "rgba(236,72,153,.5)" : "rgba(236,72,153,.5)") : (isDark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.10)"),
        backgroundColor: isDark ? "rgba(17,24,39,.55)" : "rgba(255,255,255,.75)",
        boxShadow: state.isFocused ? "0 0 0 4px rgba(236,72,153,.18)" : "none",
        ":hover": { borderColor: "rgba(236,72,153,.5)" },
    }),
    menu: (base) => ({
        ...base,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: isDark ? "rgba(17,24,39,.95)" : "white",
        border: isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(0,0,0,.08)",
        boxShadow: "0 16px 40px rgba(0,0,0,.18)",
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? "rgba(236,72,153,.18)"
            : state.isFocused
                ? (isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.04)")
                : "transparent",
        color: isDark ? "white" : "#111827",
        padding: "10px 12px",
    }),
    multiValue: (base) => ({
        ...base,
        borderRadius: 999,
        backgroundColor: isDark ? "rgba(236,72,153,.18)" : "rgba(236,72,153,.12)",
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: isDark ? "rgba(255,255,255,.92)" : "#111827",
        fontWeight: 700,
    }),
    multiValueRemove: (base) => ({
        ...base,
        borderRadius: 999,
        ":hover": { backgroundColor: "rgba(244,63,94,.18)", color: isDark ? "white" : "#111827" },
    }),
    input: (base) => ({ ...base, color: isDark ? "white" : "#111827" }),
    singleValue: (base) => ({ ...base, color: isDark ? "white" : "#111827" }),
    placeholder: (base) => ({ ...base, color: isDark ? "rgba(255,255,255,.55)" : "rgba(17,24,39,.45)" }),
});

function TumKargoBilgileri() {
    const [veriler, setVeriler] = useState([]);
    const [filteredVeriler, setFilteredVeriler] = useState([]);
    const [loading, setLoading] = useState(true);

    const [tarihBaslangic, setTarihBaslangic] = useState("");
    const [tarihBitis, setTarihBitis] = useState("");
    const [yilSecenekleri, setYilSecenekleri] = useState([]);
    const [secilenYil, setSecilenYil] = useState("");

    const [irsaliyeOptions, setIrsaliyeOptions] = useState([]);
    const [kargoOptions, setKargoOptions] = useState([]);
    const [gonderenOptions, setGonderenOptions] = useState([]);

    const [selectedIrsaliye, setSelectedIrsaliye] = useState([]);
    const [selectedKargo, setSelectedKargo] = useState([]);
    const [selectedGonderen, setSelectedGonderen] = useState([]);

    const [modalIcerik, setModalIcerik] = useState("");
    const [modalBaslik, setModalBaslik] = useState("");
    const [modalGoster, setModalGoster] = useState(false);
    const [excelModalAcik, setExcelModalAcik] = useState(false);

    const [duzenlenenVeri, setDuzenlenenVeri] = useState(null);
    const [duzenleModalAcik, setDuzenleModalAcik] = useState(false);

    const [ekstraVar, setEkstraVar] = useState(false);
    const [ekstraEvrakSayisi, setEkstraEvrakSayisi] = useState("");

    const [irsaliyeNoInput, setIrsaliyeNoInput] = useState("");
    const [quickSearch, setQuickSearch] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(true);

    const [toast, setToast] = useState({ show: false, type: "success", text: "" });
    const toastRef = useRef(null);

    const isDark = useMemo(() => {
        // basit bir yaklaşım: root'ta dark class var mı?
        return document?.documentElement?.classList?.contains("dark");
    }, [typeof window !== "undefined" ? window?.location?.pathname : ""]);

    const showToast = (type, text) => {
        if (toastRef.current) clearTimeout(toastRef.current);
        setToast({ show: true, type, text });
        toastRef.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
    };

    const getYil = (tarih) => {
        if (!tarih) return "";
        const date = new Date(tarih);
        return isNaN(date) ? "" : String(date.getFullYear());
    };

    const veriGetir = async (year = "2025") => {
        setLoading(true);
        const pageSize = 1000;
        let from = 0;
        let to = pageSize - 1;
        let hasMore = true;
        let allData = [];

        const start = `${year}-01-01`;
        const end = `${year}-12-31`;

        while (hasMore) {
            const { data, error } = await supabase
                .from("kargo_bilgileri")
                .select("*")
                .order("id", { ascending: false })
                .range(from, to)
                .gte("tarih", start)
                .lte("tarih", end);

            if (error) {
                console.error("Veri çekme hatası:", error);
                showToast("error", "Veri çekme hatası.");
                break;
            }

            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += pageSize;
                to += pageSize;
                hasMore = data.length === pageSize;
            } else {
                hasMore = false;
            }
        }

        setVeriler(allData);
        setFilteredVeriler(allData);

        const irsaliyeSet = [...new Set(allData.map((v) => v.irsaliye_adi).filter(Boolean))];
        const kargoSet = [...new Set(allData.map((v) => v.kargo_firmasi).filter(Boolean))];
        const gonderenSet = [...new Set(allData.map((v) => v.gonderen_firma).filter(Boolean))];

        setIrsaliyeOptions(irsaliyeSet.map((v) => ({ label: v, value: v })));
        setKargoOptions(kargoSet.map((v) => ({ label: v, value: v })));
        setGonderenOptions(gonderenSet.map((v) => ({ label: v, value: v })));

        setLoading(false);
    };

    useEffect(() => {
        veriGetir("2025");
        const current = new Date().getFullYear();
        const years = [];
        for (let y = current; y >= 2020; y--) years.push(String(y));
        setYilSecenekleri(years);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (secilenYil) veriGetir(secilenYil);
        else veriGetir("2025");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secilenYil]);

    const tarihFormatla = (tarihStr) => {
        const tarih = new Date(tarihStr);
        return isNaN(tarih) ? "" : tarih.toLocaleDateString("tr-TR");
    };

    const kisalt = (metin, limit = 34) =>
        metin?.length > limit ? metin.slice(0, limit) + "…" : metin;

    const modalAc = (baslik, icerik) => {
        setModalBaslik(baslik);
        setModalIcerik(icerik || "");
        setModalGoster(true);
    };

    const filtrele = () => {
        let filtrelenmis = [...veriler];

        if (secilenYil) filtrelenmis = filtrelenmis.filter((v) => getYil(v.tarih) === secilenYil);
        if (tarihBaslangic) filtrelenmis = filtrelenmis.filter((v) => new Date(v.tarih) >= new Date(tarihBaslangic));
        if (tarihBitis) filtrelenmis = filtrelenmis.filter((v) => new Date(v.tarih) <= new Date(tarihBitis));

        if (selectedIrsaliye.length > 0) {
            const secilen = selectedIrsaliye.map((o) => o.value.toLowerCase());
            filtrelenmis = filtrelenmis.filter((v) => secilen.includes(v.irsaliye_adi?.toLowerCase()));
        }
        if (selectedKargo.length > 0) {
            const secilen = selectedKargo.map((o) => o.value.toLowerCase());
            filtrelenmis = filtrelenmis.filter((v) => secilen.includes(v.kargo_firmasi?.toLowerCase()));
        }
        if (selectedGonderen.length > 0) {
            const secilen = selectedGonderen.map((o) => o.value.toLowerCase());
            filtrelenmis = filtrelenmis.filter((v) => secilen.includes(v.gonderen_firma?.toLowerCase()));
        }
        if (irsaliyeNoInput.trim() !== "") {
            const aranan = irsaliyeNoInput.trim().toLowerCase();
            filtrelenmis = filtrelenmis.filter((v) => (v.irsaliye_no || "").toLowerCase().includes(aranan));
        }

        // ✅ Quick search (çok işe yarar)
        if (quickSearch.trim() !== "") {
            const q = quickSearch.trim().toLowerCase();
            filtrelenmis = filtrelenmis.filter((v) => {
                const fields = [
                    v.kargo_firmasi,
                    v.gonderi_numarasi,
                    v.gonderen_firma,
                    v.irsaliye_adi,
                    v.irsaliye_no,
                    v.odak_evrak_no,
                ].map((x) => String(x || "").toLowerCase());
                return fields.some((f) => f.includes(q));
            });
        }

        setFilteredVeriler(filtrelenmis);
    };

    useEffect(() => {
        if (!loading) filtrele();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        veriler,
        secilenYil,
        tarihBaslangic,
        tarihBitis,
        selectedIrsaliye,
        selectedKargo,
        selectedGonderen,
        irsaliyeNoInput,
        quickSearch,
        loading,
    ]);

    const hasActiveFilters = useMemo(() => {
        return (
            !!secilenYil ||
            !!tarihBaslangic ||
            !!tarihBitis ||
            selectedIrsaliye.length > 0 ||
            selectedKargo.length > 0 ||
            selectedGonderen.length > 0 ||
            irsaliyeNoInput.trim() !== "" ||
            quickSearch.trim() !== ""
        );
    }, [
        secilenYil,
        tarihBaslangic,
        tarihBitis,
        selectedIrsaliye,
        selectedKargo,
        selectedGonderen,
        irsaliyeNoInput,
        quickSearch,
    ]);

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (secilenYil) n++;
        if (tarihBaslangic) n++;
        if (tarihBitis) n++;
        if (selectedIrsaliye.length) n++;
        if (selectedKargo.length) n++;
        if (selectedGonderen.length) n++;
        if (irsaliyeNoInput.trim()) n++;
        if (quickSearch.trim()) n++;
        return n;
    }, [secilenYil, tarihBaslangic, tarihBitis, selectedIrsaliye, selectedKargo, selectedGonderen, irsaliyeNoInput, quickSearch]);

    const filtreleriTemizle = () => {
        setSecilenYil("");
        setTarihBaslangic("");
        setTarihBitis("");
        setSelectedIrsaliye([]);
        setSelectedKargo([]);
        setSelectedGonderen([]);
        setIrsaliyeNoInput("");
        setQuickSearch("");
        setFilteredVeriler(veriler);
    };

    const excelAktarVeri = (veri, tur) => {
        const aktarilacak = veri.map((item) => ({
            Tarih: tarihFormatla(item.tarih),
            "Kargo Firması": item.kargo_firmasi,
            "Gönderi No": item.gonderi_numarasi,
            "Gönderen Firma": item.gonderen_firma,
            "İrsaliye Adı": item.irsaliye_adi,
            "İrsaliye No": item.irsaliye_no,
            "Odak Evrak No": item.odak_evrak_no,
            "Evrak Adedi": item.evrak_adedi,
        }));

        const worksheet = XLSX.utils.json_to_sheet(aktarilacak);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Kargo Verileri");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `kargo_bilgileri_${tur}.xlsx`);
    };

    const tumVeriyiExceleAktar = async () => {
        const year = secilenYil || "2025";
        const pageSize = 1000;
        let allData = [];
        let from = 0;
        let to = pageSize - 1;
        let hasMore = true;

        const start = `${year}-01-01`;
        const end = `${year}-12-31`;

        while (hasMore) {
            const { data, error } = await supabase
                .from("kargo_bilgileri")
                .select("*")
                .gte("tarih", start)
                .lte("tarih", end)
                .range(from, to);

            if (error) {
                console.error("Veri çekme hatası:", error);
                showToast("error", "Excel için veri çekme hatası.");
                break;
            }
            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += pageSize;
                to += pageSize;
                hasMore = data.length === pageSize;
            } else {
                hasMore = false;
            }
        }

        excelAktarVeri(allData, `yil_${year}`);
        setExcelModalAcik(false);
        showToast("success", "Excel indirildi.");
    };

    const duzenleModaliAc = (veri) => {
        setDuzenlenenVeri({ ...veri });
        setDuzenleModalAcik(true);
        setEkstraEvrakSayisi("");
        setEkstraVar(false);
    };

    const handleDuzenleInputChange = (e) => {
        const { name, value } = e.target;
        setDuzenlenenVeri((prev) => ({ ...prev, [name]: value }));
    };

    const duzenleEvrakAdedi = useMemo(() => {
        if (!duzenlenenVeri) return 0;
        const irs = splitCodes(duzenlenenVeri.irsaliye_no).length;
        const odak = splitCodes(duzenlenenVeri.odak_evrak_no).length;
        const ekstra = ekstraVar ? (parseInt(ekstraEvrakSayisi, 10) || 0) : 0;
        return irs + odak + ekstra;
    }, [duzenlenenVeri, ekstraVar, ekstraEvrakSayisi]);

    const duzenleVeriyiGuncelle = async () => {
        const {
            id,
            tarih,
            kargo_firmasi,
            gonderi_numarasi,
            gonderen_firma,
            irsaliye_adi,
            irsaliye_no,
            odak_evrak_no,
        } = duzenlenenVeri;

        const { error } = await supabase
            .from("kargo_bilgileri")
            .update({
                tarih,
                kargo_firmasi,
                gonderi_numarasi,
                gonderen_firma,
                irsaliye_adi,
                irsaliye_no,
                odak_evrak_no,
                evrak_adedi: duzenleEvrakAdedi,
            })
            .eq("id", id);

        if (!error) {
            setVeriler((prev) => prev.map((v) => (v.id === id ? { ...duzenlenenVeri, evrak_adedi: duzenleEvrakAdedi } : v)));
            setDuzenleModalAcik(false);
            showToast("success", "✅ Güncellendi.");
        } else {
            showToast("error", "❌ Güncelleme başarısız.");
        }
    };

    const duzenleVeriyiSil = async () => {
        if (!window.confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;

        const { error } = await supabase
            .from("kargo_bilgileri")
            .delete()
            .eq("id", duzenlenenVeri.id);

        if (!error) {
            setVeriler((prev) => prev.filter((v) => v.id !== duzenlenenVeri.id));
            setDuzenleModalAcik(false);
            showToast("success", "🗑️ Kayıt silindi.");
        } else {
            showToast("error", "❌ Silme başarısız.");
        }
    };

    // KPI
    const toplamKayit = veriler.length;
    const toplamFiltreli = filteredVeriler.length;
    const toplamEvrak = useMemo(
        () => filteredVeriler.reduce((sum, v) => sum + (parseInt(v.evrak_adedi, 10) || 0), 0),
        [filteredVeriler]
    );

    // Aktif filtre chipleri
    const activeChips = useMemo(() => {
        const chips = [];
        if (secilenYil) chips.push({ k: "yil", label: `Yıl: ${secilenYil}`, clear: () => setSecilenYil("") });
        if (tarihBaslangic) chips.push({ k: "tb", label: `Başlangıç: ${tarihBaslangic}`, clear: () => setTarihBaslangic("") });
        if (tarihBitis) chips.push({ k: "tt", label: `Bitiş: ${tarihBitis}`, clear: () => setTarihBitis("") });
        if (selectedIrsaliye.length) chips.push({ k: "ia", label: `İrsaliye Adı: ${selectedIrsaliye.length}`, clear: () => setSelectedIrsaliye([]) });
        if (selectedKargo.length) chips.push({ k: "kf", label: `Kargo: ${selectedKargo.length}`, clear: () => setSelectedKargo([]) });
        if (selectedGonderen.length) chips.push({ k: "gf", label: `Gönderen: ${selectedGonderen.length}`, clear: () => setSelectedGonderen([]) });
        if (irsaliyeNoInput.trim()) chips.push({ k: "ino", label: `İrsaliye No: "${irsaliyeNoInput.trim()}"`, clear: () => setIrsaliyeNoInput("") });
        if (quickSearch.trim()) chips.push({ k: "qs", label: `Arama: "${quickSearch.trim()}"`, clear: () => setQuickSearch("") });
        return chips;
    }, [secilenYil, tarihBaslangic, tarihBitis, selectedIrsaliye, selectedKargo, selectedGonderen, irsaliyeNoInput, quickSearch]);

    // Copy helper
    const [copied, setCopied] = useState(false);
    const copyToClipboard = async (txt) => {
        try {
            await navigator.clipboard.writeText(txt || "");
            setCopied(true);
            showToast("success", "Kopyalandı.");
            setTimeout(() => setCopied(false), 900);
        } catch {
            showToast("error", "Kopyalama başarısız.");
        }
    };

    return (
        <Layout>
            <Toast show={toast.show} type={toast.type} text={toast.text} />

            {/* subtle background */}
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-400/25 via-fuchsia-400/20 to-indigo-400/25 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/10 blur-3xl" />
            </div>

            <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 text-gray-900 transition-colors duration-300 dark:text-white">
                {/* Sticky topbar */}
                <div className="sticky top-0 z-20 mb-5 rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-gray-900/55 backdrop-blur-2xl shadow-sm">
                    <div className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-pink-600 dark:text-pink-300">
                                    📋 Tüm Kargo Bilgileri
                                </h1>
                                <Pill tone={hasActiveFilters ? "pink" : "neutral"}>
                                    {hasActiveFilters ? `Filtre: ${activeFilterCount}` : "Filtre yok"}
                                </Pill>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Filtrele • Hızlı ara • Düzenle • Excel’e aktar
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    value={quickSearch}
                                    onChange={(e) => setQuickSearch(e.target.value)}
                                    placeholder="Hızlı arama… (firma/no/gönderen/irsaliye/odak)"
                                    className="w-[min(92vw,420px)] pl-10 pr-4 py-2.5 rounded-2xl
                    border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60
                    outline-none focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                />
                            </div>

                            <button
                                onClick={() => setExcelModalAcik(true)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-white font-semibold shadow-sm hover:opacity-95"
                            >
                                <FiDownload /> Excel
                            </button>

                            <button
                                onClick={filtreleriTemizle}
                                disabled={!hasActiveFilters}
                                className={cx(
                                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold",
                                    hasActiveFilters
                                        ? "bg-gray-900 text-white hover:opacity-90 dark:bg-white dark:text-gray-900"
                                        : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400"
                                )}
                                title="Filtreleri temizle"
                            >
                                <FiRotateCcw /> Temizle
                            </button>

                            <button
                                onClick={() => setFiltersOpen((v) => !v)}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold
                  border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                <FiFilter /> {filtersOpen ? "Filtreleri Kapat" : "Filtreleri Aç"}
                            </button>
                        </div>
                    </div>

                    {/* active filter chips */}
                    {hasActiveFilters && (
                        <div className="px-5 pb-4 flex flex-wrap gap-2">
                            {activeChips.map((c) => (
                                <button
                                    key={c.k}
                                    onClick={c.clear}
                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold
                    bg-pink-100 text-pink-800 border border-pink-200
                    dark:bg-pink-900/25 dark:text-pink-200 dark:border-pink-800/40 hover:opacity-90"
                                    title="Bu filtreyi kaldır"
                                >
                                    {c.label} <FiX />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* KPI */}
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard icon={<FiFileText />} title="Toplam Kayıt" value={toplamKayit.toLocaleString("tr-TR")} tone="pink" />
                    <StatCard icon={<FiSearch />} title="Filtreli Kayıt" value={toplamFiltreli.toLocaleString("tr-TR")} tone="indigo" />
                    <StatCard icon={<FiPackage />} title="Toplam Evrak" value={toplamEvrak.toLocaleString("tr-TR")} tone="emerald" />
                </div>

                {/* Filters */}
                {filtersOpen && (
                    <div className="mb-6 rounded-[28px] bg-white/70 dark:bg-gray-900/55 border border-black/10 dark:border-white/10 backdrop-blur-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold">
                                <FiFilter /> Filtreler
                            </div>
                            <Pill tone={hasActiveFilters ? "pink" : "neutral"}>{activeFilterCount} aktif</Pill>
                        </div>

                        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                    <FiCalendar className="inline" /> Yıl
                                </label>
                                <select
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                    value={secilenYil}
                                    onChange={(e) => setSecilenYil(e.target.value)}
                                >
                                    <option value="">Tüm Yıllar</option>
                                    {yilSecenekleri.map((yil) => (
                                        <option key={yil} value={yil}>
                                            {yil}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Tarih Başlangıç</label>
                                <input
                                    type="date"
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                    value={tarihBaslangic}
                                    onChange={(e) => setTarihBaslangic(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Tarih Bitiş</label>
                                <input
                                    type="date"
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                    value={tarihBitis}
                                    onChange={(e) => setTarihBitis(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">İrsaliye Adı</label>
                                <Select
                                    styles={rsStyles(isDark)}
                                    options={irsaliyeOptions}
                                    value={selectedIrsaliye}
                                    onChange={setSelectedIrsaliye}
                                    isMulti
                                    classNamePrefix="rs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                    <FiTruck className="inline" /> Kargo Firması
                                </label>
                                <Select
                                    styles={rsStyles(isDark)}
                                    options={kargoOptions}
                                    value={selectedKargo}
                                    onChange={setSelectedKargo}
                                    isMulti
                                    classNamePrefix="rs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                    <FiUsers className="inline" /> Gönderen Firma
                                </label>
                                <Select
                                    styles={rsStyles(isDark)}
                                    options={gonderenOptions}
                                    value={selectedGonderen}
                                    onChange={setSelectedGonderen}
                                    isMulti
                                    classNamePrefix="rs"
                                />
                            </div>

                            <div className="lg:col-span-3 space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">İrsaliye No (içerir)</label>
                                <input
                                    type="text"
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                    placeholder="İrsaliye No ara..."
                                    value={irsaliyeNoInput}
                                    onChange={(e) => setIrsaliyeNoInput(e.target.value)}
                                />
                            </div>

                            <div className="lg:col-span-3 flex flex-wrap gap-2 pt-1">
                                <button
                                    onClick={filtrele}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-2.5 text-white font-semibold shadow-sm hover:opacity-95"
                                >
                                    <FiSearch /> Uygula
                                </button>
                                <button
                                    onClick={filtreleriTemizle}
                                    disabled={!hasActiveFilters}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold",
                                        hasActiveFilters
                                            ? "bg-gray-900 text-white hover:opacity-90 dark:bg-white dark:text-gray-900"
                                            : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400"
                                    )}
                                >
                                    <FiRotateCcw /> Temizle
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data */}
                {loading ? (
                    <div className="rounded-[28px] bg-white/70 dark:bg-gray-900/55 border border-black/10 dark:border-white/10 backdrop-blur-2xl p-8 text-center text-gray-500 dark:text-gray-300 shadow-sm">
                        Yükleniyor…
                    </div>
                ) : filteredVeriler.length === 0 ? (
                    <div className="rounded-[28px] bg-white/70 dark:bg-gray-900/55 border border-black/10 dark:border-white/10 backdrop-blur-2xl p-8 text-center text-gray-500 dark:text-gray-300 shadow-sm">
                        Filtreye uyan veri yok.
                    </div>
                ) : (
                    <div className="rounded-[28px] bg-white/70 dark:bg-gray-900/55 border border-black/10 dark:border-white/10 backdrop-blur-2xl shadow-sm overflow-hidden">
                        <div className="max-h-[72vh] overflow-y-auto">
                            <table className="min-w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white">
                                    <tr>
                                        <Th>Tarih</Th>
                                        <Th>Kargo</Th>
                                        <Th>Gönderi No</Th>
                                        <Th>Gönderen</Th>
                                        <Th>İrsaliye Adı</Th>
                                        <Th>İrsaliye No</Th>
                                        <Th>Odak No</Th>
                                        <Th>Evrak</Th>
                                        <Th>İşlem</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVeriler.map((item, idx) => (
                                        <tr
                                            key={item.id ?? idx}
                                            className={cx(
                                                "border-t border-black/5 dark:border-white/10",
                                                idx % 2 === 0 ? "bg-white/40 dark:bg-white/5" : "bg-white/20 dark:bg-transparent",
                                                "hover:bg-pink-50/70 dark:hover:bg-white/5 transition"
                                            )}
                                        >
                                            <Td>{tarihFormatla(item.tarih)}</Td>
                                            <Td className="font-semibold">{item.kargo_firmasi}</Td>
                                            <Td>{item.gonderi_numarasi}</Td>
                                            <Td>{item.gonderen_firma}</Td>
                                            <Td>{item.irsaliye_adi}</Td>
                                            <TdLink onClick={() => modalAc("İrsaliye No", item.irsaliye_no)}>{kisalt(item.irsaliye_no)}</TdLink>
                                            <TdLink onClick={() => modalAc("Odak Evrak No", item.odak_evrak_no)}>{kisalt(item.odak_evrak_no)}</TdLink>
                                            <Td className="text-center font-extrabold">{item.evrak_adedi}</Td>
                                            <Td className="text-center">
                                                <button
                                                    onClick={() => duzenleModaliAc(item)}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-3 py-2 text-white font-semibold hover:opacity-90"
                                                >
                                                    <FiEdit2 /> Düzenle
                                                </button>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal - long text */}
                {modalGoster && (
                    <ModalShell
                        title={modalBaslik}
                        onClose={() => { setModalGoster(false); setModalBaslik(""); setModalIcerik(""); }}
                        footer={
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500 dark:text-gray-300">
                                    Uzun içerik • kopyalayabilirsiniz
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyToClipboard(modalIcerik)}
                                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold
                      bg-gray-900 text-white hover:opacity-90 dark:bg-white dark:text-gray-900"
                                    >
                                        {copied ? <FiCheck /> : <FiCopy />} Kopyala
                                    </button>
                                    <button
                                        onClick={() => { setModalGoster(false); setModalBaslik(""); setModalIcerik(""); }}
                                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        }
                    >
                        <pre className="max-h-[60vh] whitespace-pre-wrap break-words overflow-y-auto rounded-2xl bg-black/5 dark:bg-white/5 p-4 text-sm text-gray-900 dark:text-gray-100">
                            {modalIcerik || "—"}
                        </pre>
                    </ModalShell>
                )}

                {/* Modal - Excel */}
                {excelModalAcik && (
                    <ModalShell
                        title="Excel Aktarımı"
                        onClose={() => setExcelModalAcik(false)}
                        footer={
                            <div className="flex items-center justify-end">
                                <button
                                    onClick={() => setExcelModalAcik(false)}
                                    className="text-sm font-semibold text-gray-600 hover:underline dark:text-gray-300"
                                >
                                    Vazgeç
                                </button>
                            </div>
                        }
                    >
                        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
                            Hangi verileri Excel’e aktarmak istersiniz?
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <button
                                onClick={() => {
                                    excelAktarVeri(filteredVeriler, "filtreli");
                                    setExcelModalAcik(false);
                                    showToast("success", "Excel indirildi.");
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-semibold hover:opacity-95"
                            >
                                <FiDownload /> Filtreli Aktar
                            </button>
                            <button
                                onClick={tumVeriyiExceleAktar}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3 text-white font-semibold hover:opacity-95"
                            >
                                <FiDownload /> Tümünü Aktar
                            </button>
                        </div>
                    </ModalShell>
                )}

                {/* Modal - Edit */}
                {duzenleModalAcik && duzenlenenVeri && (
                    <ModalShell
                        title="Kargo Bilgisi Düzenle"
                        onClose={() => setDuzenleModalAcik(false)}
                        footer={
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                                <div className="flex gap-2">
                                    <button
                                        onClick={duzenleVeriyiGuncelle}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-white font-semibold hover:opacity-95"
                                    >
                                        Güncelle
                                    </button>
                                    <button
                                        onClick={duzenleVeriyiSil}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-white font-semibold hover:opacity-95"
                                    >
                                        Sil
                                    </button>
                                </div>
                                <button
                                    onClick={() => setDuzenleModalAcik(false)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    Vazgeç
                                </button>
                            </div>
                        }
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Tarih">
                                <input
                                    type="date"
                                    name="tarih"
                                    value={(duzenlenenVeri.tarih || "").slice(0, 10)}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                />
                            </Field>

                            <Field label="Kargo Firması">
                                <input
                                    name="kargo_firmasi"
                                    value={duzenlenenVeri.kargo_firmasi || ""}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                />
                            </Field>

                            <Field label="Gönderi No">
                                <input
                                    name="gonderi_numarasi"
                                    value={duzenlenenVeri.gonderi_numarasi || ""}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                />
                            </Field>

                            <Field label="Gönderen Firma">
                                <input
                                    name="gonderen_firma"
                                    value={duzenlenenVeri.gonderen_firma || ""}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                />
                            </Field>

                            <Field label="İrsaliye Adı">
                                <input
                                    name="irsaliye_adi"
                                    value={duzenlenenVeri.irsaliye_adi || ""}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="İrsaliye No">
                                    <textarea
                                        name="irsaliye_no"
                                        rows="2"
                                        value={duzenlenenVeri.irsaliye_no || ""}
                                        onChange={handleDuzenleInputChange}
                                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                      focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        <Pill tone="info">Adet: {splitCodes(duzenlenenVeri.irsaliye_no).length}</Pill>
                                    </div>
                                </Field>
                            </div>

                            <div className="sm:col-span-2">
                                <Field label="Odak Evrak No">
                                    <textarea
                                        name="odak_evrak_no"
                                        rows="2"
                                        value={duzenlenenVeri.odak_evrak_no || ""}
                                        onChange={handleDuzenleInputChange}
                                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                      focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        <Pill tone="info">Adet: {splitCodes(duzenlenenVeri.odak_evrak_no).length}</Pill>
                                    </div>
                                </Field>
                            </div>

                            {/* Ekstra switch */}
                            <div className="sm:col-span-2 rounded-3xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="font-bold">Ekstra evrak var mı?</div>
                                    <Switch checked={ekstraVar} onChange={setEkstraVar} />
                                </div>
                                {ekstraVar && (
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <Field label="Ekstra Evrak Sayısı">
                                            <input
                                                type="number"
                                                min="1"
                                                value={ekstraEvrakSayisi}
                                                onChange={(e) => setEkstraEvrakSayisi(e.target.value)}
                                                className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800/60 px-3 py-2.5 outline-none
                          focus:ring-4 focus:ring-pink-200/60 dark:focus:ring-pink-900/30"
                                            />
                                        </Field>

                                        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-gray-900/40 p-4">
                                            <div className="text-xs text-gray-500 dark:text-gray-300">Toplam Evrak (otomatik)</div>
                                            <div className="mt-1 text-2xl font-extrabold">{duzenleEvrakAdedi}</div>
                                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-300">İrsaliye + Odak + Ekstra</div>
                                        </div>
                                    </div>
                                )}

                                {!ekstraVar && (
                                    <div className="mt-3 text-sm">
                                        <span className="text-gray-600 dark:text-gray-300">Toplam Evrak (otomatik): </span>
                                        <b>{duzenleEvrakAdedi}</b>
                                    </div>
                                )}
                            </div>

                            {/* Evrak adedi (read only) */}
                            <Field label="Evrak Adedi (otomatik)" span>
                                <input
                                    readOnly
                                    value={duzenleEvrakAdedi}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 text-gray-900 dark:text-white font-extrabold"
                                />
                            </Field>
                        </div>
                    </ModalShell>
                )}
            </div>
        </Layout>
    );
}

function Th({ children }) {
    return <th className="px-4 py-3 text-center text-sm font-extrabold tracking-tight whitespace-nowrap">{children}</th>;
}
function Td({ children, className }) {
    return <td className={cx("px-4 py-3 text-center whitespace-nowrap", className)}>{children}</td>;
}
function TdLink({ children, onClick }) {
    return (
        <td
            className="px-4 py-3 text-center whitespace-nowrap text-blue-700 dark:text-blue-300 underline underline-offset-4 hover:opacity-80 cursor-pointer font-semibold"
            onClick={onClick}
        >
            {children || "—"}
        </td>
    );
}

function Field({ label, children, span }) {
    return (
        <div className={span ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300">{label}</label>
            {children}
        </div>
    );
}

function Switch({ checked, onChange }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={cx(
                "relative inline-flex h-8 w-14 items-center rounded-full transition border",
                checked
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-gray-200 border-gray-200 dark:bg-gray-700 dark:border-gray-700"
            )}
            aria-pressed={checked}
            title={checked ? "Açık" : "Kapalı"}
        >
            <span
                className={cx(
                    "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
                    checked ? "translate-x-7" : "translate-x-1"
                )}
            />
        </button>
    );
}

export default TumKargoBilgileri;
