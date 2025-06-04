import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout'; // yolunu projenin yapısına göre ayarla

function Projeler() {
    const [projeler, setProjeler] = useState([]);
    const [yeniProje, setYeniProje] = useState('');
    const [mesaj, setMesaj] = useState('');

    useEffect(() => {
        document.title = 'Projeler';
        projeleriYukle();
    }, []);

    const projeleriYukle = async () => {
        const { data, error } = await supabase.from('projeler').select('*');
        if (error) {
            console.error('Projeler alınamadı:', error.message);
            setMesaj('❌ Veriler çekilemedi.');
        } else {
            setProjeler(data);
        }
    };

    const projeEkle = async () => {
        if (!yeniProje.trim()) return alert('Proje adı boş olamaz.');

        const { error } = await supabase.from('projeler').insert([{ proje: yeniProje }]);

        if (error) {
            console.error('Proje eklenemedi:', error.message);
            setMesaj('❌ Proje eklenemedi.');
        } else {
            setYeniProje('');
            setMesaj('✅ Proje başarıyla eklendi.');
            projeleriYukle();
        }

        setTimeout(() => setMesaj(''), 3000);
    };

    const projeSil = async (id) => {
        if (!window.confirm('Bu projeyi silmek istediğinize emin misiniz?')) return;

        const { error } = await supabase.from('projeler').delete().eq('id', id);

        if (error) {
            console.error('Proje silinemedi:', error.message);
            setMesaj('❌ Silme işlemi başarısız.');
        } else {
            setMesaj('🗑 Proje silindi.');
            projeleriYukle();
        }

        setTimeout(() => setMesaj(''), 3000);
    };

    return (
        <Layout>
            <div className="p-6 font-sans min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <h2 className="text-2xl font-semibold mb-4">📁 Projeler</h2>

                {mesaj && (
                    <div className="mb-4 p-3 border border-green-500 bg-green-100 dark:bg-green-800 dark:border-green-400 text-green-800 dark:text-green-100 rounded">
                        {mesaj}
                    </div>
                )}

                <div className="mb-4 flex gap-2">
                    <input
                        type="text"
                        value={yeniProje}
                        onChange={(e) => setYeniProje(e.target.value)}
                        placeholder="Yeni proje adı girin..."
                        className="flex-1 px-3 py-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                    <button
                        onClick={projeEkle}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                        ➕ Ekle
                    </button>
                </div>

                {projeler.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-300">Yükleniyor veya veri bulunamadı...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300 dark:border-gray-700">
                            <thead>
                                <tr className="bg-gray-200 dark:bg-gray-800">
                                    <th className="text-left px-4 py-2">ID</th>
                                    <th className="text-left px-4 py-2">Proje</th>
                                    <th className="text-left px-4 py-2">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projeler.map((proje) => (
                                    <tr key={proje.id} className="border-t border-gray-200 dark:border-gray-700">
                                        <td className="px-4 py-2">{proje.id}</td>
                                        <td className="px-4 py-2">{proje.proje}</td>
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => projeSil(proje.id)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                                            >
                                                🗑 Sil
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default Projeler;
