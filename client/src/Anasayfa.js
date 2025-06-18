import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { supabase } from './supabaseClient';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from 'recharts';

function Anasayfa() {
    const navigate = useNavigate();
    const adSoyad = localStorage.getItem('ad');
    const username = localStorage.getItem('username');
    const [menuOpen, setMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [dailyData, setDailyData] = useState([]);
    const [metric, setMetric] = useState('kargo');
    const [firmalar, setFirmalar] = useState([]);
    const [selectedFirma, setSelectedFirma] = useState('Hepsi');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    useEffect(() => {
        const fetchFirmalar = async () => {
            const { data, error } = await supabase
                .from('kargo_bilgileri')
                .select('kargo_firmasi');

            if (!error && data) {
                const unique = [...new Set(
                    data
                        .map(item => item.kargo_firmasi?.trim().toUpperCase())
                        .filter(Boolean)
                )];
                setFirmalar(['Hepsi', ...unique]);
            }
        };

        fetchFirmalar();
    }, []);



    useEffect(() => {
        const fetchDailyData = async () => {
            const today = new Date();
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(today.getDate() - 6);

            const gunIsimleri = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
            const counts = {};

            for (let i = 0; i < 7; i++) {
                const date = new Date(oneWeekAgo);
                date.setDate(date.getDate() + i);
                const key = date.toISOString().split('T')[0];
                const label = gunIsimleri[date.getDay()];
                counts[key] = { date: key, label, count: 0 };
            }

            let query = supabase
                .from('kargo_bilgileri')
                .select('tarih, kargo_firmasi, evrak_adedi')
                .gte('tarih', oneWeekAgo.toISOString().split('T')[0])
                .lte('tarih', today.toISOString().split('T')[0]);

            if (selectedFirma !== 'Hepsi') {
                query = query.eq('kargo_firmasi', selectedFirma);
            }

            const { data, error } = await query;
            if (error) return console.error('Veri alınamadı:', error);

            data.forEach(({ tarih, evrak_adedi }) => {
                if (counts[tarih]) {
                    if (metric === 'kargo') {
                        counts[tarih].count += 1;
                    } else {
                        counts[tarih].count += evrak_adedi || 0;
                    }
                }
            });

            setDailyData(Object.values(counts));
        };

        fetchDailyData();
    }, [metric, selectedFirma]);


    const handleLogout = () => {
        localStorage.removeItem('auth');
        localStorage.removeItem('username');
        localStorage.removeItem('ad');
        navigate('/login');
    };

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const newMode = !prev;
            localStorage.setItem('theme', newMode ? 'dark' : 'light');
            return newMode;
        });
    };

    return (
        <Layout>
            <div className="min-h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

                {/* Sidebar */}
                <div className={`fixed top-0 left-0 h-full w-64 bg-pink-100 dark:bg-gray-800 shadow-md p-4 transform transition-transform duration-300 z-50 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <button className="text-gray-600 dark:text-gray-300 text-xl self-end" onClick={toggleMenu}>✖</button>
                    <div className="flex flex-col gap-4 mt-4">
                        {(username === 'yaren' || username === 'ozge') && (
                            <>
                                <button onClick={() => window.open('/lokasyonlar', '_blank')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left">📍 Lokasyonlar</button>
                                <button onClick={() => window.open('/projeler', '_blank')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left">📁 Projeler</button>
                                <button onClick={() => window.open('/evrak-ekle', '_blank')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left">📄 Evrak Ekle</button>
                                <button onClick={() => window.open('/toplu-evraklar', '_blank')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left">📄 Tüm Evraklar</button>
                                <button onClick={() => window.open('/tum-kargo-bilgileri', '_blank')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left">📋 Tüm Kargo Bilgileri</button>
                                <button
                                    onClick={() => window.open('/arac-evrak-takip', '_blank')}
                                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left"
                                >
                                    🚛 Araç Evrak Takip
                                </button>

                            </>
                        )}
                        {username === 'refika' && (
                            <>
                                <button onClick={() => window.open('/kargo-bilgisi-ekle', '_blank')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left">📦 Kargo Bilgisi Ekle</button>
                                <button onClick={() => window.open('/tum-kargo-bilgileri', '_blank')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left">📋 Tüm Kargo Bilgileri</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Navbar */}
                <nav className={`flex justify-between items-center bg-pink-100 dark:bg-gray-800 shadow px-6 py-4 transition-all duration-300 ${menuOpen ? 'ml-64' : 'ml-0'}`}>
                    <button className="text-2xl text-gray-700 dark:text-gray-200" onClick={toggleMenu}>☰</button>
                    <div className="text-lg font-bold">📁 Evrak Takip Sistemi</div>
                    <div className="flex items-center gap-3">
                        <span className="font-medium">{adSoyad}</span>
                        <button
                            onClick={toggleDarkMode}
                            className="relative w-14 h-8 bg-gray-300 rounded-full dark:bg-gray-600 flex items-center px-1 cursor-pointer select-none"
                            aria-label="Toggle Dark Mode"
                            role="switch"
                            aria-checked={darkMode}
                        >
                            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'} flex items-center justify-center text-yellow-500 dark:text-yellow-400`}>
                                {darkMode ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-11H21m-18 0H3m15.36 7.36l.7.7m-12.02-12l.7.7m12.02 0l-.7.7m-12.02 12l-.7.7M12 7a5 5 0 100 10 5 5 0 000-10z" />
                                    </svg>
                                )}
                            </div>
                        </button>
                        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                            Çıkış
                        </button>
                    </div>
                </nav>

                {/* İçerik */}
                <main className={`p-6 transition-all duration-300 ${menuOpen ? 'ml-64' : 'ml-0'}`}>
                    <h2 className="text-2xl font-semibold">🎉 Hoş geldin, {adSoyad}!</h2>
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                        Bu sayfa sadece giriş yapan kullanıcılar içindir.
                    </p>

                    {username === 'refika' && (
                        <div className="mt-8 p-6 rounded-xl bg-white dark:bg-gray-800 shadow-md">
                            {/* Filtre Seçenekleri */}
                            <div className="flex gap-4 items-center mb-6">
                                <select value={metric} onChange={e => setMetric(e.target.value)} className="px-4 py-2 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                                    <option value="kargo">📦 Kargo Sayısı</option>
                                    <option value="evrak">📄 Evrak Adedi</option>
                                </select>

                                <select value={selectedFirma} onChange={e => setSelectedFirma(e.target.value)} className="px-4 py-2 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                                    {firmalar.map(firma => (
                                        <option key={firma} value={firma}>{firma}</option>
                                    ))}
                                </select>
                            </div>

                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                                {metric === 'kargo' ? '📦 Günlük Kargo Sayısı' : '📄 Günlük Evrak Adedi'} (Son 7 Gün)
                            </h3>
                            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-4">
                                Toplam: {dailyData.reduce((sum, item) => sum + item.count, 0)} kayıt
                            </div>

                            {dailyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dailyData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                                        <defs>
                                            <linearGradient id="colorKargo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9} />
                                                <stop offset="100%" stopColor="#f9a8d4" stopOpacity={0.6} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 14 }} />
                                        <YAxis allowDecimals={false} tick={{ fill: '#9ca3af' }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.9rem',
                                                color: '#374151',
                                                border: 'none',
                                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                            }}
                                        />
                                        <Bar dataKey="count" fill="url(#colorKargo)" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">Veri yükleniyor...</p>
                            )}

                            {/* Günlük Detay Kartları */}
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {dailyData.map(item => (
                                    <div key={item.date} className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div className="text-2xl">📅</div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-800 dark:text-gray-100">{item.label} - {item.date}</span>
                                            <span className="text-pink-600 dark:text-pink-300 font-bold">{item.count} kayıt</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </Layout>
    );
}

export default Anasayfa;