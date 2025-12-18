import React, { useState } from 'react';
import api from './apiClient';
import DatePicker from 'react-datepicker';
import { tr } from 'date-fns/locale';
import {
    Search, Loader2, Calendar as CalendarIcon, ArrowRight,
    Download, FileCheck2, CheckCircle2, Container, ShieldCheck
} from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

// Kütüphaneler
import htmlDocx from 'html-docx-js/dist/html-docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

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

// ---------- 2. ANA BİLEŞEN ----------
const TopluTutanak = () => {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [hata, setHata] = useState(null);

    // Senin filtrelerin (Aynen korundu)
    const isBaseAllowed = (item) => {
        if (DURUM_ENGEL.has(Number(item.TMSDespatchDocumentStatu))) return false;
        const PROJE_ENGEL = ['HASAR İADE', 'AKTÜL', 'KARGO HİZMETLERİ', 'HGS-YAKIT FATURA İŞLEME'].map(U);
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
                'ODAK TEDARİK ZİNCİRİ VE LOJİSTİK ANONİM ŞİRKETİ',
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

    // --- SENİN İSTEDİĞİN TUTANAK ŞABLONU (BİREBİR) ---
    const generateTutanakHTML = (row) => {
        const today = new Date().toLocaleDateString('tr-TR');
        const plakaStr = `${row.PlateNumber || ''} / ${row.TrailerPlateNumber || ''}`;

        return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Times New Roman', serif; font-size: 11pt; color: black; line-height: 1.5;">
            <h1 style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 30px;">
                NAKLİYE SEFERİ BİLGİLENDİRME FORMU
            </h1>
            
            <div style="margin-bottom: 20px;">
                <p style="margin: 0;"><strong>İŞVEREN :</strong></p>
                <p style="margin: 0;">ODAK TEDARİK ZİNCİRİ VE LOJİSTİK A.Ş.</p>
                <p style="margin: 0;">Vergi Dairesi: ALEMDAĞ<br>Vergi No: 6340954050</p>
            </div>

            <div style="margin-bottom: 25px;">
                <p><strong>TAŞIYICI :</strong></p>
                <p><strong>${row.SupplierCurrentAccountFullTitle || '---'}</strong></p>
            </div>

            <h3 style="text-decoration: underline;">AÇIKLAMALAR :</h3>
            <p style="text-align: justify;">
                Sayın Taşıyıcı Muhatap; ${row.SupplierCurrentAccountFullTitle}, ${formatDateISO(row.DespatchDate)} tarihinde ${row.DocumentNo} nolu sefer numaralı ${row.CustomerFullTitle}, ${row.PickupCityCountyName}’dan yükleyip ${row.DeliveryCurrentAccountName}, ${row.DeliveryCityCountyName}’ya ulaştırılması amacıyla ${plakaStr} Plakalı araç sürücüsü ${row.FullName} (TCKN: ${row.CitizenNumber}) Tedarikçi firma ${row.SupplierCurrentAccountFullTitle}, ${row.TMSDespatchWaybillNumber || '---'} nolu irsaliyeli fatura ile taşınan ürünlerin teslim edildiğini beyan edilmiştir. Ancak teslime ilişkin evraklar bugüne kadar tarafımıza ibraz edilmemiştir.
            </p>

            <p style="text-align: left; line-height: 1.5; margin-top: 15px;">
                Karayolları Trafik Kanunu ve teamüller uyarınca; “basiretli bir tacir olan taşıyan,
                verilen yük muhteviyatını, boşaltma/teslim adresine sağlam, eksiksiz ve sözleşmede
                belirlenen süre içerisinde teslim etmekle ve her bir sevkiyat için Taşıtan'ın
                irsaliye ofislerinden taşıma irsaliyesini almakla yükümlüdür. Yükleme tamamlandıktan
                sonra bu irsaliyenin bir nüshası kesilecek olan nakliye faturasına eklenir ve
                Taşıtan yetkililerine teslim edilir. Teslimat esnasında, Taşıtan'ın müşterisine
                ait sevk irsaliyelerinin alt nüshaları yükün tam ve eksiksiz teslim alındığına
                dair kaşe ve imza yaptırılmak zorundadır. Kaşe ve imzası eksik olan seferlerin,
                Taşıtan'ın müşterisine ait sevk irsaliyesi veya Taşıtan'a ait taşıma irsaliyesi
                eksik olan seferlerin bakiyesi ödenmez.”
                <br><br>
                İşbu nedenle, tarafınızca taşıması yapılan yukarıda sefer bilgisi verilen taşımaya
                ilişkin teslim evraklarının tarafımıza teslim edilmemesi nedeni ile KDV ödemeleriniz
                yapılamamaktadır. Teslim evraklarının 3 (üç) gün içerisinde tarafımıza teslimi ya da
                evrakların temin edilememesi/kaybolması durumunda oluşabilecek zararlarla ilgili
                sorumluluğun kendinizde olduğuna ilişkin ekteki tutanağın imzalanarak tarafımıza
                teslimi durumunda KDV ödemeleri tarafımızca yapılacaktır.
            </p>

            <h3 style="margin-top: 30px; margin-bottom: 15px; font-weight: bold;">SORUMLULUK BEYANI</h3>
            <p style="margin: 0 0 15px 0; font-weight: bold;">ODAK TEDARİK ZİNCİRİ VE LOJİSTİK A.Ş.’ne</p>
            <p style="margin: 0; line-height: 1.5;">
                ${row.SupplierCurrentAccountFullTitle},
                ${formatDateISO(row.DespatchDate)} tarihinde ${row.DocumentNo} nolu sefer numaralı
                ${row.CustomerFullTitle}, ${row.PickupCityCountyName}’dan yükleyip
                ${row.DeliveryCurrentAccountName}, ${row.DeliveryCityCountyName}’ya ulaştırılması
                amacıyla ${plakaStr} plakalı araç sürücüsü ${row.FullName}
                (TCKN: ${row.CitizenNumber}) tarafından, tedarikçi firma
                ${row.SupplierCurrentAccountFullTitle} adına,
                ${row.TMSDespatchWaybillNumber || '---'} irsaliyeli fatura ile teslim edilmiştir.
            </p>
            
            <div style="margin-top: 60px;">
                <p>Tarih: ${today}</p>
                <p>Beyan eden: ${row.SupplierCurrentAccountFullTitle}</p>
                <br>
                <p>Kaşe / İmza</p>
            </div>
        </body>
        </html>`;
    };

    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;
        setCreating(true);
        const zip = new JSZip();

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
                .replace(/[\\/:*?"<>|]/g, '')   // Windows illegal chars
                .replace(/\s+/g, '_')           // spaces -> _
                .replace(/_+/g, '_')
                .slice(0, maxLen) || 'BILGI_YOK';
        };

        try {
            const selectedRows = veriler.filter(v => selectedIds.includes(v.TMSDespatchId));
            selectedRows.forEach((row) => {
                const docxBlob = htmlDocx.asBlob(generateTutanakHTML(row));

                const tedarikci = safeFilePart(row.SupplierCurrentAccountFullTitle, 50);
                const sefer = safeFilePart(row.DocumentNo, 30);
                const plaka = safeFilePart((row.PlateNumber || '').replace(/\s/g, ''), 20);

                // ✅ İstenen: Word adı = Tedarikçi adı da içersin
                const fileName = `${tedarikci}_${sefer}_${plaka}_Tutanak.docx`;

                zip.file(fileName, docxBlob);
            });

            const zipContent = await zip.generateAsync({ type: "blob" });
            saveAs(zipContent, `Tutanaklar_${Date.now()}.zip`);
        } catch (error) {
            alert("Hata oluştu.");
        } finally { setCreating(false); }
    };

    return (
        <div className="min-h-screen bg-[#080c14] text-slate-300 p-6 lg:p-12">
            <div className="max-w-[1850px] mx-auto space-y-8">
                {/* Filtre ve Header */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-8 bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl"><ShieldCheck className="text-white" size={24} /></div>
                        <h1 className="text-2xl font-black text-white italic">TMS TOPLU TUTANAK</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-black/40 p-2 rounded-3xl">
                        <div className="flex items-center gap-4 px-6">
                            <CalendarIcon size={18} className="text-indigo-400" />

                            <DatePicker
                                selected={startDate}
                                onChange={d => setStartDate(d)}
                                dateFormat="dd.MM.yyyy"
                                locale={tr}
                                weekStartsOn={1}
                                showPopperArrow={false}
                                className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 w-28 text-sm font-black text-white outline-none placeholder:text-slate-500"
                            />

                            <ArrowRight size={16} className="text-slate-700" />

                            <DatePicker
                                selected={endDate}
                                onChange={d => setEndDate(d)}
                                dateFormat="dd.MM.yyyy"
                                locale={tr}
                                weekStartsOn={1}
                                showPopperArrow={false}
                                className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 w-28 text-sm font-black text-white outline-none placeholder:text-slate-500"
                            />
                        </div>

                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="px-8 py-3 bg-indigo-600 rounded-2xl font-black text-xs text-white hover:bg-indigo-500 transition-all flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} SORGULA
                        </button>
                    </div>
                </div>

                {/* Hata Alanı */}
                {hata && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-6 py-4 rounded-2xl">
                        {hata}
                    </div>
                )}

                {/* Tablo */}
                <div className="bg-[#0d121f]/80 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.02] border-b border-white/5">
                                <tr>
                                    <th className="p-8 w-16">
                                        <button
                                            onClick={() => setSelectedIds(selectedIds.length === veriler.length ? [] : veriler.map(i => i.TMSDespatchId))}
                                            className={`w-6 h-6 rounded-lg border-2 ${selectedIds.length === veriler.length && veriler.length > 0 ? 'bg-indigo-500 border-indigo-500' : 'border-slate-700'}`}
                                        >
                                            {selectedIds.length === veriler.length && veriler.length > 0 && <CheckCircle2 size={16} className="text-white mx-auto" />}
                                        </button>
                                    </th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-500">Tedarikçi</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-500">Sefer / Tarih</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-500">Plaka</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-500">Durum</th>
                                </tr>
                            </thead>

                            <tbody>
                                {veriler.map((item) => (
                                    <tr
                                        key={item.TMSDespatchId}
                                        onClick={() => setSelectedIds(prev => prev.includes(item.TMSDespatchId) ? prev.filter(i => i !== item.TMSDespatchId) : [...prev, item.TMSDespatchId])}
                                        className="hover:bg-white/[0.02] border-b border-white/[0.03] cursor-pointer"
                                    >
                                        <td className="p-8">
                                            <div className={`w-6 h-6 rounded-lg border-2 ${selectedIds.includes(item.TMSDespatchId) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-800'}`}>
                                                {selectedIds.includes(item.TMSDespatchId) && <CheckCircle2 size={16} className="text-white mx-auto" />}
                                            </div>
                                        </td>

                                        <td className="p-6">
                                            <div className="text-sm font-bold text-white">{item.SupplierCurrentAccountFullTitle}</div>
                                            <div className="text-[10px] text-slate-500 mt-1">{item.CustomerFullTitle}</div>
                                        </td>

                                        <td className="p-6">
                                            <div className="text-sm font-mono text-indigo-400">#{item.DocumentNo}</div>
                                            <div className="text-[10px] text-slate-500">{formatDateISO(item.DespatchDate)}</div>
                                        </td>

                                        <td className="p-6 text-sm font-black text-slate-300">{item.PlateNumber}</td>

                                        <td className="p-6">
                                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-bold">
                                                {durumAciklamalari[item.TMSDespatchDocumentStatu] || item.TMSDespatchDocumentStatu}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Alt Çubuk */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-[1000]">
                        <div className="bg-indigo-600 rounded-[2rem] p-4 flex items-center justify-between border border-white/20 shadow-2xl">
                            <div className="flex items-center gap-4 pl-6">
                                <FileCheck2 className="text-white" size={28} />
                                <span className="text-white font-black text-xl">{selectedIds.length} Sefer Seçildi</span>
                            </div>

                            <button
                                onClick={handleBulkDownload}
                                disabled={creating}
                                className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black text-xs flex items-center gap-3 active:scale-95 transition-all"
                            >
                                {creating ? <Loader2 className="animate-spin" /> : <Download size={20} />} TOPLU TUTANAK İNDİR
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
        .react-datepicker-popper { z-index: 9999 !important; }

        .react-datepicker {
          background: #0b1220 !important;
          color: #e2e8f0 !important;
          border-radius: 1rem !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
          overflow: hidden;
        }

        .react-datepicker__header {
          background: rgba(255,255,255,0.02) !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }

        .react-datepicker__current-month,
        .react-datepicker-time__header,
        .react-datepicker__day-name {
          color: #e2e8f0 !important;
          font-weight: 800 !important;
        }

        .react-datepicker__navigation-icon::before {
          border-color: #94a3b8 !important;
        }

        .react-datepicker__day,
        .react-datepicker__time-name {
          color: #cbd5e1 !important;
          border-radius: 0.75rem !important;
        }

        .react-datepicker__day:hover {
          background: rgba(99,102,241,0.15) !important;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background: rgba(99,102,241,0.9) !important;
          color: #ffffff !important;
        }

        .react-datepicker__day--outside-month {
          color: rgba(203,213,225,0.35) !important;
        }

        .react-datepicker__triangle {
          display: none !important;
        }
      `}</style>
        </div>
    );
};

export default TopluTutanak;
