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

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, tarih: today }));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedForm = { ...formData, [name]: value };

        const irsaliyeAdet = updatedForm.irsaliyeNo
            ? updatedForm.irsaliyeNo.split('-').filter(s => s.trim() !== '').length
            : 0;

        const odakAdet = updatedForm.odakEvrakNo
            ? updatedForm.odakEvrakNo.split('-').filter(s => s.trim() !== '').length
            : 0;

        updatedForm.evrakAdedi = irsaliyeAdet + odakAdet;

        setFormData(updatedForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { data, error } = await supabase.from('kargo_bilgileri').insert([{
            tarih: formData.tarih,
            kargo_firmasi: formData.kargoFirmasi,
            gonderi_numarasi: formData.gonderiNumarasi,
            gonderen_firma: formData.gonderenFirma,
            irsaliye_adi: formData.irsaliyeAdi,
            irsaliye_no: formData.irsaliyeNo,
            odak_evrak_no: formData.odakEvrakNo,
            evrak_adedi: formData.evrakAdedi
        }]);

        if (error) {
            console.error('Kayıt Hatası:', error.message);
            alert('❌ Kayıt başarısız oldu.');
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
        }
    };

    const fields = [
        { label: 'Tarih', name: 'tarih', type: 'date', required: true },
        { label: 'Kargo Firması', name: 'kargoFirmasi', placeholder: 'Örn: Aras, MNG', required: true },
        { label: 'Gönderi Numarası', name: 'gonderiNumarasi', required: true },
        { label: 'Gönderen Firma', name: 'gonderenFirma', required: true },
        { label: 'İrsaliye Adı', name: 'irsaliyeAdi', required: true },
        { label: 'İrsaliye No', name: 'irsaliyeNo', required: true, textarea: true },
        { label: 'Odak Evrak No', name: 'odakEvrakNo', required: true, textarea: true },
        { label: 'Evrak Adedi', name: 'evrakAdedi', type: 'number', readOnly: true }
    ];

    return (
        <Layout>
            <div className="flex justify-center items-center min-h-screen px-4 py-8">
                <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-pink-600 dark:text-pink-400">
                        📦 Kargo Bilgisi Ekle
                    </h1>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {fields.map((field) => (
                            <div key={field.name}>
                                <label className="block text-base sm:text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
                                    {field.label}
                                </label>

                                {field.textarea ? (
                                    <textarea
                                        name={field.name}
                                        value={formData[field.name]}
                                        onChange={handleChange}
                                        placeholder="2555-2454-26578-2546-21-857-635"
                                        rows={5}
                                        required={field.required}
                                        className="w-full px-4 py-2 rounded-lg border resize-y focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white overflow-y-auto max-h-60"
                                    />
                                ) : (
                                    <input
                                        type={field.type || 'text'}
                                        name={field.name}
                                        value={formData[field.name]}
                                        onChange={handleChange}
                                        placeholder={field.placeholder || ''}
                                        required={field.required}
                                        min={field.min}
                                        readOnly={field.readOnly || false}
                                        className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${field.readOnly ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-600' : ''
                                            }`}
                                    />
                                )}
                            </div>
                        ))}

                        <button
                            type="submit"
                            className="mt-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 rounded-lg shadow transition"
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
