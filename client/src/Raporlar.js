import React, { useState } from 'react';
import axios from 'axios';
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
        plaka: '',
        kullanici: '',
        aracGrubu: '',
        calismaTipi: '',
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

    const fetchData = async () => {
        setLoading(true);
        setHata(null);
        try {
            const response = await axios.post(
                'http://localhost:5000/api/tmsdespatches/getall', // proxy backend URL
                {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    userId: 1,
                }
            );

            const filtreliData = (response.data.Data || []).filter((item) => {
                const projeEngellenenler = ['HASAR İADE', 'AKTÜl', 'KARGO HİZMETLERİ', 'HGS-YAKIT FATURA İŞLEME'];
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

    const excelExportEt = () => {
        if (veriler.length === 0) {
            alert('Aktarılacak veri bulunamadı.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(veriler);
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
    const projeBazliRaporOlustur = async () => {
        if (filtrelenmisVeri.length === 0) {
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

        filtrelenmisVeri.forEach((item) => {
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

        Object.entries(projeDurumSayim).forEach(([proje, durumlarObj], index) => {
            const toplam = sadeceBunlar.reduce((sum, key) => sum + (durumlarObj[key] || 0), 0);
            const yuzdeler = sadeceBunlar.map((key) =>
                toplam > 0 ? `${((durumlarObj[key] / toplam) * 100).toFixed(2)}%` : '0%'
            );

            const row = [
                proje,
                ...sadeceBunlar.map((k) => durumlarObj[k]),
                toplam,
                ...yuzdeler
            ];

            sheet.addRow(row);
        });

        // 🎨 Stil ayarları
        sheet.columns.forEach((column) => {
            let maxLength = 10;
            column.eachCell?.((cell) => {
                const value = cell.value ? cell.value.toString() : '';
                if (value.length > maxLength) {
                    maxLength = value.length;
                }
            });
            column.width = maxLength + 2; // ekstra boşluk
            column.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Başlıkları stillendir
        const headerStyle = {
            font: { bold: true, color: { argb: 'FF000000' } }, // siyah yazı
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E1F2' }, // açık mor/gri zemin
            },
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            },
        };

        // Zebra desen
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // başlık
            const fillColor = rowNumber % 2 === 0 ? 'FFF0F0F0' : 'FFFFFFFF';
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: fillColor },
                };
            });
        });

        // Dosyayı oluştur
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `proje_bazli_durum_raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };



    const tedarikciPivotGrupRaporOlustur = async () => {
        if (filtrelenmisVeri.length === 0) {
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

        // Tedarikçi > Proje > Durumlar
        const grouped = {};
        // Tedarikçi > Proje > Sefer Sayısı
        const seferSayilari = {};

        filtrelenmisVeri.forEach((item) => {
            const tedarikci = item.SupplierCurrentAccountFullTitle || 'Bilinmeyen Tedarikçi';
            const proje = item.ProjectName || 'Bilinmeyen Proje';
            const durumKodu = item.TMSDespatchDocumentStatu;
            const durum = durumAciklamalari[durumKodu];
            const documentNo = item.DocumentNo;

            if (!sadeceBunlar.includes(durum)) return;

            if (!grouped[tedarikci]) grouped[tedarikci] = {};
            if (!grouped[tedarikci][proje]) {
                grouped[tedarikci][proje] = {};
                sadeceBunlar.forEach((d) => (grouped[tedarikci][proje][d] = 0));
            }

            grouped[tedarikci][proje][durum]++;

            // Sefer sayımı (benzersiz DocumentNo'ya göre)
            if (!seferSayilari[tedarikci]) seferSayilari[tedarikci] = {};
            if (!seferSayilari[tedarikci][proje]) seferSayilari[tedarikci][proje] = new Set();
            if (documentNo) seferSayilari[tedarikci][proje].add(documentNo);
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Tedarikçi Bazlı Projeler');

        Object.entries(grouped).forEach(([tedarikci, projeler]) => {
            const columnCount = sadeceBunlar.length + 2;

            // Tedarikçi başlığı
            const titleRow = sheet.addRow([`Tedarikçi: ${tedarikci}`]);
            titleRow.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
            titleRow.alignment = { horizontal: 'left', vertical: 'middle' };
            sheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(65 + columnCount - 1)}${titleRow.number}`);
            titleRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF404040' },
            };

            // Başlık satırı
            const headerRow = sheet.addRow(['Proje', ...sadeceBunlar, 'Toplam Sefer']);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FF000000' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFEFEFEF' },
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });

            // Proje satırları
            Object.entries(projeler).forEach(([proje, durumlar]) => {
                const seferSet = seferSayilari[tedarikci]?.[proje] || new Set();
                const toplamSefer = seferSet.size;

                const rowValues = [proje, ...sadeceBunlar.map((d) => durumlar[d]), toplamSefer];
                const row = sheet.addRow(rowValues);

                row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

                const bg = row.number % 2 === 0 ? 'FFFDFDFD' : 'FFFFFFFF';
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: bg },
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                });
            });

            sheet.addRow([]);
        });

        // Sütun ayarları
        sheet.columns.forEach((col, idx) => {
            col.width = idx === 0 ? 35 : 18;
            col.alignment = {
                vertical: 'middle',
                horizontal: idx === 0 ? 'left' : 'center',
                wrapText: true,
            };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `tedarikci_gruplu_raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };









    const filtrelenmisVeri = veriler.filter((item) => {
        return (
            (filters.firma === '' || item.SupplierCurrentAccountFullTitle === filters.firma) &&
            (filters.proje === '' || item.ProjectName === filters.proje) &&
            (filters.durum === '' || item.TMSDespatchDocumentStatu === filters.durum) &&
            (filters.plaka === '' || item.PlateNumber === filters.plaka) &&
            (filters.kullanici === '' || item.TMSDespatchCreatedBy === filters.kullanici) &&
            (filters.aracGrubu === '' || item.SpecialGroupName === filters.aracGrubu) &&
            (filters.calismaTipi === '' || item.VehicleWorkingTypeName === filters.calismaTipi)
        );
    });

    return (
        <div className="p-6 text-white bg-gray-900 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Raporlar</h1>

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



            </div>

            {veriler.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-md mb-6 flex flex-wrap gap-4">
                    {[
                        { key: 'firma', label: 'Tedarikçi Firma', mapKey: 'SupplierCurrentAccountFullTitle' },
                        { key: 'proje', label: 'Proje Adı', mapKey: 'ProjectName' },
                        { key: 'durum', label: 'Durum', mapKey: 'TMSDespatchDocumentStatu' },
                        { key: 'plaka', label: 'Plaka', mapKey: 'PlateNumber' },
                        { key: 'kullanici', label: 'Kullanıcı', mapKey: 'TMSDespatchCreatedBy' },
                        { key: 'aracGrubu', label: 'Araç Çalışma Alt Grubu', mapKey: 'SpecialGroupName' },
                        { key: 'calismaTipi', label: 'Çalışma Tipi', mapKey: 'VehicleWorkingTypeName' },
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
                                    <option key={i} value={val}>{val}</option>
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
                                filtrelenmisVeri.map((item, i) => (
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
