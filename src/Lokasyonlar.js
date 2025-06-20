import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout'; // Yolunu projene göre ayarla

function Lokasyonlar() {
    const navigate = useNavigate();
    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [hata, setHata] = useState('');
    const [yeniLokasyon, setYeniLokasyon] = useState('');
    const [yukleniyor, setYukleniyor] = useState(false);

    useEffect(() => {
        document.title = 'Lokasyonlar';
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data, error } = await supabase.from('lokasyonlar').select('*');
        if (error) {
            console.error('❌ Veri çekme hatası:', error);
            setHata('Veriler alınamadı');
            setLokasyonlar([]);
        } else {
            setHata('');
            setLokasyonlar(data);
        }
    };

    const handleEkle = async (e) => {
        e.preventDefault();
        if (!yeniLokasyon.trim()) return;

        setYukleniyor(true);
        const { data, error } = await supabase
            .from('lokasyonlar')
            .insert([{ lokasyon: yeniLokasyon.trim() }]);

        if (error) {
            setHata('Lokasyon eklenemedi.');
            console.error(error);
        } else {
            setYeniLokasyon('');
            fetchData(); // Listeyi güncelle
        }
        setYukleniyor(false);
    };

    const handleSil = async (id) => {
        const confirm = window.confirm("Bu lokasyonu silmek istediğinizden emin misiniz?");
        if (!confirm) return;

        const { error } = await supabase
            .from('lokasyonlar')
            .delete()
            .eq('id', id);

        if (error) {
            setHata('Silme işlemi başarısız.');
            console.error(error);
        } else {
            fetchData();
        }
    };

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

                <form onSubmit={handleEkle} className="mb-6 flex gap-2">
                    <input
                        type="text"
                        value={yeniLokasyon}
                        onChange={(e) => setYeniLokasyon(e.target.value)}
                        placeholder="Yeni lokasyon girin"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                    <button
                        type="submit"
                        disabled={yukleniyor}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        {yukleniyor ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                </form>

                {hata && (
                    <p className="text-red-600 dark:text-red-400 font-semibold mb-4">{hata}</p>
                )}

                <ul className="space-y-3">
                    {Array.isArray(lokasyonlar) && lokasyonlar.length > 0 ? (
                        lokasyonlar.map((lokasyon) => (
                            <li
                                key={lokasyon.id}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-4 py-3 shadow-sm flex justify-between items-center"
                            >
                                <span>{lokasyon.lokasyon}</span>
                                <button
                                    onClick={() => handleSil(lokasyon.id)}
                                    className="text-sm text-red-600 hover:underline"
                                >
                                    Sil
                                </button>
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
