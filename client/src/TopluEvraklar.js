import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
    PieChart, Pie, Cell,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

function TopluEvraklar() {
    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVeriler();
    }, []);

    const fetchVeriler = async () => {
        const { data: evrakData } = await supabase
            .from('evraklar')
            .select(`
                id,
                tarih,
                lokasyonid,
                projeid,
                sefersayisi,
                evrakseferler (
                    seferno,
                    aciklama
                )
            `)
            .order('tarih', { ascending: false });

        const { data: lokasyonData } = await supabase.from('lokasyonlar').select('*');
        const { data: projeData } = await supabase.from('projeler').select('*');

        const lokasyonMap = {};
        lokasyonData?.forEach(l => (lokasyonMap[l.id] = l.lokasyon));

        const projeMap = {};
        projeData?.forEach(p => (projeMap[p.id] = p.proje));

        setEvraklar(evrakData || []);
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

    const gunlukEvrakVerileri = () => {
        const daily = {};
        evraklar.forEach(e => {
            const tarih = new Date(e.tarih).toLocaleDateString('tr-TR');
            daily[tarih] = (daily[tarih] || 0) + 1;
        });
        return Object.entries(daily).map(([tarih, count]) => ({ tarih, count }));
    };

    const projeSeferVerileri = () => {
        const projeCount = {};
        evraklar.forEach(e => {
            const proje = projeler[e.projeid];
            if (proje) {
                projeCount[proje] = (projeCount[proje] || 0) + e.sefersayisi;
            }
        });
        return Object.entries(projeCount).map(([name, value]) => ({ name, value }));
    };

    const projeBazliAciklamalar = () => {
        const projeAciklamaMap = {};

        evraklar.forEach(evrak => {
            const projeAd = projeler[evrak.projeid] || 'Bilinmeyen';
            if (!projeAciklamaMap[projeAd]) {
                projeAciklamaMap[projeAd] = {};
            }

            evrak.evrakseferler?.forEach(sefer => {
                const aciklama = sefer.aciklama || 'Belirtilmemiş';
                projeAciklamaMap[projeAd][aciklama] = (projeAciklamaMap[projeAd][aciklama] || 0) + 1;
            });
        });

        return projeAciklamaMap;
    };

    const tarihBazliAciklamalar = () => {
        const tarihMap = {};

        evraklar.forEach(evrak => {
            const tarih = new Date(evrak.tarih).toLocaleDateString('tr-TR');

            if (!tarihMap[tarih]) {
                tarihMap[tarih] = {};
            }

            evrak.evrakseferler?.forEach(sefer => {
                const aciklama = sefer.aciklama || 'Belirtilmemiş';
                tarihMap[tarih][aciklama] = (tarihMap[tarih][aciklama] || 0) + 1;
            });
        });

        return tarihMap;
    };

    return (
        <div style={layoutStyle}>
            <div style={leftColumnStyle}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>📄 Tüm Evraklar</h2>
                {loading ? (
                    <p style={{ textAlign: 'center' }}>Yükleniyor...</p>
                ) : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={cellStyle}>Tarih</th>
                                <th style={cellStyle}>Lokasyon</th>
                                <th style={cellStyle}>Proje</th>
                                <th style={cellStyle}>Toplam Sefer</th>
                                <th style={cellStyle}>Sefer No</th>
                                <th style={cellStyle}>Açıklama</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evraklar.map((evrak) =>
                                evrak.evrakseferler?.length > 0 ? (
                                    evrak.evrakseferler.map((sefer, i) => (
                                        <tr key={`${evrak.id}-${i}`} style={i % 2 === 0 ? rowStyle : altRowStyle}>
                                            {i === 0 && (
                                                <>
                                                    <td rowSpan={evrak.evrakseferler.length} style={cellStyle}>
                                                        {new Date(evrak.tarih).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td rowSpan={evrak.evrakseferler.length} style={cellStyle}>
                                                        {lokasyonlar[evrak.lokasyonid]}
                                                    </td>
                                                    <td rowSpan={evrak.evrakseferler.length} style={cellStyle}>
                                                        {projeler[evrak.projeid]}
                                                    </td>
                                                    <td rowSpan={evrak.evrakseferler.length} style={cellStyle}>
                                                        {evrak.sefersayisi}
                                                    </td>
                                                </>
                                            )}
                                            <td style={cellStyle}>{sefer.seferno}</td>
                                            <td style={cellStyle}>{sefer.aciklama}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr key={evrak.id}>
                                        <td style={cellStyle}>{new Date(evrak.tarih).toLocaleDateString('tr-TR')}</td>
                                        <td style={cellStyle}>{lokasyonlar[evrak.lokasyonid]}</td>
                                        <td style={cellStyle}>{projeler[evrak.projeid]}</td>
                                        <td style={cellStyle}>{evrak.sefersayisi}</td>
                                        <td colSpan="2" style={{ ...cellStyle, textAlign: 'center', color: '#999' }}>
                                            Sefer kaydı yok
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={rightColumnStyle}>
                <h3 style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: '600' }}>📊 Dashboard</h3>

                <div style={chartBox}>
                    <h4 style={chartTitle}>🧾 Açıklama Dağılımı</h4>
                    <PieChart width={280} height={220}>
                        <Pie
                            data={aciklamaVerileri()}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                            {aciklamaVerileri().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </div>

                <div style={chartBox}>
                    <h4 style={chartTitle}>📆 Günlük Evrak</h4>
                    <LineChart width={300} height={180} data={gunlukEvrakVerileri()}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                        <XAxis dataKey="tarih" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                </div>

                <div style={chartBox}>
                    <h4 style={chartTitle}>🏗️ Proje Bazlı Sefer</h4>
                    <BarChart width={300} height={180} data={projeSeferVerileri()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </div>

                <div style={chartBox}>
                    <h4 style={chartTitle}>📌 Proje Bazlı Açıklama Özeti</h4>
                    {Object.entries(projeBazliAciklamalar()).map(([proje, aciklamalar]) => (
                        <div key={proje} style={infoCard}>
                            <strong>{proje}</strong>
                            <ul>
                                {Object.entries(aciklamalar).map(([aciklama, count]) => (
                                    <li key={aciklama}>{aciklama}: {count} kez</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div style={chartBox}>
                    <h4 style={chartTitle}>📅 Tarih Bazlı Açıklama Özeti</h4>
                    {Object.entries(tarihBazliAciklamalar()).map(([tarih, aciklamalar]) => (
                        <div key={tarih} style={infoCard}>
                            <strong>{tarih}</strong>
                            <ul>
                                {Object.entries(aciklamalar).map(([aciklama, count]) => (
                                    <li key={aciklama}>{aciklama}: {count} kez</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Stil tanımları
const layoutStyle = {
    display: 'flex',
    padding: '2rem',
    fontFamily: 'Arial, sans-serif',
    gap: '2rem',
};

const leftColumnStyle = {
    flex: 2.5,
    overflowX: 'auto',
};

const rightColumnStyle = {
    flex: 1.5,
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2rem',
    padding: '2rem',
    backgroundColor: '#f9fafb',
    borderRadius: '1.5rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
};

const chartBox = {
    padding: '1.5rem',
    backgroundColor: '#ffffff',
    borderRadius: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.3s ease',
    gap: '1rem',
};

const chartTitle = {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
};

const infoCard = {
    width: '100%',
    textAlign: 'left',
    padding: '0.75rem 1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.75rem',
    border: '1px solid #e5e7eb',
    marginBottom: '0.5rem',
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

export default TopluEvraklar;
