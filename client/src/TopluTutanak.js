import React, { useState } from 'react';
import api from './apiClient';
import DatePicker from 'react-datepicker';
import { tr } from 'date-fns/locale';
import {
    Search, Loader2, Calendar as CalendarIcon, ArrowRight,
    Download, FileCheck2, CheckCircle2, ShieldCheck
} from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import './TopluTutanak.css';

import { useNavigate } from "react-router-dom";
// ✅ Supabase client
import { supabase } from './supabaseClient';

// Kütüphaneler
import htmlDocx from 'html-docx-js/dist/html-docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import * as XLSX from "xlsx";

// ❌ SABİT IMPORTU KALDIRDIK (SSR/Next vb. + boş PDF sorunları)
// import html2pdf from 'html2pdf.js';


// ---------- 1. YARDIMCI FONKSİYONLAR & SABİTLER ----------
const U = (v) => (v ?? '').toString().trim().toLocaleUpperCase('tr-TR');

const durumAciklamalari = {
    1: 'BEKLİYOR', 2: 'ONAYLANDI', 3: 'SPOT ARAÇ PLANLAMADA', 4: 'ARAÇ ATANDI',
    5: 'ARAÇ YÜKLENDİ', 6: 'ARAÇ YOLDA', 7: 'TESLİM EDİLDİ', 8: 'TAMAMLANDI',
    10: 'EKSİK EVRAK', 20: 'HASARSIZ GÖRÜNTÜ', 30: 'HASARLI GÖRÜNTÜ İŞLENDİ',
    31: 'HASARLI-ORJİNAL EVRAK', 40: 'ORJİNAL EVRAK GELDİ', 50: 'EVRAK ARŞİVLENDİ',
    80: 'ARAÇ BOŞALTMADA', 90: 'FİLO ARAÇ PLANLAMADA', 200: 'İPTAL',
};

const DURUM_ENGEL = new Set([31, 40]);

const formatDateISO = (iso) =>
    iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

// ✅ 2 günlük parçalama (chunk) helper'ı
const chunkDateRanges = (startDate, endDate, chunkDays = 2) => {
    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(endDate); e.setHours(23, 59, 59, 999);

    const ranges = [];
    let cursor = new Date(s);

    while (cursor <= e) {
        const rangeStart = new Date(cursor);

        const rangeEnd = new Date(cursor);
        rangeEnd.setDate(rangeEnd.getDate() + (chunkDays - 1));
        rangeEnd.setHours(23, 59, 59, 999);

        if (rangeEnd > e) rangeEnd.setTime(e.getTime());

        ranges.push({ start: rangeStart, end: rangeEnd });

        cursor.setDate(cursor.getDate() + chunkDays);
        cursor.setHours(0, 0, 0, 0);
    }

    return ranges;
};

// ✅ Dosya adı güvenli hale getirme (TR karakterler + Windows yasaklı karakterler)
const toAsciiTR = (s) =>
    (s || '')
        .replaceAll('İ', 'I').replaceAll('İ', 'I')
        .replaceAll('ı', 'i')
        .replaceAll('Ş', 'S').replaceAll('ş', 's')
        .replaceAll('Ğ', 'G').replaceAll('ğ', 'g')
        .replaceAll('Ü', 'U').replaceAll('ü', 'u')
        .replaceAll('Ö', 'O').replaceAll('ö', 'o')
        .replaceAll('Ç', 'C').replaceAll('ç', 'c');

const safeFilePart = (s, maxLen = 60) => {
    const ascii = toAsciiTR((s ?? '').toString().trim());
    return ascii
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, maxLen) || 'BILGI_YOK';
};


// ---------- 2. ANA BİLEŞEN ----------
const TopluTutanak = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);        // ✅ WORD ZIP
    const [creatingPdf, setCreatingPdf] = useState(false);  // ✅ PDF ZIP
    const [selectedIds, setSelectedIds] = useState([]);
    const [hata, setHata] = useState(null);

    // ✅ VKN GETİR için ek state'ler
    const [firmaEslesmeleri, setFirmaEslesmeleri] = useState({});
    const [vknLoading, setVknLoading] = useState(false);
    const [vknHata, setVknHata] = useState(null);

    // Senin filtrelerin (Aynen korundu)
    const isBaseAllowed = (item) => {
        if (DURUM_ENGEL.has(Number(item.TMSDespatchDocumentStatu))) return false;
        const PROJE_ENGEL = ['HASAR İADE', 'AKTÜL', 'KARGO HİZMETİ', 'HGS-YAKIT FATURA İŞLEME'].map(U);
        return U(item.VehicleWorkingTypeName) === 'SPOT' &&
            U(item.SpecialGroupName) === 'SPOT' &&
            item.DocumentNo?.startsWith('SFR') &&
            item.TMSDespatchInvoiceDocumentNo &&
            !PROJE_ENGEL.some(k => U(item.ProjectName).includes(k));
    };

    // ✅ İstenen şartlar + chunk istekleri
    const fetchData = async () => {
        setLoading(true);
        setHata(null);
        setSelectedIds([]);

        // ✅ Yeni sorguda VKN eşleşmelerini sıfırla
        setFirmaEslesmeleri({});
        setVknHata(null);

        try {
            const ranges = chunkDateRanges(startDate, endDate, 2);
            const all = [];

            for (const { start, end } of ranges) {
                const body = {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    userId: 1,

                    CustomerId: 0,
                    SupplierId: 0,
                    DriverId: 0,
                    TMSDespatchId: 0,
                    VehicleId: 0,
                    DocumentPrint: "",
                    WorkingTypesId: [],
                };

                const resp = await api.post('/tmsdespatches/getall', body);
                all.push(...(resp?.data?.Data || []));
            }

            const firmaEngellenenler = [
                'İZ KENT LOJİSTİK HİZMETLERİ LİMİTED ŞİRKETİ',
                'ARKAS LOJİSTİK ANONİM ŞİRKETİ',
                'HEDEF TÜKETİM ÜRÜNLERİ SANAYİ VE DIŞ TİCARET ANONİM ŞİRKETİ',
                'MOKS MOBİLYA KURULUM SERVİS LOJİSTİK PETROL İTHALAT İHRACAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
                'ODAK TEDARİK ZİNCİRİ VE LOJİSTİK ANONİM ŞİRKETİ', 'KONFRUT AG TARIM ANONİM ŞİRKETİ'
            ].map(U);

            const filtered = all
                .filter(isBaseAllowed)
                .filter((item) => {
                    if (item.PlateNumber === '34SEZ34') return false;
                    if (firmaEngellenenler.includes(U(item.SupplierCurrentAccountFullTitle))) return false;
                    return true;
                });

            setVeriler(filtered);
        } catch (e) {
            console.error(e);
            setHata('Veri alınamadı. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    // ✅ VKN GETİR: tablodaki "Tedarikçi" -> supabase firmalar.unvan eşleştir
    const handleVknGetir = async () => {
        setVknLoading(true);
        setVknHata(null);

        try {
            const unvanlar = Array.from(
                new Set(
                    veriler
                        .map(v => (v?.SupplierCurrentAccountFullTitle ?? '').toString().trim())
                        .filter(Boolean)
                )
            );

            if (unvanlar.length === 0) {
                setFirmaEslesmeleri({});
                return;
            }

            const chunkSize = 100;
            const allRows = [];

            for (let i = 0; i < unvanlar.length; i += chunkSize) {
                const batch = unvanlar.slice(i, i + chunkSize);

                const { data, error } = await supabase
                    .from('firmalar')
                    .select('unvan, vkn, tc, kod, telefon, "ıban"')
                    .in('unvan', batch);

                if (error) throw error;
                if (data?.length) allRows.push(...data);
            }

            const map = {};
            for (const r of allRows) {
                const key = U(r.unvan);
                if (!map[key]) map[key] = [];
                map[key].push(r);
            }

            setFirmaEslesmeleri(map);
        } catch (e) {
            console.error(e);
            setVknHata('Firma bilgileri çekilemedi.');
        } finally {
            setVknLoading(false);
        }
    };

    // --- TUTANAK ŞABLONU (WORD/PDF ÇIKTISI) ---
    const generateTutanakHTML = (row) => {
        const safe = (value) => {
            const text = value === undefined || value === null || String(value).trim() === "" ? "---" : String(value).trim();
            return text
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        };

        const plakaStr = [row.PlateNumber, row.TrailerPlateNumber].filter(Boolean).join(" / ");

        return `
<html>
<head>
<meta charset="utf-8" />
<style>
    @page {
        size: A4;
        margin: 1.15cm 1.35cm 1cm 1.35cm;
    }

    body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        font-size: 9.5pt;
        color: #000;
        line-height: 1.18;
    }

    .title {
        text-align: center;
        font-weight: bold;
        font-size: 11pt;
        margin: 16px 0 34px 0;
    }

    table.info {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 4px;
    }

    table.info td {
        vertical-align: top;
        padding: 1px 0;
        font-size: 9.5pt;
    }

    .label {
        width: 190px;
        font-weight: bold;
    }

    .colon {
        width: 12px;
        font-weight: bold;
    }

    .spacer {
        height: 11px;
    }

    .text {
        margin-top: 28px;
        text-align: justify;
        font-size: 9.5pt;
    }

    .text p {
        margin: 0 0 8px 0;
        text-indent: 34px;
    }

    table.sign {
        width: 100%;
        border-collapse: collapse;
        margin-top: 28px;
    }

    table.sign td {
        width: 50%;
        text-align: center;
        vertical-align: top;
        font-size: 9.5pt;
    }

    .muted {
        color: #d9d9d9;
        text-align: left;
        margin-top: 20px;
        line-height: 1.15;
    }
</style>
</head>
<body>
    <div class="title">TUTANAK</div>

    <table class="info">
        <tr>
            <td class="label">İşveren</td>
            <td class="colon">:</td>
            <td>Odak Tedarik Zinciri ve Lojistik A.Ş. (Alemdağ VD, 6340954050)</td>
        </tr>
        <tr>
            <td class="label">Taşıyıcı</td>
            <td class="colon">:</td>
            <td>${safe(row.SupplierCurrentAccountFullTitle)}</td>
        </tr>
        <tr>
            <td class="label">Müşteri(ler)</td>
            <td class="colon">:</td>
            <td>${safe(row.CustomerFullTitle)}</td>
        </tr>

        <tr><td colspan="3" class="spacer"></td></tr>

        <tr>
            <td class="label">Taşıyan Araç/Araçlar Plaka No</td>
            <td class="colon">:</td>
            <td>${safe(plakaStr)}</td>
        </tr>

        <tr><td colspan="3" class="spacer"></td></tr>

        <tr>
            <td class="label">Sevkiyat Sefer Tarihi/Tarihleri</td>
            <td class="colon">:</td>
            <td>${safe(formatDateISO(row.DespatchDate))}</td>
        </tr>
        <tr>
            <td class="label">Sevkiyat Sefer Numarası/Numaraları</td>
            <td class="colon">:</td>
            <td>${safe(row.DocumentNo)}</td>
        </tr>
    </table>

    <div class="text">
        <p>Taşıyıcı, yukarıda bilgileri yazılı sevkiyat/sevkiyatlar konusu yükün/yüklerin Müşteri'ye teslim edildiğini İşveren'e bildirmiş olmasına rağmen, teslimatı tevsik eden ve Müşteri tarafından kaşelenmiş ve imzalanmış taşıma irsaliyesini henüz İşveren'e ibraz etmemiştir. Bu nedenle İşveren, yükün/yüklerin Müşteri'ye ayıpsız, eksiksiz ve zamanında teslim edilip edilmediği hususunu kendi kayıtları üzerinden teyit edememektedir.</p>

        <p>Taşıyıcı, taşıma faturasına/faturalarına konu tutarın/tutarların tamamen veya kısmen kendisine ödenmiş veya ödenecek olmasının, taşıma hizmetinden ve teslimattan kaynaklanacak sorumluluklarını ortadan kaldırmadığını kabul, beyan ve taahhüt eder. Bu doğrultuda Müşteri veya 3. kişiler tarafından İşveren'den talep edilecek ya da İşveren'e rücu edilecek tutarlar bakımından, İşveren'in Taşıyıcı'ya karşı rücu, takas/mahsup ve diğer hukuki yollara başvurma hakkı saklıdır.</p>
    </div>

    <table class="sign">
        <tr>
            <td>
                <strong>İşveren</strong>
                <br /><br />
                Odak Tedarik Zinciri ve Lojistik A.Ş.
                <div class="muted">Kaşe<br />İmza<br />Tarih</div>
            </td>
            <td>
                <strong>Taşıyıcı</strong>
                <br /><br />
                ${safe(row.SupplierCurrentAccountFullTitle)}
                <div class="muted">Kaşe<br />İmza<br />Tarih</div>
            </td>
        </tr>
    </table>
</body>
</html>`;
    };

    // ✅ HTML string -> PDF Blob (iframe render + dynamic import) + ✅ margin fix
    const htmlToPdfBlob = async (htmlString, fileName = 'tutanak.pdf') => {
        const html2pdf = (await import('html2pdf.js')).default;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.opacity = '0.01'; // ✅ hidden değil (render alsın)
        iframe.style.pointerEvents = 'none';
        iframe.style.border = '0';
        iframe.setAttribute('aria-hidden', 'true');

        document.body.appendChild(iframe);

        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(htmlString);
            doc.close();

            // ✅ render/font otursun
            await new Promise((r) => setTimeout(r, 250));

            const body = doc.body;

            const opt = {
                // ✅ alt margin büyütüldü => “Kaşe/İmza” kırpılmasın
                margin: [10, 10, 20, 10],
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    windowWidth: body.scrollWidth,
                    windowHeight: body.scrollHeight,
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] },
            };

            const pdf = await html2pdf().set(opt).from(body).toPdf().get('pdf');
            return pdf.output('blob');
        } finally {
            document.body.removeChild(iframe);
        }
    };

    // ✅ TOPLU WORD (MEVCUT)
    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;
        setCreating(true);
        const zip = new JSZip();

        try {
            const selectedRows = veriler.filter(v => selectedIds.includes(v.TMSDespatchId));
            selectedRows.forEach((row) => {
                const docxBlob = htmlDocx.asBlob(generateTutanakHTML(row));

                const tedarikci = safeFilePart(row.SupplierCurrentAccountFullTitle, 50);
                const sefer = safeFilePart(row.DocumentNo, 30);
                const plaka = safeFilePart((row.PlateNumber || '').replace(/\s/g, ''), 20);

                const fileName = `${tedarikci}_${sefer}_${plaka}_Tutanak.docx`;
                zip.file(fileName, docxBlob);
            });

            const zipContent = await zip.generateAsync({ type: "blob" });
            saveAs(zipContent, `Tutanaklar_${Date.now()}.zip`);
        } catch (error) {
            console.error(error);
            alert("Hata oluştu.");
        } finally {
            setCreating(false);
        }
    };

    // ✅ TOPLU PDF (ALT BARDA WORD'UN YANINA)
    const handleBulkPdfDownload = async () => {
        if (selectedIds.length === 0) return;
        setCreatingPdf(true);

        try {
            const zip = new JSZip();
            const selectedRows = veriler.filter(v => selectedIds.includes(v.TMSDespatchId));

            for (const row of selectedRows) {
                const tedarikci = safeFilePart(row.SupplierCurrentAccountFullTitle, 50);
                const sefer = safeFilePart(row.DocumentNo, 30);
                const plaka = safeFilePart((row.PlateNumber || '').replace(/\s/g, ''), 20);

                const fileName = `${tedarikci}_${sefer}_${plaka}_Tutanak.pdf`;
                const html = generateTutanakHTML(row);

                const pdfBlob = await htmlToPdfBlob(html, fileName);
                zip.file(fileName, pdfBlob);
            }

            const zipContent = await zip.generateAsync({ type: "blob" });
            saveAs(zipContent, `Tutanaklar_PDF_${Date.now()}.zip`);
        } catch (e) {
            console.error(e);
            alert("PDF oluşturulurken hata oluştu.");
        } finally {
            setCreatingPdf(false);
        }
    };

    const handleExcelExport = () => {
        const rows = (selectedIds.length > 0
            ? veriler.filter(v => selectedIds.includes(v.TMSDespatchId))
            : veriler
        );

        if (!rows.length) return;

        const getFirma = (supplierTitle) => {
            const key = U(supplierTitle);
            const matches = firmaEslesmeleri[key] || [];

            const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
            const joinOrDash = (arr) => (arr.length ? arr.join(' / ') : '');

            return {
                VKN: joinOrDash(uniq(matches.map(m => (m.vkn ?? '').toString().trim()))),
                TC: joinOrDash(uniq(matches.map(m => (m.tc ?? '').toString().trim()))),
                KOD: joinOrDash(uniq(matches.map(m => (m.kod ?? '').toString().trim()))),
                TEL: joinOrDash(uniq(matches.map(m => (m.telefon ?? '').toString().trim()))),
                IBAN: joinOrDash(uniq(matches.map(m => (m["ıban"] ?? '').toString().trim()))),
                ESLESME_SAYISI: matches.length || 0,
            };
        };

        const dataForExcel = rows.map(item => {
            const f = getFirma(item.SupplierCurrentAccountFullTitle);
            return {
                TMSDespatchId: item.TMSDespatchId,
                Tedarikci: item.SupplierCurrentAccountFullTitle || '',
                Musteri: item.CustomerFullTitle || '',
                SeferNo: item.DocumentNo || '',
                Tarih: formatDateISO(item.DespatchDate),
                Plaka: item.PlateNumber || '',
                Dorse: item.TrailerPlateNumber || '',
                Durum: durumAciklamalari[item.TMSDespatchDocumentStatu] || item.TMSDespatchDocumentStatu,
                VKN: f.VKN,
                TC: f.TC,
                KOD: f.KOD,
                TEL: f.TEL,
                IBAN: f.IBAN,
                EslesmeSayisi: f.ESLESME_SAYISI,
                YuklemeIlIlce: item.PickupCityCountyName || '',
                TeslimIlIlce: item.DeliveryCityCountyName || '',
                TeslimCari: item.DeliveryCurrentAccountName || '',
                IrsaliyeNo: item.TMSDespatchWaybillNumber || '',
                Surucu: item.FullName || '',
                SurucuTCKN: item.CitizenNumber || '',
                Proje: item.ProjectName || '',
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataForExcel);
        ws["!cols"] = Object.keys(dataForExcel[0] || {}).map(() => ({ wch: 22 }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tutanak_Listesi");

        const fileName = `Tutanak_${safeFilePart(
            new Date().toLocaleDateString('tr-TR')
        )}_${rows.length}_satir.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="tt-screen">
            <div className="tt-bg" />

            <div className="tt-wrap">
                <header className="tt-topbar">
                    <div className="tt-brand">
                        <div className="tt-brand-icon">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <span className="tt-brand-name">Odak Lojistik</span>
                            <span className="tt-brand-sub">Belge Yönetim Paneli</span>
                        </div>
                    </div>

                    <nav className="tt-nav">
                        <span className="tt-nav-item tt-nav-active">Toplu Tutanak</span>
                        <span className="tt-nav-divider" />
                        <button type="button" className="tt-back-btn" onClick={() => navigate('/anasayfa')}>
                            Anasayfa
                        </button>
                    </nav>
                </header>

                <div className="tt-page-title">
                    <div className="tt-page-title-text">
                        <h1>Toplu Tutanak Oluştur</h1>
                        <p>TMS üzerinden tarih aralığına göre seferleri çekin, firma bilgilerini eşleştirin ve toplu Word/PDF çıktısı alın.</p>
                    </div>
                    <div className={`tt-status-pill ${loading || creating || creatingPdf || vknLoading ? 'tt-status-pill--busy' : ''}`}>
                        <span className="tt-status-dot" />
                        {loading || creating || creatingPdf || vknLoading ? 'İşlemde' : 'Hazır'}
                    </div>
                </div>

                <div className="tt-layout">
                    <aside className="tt-aside">
                        <section className="tt-card tt-filter-card">
                            <div className="tt-card-head">
                                <span className="tt-card-label">Veri Kaynağı</span>
                                <h2>Tarih Aralığı</h2>
                            </div>

                            <div className="tt-date-box">
                                <label className="tt-date-field">
                                    <span>Başlangıç</span>
                                    <div className="tt-date-input-wrap">
                                        <CalendarIcon size={17} />
                                        <DatePicker
                                            selected={startDate}
                                            onChange={(d) => setStartDate(d)}
                                            dateFormat="dd.MM.yyyy"
                                            locale={tr}
                                            weekStartsOn={1}
                                            showPopperArrow={false}
                                            className="tt-date-input"
                                        />
                                    </div>
                                </label>

                                <div className="tt-date-arrow">
                                    <ArrowRight size={18} />
                                </div>

                                <label className="tt-date-field">
                                    <span>Bitiş</span>
                                    <div className="tt-date-input-wrap">
                                        <CalendarIcon size={17} />
                                        <DatePicker
                                            selected={endDate}
                                            onChange={(d) => setEndDate(d)}
                                            dateFormat="dd.MM.yyyy"
                                            locale={tr}
                                            weekStartsOn={1}
                                            showPopperArrow={false}
                                            className="tt-date-input"
                                        />
                                    </div>
                                </label>
                            </div>

                            <button type="button" className="tt-primary-btn" onClick={fetchData} disabled={loading}>
                                {loading ? <Loader2 className="tt-spin" size={18} /> : <Search size={18} />}
                                Sorgula
                            </button>

                            <div className="tt-auto-fields">
                                <span className="tt-auto-label">Uygulanan filtreler</span>
                                <div className="tt-auto-tags">
                                    {['SPOT', 'SFR', 'Eksik Evrak Hariç', 'Firma Engelleri'].map((f) => (
                                        <span key={f} className="tt-auto-tag">{f}</span>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="tt-card tt-export-card">
                            <div className="tt-card-head">
                                <span className="tt-card-label">İşlemler</span>
                                <h2>Dışa Aktar</h2>
                            </div>

                            <div className="tt-export-grid">
                                <button type="button" className="tt-export-btn tt-export-vkn" onClick={handleVknGetir} disabled={vknLoading || veriler.length === 0}>
                                    <div className="tt-export-icon">
                                        {vknLoading ? <Loader2 className="tt-spin" size={18} /> : <Download size={18} />}
                                    </div>
                                    <div>
                                        <strong>VKN Getir</strong>
                                        <span>Supabase eşleşmesi</span>
                                    </div>
                                </button>

                                <button type="button" className="tt-export-btn tt-export-excel" onClick={handleExcelExport} disabled={veriler.length === 0}>
                                    <div className="tt-export-icon"><Download size={18} /></div>
                                    <div>
                                        <strong>Excel</strong>
                                        <span>{selectedIds.length ? 'Seçilileri indir' : 'Tüm liste'}</span>
                                    </div>
                                </button>

                                <button type="button" className="tt-export-btn tt-export-word" onClick={handleBulkDownload} disabled={selectedIds.length === 0 || creating || creatingPdf}>
                                    <div className="tt-export-icon">
                                        {creating ? <Loader2 className="tt-spin" size={18} /> : <FileCheck2 size={18} />}
                                    </div>
                                    <div>
                                        <strong>Word</strong>
                                        <span>Toplu .docx</span>
                                    </div>
                                </button>

                                <button type="button" className="tt-export-btn tt-export-pdf" onClick={handleBulkPdfDownload} disabled={selectedIds.length === 0 || creatingPdf || creating}>
                                    <div className="tt-export-icon">
                                        {creatingPdf ? <Loader2 className="tt-spin" size={18} /> : <FileCheck2 size={18} />}
                                    </div>
                                    <div>
                                        <strong>PDF</strong>
                                        <span>Toplu .pdf</span>
                                    </div>
                                </button>
                            </div>
                        </section>

                        <section className="tt-card tt-summary-card">
                            <div className="tt-card-head">
                                <span className="tt-card-label">Özet</span>
                                <h2>Sefer Durumu</h2>
                            </div>

                            <div className="tt-summary-grid">
                                <div className="tt-summary-item">
                                    <span>Toplam</span>
                                    <strong>{veriler.length}</strong>
                                </div>
                                <div className="tt-summary-item">
                                    <span>Seçili</span>
                                    <strong>{selectedIds.length}</strong>
                                </div>
                                <div className="tt-summary-item">
                                    <span>VKN Eşleşme</span>
                                    <strong>{Object.keys(firmaEslesmeleri).length}</strong>
                                </div>
                            </div>
                        </section>
                    </aside>

                    <main className="tt-main">
                        {hata && <div className="tt-alert tt-alert-error">{hata}</div>}
                        {vknHata && <div className="tt-alert tt-alert-warn">{vknHata}</div>}

                        <section className="tt-card tt-table-card">
                            <div className="tt-table-header">
                                <div>
                                    <span className="tt-card-label">TMS Seferleri</span>
                                    <h2>Toplu Tutanak Listesi</h2>
                                </div>
                                <div className="tt-table-actions">
                                    <button
                                        type="button"
                                        className={`tt-select-all ${selectedIds.length === veriler.length && veriler.length > 0 ? 'tt-select-all--active' : ''}`}
                                        onClick={() => setSelectedIds(selectedIds.length === veriler.length ? [] : veriler.map((i) => i.TMSDespatchId))}
                                        disabled={veriler.length === 0}
                                    >
                                        <CheckCircle2 size={17} />
                                        {selectedIds.length === veriler.length && veriler.length > 0 ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                    </button>
                                </div>
                            </div>

                            <div className="tt-table-scroll">
                                <table className="tt-table">
                                    <thead>
                                        <tr>
                                            <th className="tt-col-check">Seç</th>
                                            <th>Tedarikçi / Müşteri</th>
                                            <th>Firma Bilgileri</th>
                                            <th>Sefer / Tarih</th>
                                            <th>Plaka</th>
                                            <th>Durum</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {veriler.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="tt-empty">
                                                    <div className="tt-empty-box">
                                                        <FileCheck2 size={34} />
                                                        <strong>Henüz veri yok</strong>
                                                        <span>Tarih aralığı seçip Sorgula butonuna basın.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {veriler.map((item) => {
                                            const isSelected = selectedIds.includes(item.TMSDespatchId);
                                            const key = U(item.SupplierCurrentAccountFullTitle);
                                            const matches = firmaEslesmeleri[key] || [];
                                            const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
                                            const valueOrDash = (arr) => (arr.length ? arr.join(' / ') : '-');
                                            const vk = uniq(matches.map((m) => (m.vkn ?? '').toString().trim()));
                                            const tc = uniq(matches.map((m) => (m.tc ?? '').toString().trim()));
                                            const kd = uniq(matches.map((m) => (m.kod ?? '').toString().trim()));
                                            const tl = uniq(matches.map((m) => (m.telefon ?? '').toString().trim()));
                                            const ib = uniq(matches.map((m) => (m['ıban'] ?? '').toString().trim()));

                                            const Chip = ({ label, value }) => (
                                                <div className="tt-info-chip">
                                                    <span>{label}</span>
                                                    <strong>{value}</strong>
                                                </div>
                                            );

                                            return (
                                                <tr key={item.TMSDespatchId} className={isSelected ? 'tt-row-selected' : ''}>
                                                    <td className="tt-col-check">
                                                        <button
                                                            type="button"
                                                            className={`tt-check ${isSelected ? 'tt-check--active' : ''}`}
                                                            onClick={() => setSelectedIds((prev) => prev.includes(item.TMSDespatchId) ? prev.filter((i) => i !== item.TMSDespatchId) : [...prev, item.TMSDespatchId])}
                                                        >
                                                            {isSelected && <CheckCircle2 size={18} />}
                                                        </button>
                                                    </td>

                                                    <td>
                                                        <div className="tt-company-name">{item.SupplierCurrentAccountFullTitle || '-'}</div>
                                                        <div className="tt-company-sub">{item.CustomerFullTitle || '-'}</div>
                                                    </td>

                                                    <td>
                                                        {matches.length === 0 ? (
                                                            <span className="tt-no-match">-</span>
                                                        ) : (
                                                            <div className="tt-info-list">
                                                                <Chip label="VKN" value={valueOrDash(vk)} />
                                                                <Chip label="TC" value={valueOrDash(tc)} />
                                                                <Chip label="KOD" value={valueOrDash(kd)} />
                                                                <Chip label="TEL" value={valueOrDash(tl)} />
                                                                <Chip label="IBAN" value={valueOrDash(ib)} />
                                                                {matches.length > 1 && <small>{matches.length} eşleşme</small>}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="tt-trip-no">#{item.DocumentNo || '-'}</div>
                                                        <div className="tt-trip-date">{formatDateISO(item.DespatchDate)}</div>
                                                    </td>

                                                    <td>
                                                        <span className="tt-plate">{item.PlateNumber || '-'}</span>
                                                    </td>

                                                    <td>
                                                        <span className="tt-status-badge">
                                                            {durumAciklamalari[item.TMSDespatchDocumentStatu] || item.TMSDespatchDocumentStatu || '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </main>
                </div>

                {selectedIds.length > 0 && (
                    <div className="tt-bottom-bar">
                        <div className="tt-bottom-inner">
                            <div className="tt-bottom-info">
                                <FileCheck2 size={27} />
                                <span>{selectedIds.length} Sefer Seçildi</span>
                            </div>
                            <div className="tt-bottom-actions">
                                <button type="button" onClick={handleBulkDownload} disabled={creating || creatingPdf}>
                                    {creating ? <Loader2 className="tt-spin" size={18} /> : <Download size={18} />}
                                    Toplu Word İndir
                                </button>
                                <button type="button" onClick={handleBulkPdfDownload} disabled={creatingPdf || creating}>
                                    {creatingPdf ? <Loader2 className="tt-spin" size={18} /> : <Download size={18} />}
                                    Toplu PDF İndir
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <footer className="tt-footer">
                    <span>© {new Date().getFullYear()} Odak Tedarik Zinciri ve Lojistik A.Ş.</span>
                    <span className="tt-footer-sep">·</span>
                    <span>Tüm hakları saklıdır</span>
                </footer>
            </div>
        </div>
    );
};

export default TopluTutanak;
