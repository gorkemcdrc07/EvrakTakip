import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { supabase } from './supabaseClient';

function KargoBilgisiEkle() {
    const [formData, setFormData] = useState({
        tarih: '',
        kargoFirmasi: '',
        gonderiNumarasi: '',
        gonderenFirma: '',
        irsaliyeAdi: '',
        irsaliyeNo: '',
        odakEvrakNo: '',
        evrakAdedi: 0
    });

    const [ekstraEvrakEklendi, setEkstraEvrakEklendi] = useState(false);
    const [kargoList, setKargoList] = useState([]);
    const [gonderenList, setGonderenList] = useState([]);
    const [irsaliyeList, setIrsaliyeList] = useState([]);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, tarih: today }));

        const fetchDistinctValues = async () => {
            const { data, error } = await supabase.from('kargo_bilgileri').select('kargo_firmasi, gonderen_firma, irsaliye_adi');

            if (!error && data) {
                setKargoList([...new Set(data.map(i => i.kargo_firmasi).filter(Boolean))]);
                setGonderenList([...new Set(data.map(i => i.gonderen_firma).filter(Boolean))]);
                setIrsaliyeList([...new Set(data.map(i => i.irsaliye_adi).filter(Boolean))]);
            }
        };

        fetchDistinctValues();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedForm = { ...formData, [name]: value };

        if (name !== 'evrakAdedi') {
            const irsaliyeAdet = updatedForm.irsaliyeNo?.split('-').filter(s => s.trim() !== '').length || 0;
            const odakAdet = updatedForm.odakEvrakNo?.split('-').filter(s => s.trim() !== '').length || 0;
            updatedForm.evrakAdedi = irsaliyeAdet + odakAdet;
        }

        setFormData(updatedForm);
    };

    const handleEkstraEvrak = () => {
        const sayi = prompt('Kaç adet ekstra evrak eklemek istiyorsunuz?');
        const eklenecek = parseInt(sayi, 10);

        if (!isNaN(eklenecek) && eklenecek > 0) {
            setFormData(prev => ({
                ...prev,
                evrakAdedi: parseInt(prev.evrakAdedi) + eklenecek
            }));
            setEkstraEvrakEklendi(true);
        } else {
            alert('Geçerli bir sayı girilmedi.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!ekstraEvrakEklendi) {
            const cevap = window.confirm('Ekstra evrak eklemek ister misiniz?');
            if (cevap) {
                handleEkstraEvrak();
                return;
            }
        }

        const { error } = await supabase.from('kargo_bilgileri').insert([{
            tarih: formData.tarih,
            kargo_firmasi: formData.kargoFirmasi,
            gonderi_numarasi: formData.gonderiNumarasi,
            gonderen_firma: formData.gonderenFirma,
            irsaliye_adi: formData.irsaliyeAdi,
            irsaliye_no: formData.irsaliyeNo,
            odak_evrak_no: formData.odakEvrakNo || null,
            evrak_adedi: parseInt(formData.evrakAdedi)
        }]);

        if (error) {
            alert('❌ Kayıt başarısız oldu.');
            console.error(error);
        } else {
            alert('✅ Kargo bilgisi başarıyla kaydedildi!');
            setFormData(prev => ({
                ...prev,
                kargoFirmasi: '',
                gonderiNumarasi: '',
                gonderenFirma: '',
                irsaliyeAdi: '',
                irsaliyeNo: '',
                odakEvrakNo: '',
                evrakAdedi: 0
            }));
            setEkstraEvrakEklendi(false);
        }
    };

    const autocompleteInput = (name, label, list) => (
        <div>
            <label className="block mb-1 font-medium">{label}</label>
            <input
                type="text"
                name={name}
                list={`${name}-list`}
                value={formData[name]}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
            />
            <datalist id={`${name}-list`}>
                {list.map((item, idx) => (
                    <option key={idx} value={item} />
                ))}
            </datalist>
        </div>
    );

    return (
        <Layout>
            <div className="flex justify-center items-center min-h-screen px-4 py-8">
                <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-pink-600 dark:text-pink-400">
                        📦 Kargo Bilgisi Ekle
                    </h1>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block mb-1 font-medium">Tarih</label>
                            <input
                                type="date"
                                name="tarih"
                                value={formData.tarih}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        {autocompleteInput('kargoFirmasi', 'Kargo Firması', kargoList)}
                        <div>
                            <label className="block mb-1 font-medium">Gönderi Numarası</label>
                            <input
                                name="gonderiNumarasi"
                                value={formData.gonderiNumarasi}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        {autocompleteInput('gonderenFirma', 'Gönderen Firma', gonderenList)}
                        {autocompleteInput('irsaliyeAdi', 'İrsaliye Adı', irsaliyeList)}

                        <div>
                            <label className="block mb-1 font-medium">İrsaliye No</label>
                            <textarea
                                name="irsaliyeNo"
                                rows="3"
                                value={formData.irsaliyeNo}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Odak Evrak No (Opsiyonel)</label>
                            <textarea
                                name="odakEvrakNo"
                                rows="3"
                                value={formData.odakEvrakNo}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Evrak Adedi</label>
                            <input
                                type="number"
                                name="evrakAdedi"
                                value={formData.evrakAdedi}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleEkstraEvrak}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg shadow"
                        >
                            ➕ Ekstra Evrak Sayısı Ekle
                        </button>

                        <button
                            type="submit"
                            className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 rounded-lg shadow"
                        >
                            Kaydet
                        </button>
                    </form>
                </div>
            </div>
        </Layout>
    );
}

export default KargoBilgisiEkle;
