// TopluEvraklar.jsx (Güncel - Modern UI + tema uyumlu HERO + modern butonlar + filtre paneli düzeltildi)
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import {
    FiFile,
    FiFilter,
    FiX,
    FiDownload,
    FiTrash2,
    FiEdit2,
    FiSearch,
    FiChevronRight,
    FiEye,
    FiTrendingUp,
    FiMapPin,
    FiActivity,
    FiArrowLeft,
    FiLayers,
    FiChevronDown,
    FiChevronUp,
    FiTarget,
} from "react-icons/fi";
import Layout from "./components/Layout";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useLocation, useNavigate } from "react-router-dom";
import EditEvrakModal from "./components/EditEvrakModal";
import ModernSummary from "./components/ModernSummary";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/* ---------- mini ui kit (bu sayfaya özel) ---------- */
const cx = (...a) => a.filter(Boolean).join(" ");

function Btn({ variant = "primary", size = "md", leftIcon: L, rightIcon: R, className, children, ...props }) {
    const sizes = { sm: "h-10 px-4 text-xs", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-sm" };
    const base =
        "group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-extrabold transition-all duration-300 " +
        "active:scale-[0.96] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/20";
    const variants = {
        primary:
            "text-white bg-gradient-to-r from-blue-600 to-cyan-500 border border-white/10 shadow-[0_10px_28px_rgba(8,145,178,0.22)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(8,145,178,0.30)]",
        secondary:
            "text-slate-700 dark:text-slate-100 bg-white dark:bg-white/[0.05] backdrop-blur-xl " +
            "border border-slate-200 dark:border-white/10 shadow-sm hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 hover:shadow-[0_10px_24px_rgba(8,145,178,.12)] dark:hover:border-cyan-500/30 dark:hover:text-cyan-300",
        ghost:
            "text-cyan-700 dark:text-cyan-300 bg-transparent border border-transparent hover:bg-cyan-50 dark:hover:bg-cyan-950/20",
        danger:
            "text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 hover:-translate-y-0.5 hover:bg-rose-600 hover:text-white hover:shadow-[0_12px_28px_rgba(244,63,94,.22)]",
        emerald:
            "text-white bg-gradient-to-r from-emerald-600 to-teal-500 border border-white/10 shadow-[0_10px_26px_rgba(16,185,129,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(16,185,129,.26)]",
    };
    return (
        <button className={cx(base, sizes[size], variants[variant], className)} {...props}>
            <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 opacity-0 blur-sm transition-all duration-700 group-hover/btn:left-[120%] group-hover/btn:opacity-100" />
            {L ? <span className="relative z-10 grid h-6 w-6 place-items-center rounded-lg bg-current/10 transition duration-300 group-hover/btn:-rotate-6 group-hover/btn:scale-110"><L className="h-4 w-4" /></span> : null}
            <span className="relative z-10">{children}</span>
            {R ? <R className="relative z-10 transition-transform group-hover/btn:translate-x-1" /> : null}
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
    const location = useLocation();

    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);

    // kart -> panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelTitle, setPanelTitle] = useState("");
    const [panelRows, setPanelRows] = useState([]);
    const [panelSearch, setPanelSearch] = useState("");
    const [highlightedEvrakId, setHighlightedEvrakId] = useState(null);

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

    const toplamSefer = evraklar.reduce((sum, evrak) => sum + (evrak.sefersayisi || 0), 0);

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
        filteredEvraklar.forEach((e) => {
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
        setPanelSearch("");
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

    const excelPalette = {
        navy: "0F172A",
        blue: "2563EB",
        cyan: "06B6D4",
        emerald: "10B981",
        violet: "7C3AED",
        slate: "475569",
        softBlue: "EFF6FF",
        softCyan: "ECFEFF",
        softSlate: "F8FAFC",
        white: "FFFFFF",
        border: "CBD5E1",
        text: "0F172A",
        muted: "64748B",
    };

    const applyWorkbookBranding = (worksheet, title, subtitle, columnCount) => {
        worksheet.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
        worksheet.mergeCells(1, 1, 1, columnCount);
        worksheet.mergeCells(2, 1, 2, columnCount);
        worksheet.mergeCells(3, 1, 3, columnCount);

        const titleCell = worksheet.getCell(1, 1);
        titleCell.value = title;
        titleCell.font = { name: "Aptos Display", size: 20, bold: true, color: { argb: excelPalette.white } };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: excelPalette.navy } };
        titleCell.alignment = { vertical: "middle", horizontal: "left" };
        worksheet.getRow(1).height = 34;

        const subCell = worksheet.getCell(2, 1);
        subCell.value = subtitle;
        subCell.font = { name: "Aptos", size: 10, color: { argb: "D7E3F4" } };
        subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: excelPalette.navy } };
        subCell.alignment = { vertical: "middle", horizontal: "left" };
        worksheet.getRow(2).height = 22;

        const infoCell = worksheet.getCell(3, 1);
        infoCell.value = `Oluşturulma: ${new Date().toLocaleString("tr-TR")}  •  Odak Lojistik Evrak Takip Sistemi`;
        infoCell.font = { name: "Aptos", size: 9, italic: true, color: { argb: excelPalette.muted } };
        infoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };
        infoCell.alignment = { vertical: "middle", horizontal: "left" };
        worksheet.getRow(3).height = 20;

        worksheet.getRow(4).height = 8;
    };

    const styleHeaderRow = (row, color = excelPalette.blue) => {
        row.height = 28;
        row.eachCell((cell) => {
            cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: excelPalette.white } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = {
                top: { style: "thin", color: { argb: color } },
                bottom: { style: "thin", color: { argb: color } },
                left: { style: "thin", color: { argb: "FFFFFF" } },
                right: { style: "thin", color: { argb: "FFFFFF" } },
            };
        });
    };

    const styleDataRows = (worksheet, fromRow, toRow, columnCount) => {
        for (let r = fromRow; r <= toRow; r++) {
            const row = worksheet.getRow(r);
            row.height = 24;
            for (let c = 1; c <= columnCount; c++) {
                const cell = row.getCell(c);
                cell.font = { name: "Aptos", size: 10, color: { argb: excelPalette.text } };
                cell.alignment = { vertical: "middle", horizontal: c === 4 ? "center" : "left", wrapText: true };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: r % 2 === 0 ? excelPalette.softSlate : "FFFFFF" },
                };
                cell.border = {
                    top: { style: "hair", color: { argb: "E2E8F0" } },
                    bottom: { style: "hair", color: { argb: "E2E8F0" } },
                    left: { style: "hair", color: { argb: "E2E8F0" } },
                    right: { style: "hair", color: { argb: "E2E8F0" } },
                };
            }
        }
    };

    const saveExcelWorkbook = async (workbook, fileName) => {
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
            fileName
        );
    };

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Odak Lojistik - Evrak Takip Sistemi";
        workbook.created = new Date();
        const ws = workbook.addWorksheet("Evraklar", { properties: { tabColor: { argb: excelPalette.emerald } } });

        const headers = ["Tarih", "Lokasyon", "Projeler", "Toplam Sefer", "Sefer No", "Açıklama"];
        applyWorkbookBranding(ws, "EVRAK OPERASYON RAPORU", `${evraklar.length} evrak kaydı • Tüm kayıtların detaylı sefer dökümü`, headers.length);
        ws.addRow(headers);
        styleHeaderRow(ws.getRow(5), excelPalette.emerald);

        let currentRow = 6;
        evraklar.forEach((evrak) => {
            const tarih = new Date(evrak.tarih).toLocaleDateString("tr-TR");
            const lokasyon = lokasyonlar[evrak.lokasyonid] || "Bilinmeyen Lokasyon";
            const projeList = evrak.evrakproje?.map((p) => `${projeler[p.projeid] || "Bilinmeyen Proje"} (${p.sefersayisi})`).join(", ") || "—";
            const toplam = evrak.sefersayisi || 0;
            const seferler = evrak.evrakseferler?.length ? evrak.evrakseferler : [{ seferno: "—", aciklama: "Sefer kaydı bulunamadı" }];
            const groupStart = currentRow;

            seferler.forEach((sefer) => {
                ws.addRow([tarih, lokasyon, projeList, toplam, sefer.seferno || "—", sefer.aciklama || "—"]);
                currentRow++;
            });

            if (seferler.length > 1) {
                [1, 2, 3, 4].forEach((col) => ws.mergeCells(groupStart, col, currentRow - 1, col));
            }
        });

        styleDataRows(ws, 6, Math.max(6, currentRow - 1), headers.length);
        ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: headers.length } };
        ws.columns = [{ width: 15 }, { width: 28 }, { width: 44 }, { width: 16 }, { width: 20 }, { width: 46 }];
        ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
        ws.headerFooter.oddFooter = "&L&BOdak Lojistik&C&PEvrak Operasyon Raporu&R&P / &N";

        await saveExcelWorkbook(workbook, `Evrak_Operasyon_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const exportFilteredExcel = async () => {
        const allAciklamalar = new Set();
        filteredEvraklar.forEach((evrak) => {
            evrak.evrakseferler?.forEach((s) => s.aciklama?.trim() && allAciklamalar.add(s.aciklama.trim()));
        });
        const aciklamaListesi = [...allAciklamalar].sort((a, b) => a.localeCompare(b, "tr"));
        const headers = ["Tarih", "Lokasyon", "Toplam Sefer", ...aciklamaListesi];

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Odak Lojistik - Evrak Takip Sistemi";
        const ws = workbook.addWorksheet("Detay Analiz", { properties: { tabColor: { argb: excelPalette.violet } } });

        applyWorkbookBranding(
            ws,
            "DETAY EVRAK ANALİZ RAPORU",
            `${filteredEvraklar.length} filtrelenmiş kayıt • Açıklama türlerine göre yatay karşılaştırma`,
            headers.length
        );
        ws.addRow(headers);
        styleHeaderRow(ws.getRow(5), excelPalette.violet);

        filteredEvraklar.forEach((evrak) => {
            const counter = {};
            aciklamaListesi.forEach((a) => (counter[a] = 0));
            evrak.evrakseferler?.forEach((s) => {
                const a = (s.aciklama || "").trim();
                if (counter[a] !== undefined) counter[a]++;
            });
            ws.addRow([
                new Date(evrak.tarih).toLocaleDateString("tr-TR"),
                lokasyonlar[evrak.lokasyonid] || "—",
                evrak.sefersayisi || 0,
                ...aciklamaListesi.map((a) => counter[a]),
            ]);
        });

        const lastRow = Math.max(6, ws.rowCount);
        styleDataRows(ws, 6, lastRow, headers.length);
        ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: headers.length } };
        ws.columns = headers.map((h, i) => ({ width: i === 0 ? 15 : i === 1 ? 28 : i === 2 ? 16 : Math.min(34, Math.max(18, String(h).length + 4)) }));

        if (filteredEvraklar.length) {
            const totalRow = ws.addRow(["", "GENEL TOPLAM", { formula: `SUM(C6:C${lastRow})` }, ...aciklamaListesi.map((_, idx) => ({ formula: `SUM(${ws.getColumn(idx + 4).letter}6:${ws.getColumn(idx + 4).letter}${lastRow})` }))]);
            totalRow.height = 28;
            totalRow.eachCell((cell) => {
                cell.font = { name: "Aptos", bold: true, color: { argb: excelPalette.white } };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: excelPalette.navy } };
                cell.alignment = { vertical: "middle", horizontal: "center" };
            });
        }

        ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
        ws.headerFooter.oddFooter = "&L&BOdak Lojistik&C&PDetay Analiz&R&P / &N";
        await saveExcelWorkbook(workbook, `Detay_Evrak_Analizi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const exportEvrakToExcel = async (evrak) => {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Odak Lojistik - Evrak Takip Sistemi";
        const ws = workbook.addWorksheet("Evrak Detayı", { properties: { tabColor: { argb: excelPalette.cyan } } });
        ws.views = [{ showGridLines: false, state: "frozen", ySplit: 4 }];
        ws.columns = [{ width: 28 }, { width: 28 }, { width: 22 }, { width: 22 }];

        ws.mergeCells("A1:D1");
        ws.getCell("A1").value = `EVRAK DETAY RAPORU  #${evrak.id}`;
        ws.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: excelPalette.white } };
        ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: excelPalette.navy } };
        ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
        ws.getRow(1).height = 36;

        ws.mergeCells("A2:D2");
        ws.getCell("A2").value = `Lokasyon: ${lokasyonlar[evrak.lokasyonid] || "Bilinmeyen Lokasyon"}  •  Tarih: ${new Date(evrak.tarih).toLocaleDateString("tr-TR")}`;
        ws.getCell("A2").font = { name: "Aptos", size: 11, color: { argb: "D7E3F4" } };
        ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: excelPalette.navy } };
        ws.getRow(2).height = 24;

        ws.addRow([]);
        ws.addRow(["ÖZET BİLGİLER", "", "", ""]);
        ws.mergeCells("A4:D4");
        styleHeaderRow(ws.getRow(4), excelPalette.cyan);
        ws.addRow(["Tarih", new Date(evrak.tarih).toLocaleDateString("tr-TR"), "Lokasyon", lokasyonlar[evrak.lokasyonid] || "—"]);
        ws.addRow(["Toplam Sefer", evrak.sefersayisi || 0, "Proje Sayısı", evrak.evrakproje?.length || 0]);
        styleDataRows(ws, 5, 6, 4);

        ws.addRow([]);
        const projeHeader = ws.addRow(["PROJE", "SEFER SAYISI"]);
        styleHeaderRow(projeHeader, excelPalette.blue);
        (evrak.evrakproje || []).forEach((p) => ws.addRow([projeler[p.projeid] || "Bilinmeyen Proje", p.sefersayisi || 0]));
        const projeEnd = ws.rowCount;
        if (projeEnd >= 9) styleDataRows(ws, 9, projeEnd, 2);

        ws.addRow([]);
        const seferHeaderRow = ws.rowCount + 1;
        const seferHeader = ws.addRow(["SEFER NO", "AÇIKLAMA"]);
        styleHeaderRow(seferHeader, excelPalette.emerald);
        (evrak.evrakseferler || []).forEach((s) => ws.addRow([s.seferno || "—", s.aciklama || "—"]));
        if (ws.rowCount > seferHeaderRow) styleDataRows(ws, seferHeaderRow + 1, ws.rowCount, 2);

        ws.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
        ws.headerFooter.oddFooter = `&L&BOdak Lojistik&C&Evrak #${evrak.id}&R&P / &N`;
        await saveExcelWorkbook(workbook, `Evrak_Detay_${evrak.id}_${new Date(evrak.tarih).toISOString().slice(0, 10)}.xlsx`);
    };

    // AI Asistan yönlendirmesi: Tüm Evraklar ekranındaki bütün filtreleri URL üzerinden uygular.
    useEffect(() => {
        if (loading || !evraklar.length) return;
        const params = new URLSearchParams(location.search);
        const aiSefer = params.get("aiSefer") || "";
        const aiEvrakId = params.get("aiEvrakId") || "";
        const aiStartDate = params.get("aiStartDate") || "";
        const aiEndDate = params.get("aiEndDate") || "";
        const aiAciklama = params.get("aiAciklama") || "";
        const aiLokasyon = params.getAll("aiLokasyon").filter(Boolean);
        const aiProje = params.getAll("aiProje").filter(Boolean);
        const hasAiFilter = aiSefer || aiEvrakId || aiStartDate || aiEndDate || aiAciklama || aiLokasyon.length || aiProje.length;
        if (!hasAiFilter) return;

        const next = {
            startDate: aiStartDate,
            endDate: aiEndDate,
            lokasyon: aiLokasyon,
            proje: aiProje,
            aciklama: aiAciklama,
            seferno: aiSefer,
        };
        setFilters(next);
        setDraft(next);
        setShowFilters(true);

        const matched = evraklar.find((evrak) =>
            (aiEvrakId && String(evrak.id) === String(aiEvrakId)) ||
            (aiSefer && (evrak.evrakseferler || []).some((s) =>
                String(s.seferno || "").toLocaleLowerCase("tr-TR").includes(String(aiSefer).toLocaleLowerCase("tr-TR"))
            ))
        );
        if (matched) {
            setHighlightedEvrakId(matched.id);
            setTimeout(() => document.getElementById(`evrak-row-${matched.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 450);
            const timer = setTimeout(() => setHighlightedEvrakId(null), 7000);
            return () => clearTimeout(timer);
        }
    }, [location.search, loading, evraklar]);

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

    const visiblePanelRows = useMemo(() => {
        const query = panelSearch.trim().toLocaleLowerCase("tr-TR");
        if (!query) return panelRows;
        return panelRows.filter((row) =>
            [row.evrakId, row.tarih, row.lokasyon, row.seferno, row.aciklama]
                .some((value) => String(value || "").toLocaleLowerCase("tr-TR").includes(query))
        );
    }, [panelRows, panelSearch]);

    const focusTableRow = (evrakId) => {
        setPanelOpen(false);
        setHighlightedEvrakId(evrakId);
        window.setTimeout(() => {
            document.getElementById(`evrak-row-${evrakId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 180);
        window.setTimeout(() => setHighlightedEvrakId(null), 2800);
    };

    const dailyTrendData = useMemo(() => {
        const grouped = {};
        filteredEvraklar.forEach((evrak) => {
            const key = evrak.tarih?.slice(0, 10);
            if (!key) return;
            if (!grouped[key]) grouped[key] = { date: key, evrak: 0, sefer: 0 };
            grouped[key].evrak += 1;
            grouped[key].sefer += Number(evrak.sefersayisi || 0);
        });
        return Object.values(grouped)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-10)
            .map((item) => ({ ...item, label: new Date(`${item.date}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) }));
    }, [filteredEvraklar]);

    const activeLocationCount = useMemo(
        () => new Set(filteredEvraklar.map((evrak) => String(evrak.lokasyonid)).filter(Boolean)).size,
        [filteredEvraklar]
    );

    const averageTrip = filteredEvraklar.length ? Math.round(filteredToplamSefer / filteredEvraklar.length) : 0;

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
                    className="min-h-screen bg-[#f5f7fa] text-slate-950 transition-colors duration-300 dark:bg-[#080e18] dark:text-slate-50
            [background-image:radial-gradient(900px_circle_at_10%_0%,rgba(6,182,212,0.08),transparent_45%),radial-gradient(800px_circle_at_90%_20%,rgba(37,99,235,0.06),transparent_48%)]
            dark:[background-image:radial-gradient(900px_circle_at_10%_0%,rgba(6,182,212,0.10),transparent_45%),radial-gradient(800px_circle_at_90%_20%,rgba(37,99,235,0.10),transparent_48%)]"
                >
                    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
                        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={goHome} className="group/back grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-300 hover:-translate-x-1 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-white/10 dark:bg-[#111927] dark:text-slate-300 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-950/20 dark:hover:text-cyan-300" title="Anasayfaya dön">
                                    <FiArrowLeft className="h-5 w-5 transition-transform group-hover/back:-translate-x-0.5" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-cyan-600 dark:text-cyan-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" /> Evrak operasyon merkezi</div>
                                    <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tüm Evraklar</h1>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kayıtları izle, karşılaştır, filtrele ve raporla.</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">

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

                                        <Btn
                                            variant="emerald"
                                            size="md"
                                            leftIcon={FiDownload}
                                            rightIcon={FiChevronRight}
                                            onClick={exportToExcel}
                                            className="min-w-[156px] ring-1 ring-emerald-300/20"
                                            title="Tüm evrak ve sefer kayıtlarını modern Excel raporu olarak indir"
                                        >
                                            <span className="flex flex-col items-start leading-tight">
                                                <span>Excel Raporu</span>
                                                <span className="text-[10px] font-semibold text-white/70">Tüm kayıtlar</span>
                                            </span>
                                        </Btn>

                                        <Btn
                                            variant="primary"
                                            size="md"
                                            leftIcon={FiLayers}
                                            rightIcon={FiChevronRight}
                                            onClick={exportFilteredExcel}
                                            className="min-w-[166px] ring-1 ring-cyan-300/20"
                                            title="Filtrelenmiş kayıtları açıklama kırılımlarıyla detaylı analiz olarak indir"
                                        >
                                            <span className="flex flex-col items-start leading-tight">
                                                <span>Detay Excel</span>
                                                <span className="text-[10px] font-semibold text-white/70">Analiz görünümü</span>
                                            </span>
                                        </Btn>
                            </div>
                        </div>

                        {hasActiveFilters && <div className="mb-4 flex flex-wrap gap-2"><Tag tone="warn"><FiFilter /> Filtre aktif</Tag><Tag tone="neutral">Tarih: {filters.startDate || "—"} <FiChevronRight /> {filters.endDate || "—"}</Tag></div>}

                        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: "Evrak Kaydı", value: filteredEvraklar.length, sub: "Görüntülenen kayıt", icon: FiFile, color: "from-blue-600 to-cyan-400" },
                                { label: "Toplam Sefer", value: filteredToplamSefer, sub: `Genel toplam ${toplamSefer}`, icon: FiActivity, color: "from-cyan-500 to-teal-400" },
                                { label: "Aktif Lokasyon", value: activeLocationCount, sub: "Operasyon noktası", icon: FiMapPin, color: "from-violet-600 to-blue-500" },
                                { label: "Kayıt Başına", value: averageTrip, sub: "Ortalama sefer", icon: FiTrendingUp, color: "from-emerald-600 to-teal-400" },
                            ].map(({ label, value, sub, icon: Icon, color }) => (
                                <div key={label} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.055)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/70 hover:shadow-[0_18px_42px_rgba(8,145,178,.10)] dark:border-white/[0.08] dark:bg-[#111927] dark:hover:border-cyan-500/25">
                                    <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-[0.08] blur-xl transition group-hover:scale-125`} />
                                    <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-black tracking-tight">{Number(value).toLocaleString("tr-TR")}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></div><div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110`}><Icon /></div></div>
                                </div>
                            ))}
                        </div>

                        {!showFilters && (
                            <div className="mb-6 grid gap-5 2xl:grid-cols-[1.35fr_.65fr]">
                                <ModernSummary className="!border-slate-200/80 !bg-white dark:!border-white/[0.08] dark:!bg-[#111927]" title="Açıklama Dağılımı" data={filteredAciklamaVerileri()} total={filteredToplamSefer} onCardClick={openCardPanel} />
                                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.055)] dark:border-white/[0.08] dark:bg-[#111927]">
                                    <div className="flex items-start justify-between"><div><h3 className="flex items-center gap-2 font-extrabold"><FiTrendingUp className="text-cyan-500" /> Günlük Hareket</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Son 10 operasyon günü</p></div><Tag tone="info">Evrak + Sefer</Tag></div>
                                    <div className="mt-5 h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyTrendData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="evrakArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35}/><stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02}/></linearGradient><linearGradient id="seferArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.25}/><stop offset="100%" stopColor="#2563eb" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid strokeDasharray="4 4" stroke="#94a3b8" opacity={0.16}/><XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid rgba(148,163,184,.2)", boxShadow: "0 12px 30px rgba(15,23,42,.12)" }}/><Area type="monotone" dataKey="sefer" name="Sefer" stroke="#2563eb" strokeWidth={2.5} fill="url(#seferArea)"/><Area type="monotone" dataKey="evrak" name="Evrak" stroke="#06b6d4" strokeWidth={2.5} fill="url(#evrakArea)"/></AreaChart></ResponsiveContainer>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* Tablo */}
                        {loading ? (
                            <TableSkeleton />
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_38px_rgba(15,23,42,.06)] dark:border-white/[0.08] dark:bg-[#111927]">
                                <div className="overflow-auto">
                                    <table className="w-full min-w-[1180px] border-collapse">
                                        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-[#0c1522]/95">
                                            <tr className="text-left text-[11px] font-black uppercase tracking-[.08em] text-slate-500 dark:text-slate-400">
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
                                                        id={`evrak-row-${evrak.id}`}
                                                        key={evrak.id}
                                                        className={cx(
                                                            "group/row scroll-mt-28 bg-white transition-all duration-700 hover:bg-cyan-50/45 dark:bg-transparent dark:hover:bg-cyan-950/10",
                                                            highlightedEvrakId === evrak.id && "relative z-[1] !bg-cyan-100/90 shadow-[inset_4px_0_0_#06b6d4,0_0_35px_rgba(6,182,212,.28)] dark:!bg-cyan-950/35"
                                                        )}
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
                                                                leftIcon={FiLayers}
                                                                rightIcon={isProjelerVisible ? FiChevronUp : FiChevronDown}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAcikProjeId(isProjelerVisible ? null : evrak.id);
                                                                }}
                                                            >
                                                                {isProjelerVisible ? "Projeleri Kapat" : `${evrak.evrakproje?.length || 0} Proje`}
                                                            </Btn>

                                                            {isProjelerVisible && (
                                                                <ul className="mt-2 grid min-w-[250px] gap-2 rounded-xl border border-cyan-200/70 bg-gradient-to-br from-white to-cyan-50/60 p-3 shadow-[0_12px_30px_rgba(8,145,178,.10)] dark:border-cyan-500/20 dark:from-[#101a29] dark:to-cyan-950/15">
                                                                    {evrak.evrakproje?.map((p, idx) => (
                                                                        <li key={idx} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-xs dark:border-white/[0.07] dark:bg-white/[0.04]">
                                                                            <span className="truncate font-extrabold">{projeler[p.projeid]}</span>
                                                                            <span className="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 font-black text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">{p.sefersayisi} sefer</span>
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
                                                                leftIcon={FiEye}
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
                                                                Excel Detay
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
                        <div className="fixed inset-x-0 bottom-0 top-[68px] z-[10020]">
                            <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]" onClick={() => setShowFilters(false)} />

                            <div className="absolute left-0 top-0 flex h-full w-full max-w-[460px] flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-900 shadow-[24px_0_70px_rgba(2,8,23,.28)] dark:border-white/10 dark:bg-[#0d1624] dark:text-slate-100"
                            >
                                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50/60 p-5 dark:border-white/10 dark:from-[#0d1624] dark:to-cyan-950/20">
                                    <div>
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-600 dark:text-cyan-400"><FiFilter /> Akıllı filtre</div>
                                        <h3 className="mt-1 text-xl font-black">Gelişmiş Filtreler</h3>
                                    </div>

                                    <IconBtn title="Kapat" onClick={() => setShowFilters(false)}>
                                        <FiX />
                                    </IconBtn>
                                </div>

                                <div className="flex-1 overflow-y-auto p-5">
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
                        </div>
                    )}

                    {/* ✅ DETAY CARD */}
                    {showDetailCard && detailEvrak && (
                        <div className="fixed inset-x-0 bottom-0 top-[68px] z-[10020]">
                            <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]" onClick={() => setShowDetailCard(false)} />
                            <div className="absolute right-0 top-0 h-full w-full max-w-[760px] overflow-y-auto border-l border-slate-200 bg-white p-6 text-slate-900 shadow-[-24px_0_70px_rgba(2,8,23,.28)] dark:border-white/10 dark:bg-[#0d1624] dark:text-slate-100"
                            >
                                <div className="sticky -top-6 z-10 -mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1624]/95">
                                    <div>
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-600 dark:text-cyan-400"><FiEye /> Kayıt görünümü</div>
                                        <h3 className="mt-1 text-xl font-black">Evrak #{detailEvrak.id}</h3>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tüm proje ve sefer bilgileri</p>
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
                                    <Btn
                                        variant="emerald"
                                        size="md"
                                        leftIcon={FiDownload}
                                        rightIcon={FiChevronRight}
                                        onClick={() => exportEvrakToExcel(detailEvrak)}
                                        className="min-w-[178px] ring-1 ring-emerald-300/20"
                                    >
                                        <span className="flex flex-col items-start leading-tight">
                                            <span>Detay Excel</span>
                                            <span className="text-[10px] font-semibold text-white/70">Bu evrak kaydı</span>
                                        </span>
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
                        <div className="fixed inset-x-0 bottom-0 top-[68px] z-[10020]">
                            <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]" onClick={() => setPanelOpen(false)} />
                            <div
                                className="absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-slate-200 bg-white p-5 text-slate-900 shadow-[-24px_0_70px_rgba(2,8,23,.28)] sm:w-[720px] dark:border-white/10 dark:bg-[#0d1624] dark:text-slate-100"
                            >
                                <div className="sticky -top-5 z-20 -mx-5 -mt-5 mb-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1624]/95">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-600 dark:text-cyan-400"><FiActivity /> Grafik detayı</div>
                                            <h3 className="mt-1 max-w-[560px] truncate text-lg font-black">{panelTitle}</h3>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{visiblePanelRows.length} / {panelRows.length} satır gösteriliyor</p>
                                        </div>
                                        <IconBtn title="Kapat" onClick={() => setPanelOpen(false)}><FiX /></IconBtn>
                                    </div>

                                    <div className="relative mt-4">
                                        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500" />
                                        <input
                                            value={panelSearch}
                                            onChange={(event) => setPanelSearch(event.target.value)}
                                            placeholder="Evrak no, sefer no, lokasyon veya açıklama ara…"
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm font-semibold outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-[#0a121e] dark:focus:border-cyan-500"
                                        />
                                        {panelSearch && <button type="button" onClick={() => setPanelSearch("")} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><FiX /></button>}
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-[145px] z-10 bg-slate-50/95 backdrop-blur dark:bg-[#111b2a]/95">
                                            <tr className="text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">#</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">Tarih</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">Evrak</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">Lokasyon</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10">Sefer No</th>
                                                <th className="px-3 py-3 border-b border-violet-200/60 dark:border-white/10 text-right">Tablo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visiblePanelRows.map((r, i) => (
                                                <tr key={`${r.evrakId}-${i}`} className="odd:bg-slate-50/70 transition-colors hover:bg-cyan-50/70 dark:odd:bg-white/[0.025] dark:hover:bg-cyan-950/15">
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10 font-extrabold">{i + 1}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10">{new Date(r.tarih).toLocaleDateString("tr-TR")}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10">#{r.evrakId}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10">{r.lokasyon}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 dark:border-white/10">{r.seferno}</td>
                                                    <td className="px-3 py-3 border-b border-violet-200/40 text-right dark:border-white/10">
                                                        <button type="button" onClick={() => focusTableRow(r.evrakId)} className="group/find inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-black text-cyan-700 transition-all hover:-translate-y-0.5 hover:bg-cyan-600 hover:text-white hover:shadow-[0_8px_20px_rgba(8,145,178,.22)] dark:border-cyan-500/20 dark:bg-cyan-950/20 dark:text-cyan-300 dark:hover:bg-cyan-600 dark:hover:text-white"><FiTarget className="transition-transform group-hover/find:scale-125" /> Bul</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {visiblePanelRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-3 py-14 text-center text-zinc-600 dark:text-zinc-300">
                                                        <FiSearch className="mx-auto mb-3 h-7 w-7 text-slate-400" /> Aramana uygun kayıt bulunamadı.
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
