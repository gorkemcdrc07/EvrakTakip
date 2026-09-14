import React, { useState, useEffect, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import { useNavigate } from 'react-router-dom';
import useDarkMode from './hooks/useDarkMode';
import { ArrowLeft, Barcode, Box, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, FileText, Hash, PackagePlus, RotateCcw, Save, ScanLine, Sparkles, Truck, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import { logAudit } from './services/operationsHub';

function KargoBilgisiEkle() {
    const navigate = useNavigate();
    useDarkMode();

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

    const irsaliyeSayisi = useMemo(() => {
        return formData.irsaliyeNo
            ? formData.irsaliyeNo.split('-').map(x => x.trim()).filter(Boolean).length
            : 0;
    }, [formData.irsaliyeNo]);

    const odakEvrakSayisi = useMemo(() => {
        return formData.odakEvrakNo
            ? formData.odakEvrakNo.split('-').map(x => x.trim()).filter(Boolean).length
            : 0;
    }, [formData.odakEvrakNo]);

    const requiredDone = useMemo(() => {
        const fields = [
            formData.tarih,
            formData.kargoFirmasi,
            formData.gonderiNumarasi,
            formData.gonderenFirma,
            formData.irsaliyeAdi
        ];
        return fields.filter(Boolean).length;
    }, [formData]);

    const resetForm = () => {
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
        setNotice(null);
        setTimeout(() => focusScanner(), 80);
    };

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

        await logAudit('Kargo kaydı ekledi', 'kargo_bilgileri', payload.gonderi_numarasi || '', null, payload, '/kargo-bilgisi-ekle');
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

    const autocompleteInput = (name, label, list, icon = null, hint = '') => (
        <div className="group">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">
                    {icon}
                    {label}
                </label>
                {hint && <span className="text-[9px] font-semibold text-slate-400">{hint}</span>}
            </div>
            <div className="relative">
                <input
                    type="text"
                    name={name}
                    list={`${name}-list`}
                    value={formData[name]}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-100 dark:focus:bg-[#101a29] dark:focus:ring-sky-500/10"
                    placeholder="Seç veya yaz..."
                />
                <ChevronRight size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 transition group-focus-within:opacity-100" />
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
            <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 transition-colors dark:bg-[#0b1220] dark:text-slate-100 sm:px-6">
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
                    style={{ position: 'fixed', left: '-9999px', top: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                />

                <div className="mx-auto w-full max-w-3xl">
                    {/* Compact header */}
                    <header className="relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm dark:border-white/[.08] dark:bg-[#111927]">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-500" />
                        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/anasayfa')}
                                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300"
                                    title="Ana sayfaya dön"
                                >
                                    <ArrowLeft size={17} />
                                </button>

                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-600 to-cyan-400 text-white shadow-md shadow-sky-500/15">
                                    <PackagePlus size={21} />
                                </div>

                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-[.13em] text-sky-600 dark:text-sky-300">
                                        Kargo Operasyon
                                    </div>
                                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                                        Kargo Bilgisi Ekle
                                    </h1>
                                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                                        Bilgileri sırayla girin. Barkod okutulduğunda ilgili alan otomatik doldurulur.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={resetForm}
                                className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300 sm:inline-flex"
                            >
                                <RotateCcw size={13} />
                                Sıfırla
                            </button>
                        </div>
                    </header>

                    {/* Scanner strip */}
                    <section className="mt-4 rounded-[18px] border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-500/20 dark:bg-sky-500/[.06]">
                        <div className="flex items-start gap-3">
                            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-600 text-white">
                                <ScanLine size={19} />
                                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-sky-50 bg-emerald-500 dark:border-[#111927]" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-xs font-black text-slate-800 dark:text-white">Scanner Hazır</div>
                                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[8px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                        AKTİF
                                    </span>
                                </div>
                                <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500 dark:text-slate-400">
                                    SFR ile başlayan kodlar Odak Evrak No alanına, diğer uygun NO değerleri İrsaliye No alanına eklenir.
                                </p>
                                <div className="mt-2 rounded-xl border border-dashed border-sky-300 bg-white/80 px-3 py-2 text-[10px] font-semibold text-slate-600 dark:border-sky-500/25 dark:bg-[#0d141f] dark:text-slate-300">
                                    <span className="mr-2 font-black text-sky-600 dark:text-sky-300">Son okunan:</span>
                                    {scannerPreview || 'Henüz barkod okutulmadı.'}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Single vertical form */}
                    <form onSubmit={handleSubmit} className="mt-4 rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#111927] sm:p-6">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-[.13em] text-sky-600 dark:text-sky-300">Kargo Kaydı</div>
                                <div className="mt-1 text-base font-black text-slate-900 dark:text-white">Bilgileri sırasıyla doldurun</div>
                            </div>
                            <div className="rounded-xl bg-slate-100 px-3 py-2 text-right dark:bg-white/[.05]">
                                <div className="text-[8px] font-black uppercase tracking-[.1em] text-slate-400">Toplam Evrak</div>
                                <div className="text-lg font-black text-slate-900 dark:text-white">{toplamEvrak}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Tarih */}
                            <div>
                                <label className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">
                                    <CalendarDays size={13} /> Tarih
                                </label>
                                <input
                                    type="date"
                                    name="tarih"
                                    value={formData.tarih}
                                    onChange={handleChange}
                                    required
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-100 dark:focus:ring-sky-500/10"
                                />
                            </div>

                            {autocompleteInput('kargoFirmasi', 'Kargo Firması', kargoList, <Truck size={13} />)}

                            {/* Gönderi no */}
                            <div>
                                <label className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">
                                    <Hash size={13} /> Gönderi Numarası
                                </label>
                                <input
                                    name="gonderiNumarasi"
                                    value={formData.gonderiNumarasi}
                                    onChange={handleChange}
                                    required
                                    placeholder="Örn: 123456789"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-100 dark:focus:ring-sky-500/10"
                                />
                            </div>

                            {autocompleteInput('gonderenFirma', 'Gönderen Firma', gonderenList, <Building2 size={13} />)}
                            {autocompleteInput('irsaliyeAdi', 'İrsaliye Adı', irsaliyeList, <FileText size={13} />)}

                            {/* İrsaliye */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">
                                        <Barcode size={13} /> İrsaliye No
                                    </label>
                                    <span className="rounded-md bg-sky-50 px-2 py-1 text-[8px] font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{irsaliyeSayisi} kayıt</span>
                                </div>
                                <textarea
                                    name="irsaliyeNo"
                                    rows="3"
                                    value={formData.irsaliyeNo}
                                    onChange={handleChange}
                                    placeholder="Örn: I20202600000779-MKC2026000008663"
                                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-bold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-100 dark:focus:ring-sky-500/10"
                                />
                                <div className="mt-1 text-[9px] font-semibold text-slate-400">Barkod okutulduğunda otomatik eklenir.</div>
                            </div>

                            {/* Odak */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">
                                        <ScanLine size={13} /> Odak Evrak No
                                    </label>
                                    <span className="rounded-md bg-cyan-50 px-2 py-1 text-[8px] font-black text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">{odakEvrakSayisi} SFR</span>
                                </div>
                                <textarea
                                    name="odakEvrakNo"
                                    rows="3"
                                    value={formData.odakEvrakNo}
                                    onChange={handleChange}
                                    placeholder="Örn: SFR123456 - SFR654321"
                                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-bold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-100 dark:focus:ring-cyan-500/10"
                                />
                                <div className="mt-1 text-[9px] font-semibold text-slate-400">Opsiyonel — SFR barkodu okutulduğunda otomatik eklenir.</div>
                            </div>

                            {/* Evrak adedi */}
                            <div>
                                <label className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">
                                    <FileText size={13} /> Evrak Adedi
                                </label>
                                <input
                                    type="number"
                                    name="evrakAdedi"
                                    value={formData.evrakAdedi}
                                    onChange={handleChange}
                                    required
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-100 dark:focus:ring-sky-500/10"
                                />
                                <div className="mt-1 text-[9px] font-semibold text-slate-400">İrsaliye ve Odak Evrak sayısına göre otomatik hesaplanır.</div>
                            </div>

                            {/* Extra document question */}
                            {ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[.07]">
                                    <div className="flex items-start gap-3">
                                        <CircleAlert size={17} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                                        <div>
                                            <div className="text-sm font-black text-amber-900 dark:text-amber-100">Ekstra evrak var mı?</div>
                                            <div className="mt-1 text-[10px] font-semibold leading-4 text-amber-700/80 dark:text-amber-200/70">
                                                Okutulmamış ek evrak varsa sayısını girebilirsiniz.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                            type="submit"
                                            className="h-10 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-200"
                                        >
                                            Hayır, Kaydet
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEkstraEvrakEklendi(true)}
                                            className="h-10 rounded-xl bg-amber-500 text-xs font-black text-white"
                                        >
                                            Evet
                                        </button>
                                    </div>
                                </div>
                            )}

                            {ekstraEvrakEklendi && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[.06]">
                                    <label className="text-[10px] font-black uppercase tracking-[.1em] text-emerald-700 dark:text-emerald-300">
                                        Ekstra Evrak Sayısı
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={ekstraEvrakSayisi}
                                        onChange={(e) => setEkstraEvrakSayisi(e.target.value)}
                                        required
                                        className="mt-2 h-11 w-full rounded-xl border border-emerald-200 bg-white px-3.5 text-sm font-black text-slate-800 outline-none dark:border-emerald-500/20 dark:bg-[#0d141f] dark:text-white"
                                    />
                                    <div className="mt-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                        Yeni toplam evrak: <span className="text-base font-black">{toplamEvrak}</span>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-xs font-black text-white shadow-md shadow-emerald-500/15 disabled:opacity-60"
                                    >
                                        {saving ? <><Spinner /> Kaydediliyor...</> : <><Save size={15} /> Kaydet</>}
                                    </button>
                                </div>
                            )}

                            {!ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-sm font-black text-white shadow-md shadow-sky-500/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? <><Spinner /> Kaydediliyor...</> : <><Save size={16} /> Kaydet</>}
                                </button>
                            )}
                        </div>
                    </form>

                    <button
                        type="button"
                        onClick={resetForm}
                        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-500 dark:border-white/10 dark:bg-[#111927] dark:text-slate-300 sm:hidden"
                    >
                        <RotateCcw size={13} /> Formu Sıfırla
                    </button>
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
            icon: CheckCircle2,
            title: 'text-emerald-900 dark:text-emerald-100',
            iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
            ring: 'border-emerald-200 dark:border-emerald-500/20',
            glow: 'from-emerald-500/10 via-transparent to-teal-400/10',
            badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
            badgeText: 'Okuma başarılı'
        },
        error: {
            icon: CircleAlert,
            title: 'text-rose-900 dark:text-rose-100',
            iconWrap: 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
            ring: 'border-rose-200 dark:border-rose-500/20',
            glow: 'from-rose-500/10 via-transparent to-orange-400/10',
            badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
            badgeText: 'Kontrol gerekli'
        },
        info: {
            icon: Barcode,
            title: 'text-sky-900 dark:text-sky-100',
            iconWrap: 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
            ring: 'border-sky-200 dark:border-sky-500/20',
            glow: 'from-sky-500/10 via-transparent to-cyan-400/10',
            badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
            badgeText: 'Scanner bilgisi'
        }
    };

    const current = styleMap[notice.type] || styleMap.info;
    const Icon = current.icon;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[4px]">
            <div className={`relative w-full max-w-md overflow-hidden rounded-[24px] animate-[modalIn_.18s_ease-out] border ${current.ring} bg-white shadow-[0_28px_90px_rgba(2,6,23,.34)] dark:bg-[#111927]`}>
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${current.glow}`} />
                <div className="relative p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${current.iconWrap}`}>
                                <Icon size={22} />
                                {notice.type === 'success' && (
                                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#111927]" />
                                )}
                            </div>
                            <div>
                                <span className={`inline-flex rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] ${current.badge}`}>
                                    {current.badgeText}
                                </span>
                                <h3 className={`mt-2 text-lg font-black tracking-tight ${current.title}`}>
                                    {notice.title}
                                </h3>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-400"
                            title="Kapat"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[.07] dark:bg-[#0d141f]">
                        <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                            {notice.message}
                        </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <ScanLine size={13} className="text-cyan-500" />
                            Scanner otomatik devam eder
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 rounded-xl bg-slate-950 px-4 text-xs font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                        >
                            Tamam
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes modalIn {
                        from { opacity: 0; transform: scale(.97) translateY(8px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default KargoBilgisiEkle;