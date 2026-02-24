import React, { useState, useEffect, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import { supabase } from './supabaseClient';

/**
 * KargoBilgisiEkle – Modern UI (Same Order / Alt Alta)
 * ----------------------------------------------------
 * ✅ QR/İrsaliye Okut alanı KALDIRILDI
 * ✅ Sıra aynı (alt alta)
 * ✅ Modern glass + gradient + premium input/button
 * ✅ Alert yerine toast
 * ✅ Evrak adedi otomatik hesap aynen
 */

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

    // UX
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null); // {type, msg}
    const toastTimerRef = useRef(null);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 2600);
    };

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, tarih: today }));

        const fetchDistinctValues = async () => {
            const { data, error } = await supabase
                .from('kargo_bilgileri')
                .select('kargo_firmasi, gonderen_firma, irsaliye_adi');

            if (error) {
                console.error(error);
                showToast('error', error.message || 'Liste verileri alınamadı');
                return;
            }

            if (!data) return;

            setKargoList([...new Set(data.map(i => i.kargo_firmasi).filter(Boolean))]);
            setGonderenList([...new Set(data.map(i => i.gonderen_firma).filter(Boolean))]);
            setIrsaliyeList([...new Set(data.map(i => i.irsaliye_adi).filter(Boolean))]);
        };

        fetchDistinctValues();

        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
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

    const toplamEvrak = useMemo(() => {
        return parseInt(formData.evrakAdedi || 0, 10) + (parseInt(ekstraEvrakSayisi || 0, 10) || 0);
    }, [formData.evrakAdedi, ekstraEvrakSayisi]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;

        if (!ekstraEvrakEklendi && !ekstraEvrakSoruAcik) {
            setEkstraEvrakSoruAcik(true);
            return;
        }

        const payload = {
            tarih: formData.tarih,
            kargo_firmasi: formData.kargoFirmasi,
            gonderi_numarasi: formData.gonderiNumarasi,
            gonderen_firma: formData.gonderenFirma,
            irsaliye_adi: formData.irsaliyeAdi,
            irsaliye_no: formData.irsaliyeNo || null,
            odak_evrak_no: formData.odakEvrakNo || null,
            evrak_adedi: toplamEvrak
        };

        setSaving(true);

        const { error } = await supabase.from('kargo_bilgileri').insert([payload]);

        if (error) {
            console.error(error);
            showToast('error', error.message || '❌ Kayıt başarısız oldu.');
            setSaving(false);
            return;
        }

        showToast('success', '✅ Kargo bilgisi başarıyla kaydedildi!');

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
        setSaving(false);
    };

    const autocompleteInput = (name, label, list) => (
        <div>
            <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                {label}
            </label>
            <div className="relative">
                <input
                    type="text"
                    name={name}
                    list={`${name}-list`}
                    value={formData[name]}
                    onChange={handleChange}
                    required
                    className="w-full h-11 px-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    placeholder="Seç veya yaz..."
                />
                <datalist id={`${name}-list`}>
                    {list.map((item, idx) => <option key={idx} value={item} />)}
                </datalist>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="min-h-screen px-4 py-10 relative">
                {/* Aurora background */}
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/18 via-fuchsia-400/14 to-cyan-400/14 blur-3xl" />
                    <div className="absolute top-32 right-[-160px] h-[380px] w-[380px] rounded-full bg-gradient-to-br from-violet-500/12 to-indigo-400/10 blur-3xl" />
                    <div className="absolute bottom-[-180px] left-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 blur-3xl" />
                </div>

                <div className="flex justify-center items-center min-h-[calc(100vh-40px)]">
                    <div className="w-full max-w-xl rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.10)] p-6 sm:p-8">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                    <span className="mr-2">📦</span>Kargo Bilgisi Ekle
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                    Aynı sırada, alt alta — sadece daha modern.
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Evrak toplamı
                                </div>
                                <div className="mt-1 inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 dark:bg-indigo-900/35 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/50">
                                    {toplamEvrak}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* 1) Tarih */}
                            <div>
                                <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                                    Tarih
                                </label>
                                <input
                                    type="date"
                                    name="tarih"
                                    value={formData.tarih}
                                    onChange={handleChange}
                                    required
                                    className="w-full h-11 px-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                />
                            </div>

                            {/* 2) Kargo Firması */}
                            {autocompleteInput('kargoFirmasi', 'Kargo Firması', kargoList)}

                            {/* 3) Gönderi Numarası */}
                            <div>
                                <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                                    Gönderi Numarası
                                </label>
                                <input
                                    name="gonderiNumarasi"
                                    value={formData.gonderiNumarasi}
                                    onChange={handleChange}
                                    required
                                    placeholder="Örn: 123456789"
                                    className="w-full h-11 px-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                />
                            </div>

                            {/* 4) Gönderen Firma */}
                            {autocompleteInput('gonderenFirma', 'Gönderen Firma', gonderenList)}

                            {/* 5) İrsaliye Adı */}
                            {autocompleteInput('irsaliyeAdi', 'İrsaliye Adı', irsaliyeList)}

                            {/* 6) İrsaliye No */}
                            <div>
                                <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                                    İrsaliye No
                                </label>
                                <textarea
                                    name="irsaliyeNo"
                                    rows="3"
                                    value={formData.irsaliyeNo}
                                    onChange={handleChange}
                                    placeholder="Örn: ABC123-DEF456"
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                />
                            </div>

                            {/* 7) Odak Evrak No */}
                            <div>
                                <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                                    Odak Evrak No (Opsiyonel)
                                </label>
                                <textarea
                                    name="odakEvrakNo"
                                    rows="3"
                                    value={formData.odakEvrakNo}
                                    onChange={handleChange}
                                    placeholder="Örn: ODK111-ODK222"
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                />
                            </div>

                            {/* 8) Evrak Adedi */}
                            <div>
                                <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                                    Evrak Adedi
                                </label>
                                <input
                                    type="number"
                                    name="evrakAdedi"
                                    value={formData.evrakAdedi}
                                    onChange={handleChange}
                                    required
                                    className="w-full h-11 px-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                />
                            </div>

                            {/* Ekstra Evrak Soruları (sıra aynı, modernleştirilmiş) */}
                            {ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                                <div className="rounded-2xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/15 backdrop-blur-xl p-4 mt-1">
                                    <p className="mb-2 font-semibold text-amber-900 dark:text-amber-100">
                                        Ekstra evrak eklemek istiyor musunuz?
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            className="w-full inline-flex items-center justify-center h-11 rounded-2xl text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30 transition"
                                        >
                                            Hayır
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEkstraEvrakEklendi(true)}
                                            className="w-full inline-flex items-center justify-center h-11 rounded-2xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 transition"
                                        >
                                            Evet
                                        </button>
                                    </div>
                                </div>
                            )}

                            {ekstraEvrakEklendi && (
                                <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-900/15 backdrop-blur-xl p-4 mt-1">
                                    <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-emerald-800 dark:text-emerald-200">
                                        Ekstra Evrak Sayısı
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={ekstraEvrakSayisi}
                                        onChange={(e) => setEkstraEvrakSayisi(e.target.value)}
                                        required
                                        className="w-full h-11 px-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                                    />
                                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                        Yeni toplam evrak: <span className="font-semibold">{toplamEvrak}</span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-2xl text-white bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 shadow-md shadow-pink-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-500/30 transition ${saving ? 'opacity-70 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        {saving ? <><Spinner /> Kaydediliyor...</> : 'Kaydet'}
                                    </button>
                                </div>
                            )}

                            {!ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`w-full inline-flex items-center justify-center gap-2 h-11 rounded-2xl text-white bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 shadow-md shadow-pink-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-500/30 transition ${saving ? 'opacity-70 cursor-not-allowed' : ''
                                        }`}
                                >
                                    {saving ? <><Spinner /> Kaydediliyor...</> : 'Kaydet'}
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {toast && <Toast type={toast.type} msg={toast.msg} />}
            </div>
        </Layout>
    );
}

/* Small UI helpers */
const Spinner = () => (
    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
);

const Toast = ({ type = 'info', msg }) => {
    const color =
        type === 'success'
            ? 'from-emerald-600 to-teal-600'
            : type === 'error'
                ? 'from-rose-600 to-rose-700'
                : 'from-indigo-600 to-violet-600';
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80]">
            <div className={`px-4 py-2 text-sm text-white rounded-2xl shadow-lg bg-gradient-to-r ${color} animate-[toast_0.25s_ease-out]`}>
                {msg}
            </div>
            <style>{`
        @keyframes toast { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
};

export default KargoBilgisiEkle;