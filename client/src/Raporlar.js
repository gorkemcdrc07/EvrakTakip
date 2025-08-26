import React, { useState } from 'react';
import api from './apiClient'; // 👈 axios yerine import
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import tr from 'date-fns/locale/tr';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

registerLocale('tr', tr);

const Raporlar = () => {
    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hata, setHata] = useState(null);

    const [startDate, setStartDate] = useState(new Date('2025-01-04'));
    const [endDate, setEndDate] = useState(new Date('2025-01-04'));

    const [filters, setFilters] = useState({
        firma: '',
        proje: '',
        durum: '',
        kullanici: ''
    });

    const durumAciklamalari = {
        1: 'BEKLİYOR',
        2: 'ONAYLANDI',
        3: 'SPOT ARAÇ PLANLAMADA',
        4: 'ARAÇ ATANDI',
        5: 'ARAÇ YÜKLENDİ',
        6: 'ARAÇ YOLDA',
        7: 'TESLİM EDİLDİ',
        8: 'TAMAMLANDI',
        10: 'EKSİK EVRAK',
        20: 'HASARSIZ GÖRÜNTÜ',
        30: 'HASARLI GÖRÜNTÜ İŞLENDİ',
        31: 'HASARLI-ORJİNAL EVRAK',
        40: 'ORJİNAL EVRAK GELDİ',
        50: 'EVRAK ARŞİVLENDİ',
        80: 'ARAÇ BOŞALTMADA',
        90: 'FİLO ARAÇ PLANLAMADA',
        200: 'İPTAL'
    };

    // === ✅ YENİ: Yardımcılar (temel koşullar + tekilleştirme) ===
    const U = (v) => (v ?? '').toString().trim().toLocaleUpperCase('tr-TR');

    const PROJE_ENGEL = [
        'HASAR İADE',
        'AKTÜL',
        'KARGO HİZMETLERİ',
        'HGS-YAKIT FATURA İŞLEME',
    ].map(U);

    const FIRMA_ENGEL = [
        'İZ KENT LOJİSTİK HİZMETLERİ LİMİTED ŞİRKETİ',
        'ARKAS LOJİSTİK ANONİM ŞİRKETİ',
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
        if (PROJE_ENGEL.some((k) => U(item.ProjectName).includes(k))) return false;
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
    // === Yardımcılar sonu ===

    const fetchData = async () => {
        setLoading(true);
        setHata(null);
        try {
            const ranges = chunkDateRanges(startDate, endDate, 2); // veya 1
            const all = [];

            for (const { start, end } of ranges) {
                const resp = await api.post('/tmsdespatches/getall', {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    userId: 1,
                }); // ✅ timeout parametresi yok; apiClient'taki 120 sn geçerli

                const chunk = resp?.data?.Data || [];
                all.push(...chunk);
            }

            const filtreliData = all.filter((item) => {
                const projeEngellenenler = ['HASAR İADE', 'AKTÜL', 'KARGO HİZMETLERİ', 'HGS-YAKIT FATURA İŞLEME'];
                const firmaEngellenenler = [
                    'İZ KENT LOJİSTİK HİZMETLERİ LİMİTED ŞİRKETİ',
                    'ARKAS LOJİSTİK ANONİM ŞİRKETİ',
                    'HEDEF TÜKETİM ÜRÜNLERİ SANAYİ VE DIŞ TİCARET ANONİM ŞİRKETİ',
                    'MOKS MOBİLYA KURULUM SERVİS LOJİSTİK PETROL İTHALAT İHRACAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
                    'ODAK TEDARİK ZİNCİRİ VE LOJİSTİK ANONİM ŞİRKETİ'
                ];

                return (
                    item.VehicleWorkingTypeName === 'SPOT' &&
                    item.SpecialGroupName === 'SPOT' &&
                    item.DocumentNo?.startsWith('SFR') &&
                    item.TMSDespatchInvoiceDocumentNo &&
                    item.PlateNumber !== '34SEZ34' &&
                    !projeEngellenenler.some((kelime) => item.ProjectName?.includes(kelime)) &&
                    !firmaEngellenenler.includes(item.SupplierCurrentAccountFullTitle)
                );
            });

            setVeriler(filtreliData);
        } catch (error) {
            console.error('API veri çekme hatası:', error);
            setHata('Veri alınamadı. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    // ✅ GENEL EXCEL (ekrandaki filtreler + temel koşullar + tekilleştirme)
    const excelExportEt = () => {
        const data = uniqBy(
            filtrelenmisVeri.filter(isBaseAllowed),
            x => x.DocumentNo
        );

        if (data.length === 0) {
            alert('Aktarılacak veri bulunamadı.');
            return;
        }

        // Ekrandaki tabloyla aynı kolon düzeni
        const rows = data.map(x => ({
            "Tedarikçi Firma": x.SupplierCurrentAccountFullTitle,
            "Proje Adı": x.ProjectName,
            "Sefer Tarihi": x.DespatchDate?.split('T')[0],
            "Sefer No": x.DocumentNo,
            "Durum": durumAciklamalari[x.TMSDespatchDocumentStatu] ?? x.TMSDespatchDocumentStatu,
            "Plaka": x.PlateNumber,
            "Kullanıcı": x.TMSDespatchCreatedBy,
            "Araç Çalışma Alt Grubu": x.SpecialGroupName,
            "Çalışma Tipi": x.VehicleWorkingTypeName,
            "Alış Fatura No": x.TMSDespatchInvoiceDocumentNo,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rapor');

        const formattedStart = startDate.toLocaleDateString('tr-TR');
        const formattedEnd = endDate.toLocaleDateString('tr-TR');
        const fileName = `rapor_${formattedStart}_-_${formattedEnd}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    const getUniqueValues = (key) => {
        const all = veriler.map((item) => item[key]);
        return [...new Set(all.filter(Boolean))];
    };

    // ✅ PROJE BAZLI RAPOR (ekran filtreleri + temel koşullar + tekilleştirme)
    const projeBazliRaporOlustur = async () => {
        const data = uniqBy(
            filtrelenmisVeri.filter(isBaseAllowed),
            x => x.DocumentNo
        );
        if (data.length === 0) {
            alert('Raporlanacak veri bulunamadı.');
            return;
        }

        const sadeceBunlar = [
            'BEKLİYOR',
            'EKSİK EVRAK',
            'HASARLI GÖRÜNTÜ İŞLENDİ',
            'HASARLI-ORJİNAL EVRAK GELDİ',
            'ORJİNAL EVRAK GELDİ'
        ];

        const projeDurumSayim = {};

        data.forEach((item) => {
            const proje = item.ProjectName || 'Bilinmeyen Proje';
            const durumKodu = item.TMSDespatchDocumentStatu;
            const durum = durumAciklamalari[durumKodu];

            if (!sadeceBunlar.includes(durum)) return;

            if (!projeDurumSayim[proje]) {
                projeDurumSayim[proje] = {};
                sadeceBunlar.forEach((d) => (projeDurumSayim[proje][d] = 0));
            }

            projeDurumSayim[proje][durum]++;
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('ProjeBazliDurum');

        // Başlıklar
        const headers = [
            'Proje',
            ...sadeceBunlar,
            'Genel Toplam',
            ...sadeceBunlar.map((d) => `${d} %`)
        ];
        sheet.addRow(headers);

        Object.entries(projeDurumSayim).forEach(([proje, durumlarObj]) => {
            const toplam = sadeceBunlar.reduce((sum, key) => sum + (durumlarObj[key] || 0), 0);
            const yuzdeler = sadeceBunlar.map((key) =>
                toplam > 0 ? `${((durumlarObj[key] / toplam) * 100).toFixed(2)}%` : '0%'
            );

            sheet.addRow([
                proje,
                ...sadeceBunlar.map((k) => durumlarObj[k]),
                toplam,
                ...yuzdeler
            ]);
        });

        // 🎨 Stil ayarları (mevcutla aynı mantık)
        sheet.columns.forEach((column) => {
            let maxLength = 10;
            column.eachCell?.((cell) => {
                const value = cell.value ? cell.value.toString() : '';
                if (value.length > maxLength) {
                    maxLength = value.length;
                }
            });
            column.width = maxLength + 2;
            column.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        const headerStyle = {
            font: { bold: true, color: { argb: 'FF000000' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
        };
        sheet.getRow(1).eachCell((cell) => (cell.style = headerStyle));

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const fillColor = rowNumber % 2 === 0 ? 'FFF0F0F0' : 'FFFFFFFF';
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `proje_bazli_durum_raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    const chunkDateRanges = (start, end, stepDays = 7) => {
        const ranges = [];
        let cursor = new Date(start);
        const endDate = new Date(end);

        while (cursor <= endDate) {
            const chunkStart = new Date(cursor);
            const chunkEnd = new Date(cursor);
            chunkEnd.setDate(chunkEnd.getDate() + stepDays - 1);
            if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());
            ranges.push({ start: new Date(chunkStart), end: new Date(chunkEnd) });
            cursor.setDate(cursor.getDate() + stepDays);
        }
        return ranges;
    };

    // ✅ TEDARİKÇİ BAZLI RAPOR (ekran filtreleri + temel koşullar + tekilleştirme)
    const tedarikciPivotGrupRaporOlustur = async () => {
        const data = uniqBy(
            filtrelenmisVeri.filter(isBaseAllowed),
            x => x.DocumentNo
        );
        if (data.length === 0) {
            alert('Raporlanacak veri bulunamadı.');
            return;
        }

        const sadeceBunlar = [
            'BEKLİYOR',
            'EKSİK EVRAK',
            'HASARLI GÖRÜNTÜ İŞLENDİ',
            'HASARLI-ORJİNAL EVRAK GELDİ',
            'ORJİNAL EVRAK GELDİ'
        ];
        const siralamaKriteri = sadeceBunlar.slice(0, 4);

        const grouped = {};
        const seferSayilari = {};

        data.forEach((item) => {
            const tedarikci = item.SupplierCurrentAccountFullTitle || 'Bilinmeyen Tedarikçi';
            const proje = item.ProjectName || 'Bilinmeyen Proje';
            const durum = durumAciklamalari[item.TMSDespatchDocumentStatu];
            const documentNo = item.DocumentNo;

            if (!sadeceBunlar.includes(durum)) return;

            if (!grouped[tedarikci]) grouped[tedarikci] = {};
            if (!grouped[tedarikci][proje]) {
                grouped[tedarikci][proje] = {};
                sadeceBunlar.forEach((d) => (grouped[tedarikci][proje][d] = 0));
            }

            grouped[tedarikci][proje][durum]++;
            const key = `${tedarikci}__${proje}`;
            if (!seferSayilari[key]) seferSayilari[key] = new Set();
            if (documentNo) seferSayilari[key].add(documentNo);
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Tedarikçi Bazlı Rapor');

        const headers = ['Proje', ...sadeceBunlar, 'Toplam Sefer'];

        const sorted = Object.entries(grouped)
            .map(([tedarikci, projeler]) => {
                let total = 0;
                Object.values(projeler).forEach((durumlar) => {
                    total += siralamaKriteri.reduce((sum, d) => sum + durumlar[d], 0);
                });
                return { tedarikci, projeler, total };
            })
            .sort((a, b) => b.total - a.total);

        sorted.forEach(({ tedarikci, projeler }) => {
            const titleRow = sheet.addRow([`🏢 ${tedarikci}`]);
            sheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(65 + headers.length - 1)}${titleRow.number}`);
            titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF7BAE57' },
            };

            const headerRow = sheet.addRow(headers);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F4' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            Object.entries(projeler).forEach(([proje, durumlar], index) => {
                const key = `${tedarikci}__${proje}`;
                const seferSayisi = seferSayilari[key]?.size || 0;

                const row = sheet.addRow([
                    proje,
                    ...sadeceBunlar.map((d) => durumlar[d]),
                    seferSayisi
                ]);

                const fillColor = index % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });

                row.getCell(1).alignment = { horizontal: 'left' };
            });

            sheet.addRow([]); // boşluk
        });

        sheet.columns.forEach((col, idx) => {
            col.width = idx === 0 ? 35 : 18;
            col.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `tedarikci_modern_pastel_rapor_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    // ✅ KULLANICI BAZLI RAPOR (ekran filtreleri + temel koşullar + tekilleştirme)
    const kullaniciBazliRaporOlustur = async () => {
        const data = uniqBy(
            filtrelenmisVeri.filter(isBaseAllowed),
            x => x.DocumentNo
        );
        if (data.length === 0) {
            alert('Raporlanacak veri bulunamadı.');
            return;
        }

        const sadeceBunlar = [
            'BEKLİYOR',
            'EKSİK EVRAK',
            'HASARLI GÖRÜNTÜ İŞLENDİ',
            'HASARLI-ORJİNAL EVRAK GELDİ',
            'ORJİNAL EVRAK GELDİ'
        ];
        const siralamaKriteri = sadeceBunlar.slice(0, 4);

        const grouped = {};

        data.forEach((item) => {
            const kullanici = item.TMSDespatchCreatedBy || 'Bilinmeyen Kullanıcı';
            const proje = item.ProjectName || 'Bilinmeyen Proje';
            const durum = durumAciklamalari[item.TMSDespatchDocumentStatu];
            if (!sadeceBunlar.includes(durum)) return;

            if (!grouped[kullanici]) grouped[kullanici] = {};
            if (!grouped[kullanici][proje]) {
                grouped[kullanici][proje] = {};
                sadeceBunlar.forEach((d) => (grouped[kullanici][proje][d] = 0));
            }

            grouped[kullanici][proje][durum]++;
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Kullanıcı Bazlı Rapor');

        const headers = ['Kullanıcı / Proje', ...sadeceBunlar, 'Genel Toplam'];
        const headerRow = sheet.addRow(headers);

        // Başlık stili
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FF000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        const sortedUsers = Object.entries(grouped)
            .map(([kullanici, projeler]) => {
                let toplam = 0;
                Object.values(projeler).forEach((durumlar) => {
                    toplam += siralamaKriteri.reduce((s, d) => s + durumlar[d], 0);
                });
                return { kullanici, projeler, toplam };
            })
            .sort((a, b) => b.toplam - a.toplam);

        sortedUsers.forEach(({ kullanici, projeler }) => {
            const titleRow = sheet.addRow([`👤 ${kullanici}`]);
            sheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(65 + headers.length - 1)}${titleRow.number}`);
            titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A86E8' } };

            Object.entries(projeler).forEach(([proje, durumlar], index) => {
                const toplam = sadeceBunlar.reduce((s, d) => s + durumlar[d], 0);
                const row = sheet.addRow([proje, ...sadeceBunlar.map((d) => durumlar[d]), toplam]);

                // Zebra satır deseni
                const fillColor = index % 2 === 0 ? 'FFF7F7F7' : 'FFFFFFFF';
                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });

                row.getCell(1).alignment = { horizontal: 'left' };
            });

            sheet.addRow([]); // boşluk satırı
        });

        sheet.columns.forEach((col, idx) => {
            col.width = idx === 0 ? 35 : 18;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `kullanici_modern_raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    // === Ekrandaki filtre ===
    const filtrelenmisVeri = veriler.filter((item) => {
        return (
            (filters.firma === '' || item.SupplierCurrentAccountFullTitle === filters.firma) &&
            (filters.proje === '' || item.ProjectName === filters.proje) &&
            (filters.durum === '' || String(item.TMSDespatchDocumentStatu) === String(filters.durum)) &&
            (filters.kullanici === '' || item.TMSDespatchCreatedBy === filters.kullanici)
        );
    });

    return (
        <div className="p-6 text-white bg-gray-900 min-h-screen">

            <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6 flex flex-wrap items-end gap-4">
                <div className="flex flex-col">
                    <label className="text-sm text-gray-300 mb-1">Başlangıç Tarihi</label>
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        dateFormat="dd.MM.yyyy"
                        locale="tr"
                        className="px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 w-48"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="text-sm text-gray-300 mb-1">Bitiş Tarihi</label>
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        dateFormat="dd.MM.yyyy"
                        locale="tr"
                        className="px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 w-48"
                    />
                </div>
                <button
                    onClick={fetchData}
                    className="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition"
                >
                    Sorgula
                </button>
                <button
                    onClick={excelExportEt}
                    className="h-[42px] px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition"
                >
                    Genel Datayı Excel'e Aktar
                </button>
                <button
                    onClick={projeBazliRaporOlustur}
                    className="h-[42px] px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition"
                >
                    Proje Bazlı Durum Dağılımı
                </button>

                <button
                    onClick={tedarikciPivotGrupRaporOlustur}
                    className="h-[42px] px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition"
                >
                    Tedarikçi Altında Projeler Raporu
                </button>

                <button
                    onClick={kullaniciBazliRaporOlustur}
                    className="h-[42px] px-6 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-md transition"
                >
                    Kullanıcı Bazlı Rapor
                </button>
            </div>

            {veriler.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-md mb-6 flex flex-wrap gap-4">
                    {[
                        { key: 'firma', label: 'Tedarikçi Firma', mapKey: 'SupplierCurrentAccountFullTitle' },
                        { key: 'proje', label: 'Proje Adı', mapKey: 'ProjectName' },
                        { key: 'durum', label: 'Durum', mapKey: 'TMSDespatchDocumentStatu' },
                        { key: 'kullanici', label: 'Kullanıcı', mapKey: 'TMSDespatchCreatedBy' }
                    ].map(({ key, label, mapKey }) => (
                        <div key={key}>
                            <label className="text-sm text-gray-300 mb-1 block">{label}</label>
                            <select
                                value={filters[key]}
                                onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                                className="px-3 py-2 bg-gray-700 text-white rounded w-48"
                            >
                                <option value="">Tümü</option>
                                {getUniqueValues(mapKey).map((val, i) => (
                                    <option key={i} value={val}>
                                        {mapKey === 'TMSDespatchDocumentStatu'
                                            ? (durumAciklamalari[val] || val)
                                            : val}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <p>Yükleniyor...</p>
            ) : hata ? (
                <p className="text-red-400">{hata}</p>
            ) : (
                <div className="overflow-y-auto max-h-[1195px] rounded-lg border border-gray-700">
                    <table className="min-w-full divide-y divide-gray-700 bg-gray-800 text-sm">
                        <thead className="bg-gray-700 text-gray-200 text-xs uppercase tracking-wider sticky top-0 z-10">
                            <tr>
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
                        <tbody className="text-gray-300">
                            {filtrelenmisVeri.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-4 text-gray-400">Veri bulunamadı</td>
                                </tr>
                            ) : (
                                filtrelenmisVeri
                                    .filter(isBaseAllowed) /* tablo da aynı temel koşullarla uyumlu olsun istersen açık bırakıyorum */
                                    .map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-700 transition-colors duration-200">
                                            <td className="px-4 py-2 border-b border-gray-700">{item.SupplierCurrentAccountFullTitle}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{item.ProjectName}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{item.DespatchDate?.split('T')[0]}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{item.DocumentNo}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{durumAciklamalari[item.TMSDespatchDocumentStatu] || item.TMSDespatchDocumentStatu}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{item.PlateNumber}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{item.TMSDespatchCreatedBy}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{item.SpecialGroupName}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{item.VehicleWorkingTypeName}</td>
                                            <td className="px-4 py-2 border-b border-gray-700">{item.TMSDespatchInvoiceDocumentNo}</td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Raporlar;
