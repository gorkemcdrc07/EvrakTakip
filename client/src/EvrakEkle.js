import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function EvrakEkle() {
    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [projeler, setProjeler] = useState([]);
    const [form, setForm] = useState({
        tarih: '',
        lokasyonid: '',
        projeid: '',
        sefersayisi: '',
        seferler: [{ seferno: '', aciklama: '' }]
    });
    const [mesaj, setMesaj] = useState('');

    useEffect(() => {
        document.title = 'Evrak Ekle';
        verileriYukle();
    }, []);

    const verileriYukle = async () => {
        const { data: lokasyonData } = await supabase.from('lokasyonlar').select('*');
        const { data: projeData } = await supabase.from('projeler').select('*');
        setLokasyonlar(lokasyonData || []);
        setProjeler(projeData || []);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSeferChange = (index, field, value) => {
        const yeniSeferler = [...form.seferler];
        yeniSeferler[index][field] = value;
        setForm({ ...form, seferler: yeniSeferler });
    };

    const handleSeferEkle = () => {
        setForm({
            ...form,
            seferler: [...form.seferler, { seferno: '', aciklama: '' }]
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Ana evrak kaydı ekleniyor
        const { data: evrakData, error: evrakError } = await supabase
            .from('evraklar')
            .insert([{
                tarih: form.tarih,
                lokasyonid: parseInt(form.lokasyonid, 10),
                projeid: parseInt(form.projeid, 10),
                sefersayisi: parseInt(form.sefersayisi, 10)
            }]);

        if (evrakError) {
            console.error('❌ Evrak eklenemedi:', evrakError);
            setMesaj('❌ Evrak eklenemedi.');
            return;
        }

        // ID'yi almak için ikinci sorguya gerek varsa (örnek: unique tarih+lokasyon+proje yoksa)
        const { data: yeniEvrak } = await supabase
            .from('evraklar')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        const evrakId = yeniEvrak?.[0]?.id;

        // 2. Sefer kayıtları
        const seferPayload = form.seferler.map(sefer => ({
            evrakid: evrakId,
            seferno: sefer.seferno,
            aciklama: sefer.aciklama
        }));

        const { error: seferError } = await supabase
            .from('evrakseferler')
            .insert(seferPayload);

        if (seferError) {
            console.error('❌ Sefer kayıtları eklenemedi:', seferError);
            setMesaj('❌ Sefer kayıtları eklenemedi.');
        } else {
            setMesaj('✅ Evrak ve sefer kayıtları başarıyla eklendi.');
            setForm({
                tarih: '',
                lokasyonid: '',
                projeid: '',
                sefersayisi: '',
                seferler: [{ seferno: '', aciklama: '' }]
            });
        }

        setTimeout(() => setMesaj(''), 3000);
    };

    return (
        <div style={containerStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>📄 Evrak Ekle</h2>

            {mesaj && (
                <div style={{
                    backgroundColor: mesaj.startsWith('✅') ? '#e0fce0' : '#ffe0e0',
                    padding: '10px',
                    borderRadius: '8px',
                    color: mesaj.startsWith('✅') ? '#106b21' : '#a30000',
                    marginBottom: '1rem',
                    textAlign: 'center',
                    fontWeight: 'bold'
                }}>{mesaj}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                    <label>TARİH</label>
                    <input type="date" name="tarih" value={form.tarih} onChange={handleChange} required style={inputStyle} />
                </div>

                <div>
                    <label>LOKASYON</label>
                    <select name="lokasyonid" value={form.lokasyonid} onChange={handleChange} required style={inputStyle}>
                        <option value="">Seçiniz</option>
                        {lokasyonlar.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.lokasyon}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>PROJE</label>
                    <select name="projeid" value={form.projeid} onChange={handleChange} required style={inputStyle}>
                        <option value="">Seçiniz</option>
                        {projeler.map(proj => (
                            <option key={proj.id} value={proj.id}>{proj.proje}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>TOPLAM SEFER SAYISI</label>
                    <input
                        type="number"
                        min="1"
                        name="sefersayisi"
                        value={form.sefersayisi}
                        onChange={handleChange}
                        required
                        style={inputStyle}
                    />
                    <p style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic', marginTop: '0.3rem' }}>
                        Bu lokasyon + proje için toplam kaç sefer yapıldı?
                    </p>
                </div>

                {form.seferler.map((sefer, index) => (
                    <div key={index} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
                        <label>SEFER NO #{index + 1}</label>
                        <input
                            type="text"
                            value={sefer.seferno}
                            onChange={(e) => handleSeferChange(index, 'seferno', e.target.value)}
                            required
                            style={inputStyle}
                        />

                        <label>AÇIKLAMA</label>
                        <select
                            value={sefer.aciklama}
                            onChange={(e) => handleSeferChange(index, 'aciklama', e.target.value)}
                            required
                            style={inputStyle}
                        >
                            <option value="">Seçiniz</option>
                            <option value="TARAFIMIZCA DÜZELTİLMİŞTİR">TARAFIMIZCA DÜZELTİLMİŞTİR</option>
                            <option value="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR">TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR</option>
                        </select>
                    </div>
                ))}

                <button type="button" onClick={handleSeferEkle} style={{ ...submitButtonStyle, backgroundColor: '#10b981' }}>
                    ➕ Sefer Ekle
                </button>

                <button type="submit" style={submitButtonStyle}>📤 Kaydet</button>
            </form>
        </div>
    );
}

const containerStyle = {
    maxWidth: '650px',
    margin: '3rem auto',
    background: '#f9fafb',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Arial, sans-serif'
};

const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    marginTop: '0.3rem',
    fontSize: '1rem'
};

const submitButtonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.8rem',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
};

export default EvrakEkle;