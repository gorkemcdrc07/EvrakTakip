import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

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

        const { error } = await supabase.from('projeler').insert([
            { proje: yeniProje }
        ]);

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
        <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
            <h2>📁 Projeler</h2>

            {mesaj && (
                <div style={{
                    marginBottom: '1rem',
                    padding: '10px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #22c55e',
                    borderRadius: '4px',
                    color: '#166534'
                }}>
                    {mesaj}
                </div>
            )}

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={yeniProje}
                    onChange={(e) => setYeniProje(e.target.value)}
                    placeholder="Yeni proje adı girin..."
                    style={{
                        padding: '0.5rem',
                        flex: 1,
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                    }}
                />
                <button
                    onClick={projeEkle}
                    style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    ➕ Ekle
                </button>
            </div>

            {projeler.length === 0 ? (
                <p>Yükleniyor veya veri bulunamadı...</p>
            ) : (
                <table
                    style={{
                        borderCollapse: 'collapse',
                        width: '100%',
                        border: '1px solid #ddd'
                    }}
                >
                    <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Proje</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projeler.map((proje) => (
                            <tr key={proje.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{proje.id}</td>
                                <td style={{ padding: '10px' }}>{proje.proje}</td>
                                <td style={{ padding: '10px' }}>
                                    <button
                                        onClick={() => projeSil(proje.id)}
                                        style={{
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            padding: '0.3rem 0.8rem',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🗑 Sil
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default Projeler;
