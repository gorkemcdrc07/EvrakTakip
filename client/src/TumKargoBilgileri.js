import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
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

function cx(...c) {
    return c.filter(Boolean).join(" ");
}

function splitCodes(str) {
    return String(str || "")
        .split("-")
        .map((s) => s.trim())
        .filter(Boolean);
}

/** ✅ Dark mode tespiti (html class değişimini de yakalar) */
function useIsDark() {
    const [isDark, setIsDark] = useState(() =>
        document?.documentElement?.classList?.contains("dark")
    );

    useEffect(() => {
        const el = document.documentElement;
        const obs = new MutationObserver(() => {
            setIsDark(el.classList.contains("dark"));
        });
        obs.observe(el, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);

    return isDark;
}

function Toast({ show, type = "success", text }) {
    if (!show) return null;
    const cls =
        type === "success"
            ? "bg-emerald-600 text-white"
            : type === "error"
                ? "bg-rose-600 text-white"
                : "bg-zinc-950 text-white";

    return (
        <div className="fixed right-5 top-5 z-[80]">
            <div
                className={cx(
                    "rounded-2xl px-4 py-3 shadow-2xl",
                    cls,
                    "animate-[toast_.18s_ease-out]"
                )}
            >
                <div className="text-sm font-semibold">{text}</div>
            </div>
            <style>{`@keyframes toast{0%{transform:translateY(-10px);opacity:0}100%{transform:none;opacity:1}}`}</style>
        </div>
    );
}

function Pill({ tone = "neutral", children }) {
    const tones = {
        neutral:
            "bg-black/5 text-gray-800 dark:bg-white/10 dark:text-white border border-black/10 dark:border-white/10",
        purple:
            "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200 border border-violet-200/70 dark:border-violet-800/40",
    };
    return (
        <span
            className={cx(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold",
                tones[tone] || tones.neutral
            )}
        >
            {children}
        </span>
    );
}

function ModalShell({ title, onClose, children, footer }) {
    return (
        <div className="fixed inset-0 z-50 grid place-items-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />
            <div className="relative z-10 w-[min(96vw,920px)] rounded-3xl bg-white/90 dark:bg-zinc-950/85 border border-black/10 dark:border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                    <div className="text-base font-extrabold">{title}</div>
                    <button
                        onClick={onClose}
                        className="h-10 w-10 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 grid place-items-center"
                        aria-label="Kapat"
                    >
                        <FiX />
                    </button>
                </div>
                <div className="p-5">{children}</div>
                {footer && (
                    <div className="px-5 py-4 border-t border-black/5 dark:border-white/10">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

const rsStyles = (isDark) => ({
    control: (base, state) => ({
        ...base,
        borderRadius: 16,
        minHeight: 46,
        borderColor: state.isFocused
            ? "rgba(139,92,246,.55)"
            : isDark
                ? "rgba(255,255,255,.12)"
                : "rgba(0,0,0,.10)",
        backgroundColor: isDark ? "rgba(24,24,27,.55)" : "rgba(255,255,255,.80)", // zinc
        boxShadow: state.isFocused ? "0 0 0 4px rgba(139,92,246,.18)" : "none",
        ":hover": { borderColor: "rgba(139,92,246,.55)" },
    }),
    menu: (base) => ({
        ...base,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: isDark ? "rgba(9,9,11,.95)" : "white",
        border: isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(0,0,0,.08)",
        boxShadow: "0 16px 40px rgba(0,0,0,.22)",
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? "rgba(139,92,246,.18)"
            : state.isFocused
                ? isDark
                    ? "rgba(255,255,255,.06)"
                    : "rgba(0,0,0,.04)"
                : "transparent",
        color: isDark ? "white" : "#111827",
        padding: "10px 12px",
    }),
    multiValue: (base) => ({
        ...base,
        borderRadius: 999,
        backgroundColor: isDark ? "rgba(139,92,246,.18)" : "rgba(139,92,246,.12)",
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: isDark ? "rgba(255,255,255,.92)" : "#111827",
        fontWeight: 800,
    }),
    multiValueRemove: (base) => ({
        ...base,
        borderRadius: 999,
        ":hover": { backgroundColor: "rgba(244,63,94,.18)", color: isDark ? "white" : "#111827" },
    }),
    input: (base) => ({ ...base, color: isDark ? "white" : "#111827" }),
    singleValue: (base) => ({ ...base, color: isDark ? "white" : "#111827", fontWeight: 700 }),
    placeholder: (base) => ({
        ...base,
        color: isDark ? "rgba(255,255,255,.55)" : "rgba(17,24,39,.45)",
    }),
});

function MiniStat({ icon, label, value, tone = "purple" }) {
    const tones = {
        purple:
            "bg-violet-600/10 border-violet-500/20 text-violet-800 dark:text-violet-200",
        indigo:
            "bg-indigo-600/10 border-indigo-500/20 text-indigo-800 dark:text-indigo-200",
        emerald:
            "bg-emerald-600/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200",
    };
    return (
        <div className={cx("inline-flex items-center gap-2 rounded-2xl px-3 py-2 border", tones[tone])}>
            <span className="opacity-90">{icon}</span>
            <div className="leading-tight">
                <div className="text-[11px] font-extrabold opacity-70">{label}</div>
                <div className="text-sm font-extrabold">{value}</div>
            </div>
        </div>
    );
}

function GridSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
                <div
                    key={i}
                    className="h-14 rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 animate-pulse"
                />
            ))}
        </div>
    );
}

function Field({ label, children, span }) {
    return (
        <div className={span ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
            <label className="text-xs font-extrabold text-gray-600 dark:text-gray-300">
                {label}
            </label>
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
                    : "bg-gray-200 border-gray-200 dark:bg-zinc-700 dark:border-zinc-700"
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

export default function TumKargoBilgileri() {
    const navigate = useNavigate();
    const isDark = useIsDark();

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

    // Edit
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
        const { id, tarih, kargo_firmasi, gonderi_numarasi, gonderen_firma, irsaliye_adi, irsaliye_no, odak_evrak_no } =
            duzenlenenVeri;

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
            setVeriler((prev) =>
                prev.map((v) =>
                    v.id === id ? { ...duzenlenenVeri, evrak_adedi: duzenleEvrakAdedi } : v
                )
            );
            setDuzenleModalAcik(false);
            showToast("success", "✅ Güncellendi.");
        } else {
            showToast("error", "❌ Güncelleme başarısız.");
        }
    };

    const duzenleVeriyiSil = async () => {
        if (!window.confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;

        const { error } = await supabase.from("kargo_bilgileri").delete().eq("id", duzenlenenVeri.id);

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

            {/* Premium background */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-[32rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500/25 via-purple-500/20 to-indigo-500/25 blur-3xl" />
                <div className="absolute bottom-[-8rem] right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-gradient-to-tr from-purple-400/15 to-indigo-400/10 blur-3xl" />
                <div className="absolute bottom-24 left-6 h-[18rem] w-[18rem] rounded-full bg-gradient-to-tr from-fuchsia-400/10 to-violet-400/10 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.06)_1px,transparent_0)] [background-size:20px_20px] opacity-40 dark:opacity-20" />
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 text-gray-900 dark:text-white">
                {/* Top App Bar */}
                <div className="mb-6">
                    <div className="rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-950/60 backdrop-blur-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="inline-flex items-center gap-2 rounded-2xl bg-violet-600/10 dark:bg-violet-500/10 px-3 py-2 border border-violet-500/20">
                                            <span className="text-lg">📦</span>
                                            <span className="font-extrabold tracking-tight text-violet-700 dark:text-violet-200">
                                                Kargo Dashboard
                                            </span>
                                        </div>

                                        <Pill tone={hasActiveFilters ? "purple" : "neutral"}>
                                            {hasActiveFilters ? `Filtre: ${activeFilterCount}` : "Filtre yok"}
                                        </Pill>

                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {secilenYil ? `${secilenYil} yılı` : "Tüm yıllar"} •{" "}
                                            {toplamFiltreli.toLocaleString("tr-TR")} kayıt
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Hızlı arama, filtreler, düzenleme ve Excel export tek ekranda.
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => navigate("/anasayfa")}
                                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold
                    border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                    >
                                        Anasayfa
                                    </button>

                                    <button
                                        onClick={() => setFiltersOpen((v) => !v)}
                                        className={cx(
                                            "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold border",
                                            filtersOpen
                                                ? "border-violet-500/30 bg-violet-600/10 text-violet-800 dark:text-violet-200 dark:bg-violet-500/10"
                                                : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                                        )}
                                    >
                                        <FiFilter /> {filtersOpen ? "Filtreyi Gizle" : "Filtreyi Göster"}
                                    </button>

                                    <button
                                        onClick={() => setExcelModalAcik(true)}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-white font-semibold shadow-sm hover:opacity-95"
                                    >
                                        <FiDownload /> Excel
                                    </button>

                                    <button
                                        onClick={filtreleriTemizle}
                                        disabled={!hasActiveFilters}
                                        className={cx(
                                            "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold",
                                            hasActiveFilters
                                                ? "bg-zinc-950 text-white hover:opacity-90 dark:bg-white dark:text-zinc-950"
                                                : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-zinc-800 dark:text-gray-400"
                                        )}
                                    >
                                        <FiRotateCcw /> Temizle
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full lg:max-w-2xl">
                                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        value={quickSearch}
                                        onChange={(e) => setQuickSearch(e.target.value)}
                                        placeholder="Hızlı arama… (kargo / gönderi no / gönderen / irsaliye / odak)"
                                        className="w-full pl-11 pr-4 py-3 rounded-2xl
                    border border-black/10 dark:border-white/10 bg-white/85 dark:bg-zinc-900/60
                    outline-none focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                    />
                                    {quickSearch?.trim() && (
                                        <button
                                            onClick={() => setQuickSearch("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 grid place-items-center"
                                            title="Temizle"
                                        >
                                            <FiX />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <MiniStat icon={<FiFileText />} label="Toplam" value={toplamKayit.toLocaleString("tr-TR")} />
                                    <MiniStat icon={<FiSearch />} label="Filtreli" value={toplamFiltreli.toLocaleString("tr-TR")} tone="indigo" />
                                    <MiniStat icon={<FiPackage />} label="Evrak" value={toplamEvrak.toLocaleString("tr-TR")} tone="emerald" />
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {activeChips.map((c) => (
                                        <button
                                            key={c.k}
                                            onClick={c.clear}
                                            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold
                      bg-violet-100 text-violet-800 border border-violet-200
                      dark:bg-violet-900/25 dark:text-violet-200 dark:border-violet-800/40 hover:opacity-90"
                                            title="Bu filtreyi kaldır"
                                        >
                                            {c.label} <FiX />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
                    {/* Filter Panel */}
                    <div className={cx(filtersOpen ? "block" : "hidden", "lg:block")}>
                        <div className="rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-950/55 backdrop-blur-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 font-extrabold">
                                    <FiFilter /> Filtreler
                                </div>
                                <Pill tone={hasActiveFilters ? "purple" : "neutral"}>{activeFilterCount} aktif</Pill>
                            </div>

                            <div className="p-5 grid gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-gray-600 dark:text-gray-300">
                                        <FiCalendar className="inline" /> Yıl
                                    </label>
                                    <select
                                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
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

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-extrabold text-gray-600 dark:text-gray-300">Başlangıç</label>
                                        <input
                                            type="date"
                                            className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                      focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                            value={tarihBaslangic}
                                            onChange={(e) => setTarihBaslangic(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-extrabold text-gray-600 dark:text-gray-300">Bitiş</label>
                                        <input
                                            type="date"
                                            className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                      focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                            value={tarihBitis}
                                            onChange={(e) => setTarihBitis(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-gray-600 dark:text-gray-300">İrsaliye Adı</label>
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
                                    <label className="text-xs font-extrabold text-gray-600 dark:text-gray-300">
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
                                    <label className="text-xs font-extrabold text-gray-600 dark:text-gray-300">
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

                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-gray-600 dark:text-gray-300">İrsaliye No (içerir)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                        placeholder="Örn: 2025-..."
                                        value={irsaliyeNoInput}
                                        onChange={(e) => setIrsaliyeNoInput(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        onClick={filtrele}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-white font-extrabold hover:opacity-95"
                                    >
                                        <FiSearch /> Uygula
                                    </button>
                                    <button
                                        onClick={filtreleriTemizle}
                                        disabled={!hasActiveFilters}
                                        className={cx(
                                            "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-extrabold",
                                            hasActiveFilters
                                                ? "bg-zinc-950 text-white hover:opacity-90 dark:bg-white dark:text-zinc-950"
                                                : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-zinc-800 dark:text-gray-400"
                                        )}
                                    >
                                        <FiRotateCcw /> Temizle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Panel */}
                    <div className="min-w-0">
                        <div className="rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-950/55 backdrop-blur-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                                <div className="font-extrabold">Kayıtlar</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    İrsaliye/Odak tıklanabilir • Hover’da düzenle
                                </div>
                            </div>

                            {loading ? (
                                <div className="p-5">
                                    <GridSkeleton />
                                </div>
                            ) : filteredVeriler.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-700 dark:text-violet-200">
                                        <FiSearch />
                                    </div>
                                    <div className="mt-4 text-lg font-extrabold">Sonuç bulunamadı</div>
                                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        Filtreleri değiştirerek tekrar deneyebilirsin.
                                    </div>
                                    <button
                                        onClick={filtreleriTemizle}
                                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-white font-extrabold hover:opacity-95"
                                    >
                                        <FiRotateCcw /> Filtreleri Temizle
                                    </button>
                                </div>
                            ) : (
                                <div className="max-h-[72vh] overflow-auto">
                                    <div className="min-w-[980px]">
                                        <div className="sticky top-0 z-10 bg-white/85 dark:bg-zinc-950/75 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
                                            <div className="grid grid-cols-[120px_140px_160px_180px_160px_200px_200px_90px_120px] px-4 py-3 text-xs font-extrabold text-gray-600 dark:text-gray-300">
                                                <div>Tarih</div>
                                                <div>Kargo</div>
                                                <div>Gönderi No</div>
                                                <div>Gönderen</div>
                                                <div>İrsaliye Adı</div>
                                                <div>İrsaliye No</div>
                                                <div>Odak No</div>
                                                <div className="text-center">Evrak</div>
                                                <div className="text-right pr-2">İşlem</div>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-black/5 dark:divide-white/10">
                                            {filteredVeriler.map((item, idx) => (
                                                <div
                                                    key={item.id ?? idx}
                                                    className="group grid grid-cols-[120px_140px_160px_180px_160px_200px_200px_90px_120px] items-center px-4 py-3
                          hover:bg-violet-50/60 dark:hover:bg-white/5 transition"
                                                >
                                                    <div className="text-sm font-semibold">{tarihFormatla(item.tarih)}</div>

                                                    <div className="text-sm font-extrabold text-violet-700 dark:text-violet-200">
                                                        {item.kargo_firmasi || "—"}
                                                    </div>

                                                    <div className="text-sm text-gray-800 dark:text-gray-200">
                                                        {item.gonderi_numarasi || "—"}
                                                    </div>

                                                    <div className="text-sm text-gray-800 dark:text-gray-200 truncate" title={item.gonderen_firma || ""}>
                                                        {item.gonderen_firma || "—"}
                                                    </div>

                                                    <div className="text-sm text-gray-800 dark:text-gray-200 truncate" title={item.irsaliye_adi || ""}>
                                                        {item.irsaliye_adi || "—"}
                                                    </div>

                                                    <button
                                                        onClick={() => modalAc("İrsaliye No", item.irsaliye_no)}
                                                        className="text-left text-sm font-semibold text-indigo-700 dark:text-indigo-300 underline underline-offset-4 hover:opacity-80 truncate"
                                                        title={item.irsaliye_no || ""}
                                                    >
                                                        {kisalt(item.irsaliye_no)}
                                                    </button>

                                                    <button
                                                        onClick={() => modalAc("Odak Evrak No", item.odak_evrak_no)}
                                                        className="text-left text-sm font-semibold text-indigo-700 dark:text-indigo-300 underline underline-offset-4 hover:opacity-80 truncate"
                                                        title={item.odak_evrak_no || ""}
                                                    >
                                                        {kisalt(item.odak_evrak_no)}
                                                    </button>

                                                    <div className="text-center">
                                                        <span
                                                            className="inline-flex items-center justify-center rounded-2xl px-3 py-1.5 text-xs font-extrabold
                              bg-violet-600/10 border border-violet-500/20 text-violet-800 dark:text-violet-200"
                                                        >
                                                            {item.evrak_adedi ?? 0}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => duzenleModaliAc(item)}
                                                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition
                              inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-white font-extrabold hover:opacity-95"
                                                        >
                                                            <FiEdit2 /> Düzenle
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="lg:hidden p-4 text-xs text-gray-500 dark:text-gray-400">
                                        Mobilde yatay kaydırma vardır.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal - long text */}
                {modalGoster && (
                    <ModalShell
                        title={modalBaslik}
                        onClose={() => {
                            setModalGoster(false);
                            setModalBaslik("");
                            setModalIcerik("");
                        }}
                        footer={
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500 dark:text-gray-300">
                                    Uzun içerik • kopyalayabilirsiniz
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyToClipboard(modalIcerik)}
                                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-extrabold
                    bg-zinc-950 text-white hover:opacity-90 dark:bg-white dark:text-zinc-950"
                                    >
                                        {copied ? <FiCheck /> : <FiCopy />} Kopyala
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalGoster(false);
                                            setModalBaslik("");
                                            setModalIcerik("");
                                        }}
                                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-extrabold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
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
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white font-extrabold hover:opacity-95"
                            >
                                <FiDownload /> Filtreli Aktar
                            </button>
                            <button
                                onClick={tumVeriyiExceleAktar}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white font-extrabold hover:opacity-95"
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
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-white font-extrabold hover:opacity-95"
                                    >
                                        Güncelle
                                    </button>
                                    <button
                                        onClick={duzenleVeriyiSil}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-white font-extrabold hover:opacity-95"
                                    >
                                        Sil
                                    </button>
                                </div>
                                <button
                                    onClick={() => setDuzenleModalAcik(false)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-extrabold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
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
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                  focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                />
                            </Field>

                            <Field label="Kargo Firması">
                                <input
                                    name="kargo_firmasi"
                                    value={duzenlenenVeri.kargo_firmasi || ""}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                  focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                />
                            </Field>

                            <Field label="Gönderi No">
                                <input
                                    name="gonderi_numarasi"
                                    value={duzenlenenVeri.gonderi_numarasi || ""}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                  focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                />
                            </Field>

                            <Field label="Gönderen Firma">
                                <input
                                    name="gonderen_firma"
                                    value={duzenlenenVeri.gonderen_firma || ""}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                  focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                />
                            </Field>

                            <Field label="İrsaliye Adı">
                                <input
                                    name="irsaliye_adi"
                                    value={duzenlenenVeri.irsaliye_adi || ""}
                                    onChange={handleDuzenleInputChange}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                  focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="İrsaliye No">
                                    <textarea
                                        name="irsaliye_no"
                                        rows="2"
                                        value={duzenlenenVeri.irsaliye_no || ""}
                                        onChange={handleDuzenleInputChange}
                                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        <span className="inline-flex items-center rounded-full px-3 py-1 font-extrabold bg-indigo-600/10 border border-indigo-500/20 text-indigo-800 dark:text-indigo-200">
                                            Adet: {splitCodes(duzenlenenVeri.irsaliye_no).length}
                                        </span>
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
                                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                    focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        <span className="inline-flex items-center rounded-full px-3 py-1 font-extrabold bg-indigo-600/10 border border-indigo-500/20 text-indigo-800 dark:text-indigo-200">
                                            Adet: {splitCodes(duzenlenenVeri.odak_evrak_no).length}
                                        </span>
                                    </div>
                                </Field>
                            </div>

                            <div className="sm:col-span-2 rounded-3xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="font-extrabold">Ekstra evrak var mı?</div>
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
                                                className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 px-3 py-2.5 outline-none
                        focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-900/30"
                                            />
                                        </Field>

                                        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-zinc-950/40 p-4">
                                            <div className="text-xs text-gray-500 dark:text-gray-300">
                                                Toplam Evrak (otomatik)
                                            </div>
                                            <div className="mt-1 text-2xl font-extrabold">{duzenleEvrakAdedi}</div>
                                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                                                İrsaliye + Odak + Ekstra
                                            </div>
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

                            <Field label="Evrak Adedi (otomatik)" span>
                                <input
                                    readOnly
                                    value={duzenleEvrakAdedi}
                                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-zinc-900/60 px-3 py-2.5 text-gray-900 dark:text-white font-extrabold"
                                />
                            </Field>
                        </div>
                    </ModalShell>
                )}
            </div>
        </Layout>
    );
}