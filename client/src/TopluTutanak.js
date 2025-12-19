import React, { useState } from 'react';
import api from './apiClient';
import DatePicker from 'react-datepicker';
import { tr } from 'date-fns/locale';
import {
    Search, Loader2, Calendar as CalendarIcon, ArrowRight,
    Download, FileCheck2, CheckCircle2, ShieldCheck
} from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

// ✅ Supabase client
import { supabase } from './supabaseClient';

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

    // ✅ VKN GETİR için ek state'ler
    const [firmaEslesmeleri, setFirmaEslesmeleri] = useState({});
    const [vknLoading, setVknLoading] = useState(false);
    const [vknHata, setVknHata] = useState(null);

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

    // ✅ VKN GETİR: tablodaki "Tedarikçi" -> supabase firmalar.unvan eşleştir (aynı unvan çoksa hepsini al)
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

            // Supabase .in() limitlerine takılmamak için chunk
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
                Taşıtan'ın müşterisine ait sevk irsaliyyesi veya Taşıtan'a ait taşıma irsaliyesi
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
            <div className="max-w-[2200px] mx-auto space-y-8">
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

                        {/* ✅ Yeni Buton: VKN GETİR */}
                        <button
                            onClick={handleVknGetir}
                            disabled={vknLoading || veriler.length === 0}
                            className="px-8 py-3 bg-emerald-600 rounded-2xl font-black text-xs text-white hover:bg-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50"
                            title={veriler.length === 0 ? "Önce sorgu çekmelisin" : "Supabase firmalar tablosundan firma bilgileri getir"}
                        >
                            {vknLoading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} VKN GETİR
                        </button>
                    </div>
                </div>

                {/* Hata Alanı */}
                {hata && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-6 py-4 rounded-2xl">
                        {hata}
                    </div>
                )}

                {/* ✅ VKN Hata Alanı */}
                {vknHata && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-6 py-4 rounded-2xl">
                        {vknHata}
                    </div>
                )}

                {/* Tablo */}
                <div className="bg-[#0d121f]/80 border border-white/5 rounded-[2.5rem] shadow-2xl">
                    <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
                        <table className="w-full text-left table-fixed min-w-[1600px]">
                            <thead className="sticky top-0 z-10 bg-[#0b1020]/90 backdrop-blur border-b border-white/5">
                                <tr>
                                    <th className="p-7 w-20">
                                        <button
                                            onClick={() =>
                                                setSelectedIds(
                                                    selectedIds.length === veriler.length ? [] : veriler.map(i => i.TMSDespatchId)
                                                )
                                            }
                                            className={`w-7 h-7 rounded-xl border-2 transition-all ${selectedIds.length === veriler.length && veriler.length > 0
                                                    ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_0_5px_rgba(99,102,241,0.16)]'
                                                    : 'border-slate-700 hover:border-slate-500'
                                                }`}
                                        >
                                            {selectedIds.length === veriler.length && veriler.length > 0 && (
                                                <CheckCircle2 size={18} className="text-white mx-auto" />
                                            )}
                                        </button>
                                    </th>

                                    <th className="px-7 py-6 text-[13px] tracking-wider font-black uppercase text-slate-300 w-[520px]">
                                        Tedarikçi
                                    </th>

                                    <th className="px-7 py-6 text-[13px] tracking-wider font-black uppercase text-slate-300 w-[520px]">
                                        Firma Bilgileri
                                    </th>

                                    <th className="px-7 py-6 text-[13px] tracking-wider font-black uppercase text-slate-300 w-[260px]">
                                        Sefer / Tarih
                                    </th>

                                    <th className="px-7 py-6 text-[13px] tracking-wider font-black uppercase text-slate-300 w-[180px]">
                                        Plaka
                                    </th>

                                    <th className="px-7 py-6 text-[13px] tracking-wider font-black uppercase text-slate-300 w-[240px]">
                                        Durum
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/[0.05]">
                                {veriler.map((item) => {
                                    const isSelected = selectedIds.includes(item.TMSDespatchId);

                                    return (
                                        <tr
                                            key={item.TMSDespatchId}
                                            onClick={() =>
                                                setSelectedIds(prev =>
                                                    prev.includes(item.TMSDespatchId)
                                                        ? prev.filter(i => i !== item.TMSDespatchId)
                                                        : [...prev, item.TMSDespatchId]
                                                )
                                            }
                                            className={`group cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500/12' : 'hover:bg-white/[0.04]'
                                                }`}
                                        >
                                            <td className="p-7 align-top">
                                                <div
                                                    className={`w-7 h-7 rounded-xl border-2 transition-all ${isSelected
                                                            ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_0_5px_rgba(99,102,241,0.14)]'
                                                            : 'border-slate-700/70 group-hover:border-slate-500'
                                                        }`}
                                                >
                                                    {isSelected && <CheckCircle2 size={18} className="text-white mx-auto" />}
                                                </div>
                                            </td>

                                            <td className="px-7 py-7 align-top">
                                                <div className="text-[18px] font-extrabold text-white leading-snug break-words">
                                                    {item.SupplierCurrentAccountFullTitle}
                                                </div>
                                                <div className="mt-3 text-[14px] text-slate-400 leading-snug break-words">
                                                    {item.CustomerFullTitle}
                                                </div>
                                            </td>

                                            <td className="px-7 py-7 align-top">
                                                {(() => {
                                                    const key = U(item.SupplierCurrentAccountFullTitle);
                                                    const matches = firmaEslesmeleri[key] || [];

                                                    if (matches.length === 0) {
                                                        return (
                                                            <span className="inline-flex items-center px-4 py-2 rounded-full text-[14px] font-black bg-white/[0.04] border border-white/[0.06] text-slate-500">
                                                                -
                                                            </span>
                                                        );
                                                    }

                                                    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
                                                    const vk = uniq(matches.map(m => (m.vkn ?? '').toString().trim()));
                                                    const tc = uniq(matches.map(m => (m.tc ?? '').toString().trim()));
                                                    const kd = uniq(matches.map(m => (m.kod ?? '').toString().trim()));
                                                    const tl = uniq(matches.map(m => (m.telefon ?? '').toString().trim()));
                                                    const ib = uniq(matches.map(m => (m["ıban"] ?? '').toString().trim()));

                                                    const valueOrDash = (arr) => (arr.length ? arr.join(' / ') : '-');

                                                    const Chip = ({ label, value }) => (
                                                        <div className="flex items-start gap-4">
                                                            <span className="text-[12px] font-black tracking-wide text-slate-500 uppercase w-16 pt-[6px]">
                                                                {label}
                                                            </span>
                                                            <span className="px-4 py-2 rounded-2xl text-[14px] font-black bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 break-all">
                                                                {value}
                                                            </span>
                                                        </div>
                                                    );

                                                    return (
                                                        <div className="space-y-3">
                                                            <Chip label="VKN" value={valueOrDash(vk)} />
                                                            <Chip label="TC" value={valueOrDash(tc)} />
                                                            <Chip label="KOD" value={valueOrDash(kd)} />
                                                            <Chip label="TEL" value={valueOrDash(tl)} />
                                                            <Chip label="IBAN" value={valueOrDash(ib)} />

                                                            {matches.length > 1 && (
                                                                <div className="text-[13px] text-slate-400">
                                                                    {matches.length} eşleşme
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            <td className="px-7 py-7 align-top">
                                                <div className="text-[16px] font-mono font-black text-indigo-300">
                                                    #{item.DocumentNo}
                                                </div>
                                                <div className="mt-3 text-[14px] text-slate-400">
                                                    {formatDateISO(item.DespatchDate)}
                                                </div>
                                            </td>

                                            <td className="px-7 py-7 align-top">
                                                <div className="inline-flex items-center px-5 py-2 rounded-2xl text-[16px] font-black bg-white/[0.04] border border-white/[0.06] text-slate-100">
                                                    {item.PlateNumber}
                                                </div>
                                            </td>

                                            <td className="px-7 py-7 align-top">
                                                <span className="inline-flex items-center px-5 py-2 rounded-2xl text-[14px] font-black bg-indigo-500/10 text-indigo-200 border border-indigo-500/20">
                                                    {durumAciklamalari[item.TMSDespatchDocumentStatu] || item.TMSDespatchDocumentStatu}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
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
