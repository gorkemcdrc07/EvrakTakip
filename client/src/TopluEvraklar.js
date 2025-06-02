import { Legend } from 'recharts';
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

function TopluEvraklar() {
    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        tarih: '',
        lokasyon: '',
        proje: '',
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



    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '2rem', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 2 }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>📄 Tüm Evraklar</h2>

                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <button onClick={exportToExcel} style={{
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}>
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
                                    {evraklar.map((evrak) => {
                                        const seferler = evrak.evrakseferler || [];
                                        const isExpanded = expandedRow === evrak.id;
                                        const isProjelerVisible = acikProjeId === evrak.id;

                                        return (
                                            <React.Fragment key={evrak.id}>
                                                <tr
                                                    onClick={() => setExpandedRow(isExpanded ? null : evrak.id)}
                                                    style={{ cursor: 'pointer', backgroundColor: '#e0f2fe' }}
                                                >
                                                    <td>{new Date(evrak.tarih).toLocaleDateString('tr-TR')}</td>
                                                    <td>{lokasyonlar[evrak.lokasyonid]}</td>
                                                    <td>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Satır expand'ini tetiklemesin
                                                                setAcikProjeId(isProjelerVisible ? null : evrak.id);
                                                            }}
                                                            style={{
                                                                backgroundColor: '#f3f4f6',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '6px',
                                                                padding: '4px 8px',
                                                                fontSize: '0.85rem',
                                                                cursor: 'pointer',
                                                                marginBottom: '0.5rem',
                                                            }}
                                                        >
                                                            {isProjelerVisible ? 'Projeleri Gizle' : 'Projeleri Göster'}
                                                        </button>

                                                        {isProjelerVisible && (
                                                            <ul style={{ listStyle: 'none', padding: '0.5rem 0', margin: 0 }}>
                                                                {evrak.evrakproje?.map((p, idx) => (
                                                                    <li key={idx}>
                                                                        {projeler[p.projeid]} ({p.sefersayisi})
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </td>
                                                    <td>{evrak.sefersayisi}</td>
                                                    <td colSpan={2} style={{ textAlign: 'center', color: '#1d4ed8', fontWeight: 500 }}>
                                                        {isExpanded ? '🔼 Gizle' : '🔽 Detayları Göster'}
                                                    </td>
                                                </tr>

                                                {isExpanded && (
                                                    seferler.length > 0 ? (
                                                        seferler.map((sefer, i) => (
                                                            <tr key={`${evrak.id}-${i}`} style={i % 2 === 0 ? rowStyle : altRowStyle}>
                                                                <td colSpan={4}></td>
                                                                <td>{sefer.seferno}</td>
                                                                <td>{sefer.aciklama}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={4}></td>
                                                            <td colSpan={2} style={{ textAlign: 'center', color: '#9ca3af' }}>
                                                                Sefer kaydı bulunamadı
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>


                        </table>
                    )}
                </div>

                <div style={{
                    flex: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2.5rem', // Daha fazla nefes boşluğu
                    paddingBottom: '2rem'
                }}>
                    <h3 style={{
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#111827'
                    }}>📊 Dashboard</h3>

                    {/* Açıklama Dağılımı + Özet Bilgiler */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '2rem',
                        padding: '2rem',
                        borderRadius: '1rem',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <h4 style={chartTitleStyle}>📊 Açıklama Dağılımı</h4>
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

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '1rem',
                            flex: 1,
                            minWidth: '220px'
                        }}>
                            <div style={{
                                backgroundColor: '#f9fafb',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                color: '#111827',
                                fontSize: '1.1rem'
                            }}>
                                🚛 Toplam Sefer: {toplamSefer.toLocaleString()}
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                backgroundColor: '#d1fae5',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                fontSize: '0.95rem',
                                color: '#065f46',
                                fontWeight: '500'
                            }}>
                                <span>✔️ Düzeltilmiş:</span>
                                <span>{duzeltilmis} (%{oran(duzeltilmis)})</span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                backgroundColor: '#dbeafe',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                fontSize: '0.95rem',
                                color: '#1d4ed8',
                                fontWeight: '500'
                            }}>
                                <span>🔁 Orijinale Çekilmiş:</span>
                                <span>{orjinaleCekilmis} (%{oran(orjinaleCekilmis)})</span>
                            </div>
                        </div>
                    </div>

                    {/* Proje Bazlı Kartlar */}
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '1rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        <div style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                            fontWeight: '600',
                            textAlign: 'center',
                            fontSize: '1.1rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}>
                            📦 Proje Bazlı Seferler
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '1rem'
                        }}>
                            {projeSeferVerileri()
                                .sort((a, b) => b.value - a.value)
                                .map(item => (
                                    <div key={item.name} style={{
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '0.75rem',
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontSize: '0.9rem',
                                        color: '#111827',
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.name}</div>
                                        <div style={{ color: '#10b981' }}>{item.value.toLocaleString()} sefer</div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Lokasyon Bazlı Açıklamalar */}
                    <div style={{
                        ...chartBox,
                        marginTop: '1.5rem',
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: '2rem'
                    }}>
                        <h4 style={chartTitleStyle}>📍 Lokasyonlardaki Açıklama Dağılımı</h4>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '1.5rem',
                            width: '100%',
                            padding: '0.5rem 1rem'
                        }}>
                            {Object.entries(lokasyonBazliAciklamaVerileri()).map(([lokasyon, aciklamalar]) => (
                                <div key={lokasyon} style={{
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}>
                                    <h5 style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#1f2937',
                                        marginBottom: '0.5rem'
                                    }}>
                                        📍 {lokasyon}
                                    </h5>

                                    {Object.entries(aciklamalar).map(([aciklama, count]) => {
                                        const normalized = aciklama.trim().toLocaleUpperCase('tr');
                                        let bgColor = '#e5e7eb';
                                        let textColor = '#111827';

                                        if (normalized === 'TARAFIMIZCA DÜZELTİLMİŞTİR') {
                                            bgColor = '#10b981';
                                            textColor = '#ffffff';
                                        } else if (normalized === 'TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR') {
                                            bgColor = '#3b82f6';
                                            textColor = '#ffffff';
                                        }

                                        return (
                                            <div key={aciklama} style={{
                                                backgroundColor: bgColor,
                                                color: textColor,
                                                padding: '0.4rem 0.75rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontWeight: 500
                                            }}>
                                                <span>{aciklama}</span>
                                                <span style={{ fontWeight: 700 }}>{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Lokasyon Bazlı Toplam Seferler */}
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '1rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        <div style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                            fontWeight: '600',
                            textAlign: 'center',
                            fontSize: '1.1rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}>
                            🗺️ Lokasyon Bazlı Seferler
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: '1rem'
                        }}>
                            {lokasyonSeferVerileri()
                                .sort((a, b) => b.value - a.value)
                                .map(item => (
                                    <div key={item.name} style={{
                                        backgroundColor: '#fefce8',
                                        borderRadius: '0.75rem',
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontSize: '0.9rem',
                                        color: '#92400e',
                                        border: '1px solid #fde68a'
                                    }}>
                                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.name}</div>
                                        <div style={{ color: '#b45309' }}>{item.value.toLocaleString()} sefer</div>
                                    </div>
                                ))}
                        </div>
                    </div>



                </div>
            </div>
        </div>
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
};

const altRowStyle = {
    backgroundColor: '#f3f4f6',
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

export default TopluEvraklar;
