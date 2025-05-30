import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function EvrakEkle() {
    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [projeler, setProjeler] = useState([]);
    const [form, setForm] = useState({
        tarih: '',
        lokasyonid: '',
        projeler: [{ projeid: '', sefersayisi: '' }],
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

    const handleProjeChange = (index, field, value) => {
        const updated = [...form.projeler];
        updated[index][field] = value;
        setForm({ ...form, projeler: updated });
    };

    const handleProjeEkle = () => {
        setForm({ ...form, projeler: [...form.projeler, { projeid: '', sefersayisi: '' }] });
    };

    const handleSeferChange = (index, field, value) => {
        const updated = [...form.seferler];
        updated[index][field] = value;
        setForm({ ...form, seferler: updated });
    };

    const handleSeferEkle = () => {
        setForm({ ...form, seferler: [...form.seferler, { seferno: '', aciklama: '' }] });
    };

    const toplamSeferSayisi = form.projeler.reduce(
        (sum, p) => sum + Number(p.sefersayisi || 0), 0
    );

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { data: evrakData, error: evrakError } = await supabase
            .from('evraklar')
            .insert([{
                tarih: form.tarih,
                lokasyonid: parseInt(form.lokasyonid, 10),
                sefersayisi: toplamSeferSayisi
            }]);

        if (evrakError) {
            setMesaj('❌ Evrak eklenemedi.');
            return;
        }

        const { data: yeniEvrak } = await supabase
            .from('evraklar')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        const evrakId = yeniEvrak?.[0]?.id;

        const projeSeferKayitlari = form.projeler.map(p => ({
            evrakid: evrakId,
            projeid: parseInt(p.projeid),
            sefersayisi: parseInt(p.sefersayisi)
        }));

        const seferKayitlari = form.seferler.map(s => ({
            evrakid: evrakId,
            seferno: s.seferno,
            aciklama: s.aciklama
        }));

        const { error: seferError1 } = await supabase
            .from('evrakseferler')
            .insert(seferKayitlari);

        const { error: seferError2 } = await supabase
            .from('evrakproje')
            .insert(projeSeferKayitlari);

        if (seferError1 || seferError2) {
            setMesaj('❌ Sefer veya proje kayıtları eklenemedi.');
        } else {
            setMesaj('✅ Başarıyla eklendi.');
            setForm({
                tarih: '',
                lokasyonid: '',
                projeler: [{ projeid: '', sefersayisi: '' }],
                seferler: [{ seferno: '', aciklama: '' }]
            });
        }

        setTimeout(() => setMesaj(''), 3000);
    };

    return (
        <div style={containerStyle}>
            <h2 style={{ textAlign: 'center' }}>📄 Evrak Ekle</h2>

            {mesaj && (
                <div style={{
                    backgroundColor: mesaj.includes('✅') ? '#dcfce7' : '#fee2e2',
                    padding: '10px',
                    borderRadius: '8px',
                    color: mesaj.includes('✅') ? '#065f46' : '#991b1b',
                    marginBottom: '1rem',
                    textAlign: 'center'
                }}>
                    {mesaj}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label>TARİH</label>
                <input type="date" name="tarih" value={form.tarih} onChange={handleChange} required style={inputStyle} />

                <label>LOKASYON</label>
                <select name="lokasyonid" value={form.lokasyonid} onChange={handleChange} required style={inputStyle}>
                    <option value="">Seçiniz</option>
                    {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.lokasyon}</option>)}
                </select>

                <label>PROJELER & SEFER SAYILARI</label>
                {form.projeler.map((p, i) => (
                    <div key={i} style={projeStyle}>
                        <select value={p.projeid} onChange={e => handleProjeChange(i, 'projeid', e.target.value)} style={inputStyle}>
                            <option value="">Proje Seçiniz</option>
                            {projeler.map(pr => <option key={pr.id} value={pr.id}>{pr.proje}</option>)}
                        </select>
                        <input
                            type="number"
                            placeholder="Sefer Sayısı"
                            value={p.sefersayisi}
                            onChange={e => handleProjeChange(i, 'sefersayisi', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                ))}
                <button type="button" onClick={handleProjeEkle} style={ekleButonu}>➕ Proje Ekle</button>

                <label>TOPLAM SEFER SAYISI</label>
                <input type="number" value={toplamSeferSayisi} readOnly style={{ ...inputStyle, background: '#f3f4f6' }} />

                <label>SEFER DETAYLARI</label>
                {form.seferler.map((s, i) => (
                    <div key={i} style={seferStyle}>
                        <input placeholder="Sefer No" value={s.seferno} onChange={e => handleSeferChange(i, 'seferno', e.target.value)} style={inputStyle} />
                        <select value={s.aciklama} onChange={e => handleSeferChange(i, 'aciklama', e.target.value)} style={inputStyle}>
                            <option value="">Açıklama Seçiniz</option>
                            <option value="TARAFIMIZCA DÜZELTİLMİŞTİR">TARAFIMIZCA DÜZELTİLMİŞTİR</option>
                            <option value="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR">TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR</option>
                        </select>
                    </div>
                ))}
                <button type="button" onClick={handleSeferEkle} style={ekleButonu}>➕ Sefer Ekle</button>

                <button type="submit" style={submitButton}>📤 Kaydet</button>
            </form>
        </div>
    );
}

const containerStyle = {
    maxWidth: '700px',
    margin: '2rem auto',
    background: '#fff',
    padding: '2rem',
    borderRadius: '10px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    fontFamily: 'Arial'
};

const inputStyle = {
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    width: '100%',
    marginTop: '0.3rem'
};

const projeStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '0.5rem'
};

const seferStyle = {
    border: '1px solid #e5e7eb',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
};

const ekleButonu = {
    backgroundColor: '#6366f1',
    color: 'white',
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold'
};

const submitButton = {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.8rem',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '1rem'
};

export default EvrakEkle;
