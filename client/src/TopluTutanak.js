import React, { useState } from 'react';
import api from './apiClient';
import DatePicker from 'react-datepicker';
import {
    Search, Loader2, Calendar as CalendarIcon, Truck, User, Hash,
    ArrowRight, Building2, MapPin, Fingerprint, FileCheck2,
    CheckCircle2, Globe, Container, Download, AlertCircle
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

const makeBody = (start, end) => {
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end); e.setHours(23, 59, 59, 999);
    return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        userId: 1, CustomerId: 0, SupplierId: 0, DriverId: 0, TMSDespatchId: 0, VehicleId: 0,
        DocumentPrint: '', WorkingTypesId: [],
    };
};

const formatDateISO = (iso) =>
    iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

// ---------- 2. ALT BİLEŞENLER ----------
const StatusBadge = ({ code }) => {
    const label = durumAciklamalari[Number(code)] || String(code ?? '');
    const config = {
        'İPTAL': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        'BEKLİYOR': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'TAMAMLANDI': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'default': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    };
    const style = config[label] || config['default'];
    return (
        <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide border whitespace-nowrap ${style}`}>
            {label}
        </span>
    );
};

// ---------- 3. ANA BİLEŞEN ----------
const TopluTutanak = () => {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const isBaseAllowed = (item) => {
        if (DURUM_ENGEL.has(Number(item.TMSDespatchDocumentStatu))) return false;
        const PROJE_ENGEL = ['HASAR İADE', 'AKTÜL', 'KARGO HİZMETLERİ', 'HGS-YAKIT FATURA İŞLEME'].map(U);
        return U(item.VehicleWorkingTypeName) === 'SPOT' &&
            U(item.SpecialGroupName) === 'SPOT' &&
            item.DocumentNo?.startsWith('SFR') &&
            item.TMSDespatchInvoiceDocumentNo &&
            !PROJE_ENGEL.some(k => U(item.ProjectName).includes(k));
    };

    const fetchData = async () => {
        setLoading(true);
        setSelectedIds([]);
        try {
            const resp = await api.post('/tmsdespatches/getall', makeBody(startDate, endDate));
            const filtered = (resp?.data?.Data || []).filter(isBaseAllowed);
            setVeriler(filtered);
        } catch (e) {
            console.error(e);
            alert('Veriler çekilirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // --- Tutanak HTML Şablonu (Senin Formun) ---
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
    <p style="margin: 0;">
        Vergi Dairesi: ALEMDAĞ<br>
        Vergi No: 6340954050
    </p>
</div>


           <div style="margin-bottom: 25px;">
    <p><strong>TAŞIYICI :</strong></p>
    <p><strong>${row.SupplierCurrentAccountFullTitle || '---'}</strong></p>
</div>


            <h3 style="text-decoration: underline;">AÇIKLAMALAR :</h3>
            <p style="text-align: justify;">
                Sayın Taşıyıcı Muhatap; ${row.SupplierCurrentAccountFullTitle}, ${formatDateISO(row.DespatchDate)} tarihinde ${row.DocumentNo} nolu sefer numaralı ${row.CustomerFullTitle}, ${row.PickupCityCountyName}’dan yükleyip ${row.DeliveryCurrentAccountName}, ${row.DeliveryCityCountyName}’ya ulaştırılması amacıyla ${plakaStr} Plakalı araç sürücüsü ${row.FullName} (TCKN: ${row.CitizenNumber}) Tedarikçi firma ${row.SupplierCurrentAccountFullTitle}, ${row.TMSDespatchWaybillNumber || '---'} nolu irsaliyeli fatura ile taşınan ürünlerin teslim edildiğini beyan edilmiştir. Ancak teslime ilişkin evraklar bugüne kadar tarafımıza ibraz edilmemiştir.
            </p>

<p style="
    text-align: left;
    line-height: 1.5;
    margin-top: 15px;
">
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

<h3 style="margin-top: 30px; margin-bottom: 15px; font-weight: bold;">
    SORUMLULUK BEYANI
</h3>

<p style="margin: 0 0 15px 0; font-weight: bold;">
    ODAK TEDARİK ZİNCİRİ VE LOJİSTİK A.Ş.’ne
</p>

<p style="margin: 0; line-height: 1.5;">
    Sayın Taşıyıcı Muhatap; ${row.SupplierCurrentAccountFullTitle},
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

    // --- Toplu ZIP İndirme İşlemi ---
    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;
        setCreating(true);
        const zip = new JSZip();

        try {
            const selectedRows = veriler.filter(v => selectedIds.includes(v.TMSDespatchId));

            selectedRows.forEach((row) => {
                const htmlContent = generateTutanakHTML(row);
                const docxBlob = htmlDocx.asBlob(htmlContent);
                const fileName = `${row.DocumentNo}_${row.PlateNumber.replace(/\s/g, '')}_Tutanak.docx`;
                zip.file(fileName, docxBlob);
            });

            const zipContent = await zip.generateAsync({ type: "blob" });
            saveAs(zipContent, `Tutanaklar_${new Date().getTime()}.zip`);
        } catch (error) {
            console.error(error);
            alert("Dosyalar oluşturulurken bir hata oluştu.");
        } finally {
            setCreating(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === veriler.length && veriler.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(veriler.map(item => item.TMSDespatchId));
        }
    };

    return (
        <div className="min-h-screen bg-[#080c14] text-slate-300 p-6 lg:p-12 font-sans relative">

            {/* Arka Plan Glow */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -z-10" />

            <div className="max-w-[1850px] mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-white tracking-tighter italic">
                            TMS <span className="text-indigo-500 underline underline-offset-8 decoration-indigo-500/20">OPERASYON</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.4em]">Toplu Tutanak Oluşturma Merkezi</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/40 p-2.5 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl">
                        <div className="flex items-center gap-6 px-6 py-2">
                            <CalendarIcon size={18} className="text-indigo-400" />
                            <DatePicker
                                selected={startDate}
                                onChange={d => setStartDate(d)}
                                dateFormat="dd.MM.yyyy"
                                className="bg-transparent w-24 text-sm font-bold text-white outline-none cursor-pointer"
                                popperClassName="custom-date-popper"
                            />
                            <ArrowRight size={16} className="text-slate-700" />
                            <DatePicker
                                selected={endDate}
                                onChange={d => setEndDate(d)}
                                dateFormat="dd.MM.yyyy"
                                className="bg-transparent w-24 text-sm font-bold text-white outline-none cursor-pointer"
                                popperClassName="custom-date-popper"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-[1.5rem] font-black text-xs tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                            SORGULA
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-[#0d121f]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    <th className="px-8 py-8 w-16">
                                        <button
                                            onClick={toggleSelectAll}
                                            className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${selectedIds.length === veriler.length && veriler.length > 0 ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'border-slate-700'}`}
                                        >
                                            {selectedIds.length === veriler.length && veriler.length > 0 && <CheckCircle2 size={16} className="text-white" />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Tedarikçi & Müşteri</th>
                                    <th className="px-6 py-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Sefer & İrsaliye</th>
                                    <th className="px-6 py-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Araç / Plaka</th>
                                    <th className="px-6 py-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Rota</th>
                                    <th className="px-6 py-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Sürücü Detay</th>
                                    <th className="px-6 py-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {loading ? (
                                    <tr><td colSpan={7} className="py-48 text-center"><Loader2 size={40} className="animate-spin text-indigo-500 mx-auto opacity-20" /></td></tr>
                                ) : veriler.length === 0 ? (
                                    <tr><td colSpan={7} className="py-48 text-center text-slate-600 font-bold tracking-[0.3em] uppercase">Veri bulunamadı</td></tr>
                                ) : (
                                    veriler.map((item) => (
                                        <tr
                                            key={item.TMSDespatchId}
                                            onClick={() => toggleSelect(item.TMSDespatchId)}
                                            className={`group transition-all cursor-pointer ${selectedIds.includes(item.TMSDespatchId) ? 'bg-indigo-500/[0.08]' : 'hover:bg-white/[0.02]'}`}
                                        >
                                            <td className="px-8 py-8" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => toggleSelect(item.TMSDespatchId)}
                                                    className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${selectedIds.includes(item.TMSDespatchId) ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'border-slate-800 group-hover:border-slate-600'}`}
                                                >
                                                    {selectedIds.includes(item.TMSDespatchId) && <CheckCircle2 size={16} className="text-white" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-8">
                                                <div className="font-bold text-white text-sm leading-tight max-w-[250px]">{item.SupplierCurrentAccountFullTitle}</div>
                                                <div className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-tighter">Müşteri: {item.CustomerFullTitle}</div>
                                            </td>
                                            <td className="px-6 py-8">
                                                <div className="font-mono text-indigo-400 font-black text-sm">#{item.DocumentNo}</div>
                                                <div className="text-slate-400 text-[10px] font-bold mt-1 uppercase italic">İrs: {item.TMSDespatchWaybillNumber || '-'}</div>
                                                <div className="text-slate-600 text-[10px] font-bold mt-0.5">{formatDateISO(item.DespatchDate)}</div>
                                            </td>
                                            <td className="px-6 py-8">
                                                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-white font-black text-xs tracking-widest w-fit mb-2 group-hover:border-indigo-500/50 transition-colors">
                                                    {item.PlateNumber}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 italic">
                                                    <Container size={12} /> {item.TrailerPlateNumber || '---'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-8">
                                                <div className="flex flex-col gap-2 relative pl-4 border-l border-white/5">
                                                    <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-tighter">↑ {item.PickupCityCountyName}</div>
                                                    <div className="text-[11px] font-bold text-rose-500 uppercase tracking-tighter">↓ {item.DeliveryCityCountyName}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8">
                                                <div className="font-black text-slate-200 text-[11px] uppercase tracking-tight italic">{item.FullName}</div>
                                                <div className="text-slate-600 font-mono text-[10px] mt-1">{item.CitizenNumber}</div>
                                            </td>
                                            <td className="px-6 py-8">
                                                <StatusBadge code={item.TMSDespatchDocumentStatu} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Floating Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-[1000] animate-in fade-in slide-in-from-bottom-10 duration-500">
                        <div className="bg-indigo-600 rounded-[2.5rem] p-4 shadow-[0_25px_50px_-12px_rgba(79,70,229,0.5)] flex flex-col sm:flex-row items-center justify-between border border-white/20 backdrop-blur-xl">
                            <div className="flex items-center gap-6 pl-6 py-2 sm:py-0">
                                <div className="bg-white/20 p-4 rounded-2xl">
                                    <FileCheck2 className="text-white" size={32} />
                                </div>
                                <div>
                                    <div className="text-white font-black text-2xl leading-none">{selectedIds.length} Sefer Seçildi</div>
                                    <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-2 opacity-80">ZIP formatında toplu Word belgeleri indirilebilir</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="flex-1 sm:flex-none px-6 py-4 text-white font-black text-xs tracking-widest hover:bg-white/10 rounded-2xl transition-all"
                                >
                                    TEMİZLE
                                </button>
                                <button
                                    onClick={handleBulkDownload}
                                    disabled={creating}
                                    className="flex-1 sm:flex-none bg-white text-indigo-600 px-10 py-5 rounded-[1.5rem] font-black text-xs tracking-[0.2em] hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {creating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                                    {creating ? "HAZIRLANIYOR..." : "TOPLU TUTANAK İNDİR"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-date-popper { z-index: 99999 !important; }
                .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 2px solid #080c14; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
                
                .react-datepicker {
                    background: #0f172a !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    border-radius: 1.5rem !important;
                    box-shadow: 0 50px 100px -20px rgba(0,0,0,0.7) !important;
                }
                .react-datepicker__header { background: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
                .react-datepicker__current-month, .react-datepicker__day-name { color: #94a3b8 !important; font-weight: 800 !important; }
                .react-datepicker__day { color: #f1f5f9 !important; }
                .react-datepicker__day:hover { background: #4f46e5 !important; border-radius: 0.5rem; }
                .react-datepicker__day--selected { background: #4f46e5 !important; border-radius: 0.5rem; }
            `}</style>
        </div>
    );
};

export default TopluTutanak;