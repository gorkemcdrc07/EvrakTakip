// EvrakEkle.jsx (Güncel Tam Kod - UI iyileştirme + Anasayfaya Dön butonu)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import { useNavigate } from 'react-router-dom';
import {
    FiClipboard,
    FiCalendar,
    FiMapPin,
    FiLayers,
    FiPlus,
    FiTrash2,
    FiHash,
    FiType,
    FiSave,
    FiCheckCircle,
    FiAlertTriangle,
    FiZap,
    FiHome,
} from 'react-icons/fi';

/* === Konfeti (Saçılarak sağ & sol) === */
function KonfetiSideBurst({ run = false }) {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'];

    const pieces = useMemo(() => {
        if (!run) return [];
        const N = 160;
        const arr = [];
        for (let i = 0; i < N; i++) {
            const fromLeft = i % 2 === 0;
            arr.push({
                id: i,
                side: fromLeft ? 'L' : 'R',
                top: Math.floor(Math.random() * 80) + 5,
                dx: Math.floor(Math.random() * 35) + 30,
                dy: Math.floor(Math.random() * 45) + 25,
                amp: Math.floor(Math.random() * 14) + 6,
                w: Math.floor(Math.random() * 7) + 6,
                h: Math.floor(Math.random() * 12) + 8,
                bg: colors[Math.floor(Math.random() * colors.length)],
                delay: (Math.random() * 0.35).toFixed(2),
                duration: (Math.random() * 1.6 + 1.8).toFixed(2),
                round: Math.random() > 0.5,
                spin: (Math.random() * 1.2 + 0.8).toFixed(2),
            });
        }
        return arr;
    }, [run]);

    if (!run) return null;

    return (
        <>
            <div className="confetti-layer">
                {pieces.map((p) => (
                    <span
                        key={p.id}
                        className={`confetti-wrap ${p.side === 'L' ? 'from-left' : 'from-right'}`}
                        style={{
                            top: `${p.top}vh`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            ['--dx']: `${p.dx}vw`,
                            ['--dy']: `${p.dy}vh`,
                        }}
                    >
                        <i className="confetti-rot" style={{ animationDuration: `${(p.duration / p.spin).toFixed(2)}s` }}>
                            <i
                                className="confetti-piece"
                                style={{
                                    width: `${p.w}px`,
                                    height: `${p.h}px`,
                                    background: p.bg,
                                    borderRadius: p.round ? '50%' : '3px',
                                    animationDuration: `${(p.duration * 0.9).toFixed(2)}s`,
                                    ['--amp']: `${p.amp}px`,
                                }}
                            />
                        </i>
                    </span>
                ))}
            </div>

            <style>{`
        .confetti-layer{ position: fixed; inset: 0; pointer-events: none; z-index: 70; overflow: hidden; }
        .confetti-wrap{ position: absolute; will-change: transform, opacity; opacity: 1; animation-timing-function: linear; animation-fill-mode: forwards; }
        .confetti-wrap.from-left{ left: -18px; animation-name: confetti-move-left; }
        .confetti-wrap.from-right{ right: -18px; animation-name: confetti-move-right; }
        .confetti-rot{ display: inline-block; will-change: transform; animation: confetti-spin linear infinite; }
        .confetti-piece{ display: inline-block; will-change: transform; animation-name: confetti-sway; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        @keyframes confetti-move-left{ 0%{transform:translate3d(0,0,0);opacity:1;} 85%{opacity:1;} 100%{transform:translate3d(var(--dx), var(--dy), 0);opacity:0;} }
        @keyframes confetti-move-right{ 0%{transform:translate3d(0,0,0);opacity:1;} 85%{opacity:1;} 100%{transform:translate3d(calc(var(--dx) * -1), var(--dy), 0);opacity:0;} }
        @keyframes confetti-sway{ 0%{transform:translateX(0);} 25%{transform:translateX(var(--amp));} 50%{transform:translateX(calc(var(--amp) * -1));} 75%{transform:translateX(var(--amp));} 100%{transform:translateX(0);} }
        @keyframes confetti-spin{ 0%{transform:rotate(0deg);} 100%{transform:rotate(720deg);} }
      `}</style>
        </>
    );
}

/* ---------- UI küçük parçalar ---------- */
function Pill({ children, tone = 'neutral', title }) {
    const tones = {
        neutral: 'bg-white/10 text-white ring-1 ring-white/15',
        ok: 'bg-emerald-400/15 text-emerald-50 ring-1 ring-emerald-300/20',
        warn: 'bg-amber-400/15 text-amber-50 ring-1 ring-amber-300/20',
        info: 'bg-sky-400/15 text-sky-50 ring-1 ring-sky-300/20',
    };
    return (
        <span title={title} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
            {children}
        </span>
    );
}

function SectionCard({ icon: Icon, title, subtitle, children, right }) {
    return (
        <section className="rounded-3xl border border-gray-200/70 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/55">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200/60 px-5 py-4 dark:border-gray-700/60">
                <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900">
                        <Icon />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
                        {subtitle && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
                    </div>
                </div>
                {right}
            </div>
            <div className="px-5 py-5">{children}</div>
        </section>
    );
}

function Skeleton({ className = '' }) {
    return <div className={`animate-pulse rounded-2xl bg-gray-200/70 dark:bg-gray-700/40 ${className}`} />;
}

function Toast({ show, type = 'success', message }) {
    if (!show) return null;
    const styles =
        type === 'success'
            ? 'bg-emerald-600 text-white'
            : type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-gray-900 text-white';

    return (
        <div className="fixed right-5 top-5 z-[90]">
            <div className={`rounded-2xl px-4 py-3 shadow-2xl ${styles} animate-toast-in`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                    {type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
                    <span>{message}</span>
                </div>
            </div>
            <style>{`
        @keyframes toast-in { 0%{transform:translateY(-10px);opacity:0;} 100%{transform:translateY(0);opacity:1;} }
        .animate-toast-in{ animation: toast-in .22s ease-out; }
      `}</style>
        </div>
    );
}

export default function EvrakEkle() {
    const navigate = useNavigate();

    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [projeler, setProjeler] = useState([]);

    const [mesaj, setMesaj] = useState('');
    const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const DRAFT_KEY = 'evrakekle_draft_v1';
    const toastTimer = useRef(null);

    const emptyForm = useMemo(
        () => ({
            tarih: '',
            lokasyonid: '',
            projeler: [{ projeid: '', sefersayisi: '' }],
            seferler: [{ seferno: '', aciklama: '' }],
        }),
        []
    );

    const [form, setForm] = useState(emptyForm);

    /* 🔒 Kaydedilmemiş değişiklik takibi */
    const [initialSnapshot, setInitialSnapshot] = useState(() => JSON.stringify(emptyForm));
    const isDirty = useMemo(() => {
        try {
            return JSON.stringify(form) !== initialSnapshot;
        } catch {
            return !!(form.tarih || form.lokasyonid || form.projeler?.length > 1 || form.seferler?.length > 1);
        }
    }, [form, initialSnapshot]);

    const toplamSeferSayisi = useMemo(
        () => form.projeler.reduce((sum, p) => sum + Number(p.sefersayisi || 0), 0),
        [form.projeler]
    );

    // ✅ Sefer No mükerrer kontrolü (normalize: trim + boşluk tekle + uppercase)
    const normalizeSeferNo = (v) =>
        String(v || '')
            .trim()
            .replace(/\s+/g, ' ')
            .toUpperCase();

    const seferNoCounts = useMemo(() => {
        const m = new Map();
        for (const s of form.seferler) {
            const key = normalizeSeferNo(s.seferno);
            if (!key) continue;
            m.set(key, (m.get(key) || 0) + 1);
        }
        return m;
    }, [form.seferler]);

    const duplicateSeferNos = useMemo(() => {
        return Array.from(seferNoCounts.entries())
            .filter(([, c]) => c > 1)
            .map(([k, c]) => ({ seferno: k, count: c }));
    }, [seferNoCounts]);

    const hasDuplicateSeferNo = duplicateSeferNos.length > 0;

    const duplicateRowIndexes = useMemo(() => {
        const dset = new Set(duplicateSeferNos.map((d) => d.seferno));
        const idxs = new Set();
        form.seferler.forEach((s, i) => {
            const key = normalizeSeferNo(s.seferno);
            if (key && dset.has(key)) idxs.add(i);
        });
        return idxs; // Set<number>
    }, [form.seferler, duplicateSeferNos]);

    const validBasics = !!form.tarih && !!form.lokasyonid;
    const validProjects = form.projeler.some((p) => p.projeid && String(p.sefersayisi || '').length);
    const canSubmit = validBasics && validProjects && isDirty && !saving && !hasDuplicateSeferNo;

    const step = useMemo(() => {
        if (!validBasics) return 1;
        if (!validProjects) return 2;
        if (hasDuplicateSeferNo) return 3; // “Hazır” ama bloklu
        return 3;
    }, [validBasics, validProjects, hasDuplicateSeferNo]);

    useEffect(() => {
        document.title = 'Evrak Ekle';
        verileriYukle();
        // taslak geri yükle
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.tarih !== undefined) {
                    setForm(parsed);
                }
            }
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // beforeunload
    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = '';
        };
        if (isDirty) window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    // anchor click
    useEffect(() => {
        const onAnchorClick = (e) => {
            if (!isDirty) return;
            const a = e.target.closest('a');
            if (!a) return;
            if (a.origin === window.location.origin && a.target !== '_blank') {
                const ok = window.confirm('Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?');
                if (!ok) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };
        if (isDirty) document.addEventListener('click', onAnchorClick, true);
        return () => document.removeEventListener('click', onAnchorClick, true);
    }, [isDirty]);

    // Ctrl/⌘ + S kaydet
    useEffect(() => {
        const onKey = (e) => {
            const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
            if (!isSave) return;
            e.preventDefault();
            if (canSubmit) document.getElementById('evrak-submit-btn')?.click();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [canSubmit]);

    // taslak autosave (dirty oldukça)
    useEffect(() => {
        if (!isDirty) return;
        const t = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
            } catch { }
        }, 450);
        return () => clearTimeout(t);
    }, [form, isDirty]);

    const showToast = (type, message) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ show: true, type, message });
        toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
    };

    const verileriYukle = async () => {
        try {
            setLoading(true);
            const [{ data: lokasyonData }, { data: projeData }] = await Promise.all([
                supabase.from('lokasyonlar').select('*').order('lokasyon'),
                supabase.from('projeler').select('*').order('proje'),
            ]);
            setLokasyonlar(lokasyonData || []);
            setProjeler(projeData || []);
        } finally {
            setLoading(false);
        }
    };

    const goHome = () => {
        if (isDirty) {
            const ok = window.confirm('Kaydedilmemiş değişiklikler var. Yine de anasayfaya dönülsün mü?');
            if (!ok) return;
        }
        navigate('/Anasayfa');
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleProjeChange = (index, field, value) => {
        const updated = [...form.projeler];
        updated[index][field] = value;
        setForm({ ...form, projeler: updated });
    };
    const handleProjeEkle = () =>
        setForm({
            ...form,
            projeler: [{ projeid: '', sefersayisi: '' }, ...form.projeler],
        });

    const handleSeferChange = (index, field, value) => {
        const updated = [...form.seferler];
        updated[index][field] = value;
        setForm({ ...form, seferler: updated });
    };
    const handleSeferEkle = () =>
        setForm({
            ...form,
            seferler: [{ seferno: '', aciklama: '' }, ...form.seferler],
        });

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

            const [t, l, projeAd, seferSayisiRaw, , seferno, aciklama] = cells.map((c) => c.trim());
            const seferSayisi = parseInt(seferSayisiRaw) || 0;

            if (i === 0) {
                tarih = formatDate(t);
                lokasyon = l;
            }

            const proje = projeler.find((p) => p.proje === projeAd);
            if (proje) parsedProjeler.push({ projeid: proje.id, sefersayisi: seferSayisi });

            if (seferno && aciklama) parsedSeferler.push({ seferno, aciklama });
        }

        const lok = lokasyonlar.find((ll) => ll.lokasyon === lokasyon);
        if (!tarih || !lok) {
            showToast('error', 'Yapıştırılan veride tarih/lokasyon eşleşmedi.');
            return;
        }

        setForm({
            tarih,
            lokasyonid: lok.id,
            projeler: parsedProjeler.length ? parsedProjeler : [{ projeid: '', sefersayisi: '' }],
            seferler: parsedSeferler.length ? parsedSeferler : [{ seferno: '', aciklama: '' }],
        });

        showToast('success', 'Excel verisi alındı.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (hasDuplicateSeferNo) {
            setMesaj('❌ Mükerrer Sefer No var. Lütfen düzeltin.');
            showToast('error', 'Mükerrer Sefer No var. Lütfen düzeltin.');
            return;
        }

        if (!canSubmit) {
            showToast('error', 'Zorunlu alanları tamamlayın.');
            return;
        }

        try {
            setSaving(true);

            const { error: evrakError } = await supabase.from('evraklar').insert([
                {
                    tarih: form.tarih,
                    lokasyonid: parseInt(form.lokasyonid, 10),
                    sefersayisi: toplamSeferSayisi,
                },
            ]);

            if (evrakError) {
                setMesaj('❌ Evrak eklenemedi.');
                showToast('error', 'Evrak eklenemedi.');
                return;
            }

            const { data: yeniEvrak } = await supabase.from('evraklar').select('id').order('id', { ascending: false }).limit(1);
            const evrakId = yeniEvrak?.[0]?.id;

            const projeSeferKayitlari = form.projeler.map((p) => ({
                evrakid: evrakId,
                projeid: parseInt(p.projeid),
                sefersayisi: parseInt(p.sefersayisi),
            }));

            const seferKayitlari = form.seferler.map((s) => ({
                evrakid: evrakId,
                seferno: s.seferno,
                aciklama: s.aciklama,
            }));

            const { error: seferError1 } = await supabase.from('evrakseferler').insert(seferKayitlari);
            const { error: seferError2 } = await supabase.from('evrakproje').insert(projeSeferKayitlari);

            if (seferError1 || seferError2) {
                setMesaj('❌ Sefer veya proje kayıtları eklenemedi.');
                showToast('error', 'Sefer/Proje kayıtları eklenemedi.');
            } else {
                setMesaj('✅ Başarıyla eklendi.');
                showToast('success', 'Kaydedildi.');

                const cleared = emptyForm;
                setForm(cleared);
                setInitialSnapshot(JSON.stringify(cleared));
                try {
                    localStorage.removeItem(DRAFT_KEY);
                } catch { }

                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2200);
            }

            setTimeout(() => setMesaj(''), 2500);
        } finally {
            setSaving(false);
        }
    };

    const clearAll = () => {
        const ok = !isDirty || window.confirm('Form temizlensin mi?');
        if (!ok) return;
        setForm(emptyForm);
        setInitialSnapshot(JSON.stringify(emptyForm));
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch { }
        showToast('success', 'Form temizlendi.');
    };

    return (
        <Layout>
            <Toast show={toast.show} type={toast.type} message={toast.message} />

            {/* arkaplan glow */}
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400/25 via-violet-400/20 to-fuchsia-400/25 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/10 blur-3xl" />
            </div>

            <div className="mx-auto max-w-6xl px-4 py-8">
                {/* HERO / Header */}
                <div className="mb-6 overflow-hidden rounded-[28px] border border-gray-200/70 bg-white/60 shadow-sm backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/50">
                    <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 px-6 py-5 text-white dark:from-black dark:via-gray-950 dark:to-black">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                                    <FiZap /> Hızlı Giriş • Excel Yapıştır
                                </div>
                                <h2 className="mt-3 text-2xl font-bold tracking-tight">📄 Evrak Ekle</h2>
                                <p className="mt-1 text-sm text-white/70">
                                    Adım {step}/3 — {step === 1 ? 'Temel Bilgiler' : step === 2 ? 'Projeler' : hasDuplicateSeferNo ? 'Mükerrer Kontrol' : 'Hazır'}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {/* ✅ Anasayfaya dön butonu */}
                                <button
                                    type="button"
                                    onClick={goHome}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/15 hover:bg-white/15 active:scale-[0.98] transition"
                                    title="Anasayfaya dön"
                                >
                                    <FiHome />
                                    Anasayfaya Dön
                                </button>

                                <Pill tone="info" title="Projelerden otomatik hesaplanır">
                                    Toplam Sefer: <b className="ml-1">{toplamSeferSayisi}</b>
                                </Pill>
                                <Pill tone={isDirty ? 'warn' : 'ok'} title={isDirty ? 'Kaydedilmemiş değişiklik var' : 'Her şey güncel'}>
                                    {isDirty ? 'Kaydedilmemiş' : 'Güncel'}
                                </Pill>
                                <Pill tone="neutral" title="Kısayol">
                                    Ctrl/⌘+S
                                </Pill>
                            </div>
                        </div>

                        {/* progress bar */}
                        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400 transition-all"
                                style={{ width: `${step === 1 ? 33 : step === 2 ? 66 : 100}%` }}
                            />
                        </div>
                    </div>

                    {mesaj && (
                        <div
                            className={`px-6 py-4 text-sm font-semibold ${mesaj.includes('✅')
                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200'
                                    : 'bg-rose-50 text-rose-800 dark:bg-rose-900/25 dark:text-rose-200'
                                }`}
                        >
                            {mesaj}
                        </div>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    {/* MAIN */}
                    <div className="space-y-6">
                        {/* Excel Paste */}
                        <SectionCard
                            icon={FiClipboard}
                            title="Excel’den Yapıştır"
                            subtitle="Ctrl+V ile yapıştır. Tarih & lokasyon ilk satırdan alınır."
                            right={
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-200">
                                    Opsiyonel
                                </span>
                            }
                        >
                            <div className="group relative">
                                <textarea
                                    placeholder="Excel'den verileri buraya yapıştır (Ctrl+V)"
                                    onPaste={handlePaste}
                                    className="w-full min-h-[140px] rounded-3xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm outline-none transition
                             focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100
                             dark:border-gray-700 dark:bg-gray-950/60 dark:text-white dark:focus:bg-gray-950 dark:focus:ring-indigo-900/40"
                                />
                                <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-transparent group-focus-within:ring-indigo-400/25" />
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <div className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-950/50 dark:text-gray-300">
                                    Proje adı eşleşmezse satır atlanır.
                                </div>
                                <div className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-950/50 dark:text-gray-300">
                                    Sefer detayı yoksa boş bırakılabilir.
                                </div>
                            </div>
                        </SectionCard>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Temel Bilgiler */}
                            <SectionCard
                                icon={FiCalendar}
                                title="Temel Bilgiler"
                                subtitle="Zorunlu alanlar"
                                right={
                                    !validBasics ? (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
                                            <FiAlertTriangle /> Eksik
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200">
                                            <FiCheckCircle /> Tamam
                                        </span>
                                    )
                                }
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            <FiCalendar /> TARİH
                                        </label>
                                        <input
                                            type="date"
                                            name="tarih"
                                            value={form.tarih}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition
                                 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
                                 dark:border-gray-700 dark:bg-gray-950/50 dark:text-white dark:focus:ring-indigo-900/40"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            <FiMapPin /> LOKASYON
                                        </label>

                                        {loading ? (
                                            <Skeleton className="h-[46px]" />
                                        ) : (
                                            <select
                                                name="lokasyonid"
                                                value={form.lokasyonid}
                                                onChange={handleChange}
                                                required
                                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition
                                   focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
                                   dark:border-gray-700 dark:bg-gray-950/50 dark:text-white dark:focus:ring-indigo-900/40"
                                            >
                                                <option value="">Seçiniz</option>
                                                {lokasyonlar.map((l) => (
                                                    <option key={l.id} value={l.id}>
                                                        {l.lokasyon}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Projeler */}
                            <SectionCard
                                icon={FiLayers}
                                title="Projeler & Sefer Sayıları"
                                subtitle="En az 1 proje + sefer sayısı girilmeli"
                                right={
                                    <button
                                        type="button"
                                        onClick={handleProjeEkle}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                                    >
                                        <FiPlus /> Proje Ekle
                                    </button>
                                }
                            >
                                <div className="space-y-3">
                                    {form.projeler.map((p, i) => (
                                        <div key={i} className="rounded-3xl border border-gray-200/70 bg-white p-3 shadow-sm dark:border-gray-700/60 dark:bg-gray-950/35">
                                            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-center">
                                                {loading ? (
                                                    <Skeleton className="h-[46px]" />
                                                ) : (
                                                    <select
                                                        value={p.projeid}
                                                        onChange={(e) => handleProjeChange(i, 'projeid', e.target.value)}
                                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition
                                       focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
                                       dark:border-gray-700 dark:bg-gray-950/50 dark:text-white dark:focus:ring-indigo-900/40"
                                                    >
                                                        <option value="">Proje Seçiniz</option>
                                                        {projeler.map((pr) => (
                                                            <option key={pr.id} value={pr.id}>
                                                                {pr.proje}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}

                                                <input
                                                    type="number"
                                                    placeholder="Sefer Sayısı"
                                                    value={p.sefersayisi}
                                                    onChange={(e) => handleProjeChange(i, 'sefersayisi', e.target.value)}
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition
                                     focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
                                     dark:border-gray-700 dark:bg-gray-950/50 dark:text-white dark:focus:ring-indigo-900/40"
                                                />

                                                <div className="flex items-center justify-end">
                                                    {form.projeler.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = form.projeler.filter((_, idx) => idx !== i);
                                                                setForm({ ...form, projeler: updated });
                                                            }}
                                                            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-semibold text-white hover:bg-rose-700"
                                                            title="Satırı Sil"
                                                        >
                                                            <FiTrash2 /> Sil
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {!validProjects && (
                                    <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
                                        En az 1 proje seçip sefer sayısı girin.
                                    </div>
                                )}
                            </SectionCard>

                            {/* Sefer Detayları */}
                            <SectionCard
                                icon={FiHash}
                                title="Sefer Detayları"
                                subtitle="Opsiyonel — ama Sefer No giriyorsan mükerrer olmasın"
                                right={
                                    <button
                                        type="button"
                                        onClick={handleSeferEkle}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                                    >
                                        <FiPlus /> Sefer Ekle
                                    </button>
                                }
                            >
                                {/* ✅ Mükerrer uyarı paneli */}
                                {hasDuplicateSeferNo && (
                                    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                                        <div className="flex items-center gap-2 font-semibold">
                                            <FiAlertTriangle />
                                            Mükerrer Sefer No tespit edildi:
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {duplicateSeferNos.map((d) => (
                                                <span
                                                    key={d.seferno}
                                                    className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
                                                >
                                                    {d.seferno} <span className="ml-2 opacity-80">({d.count}x)</span>
                                                </span>
                                            ))}
                                        </div>

                                        <div className="mt-2 text-xs opacity-80">Karşılaştırma: boşluk/harf duyarsız (örn. “ab 12” = “AB 12”).</div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {form.seferler.map((s, i) => {
                                        const isDupRow = duplicateRowIndexes.has(i);
                                        return (
                                            <div key={i} className="rounded-3xl border border-gray-200/70 bg-white p-3 shadow-sm dark:border-gray-700/60 dark:bg-gray-950/35">
                                                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                                    <div>
                                                        <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                            <FiHash /> Sefer No
                                                        </label>
                                                        <input
                                                            placeholder="Sefer No"
                                                            value={s.seferno}
                                                            onChange={(e) => handleSeferChange(i, 'seferno', e.target.value)}
                                                            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-4 dark:text-white
                                ${isDupRow
                                                                    ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-700 dark:bg-rose-900/20 dark:focus:ring-rose-900/30'
                                                                    : 'border-gray-200 bg-white focus:border-indigo-400 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950/50 dark:focus:ring-indigo-900/40'
                                                                }`}
                                                        />
                                                        {isDupRow && <div className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-300">Bu Sefer No başka satırda da var.</div>}
                                                    </div>

                                                    <div>
                                                        <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                            <FiType /> Açıklama
                                                        </label>
                                                        <select
                                                            value={s.aciklama}
                                                            onChange={(e) => handleSeferChange(i, 'aciklama', e.target.value)}
                                                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition
                                         focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
                                         dark:border-gray-700 dark:bg-gray-950/50 dark:text-white dark:focus:ring-indigo-900/40"
                                                        >
                                                            <option value="">Açıklama Seçiniz</option>
                                                            <option value="TARAFIMIZCA DÜZELTİLMİŞTİR">TARAFIMIZCA DÜZELTİLMİŞTİR</option>
                                                            <option value="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR">TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR</option>
                                                            <option value="EKSİK TARAMA">EKSİK TARAMA</option>
                                                            <option value="HASARLI TARAMA">HASARLI TARAMA</option>
                                                            <option value="GÖRÜNTÜ TARAMA">GÖRÜNTÜ TARAMA</option>
                                                            <option value="MAİL ATILDI DÖNÜŞ BEKLENİYOR">MAİL ATILDI DÖNÜŞ BEKLENİYOR</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center justify-end">
                                                        {form.seferler.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = form.seferler.filter((_, idx) => idx !== i);
                                                                    setForm({ ...form, seferler: updated });
                                                                }}
                                                                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-semibold text-white hover:bg-rose-700"
                                                                title="Satırı Sil"
                                                            >
                                                                <FiTrash2 /> Sil
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SectionCard>

                            {/* Sticky footer actions */}
                            <div className="sticky bottom-0 z-10">
                                <div className="rounded-[28px] border border-gray-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/55">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            {saving ? 'Kaydediliyor…' : isDirty ? 'Değişiklikler kaydedilmedi.' : 'Her şey güncel.'}
                                            {hasDuplicateSeferNo && (
                                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-900/25 dark:text-rose-200">
                                                    <FiAlertTriangle /> Mükerrer Sefer No
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={clearAll}
                                                disabled={saving}
                                                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60
                                   dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-100 dark:hover:bg-gray-950/70"
                                            >
                                                Temizle
                                            </button>

                                            <button
                                                id="evrak-submit-btn"
                                                type="submit"
                                                disabled={!canSubmit}
                                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm
                                   hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {saving ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                        Kaydediliyor…
                                                    </span>
                                                ) : (
                                                    <>
                                                        <FiSave />
                                                        Kaydet
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {!canSubmit && (
                                        <div className="mt-3 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${validBasics ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                Tarih ve lokasyon seçili olmalı
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${validProjects ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                En az 1 proje + sefer sayısı girilmeli
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${!hasDuplicateSeferNo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                Mükerrer Sefer No olmamalı
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* SIDE SUMMARY (desktop) */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-6 space-y-4">
                            <div className="rounded-3xl border border-gray-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/55">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Özet</div>
                                <div className="mt-3 space-y-3 text-sm">
                                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-950/45">
                                        <span className="text-gray-600 dark:text-gray-300">Adım</span>
                                        <b className="text-gray-900 dark:text-white">
                                            {step}/3
                                        </b>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-950/45">
                                        <span className="text-gray-600 dark:text-gray-300">Toplam Sefer</span>
                                        <b className="text-gray-900 dark:text-white">{toplamSeferSayisi}</b>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-950/45">
                                        <span className="text-gray-600 dark:text-gray-300">Durum</span>
                                        <b className={`${isDirty ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                                            {isDirty ? 'Kaydedilmemiş' : 'Güncel'}
                                        </b>
                                    </div>

                                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-950/45">
                                        <span className="text-gray-600 dark:text-gray-300">Mükerrer</span>
                                        <b className={`${hasDuplicateSeferNo ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                                            {hasDuplicateSeferNo ? 'Var' : 'Yok'}
                                        </b>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl bg-gradient-to-r from-indigo-600/10 via-violet-600/10 to-fuchsia-600/10 p-4 text-xs text-gray-600 dark:text-gray-300">
                                    İpucu: Excel yapıştırdıktan sonra sadece eksikleri düzenleyip <b>Ctrl/⌘+S</b> ile kaydedebilirsin.
                                </div>
                            </div>

                            <div className="rounded-3xl border border-gray-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/55">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Taslak</div>
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Değişiklikler otomatik taslak olarak saklanır. Kaydet sonrası temizlenir.</div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* ✅ Saçılan konfeti */}
            <KonfetiSideBurst run={showSuccess} />

            {/* ✅ Orta başarı kartı */}
            {showSuccess && (
                <div className="fixed inset-0 z-[80] grid place-items-center">
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="relative z-[81] animate-pop-in rounded-3xl border border-white/10 bg-white/90 px-8 py-7 text-center shadow-2xl backdrop-blur-xl dark:bg-gray-900/80">
                        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                            <FiCheckCircle className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Kaydedildi</h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Kayıt başarıyla tamamlandı.</p>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes pop-in {
          0% { transform: scale(.92); opacity: 0; }
          60% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in { animation: pop-in .38s cubic-bezier(.18,.89,.32,1.28); }
      `}</style>
        </Layout>
    );
}