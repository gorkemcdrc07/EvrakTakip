import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
    PieChart, Pie, Cell, Tooltip
} from 'recharts';
import { FiFile } from 'react-icons/fi';
import Layout from './components/Layout';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx-style'; // ✅ doğru olan bu






const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

function TopluEvraklar() {
    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        lokasyon: [],
        proje: [],
        aciklama: ''
    });

    const [selectedEvrak, setSelectedEvrak] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [seciliLokasyon, setSeciliLokasyon] = useState('');





    const normalize = (str) =>
        (str || "")
            .trim()
            .toLocaleUpperCase("tr")
            .replace(/\s+/g, " ");

    const toplamSefer = evraklar.reduce((sum, evrak) => sum + (evrak.sefersayisi || 0), 0);

    const duzeltilmis = evraklar.reduce((sum, evrak) =>
        sum + (evrak.evrakseferler?.filter(s =>
            normalize(s.aciklama) === "TARAFIMIZCA DÜZELTİLMİŞTİR"
        ).length || 0), 0);

    const orjinaleCekilmis = evraklar.reduce((sum, evrak) =>
        sum + (evrak.evrakseferler?.filter(s =>
            normalize(s.aciklama) === "TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR"
        ).length || 0), 0);

    const oran = (value) => toplamSefer ? ((value / toplamSefer) * 100).toFixed(1) : '0.0';
    const [expandedRow, setExpandedRow] = useState(null);
    const [acikProjeId, setAcikProjeId] = useState(null);
    const [showLokasyonlar, setShowLokasyonlar] = useState(false);
    const [showProjeler, setShowProjeler] = useState(false);








    useEffect(() => {
        fetchVeriler();
    }, []);

    const fetchVeriler = async () => {
        const { data: evrakData, error } = await supabase
            .from('evraklar')
            .select(`
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
        `);

        if (error) {
            console.error("❌ Hata:", error);


            return;
        }

        // 🔽 Tarih sıralaması garanti altına alınıyor (yeni → eski)
        const sortedEvraklar = (evrakData || []).sort(
            (a, b) => new Date(b.tarih) - new Date(a.tarih)
        );

        const { data: lokasyonData } = await supabase.from('lokasyonlar').select('*');
        const { data: projeData } = await supabase.from('projeler').select('*');

        const lokasyonMap = {};
        lokasyonData?.forEach(l => (lokasyonMap[l.id] = l.lokasyon));

        const projeMap = {};
        projeData?.forEach(p => (projeMap[p.id] = p.proje));

        setEvraklar(sortedEvraklar);
        setLokasyonlar(lokasyonMap);
        setProjeler(projeMap);
        setLoading(false);
    };

    const handleEvrakGuncelle = async () => {
        const evrakId = selectedEvrak.id;
        const tarih = selectedEvrak.tarih;
        const lokasyonid = selectedEvrak.lokasyonid;

        const evrakproje = Array.isArray(selectedEvrak.evrakproje)
            ? selectedEvrak.evrakproje.filter(p => p.projeid && !isNaN(p.projeid))
            : [];

        const toplamSefer = evrakproje.reduce((sum, p) => sum + Number(p.sefersayisi || 0), 0);

        const evrakseferler = Array.isArray(selectedEvrak.evrakseferler)
            ? selectedEvrak.evrakseferler.filter(s => s.seferno && s.aciklama)
            : [];

        try {
            // 1. Evrak güncelle
            await supabase.from('evraklar')
                .update({ tarih, lokasyonid, sefersayisi: toplamSefer })
                .eq('id', evrakId);

            // 2. Projeleri sil-yeniden ekle
            await supabase.from('evrakproje').delete().eq('evrakid', evrakId);

            if (evrakproje.length > 0) {
                await supabase.from('evrakproje').insert(
                    evrakproje.map(p => ({
                        evrakid: evrakId,
                        projeid: Number(p.projeid),
                        sefersayisi: Number(p.sefersayisi || 0)
                    }))
                );
            }

            // 3. Seferleri sil-yeniden ekle
            await supabase.from('evrakseferler').delete().eq('evrakid', evrakId);

            if (evrakseferler.length > 0) {
                await supabase.from('evrakseferler').insert(
                    evrakseferler.map(s => ({
                        evrakid: evrakId,
                        seferno: s.seferno,
                        aciklama: s.aciklama
                    }))
                );
            }

            // 4. Yeniden veri çek, modalı kapat
            await fetchVeriler();
            setShowEditModal(false);
            setSelectedEvrak(null);

        } catch (error) {
            console.error("Evrak güncelleme hatası:", error);
            alert("Güncelleme sırasında bir hata oluştu.");
        }
    };




    const aciklamaVerileri = () => {
        const counts = {};
        evraklar.forEach(evrak => {
            evrak.evrakseferler?.forEach(sefer => {
                counts[sefer.aciklama] = (counts[sefer.aciklama] || 0) + 1;
            });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    };

    const projeSeferVerileri = () => {
        const projeCount = {};
        evraklar.forEach(e => {
            e.evrakproje?.forEach(p => {
                const proje = projeler[p.projeid];
                if (proje) {
                    projeCount[proje] = (projeCount[proje] || 0) + p.sefersayisi;
                }
            });
        });
        return Object.entries(projeCount).map(([name, value]) => ({ name, value }));
    };

    const lokasyonBazliAciklamaVerileri = () => {
        const sonuc = {};

        evraklar.forEach(evrak => {
            const lokasyonAdi = lokasyonlar?.[evrak.lokasyonid];
            if (!lokasyonAdi) return;

            // Eğer lokasyon için nesne yoksa başlat
            if (!sonuc[lokasyonAdi]) {
                sonuc[lokasyonAdi] = {
                    toplamSefer: 0,
                    aciklamalar: {}
                };
            }

            // Toplam sefer sayısını topla
            sonuc[lokasyonAdi].toplamSefer += evrak.sefersayisi || 0;

            // Açıklama sayılarını topla
            evrak.evrakseferler?.forEach(sefer => {
                const aciklama = sefer.aciklama;
                if (aciklama) {
                    sonuc[lokasyonAdi].aciklamalar[aciklama] =
                        (sonuc[lokasyonAdi].aciklamalar[aciklama] || 0) + 1;
                }
            });
        });

        return sonuc;
    };


    const renderCustomLabel = ({ value }) => `${value}`;

    const exportToExcel = () => {
        const sheetData = [];
        const merges = [];

        // Başlık satırı
        const headers = [
            'Tarih',
            'Lokasyon',
            'Projeler',
            'Toplam Sefer Sayısı',
            'Sefer No',
            'Açıklama'
        ];
        sheetData.push(headers);

        let currentRow = 1;

        evraklar.forEach(evrak => {
            const tarih = new Date(evrak.tarih).toLocaleDateString('tr-TR');
            const lokasyon = lokasyonlar[evrak.lokasyonid] || 'Bilinmeyen Lokasyon';
            const projeList = evrak.evrakproje?.map(p => `${projeler[p.projeid]} (${p.sefersayisi})`).join(', ') || 'Yok';
            const toplamSefer = evrak.sefersayisi || 0;

            const seferler = evrak.evrakseferler?.length
                ? evrak.evrakseferler
                : [{ seferno: 'Yok', aciklama: 'Sefer kaydı bulunamadı' }];

            const rowStart = currentRow;
            const rowEnd = currentRow + seferler.length - 1;

            seferler.forEach(sefer => {
                sheetData.push([
                    tarih,
                    lokasyon,
                    projeList,
                    toplamSefer,
                    sefer.seferno || 'Yok',
                    sefer.aciklama || 'Yok'
                ]);
                currentRow++;
            });

            // Merge alanları
            if (seferler.length > 1) {
                merges.push(
                    { s: { r: rowStart, c: 0 }, e: { r: rowEnd, c: 0 } },
                    { s: { r: rowStart, c: 1 }, e: { r: rowEnd, c: 1 } },
                    { s: { r: rowStart, c: 2 }, e: { r: rowEnd, c: 2 } },
                    { s: { r: rowStart, c: 3 }, e: { r: rowEnd, c: 3 } },
                );
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!merges'] = merges;

        // Sütun genişlikleri
        ws['!cols'] = [
            { wch: 15 },
            { wch: 25 },
            { wch: 40 },
            { wch: 22 },
            { wch: 18 },
            { wch: 40 },
        ];

        // Stil ayarları
        const borderStyle = {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } },
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "3B82F6" } },
            border: borderStyle,
        };

        const rowStyleLight = {
            fill: { fgColor: { rgb: "F9FAFB" } },
            border: borderStyle,
        };

        const rowStyleDark = {
            fill: { fgColor: { rgb: "EDF2F7" } },
            border: borderStyle,
        };

        const plainCell = {
            border: borderStyle,
        };

        // Tüm hücrelere stil uygula
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = { c: C, r: R };
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                if (!ws[cellRef]) continue;

                if (R === 0) {
                    ws[cellRef].s = headerStyle;
                } else {
                    const isEven = R % 2 === 0;
                    ws[cellRef].s = { ...plainCell, ...(isEven ? rowStyleDark : rowStyleLight) };
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Evraklar');

        XLSX.writeFile(wb, 'Toplu_Evraklar_Rapor.xlsx');
    };
const exportEvrakToExcel = (evrak) => {
    const tarih = new Date(evrak.tarih).toLocaleDateString('tr-TR');
    const lokasyon = lokasyonlar[evrak.lokasyonid] || 'Bilinmeyen Lokasyon';
    const toplamSefer = evrak.sefersayisi || 0;

    const sheetData = [];

    // Genel Bilgi
    sheetData.push(["TARİH", "LOKASYON", "TOPLAM SEFER"]);
    sheetData.push([tarih, lokasyon, toplamSefer]);
    sheetData.push([]);

    // Projeler
    sheetData.push(["PROJE", "SEFER SAYISI"]);
    (evrak.evrakproje || []).forEach(p => {
        const projeAd = projeler[p.projeid] || 'Bilinmeyen Proje';
        sheetData.push([projeAd, p.sefersayisi]);
    });
    sheetData.push([]);

    // Açıklama Özeti
    const aciklamaSayaci = {};
    (evrak.evrakseferler || []).forEach(s => {
        const aciklama = s.aciklama || 'Bilinmeyen';
        aciklamaSayaci[aciklama] = (aciklamaSayaci[aciklama] || 0) + 1;
    });

    sheetData.push(["AÇIKLAMA ÖZETİ"]);
    Object.entries(aciklamaSayaci).forEach(([aciklama, count]) => {
        sheetData.push([`${aciklama}: ${count}`]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Kolon genişlikleri
    ws['!cols'] = [
        { wch: 40 },
        { wch: 25 },
        { wch: 20 }
    ];

    // Stil tanımları
    const borderAll = {
        top: { style: 'thin', color: { rgb: "000000" } },
        bottom: { style: 'thin', color: { rgb: "000000" } },
        left: { style: 'thin', color: { rgb: "000000" } },
        right: { style: 'thin', color: { rgb: "000000" } },
    };

    const styles = {
        header: {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "D9D9D9" } }, // Açık gri
            border: borderAll,
        },
        subHeader: {
            font: { bold: true },
            fill: { fgColor: { rgb: "BDD7EE" } }, // Açık mavi
            border: borderAll,
        },
        summaryHeader: {
            font: { bold: true },
            fill: { fgColor: { rgb: "C6EFCE" } }, // Açık yeşil
            border: borderAll,
        },
        cell: {
            border: borderAll,
        }
    };

    // Hücreleri biçimlendir
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddress];
            if (!cell) continue;

            // Satır başlığına göre stilleri belirle
            if (R === 0) {
                cell.s = styles.header;
            } else if (R === 3) {
                cell.s = styles.subHeader;
            } else if (sheetData[R] && sheetData[R][0] === "AÇIKLAMA ÖZETİ") {
                cell.s = styles.summaryHeader;
            } else {
                cell.s = styles.cell;
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evrak Raporu');

    XLSX.writeFile(wb, `evrak_raporu_${evrak.id}.xlsx`);
};



   


   



    const lokasyonSeferVerileri = () => {
        const result = {};
        evraklar.forEach(evrak => {
            const lokasyon = lokasyonlar[evrak.lokasyonid];
            if (!lokasyon) return;

            result[lokasyon] = (result[lokasyon] || 0) + (evrak.sefersayisi || 0);
        });

        return Object.entries(result).map(([name, value]) => ({ name, value }));
    };

    // ✅ 1. önce filteredEvraklar
    const filteredEvraklar = evraklar.filter(evrak => {
        const tarihMatch =
            (!filters.startDate || new Date(evrak.tarih) >= new Date(filters.startDate)) &&
            (!filters.endDate || new Date(evrak.tarih) <= new Date(filters.endDate));
        const lokasyonMatch = filters.lokasyon.length === 0 || filters.lokasyon.includes(String(evrak.lokasyonid));
        const evrakProjeIds = evrak.evrakproje?.map(p => String(p.projeid)) || [];
        const projeMatch = filters.proje.length === 0 || evrakProjeIds.some(pid => filters.proje.includes(pid));
        const seferAciklamalari = (evrak.evrakseferler || []).map(s => s.aciklama).join(", ");
        const aciklamaMatch = filters.aciklama
            ? seferAciklamalari.toLocaleLowerCase("tr").includes(filters.aciklama.toLocaleLowerCase("tr"))
            : true;
        return tarihMatch && lokasyonMatch && projeMatch && aciklamaMatch;
    });

    // ✅ 2. sonra useMemo
    const toplamSeferler = React.useMemo(() => {
        if (!Array.isArray(filteredEvraklar) || filteredEvraklar.length === 0 || !lokasyonlar) return {};

        const totals = {};
        filteredEvraklar.forEach((evrak) => {
            const loc = lokasyonlar?.[evrak.lokasyonid] || 'Bilinmeyen Lokasyon';
            if (!totals[loc]) totals[loc] = 0;
            totals[loc] += evrak.sefersayisi || 0;
        });

        return totals;
    }, [filteredEvraklar, lokasyonlar]);








    return (
       <>
            {showEditModal && selectedEvrak && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg relative">
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-white text-xl"
                            aria-label="Kapat"
                        >
                            &times;
                        </button>

                        <h2 className="text-lg font-semibold mb-4">🛠️ Evrak Düzenle</h2>

                        {/* Başlangıç Tarihi */}
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 w-48"
                        />

                        {/* Bitiş Tarihi */}
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 w-48"
                        />


                        {/* LOKASYON */}
                        <label className="block mb-2 text-sm">Lokasyon</label>
                        <select
                            value={selectedEvrak.lokasyonid}
                            onChange={(e) =>
                                setSelectedEvrak({
                                    ...selectedEvrak,
                                    lokasyonid: parseInt(e.target.value),
                                })
                            }
                            className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
                        >
                            {Object.entries(lokasyonlar || {}).map(([id, name]) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </select>

                        {/* PROJELER */}
                        <div className="mb-4">
                            <label className="block mb-1 text-sm">Projeler</label>

                            {selectedEvrak.evrakproje?.map((p, i) => (
                                <div key={i} className="flex gap-2 mb-2 items-center">
                                    <select
                                        value={p.projeid}
                                        onChange={(e) => {
                                            const newList = [...selectedEvrak.evrakproje];
                                            newList[i].projeid = parseInt(e.target.value);
                                            setSelectedEvrak({ ...selectedEvrak, evrakproje: newList });
                                        }}
                                        className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
                                    >
                                        {Object.entries(projeler || {}).map(([id, name]) => (
                                            <option key={id} value={id}>{name}</option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        value={p.sefersayisi}
                                        onChange={(e) => {
                                            const newList = [...selectedEvrak.evrakproje];
                                            newList[i].sefersayisi = parseInt(e.target.value) || 0;

                                            const toplamSefer = newList.reduce(
                                                (sum, p) => sum + (parseInt(p.sefersayisi) || 0), 0
                                            );

                                            setSelectedEvrak({
                                                ...selectedEvrak,
                                                evrakproje: newList,
                                                sefersayisi: toplamSefer
                                            });
                                        }}
                                        className="w-32 p-2 border rounded dark:bg-gray-700 dark:text-white"
                                    />

                                    <button
                                        onClick={() => {
                                            const newList = selectedEvrak.evrakproje.filter((_, idx) => idx !== i);
                                            const toplamSefer = newList.reduce(
                                                (sum, p) => sum + (parseInt(p.sefersayisi) || 0), 0
                                            );
                                            setSelectedEvrak({
                                                ...selectedEvrak,
                                                evrakproje: newList,
                                                sefersayisi: toplamSefer
                                            });
                                        }}
                                        className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                                    >
                                        Sil
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => {
                                    const newList = [...selectedEvrak.evrakproje, { projeid: Object.keys(projeler)[0] || '', sefersayisi: 0 }];
                                    const toplamSefer = newList.reduce(
                                        (sum, p) => sum + (parseInt(p.sefersayisi) || 0), 0
                                    );
                                    setSelectedEvrak({
                                        ...selectedEvrak,
                                        evrakproje: newList,
                                        sefersayisi: toplamSefer
                                    });
                                }}
                                className="bg-blue-500 text-white px-3 py-1 rounded text-sm mt-2"
                            >
                                + Proje Ekle
                            </button>

                            {/* Toplam Sefer Sayısı Gösterimi */}
                            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                                Toplam Sefer Sayısı: {selectedEvrak.sefersayisi || 0}
                            </div>
                        </div>



                        {/* SEFERLER */}
                        <div className="mb-4">
                            <label className="block mb-1 text-sm">Seferler</label>

                            {selectedEvrak.evrakseferler?.map((s, i) => (
                                <div key={i} className="mb-2 flex flex-col gap-1">
                                    <input
                                        placeholder="Sefer No"
                                        value={s.seferno}
                                        onChange={(e) => {
                                            const list = [...selectedEvrak.evrakseferler];
                                            list[i].seferno = e.target.value;
                                            setSelectedEvrak({ ...selectedEvrak, evrakseferler: list });
                                        }}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={s.aciklama}
                                            onChange={(e) => {
                                                const list = [...selectedEvrak.evrakseferler];
                                                list[i].aciklama = e.target.value;
                                                setSelectedEvrak({ ...selectedEvrak, evrakseferler: list });
                                            }}
                                            className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
                                        >
                                            <option value="TARAFIMIZCA DÜZELTİLMİŞTİR">TARAFIMIZCA DÜZELTİLMİŞTİR</option>
                                            <option value="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR">TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR</option>
                                        </select>
                                        <button
                                            onClick={() => {
                                                const newList = selectedEvrak.evrakseferler.filter((_, idx) => idx !== i);
                                                setSelectedEvrak({ ...selectedEvrak, evrakseferler: newList });
                                            }}
                                            className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                                        >
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={() => {
                                    const newList = [...selectedEvrak.evrakseferler, {
                                        seferno: '',
                                        aciklama: 'TARAFIMIZCA DÜZELTİLMİŞTİR' // varsayılan
                                    }];
                                    setSelectedEvrak({ ...selectedEvrak, evrakseferler: newList });
                                }}
                                className="bg-blue-500 text-white px-3 py-1 rounded text-sm mt-2"
                            >
                                + Sefer Ekle
                            </button>
                        </div>


                        {/* BUTONLAR */}
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleEvrakGuncelle}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

        <Layout>

        <div className="flex flex-col gap-8 p-8 bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
            <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 2 }}>

                            <div className="flex gap-4 items-center flex-wrap">
                                {/* Başlangıç Tarihi */}
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        📅 Başlangıç Tarihi
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                        className="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 w-48"
                                    />
                                </div>

                                {/* Bitiş Tarihi */}
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        📅 Bitiş Tarihi
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                        className="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 w-48"
                                    />
                                </div>
                            



                                {/* Lokasyon Dropdown Checkbox */}
                                <div className="relative w-48">
                                    <div
                                        onClick={() => setShowLokasyonlar(!showLokasyonlar)}
                                        className="px-3 py-2 rounded border border-gray-300 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 cursor-pointer select-none"
                                    >
                                        Lokasyonlar {showLokasyonlar ? '▲' : '▼'}
                                    </div>

                                    {showLokasyonlar && (
                                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 shadow-lg">
                                            {Object.entries(lokasyonlar || {}).map(([id, name]) => (
                                                <label
                                                    key={id}
                                                    className="flex items-center space-x-2 px-3 py-1 cursor-pointer text-sm text-gray-900 dark:text-gray-200"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.lokasyon.includes(String(id))}
                                                        onChange={() => {
                                                            if (filters.lokasyon.includes(id)) {
                                                                setFilters((prev) => ({
                                                                    ...prev,
                                                                    lokasyon: prev.lokasyon.filter((x) => x !== id),
                                                                }));
                                                            } else {
                                                                setFilters((prev) => ({
                                                                    ...prev,
                                                                    lokasyon: [...prev.lokasyon, id],
                                                                }));
                                                            }
                                                        }}
                                                        className="form-checkbox text-pink-600"
                                                    />
                                                    <span>{name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>


                        {/* Proje Dropdown Checkbox */}
                        <div className="relative w-48">
                            <div
                                onClick={() => setShowProjeler(!showProjeler)}
                                className="px-3 py-2 rounded border border-gray-300 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 cursor-pointer select-none"
                            >
                                Projeler {showProjeler ? '▲' : '▼'}
                            </div>

                            {showProjeler && (
                                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 shadow-lg">
                                    {Object.entries(projeler).map(([id, name]) => (
                                        <label
                                            key={id}
                                            className="flex items-center space-x-2 px-3 py-1 cursor-pointer text-sm text-gray-900 dark:text-gray-200"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={filters.proje.includes(id)}
                                                onChange={() => {
                                                    if (filters.proje.includes(id)) {
                                                        setFilters((prev) => ({
                                                            ...prev,
                                                            proje: prev.proje.filter((x) => x !== id),
                                                        }));
                                                    } else {
                                                        setFilters((prev) => ({
                                                            ...prev,
                                                            proje: [...prev.proje, id],
                                                        }));
                                                    }
                                                }}
                                                className="form-checkbox text-pink-600"
                                            />
                                            <span>{name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Açıklama inputu */}
                        <input
                            type="text"
                            placeholder="Açıklama"
                            value={filters.aciklama}
                            onChange={(e) => setFilters({ ...filters, aciklama: e.target.value })}
                            className="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 w-48"
                        />

                        {/* Temizle Butonu */}
                        <button
                                    onClick={() =>
                                        setFilters({
                                            startDate: '',
                                            endDate: '',
                                            lokasyon: [],
                                            proje: [],
                                            aciklama: ''
                                        })
                                    }
                            className="px-3 py-2 rounded border border-gray-300 bg-gray-100 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            Temizle
                        </button>
                        {/* Excel'e Aktar Butonu */}
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
                        >
                            <FiFile size={18} />
                            Excel'e Aktar
                        </button>
                    </div>



                    {loading ? (
                        <p style={{ textAlign: 'center' }}>Yükleniyor...</p>
                    ) : (
                        <table style={tableStyle}>
                            <thead>
                                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                                        <th style={cellStyle}>Tarih</th>
                                        <th style={cellStyle}>Lokasyon</th>
                                        <th style={cellStyle}>Projeler</th>
                                        <th style={cellStyle}>Toplam Sefer</th>
                                        <th style={cellStyle}>Sefer No</th>
                                        <th style={cellStyle}>Açıklama</th>


                                </tr>
                            </thead>
                                    <tbody>
                                        {filteredEvraklar.map((evrak) => {
                                            const seferler = evrak.evrakseferler || [];
                                            const isExpanded = expandedRow === evrak.id;
                                            const isProjelerVisible = acikProjeId === evrak.id;

                                            return (
                                                <React.Fragment key={evrak.id}>
                                                    <tr
                                                            onClick={() => setExpandedRow(isExpanded ? null : evrak.id)}
                                                            className="cursor-pointer bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                                                        >
                                                            <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                                                                {new Date(evrak.tarih).toLocaleDateString('tr-TR')}
                                                            </td>
                                                            <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                                                                {lokasyonlar[evrak.lokasyonid]}
                                                            </td>
                                                            <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setAcikProjeId(isProjelerVisible ? null : evrak.id);
                                                                    }}
                                                                    className="rounded-md px-2 py-1 text-xs cursor-pointer mb-2
                                                                        bg-gray-100 border border-gray-300 text-gray-900
                                                                        dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                                >
                                                                    {isProjelerVisible ? 'Projeleri Gizle' : 'Projeleri Göster'}
                                                                </button>

                                                                {isProjelerVisible && (
                                                                    <ul className="list-none p-2 m-0">
                                                                        {evrak.evrakproje?.map((p, idx) => (
                                                                            <li key={idx}>
                                                                                {projeler[p.projeid]} ({p.sefersayisi})
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                                                                {evrak.sefersayisi}
                                                            </td>
                                                            <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center font-medium text-blue-700 dark:text-blue-400">
                                                                {isExpanded ? '🔼 Gizle' : '🔽 Göster'}
                                                            </td>
                                                            <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                                {/* BOŞ: Açıklama alanı zaten detay satırlarında */}
                                                            </td>
                                                            <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedEvrak(evrak);
                                                                        setShowEditModal(true);
                                                                    }}
                                                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                                                >
                                                                    Düzenle
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                              <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    exportEvrakToExcel(evrak);
                                                                }}
                                                                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                                            >
                                                                Satır Raporu Al
                                                            </button>



                                                            </td>
                                                        </tr>


                                                    {isExpanded &&
                                                        (seferler.length > 0 ? (
                                                            seferler.map((sefer, i) => (
                                                                <tr
                                                                    key={`${evrak.id}-${i}`}
                                                                    className={
                                                                        i % 2 === 0
                                                                            ? "bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                                                                            : "bg-gray-50 text-gray-900 dark:bg-gray-700 dark:text-gray-200"
                                                                    }
                                                                >
                                                                    <td colSpan={4} className="border border-gray-200 dark:border-gray-700"></td>
                                                                    <td className="border border-gray-200 dark:border-gray-700">{sefer.seferno}</td>
                                                                    <td className="border border-gray-200 dark:border-gray-700">{sefer.aciklama}</td>
                                                                    <td className="border border-gray-200 dark:border-gray-700"></td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={4}></td>
                                                                <td colSpan={2} className="text-center text-gray-400 dark:text-gray-500">
                                                                    Sefer kaydı bulunamadı
                                                                </td>
                                                                <td></td>
                                                            </tr>
                                                        ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>

                        </table>
                    )}
                </div>

                        <div className="flex flex-col gap-10 pb-8 flex-[1.5]">
                            {/* Açıklama Dağılımı + Özet Bilgiler */}
                            <div className="flex flex-wrap gap-8 p-8 rounded-xl bg-white dark:bg-gray-800 shadow-md dark:shadow-lg items-center justify-between">
                                <div>
                                    <PieChart width={240} height={240}>
                                        <Pie
                                            data={aciklamaVerileri()}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            label={({ value }) => `${value}`}
                                            paddingAngle={5}
                                        >
                                            {aciklamaVerileri().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value} sefer`]} />
                                    </PieChart>
                                </div>

                                <div className="flex flex-col justify-center gap-4 flex-1 min-w-[220px]">
                                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center font-bold text-gray-900 dark:text-gray-200 text-lg">
                                        🚛 Toplam Sefer: {toplamSefer.toLocaleString()}
                                    </div>

                                    <div className="flex justify-between bg-green-100 dark:bg-green-900 p-3 rounded-lg text-green-700 dark:text-green-300 font-medium text-sm">
                                        <span>✔️ Düzeltilmiş:</span>
                                        <span>{duzeltilmis} (%{oran(duzeltilmis)})</span>
                                    </div>

                                    <div className="flex justify-between bg-blue-100 dark:bg-blue-900 p-3 rounded-lg text-blue-700 dark:text-blue-300 font-medium text-sm">
                                        <span>🔁 Orijinale Çekilmiş:</span>
                                        <span>{orjinaleCekilmis} (%{oran(orjinaleCekilmis)})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Proje Bazlı Kartlar */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-lg p-6 flex flex-col gap-5">
                                <div className="bg-green-600 text-white py-3 px-5 rounded-xl font-semibold text-center text-lg shadow-md">
                                    📦 Proje Bazlı Seferler
                                </div>

                                <div className="grid grid-cols-5 gap-4">
                                    {projeSeferVerileri()
                                        .sort((a, b) => b.value - a.value)
                                        .map(item => (
                                            <div
                                                key={item.name}
                                                className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                                            >
                                                <div className="font-semibold mb-1">{item.name}</div>
                                                <div className="text-green-500">{item.value.toLocaleString()} sefer</div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div
                                className="p-6 rounded-xl bg-white dark:bg-gray-800 shadow-md dark:shadow-lg mt-6 border-t border-gray-300 dark:border-gray-700"
                            >
                                <h4 className="text-center text-lg font-semibold text-gray-700 dark:text-gray-300 mb-6">
                                    📍 Lokasyonlardaki Açıklama Dağılımı
                                </h4>

                                {/* FLEX: Lokasyon seçimi solda, grafik sağda */}
                                <div className="flex flex-wrap md:flex-nowrap items-start justify-center gap-8 mb-8">
                                    {/* Sol: Lokasyon Seçimi */}
                                    <div className="w-full md:w-64">
                                        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            📍 Lokasyon Seç (Donut Grafik için)
                                        </label>
                                        <select
                                            value={seciliLokasyon}
                                            onChange={(e) => setSeciliLokasyon(e.target.value)}
                                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
                                        >
                                            <option value="">— Lokasyon Seçin —</option>
                                            {Object.entries(lokasyonlar).map(([id, name]) => (
                                                <option key={id} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {seciliLokasyon && (
                                        <div className="flex flex-col items-center md:flex-row md:items-start md:justify-center gap-6">
                                            {/* Grafik */}
                                            <div className="flex flex-col items-center">
                                                <h3 className="text-md font-semibold text-gray-700 dark:text-white mb-2">
                                                    {seciliLokasyon} Açıklama Dağılımı
                                                </h3>
                                                <PieChart width={280} height={280}>
                                                    <Pie
                                                        data={
                                                            Object.entries(lokasyonBazliAciklamaVerileri()[seciliLokasyon]?.aciklamalar || {})
                                                                .map(([name, value]) => ({ name, value }))
                                                        }
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={100}
                                                        paddingAngle={2}
                                                        minAngle={5}
                                                        labelLine={false}
                                                        label={({ value }) => `${value}`}
                                                    >
                                                        {Object.entries(lokasyonBazliAciklamaVerileri()[seciliLokasyon]?.aciklamalar || {})
                                                            .map((_, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value, name) => [`${value} sefer`, name]} />
                                                </PieChart>
                                            </div>

                                            {/* Legend */}
                                            <div className="mt-4 md:mt-12 space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                                                    <span className="text-gray-700 dark:text-gray-200">TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                                                    <span className="text-gray-700 dark:text-gray-200">TARAFIMIZCA DÜZELTİLMİŞTİR</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>



                                {/* Aşağıda: Liste görünümü */}
                                <div className="grid grid-cols-auto-fill min-w-[280px] gap-6 px-2">
                                    {Object.entries(lokasyonBazliAciklamaVerileri() || {}).map(([lokasyon, data]) => {
                                        const { toplamSefer, aciklamalar } = data;

                                        return (
                                            <div
                                                key={lokasyon}
                                                className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-2"
                                            >
                                                <h5 className="text-gray-900 dark:text-gray-200 font-semibold text-base mb-2">
                                                    📍 {lokasyon} - Toplam Sefer: {toplamSefer}
                                                </h5>

                                                {Object.entries(aciklamalar).map(([aciklama, count]) => {
                                                    const normalized = aciklama.trim().toLocaleUpperCase('tr');
                                                    let bgColor = 'bg-gray-300';
                                                    let textColor = 'text-gray-900';

                                                    if (normalized === 'TARAFIMIZCA DÜZELTİLMİŞTİR') {
                                                        bgColor = 'bg-green-600';
                                                        textColor = 'white';
                                                    } else if (normalized === 'TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR') {
                                                        bgColor = 'bg-blue-600';
                                                        textColor = 'white';
                                                    }

                                                    return (
                                                        <div
                                                            key={aciklama}
                                                            className={`${bgColor} ${textColor} px-3 py-1 rounded-md text-sm font-medium flex justify-between items-center`}
                                                        >
                                                            <span>{aciklama}</span>
                                                            <span className="font-bold">{count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Lokasyon Bazlı Toplam Seferler */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-lg p-6 flex flex-col gap-5 mt-8">
                                <div className="bg-yellow-500 text-white py-3 px-5 rounded-xl font-semibold text-center text-lg shadow-md">
                                    🗺️ Lokasyon Bazlı Seferler
                                </div>

                                <div className="grid grid-cols-auto-fill min-w-[160px] gap-4">
                                    {lokasyonSeferVerileri()
                                        .sort((a, b) => b.value - a.value)
                                        .map(item => (
                                            <div
                                                key={item.name}
                                                className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-3 text-center text-sm text-yellow-900 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700"
                                            >
                                                <div className="font-semibold mb-1">{item.name}</div>
                                                <div className="text-yellow-700 dark:text-yellow-400">
                                                    {item.value.toLocaleString()} sefer
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                        </div>

                    </div>
                </div>


            </Layout>
       </>
    );
}

const chartTitleStyle = {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    boxShadow: '0 0 10px rgba(0,0,0,0.05)',
    borderRadius: '8px',
    overflow: 'hidden',
};

const cellStyle = {
    border: '1px solid #e5e7eb',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.95rem',
    color: '#1f2937',
};

const rowStyle = {
    backgroundColor: '#ffffff',
    color: '#111827',
    ...(window.matchMedia('(prefers-color-scheme: dark)').matches && {
        backgroundColor: '#1f2937', // dark mode bg
        color: '#f9fafb', // text white-ish
    })
};


const altRowStyle = {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    ...(window.matchMedia('(prefers-color-scheme: dark)').matches && {
        backgroundColor: '#374151', // dark gray
        color: '#f9fafb',
    })
};

const chartBox = {
    padding: '1.5rem',
    backgroundColor: '#ffffff',
    borderRadius: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
};
const filterInputStyle = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
};


export default TopluEvraklar;
