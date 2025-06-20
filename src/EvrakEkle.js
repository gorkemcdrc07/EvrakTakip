import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout'; // Yolunu projenin yapısına göre düzenle

function EvrakEkle() {
    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [projeler, setProjeler] = useState([]);
    const [mesaj, setMesaj] = useState('');
    const [form, setForm] = useState({
        tarih: '',
        lokasyonid: '',
        projeler: [{ projeid: '', sefersayisi: '' }],
        seferler: [{ seferno: '', aciklama: '' }]
    });

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

    const toplamSeferSayisi = form.projeler.reduce((sum, p) => sum + Number(p.sefersayisi || 0), 0);

    const formatDate = (value) => {
        if (!value) return null;
        if (typeof value === 'string' && value.includes('.')) {
            const [gun, ay, yil] = value.split('.');
            return `${yil}-${ay.padStart(2, '0')}-${gun.padStart(2, '0')}`;
        }
        return String(value);
    };

    const handlePaste = (e) => {
        const text = e.clipboardData.getData('Text');
        const lines = text.trim().split('\n');
        if (lines.length === 0) return;

        const parsedProjeler = [];
        const parsedSeferler = [];

        let tarih = '';
        let lokasyon = '';

        for (let i = 0; i < lines.length; i++) {
            const cells = lines[i].split('\t');
            if (cells.length < 4) continue;

            const [t, l, projeAd, seferSayisiRaw, , seferno, aciklama] = cells.map(c => c.trim());
            const seferSayisi = parseInt(seferSayisiRaw) || 0;

            if (i === 0) {
                tarih = formatDate(t);
                lokasyon = l;
            }

            const proje = projeler.find(p => p.proje === projeAd);
            if (proje) parsedProjeler.push({ projeid: proje.id, sefersayisi: seferSayisi });


            if (seferno && aciklama) parsedSeferler.push({ seferno, aciklama });
        }

        const lok = lokasyonlar.find(l => l.lokasyon === lokasyon);
        if (!tarih || !lok) return;

        setForm({
            tarih,
            lokasyonid: lok.id,
            projeler: parsedProjeler,
            seferler: parsedSeferler.length ? parsedSeferler : [{ seferno: '', aciklama: '' }]
        });
    };

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

        const { error: seferError1 } = await supabase.from('evrakseferler').insert(seferKayitlari);
        const { error: seferError2 } = await supabase.from('evrakproje').insert(projeSeferKayitlari);

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
        <Layout>
            <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-2xl font-semibold text-center mb-4">📄 Evrak Ekle</h2>

                <h4 className="text-blue-800 dark:text-blue-300 font-medium mb-2">🧠 Excel'den Veri Yapıştır</h4>

                {mesaj && (
                    <div className={`text-center mb-4 p-3 rounded font-medium ${mesaj.includes('✅')
                            ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100'
                            : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100'
                        }`}>
                        {mesaj}
                    </div>
                )}

                <textarea
                    placeholder="Excel'den verileri buraya yapıştır"
                    onPaste={handlePaste}
                    className="w-full p-3 min-h-[100px] rounded border border-dashed border-gray-400 dark:bg-gray-700 dark:text-white mb-4 font-mono"
                />

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block mb-1">TARİH</label>
                        <input
                            type="date"
                            name="tarih"
                            value={form.tarih}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block mb-1">LOKASYON</label>
                        <select
                            name="lokasyonid"
                            value={form.lokasyonid}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Seçiniz</option>
                            {lokasyonlar.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.lokasyon}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1">PROJELER & SEFER SAYILARI</label>
                        {form.projeler.map((p, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <select
                                    value={p.projeid}
                                    onChange={(e) => handleProjeChange(i, 'projeid', e.target.value)}
                                    className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">Proje Seçiniz</option>
                                    {projeler.map((pr) => (
                                        <option key={pr.id} value={pr.id}>
                                            {pr.proje}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Sefer Sayısı"
                                    value={p.sefersayisi}
                                    onChange={(e) => handleProjeChange(i, 'sefersayisi', e.target.value)}
                                    className="w-40 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={handleProjeEkle}
                            className="mt-1 text-sm bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
                        >
                            ➕ Proje Ekle
                        </button>
                    </div>

                    <div>
                        <label className="block mb-1">TOPLAM SEFER SAYISI</label>
                        <input
                            type="number"
                            value={toplamSeferSayisi}
                            readOnly
                            className="w-full p-2 bg-gray-100 dark:bg-gray-700 border rounded dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block mb-1">SEFER DETAYLARI</label>
                        {form.seferler.map((s, i) => (
                            <div key={i} className="border border-gray-300 dark:border-gray-600 p-3 rounded mb-2">
                                <input
                                    placeholder="Sefer No"
                                    value={s.seferno}
                                    onChange={(e) => handleSeferChange(i, 'seferno', e.target.value)}
                                    className="w-full mb-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <select
                                    value={s.aciklama}
                                    onChange={(e) => handleSeferChange(i, 'aciklama', e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">Açıklama Seçiniz</option>
                                    <option value="TARAFIMIZCA DÜZELTİLMİŞTİR">TARAFIMIZCA DÜZELTİLMİŞTİR</option>
                                    <option value="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR">TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR</option>
                                    <option value="EKSİK TARAMA">EKSİK TARAMA</option>
                                    <option value="HASARLI TARAMA">HASARLI TARAMA</option>
                                    <option value="GÖRÜNTÜ TARAMA">GÖRÜNTÜ TARAMA</option>
                                </select>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={handleSeferEkle}
                            className="mt-1 text-sm bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
                        >
                            ➕ Sefer Ekle
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded mt-4"
                    >
                        📤 Kaydet
                    </button>
                </form>
            </div>
        </Layout>
    );
}

export default EvrakEkle;
