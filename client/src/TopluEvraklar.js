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
        `)
            .order('tarih', { ascending: false });

        console.log("📦 Gelen evrak verisi:", evrakData);
        if (error) console.error("❌ Hata:", error);

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
            e.evrakproje?.forEach(p => {
                const proje = projeler[p.projeid];
                if (proje) {
                    projeCount[proje] = (projeCount[proje] || 0) + p.sefersayisi;
                }
            });
        });
        return Object.entries(projeCount).map(([name, value]) => ({ name, value }));
    };

    return (
        <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
            <div style={{ flex: 2 }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>📄 Tüm Evraklar</h2>
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
                                return seferler.length > 0 ? (
                                    seferler.map((sefer, i) => (
                                        <tr key={`${evrak.id}-${i}`} style={i % 2 === 0 ? rowStyle : altRowStyle}>
                                            {i === 0 && (
                                                <>
                                                    <td rowSpan={seferler.length} style={cellStyle}>{new Date(evrak.tarih).toLocaleDateString('tr-TR')}</td>
                                                    <td rowSpan={seferler.length} style={cellStyle}>{lokasyonlar[evrak.lokasyonid]}</td>
                                                    <td rowSpan={seferler.length} style={cellStyle}>
                                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                            {evrak.evrakproje?.map((p, idx) => (
                                                                <li key={idx}>{projeler[p.projeid]} ({p.sefersayisi})</li>
                                                            ))}
                                                        </ul>
                                                    </td>
                                                    <td rowSpan={seferler.length} style={cellStyle}>{evrak.sefersayisi}</td>
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
                                        <td style={cellStyle}>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {evrak.evrakproje?.map((p, idx) => (
                                                    <li key={idx}>{projeler[p.projeid]} ({p.sefersayisi})</li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td style={cellStyle}>{evrak.sefersayisi}</td>
                                        <td colSpan={2} style={{ ...cellStyle, color: '#999', textAlign: 'center' }}>
                                            Sefer kaydı yok
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ textAlign: 'center' }}>📊 Dashboard</h3>

                <div style={chartBox}>
                    <h4>Açıklama Dağılımı</h4>
                    <PieChart width={250} height={200}>
                        <Pie data={aciklamaVerileri()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                            {aciklamaVerileri().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </div>

                <div style={chartBox}>
                    <h4>Günlük Evrak</h4>
                    <LineChart width={300} height={150} data={gunlukEvrakVerileri()}>
                        <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
                        <XAxis dataKey="tarih" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" />
                    </LineChart>
                </div>

                <div style={chartBox}>
                    <h4>Proje Bazlı Sefer</h4>
                    <BarChart width={300} height={150} data={projeSeferVerileri()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                </div>
            </div>
        </div>
    );
}

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