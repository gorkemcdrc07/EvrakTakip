import { Legend } from 'recharts';
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import * as XLSX from 'xlsx';
import { FiFile } from 'react-icons/fi';
import Layout from './components/Layout';


const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

function TopluEvraklar() {
    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        tarih: '',
        lokasyon: [],   // array
        proje: [],      // array
        aciklama: ''
    });


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
            const lokasyonAdi = lokasyonlar[evrak.lokasyonid];
            if (!lokasyonAdi) return;
            if (!sonuc[lokasyonAdi]) sonuc[lokasyonAdi] = {};

            evrak.evrakseferler?.forEach(sefer => {
                const aciklama = sefer.aciklama;
                if (aciklama) {
                    sonuc[lokasyonAdi][aciklama] = (sonuc[lokasyonAdi][aciklama] || 0) + 1;
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

   



    const lokasyonSeferVerileri = () => {
        const result = {};
        evraklar.forEach(evrak => {
            const lokasyon = lokasyonlar[evrak.lokasyonid];
            if (!lokasyon) return;

            result[lokasyon] = (result[lokasyon] || 0) + (evrak.sefersayisi || 0);
        });

        return Object.entries(result).map(([name, value]) => ({ name, value }));
    };

    const filteredEvraklar = evraklar.filter(evrak => {
        const tarihMatch = filters.tarih ? evrak.tarih.startsWith(filters.tarih) : true;

        const lokasyonMatch = filters.lokasyon.length === 0 || filters.lokasyon.includes(String(evrak.lokasyonid));

        const evrakProjeIds = evrak.evrakproje?.map(p => String(p.projeid)) || [];
        const projeMatch = filters.proje.length === 0 || evrakProjeIds.some(pid => filters.proje.includes(pid));

        const seferAciklamalari = (evrak.evrakseferler || []).map(s => s.aciklama).join(", ");
        const aciklamaMatch = filters.aciklama
            ? seferAciklamalari.toLocaleLowerCase("tr").includes(filters.aciklama.toLocaleLowerCase("tr"))
            : true;

        return tarihMatch && lokasyonMatch && projeMatch && aciklamaMatch;
    });







    return (
        <Layout>

        <div className="flex flex-col gap-8 p-8 bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
            <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 2 }}>

                    <div className="flex flex-wrap gap-4 mb-4 items-center">
                        {/* Tarih inputu */}
                        <input
                            type="date"
                            value={filters.tarih}
                            onChange={(e) => setFilters({ ...filters, tarih: e.target.value })}
                            className="px-3 py-2 rounded border border-gray-300 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 w-48"
                        />

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
                                    {Object.entries(lokasyonlar).map(([id, name]) => (
                                        <label
                                            key={id}
                                            className="flex items-center space-x-2 px-3 py-1 cursor-pointer text-sm text-gray-900 dark:text-gray-200"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={filters.lokasyon.includes(id)}
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
                            onClick={() => setFilters({ tarih: '', lokasyon: [], proje: [], aciklama: '' })}
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
                                                    <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">{evrak.sefersayisi}</td>
                                                    <td
                                                        colSpan={2}
                                                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center font-medium text-blue-700 dark:text-blue-400"
                                                    >
                                                        {isExpanded ? '🔼 Gizle' : '🔽 Detayları Göster'}
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
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={4}></td>
                                                            <td colSpan={2} className="text-center text-gray-400 dark:text-gray-500">
                                                                Sefer kaydı bulunamadı
                                                            </td>
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


                    {/* Lokasyon Bazlı Açıklamalar */}
                    <div
                        className="p-6 rounded-xl bg-white dark:bg-gray-800 shadow-md dark:shadow-lg mt-6 border-t border-gray-300 dark:border-gray-700"
                    >
                        <h4 className="text-center text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            📍 Lokasyonlardaki Açıklama Dağılımı
                        </h4>

                        <div className="grid grid-cols-auto-fill min-w-[280px] gap-6 px-2">
                            {Object.entries(lokasyonBazliAciklamaVerileri()).map(([lokasyon, aciklamalar]) => (
                                <div
                                    key={lokasyon}
                                    className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-2"
                                >
                                    <h5 className="text-gray-900 dark:text-gray-200 font-semibold text-base mb-2">
                                        📍 {lokasyon}
                                    </h5>

                                    {Object.entries(aciklamalar).map(([aciklama, count]) => {
                                        const normalized = aciklama.trim().toLocaleUpperCase('tr');
                                        let bgColor = 'bg-gray-300';
                                        let textColor = 'text-gray-900';

                                        if (normalized === 'TARAFIMIZCA DÜZELTİLMİŞTİR') {
                                            bgColor = 'bg-green-600';
                                            textColor = 'text-white';
                                        } else if (normalized === 'TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR') {
                                            bgColor = 'bg-blue-600';
                                            textColor = 'text-white';
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
                            ))}
                        </div>
                    </div>

                    {/* Lokasyon Bazlı Toplam Seferler */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-lg p-6 flex flex-col gap-5">
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
