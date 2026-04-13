import React, { useState, useEffect, useRef, useMemo } from 'react';
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

    const [scannerValue, setScannerValue] = useState('');
    const [scannerPreview, setScannerPreview] = useState('');
    const [ekstraEvrakSoruAcik, setEkstraEvrakSoruAcik] = useState(false);
    const [ekstraEvrakEklendi, setEkstraEvrakEklendi] = useState(false);
    const [ekstraEvrakSayisi, setEkstraEvrakSayisi] = useState('');

    const [kargoList, setKargoList] = useState([]);
    const [gonderenList, setGonderenList] = useState([]);
    const [irsaliyeList, setIrsaliyeList] = useState([]);

    const [saving, setSaving] = useState(false);

    const [notice, setNotice] = useState(null);
    // { type: 'success' | 'error' | 'info', title: '', message: '' }

    const scannerInputRef = useRef(null);
    const scannerProcessTimerRef = useRef(null);
    const scannerRefocusTimerRef = useRef(null);
    const noticeTimerRef = useRef(null);

    const REQUIRED_IRSALIYE_LENGTH = 16;

    const showNotice = (type, title, message, autoClose = true) => {
        setNotice({ type, title, message });

        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);

        if (autoClose) {
            noticeTimerRef.current = setTimeout(() => {
                setNotice(null);
                focusScanner();
            }, 2200);
        }
    };

    const closeNotice = () => {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        setNotice(null);
        setTimeout(() => focusScanner(), 50);
    };

    const focusScanner = () => {
        if (document.activeElement !== scannerInputRef.current) {
            scannerInputRef.current?.focus();
        }
    };

    const hesaplaEvrakAdedi = (irsaliyeNo, odakEvrakNo) => {
        const irsaliyeAdet =
            irsaliyeNo?.split('-').map(s => s.trim()).filter(Boolean).length || 0;
        const odakAdet =
            odakEvrakNo?.split('-').map(s => s.trim()).filter(Boolean).length || 0;

        return irsaliyeAdet + odakAdet;
    };

    const normalizeScannerText = (text) => {
        if (!text || typeof text !== 'string') return '';

        return text
            .replace(/\r/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")
            .replace(/İ/g, 'I')
            .replace(/ı/g, 'i')
            .replace(/Ş/g, 'S')
            .replace(/ş/g, 's')
            .replace(/Ğ/g, 'G')
            .replace(/ğ/g, 'g')
            .replace(/Ü/g, 'U')
            .replace(/ü/g, 'u')
            .replace(/Ö/g, 'O')
            .replace(/ö/g, 'o')
            .replace(/Ç/g, 'C')
            .replace(/ç/g, 'c')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const sanitizeIrsaliyeNo = (value) => {
        if (!value) return '';
        return value
            .trim()
            .replace(/^"+|"+$/g, '')
            .replace(/^'+|'+$/g, '')
            .replace(/[^A-Za-z0-9]/g, '')
            .toUpperCase();
    };

    const sanitizeOdakEvrakNo = (value) => {
        if (!value) return '';
        return value
            .trim()
            .replace(/^"+|"+$/g, '')
            .replace(/^'+|'+$/g, '')
            .replace(/[^A-Za-z0-9]/g, '')
            .toUpperCase();
    };

    const extractIrsaliyeNo = (rawText) => {
        if (!rawText || typeof rawText !== 'string') return '';

        const text = normalizeScannerText(rawText);

        const patterns = [
            /"no"\s*:\s*"([^"]+)"/i,
            /"no"\s*\.\s*"([^"]+)"/i,
            /\bno\b\s*[:.]\s*"([^"]+)"/i,
            /\bno\b\s*[:.]\s*([A-Z0-9_-]{5,})/i,
            /\bno\b[^A-Z0-9]{0,20}([A-Z0-9_-]{5,})/i,
            /(?:^|[,{ ])\s*no\s*(?:[:. ]\s*)?([A-Z0-9_-]{5,})/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match?.[1]) {
                return sanitizeIrsaliyeNo(match[1]);
            }
        }

        return '';
    };

    const extractSfrValue = (rawText) => {
        if (!rawText || typeof rawText !== 'string') return '';

        const text = normalizeScannerText(rawText).toUpperCase();

        const match = text.match(/\bSFR[A-Z0-9]+\b/);
        return match ? sanitizeOdakEvrakNo(match[0]) : '';
    };

    const odakEvrakNoEkle = (yeniNo) => {
        if (!yeniNo) return;

        const temizNo = sanitizeOdakEvrakNo(yeniNo);

        if (!temizNo.startsWith('SFR')) {
            showNotice(
                'error',
                'Geçersiz odak evrak no',
                'Okunan değer SFR ile başlamıyor. Lütfen tekrar deneyin.'
            );
            return;
        }

        const mevcutlar = formData.odakEvrakNo
            ? formData.odakEvrakNo.split('-').map(s => s.trim()).filter(Boolean)
            : [];

        if (mevcutlar.includes(temizNo)) {
            showNotice(
                'info',
                'Bu odak evrak no zaten eklendi',
                `${temizNo} daha önce Odak Evrak No alanına eklenmiş.`
            );
            return;
        }

        const yeniOdakEvrakNo = mevcutlar.length > 0
            ? `${mevcutlar.join(' - ')} - ${temizNo}`
            : temizNo;

        setFormData(prev => ({
            ...prev,
            odakEvrakNo: yeniOdakEvrakNo,
            evrakAdedi: hesaplaEvrakAdedi(prev.irsaliyeNo, yeniOdakEvrakNo)
        }));

        showNotice(
            'success',
            'Odak evrak no eklendi',
            `${temizNo} başarıyla Odak Evrak No alanına eklendi.`
        );
    };

    const irsaliyeNoEkle = (yeniNo) => {
        if (!yeniNo) return;

        const temizNo = sanitizeIrsaliyeNo(yeniNo);

        if (temizNo.length !== REQUIRED_IRSALIYE_LENGTH) {
            showNotice(
                'error',
                'Karakter sayısı hatalı',
                `Okunan irsaliye no ${temizNo.length} karakter. ${REQUIRED_IRSALIYE_LENGTH} karakter olması gerekiyor. Lütfen tekrar deneyin ya da elle yazın.`
            );
            return;
        }

        const mevcutlar = formData.irsaliyeNo
            ? formData.irsaliyeNo.split('-').map(s => s.trim()).filter(Boolean)
            : [];

        if (mevcutlar.includes(temizNo)) {
            showNotice(
                'info',
                'Bu irsaliye zaten eklendi',
                `${temizNo} daha önce listeye eklenmiş.`
            );
            return;
        }

        const yeniIrsaliyeNo = [...mevcutlar, temizNo].join('-');

        setFormData(prev => ({
            ...prev,
            irsaliyeNo: yeniIrsaliyeNo,
            evrakAdedi: hesaplaEvrakAdedi(yeniIrsaliyeNo, prev.odakEvrakNo)
        }));

        showNotice(
            'success',
            'İrsaliye eklendi',
            `${temizNo} başarıyla listeye eklendi.`
        );
    };

    const processScannerData = (rawValue) => {
        const cleaned = normalizeScannerText(rawValue);
        if (!cleaned) return;

        setScannerPreview(cleaned);

        const sfrValue = extractSfrValue(cleaned);

        if (sfrValue) {
            odakEvrakNoEkle(sfrValue);
            setScannerValue('');
            focusScanner();
            return;
        }

        const parsedNo = extractIrsaliyeNo(cleaned);

        if (!parsedNo) {
            showNotice(
                'error',
                'NO değeri bulunamadı',
                'Okunan veride geçerli bir NO alanı bulunamadı. Lütfen tekrar deneyin ya da elle yazın.'
            );
            setScannerValue('');
            focusScanner();
            return;
        }

        if (parsedNo.length !== REQUIRED_IRSALIYE_LENGTH) {
            showNotice(
                'error',
                'Karakter sayısı eksik veya fazla',
                `Okunan değer ${parsedNo.length} karakter: ${parsedNo}. Lütfen tekrar deneyin ya da elle yazın.`
            );
            setScannerValue('');
            focusScanner();
            return;
        }

        irsaliyeNoEkle(parsedNo);
        setScannerValue('');
        focusScanner();
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
                showNotice('error', 'Veri alınamadı', error.message || 'Liste verileri alınamadı');
                return;
            }

            if (!data) return;

            setKargoList([...new Set(data.map(i => i.kargo_firmasi).filter(Boolean))]);
            setGonderenList([...new Set(data.map(i => i.gonderen_firma).filter(Boolean))]);
            setIrsaliyeList([...new Set(data.map(i => i.irsaliye_adi).filter(Boolean))]);
        };

        fetchDistinctValues();

        setTimeout(() => {
            focusScanner();
        }, 200);

        scannerRefocusTimerRef.current = setInterval(() => {
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isTypingField =
                activeTag === 'input' ||
                activeTag === 'textarea' ||
                document.activeElement?.isContentEditable;

            if (!isTypingField || document.activeElement === scannerInputRef.current) {
                focusScanner();
            }
        }, 800);

        return () => {
            if (scannerProcessTimerRef.current) clearTimeout(scannerProcessTimerRef.current);
            if (scannerRefocusTimerRef.current) clearInterval(scannerRefocusTimerRef.current);
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const updatedForm = { ...prev, [name]: value };

            if (name !== 'evrakAdedi') {
                updatedForm.evrakAdedi = hesaplaEvrakAdedi(
                    updatedForm.irsaliyeNo,
                    updatedForm.odakEvrakNo
                );
            }

            return updatedForm;
        });
    };

    const handleScannerChange = (e) => {
        const value = e.target.value;
        setScannerValue(value);

        if (scannerProcessTimerRef.current) {
            clearTimeout(scannerProcessTimerRef.current);
        }

        scannerProcessTimerRef.current = setTimeout(() => {
            if (value.trim().length >= 3) {
                processScannerData(value);
            }
        }, 120);
    };

    const handleScannerKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();

            if (scannerProcessTimerRef.current) {
                clearTimeout(scannerProcessTimerRef.current);
            }

            processScannerData(scannerValue);
        }
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
            showNotice('error', 'Kayıt başarısız', error.message || 'Kayıt başarısız oldu.');
            setSaving(false);
            return;
        }

        showNotice('success', 'Kayıt tamamlandı', 'Kargo bilgisi başarıyla kaydedildi!');

        const today = new Date().toISOString().split('T')[0];

        setFormData({
            tarih: today,
            kargoFirmasi: '',
            gonderiNumarasi: '',
            gonderenFirma: '',
            irsaliyeAdi: '',
            irsaliyeNo: '',
            odakEvrakNo: '',
            evrakAdedi: 0
        });

        setScannerValue('');
        setScannerPreview('');
        setEkstraEvrakSoruAcik(false);
        setEkstraEvrakEklendi(false);
        setEkstraEvrakSayisi('');
        setSaving(false);

        setTimeout(() => {
            focusScanner();
        }, 100);
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
                    {list.map((item, idx) => (
                        <option key={idx} value={item} />
                    ))}
                </datalist>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="min-h-screen px-4 py-10 relative">
                <input
                    ref={scannerInputRef}
                    type="text"
                    value={scannerValue}
                    onChange={handleScannerChange}
                    onKeyDown={handleScannerKeyDown}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-hidden="true"
                    tabIndex={-1}
                    style={{
                        position: 'fixed',
                        left: '-9999px',
                        top: '0',
                        width: '1px',
                        height: '1px',
                        opacity: 0,
                        pointerEvents: 'none'
                    }}
                />

                <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/18 via-fuchsia-400/14 to-cyan-400/14 blur-3xl" />
                    <div className="absolute top-32 right-[-160px] h-[380px] w-[380px] rounded-full bg-gradient-to-br from-violet-500/12 to-indigo-400/10 blur-3xl" />
                    <div className="absolute bottom-[-180px] left-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 blur-3xl" />
                </div>

                <div className="flex justify-center items-center min-h-[calc(100vh-40px)]">
                    <div className="w-full max-w-2xl rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.10)] p-6 sm:p-8">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                    <span className="mr-2">📦</span>Kargo Bilgisi Ekle
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                    Scanner verisi otomatik yakalanır. SFR ile başlayan barkodlar Odak Evrak No alanına eklenir.
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
                            <div className="rounded-3xl border border-indigo-200/70 dark:border-indigo-800/40 bg-gradient-to-br from-indigo-50/90 via-white/70 to-fuchsia-50/70 dark:from-indigo-950/30 dark:via-white/5 dark:to-fuchsia-950/20 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold tracking-wider uppercase text-indigo-700 dark:text-indigo-300">
                                            Scanner Durumu
                                        </label>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                            SFR ile başlayan kodlar Odak Evrak No alanına, diğer uygun NO değerleri İrsaliye No alanına gider.
                                        </p>
                                    </div>

                                    <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-white/10 border border-indigo-200/70 dark:border-indigo-800/40 text-xs text-indigo-700 dark:text-indigo-300">
                                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Scanner Hazır
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-dashed border-indigo-300/60 dark:border-indigo-700/40 bg-white/70 dark:bg-slate-900/30 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 min-h-[56px] break-all">
                                    {scannerPreview || 'Okunan veri burada önizlenir...'}
                                </div>
                            </div>

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

                            {autocompleteInput('kargoFirmasi', 'Kargo Firması', kargoList)}

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

                            {autocompleteInput('gonderenFirma', 'Gönderen Firma', gonderenList)}
                            {autocompleteInput('irsaliyeAdi', 'İrsaliye Adı', irsaliyeList)}

                            <div>
                                <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                                    İrsaliye No
                                </label>
                                <textarea
                                    name="irsaliyeNo"
                                    rows="3"
                                    value={formData.irsaliyeNo}
                                    onChange={handleChange}
                                    placeholder="Örn: I20202600000779-MKC2026000008663"
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                                    Odak Evrak No (Opsiyonel)
                                </label>
                                <textarea
                                    name="odakEvrakNo"
                                    rows="3"
                                    value={formData.odakEvrakNo}
                                    onChange={handleChange}
                                    placeholder="Örn: SFR123456 - SFR654321"
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                />
                            </div>

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
                                        className={`mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-2xl text-white bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 shadow-md shadow-pink-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-500/30 transition ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {saving ? <><Spinner /> Kaydediliyor...</> : 'Kaydet'}
                                    </button>
                                </div>
                            )}

                            {!ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`w-full inline-flex items-center justify-center gap-2 h-11 rounded-2xl text-white bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 shadow-md shadow-pink-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-500/30 transition ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {saving ? <><Spinner /> Kaydediliyor...</> : 'Kaydet'}
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {notice && <NoticeModal notice={notice} onClose={closeNotice} />}
            </div>
        </Layout>
    );
}

const Spinner = () => (
    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
);

const NoticeModal = ({ notice, onClose }) => {
    const styleMap = {
        success: {
            ring: 'border-emerald-200 dark:border-emerald-800/50',
            bg: 'from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            icon: '✅',
            title: 'text-emerald-900 dark:text-emerald-100'
        },
        error: {
            ring: 'border-rose-200 dark:border-rose-800/50',
            bg: 'from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/30',
            iconBg: 'bg-rose-100 dark:bg-rose-900/40',
            icon: '⚠️',
            title: 'text-rose-900 dark:text-rose-100'
        },
        info: {
            ring: 'border-indigo-200 dark:border-indigo-800/50',
            bg: 'from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30',
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
            icon: 'ℹ️',
            title: 'text-indigo-900 dark:text-indigo-100'
        }
    };

    const current = styleMap[notice.type] || styleMap.info;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
            <div
                className={`w-full max-w-lg rounded-3xl border ${current.ring} bg-gradient-to-br ${current.bg} shadow-[0_20px_80px_rgba(0,0,0,0.30)] p-6 sm:p-7 animate-[modalIn_0.18s_ease-out]`}
            >
                <div className="flex items-start gap-4">
                    <div className={`shrink-0 h-14 w-14 rounded-2xl ${current.iconBg} flex items-center justify-center text-2xl`}>
                        {current.icon}
                    </div>

                    <div className="flex-1">
                        <h3 className={`text-xl sm:text-2xl font-semibold tracking-tight ${current.title}`}>
                            {notice.title}
                        </h3>
                        <p className="mt-2 text-sm sm:text-base text-gray-700 dark:text-gray-200 leading-relaxed">
                            {notice.message}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center h-11 px-5 rounded-2xl text-white bg-gradient-to-r from-slate-800 to-slate-900 hover:opacity-95 dark:from-slate-200 dark:to-white dark:text-slate-900 transition shadow-md"
                    >
                        Tamam
                    </button>
                </div>

                <style>{`
                    @keyframes modalIn {
                        from { opacity: 0; transform: scale(0.96) translateY(8px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default KargoBilgisiEkle;