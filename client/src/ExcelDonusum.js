// ==========================
// 📌 IMPORTLAR
// ==========================
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import ReactToPrint from "react-to-print";
import { useNavigate } from "react-router-dom";
import useDarkMode from "./hooks/useDarkMode";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
    Trash2,
    Eye,
    EyeOff,
    GripVertical,
    Download,
    Upload,
    Loader2,
    FileText,
    ArrowLeft,
    FileSpreadsheet,
    Columns3,
    Search,
    CheckCircle2,
    Sparkles,
    Printer,
    UploadCloud,
    ClipboardPaste,
    Rows3,
    SlidersHorizontal,
    X,
    RotateCcw
} from "lucide-react";

// WORD EXPORT (RESİM)
import html2canvas from "html2canvas";
import {
    Document,
    Packer,
    Paragraph,
    ImageRun
} from "docx";
import { saveAs } from "file-saver";


// ==========================
// 📄 PRINT (PDF) İÇERİĞİ
// ==========================
const PrintLayout = React.forwardRef(({ columns, rows }, ref) => {
    const visible = columns.filter((c) => c.visible);

    const preparedRows = rows.map((row) =>
        visible.map((c) => row[parseInt(c.id.split("-")[1])] || "—")
    );

    return (
        <div
            ref={ref}
            style={{
                padding: "20px",
                background: "white",
                color: "black",
                minHeight: "100vh",
                fontSize: "10px"
            }}
        >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        {visible.map((c) => (
                            <th
                                key={c.id}
                                style={{
                                    border: "1px solid #000",
                                    padding: "3px",
                                    textAlign: "left"
                                }}
                            >
                                {c.name}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {preparedRows.map((row, r) => (
                        <tr key={r}>
                            {row.map((cell, c) => (
                                <td
                                    key={c}
                                    style={{
                                        border: "1px solid #000",
                                        padding: "3px",
                                        fontSize: "9px"
                                    }}
                                >
                                    {String(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});


// ==========================
// 🌑 SÜTUN COMPONENT
// ==========================
function SortableColumn({ col, toggleColumn, removeColumn, index }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: col.id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={`group flex min-h-[62px] items-center justify-between gap-3 rounded-2xl border bg-white px-3.5 py-3 transition-all duration-200 dark:bg-[#111927] ${
                isDragging
                    ? "z-20 border-sky-300 shadow-2xl shadow-sky-500/15 ring-4 ring-sky-100 dark:ring-sky-500/10"
                    : "border-slate-200/80 shadow-sm hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-white/[.08]"
            }`}
        >
            <div className="flex min-w-0 items-center gap-3">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="grid h-9 w-9 shrink-0 cursor-grab place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 active:cursor-grabbing dark:border-white/10 dark:bg-white/[.035] dark:hover:bg-sky-500/10"
                    title="Sürükleyerek sırala"
                >
                    <GripVertical size={16} />
                </button>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="grid h-6 min-w-6 place-items-center rounded-lg bg-slate-100 px-1.5 text-[9px] font-black text-slate-500 dark:bg-white/[.05] dark:text-slate-400">
                            {index + 1}
                        </span>
                        <span className={`truncate text-sm font-black ${col.visible ? "text-slate-800 dark:text-slate-100" : "text-slate-400 line-through"}`}>
                            {col.name}
                        </span>
                    </div>
                    <span className="mt-1 block text-[10px] font-bold text-slate-400">
                        {col.visible ? "Çıktıda gösterilecek" : "Çıktıda gizlenecek"}
                    </span>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => toggleColumn(col.id)}
                    className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                        col.visible
                            ? "border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
                            : "border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600 dark:border-white/10 dark:bg-white/[.035]"
                    }`}
                    title={col.visible ? "Sütunu gizle" : "Sütunu göster"}
                >
                    {col.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>

                <button
                    type="button"
                    onClick={() => removeColumn(col.id)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-white/10 dark:bg-white/[.025] dark:hover:bg-rose-500/10"
                    title="Sütunu kaldır"
                >
                    <Trash2 size={15} />
                </button>
            </div>
        </div>
    );
}


// ==========================
// 💻 ANA COMPONENT
// ==========================
export default function ExcelDonusum() {

    const navigate = useNavigate();
    useDarkMode();
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [fileName, setFileName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [notice, setNotice] = useState("");
    const [previewQuery, setPreviewQuery] = useState("");

    const printRef = useRef();
    const fileInputRef = useRef();

    // ==========================
    // 📌 EXCEL'DEN YAPIŞTIRMA
    // ==========================
    React.useEffect(() => {
        const handlePaste = (e) => {
            let text = e.clipboardData.getData("text/plain");
            if (!text) return;

            const parsed = text
                .trim()
                .split("\n")
                .map((row) => row.split("\t"));

            if (!parsed.length) return;

            const headerRow = parsed[0];

            const newCols = headerRow.map((h, i) => ({
                id: `col-${i}`,
                name: h || `Sütun ${i + 1}`,
                visible: true,
            }));

            setColumns(newCols);
            setRows(parsed.slice(1));

            setFileName("Panodan yapıştırılan veri");
            setNotice(`${parsed.slice(1).length.toLocaleString("tr-TR")} satır panodan aktarıldı.`);
            setTimeout(() => setNotice(""), 3200);
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);


    // ==========================
    // 📌 EXCEL YÜKLEME
    // ==========================
    const processExcelFile = (file) => {
        if (!file) return;

        setFileName(file.name);
        setIsLoading(true);
        setNotice("");

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: "binary" });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                const headerRow = data[0];
                if (!headerRow) {
                    setNotice("Dosyada okunabilir bir başlık satırı bulunamadı.");
                    return;
                }

                const newCols = headerRow.map((h, i) => ({
                    id: `col-${i}`,
                    name: h || `Sütun ${i + 1}`,
                    visible: true,
                }));

                setColumns(newCols);
                setRows(data.slice(1));
                setNotice(`${data.slice(1).length.toLocaleString("tr-TR")} satır ve ${newCols.length} sütun başarıyla hazırlandı.`);
                setTimeout(() => setNotice(""), 3600);
            } catch (error) {
                console.error(error);
                setNotice("Dosya okunamadı. Lütfen geçerli bir Excel dosyası seçin.");
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setIsLoading(false);
            setNotice("Dosya okunurken bir sorun oluştu.");
        };
        reader.readAsBinaryString(file);
    };

    const handleFileUpload = (e) => {
        processExcelFile(e.target.files?.[0]);
        e.target.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        processExcelFile(e.dataTransfer.files?.[0]);
    };


    // ==========================
    // 📌 DRAG-DROP
    // ==========================
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;

        setColumns((cols) => {
            const oldIndex = cols.findIndex((c) => c.id === active.id);
            const newIndex = cols.findIndex((c) => c.id === over.id);
            return arrayMove(cols, oldIndex, newIndex);
        });
    };


    // ==========================
    // 📌 SÜTUN GÖSTER/GİZLE
    // ==========================
    const toggleColumn = (id) =>
        setColumns((cols) =>
            cols.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
        );


    // ==========================
    // 📌 SÜTUN SİL
    // ==========================
    const removeColumn = (id) =>
        setColumns((cols) => cols.filter((c) => c.id !== id));



    // ==========================
    // 📌 EXCEL EXPORT
    // ==========================
    const handleDownloadExcel = () => {
        const visible = columns.filter((c) => c.visible);

        const header = visible.map((c) => c.name);
        const data = [header];

        rows.forEach((row) =>
            data.push(visible.map((c) => row[parseInt(c.id.split("-")[1])] || "—"))
        );

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, "Veri");
        XLSX.writeFile(wb, `duzenlenmis_${fileName}`);
    };



    // ==========================
    // 📌 WORD EXPORT (TABLOYU PNG OLARAK — ZEBRA + RENKLİ BAŞLIK)
    // ==========================
    const handleDownloadWord = async () => {
        const visible = columns.filter((c) => c.visible);

        // ---- 1) TABLOYU GEÇİCİ DOM'DA OLUŞTUR ----
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "absolute";
        tempDiv.style.top = "0";
        tempDiv.style.left = "0";
        tempDiv.style.zIndex = "-9999";
        tempDiv.style.background = "white";
        tempDiv.style.padding = "20px";
        tempDiv.style.fontSize = "13px";

        // -----------------------
        // 🎨 ŞIK TASARIMLI TABLO
        // -----------------------
        let html = `
        <table style="
            border-collapse: collapse;
            width: 100%;
            border-radius: 10px;
            overflow: hidden;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        ">
            <thead>
                <tr style="
                    background:#0F172A;
                    color:white;
                    font-weight:bold;
                    text-transform:uppercase;
                    letter-spacing:0.5px;
                ">
        `;

        // Başlık hücreleri
        visible.forEach((c) => {
            html += `
                <th style="
                    padding:10px;
                    border:1px solid #334155;
                    text-align:left;
                ">
                    ${c.name}
                </th>`;
        });

        html += `
                </tr>
            </thead>
            <tbody>
        `;

        // Satırlar (Zebra)
        rows.forEach((row, i) => {
            const bg = i % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

            html += `<tr style="background:${bg};">`;

            visible.forEach((c) => {
                const val = row[parseInt(c.id.split("-")[1])] || "—";

                html += `
                    <td style="
                        padding:8px 10px;
                        border:1px solid #DDD;
                        font-size:13px;
                    ">
                        ${val}
                    </td>
                `;
            });

            html += "</tr>";
        });

        html += `
            </tbody>
        </table>
        `;

        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);

        // ---- 2) PNG OLUŞTUR ----
        const canvas = await html2canvas(tempDiv, { scale: 2 });
        document.body.removeChild(tempDiv);

        const dataUrl = canvas.toDataURL("image/png");
        const imgData = await fetch(dataUrl).then((r) => r.arrayBuffer());

        // ---- 3) WORD DOSYASI ----
        const doc = new Document({
            sections: [
                {
                    properties: {
                        page: { size: { orientation: "landscape" } }
                    },
                    children: [
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imgData,
                                    transformation: {
                                        width: 1000,
                                        height: Math.floor((canvas.height / canvas.width) * 1000)
                                    }
                                })
                            ]
                        })
                    ]
                }
            ]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `duzenlenmis_${fileName.replace(".xlsx", "")}.docx`);
    };



    const visibleColumns = columns.filter((c) => c.visible);
    const hiddenColumns = columns.length - visibleColumns.length;
    const filteredPreviewRows = rows.filter((row) => {
        const q = previewQuery.trim().toLocaleLowerCase("tr-TR");
        if (!q) return true;
        return visibleColumns.some((c) =>
            String(row[parseInt(c.id.split("-")[1])] ?? "")
                .toLocaleLowerCase("tr-TR")
                .includes(q)
        );
    });
    const previewRows = filteredPreviewRows.slice(0, 20);
    const hasData = columns.length > 0;

    const resetWorkspace = () => {
        setColumns([]);
        setRows([]);
        setFileName("");
        setPreviewQuery("");
        setNotice("");
    };

    // ==========================
    // 📌 RENDER
    // ==========================
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 transition-colors dark:bg-[#0b1220] dark:text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1880px]">
                {/* Header */}
                <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_44px_rgba(15,23,42,.055)] dark:border-white/[.08] dark:bg-[#111927] dark:shadow-[0_18px_50px_rgba(0,0,0,.25)]">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-500" />
                    <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                            <button
                                type="button"
                                onClick={() => navigate("/anasayfa")}
                                className="group grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-x-0.5 hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300"
                                title="Ana sayfaya dön"
                            >
                                <ArrowLeft size={18} className="transition group-hover:-translate-x-0.5" />
                            </button>

                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-400 text-white shadow-lg shadow-sky-500/20">
                                <FileSpreadsheet size={23} />
                            </div>

                            <div>
                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                        Dosya Dönüşüm Merkezi
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                        <Sparkles size={12} className="text-cyan-500" />
                                        Excel • Word • PDF
                                    </span>
                                </div>
                                <h1 className="text-2xl font-black tracking-[-.035em] text-slate-950 dark:text-white sm:text-3xl">
                                    Excel & Word
                                </h1>
                                <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                                    Excel dosyanızı yükleyin veya tablonuzu doğrudan yapıştırın; sütunları düzenleyin, önizleyin ve istediğiniz formatta dışa aktarın.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {hasData && (
                                <button
                                    type="button"
                                    onClick={resetWorkspace}
                                    className="group inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-white/10 dark:bg-white/[.035] dark:text-slate-300 dark:hover:bg-rose-500/10"
                                >
                                    <RotateCcw size={15} className="transition group-hover:-rotate-45" />
                                    Çalışmayı Sıfırla
                                </button>
                            )}
                            <div className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-black ${
                                hasData
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[.035] dark:text-slate-400"
                            }`}>
                                <span className={`h-2 w-2 rounded-full ${hasData ? "bg-emerald-500" : "bg-slate-300"}`} />
                                {hasData ? "Veri Hazır" : "Dosya Bekleniyor"}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Workflow */}
                <section className="mt-4 grid gap-2 rounded-[20px] border border-slate-200/80 bg-white p-3 shadow-sm dark:border-white/[.08] dark:bg-[#111927] md:grid-cols-3">
                    {[
                        { no: 1, title: "Veriyi Yükle", text: "Excel seç veya Ctrl+V ile yapıştır", active: !hasData, done: hasData, icon: UploadCloud },
                        { no: 2, title: "Sütunları Düzenle", text: "Sırala, gizle veya kaldır", active: hasData, done: hasData && hiddenColumns >= 0, icon: Columns3 },
                        { no: 3, title: "Önizle & Dışa Aktar", text: "Excel, Word veya PDF oluştur", active: hasData, done: false, icon: Download },
                    ].map((step) => {
                        const Icon = step.icon;
                        return (
                            <div key={step.no} className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition ${
                                step.active || step.done
                                    ? "border-sky-100 bg-sky-50/60 dark:border-sky-500/10 dark:bg-sky-500/[.045]"
                                    : "border-transparent bg-slate-50/70 dark:bg-white/[.025]"
                            }`}>
                                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                                    step.done
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                        : step.active
                                            ? "bg-sky-600 text-white shadow-md shadow-sky-500/15"
                                            : "bg-slate-200 text-slate-500 dark:bg-white/[.06] dark:text-slate-400"
                                }`}>
                                    {step.done ? <CheckCircle2 size={17} /> : <Icon size={17} />}
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Adım {step.no}</span>
                                    <div className="mt-0.5 text-xs font-black text-slate-800 dark:text-slate-100">{step.title}</div>
                                    <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{step.text}</div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {notice && (
                    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-800 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                        <CheckCircle2 size={16} className="shrink-0" />
                        {notice}
                    </div>
                )}

                {/* Upload */}
                <section className="mt-4 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_38px_rgba(15,23,42,.045)] dark:border-white/[.08] dark:bg-[#111927]">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[.14em] text-sky-600 dark:text-sky-300">Veri Kaynağı</span>
                            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">Excel dosyanızı hazırlayın</h2>
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                Dosya yükleyebilir veya Excel'deki tabloyu kopyalayıp bu ekranda <strong>Ctrl+V</strong> ile yapıştırabilirsiniz.
                            </p>
                        </div>
                        {hasData && (
                            <div className="flex flex-wrap gap-2 text-[10px] font-black">
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600 dark:bg-white/[.05] dark:text-slate-300">
                                    {rows.length.toLocaleString("tr-TR")} satır
                                </span>
                                <span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                    {columns.length} sütun
                                </span>
                            </div>
                        )}
                    </div>

                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />

                    <div
                        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                        onDrop={handleDrop}
                        onClick={() => !isLoading && fileInputRef.current?.click()}
                        className={`group relative cursor-pointer overflow-hidden rounded-[20px] border-2 border-dashed p-7 text-center transition-all duration-200 ${
                            dragActive
                                ? "border-sky-400 bg-sky-50 shadow-lg shadow-sky-500/10 dark:bg-sky-500/10"
                                : fileName
                                    ? "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/[.055]"
                                    : "border-slate-200 bg-slate-50/80 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/60 dark:border-white/10 dark:bg-[#0d141f] dark:hover:bg-sky-500/[.05]"
                        }`}
                    >
                        {isLoading ? (
                            <div className="mx-auto flex max-w-md flex-col items-center py-5">
                                <div className="relative grid h-16 w-16 place-items-center">
                                    <span className="absolute inset-0 animate-ping rounded-2xl bg-sky-400/15" />
                                    <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-400 text-white shadow-lg shadow-sky-500/20">
                                        <Loader2 size={24} className="animate-spin" />
                                    </div>
                                </div>
                                <div className="mt-4 text-sm font-black text-slate-800 dark:text-white">Excel verileri hazırlanıyor</div>
                                <div className="mt-1 text-xs font-medium text-slate-400">Başlıklar ve satırlar okunuyor…</div>
                                <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                    <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-sky-600 to-cyan-400" />
                                </div>
                            </div>
                        ) : (
                            <div className="mx-auto max-w-xl py-4">
                                <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl transition group-hover:scale-105 ${
                                    fileName
                                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                                        : "bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"
                                }`}>
                                    {fileName ? <CheckCircle2 size={24} /> : <UploadCloud size={25} />}
                                </div>
                                <div className="mt-3 text-sm font-black text-slate-800 dark:text-white">
                                    {fileName || "Dosyayı buraya bırakın veya seçmek için tıklayın"}
                                </div>
                                <div className="mt-1.5 text-xs font-medium text-slate-400">
                                    {fileName ? "Dosyayı değiştirmek için yeniden tıklayın veya başka bir dosya bırakın." : ".xlsx, .xls veya .csv dosyaları desteklenir."}
                                </div>
                                {!fileName && (
                                    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[.035] dark:text-slate-300">
                                        <ClipboardPaste size={14} className="text-cyan-500" />
                                        Alternatif: Excel'den kopyala → Ctrl+V
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {hasData ? (
                    <>
                        {/* Summary */}
                        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: "Toplam Satır", value: rows.length, icon: Rows3, note: "İçe aktarılan veri" },
                                { label: "Toplam Sütun", value: columns.length, icon: Columns3, note: "Kaynak başlıklar" },
                                { label: "Görünür Sütun", value: visibleColumns.length, icon: Eye, note: "Çıktıya dahil" },
                                { label: "Gizli Sütun", value: hiddenColumns, icon: EyeOff, note: "Çıktıdan hariç" },
                            ].map((card) => {
                                const Icon = card.icon;
                                return (
                                    <div key={card.label} className="rounded-[18px] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[.08] dark:bg-[#111927]">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{card.label}</span>
                                                <div className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{Number(card.value).toLocaleString("tr-TR")}</div>
                                                <div className="mt-1 text-[10px] font-semibold text-slate-400">{card.note}</div>
                                            </div>
                                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                                                <Icon size={19} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </section>

                        {/* Column management */}
                        <section className="mt-4 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_38px_rgba(15,23,42,.045)] dark:border-white/[.08] dark:bg-[#111927]">
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-[.14em] text-sky-600 dark:text-sky-300">Görünüm Ayarları</span>
                                    <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">Sütunları düzenleyin</h2>
                                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Sürükleyerek sıralayın, göz ikonuyla gizleyin veya gereksiz sütunları kaldırın.
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-500 dark:bg-white/[.035] dark:text-slate-300">
                                    <SlidersHorizontal size={14} className="text-sky-500" />
                                    {visibleColumns.length}/{columns.length} görünür
                                </div>
                            </div>

                            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                                    <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
                                        {columns.map((col, index) => (
                                            <SortableColumn
                                                key={col.id}
                                                col={col}
                                                index={index}
                                                toggleColumn={toggleColumn}
                                                removeColumn={removeColumn}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </section>

                        {/* Preview + outputs */}
                        <section className="mt-4 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_38px_rgba(15,23,42,.045)] dark:border-white/[.08] dark:bg-[#111927]">
                            <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 dark:border-white/[.07] xl:flex-row xl:items-center xl:justify-between">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-[.14em] text-sky-600 dark:text-sky-300">Canlı Veri Görünümü</span>
                                    <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">Önizleme & Çıktı</h2>
                                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        İlk 20 eşleşen satır gösterilir. Dışa aktarma tüm veriyi kullanır.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <ReactToPrint
                                        trigger={() => (
                                            <button className="group inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-600 dark:border-white/10 dark:bg-white/[.035] dark:text-slate-200">
                                                <Printer size={15} className="transition group-hover:scale-110" />
                                                Yazdır / PDF
                                            </button>
                                        )}
                                        content={() => printRef.current}
                                    />

                                    <button
                                        onClick={handleDownloadExcel}
                                        className="group inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-black text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    >
                                        <FileSpreadsheet size={15} className="transition group-hover:scale-110" />
                                        Excel İndir
                                    </button>

                                    <button
                                        onClick={handleDownloadWord}
                                        className="group inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-3.5 text-xs font-black text-white shadow-lg shadow-sky-500/15 transition hover:-translate-y-0.5 hover:shadow-sky-500/25"
                                    >
                                        <FileText size={15} className="transition group-hover:scale-110" />
                                        Word İndir
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-white/[.05] sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative w-full max-w-xl">
                                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={previewQuery}
                                        onChange={(e) => setPreviewQuery(e.target.value)}
                                        placeholder="Önizleme içinde ara…"
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-white dark:focus:ring-sky-500/10"
                                    />
                                    {previewQuery && (
                                        <button type="button" onClick={() => setPreviewQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="shrink-0 text-[10px] font-black text-slate-400">
                                    {filteredPreviewRows.length.toLocaleString("tr-TR")} eşleşme • {visibleColumns.length} sütun
                                </div>
                            </div>

                            <div className="max-h-[620px] overflow-auto">
                                <table className="min-w-full border-separate border-spacing-0 text-left">
                                    <thead className="sticky top-0 z-10 bg-slate-950 text-white">
                                        <tr>
                                            {visibleColumns.map((c) => (
                                                <th
                                                    key={c.id}
                                                    className="whitespace-nowrap border-b border-r border-white/10 px-4 py-3.5 text-[9px] font-black uppercase tracking-[.1em] text-slate-300 last:border-r-0"
                                                >
                                                    {c.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {previewRows.length ? previewRows.map((r, ri) => (
                                            <tr key={ri} className="group bg-white transition hover:bg-sky-50/55 dark:bg-[#111927] dark:hover:bg-sky-500/[.045]">
                                                {visibleColumns.map((c, ci) => (
                                                    <td
                                                        key={ci}
                                                        className="max-w-[360px] border-b border-r border-slate-100 px-4 py-3 text-xs font-semibold text-slate-600 last:border-r-0 dark:border-white/[.05] dark:text-slate-300"
                                                    >
                                                        <div className="max-h-16 overflow-hidden break-words">
                                                            {String(r[parseInt(c.id.split("-")[1])] ?? "—") || "—"}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={Math.max(visibleColumns.length, 1)} className="px-6 py-16 text-center">
                                                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[.05]">
                                                        <Search size={22} />
                                                    </div>
                                                    <div className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">Eşleşen kayıt bulunamadı</div>
                                                    <div className="mt-1 text-xs font-medium text-slate-400">Arama metnini değiştirin veya temizleyin.</div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                ) : (
                    <section className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-white/10 dark:bg-[#111927]/80">
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[.05]">
                            <FileSpreadsheet size={27} />
                        </div>
                        <h3 className="mt-4 text-base font-black text-slate-800 dark:text-white">Çalışmaya başlamak için veri ekleyin</h3>
                        <p className="mx-auto mt-2 max-w-lg text-xs font-medium leading-5 text-slate-400">
                            Excel dosyası yüklediğinizde veya tabloyu Ctrl+V ile yapıştırdığınızda sütun yönetimi ve çıktı araçları otomatik açılacak.
                        </p>
                    </section>
                )}

                {/* Print DOM */}
                <div style={{ display: "none" }}>
                    <PrintLayout ref={printRef} columns={columns} rows={rows} />
                </div>

                <footer className="mt-6 flex items-center justify-center gap-2 text-[9px] font-semibold text-slate-400">
                    <span>© {new Date().getFullYear()} Odak Lojistik</span>
                    <span>•</span>
                    <span>Excel & Word Dönüşüm Merkezi</span>
                </footer>
            </div>
        </div>
    );
}

