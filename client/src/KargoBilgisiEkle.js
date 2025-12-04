import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { supabase } from './supabaseClient';
import QrOkuyucu from "./components/QrOkuyucu";

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

    const [ekstraEvrakSoruAcik, setEkstraEvrakSoruAcik] = useState(false);
    const [ekstraEvrakEklendi, setEkstraEvrakEklendi] = useState(false);
    const [ekstraEvrakSayisi, setEkstraEvrakSayisi] = useState('');

    const [kargoList, setKargoList] = useState([]);
    const [gonderenList, setGonderenList] = useState([]);
    const [irsaliyeList, setIrsaliyeList] = useState([]);

    const [qrAcik, setQrAcik] = useState(false);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, tarih: today }));

        const fetchDistinctValues = async () => {
            const { data, error } = await supabase
                .from('kargo_bilgileri')
                .select('kargo_firmasi, gonderen_firma, irsaliye_adi');

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

    // ✔ QR OKUMA FONKSİYONU → ARTIK BİRLEŞTİRİYOR
    const handleQrOkuma = (sonuc) => {
        if (!sonuc) return;

        const temiz = sonuc.trim();

        setFormData(prev => {
            const mevcut = prev.irsaliyeNo.trim();

            if (!mevcut) {
                return { ...prev, irsaliyeNo: temiz };
            }

            return { ...prev, irsaliyeNo: `${mevcut}-${temiz}` };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!ekstraEvrakEklendi && !ekstraEvrakSoruAcik) {
            setEkstraEvrakSoruAcik(true);
            return;
        }

        const toplamEvrak = parseInt(formData.evrakAdedi) + (parseInt(ekstraEvrakSayisi) || 0);

        supabase.from('kargo_bilgileri').insert([{
            tarih: formData.tarih,
            kargo_firmasi: formData.kargoFirmasi,
            gonderi_numarasi: formData.gonderiNumarasi,
            gonderen_firma: formData.gonderenFirma,
            irsaliye_adi: formData.irsaliyeAdi,
            irsaliye_no: formData.irsaliyeNo || null,
            odak_evrak_no: formData.odakEvrakNo || null,
            evrak_adedi: toplamEvrak
        }]).then(({ error }) => {
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
                setEkstraEvrakSoruAcik(false);
                setEkstraEvrakEklendi(false);
                setEkstraEvrakSayisi('');
            }
        });
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
                {list.map((item, idx) => <option key={idx} value={item} />)}
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

                        {/* QR OKUT BUTONU */}
                        <button
                            type="button"
                            onClick={() => setQrAcik(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                        >
                            📷 İrsaliye Okut
                        </button>

                        {/* QR OKUYUCU */}
                        {qrAcik && (
                            <div className="p-3 border rounded bg-gray-100 dark:bg-gray-700">
                                <p className="font-semibold mb-2">Karekod Okutun</p>

                                <QrOkuyucu onScan={(text) => handleQrOkuma(text)} />

                                <button
                                    type="button"
                                    onClick={() => setQrAcik(false)}
                                    className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                >
                                    Kapat
                                </button>
                            </div>
                        )}

                        <div>
                            <label className="block mb-1 font-medium">İrsaliye No</label>
                            <textarea
                                name="irsaliyeNo"
                                rows="3"
                                value={formData.irsaliyeNo}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
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

                        {/* Ekstra Evrak Soruları */}
                        {ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded-lg mt-4">
                                <p className="mb-2 font-semibold">Ekstra evrak eklemek istiyor musunuz?</p>
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                    >
                                        Hayır
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEkstraEvrakEklendi(true)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                    >
                                        Evet
                                    </button>
                                </div>
                            </div>
                        )}

                        {ekstraEvrakEklendi && (
                            <div className="mt-4">
                                <label className="block mb-1 font-medium">Ekstra Evrak Sayısı</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={ekstraEvrakSayisi}
                                    onChange={(e) => setEkstraEvrakSayisi(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    className="mt-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg shadow"
                                >
                                    Kaydet
                                </button>
                            </div>
                        )}

                        {!ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                            <button
                                type="submit"
                                className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 rounded-lg shadow"
                            >
                                Kaydet
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </Layout>
    );
}

export default KargoBilgisiEkle;
