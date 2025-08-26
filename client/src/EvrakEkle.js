// YENİ KOD — EvrakEkle.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
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
} from 'react-icons/fi';

/* === Konfeti (Saçılarak sağ & sol) === */
function KonfetiSideBurst({ run = false }) {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'];

    const pieces = useMemo(() => {
        if (!run) return [];
        const N = 160; // parça sayısı
        const arr = [];
        for (let i = 0; i < N; i++) {
            const fromLeft = i % 2 === 0;
            arr.push({
                id: i,
                side: fromLeft ? 'L' : 'R',
                // ekranın yüksekliğinin %5 ile %85'i arasında rastgele başlangıç
                top: Math.floor(Math.random() * 80) + 5, // vh
                // yatay mesafe (vw) – geniş saçılma
                dx: Math.floor(Math.random() * 35) + 30, // 30–64 vw
                // düşüş (vh) – farklı eğim/sıçrama etkisi
                dy: Math.floor(Math.random() * 45) + 25, // 25–69 vh
                // hafif salınım genliği
                amp: Math.floor(Math.random() * 14) + 6, // 6–19 px
                w: Math.floor(Math.random() * 7) + 6,   // 6–12 px
                h: Math.floor(Math.random() * 12) + 8,  // 8–19 px
                bg: colors[Math.floor(Math.random() * colors.length)],
                delay: (Math.random() * 0.35).toFixed(2),          // 0–0.35s
                duration: (Math.random() * 1.6 + 1.8).toFixed(2),  // 1.8–3.4s
                round: Math.random() > 0.5,
                spin: (Math.random() * 1.2 + 0.8).toFixed(2),      // dönme hızı çarpanı
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
                            // hedefler
                            ['--dx']: `${p.dx}vw`,
                            ['--dy']: `${p.dy}vh`,
                        }}
                    >
                        <i
                            className="confetti-rot"
                            style={{
                                animationDuration: `${(p.duration / p.spin).toFixed(2)}s`,
                            }}
                        >
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
        .confetti-layer{
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 70;
          overflow: hidden;
        }
        /* taşıyıcı: ekrandan içeri çapraz hareket + aşağı düşüş */
        .confetti-wrap{
          position: absolute;
          will-change: transform, opacity;
          opacity: 1;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        .confetti-wrap.from-left{ left: -18px; animation-name: confetti-move-left; }
        .confetti-wrap.from-right{ right: -18px; animation-name: confetti-move-right; }

        /* dönme: parça bağımsız döner */
        .confetti-rot{
          display: inline-block;
          will-change: transform;
          animation: confetti-spin linear infinite;
        }

        /* salınım: hafif sağ-sol titreşim */
        .confetti-piece{
          display: inline-block;
          will-change: transform;
          animation-name: confetti-sway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }

        /* soldan: sağa + aşağı; sonunda hafifçe sön */
        @keyframes confetti-move-left{
          0%   { transform: translate3d(0, 0, 0); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translate3d(var(--dx), var(--dy), 0); opacity: 0; }
        }
        /* sağdan: sola + aşağı; sonunda hafifçe sön */
        @keyframes confetti-move-right{
          0%   { transform: translate3d(0, 0, 0); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translate3d(calc(var(--dx) * -1), var(--dy), 0); opacity: 0; }
        }
        /* titreşim */
        @keyframes confetti-sway{
          0%   { transform: translateX(0); }
          25%  { transform: translateX(var(--amp)); }
          50%  { transform: translateX(calc(var(--amp) * -1)); }
          75%  { transform: translateX(var(--amp)); }
          100% { transform: translateX(0); }
        }
        /* dönme */
        @keyframes confetti-spin{
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(720deg); }
        }
      `}</style>
        </>
    );
}

function EvrakEkle() {
    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [projeler, setProjeler] = useState([]);
    const [mesaj, setMesaj] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const [form, setForm] = useState({
        tarih: '',
        lokasyonid: '',
        projeler: [{ projeid: '', sefersayisi: '' }],
        seferler: [{ seferno: '', aciklama: '' }],
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

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleProjeChange = (index, field, value) => {
        const updated = [...form.projeler];
        updated[index][field] = value;
        setForm({ ...form, projeler: updated });
    };
    const handleProjeEkle = () =>
        setForm({ ...form, projeler: [...form.projeler, { projeid: '', sefersayisi: '' }] });

    const handleSeferChange = (index, field, value) => {
        const updated = [...form.seferler];
        updated[index][field] = value;
        setForm({ ...form, seferler: updated });
    };
    const handleSeferEkle = () =>
        setForm({ ...form, seferler: [...form.seferler, { seferno: '', aciklama: '' }] });

    const toplamSeferSayisi = form.projeler.reduce(
        (sum, p) => sum + Number(p.sefersayisi || 0),
        0
    );

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
        if (!tarih || !lok) return;

        setForm({
            tarih,
            lokasyonid: lok.id,
            projeler: parsedProjeler,
            seferler: parsedSeferler.length ? parsedSeferler : [{ seferno: '', aciklama: '' }],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { error: evrakError } = await supabase.from('evraklar').insert([
            {
                tarih: form.tarih,
                lokasyonid: parseInt(form.lokasyonid, 10),
                sefersayisi: toplamSeferSayisi,
            },
        ]);

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
        } else {
            setMesaj('✅ Başarıyla eklendi.');
            setForm({
                tarih: '',
                lokasyonid: '',
                projeler: [{ projeid: '', sefersayisi: '' }],
                seferler: [{ seferno: '', aciklama: '' }],
            });

            // ✅ Başarı kartı + saçılan konfeti
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2200);
        }

        setTimeout(() => setMesaj(''), 3000);
    };

    return (
        <Layout>
            <div className="mx-auto max-w-5xl px-4 py-8">
                {/* Başlık & Özet */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">📄 Evrak Ekle</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Excel’den yapıştırabilir ya da alanları manuel doldurabilirsiniz.
                        </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-4 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Toplam Sefer: <span className="font-semibold">{toplamSeferSayisi}</span>
                    </div>
                </div>

                {/* Mesaj */}
                {mesaj && (
                    <div
                        className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${mesaj.includes('✅')
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                            }`}
                    >
                        {mesaj}
                    </div>
                )}

                {/* 1) Excel’den Yapıştır */}
                <div className="mb-6 rounded-2xl border border-dashed border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-3 flex items-center gap-2 font-semibold">
                        <FiClipboard />
                        <span>Excel'den Veri Yapıştır (Opsiyonel)</span>
                    </div>
                    <textarea
                        placeholder="Excel'den verileri buraya yapıştır"
                        onPaste={handlePaste}
                        className="w-full min-h-[110px] rounded-xl border border-gray-300 bg-white p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        İlk satırdaki tarih ve lokasyon otomatik alınır. Proje adları ve sefer sayıları eşleşirse doldurulur.
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 2) Temel Bilgiler */}
                    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        <div className="mb-4 flex items-center gap-2 font-semibold">
                            <FiCalendar />
                            <span>Temel Bilgiler</span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                                    <FiCalendar /> TARİH
                                </label>
                                <input
                                    type="date"
                                    name="tarih"
                                    value={form.tarih}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                                    <FiMapPin /> LOKASYON
                                </label>
                                <select
                                    name="lokasyonid"
                                    value={form.lokasyonid}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                >
                                    <option value="">Seçiniz</option>
                                    {lokasyonlar.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.lokasyon}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* 3) Projeler & Sefer Sayıları */}
                    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold">
                                <FiLayers />
                                <span>Projeler & Sefer Sayıları</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleProjeEkle}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                <FiPlus /> Proje Ekle
                            </button>
                        </div>

                        <div className="space-y-3">
                            {form.projeler.map((p, i) => (
                                <div
                                    key={i}
                                    className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-[1fr_180px_auto]"
                                >
                                    <select
                                        value={p.projeid}
                                        onChange={(e) => handleProjeChange(i, 'projeid', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />

                                    <div className="flex items-center justify-end">
                                        {form.projeler.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = form.projeler.filter((_, idx) => idx !== i);
                                                    setForm({ ...form, projeler: updated });
                                                }}
                                                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700"
                                                title="Satırı Sil"
                                            >
                                                <FiTrash2 /> Sil
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Toplam sefer sayısı otomatik hesaplanır: <b>{toplamSeferSayisi}</b>
                        </div>
                    </section>

                    {/* 4) Toplam Sefer Sayısı */}
                    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        <label className="mb-1 block text-sm font-medium">TOPLAM SEFER SAYISI</label>
                        <input
                            type="number"
                            value={toplamSeferSayisi}
                            readOnly
                            className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </section>

                    {/* 5) Sefer Detayları */}
                    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold">
                                <FiHash />
                                <span>Sefer Detayları</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleSeferEkle}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                <FiPlus /> Sefer Ekle
                            </button>
                        </div>

                        <div className="space-y-3">
                            {form.seferler.map((s, i) => (
                                <div
                                    key={i}
                                    className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-[1fr_1fr_auto]"
                                >
                                    <div>
                                        <label className="mb-1 flex items-center gap-2 text-xs font-medium opacity-70">
                                            <FiHash /> Sefer No
                                        </label>
                                        <input
                                            placeholder="Sefer No"
                                            value={s.seferno}
                                            onChange={(e) => handleSeferChange(i, 'seferno', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 flex items-center gap-2 text-xs font-medium opacity-70">
                                            <FiType /> Açıklama
                                        </label>
                                        <select
                                            value={s.aciklama}
                                            onChange={(e) => handleSeferChange(i, 'aciklama', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        >
                                            <option value="">Açıklama Seçiniz</option>
                                            <option value="TARAFIMIZCA DÜZELTİLMİŞTİR">TARAFIMIZCA DÜZELTİLMİŞTİR</option>
                                            <option value="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR">TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR</option>
                                            <option value="EKSİK TARAMA">EKSİK TARAMA</option>
                                            <option value="HASARLI TARAMA">HASARLI TARAMA</option>
                                            <option value="GÖRÜNTÜ TARAMA">GÖRÜNTÜ TARAMA</option>
                                        </select>
                                    </div>

                                    <div className="flex items-end justify-end">
                                        {form.seferler.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = form.seferler.filter((_, idx) => idx !== i);
                                                    setForm({ ...form, seferler: updated });
                                                }}
                                                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700"
                                                title="Satırı Sil"
                                            >
                                                <FiTrash2 /> Sil
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Kaydet */}
                    <div className="sticky bottom-0 z-10 mt-2 rounded-2xl bg-white/80 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-gray-900/70">
                        <div className="flex items-center justify-end">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow hover:bg-emerald-700"
                            >
                                <FiSave /> Kaydet
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ✅ Saçılan konfeti */}
            <KonfetiSideBurst run={showSuccess} />

            {/* ✅ Orta başarı kartı */}
            {showSuccess && (
                <div className="fixed inset-0 z-[80] grid place-items-center">
                    <div className="absolute inset-0 bg-black/30"></div>
                    <div className="relative z-[81] animate-pop-in rounded-2xl bg-white px-8 py-6 text-center shadow-2xl dark:bg-gray-800">
                        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40">
                            <FiCheckCircle className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Kaydedildi</h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Kayıt başarıyla tamamlandı.</p>
                    </div>
                </div>
            )}

            {/* Kart pop-in animasyonu */}
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

export default EvrakEkle;
