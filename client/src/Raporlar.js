import React, { useState } from 'react';
import api from './apiClient';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import tr from 'date-fns/locale/tr';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import {
    FiFilter, FiDownload, FiBarChart2, FiUsers, FiTruck, FiTable, FiX, FiRefreshCw, FiCalendar,
} from 'react-icons/fi';

registerLocale('tr', tr);

const Raporlar = () => {
    // ---------------- state & sabitler (AYNEN) ----------------
    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hata, setHata] = useState(null);

    const [startDate, setStartDate] = useState(new Date('2025-01-04'));
    const [endDate, setEndDate] = useState(new Date('2025-01-04'));

    const [filters, setFilters] = useState({ firma: '', proje: '', durum: '', kullanici: '' });

    const durumAciklamalari = {
        1: 'BEKLİYOR', 2: 'ONAYLANDI', 3: 'SPOT ARAÇ PLANLAMADA', 4: 'ARAÇ ATANDI', 5: 'ARAÇ YÜKLENDİ',
        6: 'ARAÇ YOLDA', 7: 'TESLİM EDİLDİ', 8: 'TAMAMLANDI', 10: 'EKSİK EVRAK', 20: 'HASARSIZ GÖRÜNTÜ',
        30: 'HASARLI GÖRÜNTÜ İŞLENDİ', 31: 'HASARLI-ORJİNAL EVRAK', 40: 'ORJİNAL EVRAK GELDİ',
        50: 'EVRAK ARŞİVLENDİ', 80: 'ARAÇ BOŞALTMADA', 90: 'FİLO ARAÇ PLANLAMADA', 200: 'İPTAL',
    };

    const U = (v) => (v ?? '').toString().trim().toLocaleUpperCase('tr-TR');
    const PROJE_ENGEL = ['HASAR İADE', 'AKTÜL', 'KARGO HİZMETLERİ', 'HGS-YAKIT FATURA İŞLEME'].map(U);
    const FIRMA_ENGEL = [
        'İZ KENT LOJİSTİK HİZMETLERİ LİMİTED ŞİRKETİ', 'ARKAS LOJİSTİK ANONİM ŞİRKETİ',
        'HEDEF TÜKETİM ÜRÜNLERİ SANAYİ VE DIŞ TİCARET ANONİM ŞİRKETİ',
        'MOKS MOBİLYA KURULUM SERVİS LOJİSTİK PETROL İTHALAT İHRACAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
        'ODAK TEDARİK ZİNCİRİ VE LOJİSTİK ANONİM ŞİRKETİ',
    ].map(U);

    const isBaseAllowed = (item) => {
        if (U(item.VehicleWorkingTypeName) !== 'SPOT') return false;
        if (U(item.SpecialGroupName) !== 'SPOT') return false;
        if (!item.DocumentNo?.startsWith('SFR')) return false;
        if (!item.TMSDespatchInvoiceDocumentNo) return false;
        if (U(item.PlateNumber) === '34SEZ34') return false;
        if (PROJE_ENGEL.some(k => U(item.ProjectName).includes(k))) return false;
        if (FIRMA_ENGEL.includes(U(item.SupplierCurrentAccountFullTitle))) return false;
        return true;
    };

    const uniqBy = (arr, keyFn) => {
        const seen = new Set();
        return arr.filter((x) => {
            const k = keyFn(x);
            if (k == null) return true;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    };

    const fetchData = async () => {
        setLoading(true);
        setHata(null);

        try {
            // Tarihleri parçalayıp (aynı mantık) her parça için yeni parametre seti ile istek atıyoruz
            const ranges = chunkDateRanges(startDate, endDate, 2);
            const all = [];

            for (const { start, end } of ranges) {
                const body = {
                    // mevcut alanlar
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    userId: 1,

                    // yeni eklenen alanlar (backend istediği adlarla ve defaultlar ile)
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

            // mevcut filtreleme mantığını koruyoruz
            const filtreliData = all.filter((item) => {
                const projeEngellenenler = ['HASAR İADE', 'AKTÜL', 'KARGO HİZMETLERİ', 'HGS-YAKIT FATURA İŞLEME'];
                const firmaEngellenenler = [
                    'İZ KENT LOJİSTİK HİZMETLERİ LİMİTED ŞİRKETİ', 'ARKAS LOJİSTİK ANONİM ŞİRKETİ',
                    'HEDEF TÜKETİM ÜRÜNLERİ SANAYİ VE DIŞ TİCARET ANONİM ŞİRKETİ',
                    'MOKS MOBİLYA KURULUM SERVİS LOJİSTİK PETROL İTHALAT İHRACAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
                    'ODAK TEDARİK ZİNCİRİ VE LOJİSTİK ANONİM ŞİRKETİ', 'KONFRUT AG TARIM ANONİM ŞİRKETİ'
                ];

                return (
                    item.VehicleWorkingTypeName === 'SPOT' &&
                    item.SpecialGroupName === 'SPOT' &&
                    item.DocumentNo?.startsWith('SFR') &&
                    item.TMSDespatchInvoiceDocumentNo &&
                    item.PlateNumber !== '34SEZ34' &&
                    !projeEngellenenler.some(k => item.ProjectName?.includes(k)) &&
                    !firmaEngellenenler.includes(item.SupplierCurrentAccountFullTitle)
                );
            });

            setVeriler(filtreliData);
        } catch (e) {
            console.error(e);
            setHata('Veri alınamadı. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };
    const excelExportEt = () => {
        const data = uniqBy(filtrelenmisVeri.filter(isBaseAllowed), x => x.DocumentNo);
        if (data.length === 0) return alert('Aktarılacak veri bulunamadı.');
        const rows = data.map((x) => ({
            'Tedarikçi Firma': x.SupplierCurrentAccountFullTitle, 'Proje Adı': x.ProjectName,
            'Sefer Tarihi': x.DespatchDate?.split('T')[0], 'Sefer No': x.DocumentNo,
            'Durum': durumAciklamalari[x.TMSDespatchDocumentStatu] ?? x.TMSDespatchDocumentStatu,
            'Plaka': x.PlateNumber, 'Kullanıcı': x.TMSDespatchCreatedBy,
            'Araç Çalışma Alt Grubu': x.SpecialGroupName, 'Çalışma Tipi': x.VehicleWorkingTypeName,
            'Alış Fatura No': x.TMSDespatchInvoiceDocumentNo,
        }));
        const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rapor');
        const fileName = `rapor_${startDate.toLocaleDateString('tr-TR')}_-_${endDate.toLocaleDateString('tr-TR')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const getUniqueValues = (key) => {
        const all = veriler.map((item) => item[key]);
        return [...new Set(all.filter(Boolean))];
    };

    const projeBazliRaporOlustur = async () => {
        const data = uniqBy(filtrelenmisVeri.filter(isBaseAllowed), x => x.DocumentNo);
        if (data.length === 0) return alert('Raporlanacak veri bulunamadı.');
        const sadeceBunlar = ['BEKLİYOR', 'EKSİK EVRAK', 'HASARLI GÖRÜNTÜ İŞLENDİ', 'HASARLI-ORJİNAL EVRAK GELDİ', 'ORJİNAL EVRAK GELDİ'];
        const projeDurumSayim = {};
        data.forEach((item) => {
            const proje = item.ProjectName || 'Bilinmeyen Proje';
            const durum = durumAciklamalari[item.TMSDespatchDocumentStatu];
            if (!sadeceBunlar.includes(durum)) return;
            if (!projeDurumSayim[proje]) { projeDurumSayim[proje] = {}; sadeceBunlar.forEach(d => projeDurumSayim[proje][d] = 0); }
            projeDurumSayim[proje][durum]++;
        });
        const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('ProjeBazliDurum');
        const headers = ['Proje', ...sadeceBunlar, 'Genel Toplam', ...sadeceBunlar.map(d => `${d} %`)]; sheet.addRow(headers);
        Object.entries(projeDurumSayim).forEach(([proje, obj]) => {
            const toplam = sadeceBunlar.reduce((s, k) => s + (obj[k] || 0), 0);
            const yuzdeler = sadeceBunlar.map(k => toplam > 0 ? `${((obj[k] / toplam) * 100).toFixed(2)}%` : '0%');
            sheet.addRow([proje, ...sadeceBunlar.map(k => obj[k]), toplam, ...yuzdeler]);
        });
        sheet.columns.forEach((c) => { let w = 10; c.eachCell?.(cell => { const val = cell.value ? cell.value.toString() : ''; if (val.length > w) w = val.length; }); c.width = w + 2; c.alignment = { vertical: 'middle', horizontal: 'center' }; });
        sheet.getRow(1).eachCell((cell) => { cell.style = { font: { bold: true, color: { argb: 'FF000000' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } }; });
        sheet.eachRow((row, i) => { if (i === 1) return; const col = i % 2 === 0 ? 'FFF0F0F0' : 'FFFFFFFF'; row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col } }; }); });
        const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `proje_bazli_durum_raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    const chunkDateRanges = (start, end, step = 7) => {
        const ranges = []; let cursor = new Date(start); const endDate = new Date(end);
        while (cursor <= endDate) { const s = new Date(cursor); const e = new Date(cursor); e.setDate(e.getDate() + step - 1); if (e > endDate) e.setTime(endDate.getTime()); ranges.push({ start: new Date(s), end: new Date(e) }); cursor.setDate(cursor.getDate() + step); }
        return ranges;
    };

    const tedarikciPivotGrupRaporOlustur = async () => {
        const data = uniqBy(filtrelenmisVeri.filter(isBaseAllowed), x => x.DocumentNo);
        if (data.length === 0) return alert('Raporlanacak veri bulunamadı.');
        const sadeceBunlar = ['BEKLİYOR', 'EKSİK EVRAK', 'HASARLI GÖRÜNTÜ İŞLENDİ', 'HASARLI-ORJİNAL EVRAK GELDİ', 'ORJİNAL EVRAK GELDİ'];
        const siralamaKriteri = sadeceBunlar.slice(0, 4);
        const grouped = {}; const seferSayilari = {};
        data.forEach((item) => {
            const tedarikci = item.SupplierCurrentAccountFullTitle || 'Bilinmeyen Tedarikçi';
            const proje = item.ProjectName || 'Bilinmeyen Proje';
            const durum = durumAciklamalari[item.TMSDespatchDocumentStatu]; const documentNo = item.DocumentNo;
            if (!sadeceBunlar.includes(durum)) return;
            if (!grouped[tedarikci]) grouped[tedarikci] = {};
            if (!grouped[tedarikci][proje]) { grouped[tedarikci][proje] = {}; sadeceBunlar.forEach(d => grouped[tedarikci][proje][d] = 0); }
            grouped[tedarikci][proje][durum]++; const key = `${tedarikci}__${proje}`; if (!seferSayilari[key]) seferSayilari[key] = new Set(); if (documentNo) seferSayilari[key].add(documentNo);
        });
        const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Tedarikçi Bazlı Rapor');
        const headers = ['Proje', ...sadeceBunlar, 'Toplam Sefer'];
        const sorted = Object.entries(grouped).map(([tedarikci, projeler]) => {
            let total = 0; Object.values(projeler).forEach(dur => { total += siralamaKriteri.reduce((s, d) => s + dur[d], 0); }); return { tedarikci, projeler, total };
        }).sort((a, b) => b.total - a.total);
        sorted.forEach(({ tedarikci, projeler }) => {
            const titleRow = sheet.addRow([`🏢 ${tedarikci}`]);
            sheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(65 + headers.length - 1)}${titleRow.number}`);
            titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }; titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7BAE57' } };
            const headerRow = sheet.addRow(headers);
            headerRow.eachCell((cell) => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F4' } }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            Object.entries(projeler).forEach(([proje, durumlar], index) => {
                const key = `${tedarikci}__${proje}`; const seferSayisi = seferSayilari[key]?.size || 0;
                const row = sheet.addRow([proje, ...sadeceBunlar.map(d => durumlar[d]), seferSayisi]);
                const fill = index % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
                row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });
                row.getCell(1).alignment = { horizontal: 'left' };
            });
            sheet.addRow([]);
        });
        sheet.columns.forEach((col, idx) => { col.width = idx === 0 ? 35 : 18; col.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `tedarikci_modern_pastel_rapor_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    const kullaniciBazliRaporOlustur = async () => {
        const data = uniqBy(filtrelenmisVeri.filter(isBaseAllowed), x => x.DocumentNo);
        if (data.length === 0) return alert('Raporlanacak veri bulunamadı.');
        const sadeceBunlar = ['BEKLİYOR', 'EKSİK EVRAK', 'HASARLI GÖRÜNTÜ İŞLENDİ', 'HASARLI-ORJİNAL EVRAK GELDİ', 'ORJİNAL EVRAK GELDİ'];
        const siralamaKriteri = sadeceBunlar.slice(0, 4);
        const grouped = {};
        data.forEach((item) => {
            const kullanici = item.TMSDespatchCreatedBy || 'Bilinmeyen Kullanıcı';
            const proje = item.ProjectName || 'Bilinmeyen Proje';
            const durum = durumAciklamalari[item.TMSDespatchDocumentStatu];
            if (!sadeceBunlar.includes(durum)) return;
            if (!grouped[kullanici]) grouped[kullanici] = {};
            if (!grouped[kullanici][proje]) { grouped[kullanici][proje] = {}; sadeceBunlar.forEach(d => grouped[kullanici][proje][d] = 0); }
            grouped[kullanici][proje][durum]++;
        });
        const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Kullanıcı Bazlı Rapor');
        const headers = ['Kullanıcı / Proje', ...sadeceBunlar, 'Genel Toplam']; const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FF000000' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
        const sortedUsers = Object.entries(grouped).map(([kullanici, projeler]) => {
            let toplam = 0; Object.values(projeler).forEach(d => { toplam += siralamaKriteri.reduce((s, x) => s + d[x], 0); }); return { kullanici, projeler, toplam };
        }).sort((a, b) => b.toplam - a.toplam);
        sortedUsers.forEach(({ kullanici, projeler }) => {
            const titleRow = sheet.addRow([`👤 ${kullanici}`]);
            sheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(65 + headers.length - 1)}${titleRow.number}`);
            titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }; titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A86E8' } };
            Object.entries(projeler).forEach(([proje, durumlar], index) => {
                const toplam = sadeceBunlar.reduce((s, d) => s + durumlar[d], 0);
                const row = sheet.addRow([proje, ...sadeceBunlar.map(d => durumlar[d]), toplam]);
                const fill = index % 2 === 0 ? 'FFF7F7F7' : 'FFFFFFFF';
                row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });
                row.getCell(1).alignment = { horizontal: 'left' };
            });
            sheet.addRow([]);
        });
        sheet.columns.forEach((c, i) => c.width = i === 0 ? 35 : 18);
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `kullanici_modern_raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    const filtrelenmisVeri = veriler.filter((item) => (
        (filters.firma === '' || item.SupplierCurrentAccountFullTitle === filters.firma) &&
        (filters.proje === '' || item.ProjectName === filters.proje) &&
        (filters.durum === '' || String(item.TMSDespatchDocumentStatu) === String(filters.durum)) &&
        (filters.kullanici === '' || item.TMSDespatchCreatedBy === filters.kullanici)
    ));

    // ---------------- küçük yardımcı UI ----------------
    const StatusBadge = ({ code }) => {
        const label = durumAciklamalari[code] || code;
        const tone =
            label === 'İPTAL' ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                : ['BEKLİYOR'].includes(label) ? 'bg-slate-500/20 text-slate-300 border-slate-400/30'
                    : ['EKSİK EVRAK'].includes(label) ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                        : ['HASARLI GÖRÜNTÜ İŞLENDİ', 'HASARLI-ORJİNAL EVRAK'].includes(label) ? 'bg-pink-500/20 text-pink-300 border-pink-400/30'
                            : ['ORJİNAL EVRAK GELDİ', 'TESLİM EDİLDİ', 'TAMAMLANDI'].includes(label) ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30';
        return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${tone}`}>{label}</span>;
    };

    const SkeletonRow = () => (
        <tr>{[...Array(10)].map((_, i) => (<td key={i} className="px-4 py-3"><div className="h-3 w-full rounded bg-gray-700/60 animate-pulse" /></td>))}</tr>
    );

    // ---------------- görünüm ----------------
    return (
        <div className="min-h-screen w-full bg-[#0b0f1a] text-white">
            {/* HEADER – tam ekran, ferah butonlar */}
            <header className="w-full border-b border-white/10 bg-[#0d1426]/90 backdrop-blur">
                <div className="w-full max-w-none px-10 py-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">📊 Raporlar</h1>
                            <p className="mt-1 text-sm text-white/60">
                                Aralık: <b>{startDate.toLocaleDateString('tr-TR')}</b> – <b>{endDate.toLocaleDateString('tr-TR')}</b>
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <button onClick={fetchData} className="btn-lg btn-indigo"><FiRefreshCw className="mr-2" />Sorgula</button>
                            <button onClick={excelExportEt} className="btn-lg btn-emerald"><FiDownload className="mr-2" />Genel Excel</button>
                            <button onClick={projeBazliRaporOlustur} className="btn-lg btn-violet"><FiBarChart2 className="mr-2" />Proje Durum</button>
                            <button onClick={tedarikciPivotGrupRaporOlustur} className="btn-lg btn-amber"><FiTruck className="mr-2" />Tedarikçi/Projeler</button>
                            <button onClick={kullaniciBazliRaporOlustur} className="btn-lg btn-pink"><FiUsers className="mr-2" />Kullanıcı Raporu</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENT – tam genişlik, sade */}
            <main className="w-full px-10 py-8">
                {/* Filtreler */}
                <section className="rounded-2xl border border-white/10 bg-white/5 p-6 overflow-visible relative">
                    <div className="mb-5 flex items-center gap-2 text-white/80">
                        <FiFilter /><span className="text-lg font-semibold">Filtreler</span>
                    </div>

                    {/* geniş ekranlarda tek satır olacak şekilde sade grid */}
                    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 2xl:grid-cols-6">
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
                                <FiCalendar /> Başlangıç
                            </label>
                            <DatePicker
                                selected={startDate}
                                onChange={setStartDate}
                                dateFormat="dd.MM.yyyy"
                                locale="tr"
                                className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                withPortal
                                popperClassName="datepicker-popper"
                                popperPlacement="bottom-start"
                            />
                        </div>
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
                                <FiCalendar /> Bitiş
                            </label>
                            <DatePicker
                                selected={endDate}
                                onChange={setEndDate}
                                dateFormat="dd.MM.yyyy"
                                locale="tr"
                                className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                withPortal
                                popperClassName="datepicker-popper"
                                popperPlacement="bottom-start"
                            />
                        </div>

                        {[
                            { key: 'firma', label: 'Tedarikçi Firma', mapKey: 'SupplierCurrentAccountFullTitle' },
                            { key: 'proje', label: 'Proje Adı', mapKey: 'ProjectName' },
                            { key: 'durum', label: 'Durum', mapKey: 'TMSDespatchDocumentStatu' },
                            { key: 'kullanici', label: 'Kullanıcı', mapKey: 'TMSDespatchCreatedBy' },
                        ].map(({ key, label, mapKey }) => (
                            <div key={key}>
                                <label className="mb-2 block text-xs uppercase tracking-wide text-white/70">{label}</label>
                                <select
                                    value={filters[key]}
                                    onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                                    className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                
                                    <option value="">Tümü</option>
                                    {getUniqueValues(mapKey).map((val, i) => (
                                        <option key={i} value={val}>
                                            {mapKey === 'TMSDespatchDocumentStatu' ? (durumAciklamalari[val] || val) : val}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* aktif filtreler + işlemler */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(filters).filter(([, v]) => Boolean(v)).map(([k, v]) => (
                                <span key={k} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
                                    <FiTable /><span className="capitalize">{k}:</span>
                                    <span className="font-medium">{k === 'durum' ? (durumAciklamalari[v] || v) : v}</span>
                                    <button onClick={() => setFilters({ ...filters, [k]: '' })} className="rounded-full p-1 hover:bg-white/10" title="Kaldır">
                                        <FiX />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={fetchData} className="btn-md btn-indigo"><FiRefreshCw className="mr-2" />Veriyi Getir</button>
                            <button onClick={() => setFilters({ firma: '', proje: '', durum: '', kullanici: '' })} className="btn-md btn-ghost">Filtreleri Temizle</button>
                        </div>
                    </div>
                </section>

                {/* Sonuçlar */}
                <section className="mt-8 rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                        <div className="flex items-center gap-2 text-white/80">
                            <FiTable /><span className="font-semibold">Sonuçlar</span>
                            <span className="text-sm text-white/50">
                                ({filtrelenmisVeri.filter(isBaseAllowed).length.toLocaleString('tr-TR')})
                            </span>
                        </div>
                        <button onClick={excelExportEt} className="btn-md btn-emerald">
                            <FiDownload className="mr-2" /> Excel'e Aktar
                        </button>
                    </div>

                    <div className="max-h-[72vh] overflow-auto">
                        <table className="min-w-full divide-y divide-white/10 text-[13.5px]">
                            <thead className="sticky top-0 z-10 bg-[#0d1426]/95 backdrop-blur">
                                <tr className="text-xs uppercase tracking-wider text-white/70">
                                    <th className="px-4 py-3 text-left">Tedarikçi Firma</th>
                                    <th className="px-4 py-3 text-left">Proje Adı</th>
                                    <th className="px-4 py-3 text-left">Sefer Tarihi</th>
                                    <th className="px-4 py-3 text-left">Sefer No</th>
                                    <th className="px-4 py-3 text-left">Durum</th>
                                    <th className="px-4 py-3 text-left">Plaka</th>
                                    <th className="px-4 py-3 text-left">Kullanıcı</th>
                                    <th className="px-4 py-3 text-left">Araç Çalışma Alt Grubu</th>
                                    <th className="px-4 py-3 text-left">Çalışma Tipi</th>
                                    <th className="px-4 py-3 text-left">Alış Fatura No</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {loading ? (
                                    [...Array(10)].map((_, i) => <SkeletonRow key={i} />)
                                ) : hata ? (
                                    <tr><td colSpan="10" className="px-4 py-6 text-center text-rose-300">{hata}</td></tr>
                                ) : filtrelenmisVeri.length === 0 ? (
                                    <tr><td colSpan="10" className="px-4 py-8 text-center text-white/60">Veri bulunamadı</td></tr>
                                ) : (
                                    filtrelenmisVeri.filter(isBaseAllowed).map((item, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="px-4 py-3">{item.SupplierCurrentAccountFullTitle}</td>
                                            <td className="px-4 py-3">{item.ProjectName}</td>
                                            <td className="px-4 py-3">{item.DespatchDate?.split('T')[0]}</td>
                                            <td className="px-4 py-3 font-medium text-indigo-300">{item.DocumentNo}</td>
                                            <td className="px-4 py-3"><StatusBadge code={item.TMSDespatchDocumentStatu} /></td>
                                            <td className="px-4 py-3">{item.PlateNumber}</td>
                                            <td className="px-4 py-3">{item.TMSDespatchCreatedBy}</td>
                                            <td className="px-4 py-3">{item.SpecialGroupName}</td>
                                            <td className="px-4 py-3">{item.VehicleWorkingTypeName}</td>
                                            <td className="px-4 py-3">{item.TMSDespatchInvoiceDocumentNo}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* Modern buton utility stilleri */}
            <style>{`
  :root { --ring-indigo: rgba(99,102,241,.45); }

  /* ---- Button utilities ---- */
  .btn-lg, .btn-md{
    display:inline-flex; align-items:center; gap:8px; white-space:nowrap;
    cursor:pointer; user-select:none;
  }
  .btn-lg{
    padding:10px 16px; border-radius:14px; font-weight:600;
    box-shadow:0 6px 18px rgba(0,0,0,.25);
    transition:transform .15s ease, filter .15s ease, box-shadow .2s ease, background-color .2s ease;
    border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.08);
  }
  .btn-md{
    padding:8px 14px; border-radius:12px; font-weight:600;
    border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.08);
    transition:transform .15s ease, filter .15s ease, background-color .2s ease, box-shadow .2s ease;
  }
  .btn-lg:hover,.btn-md:hover{ transform:translateY(-1px); filter:brightness(1.05); }
  .btn-lg:active,.btn-md:active{ transform:translateY(0); filter:brightness(.98); }
  .btn-lg:focus-visible,.btn-md:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--ring-indigo); }

  .btn-ghost{ background:transparent; color:#c7cbd6; border-color:rgba(255,255,255,.12); }
  .btn-indigo{ background:#4f46e5; color:#fff; border-color:transparent; }
  .btn-emerald{ background:#059669; color:#fff; border-color:transparent; }
  .btn-violet{ background:#7c3aed; color:#fff; border-color:transparent; }
  .btn-amber{ background:#f59e0b; color:#111827; border-color:transparent; }
  .btn-pink{ background:#ec4899; color:#fff; border-color:transparent; }

  .btn-soft{
    display:inline-flex; align-items:center; gap:8px;
    padding:8px 14px; border-radius:12px; font-weight:600;
    background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.12);
    transition:background-color .2s ease, box-shadow .2s ease;
  }
  .btn-soft:hover{ background:rgba(255,255,255,.14); }
  .btn-soft:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--ring-indigo); }

  .btn-lg[disabled], .btn-md[disabled],
  .btn-lg:disabled, .btn-md:disabled{
    opacity:.6; cursor:not-allowed; filter:none; transform:none;
  }

  /* ---- DatePicker (koyu tema + z-index) ---- */
  .datepicker-popper,
  .react-datepicker-popper,
  .react-datepicker__portal{ z-index:9999 !important; }

  .react-datepicker,
  .react-datepicker__header{
    background:#0b1220; border-color:rgba(255,255,255,.12); color:#e5e7eb;
  }
  .react-datepicker__current-month,
  .react-datepicker-time__header,
  .react-datepicker-year-header{ color:#e5e7eb; }
  .react-datepicker__day-name,
  .react-datepicker__day,
  .react-datepicker__time-name{ color:#e5e7eb; }
  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected{ background:#4f46e5; color:#fff; }
  .react-datepicker__day:hover{ background:#1f2937; }

  /* ---- Select (koyu tema okunurluk) ---- */
  select{
    color:#e5e7eb; background-color:#1f2937;
    border-color:rgba(255,255,255,.1);
  }
  select:focus{
    outline:none; box-shadow:0 0 0 3px var(--ring-indigo); border-color:#6366f1;
  }
  select option{ color:#e5e7eb; background-color:#0b1220; }
`}</style>

        </div>
    );
};

export default Raporlar;
