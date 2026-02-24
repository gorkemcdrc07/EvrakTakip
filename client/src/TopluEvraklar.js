// TopluEvraklar.jsx (Güncel - Modern UI + tema uyumlu HERO + modern butonlar + filtre paneli düzeltildi)
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import {
    FiFile,
    FiHome,
    FiFilter,
    FiX,
    FiDownload,
    FiTrash2,
    FiEdit2,
    FiInfo,
    FiSearch,
    FiChevronRight,
} from "react-icons/fi";
import Layout from "./components/Layout";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import EditEvrakModal from "./components/EditEvrakModal";
import ModernSummary from "./components/ModernSummary";

/* ---------- mini ui kit (bu sayfaya özel) ---------- */
const cx = (...a) => a.filter(Boolean).join(" ");

function Btn({ variant = "primary", size = "md", leftIcon: L, rightIcon: R, className, ...props }) {
    const sizes = { sm: "h-10 px-4 text-xs", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-sm" };
    const base =
        "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold transition-all duration-200 " +
        "active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed " +
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20";
    const variants = {
        primary:
            "text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 " +
            "border border-white/10 shadow-[0_18px_60px_rgba(139,92,246,0.24)] hover:brightness-[1.05]",
        secondary:
            "text-zinc-900 dark:text-zinc-100 bg-white/75 dark:bg-white/[0.05] backdrop-blur-xl " +
            "border border-violet-200/60 dark:border-white/10 hover:bg-violet-50/70 dark:hover:bg-white/[0.08]",
        ghost:
            "text-violet-700 dark:text-violet-200 bg-transparent border border-transparent " +
            "hover:bg-violet-50/70 dark:hover:bg-white/[0.06]",
        danger:
            "text-white bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 border border-white/10 " +
            "shadow-[0_18px_55px_rgba(239,68,68,0.22)] hover:brightness-[1.05]",
        emerald:
            "text-white bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 border border-white/10 " +
            "shadow-[0_18px_55px_rgba(16,185,129,0.22)] hover:brightness-[1.05]",
    };
    return (
        <button className={cx(base, sizes[size], variants[variant], className)} {...props}>
            {L ? <L /> : null}
            {props.children}
            {R ? <R /> : null}
        </button>
    );
}

function IconBtn({ title, onClick, children, variant = "secondary", className, ...props }) {
    const v =
        variant === "danger"
            ? "text-white bg-rose-600 hover:bg-rose-700 border border-white/10"
            : "text-zinc-800 dark:text-zinc-100 bg-white/75 dark:bg-white/[0.05] border border-violet-200/60 dark:border-white/10 hover:bg-violet-50/70 dark:hover:bg-white/[0.08]";
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={cx(
                "grid h-10 w-10 place-items-center rounded-2xl transition-all duration-200 active:scale-[0.98] " +
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20",
                v,
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

function Tag({ tone = "neutral", children }) {
    const tones = {
        neutral:
            "bg-white/75 border border-violet-200/60 text-zinc-700 dark:bg-white/[0.05] dark:border-white/10 dark:text-zinc-200",
        info:
            "bg-violet-50 border border-violet-200 text-violet-800 dark:bg-white/[0.05] dark:border-white/10 dark:text-violet-200",
        ok: "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-200",
        warn: "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-200",
        danger: "bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-200",
    };
    return (
        <span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold", tones[tone])}>
            {children}
        </span>
    );
}

function SkeletonRow() {
    return <div className="h-12 rounded-2xl bg-zinc-200/70 dark:bg-white/[0.06] animate-pulse" />;
}

/* ---------- component ---------- */
function TopluEvraklar() {
    const navigate = useNavigate();

    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);

    // kart -> panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelTitle, setPanelTitle] = useState("");
    const [panelRows, setPanelRows] = useState([]);

    // filtre state'leri
    const initialFilterState = {
        startDate: "",
        endDate: "",
        lokasyon: [],
        proje: [],
        aciklama: "",
        seferno: "",
    };
    const [filters, setFilters] = useState(initialFilterState);
    const [showFilters, setShowFilters] = useState(false);
    const [draft, setDraft] = useState(initialFilterState);

    const hasActiveFilters = Boolean(
        filters.startDate || filters.endDate || filters.lokasyon?.length || filters.proje?.length || filters.aciklama || filters.seferno
    );

    const [selectedEvrak, setSelectedEvrak] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // --- KAYDEDİLMEMİŞ DEĞİŞİKLİK KORUMASI ---
    const [originalEvrak, setOriginalEvrak] = useState(null);
    const deepClone = (x) => JSON.parse(JSON.stringify(x));
    const hasUnsavedEdit = useMemo(() => {
        if (!showEditModal || !selectedEvrak || !originalEvrak) return false;
        try {
            return JSON.stringify(selectedEvrak) !== JSON.stringify(originalEvrak);
        } catch {
            return true;
        }
    }, [showEditModal, selectedEvrak, originalEvrak]);

    const [deletingId, setDeletingId] = useState(null);
    const [acikProjeId, setAcikProjeId] = useState(null);

    // Detay kartı
    const [detailEvrak, setDetailEvrak] = useState(null);
    const [showDetailCard, setShowDetailCard] = useState(false);

    const normalize = (str) => (str || "").trim().toLocaleUpperCase("tr").replace(/\s+/g, " ");
    const toplamSefer = evraklar.reduce((sum, evrak) => sum + (evrak.sefersayisi || 0), 0);

    const duzeltilmis = evraklar.reduce(
        (sum, evrak) =>
            sum +
            (evrak.evrakseferler?.filter((s) => normalize(s.aciklama) === "TARAFIMIZCA DÜZELTİLMİŞTİR").length || 0),
        0
    );

    const orjinaleCekilmis = evraklar.reduce(
        (sum, evrak) =>
            sum +
            (evrak.evrakseferler?.filter((s) => normalize(s.aciklama) === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR").length || 0),
        0
    );

    const oran = (value) => (toplamSefer ? ((value / toplamSefer) * 100).toFixed(1) : "0.0");

    useEffect(() => {
        fetchVeriler();
    }, []);

    // Modal açılınca orijinali yakala, kapanınca sıfırla
    useEffect(() => {
        if (showEditModal && selectedEvrak) setOriginalEvrak(deepClone(selectedEvrak));
        else setOriginalEvrak(null);
    }, [showEditModal, selectedEvrak?.id]);

    // Sekme kapanışı / sayfadan ayrılma uyarısı
    useEffect(() => {
        const handler = (e) => {
            if (!hasUnsavedEdit) return;
            e.preventDefault();
            e.returnValue = "";
        };
        if (hasUnsavedEdit) window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasUnsavedEdit]);

    // SPA içinde anchor/Link tıklamalarını engelle
    useEffect(() => {
        const onAnchorClick = (e) => {
            if (!hasUnsavedEdit) return;
            const a = e.target.closest("a");
            if (!a) return;
            if (a.origin === window.location.origin && a.target !== "_blank") {
                const ok = window.confirm("Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?");
                if (!ok) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };
        if (hasUnsavedEdit) document.addEventListener("click", onAnchorClick, true);
        return () => document.removeEventListener("click", onAnchorClick, true);
    }, [hasUnsavedEdit]);

    const fetchVeriler = async () => {
        const { data: evrakData, error } = await supabase
            .from("evraklar")
            .select(
                `
        id,
        tarih,
        lokasyonid,
        sefersayisi,
        evrakseferler:evrakseferler!fk_evrakseferler_evrakid (
          seferno,
          aciklama
        ),
        evrakproje:evrakproje!fk_evrakproje_evrakid (
          projeid,
          sefersayisi
        )
      `
            );

        if (error) {
            console.error("❌ Hata:", error);
            return;
        }

        const sortedEvraklar = (evrakData || []).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

        const { data: lokasyonData } = await supabase.from("lokasyonlar").select("*");
        const { data: projeData } = await supabase.from("projeler").select("*");

        const lokasyonMap = {};
        lokasyonData?.forEach((l) => (lokasyonMap[l.id] = l.lokasyon));

        const projeMap = {};
        projeData?.forEach((p) => (projeMap[p.id] = p.proje));

        setEvraklar(sortedEvraklar);
        setLokasyonlar(lokasyonMap);
        setProjeler(projeMap);
        setLoading(false);
    };

    const goHome = () => {
        if (hasUnsavedEdit) {
            const ok = window.confirm("Kaydedilmemiş değişiklikler var. Yine de anasayfaya dönülsün mü?");
            if (!ok) return;
        }
        navigate("/Anasayfa");
    };

    const handleCloseEditModal = () => {
        if (hasUnsavedEdit) {
            const ok = window.confirm("Kaydedilmemiş değişiklikler var. Kapatmak istiyor musunuz?");
            if (!ok) return;
        }
        setShowEditModal(false);
        setSelectedEvrak(null);
        setOriginalEvrak(null);
    };

    const handleEvrakSil = async (evrak) => {
        const onay = window.confirm(`#${evrak.id} numaralı evrağı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`);
        if (!onay) return;

        try {
            setDeletingId(evrak.id);

            await supabase.from("evrakseferler").delete().eq("evrakid", evrak.id);
            await supabase.from("evrakproje").delete().eq("evrakid", evrak.id);
            const { error } = await supabase.from("evraklar").delete().eq("id", evrak.id);
            if (error) throw error;

            setEvraklar((prev) => prev.filter((e) => e.id !== evrak.id));
        } catch (err) {
            console.error("Silme hatası:", err);
            alert("Silme sırasında bir hata oluştu.");
        } finally {
            setDeletingId(null);
        }
    };

    // "Diğer" gibi birden fazla etiketi de açabilmek için:
    const openCardPanel = (arg) => {
        const norm = (v) => (v || "").trim().toLocaleUpperCase("tr");
        const labelOf = (v) => norm(v) || "(BOŞ)";

        let targetLabels = [];
        if (typeof arg === "string") targetLabels = [labelOf(arg)];
        else if (arg && Array.isArray(arg.names)) targetLabels = arg.names.map(labelOf);
        else return;

        const rows = [];
        evraklar.forEach((e) => {
            const lok = lokasyonlar[e.lokasyonid] || "";
            (e.evrakseferler || []).forEach((s) => {
                const lbl = labelOf(s.aciklama);
                if (targetLabels.includes(lbl)) {
                    rows.push({
                        evrakId: e.id,
                        tarih: e.tarih,
                        lokasyon: lok,
                        seferno: (s.seferno || "").trim() || "(Boş)",
                        aciklama: s.aciklama || "",
                    });
                }
            });
        });

        rows.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
        const title = targetLabels.length === 1 ? arg?.name || arg || "Detay" : "Diğer";

        setPanelRows(rows);
        setPanelTitle(title);
        setPanelOpen(true);
    };

    // 🔧 payload opsiyonel
    const handleEvrakGuncelle = async (payload) => {
        const evrakObj = payload || selectedEvrak;
        if (!evrakObj) return;

        const evrakId = evrakObj.id;
        const tarih = evrakObj.tarih;
        const lokasyonid = evrakObj.lokasyonid;

        const evrakproje = Array.isArray(evrakObj.evrakproje)
            ? evrakObj.evrakproje.filter((p) => p.projeid && !isNaN(p.projeid))
            : [];

        const toplamSeferLocal = evrakproje.reduce((sum, p) => sum + Number(p.sefersayisi || 0), 0);

        const evrakseferler = Array.isArray(evrakObj.evrakseferler)
            ? evrakObj.evrakseferler.filter((s) => s.seferno && s.aciklama)
            : [];

        // ✅ seferno bazlı dedup
        const seen = new Set();
        const uniqueSeferler = [];
        for (const s of evrakseferler) {
            const key = String(s.seferno).trim();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueSeferler.push({ ...s, seferno: key });
            }
        }

        try {
            const { error: errEvrak } = await supabase
                .from("evraklar")
                .update({ tarih, lokasyonid, sefersayisi: toplamSeferLocal })
                .eq("id", evrakId);
            if (errEvrak) throw errEvrak;

            const { error: errProjDel } = await supabase.from("evrakproje").delete().eq("evrakid", evrakId);
            if (errProjDel) throw errProjDel;

            if (evrakproje.length > 0) {
                const { error: errProjIns } = await supabase.from("evrakproje").insert(
                    evrakproje.map((p) => ({
                        evrakid: evrakId,
                        projeid: Number(p.projeid),
                        sefersayisi: Number(p.sefersayisi || 0),
                    }))
                );
                if (errProjIns) throw errProjIns;
            }

            const { error: errSeferDel } = await supabase.from("evrakseferler").delete().eq("evrakid", evrakId);
            if (errSeferDel) throw errSeferDel;

            if (uniqueSeferler.length > 0) {
                const { error: errSeferIns } = await supabase.from("evrakseferler").insert(
                    uniqueSeferler.map((s) => ({
                        evrakid: evrakId,
                        seferno: s.seferno,
                        aciklama: s.aciklama,
                    }))
                );
                if (errSeferIns) throw errSeferIns;
            }

            await fetchVeriler();
            setOriginalEvrak(evrakObj ? deepClone(evrakObj) : null);
            setShowEditModal(false);
            setSelectedEvrak(null);
        } catch (error) {
            console.error("Evrak güncelleme hatası:", error);
            alert("Güncelleme sırasında bir hata oluştu.");
        }
    };

    const exportToExcel = () => {
        const sheetData = [];
        const merges = [];

        const headers = ["Tarih", "Lokasyon", "Projeler", "Toplam Sefer Sayısı", "Sefer No", "Açıklama"];
        sheetData.push(headers);

        let currentRow = 1;

        evraklar.forEach((evrak) => {
            const tarih = new Date(evrak.tarih).toLocaleDateString("tr-TR");
            const lokasyon = lokasyonlar[evrak.lokasyonid] || "Bilinmeyen Lokasyon";
            const projeList = evrak.evrakproje?.map((p) => `${projeler[p.projeid]} (${p.sefersayisi})`).join(", ") || "Yok";
            const toplam = evrak.sefersayisi || 0;

            const seferler = evrak.evrakseferler?.length
                ? evrak.evrakseferler
                : [{ seferno: "Yok", aciklama: "Sefer kaydı bulunamadı" }];

            const rowStart = currentRow;
            const rowEnd = currentRow + seferler.length - 1;

            seferler.forEach((sefer) => {
                sheetData.push([tarih, lokasyon, projeList, toplam, sefer.seferno || "Yok", sefer.aciklama || "Yok"]);
                currentRow++;
            });

            if (seferler.length > 1) {
                merges.push(
                    { s: { r: rowStart, c: 0 }, e: { r: rowEnd, c: 0 } },
                    { s: { r: rowStart, c: 1 }, e: { r: rowEnd, c: 1 } },
                    { s: { r: rowStart, c: 2 }, e: { r: rowEnd, c: 2 } },
                    { s: { r: rowStart, c: 3 }, e: { r: rowEnd, c: 3 } }
                );
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!merges"] = merges;
        ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 22 }, { wch: 18 }, { wch: 40 }];

        const borderStyle = {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } },
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "7C3AED" } },
            border: borderStyle,
        };

        const rowStyleLight = { fill: { fgColor: { rgb: "F9FAFB" } }, border: borderStyle };
        const rowStyleDark = { fill: { fgColor: { rgb: "EEF2FF" } }, border: borderStyle };
        const plainCell = { border: borderStyle };

        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                if (!ws[cellRef]) continue;
                ws[cellRef].s = R === 0 ? headerStyle : { ...plainCell, ...(R % 2 === 0 ? rowStyleDark : rowStyleLight) };
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Evraklar");
        XLSX.writeFile(wb, "Toplu_Evraklar_Rapor.xlsx");
    };

    const exportFilteredExcel = () => {
        const allAciklamalar = new Set();
        filteredEvraklar.forEach((evrak) => {
            evrak.evrakseferler?.forEach((s) => s.aciklama?.trim() && allAciklamalar.add(s.aciklama.trim()));
        });

        const aciklamaListesi = [...allAciklamalar];
        const headers = ["TARİH", "LOKASYON", "TOPLAM SEFER", ...aciklamaListesi];
        const sheetData = [headers];

        filteredEvraklar.forEach((evrak) => {
            const tarih = new Date(evrak.tarih).toLocaleDateString("tr-TR");
            const lokasyon = lokasyonlar[evrak.lokasyonid] || "—";
            const toplam = evrak.sefersayisi || 0;

            const counter = {};
            aciklamaListesi.forEach((a) => (counter[a] = 0));
            evrak.evrakseferler?.forEach((s) => {
                const a = (s.aciklama || "").trim();
                if (counter[a] !== undefined) counter[a]++;
            });

            sheetData.push([tarih, lokasyon, toplam, ...aciklamaListesi.map((a) => counter[a])]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!cols"] = headers.map((h) => ({ wch: Math.max(18, h.length + 6) }));

        const border = {
            top: { style: "thin", color: { rgb: "999999" } },
            bottom: { style: "thin", color: { rgb: "999999" } },
            left: { style: "thin", color: { rgb: "999999" } },
            right: { style: "thin", color: { rgb: "999999" } },
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "ffffff" } },
            fill: { fgColor: { rgb: "7C3AED" } },
            alignment: { horizontal: "center", vertical: "center" },
            border,
        };

        const rowLight = { fill: { fgColor: { rgb: "F8FAFC" } }, border };
        const rowDark = { fill: { fgColor: { rgb: "EEF2FF" } }, border };

        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellRef];
                if (!cell) continue;
                cell.s = R === 0 ? headerStyle : R % 2 === 0 ? rowDark : rowLight;
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detay Rapor");
        XLSX.writeFile(wb, "Detay_Rapor.xlsx");
    };

    const exportEvrakToExcel = (evrak) => {
        const tarih = new Date(evrak.tarih).toLocaleDateString("tr-TR");
        const lokasyon = lokasyonlar[evrak.lokasyonid] || "Bilinmeyen Lokasyon";
        const toplam = evrak.sefersayisi || 0;

        const sheetData = [];
        sheetData.push(["TARİH", "LOKASYON", "TOPLAM SEFER"]);
        sheetData.push([tarih, lokasyon, toplam]);
        sheetData.push([]);

        sheetData.push(["PROJE", "SEFER SAYISI"]);
        (evrak.evrakproje || []).forEach((p) => {
            const projeAd = projeler[p.projeid] || "Bilinmeyen Proje";
            sheetData.push([projeAd, p.sefersayisi]);
        });
        sheetData.push([]);

        const aciklamaSayaci = {};
        (evrak.evrakseferler || []).forEach((s) => {
            const aciklama = s.aciklama || "Bilinmeyen";
            aciklamaSayaci[aciklama] = (aciklamaSayaci[aciklama] || 0) + 1;
        });

        sheetData.push(["AÇIKLAMA ÖZETİ"]);
        Object.entries(aciklamaSayaci).forEach(([aciklama, count]) => sheetData.push([`${aciklama}: ${count}`]));

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!cols"] = [{ wch: 40 }, { wch: 25 }, { wch: 20 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Evrak Raporu");
        XLSX.writeFile(wb, `evrak_raporu_${evrak.id}.xlsx`);
    };

    // tablo filtresi
    const filteredEvraklar = evraklar.filter((evrak) => {
        const tarihMatch =
            (!filters.startDate || new Date(evrak.tarih) >= new Date(filters.startDate)) &&
            (!filters.endDate || new Date(evrak.tarih) <= new Date(filters.endDate));

        const lokasyonMatch = filters.lokasyon.length === 0 || filters.lokasyon.includes(String(evrak.lokasyonid));

        const evrakProjeIds = evrak.evrakproje?.map((p) => String(p.projeid)) || [];
        const projeMatch = filters.proje.length === 0 || evrakProjeIds.some((pid) => filters.proje.includes(pid));

        const seferAciklamalari = (evrak.evrakseferler || []).map((s) => s.aciklama).join(", ");
        const aciklamaMatch = filters.aciklama
            ? seferAciklamalari.toLocaleLowerCase("tr").includes(filters.aciklama.toLocaleLowerCase("tr"))
            : true;

        const seferNoMatch = filters.seferno
            ? filters.seferno === "(Boş)"
                ? (evrak.evrakseferler || []).some((s) => !s.seferno?.trim())
                : (evrak.evrakseferler || []).some((s) =>
                    (s.seferno || "").toLocaleLowerCase("tr").includes(filters.seferno.toLocaleLowerCase("tr"))
                )
            : true;

        return tarihMatch && lokasyonMatch && projeMatch && aciklamaMatch && seferNoMatch;
    });

    const filteredAciklamaVerileri = () => {
        const counts = {};
        filteredEvraklar.forEach((evrak) => {
            evrak.evrakseferler?.forEach((sefer) => {
                const key = sefer.aciklama || "(Boş)";
                counts[key] = (counts[key] || 0) + 1;
            });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    };

    const filteredToplamSefer = filteredEvraklar.reduce((sum, evrak) => sum + (evrak.sefersayisi || 0), 0);

    // panel için bağımlı seçenekler
    const candidateEvraklar = useMemo(() => {
        let arr = evraklar || [];
        if (draft.startDate) arr = arr.filter((e) => new Date(e.tarih) >= new Date(draft.startDate));
        if (draft.endDate) arr = arr.filter((e) => new Date(e.tarih) <= new Date(draft.endDate));
        if (draft.proje?.length) {
            arr = arr.filter((e) => {
                const ids = (e.evrakproje || []).map((p) => String(p.projeid));
                return ids.some((id) => draft.proje.includes(id));
            });
        }
        return arr;
    }, [evraklar, draft.startDate, draft.endDate, draft.proje]);

    const projeOptions = useMemo(() => {
        const ids = new Set();
        candidateEvraklar.forEach((e) => e.evrakproje?.forEach((p) => ids.add(String(p.projeid))));
        return [...ids].map((id) => ({ id, name: projeler?.[id] })).filter((x) => x.name);
    }, [candidateEvraklar, projeler]);

    const lokasyonOptions = useMemo(() => {
        const ids = new Set(candidateEvraklar.map((e) => String(e.lokasyonid)));
        return [...ids].map((id) => ({ id, name: lokasyonlar?.[id] })).filter((x) => x.name);
    }, [candidateEvraklar, lokasyonlar]);

    const aciklamaOptions = useMemo(() => {
        const s = new Set();
        candidateEvraklar.forEach((e) => e.evrakseferler?.forEach((x) => x.aciklama?.trim() && s.add(x.aciklama.trim())));
        return [...s];
    }, [candidateEvraklar]);

    const seferOptions = useMemo(() => {
        const s = new Set();
        candidateEvraklar.forEach((e) => e.evrakseferler?.forEach((x) => s.add(x.seferno?.trim() || "(Boş)")));
        return [...s];
    }, [candidateEvraklar]);

    const openDetail = (evrak) => {
        setDetailEvrak(evrak);
        setShowDetailCard(true);
    };

    // ✅ modern table skeleton
    const TableSkeleton = () => (
        <div className="rounded-3xl border border-violet-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] p-5 shadow-sm backdrop-blur-xl">
            <div className="h-6 w-52 rounded bg-zinc-200/70 dark:bg-white/[0.06] animate-pulse mb-4" />
            <div className="space-y-3">{[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}</div>
        </div>
    );

    return (
        <>
            {showEditModal && selectedEvrak && (
                <EditEvrakModal
                    value={selectedEvrak}
                    lokasyonlar={lokasyonlar}
                    projeler={projeler}
                    onClose={handleCloseEditModal}
                    onSave={handleEvrakGuncelle}
                />
            )}

            <Layout>
                {/* Modern arkaplan (light'ta panelin siyah kalması düzeltildi -> artık hero tema duyarlı) */}
                <div
                    className="min-h-screen bg-[#F7F5FF] dark:bg-[#070A13]
            [background-image:radial-gradient(900px_circle_at_18%_10%,rgba(139,92,246,0.14),transparent_55%),radial-gradient(850px_circle_at_82%_40%,rgba(236,72,153,0.10),transparent_60%)]
            dark:[background-image:radial-gradient(900px_circle_at_18%_10%,rgba(139,92,246,0.18),transparent_55%),radial-gradient(850px_circle_at_82%_40%,rgba(236,72,153,0.10),transparent_60%),radial-gradient(700px_circle_at_50%_85%,rgba(34,211,238,0.08),transparent_55%)]
            text-zinc-950 dark:text-zinc-50 transition-colors duration-300"
                >
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        {/* HERO (✅ artık light tema'da siyah değil) */}
                        <div className="mb-6 overflow-hidden rounded-[28px] border border-violet-200/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
                            <div className="px-6 py-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <Tag tone="info">
                                            <FiSearch /> Liste • Filtre • Excel
                                        </Tag>

                                        <h2 className="mt-3 text-2xl font-extrabold tracking-tight">📚 Toplu Evraklar</h2>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                            Toplam Evrak: <b className="text-zinc-950 dark:text-white">{filteredEvraklar.length}</b> • Toplam Sefer:{" "}
                                            <b className="text-zinc-950 dark:text-white">{filteredToplamSefer}</b>
                                        </p>

                                        {hasActiveFilters && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Tag tone="warn">Filtre aktif</Tag>
                                                <Tag tone="neutral">
                                                    Tarih: {filters.startDate || "—"} <FiChevronRight /> {filters.endDate || "—"}
                                                </Tag>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Btn variant="secondary" size="md" leftIcon={FiHome} onClick={goHome} title="Anasayfaya dön">
                                            Anasayfa
                                        </Btn>

                                        <Btn
                                            variant="primary"
                                            size="md"
                                            leftIcon={FiFilter}
                                            onClick={() => {
                                                setDraft(filters);
                                                setShowFilters(true);
                                            }}
                                        >
                                            Filtre
                                        </Btn>

                                        {hasActiveFilters && (
                                            <Btn variant="secondary" size="md" leftIcon={FiX} onClick={() => setFilters(initialFilterState)} title="Filtreleri temizle">
                                                Temizle
                                            </Btn>
                                        )}

                                        <Btn variant="emerald" size="md" leftIcon={FiDownload} onClick={exportToExcel}>
                                            Excel
                                        </Btn>

                                        <Btn variant="primary" size="md" leftIcon={FiFile} onClick={exportFilteredExcel}>
                                            Detay Excel
                                        </Btn>
                                    </div>
                                </div>

                                {/* mini stats */}
                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                                        <div className="text-xs text-zinc-600 dark:text-zinc-300">Düzeltilmiş</div>
                                        <div className="mt-1 text-lg font-extrabold">
                                            {duzeltilmis} <span className="text-xs font-extrabold text-zinc-500 dark:text-zinc-300">({oran(duzeltilmis)}%)</span>
                                        </div>
                                    </div>
                                    <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                                        <div className="text-xs text-zinc-600 dark:text-zinc-300">Orijinale Çekilmiş</div>
                                        <div className="mt-1 text-lg font-extrabold">
                                            {orjinaleCekilmis}{" "}
                                            <span className="text-xs font-extrabold text-zinc-500 dark:text-zinc-300">({oran(orjinaleCekilmis)}%)</span>
                                        </div>
                                    </div>
                                    <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                                        <div className="text-xs text-zinc-600 dark:text-zinc-300">Toplam Sefer (Genel)</div>
                                        <div className="mt-1 text-lg font-extrabold">{toplamSefer}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Özet kartları */}
                        {!showFilters && (
                            <div className="mb-6">
                                <ModernSummary title="Açıklama Dağılımı" data={filteredAciklamaVerileri()} total={filteredToplamSefer} onCardClick={openCardPanel} />
                            </div>
                        )}

                        {/* Tablo */}
                        {loading ? (
                            <TableSkeleton />
                        ) : (
                            <div className="rounded-3xl overflow-hidden border border-violet-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] shadow-sm backdrop-blur-xl">
                                <div className="overflow-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-white/[0.06]">
                                            <tr className="text-left text-xs font-extrabold tracking-wide text-zinc-700 dark:text-zinc-200">
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10">#</th>
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10">Tarih</th>
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10">Lokasyon</th>
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10">Projeler</th>
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10">Toplam</th>
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10 text-center">Detay</th>
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10 text-center">Düzenle</th>
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10 text-center">Excel</th>
                                                <th className="px-4 py-3 border-b border-violet-200/60 dark:border-white/10 text-center">Sil</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filteredEvraklar.map((evrak, index) => {
                                                const isProjelerVisible = acikProjeId === evrak.id;

                                                return (
                                                    <tr
                                                        key={evrak.id}
                                                        className="bg-white/60 dark:bg-white/[0.02] hover:bg-violet-50/70 dark:hover:bg-white/[0.06] transition-colors"
                                                    >
                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10 font-extrabold text-center">
                                                            {index + 1}
                                                        </td>

                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10">
                                                            {new Date(evrak.tarih).toLocaleDateString("tr-TR")}
                                                        </td>

                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10">
                                                            {lokasyonlar[evrak.lokasyonid]}
                                                        </td>

                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10 align-top">
                                                            <Btn
                                                                variant="secondary"
                                                                size="sm"
                                                                leftIcon={FiInfo}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAcikProjeId(isProjelerVisible ? null : evrak.id);
                                                                }}
                                                            >
                                                                {isProjelerVisible ? "Gizle" : "Göster"}
                                                            </Btn>

                                                            {isProjelerVisible && (
                                                                <ul className="mt-2 space-y-1 rounded-2xl border border-violet-200/60 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                                                                    {evrak.evrakproje?.map((p, idx) => (
                                                                        <li key={idx} className="text-sm">
                                                                            <span className="font-extrabold">{projeler[p.projeid]}</span>{" "}
                                                                            <span className="opacity-80">({p.sefersayisi})</span>
                                                                        </li>
                                                                    ))}
                                                                    {(!evrak.evrakproje || !evrak.evrakproje.length) && (
                                                                        <li className="text-sm opacity-70">Proje kaydı yok.</li>
                                                                    )}
                                                                </ul>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10">
                                                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 px-3 py-1 text-xs font-extrabold border border-emerald-200 dark:border-emerald-900/30">
                                                                {evrak.sefersayisi}
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10 text-center">
                                                            <Btn
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDetail(evrak);
                                                                }}
                                                            >
                                                                Detay
                                                            </Btn>
                                                        </td>

                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10 text-center">
                                                            <Btn
                                                                variant="secondary"
                                                                size="sm"
                                                                leftIcon={FiEdit2}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedEvrak(evrak);
                                                                    setShowEditModal(true);
                                                                }}
                                                            >
                                                                Düzenle
                                                            </Btn>
                                                        </td>

                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10 text-center">
                                                            <Btn
                                                                variant="emerald"
                                                                size="sm"
                                                                leftIcon={FiDownload}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    exportEvrakToExcel(evrak);
                                                                }}
                                                            >
                                                                Rapor
                                                            </Btn>
                                                        </td>

                                                        <td className="px-4 py-3 border-b border-violet-200/50 dark:border-white/10 text-center">
                                                            <Btn
                                                                variant="danger"
                                                                size="sm"
                                                                leftIcon={FiTrash2}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEvrakSil(evrak);
                                                                }}
                                                                disabled={deletingId === evrak.id}
                                                            >
                                                                {deletingId === evrak.id ? "Siliniyor…" : "Sil"}
                                                            </Btn>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {filteredEvraklar.length === 0 && (
                                                <tr>
                                                    <td colSpan={9} className="px-6 py-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
                                                        Kayıt bulunamadı. Filtreleri gevşetmeyi deneyin.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SOL FİLTRE PANELİ (✅ light tema artık siyah değil) */}
                    {showFilters && (
                        <div className="fixed inset-0 z-50">
                            <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />

                            <div className="absolute left-0 top-0 h-full w-full max-w-[440px] shadow-2xl overflow-y-auto
                bg-white/85 dark:bg-[#0B1020]/85 backdrop-blur-xl
                border-r border-violet-200/60 dark:border-white/10
                text-zinc-900 dark:text-zinc-100 p-5"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-xs font-extrabold text-zinc-500 dark:text-zinc-300">Filtre Paneli</div>
                                        <h3 className="text-lg font-extrabold">Gelişmiş Filtreler</h3>
                                    </div>

                                    <IconBtn title="Kapat" onClick={() => setShowFilters(false)}>
                                        <FiX />
                                    </IconBtn>
                                </div>

                                {/* Tarihler */}
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="text-xs font-extrabold text-zinc-600 dark:text-zinc-300">Başlangıç Tarihi</label>
                                        <input
                                            type="date"
                                            value={draft.startDate}
                                            onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                                            className="mt-1 w-full px-4 py-3 rounded-2xl border border-violet-200/60 bg-white/70 dark:bg-white/[0.05] dark:border-white/10 outline-none
                        focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-extrabold text-zinc-600 dark:text-zinc-300">Bitiş Tarihi</label>
                                        <input
                                            type="date"
                                            value={draft.endDate}
                                            onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                                            className="mt-1 w-full px-4 py-3 rounded-2xl border border-violet-200/60 bg-white/70 dark:bg-white/[0.05] dark:border-white/10 outline-none
                        focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70"
                                        />
                                    </div>
                                </div>

                                {/* Projeler */}
                                <div className="mt-5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-extrabold">Projeler</label>
                                        <Btn variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, proje: [] }))}>
                                            Temizle
                                        </Btn>
                                    </div>

                                    <div className="mt-2 max-h-44 overflow-auto rounded-2xl border border-violet-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04]">
                                        {projeOptions.map(({ id, name }) => (
                                            <label
                                                key={id}
                                                className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-violet-50/70 dark:hover:bg-white/[0.06]"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={draft.proje.includes(id)}
                                                    onChange={() =>
                                                        setDraft((d) => ({
                                                            ...d,
                                                            proje: d.proje.includes(id) ? d.proje.filter((x) => x !== id) : [...d.proje, id],
                                                        }))
                                                    }
                                                />
                                                <span className="font-semibold">{name}</span>
                                            </label>
                                        ))}
                                        {projeOptions.length === 0 && <div className="px-3 py-3 text-sm text-zinc-500">Seçime göre proje yok.</div>}
                                    </div>
                                </div>

                                {/* Lokasyonlar */}
                                <div className="mt-5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-extrabold">Lokasyonlar</label>
                                        <Btn variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, lokasyon: [] }))}>
                                            Temizle
                                        </Btn>
                                    </div>

                                    <div className="mt-2 max-h-44 overflow-auto rounded-2xl border border-violet-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04]">
                                        {lokasyonOptions.map(({ id, name }) => (
                                            <label
                                                key={id}
                                                className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-violet-50/70 dark:hover:bg-white/[0.06]"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={draft.lokasyon.includes(id)}
                                                    onChange={() =>
                                                        setDraft((d) => ({
                                                            ...d,
                                                            lokasyon: d.lokasyon.includes(id) ? d.lokasyon.filter((x) => x !== id) : [...d.lokasyon, id],
                                                        }))
                                                    }
                                                />
                                                <span className="font-semibold">{name}</span>
                                            </label>
                                        ))}
                                        {lokasyonOptions.length === 0 && <div className="px-3 py-3 text-sm text-zinc-500">Seçime göre lokasyon yok.</div>}
                                    </div>
                                </div>

                                {/* Açıklama */}
                                <div className="mt-5">
                                    <label className="text-sm font-extrabold">Açıklama</label>
                                    <input
                                        type="text"
                                        list="aciklama-list"
                                        value={draft.aciklama}
                                        onChange={(e) => setDraft({ ...draft, aciklama: e.target.value })}
                                        className="mt-1 w-full px-4 py-3 rounded-2xl border border-violet-200/60 bg-white/70 dark:bg-white/[0.05] dark:border-white/10 outline-none
                      focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70"
                                        placeholder="Ara ya da yaz..."
                                    />
                                    <datalist id="aciklama-list">
                                        {aciklamaOptions.map((a, i) => (
                                            <option key={i} value={a} />
                                        ))}
                                    </datalist>
                                </div>

                                {/* Sefer No */}
                                <div className="mt-5">
                                    <label className="text-sm font-extrabold">Sefer No</label>
                                    <input
                                        type="text"
                                        list="sefer-list"
                                        value={draft.seferno}
                                        onChange={(e) => setDraft({ ...draft, seferno: e.target.value })}
                                        className="mt-1 w-full px-4 py-3 rounded-2xl border border-violet-200/60 bg-white/70 dark:bg-white/[0.05] dark:border-white/10 outline-none
                      focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70"
                                        placeholder="Ara ya da yaz..."
                                    />
                                    <datalist id="sefer-list">
                                        {seferOptions.map((s, i) => (
                                            <option key={i} value={s} />
                                        ))}
                                    </datalist>
                                </div>

                                {/* Butonlar */}
                                <div className="mt-6 flex items-center gap-2">
                                    <Btn
                                        variant="secondary"
                                        size="lg"
                                        onClick={() => {
                                            setFilters(initialFilterState);
                                            setDraft(initialFilterState);
                                            setShowFilters(false);
                                        }}
                                        leftIcon={FiX}
                                        className="flex-1"
                                    >
                                        Temizle
                                    </Btn>

                                    <Btn
                                        variant="primary"
                                        size="lg"
                                        onClick={() => {
                                            setFilters(draft);
                                            setShowFilters(false);
                                        }}
                                        leftIcon={FiFilter}
                                        className="flex-1"
                                    >
                                        Uygula
                                    </Btn>
                                </div>

                                <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-300">
                                    İpucu: Önce proje seçersen lokasyon listesi otomatik daralır.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ✅ DETAY CARD */}
                    {showDetailCard && detailEvrak && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetailCard(false)} />
                            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl
                bg-white/90 dark:bg-white/[0.06] backdrop-blur-xl
                border border-violet-200/60 dark:border-white/10 p-6 text-zinc-900 dark:text-zinc-100"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <Tag tone="info">Detay</Tag>
                                        <h3 className="mt-2 text-lg font-extrabold">Sefer Detayları — Evrak #{detailEvrak.id}</h3>
                                    </div>
                                    <IconBtn title="Kapat" onClick={() => setShowDetailCard(false)}>
                                        <FiX />
                                    </IconBtn>
                                </div>

                                {/* Meta */}
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                        <div className="text-xs text-zinc-600 dark:text-zinc-300">Tarih</div>
                                        <div className="font-extrabold">{new Date(detailEvrak.tarih).toLocaleDateString("tr-TR")}</div>
                                    </div>
                                    <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                        <div className="text-xs text-zinc-600 dark:text-zinc-300">Lokasyon</div>
                                        <div className="font-extrabold">{lokasyonlar[detailEvrak.lokasyonid]}</div>
                                    </div>
                                    <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                        <div className="text-xs text-zinc-600 dark:text-zinc-300">Toplam Sefer</div>
                                        <div className="font-extrabold">{detailEvrak.sefersayisi || 0}</div>
                                    </div>
                                </div>

                                {/* Projeler */}
                                <div className="mt-5">
                                    <div className="text-sm font-extrabold mb-2">Projeler</div>
                                    <div className="flex flex-wrap gap-2">
                                        {(detailEvrak.evrakproje || []).map((p, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 rounded-full text-xs font-extrabold
                          bg-violet-50 text-violet-800 border border-violet-200
                          dark:bg-white/[0.05] dark:text-violet-200 dark:border-white/10"
                                            >
                                                {projeler[p.projeid]} — {p.sefersayisi}
                                            </span>
                                        ))}
                                        {(!detailEvrak.evrakproje || !detailEvrak.evrakproje.length) && <span className="text-xs opacity-70">Proje kaydı yok.</span>}
                                    </div>
                                </div>

                                {/* Sefer listesi */}
                                <div className="mt-5">
                                    <div className="text-sm font-extrabold mb-2">Seferler</div>
                                    <div className="space-y-2">
                                        {(detailEvrak.evrakseferler || []).length ? (
                                            detailEvrak.evrakseferler.map((s, i) => {
                                                const normalized = (s.aciklama || "").trim().toLocaleUpperCase("tr");
                                                const badge =
                                                    normalized === "TARAFIMIZCA DÜZELTİLMİŞTİR"
                                                        ? "bg-emerald-600 text-white"
                                                        : normalized === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR"
                                                            ? "bg-violet-600 text-white"
                                                            : "bg-zinc-200 text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-100";

                                                return (
                                                    <div
                                                        key={i}
                                                        className="rounded-3xl border border-violet-200/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]
                              flex items-start justify-between gap-3"
                                                    >
                                                        <div>
                                                            <div className="text-xs text-zinc-600 dark:text-zinc-300">Sefer No</div>
                                                            <div className="font-extrabold">{s.seferno || "(Boş)"}</div>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${badge}`}>{s.aciklama || "—"}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-sm opacity-70">Sefer kaydı bulunamadı.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-6 flex justify-end gap-2">
                                    <Btn variant="emerald" size="md" leftIcon={FiDownload} onClick={() => exportEvrakToExcel(detailEvrak)}>
                                        Excel (Satır)
                                    </Btn>
                                    <Btn variant="secondary" size="md" onClick={() => setShowDetailCard(false)}>
                                        Kapat
                                    </Btn>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 👉 Sağdan kayan PANEL */}
                    {panelOpen && (
                        <div className="fixed inset-0 z-50">
                            <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
                            <div
                                className="absolute right-0 top-0 h-full w-full sm:w-[680px] p-5 overflow-y-auto shadow-2xl
                bg-white/85 dark:bg-[#0B1020]/85 backdrop-blur-xl
                border-l border-violet-200/60 dark:border-white/10 text-zinc-900 dark:text-zinc-100"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <Tag tone="info">Panel</Tag>
                                        <h3 className="mt-2 text-lg font-extrabold">
                                            {panelTitle} — {panelRows.length} satır
                                        </h3>
                                    </div>
                                    <IconBtn title="Kapat" onClick={() => setPanelOpen(false)}>
                                        <FiX />
                                    </IconBtn>
                                </div>

                                <div className="rounded-3xl overflow-hidden border border-violet-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-white/80 dark:bg-white/[0.06]">
                                            <tr className="text-left text-xs font-extrabold text-zinc-700 dark:text-zinc-200">
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">#</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">Tarih</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">Evrak</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">Lokasyon</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">Sefer No</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {panelRows.map((r, i) => (
                                                <tr key={`${r.evrakId}-${i}`} className="odd:bg-violet-50/40 dark:odd:bg-white/[0.03] hover:bg-violet-50/70 dark:hover:bg-white/[0.06]">
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10 font-extrabold">{i + 1}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10">{new Date(r.tarih).toLocaleDateString("tr-TR")}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10">#{r.evrakId}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10">{r.lokasyon}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10">{r.seferno}</td>
                                                </tr>
                                            ))}
                                            {panelRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-10 text-center text-zinc-600 dark:text-zinc-300">
                                                        Kayıt bulunamadı.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Layout>
        </>
    );
}

export default TopluEvraklar;