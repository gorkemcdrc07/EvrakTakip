import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Lokasyonlar.css';
import { supabase } from './supabaseClient'; // Supabase client bağlantısı

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
        <div className="lokasyonlar-page">
            <div className="lokasyonlar-header">
                <h2>📍 Lokasyonlar</h2>
                <button onClick={() => navigate(-1)} className="geri-btn">← Geri</button>
            </div>

            {hata && <p className="hata-mesaj">{hata}</p>}

            <ul className="lokasyon-listesi">
                {Array.isArray(lokasyonlar) && lokasyonlar.length > 0 ? (
                    lokasyonlar.map((lokasyon) => (
                        <li key={lokasyon.id} className="lokasyon-item">
                            {lokasyon.lokasyon}
                        </li>
                    ))
                ) : (
                    <li className="lokasyon-item">Gösterilecek lokasyon bulunamadı.</li>
                )}
            </ul>
        </div>
    );
}

export default Lokasyonlar;
