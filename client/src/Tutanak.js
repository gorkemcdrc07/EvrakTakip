import React, { useRef, useState } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import htmlDocx from "html-docx-js/dist/html-docx";
import { useNavigate } from "react-router-dom";
import "./Tutanak.css";

const COLORS = {
    yellow: "#ffff00",
    green: "#00ff00",
    red: "#ff0000",
    blue: "#0000c0",
    gray: "#bfbfbf",
};

export default function Tutanak() {
    const navigate = useNavigate();
    const contentRef = useRef(null);
    const fileInputRef = useRef(null);

    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState("");

    const [form, setForm] = useState({
        isveren: "Odak Tedarik Zinciri ve Lojistik A.Ş. (Alemdağ VD, 6340954050)",
        tasiyici: "",
        musteri: "",
        plaka: "",
        tarih: "",
        seferNo: "",
    });

    const safe = (value) => value || "---";

    const getValue = (row, keys) => {
        for (const key of keys) {
            const value = row[key];
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return String(value).trim();
            }
        }
        return "";
    };

    const formatDate = (value) => {
        if (!value) return "";
        if (typeof value === "number") {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (parsed) {
                return `${String(parsed.d).padStart(2, "0")}.${String(parsed.m).padStart(2, "0")}.${parsed.y}`;
            }
        }
        const text = String(value).trim();
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return text;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text.replaceAll("/", ".");
        const parsed = new Date(text);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString("tr-TR");
        }
        return text;
    };

    const fillFormFromRow = (row) => {
        const plaka = getValue(row, ["Plaka", "Araç Plaka", "Çekici", "Cekici"]);
        const dorse = getValue(row, ["Treyler", "Dorse"]);
        setForm({
            isveren: "Odak Tedarik Zinciri ve Lojistik A.Ş. (Alemdağ VD, 6340954050)",
            tasiyici: getValue(row, ["Tedarikçi Firma", "Tedarikci Firma", "Taşıyıcı", "Tasiyici", "Araç Ruhsat Sahibi"]),
            musteri: getValue(row, ["Müşteri Adı", "Musteri Adi", "Teslim Alan Firma", "Alıcı Firma", "Alici Firma"]),
            plaka: [plaka, dorse].filter(Boolean).join(" / "),
            tarih: formatDate(getValue(row, ["Sefer Tarihi", "Sevkiyat Sefer Tarihi", "Teslim Edilme Tarihi", "Tarih"])),
            seferNo: getValue(row, ["Sefer No", "Sevkiyat Sefer Numarası", "Sevkiyat Sefer Numarasi"]),
        });
    };

    const readExcelFile = async (file) => {
        if (!file) return;
        const fileLower = file.name.toLowerCase();
        const valid = [".xlsx", ".xls", ".csv"].some((ext) => fileLower.endsWith(ext));
        if (!valid) {
            alert("Lütfen .xlsx, .xls veya .csv dosyası yükleyin.");
            return;
        }
        setFileName(file.name);
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
        if (!rows.length) {
            alert("Excel içinde veri bulunamadı.");
            return;
        }
        fillFormFromRow(rows[0]);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        await readExcelFile(e.dataTransfer.files?.[0]);
    };

    const handleFileSelect = async (e) => {
        await readExcelFile(e.target.files?.[0]);
        e.target.value = "";
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const mark = (value, color) => (
        <span className="tutanak-mark" style={{ backgroundColor: color }}>
            {value || "---"}
        </span>
    );

    const exportWord = () => {
        const wordHtml = `
<html>
<head>
<meta charset="utf-8" />
<style>
    @page { size: A4; margin: 1.15cm 1.35cm 1cm 1.35cm; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 9.5pt; color: #000; line-height: 1.18; }
    .title { text-align: center; font-weight: bold; font-size: 11pt; margin: 16px 0 34px 0; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    table.info td { vertical-align: top; padding: 1px 0; font-size: 9.5pt; }
    .label { width: 190px; font-weight: bold; }
    .colon { width: 12px; font-weight: bold; }
    .mark { display: inline; padding: 1px 3px; color: #000; }
    .yellow { background: #ffff00; } .green { background: #00ff00; } .red { background: #ff0000; }
    .gray { background: #bfbfbf; } .blue { background: #0000c0; }
    .spacer { height: 11px; }
    .text { margin-top: 28px; text-align: justify; font-size: 9.5pt; }
    .text p { margin: 0 0 8px 0; text-indent: 34px; }
    table.sign { width: 100%; border-collapse: collapse; margin-top: 28px; }
    table.sign td { width: 50%; text-align: center; vertical-align: top; font-size: 9.5pt; }
    .muted { color: #d9d9d9; text-align: left; margin-top: 20px; line-height: 1.15; }
</style>
</head>
<body>
    <div class="title">TUTANAK</div>
    <table class="info">
        <tr><td class="label">İşveren</td><td class="colon">:</td><td>${safe(form.isveren)}</td></tr>
        <tr><td class="label">Taşıyıcı</td><td class="colon">:</td><td><span class="mark yellow">${safe(form.tasiyici)}</span></td></tr>
        <tr><td class="label">Müşteri(ler)</td><td class="colon">:</td><td><span class="mark green">${safe(form.musteri)}</span></td></tr>
        <tr><td colspan="3" class="spacer"></td></tr>
        <tr><td class="label">Taşıyan Araç/Araçlar Plaka No</td><td class="colon">:</td><td><span class="mark red">${safe(form.plaka)}</span></td></tr>
        <tr><td colspan="3" class="spacer"></td></tr>
        <tr><td class="label">Sevkiyat Sefer Tarihi/Tarihleri</td><td class="colon">:</td><td><span class="mark gray">${safe(form.tarih)}</span></td></tr>
        <tr><td class="label">Sevkiyat Sefer Numarası/Numaraları</td><td class="colon">:</td><td><span class="mark blue">${safe(form.seferNo)}</span></td></tr>
    </table>
    <div class="text">
        <p>Taşıyıcı, yukarıda bilgileri yazılı sevkiyat/sevkiyatlar konusu yükün/yüklerin Müşteri'ye teslim edildiğini İşveren'e bildirmiş olmasına rağmen, teslimatı tevsik eden ve Müşteri tarafından kaşelenmiş ve imzalanmış taşıma irsaliyesini henüz İşveren'e ibraz etmemiştir. Bu nedenle İşveren, yükün/yüklerin Müşteri'ye ayıpsız, eksiksiz ve zamanında teslim edilip edilmediği hususunu kendi kayıtları üzerinden teyit edememektedir.</p>
        <p>Taşıyıcı, taşıma faturasına/faturalarına konu tutarın/tutarların tamamen veya kısmen kendisine ödenmiş veya ödenecek olmasının, taşıma hizmetinden ve teslimattan kaynaklanacak sorumluluklarını ortadan kaldırmadığını kabul, beyan ve taahhüt eder. Bu doğrultuda Müşteri veya 3. kişiler tarafından İşveren'den talep edilecek ya da İşveren'e rücu edilecek tutarlar bakımından, İşveren'in Taşıyıcı'ya karşı rücu, takas/mahsup ve diğer hukuki yollara başvurma hakkı saklıdır.</p>
    </div>
    <table class="sign">
        <tr>
            <td><strong>İşveren</strong><br /><br />Odak Tedarik Zinciri ve Lojistik A.Ş.<div class="muted">Kaşe<br />İmza<br />Tarih</div></td>
            <td><strong>Taşıyıcı</strong><br /><br /><span class="mark yellow">${safe(form.tasiyici)}</span><div class="muted">Kaşe<br />İmza<br />Tarih</div></td>
        </tr>
    </table>
</body>
</html>`;
        const blob = htmlDocx.asBlob(wordHtml);
        saveAs(blob, `tutanak-${form.seferNo || "belge"}.docx`);
    };

    const exportPDF = async () => {
        const canvas = await html2canvas(contentRef.current, { scale: 2, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`tutanak-${form.seferNo || "belge"}.pdf`);
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet([{
            İşveren: form.isveren,
            Taşıyıcı: form.tasiyici,
            Müşteri: form.musteri,
            Plaka: form.plaka,
            "Sefer Tarihi": form.tarih,
            "Sefer No": form.seferNo,
        }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tutanak");
        XLSX.writeFile(wb, `tutanak-${form.seferNo || "belge"}.xlsx`);
    };

    const printPage = () => {
        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
                <head><title>Tutanak</title><link rel="stylesheet" href="/src/pages/Tutanak.css" /></head>
                <body>${contentRef.current.innerHTML}</body>
            </html>`);
        printWindow.document.close();
        printWindow.print();
    };

    const fieldDefs = [
        { key: "tasiyici", label: "Taşıyıcı", accent: "#b8960c" },
        { key: "musteri", label: "Müşteri", accent: "#1a7f4b" },
        { key: "plaka", label: "Araç Plakası", accent: "#b91c1c" },
        { key: "tarih", label: "Sefer Tarihi", accent: "#64748b" },
        { key: "seferNo", label: "Sefer Numarası", accent: "#1d4ed8" },
    ];

    return (
        <div className="t-screen">
            {/* Subtle background texture */}
            <div className="t-bg" />

            <div className="t-wrap">

                {/* ── Top navigation bar ── */}
                <header className="t-topbar">
                    <div className="t-brand">
                        <div className="t-brand-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                        <div>
                            <span className="t-brand-name">Odak Lojistik</span>
                            <span className="t-brand-sub">Belge Yönetim Paneli</span>
                        </div>
                    </div>

                    <nav className="t-nav">
                        <span className="t-nav-item t-nav-active">Tutanak</span>
                        <span className="t-nav-divider" />
                        <button type="button" className="t-back-btn" onClick={() => navigate("/anasayfa")}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12" />
                                <polyline points="12 19 5 12 12 5" />
                            </svg>
                            Anasayfa
                        </button>
                    </nav>
                </header>

                {/* ── Page title ── */}
                <div className="t-page-title">
                    <div className="t-page-title-text">
                        <h1>Tutanak Oluştur</h1>
                        <p>Excel dosyasını yükleyin; veriler otomatik okusun, Word veya PDF çıktısı alın.</p>
                    </div>
                    <div className="t-status-pill">
                        <span className="t-status-dot" />
                        Hazır
                    </div>
                </div>

                <div className="t-layout">

                    {/* ══ LEFT PANEL ══ */}
                    <aside className="t-aside">

                        {/* Upload area */}
                        <section className="t-card t-upload-card">
                            <div className="t-card-head">
                                <span className="t-card-label">Veri Kaynağı</span>
                                <h2>Excel Yükle</h2>
                            </div>

                            <div
                                className={`t-dropzone ${dragActive ? "t-dropzone--active" : ""} ${fileName ? "t-dropzone--filled" : ""}`}
                                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} hidden />

                                {fileName ? (
                                    <div className="t-drop-filled">
                                        <div className="t-drop-file-icon">
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                        <span className="t-drop-file-label">Dosya Yüklendi</span>
                                        <strong className="t-drop-file-name">{fileName}</strong>
                                        <span className="t-drop-change">Değiştirmek için tıklayın</span>
                                    </div>
                                ) : (
                                    <div className="t-drop-empty">
                                        <div className="t-drop-icon">
                                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                        </div>
                                        <p className="t-drop-hint">Dosyayı buraya sürükleyin veya</p>
                                        <button type="button" className="t-drop-btn">Dosya Seçin</button>
                                        <p className="t-drop-formats">.xlsx · .xls · .csv</p>
                                    </div>
                                )}
                            </div>

                            <div className="t-auto-fields">
                                <span className="t-auto-label">Otomatik okunan alanlar</span>
                                <div className="t-auto-tags">
                                    {["Taşıyıcı", "Müşteri", "Plaka / Dorse", "Sefer Tarihi", "Sefer No"].map(f => (
                                        <span key={f} className="t-auto-tag">{f}</span>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Export actions */}
                        <section className="t-card t-export-card">
                            <div className="t-card-head">
                                <span className="t-card-label">Çıktı Formatları</span>
                                <h2>Dışa Aktar</h2>
                            </div>

                            <div className="t-export-grid">
                                <button type="button" className="t-export-btn t-export-word" onClick={exportWord}>
                                    <div className="t-export-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                    </div>
                                    <div>
                                        <strong>Word</strong>
                                        <span>.docx belgesi</span>
                                    </div>
                                </button>

                                <button type="button" className="t-export-btn t-export-pdf" onClick={exportPDF}>
                                    <div className="t-export-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="9" y1="15" x2="15" y2="15" />
                                        </svg>
                                    </div>
                                    <div>
                                        <strong>PDF</strong>
                                        <span>Baskı kalitesi</span>
                                    </div>
                                </button>

                                <button type="button" className="t-export-btn t-export-excel" onClick={exportExcel}>
                                    <div className="t-export-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <line x1="3" y1="9" x2="21" y2="9" />
                                            <line x1="3" y1="15" x2="21" y2="15" />
                                            <line x1="9" y1="3" x2="9" y2="21" />
                                        </svg>
                                    </div>
                                    <div>
                                        <strong>Excel</strong>
                                        <span>Veri çıktısı</span>
                                    </div>
                                </button>

                                <button type="button" className="t-export-btn t-export-print" onClick={printPage}>
                                    <div className="t-export-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 6 2 18 2 18 9" />
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                            <rect x="6" y="14" width="12" height="8" />
                                        </svg>
                                    </div>
                                    <div>
                                        <strong>Yazdır</strong>
                                        <span>Doğrudan yazıcı</span>
                                    </div>
                                </button>
                            </div>
                        </section>
                    </aside>

                    {/* ══ RIGHT PANEL ══ */}
                    <main className="t-main">

                        {/* Form fields */}
                        <section className="t-card t-form-card">
                            <div className="t-card-head t-card-head--row">
                                <div>
                                    <span className="t-card-label">Belge Verileri</span>
                                    <h2>Alanları Düzenle</h2>
                                </div>
                                <p className="t-form-hint">Excel'den gelen değerleri gerekirse burada değiştirebilirsiniz.</p>
                            </div>

                            <div className="t-form-grid">
                                {fieldDefs.map(({ key, label, accent }) => (
                                    <label key={key} className="t-field">
                                        <span className="t-field-label">
                                            <i className="t-field-dot" style={{ background: accent }} />
                                            {label}
                                        </span>
                                        <input
                                            className="t-field-input"
                                            value={form[key]}
                                            onChange={(e) => updateField(key, e.target.value)}
                                            placeholder={`${label} giriniz…`}
                                        />
                                    </label>
                                ))}
                                <label className="t-field t-field--full">
                                    <span className="t-field-label">
                                        <i className="t-field-dot" style={{ background: "#334155" }} />
                                        İşveren
                                    </span>
                                    <input
                                        className="t-field-input"
                                        value={form.isveren}
                                        onChange={(e) => updateField("isveren", e.target.value)}
                                    />
                                </label>
                            </div>
                        </section>

                        {/* Preview */}
                        <section className="t-card t-preview-card">
                            <div className="t-preview-header">
                                <div className="t-preview-header-left">
                                    <span className="t-card-label">Canlı Önizleme</span>
                                    <h2>Belge Görünümü</h2>
                                </div>
                                <div className="t-preview-badge">A4</div>
                            </div>

                            <div className="t-preview-scroll">
                                <div ref={contentRef}>
                                    <div className="tutanak-page">
                                        <div className="tutanak-title">TUTANAK</div>

                                        <div className="tutanak-row">
                                            <div className="tutanak-label">İşveren</div>
                                            <div className="tutanak-colon">:</div>
                                            <div>{form.isveren}</div>
                                        </div>
                                        <div className="tutanak-row">
                                            <div className="tutanak-label">Taşıyıcı</div>
                                            <div className="tutanak-colon">:</div>
                                            <div>{mark(form.tasiyici, COLORS.yellow)}</div>
                                        </div>
                                        <div className="tutanak-row">
                                            <div className="tutanak-label">Müşteri(ler)</div>
                                            <div className="tutanak-colon">:</div>
                                            <div>{mark(form.musteri, COLORS.green)}</div>
                                        </div>
                                        <br />
                                        <div className="tutanak-row">
                                            <div className="tutanak-label">Taşıyan Araç/Araçlar Plaka No</div>
                                            <div className="tutanak-colon">:</div>
                                            <div>{mark(form.plaka, COLORS.red)}</div>
                                        </div>
                                        <br />
                                        <div className="tutanak-row">
                                            <div className="tutanak-label">Sevkiyat Sefer Tarihi/Tarihleri</div>
                                            <div className="tutanak-colon">:</div>
                                            <div>{mark(form.tarih, COLORS.gray)}</div>
                                        </div>
                                        <div className="tutanak-row">
                                            <div className="tutanak-label">Sevkiyat Sefer Numarası/Numaraları</div>
                                            <div className="tutanak-colon">:</div>
                                            <div>{mark(form.seferNo, COLORS.blue)}</div>
                                        </div>

                                        <div className="tutanak-text">
                                            <p>
                                                Taşıyıcı, yukarıda bilgileri yazılı sevkiyat/sevkiyatlar konusu yükün/yüklerin Müşteri'ye teslim
                                                edildiğini İşveren'e bildirmiş olmasına rağmen, teslimatı tevsik eden ve Müşteri tarafından
                                                kaşelenmiş ve imzalanmış taşıma irsaliyesini henüz İşveren'e ibraz etmemiştir. Bu nedenle İşveren,
                                                yükün/yüklerin Müşteri'ye ayıpsız, eksiksiz ve zamanında teslim edilip edilmediği hususunu kendi
                                                kayıtları üzerinden teyit edememektedir.
                                            </p>
                                            <p>
                                                Taşıyıcı, taşıma faturasına/faturalarına konu tutarın/tutarların tamamen veya kısmen kendisine
                                                ödenmiş veya ödenecek olmasının, taşıma hizmetinden ve teslimattan kaynaklanacak sorumluluklarını
                                                ortadan kaldırmadığını kabul, beyan ve taahhüt eder. Bu doğrultuda Müşteri veya 3. kişiler
                                                tarafından İşveren'den talep edilecek ya da İşveren'e rücu edilecek tutarlar bakımından,
                                                İşveren'in Taşıyıcı'ya karşı rücu, takas/mahsup ve diğer hukuki yollara başvurma hakkı saklıdır.
                                            </p>
                                        </div>

                                        <div className="tutanak-signatures">
                                            <div className="tutanak-signature">
                                                <strong>İşveren</strong>
                                                <br /><br />
                                                Odak Tedarik Zinciri ve Lojistik A.Ş.
                                                <div className="tutanak-muted">Kaşe<br />İmza<br />Tarih</div>
                                            </div>
                                            <div className="tutanak-signature">
                                                <strong>Taşıyıcı</strong>
                                                <br /><br />
                                                {mark(form.tasiyici, COLORS.yellow)}
                                                <div className="tutanak-muted">Kaşe<br />İmza<br />Tarih</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                    </main>
                </div>

                {/* Footer */}
                <footer className="t-footer">
                    <span>© {new Date().getFullYear()} Odak Tedarik Zinciri ve Lojistik A.Ş.</span>
                    <span className="t-footer-sep">·</span>
                    <span>Tüm hakları saklıdır</span>
                </footer>
            </div>
        </div>
    );
}