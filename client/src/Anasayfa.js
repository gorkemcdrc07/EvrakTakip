import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { supabase } from './supabaseClient';
import {
    BarChart, AreaChart, LineChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';

function Anasayfa() {
    const navigate = useNavigate();
    const adSoyad = localStorage.getItem('ad');
    const username = localStorage.getItem('username');
    const [menuOpen, setMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [dailyData, setDailyData] = useState([]);
    const [metric, setMetric] = useState('kargo');
    const [chartType, setChartType] = useState('bar');
    const [firmalar, setFirmalar] = useState([]);
    const [selectedFirma, setSelectedFirma] = useState('Hepsi');

    const buttonClass = "flex items-center gap-3 px-5 py-3 rounded-xl bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 hover:bg-pink-100 dark:hover:bg-gray-600 backdrop-blur-md border border-gray-200 dark:border-gray-600";

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
                    data.map(item => item.kargo_firmasi?.trim().toUpperCase()).filter(Boolean)
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
        localStorage.clear();
        navigate('/login');
    };

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    const renderChart = () => {
        const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'line' ? LineChart : AreaChart;
        return (
            <ResponsiveContainer width="100%" height={300}>
                <ChartComponent data={dailyData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <defs>
                        <linearGradient id="colorKargo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#f9a8d4" stopOpacity={0.6} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 14 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#374151', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill="url(#colorKargo)" radius={[8, 8, 0, 0]} />
                </ChartComponent>
            </ResponsiveContainer>
        );
    };

    return (
        <Layout>
            <div className="min-h-screen font-sans bg-gradient-to-br from-pink-50 via-white to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white">
                <motion.div initial={{ x: -300 }} animate={{ x: menuOpen ? 0 : -300 }} transition={{ type: 'spring', stiffness: 100 }} className="fixed top-0 left-0 h-full w-64 bg-white/10 backdrop-blur-md dark:bg-gray-800/30 shadow-xl rounded-r-xl border border-white/10 p-4 z-50">
                    <button className="text-gray-600 dark:text-gray-300 text-xl self-end" onClick={toggleMenu}>✖</button>
                    <div className="flex flex-col gap-3 mt-4">
                        {(username === 'yaren' || username === 'ozge') && (
                            <>
                                <button onClick={() => window.open('/lokasyonlar', '_blank')} className={buttonClass}>📍 Lokasyonlar</button>
                                <button onClick={() => window.open('/projeler', '_blank')} className={buttonClass}>📁 Projeler</button>
                                <button onClick={() => window.open('/evrak-ekle', '_blank')} className={buttonClass}>📝 Evrak Ekle</button>
                                <button onClick={() => window.open('/toplu-evraklar', '_blank')} className={buttonClass}>📄 Tüm Evraklar</button>
                                <button onClick={() => window.open('/tum-kargo-bilgileri', '_blank')} className={buttonClass}>📋 Tüm Kargo Bilgileri</button>
                                <button onClick={() => window.open('/tutanak', '_blank')} className={buttonClass}>📝 Tutanak</button>
                            </>
                        )}
                        {username === 'refika' && (
                            <>
                                <button onClick={() => window.open('/kargo-bilgisi-ekle', '_blank')} className={buttonClass}>📦 Kargo Bilgisi Ekle</button>
                                <button onClick={() => window.open('/tum-kargo-bilgileri', '_blank')} className={buttonClass}>📋 Tüm Kargo Bilgileri</button>
                            </>
                        )}
                    </div>
                </motion.div>

                <nav className={`flex justify-between items-center bg-white/60 dark:bg-gray-800 shadow px-6 py-4 transition-all duration-300 ${menuOpen ? 'ml-64' : 'ml-0'}`}>
                    <button className="text-2xl text-gray-700 dark:text-white" onClick={toggleMenu}>☰</button>
                    <div className="text-lg font-bold">📁 Evrak Takip Sistemi</div>
                    <div className="flex items-center gap-3">
                        <span className="font-medium">{adSoyad}</span>
                        <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-pink-100 dark:bg-gray-700 text-xl flex items-center justify-center transition hover:rotate-180">
                            {darkMode ? '🌙' : '☀️'}
                        </button>
                        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">Çıkış</button>
                    </div>
                </nav>

                <main className={`p-6 transition-all duration-300 ${menuOpen ? 'ml-64' : 'ml-0'}`}>
                    {username === 'refika' && (
                        <>
                            <div className="bg-gradient-to-r from-pink-200 via-purple-100 to-white dark:from-gray-800 dark:via-gray-700 to-gray-900 p-6 rounded-xl shadow mb-6">
                                <h1 className="text-3xl font-bold">👋 Hoş geldin, {adSoyad}</h1>
                                <p className="text-gray-600 dark:text-gray-300">Bugün ne yapmak istersin?</p>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4 mb-8">
                                <motion.div whileHover={{ scale: 1.05 }} className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow border-l-4 border-pink-500">
                                    <h4 className="text-sm text-gray-500">Bugünkü Evrak</h4>
                                    <p className="text-2xl font-bold text-pink-600">12</p>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow border-l-4 border-pink-500">
                                    <h4 className="text-sm text-gray-500">Toplam Firma</h4>
                                    <p className="text-2xl font-bold text-pink-600">{firmalar.length - 1}</p>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow border-l-4 border-pink-500">
                                    <h4 className="text-sm text-gray-500">Kullanıcı</h4>
                                    <p className="text-2xl font-bold text-pink-600">{adSoyad}</p>
                                </motion.div>
                            </div>

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

                                <div className="flex gap-2">
                                    <button onClick={() => setChartType('bar')} className="text-sm px-3 py-1 rounded bg-pink-100 dark:bg-gray-700 hover:bg-pink-200 dark:hover:bg-gray-600">📊 Bar</button>
                                    <button onClick={() => setChartType('line')} className="text-sm px-3 py-1 rounded bg-pink-100 dark:bg-gray-700 hover:bg-pink-200 dark:hover:bg-gray-600">📉 Line</button>
                                    <button onClick={() => setChartType('area')} className="text-sm px-3 py-1 rounded bg-pink-100 dark:bg-gray-700 hover:bg-pink-200 dark:hover:bg-gray-600">📈 Area</button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                                {metric === 'kargo' ? '📦 Günlük Kargo Sayısı' : '📄 Günlük Evrak Adedi'} (Son 7 Gün)
                            </h3>
                            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-4">
                                Toplam: {dailyData.reduce((sum, item) => sum + item.count, 0)} kayıt
                            </div>

                            {renderChart()}

                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {dailyData.map(item => (
                                    <motion.div whileHover={{ scale: 1.02 }} key={item.date} className="p-5 bg-white dark:bg-gray-700 rounded-2xl shadow hover:shadow-lg transition-transform border-l-4 border-pink-500">
                                        <div className="text-xl font-semibold mb-1 text-gray-800 dark:text-white">📅 {item.label}</div>
                                        <div className="text-pink-600 dark:text-pink-300 font-bold text-lg">{item.count} kayıt</div>
                                    </motion.div>
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </Layout>
    );
}

export default Anasayfa;