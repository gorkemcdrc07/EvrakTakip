import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout'; // Yolunu projene göre ayarla

function Lokasyonlar() {
    const navigate = useNavigate();
    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [hata, setHata] = useState('');

    useEffect(() => {
        document.title = 'Lokasyonlar';

        const fetchData = async () => {
            const { data, error } = await supabase.from('lokasyonlar').select('*');
            if (error) {
                console.error('❌ Veri çekme hatası:', error);
                setHata('Veriler alınamadı');
                setLokasyonlar([]);
            } else {
                console.log('✅ Gelen veri:', data);
                setLokasyonlar(data);
            }
        };

        fetchData();
    }, []);

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-8 transition-colors duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">📍 Lokasyonlar</h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-sm"
                    >
                        ← Geri
                    </button>
                </div>

                {hata && (
                    <p className="text-red-600 dark:text-red-400 font-semibold mb-4">{hata}</p>
                )}

                <ul className="space-y-3">
                    {Array.isArray(lokasyonlar) && lokasyonlar.length > 0 ? (
                        lokasyonlar.map((lokasyon) => (
                            <li
                                key={lokasyon.id}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-4 py-3 shadow-sm transition-colors"
                            >
                                {lokasyon.lokasyon}
                            </li>
                        ))
                    ) : (
                        <li className="text-gray-600 dark:text-gray-400 italic">
                            Gösterilecek lokasyon bulunamadı.
                        </li>
                    )}
                </ul>
            </div>
        </Layout>
    );
}

export default Lokasyonlar;
