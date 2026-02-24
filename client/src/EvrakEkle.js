// EvrakEkle.jsx (ETS uyumlu - BUTONLAR modern + tema duyarlı header + sade veri girişi)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";
import { useNavigate } from "react-router-dom";
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
} from "react-icons/fi";

/* === Konfeti (Saçılarak sağ & sol) === */
function KonfetiSideBurst({ run = false }) {
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6"];

    const pieces = useMemo(() => {
        if (!run) return [];
        const N = 140;
        const arr = [];
        for (let i = 0; i < N; i++) {
            const fromLeft = i % 2 === 0;
            arr.push({
                id: i,
                side: fromLeft ? "L" : "R",
                top: Math.floor(Math.random() * 80) + 5,
                dx: Math.floor(Math.random() * 35) + 30,
                dy: Math.floor(Math.random() * 45) + 25,
                amp: Math.floor(Math.random() * 14) + 6,
                w: Math.floor(Math.random() * 7) + 6,
                h: Math.floor(Math.random() * 12) + 8,
                bg: colors[Math.floor(Math.random() * colors.length)],
                delay: (Math.random() * 0.25).toFixed(2),
                duration: (Math.random() * 1.4 + 1.7).toFixed(2),
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
                        className={`confetti-wrap ${p.side === "L" ? "from-left" : "from-right"}`}
                        style={{
                            top: `${p.top}vh`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            ["--dx"]: `${p.dx}vw`,
                            ["--dy"]: `${p.dy}vh`,
                        }}
                    >
                        <i className="confetti-rot" style={{ animationDuration: `${(p.duration / p.spin).toFixed(2)}s` }}>
                            <i
                                className="confetti-piece"
                                style={{
                                    width: `${p.w}px`,
                                    height: `${p.h}px`,
                                    background: p.bg,
                                    borderRadius: p.round ? "50%" : "3px",
                                    animationDuration: `${(p.duration * 0.9).toFixed(2)}s`,
                                    ["--amp"]: `${p.amp}px`,
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

/* ---------- Modern UI kit ---------- */
function clsx(...arr) {
    return arr.filter(Boolean).join(" ");
}

function Btn({ variant = "primary", size = "md", leftIcon: LeftIcon, rightIcon: RightIcon, className, ...props }) {
    const sizes = {
        sm: "h-10 px-4 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-sm",
    };

    const base =
        "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold " +
        "transition-all duration-200 select-none " +
        "active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed " +
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20";

    const variants = {
        primary:
            "text-white " +
            "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 " +
            "shadow-[0_18px_60px_rgba(139,92,246,0.25)] " +
            "hover:brightness-[1.05] hover:shadow-[0_18px_70px_rgba(139,92,246,0.32)] " +
            "border border-white/10",
        secondary:
            "text-zinc-800 dark:text-zinc-100 " +
            "bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl " +
            "border border-violet-200/60 dark:border-white/10 " +
            "hover:bg-violet-50/70 dark:hover:bg-white/[0.06]",
        ghost:
            "text-violet-700 dark:text-violet-200 " +
            "bg-transparent " +
            "border border-transparent " +
            "hover:bg-violet-50/70 dark:hover:bg-white/[0.06]",
        danger:
            "text-white " +
            "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 " +
            "shadow-[0_18px_55px_rgba(239,68,68,0.22)] " +
            "hover:brightness-[1.05] hover:shadow-[0_18px_65px_rgba(239,68,68,0.28)] " +
            "border border-white/10",
    };

    return (
        <button className={clsx(base, sizes[size], variants[variant], className)} {...props}>
            {LeftIcon ? <LeftIcon /> : null}
            {props.children}
            {RightIcon ? <RightIcon /> : null}
        </button>
    );
}

function IconBtn({ title, onClick, children, variant = "secondary", className }) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={clsx(
                "grid h-10 w-10 place-items-center rounded-2xl transition-all duration-200 active:scale-[0.98] " +
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20",
                variant === "secondary"
                    ? "bg-white/70 dark:bg-white/[0.04] border border-violet-200/60 dark:border-white/10 hover:bg-violet-50/70 dark:hover:bg-white/[0.06]"
                    : "bg-violet-600 text-white hover:bg-violet-700",
                className
            )}
        >
            {children}
        </button>
    );
}

function Tag({ tone = "neutral", children }) {
    const tones = {
        neutral:
            "bg-white/70 border border-violet-200/60 text-zinc-700 dark:bg-white/[0.04] dark:border-white/10 dark:text-zinc-200",
        ok: "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-200",
        warn: "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-200",
        danger: "bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-200",
        info: "bg-violet-50 border border-violet-200 text-violet-800 dark:bg-white/[0.04] dark:border-white/10 dark:text-violet-200",
    };
    return <span className={clsx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold", tones[tone])}>{children}</span>;
}

function Skeleton({ className = "" }) {
    return <div className={`animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-white/[0.06] ${className}`} />;
}

function Toast({ show, type = "success", message }) {
    if (!show) return null;
    const base =
        "bg-white/80 dark:bg-white/[0.06] border backdrop-blur-xl shadow-2xl text-sm font-extrabold rounded-2xl px-4 py-3";
    const styles =
        type === "success"
            ? "border-violet-200/70 dark:border-white/10 text-violet-800 dark:text-violet-200"
            : "border-red-200/70 dark:border-red-900/30 text-red-700 dark:text-red-300";

    return (
        <div className="fixed right-5 top-5 z-[90]">
            <div className={`${base} ${styles} animate-toast-in`}>
                <div className="flex items-center gap-2">
                    {type === "success" ? <FiCheckCircle /> : <FiAlertTriangle />}
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

function StepPill({ idx, label, active, done }) {
    return (
        <div
            className={clsx(
                "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold border",
                done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-200"
                    : active
                        ? "bg-violet-50 border-violet-200 text-violet-800 dark:bg-white/[0.04] dark:border-white/10 dark:text-violet-200"
                        : "bg-white/70 border-violet-200/50 text-zinc-600 dark:bg-white/[0.04] dark:border-white/10 dark:text-zinc-300"
            )}
        >
            <span
                className={clsx(
                    "grid h-5 w-5 place-items-center rounded-full text-[11px]",
                    done
                        ? "bg-emerald-600 text-white"
                        : active
                            ? "bg-violet-600 text-white"
                            : "bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
                )}
            >
                {done ? "✓" : idx}
            </span>
            {label}
        </div>
    );
}

function Card({ title, icon: Icon, subtitle, right, children }) {
    return (
        <section className="rounded-3xl border border-violet-200/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3 border-b border-violet-100/70 px-5 py-4 dark:border-white/10">
                <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 text-white shadow-sm">
                        <Icon />
                    </div>
                    <div>
                        <div className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50">{title}</div>
                        {subtitle && <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">{subtitle}</div>}
                    </div>
                </div>
                {right}
            </div>
            <div className="px-5 py-5">{children}</div>
        </section>
    );
}

export default function EvrakEkle() {
    const navigate = useNavigate();

    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [projeler, setProjeler] = useState([]);

    const [mesaj, setMesaj] = useState("");
    const [toast, setToast] = useState({ show: false, type: "success", message: "" });

    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const DRAFT_KEY = "evrakekle_draft_v1";
    const toastTimer = useRef(null);

    const emptyForm = useMemo(
        () => ({
            tarih: "",
            lokasyonid: "",
            projeler: [{ projeid: "", sefersayisi: "" }],
            seferler: [{ seferno: "", aciklama: "" }],
        }),
        []
    );

    const [form, setForm] = useState(emptyForm);

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

    const normalizeSeferNo = (v) =>
        String(v || "")
            .trim()
            .replace(/\s+/g, " ")
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
        return idxs;
    }, [form.seferler, duplicateSeferNos]);

    const validBasics = !!form.tarih && !!form.lokasyonid;
    const validProjects = form.projeler.some((p) => p.projeid && String(p.sefersayisi || "").length);
    const canSubmit = validBasics && validProjects && isDirty && !saving && !hasDuplicateSeferNo;

    const step = useMemo(() => {
        if (!validBasics) return 1;
        if (!validProjects) return 2;
        return 3;
    }, [validBasics, validProjects]);

    useEffect(() => {
        document.title = "Evrak Ekle";
        verileriYukle();

        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.tarih !== undefined) setForm(parsed);
            }
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = "";
        };
        if (isDirty) window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        const onKey = (e) => {
            const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
            if (!isSave) return;
            e.preventDefault();
            if (canSubmit) document.getElementById("evrak-submit-btn")?.click();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [canSubmit]);

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
                supabase.from("lokasyonlar").select("*").order("lokasyon"),
                supabase.from("projeler").select("*").order("proje"),
            ]);
            setLokasyonlar(lokasyonData || []);
            setProjeler(projeData || []);
        } finally {
            setLoading(false);
        }
    };

    const goHome = () => {
        if (isDirty) {
            const ok = window.confirm("Kaydedilmemiş değişiklikler var. Yine de anasayfaya dönülsün mü?");
            if (!ok) return;
        }
        navigate("/Anasayfa");
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
            projeler: [{ projeid: "", sefersayisi: "" }, ...form.projeler],
        });

    const handleSeferChange = (index, field, value) => {
        const updated = [...form.seferler];
        updated[index][field] = value;
        setForm({ ...form, seferler: updated });
    };
    const handleSeferEkle = () =>
        setForm({
            ...form,
            seferler: [{ seferno: "", aciklama: "" }, ...form.seferler],
        });

    const formatDate = (value) => {
        if (!value) return null;
        if (typeof value === "string" && value.includes(".")) {
            const [gun, ay, yil] = value.split(".");
            return `${yil}-${ay.padStart(2, "0")}-${gun.padStart(2, "0")}`;
        }
        return String(value);
    };

    const handlePaste = (e) => {
        const text = e.clipboardData.getData("Text");
        const lines = text.trim().split("\n");
        if (lines.length === 0) return;

        const parsedProjeler = [];
        const parsedSeferler = [];

        let tarih = "";
        let lokasyon = "";

        for (let i = 0; i < lines.length; i++) {
            const cells = lines[i].split("\t");
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
            showToast("error", "Yapıştırılan veride tarih/lokasyon eşleşmedi.");
            return;
        }

        setForm({
            tarih,
            lokasyonid: lok.id,
            projeler: parsedProjeler.length ? parsedProjeler : [{ projeid: "", sefersayisi: "" }],
            seferler: parsedSeferler.length ? parsedSeferler : [{ seferno: "", aciklama: "" }],
        });

        showToast("success", "Excel verisi alındı.");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (hasDuplicateSeferNo) {
            setMesaj("❌ Mükerrer Sefer No var. Lütfen düzeltin.");
            showToast("error", "Mükerrer Sefer No var. Lütfen düzeltin.");
            return;
        }

        if (!canSubmit) {
            showToast("error", "Zorunlu alanları tamamlayın.");
            return;
        }

        try {
            setSaving(true);

            const { error: evrakError } = await supabase.from("evraklar").insert([
                {
                    tarih: form.tarih,
                    lokasyonid: parseInt(form.lokasyonid, 10),
                    sefersayisi: toplamSeferSayisi,
                },
            ]);

            if (evrakError) {
                setMesaj("❌ Evrak eklenemedi.");
                showToast("error", "Evrak eklenemedi.");
                return;
            }

            const { data: yeniEvrak } = await supabase.from("evraklar").select("id").order("id", { ascending: false }).limit(1);
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

            const { error: seferError1 } = await supabase.from("evrakseferler").insert(seferKayitlari);
            const { error: seferError2 } = await supabase.from("evrakproje").insert(projeSeferKayitlari);

            if (seferError1 || seferError2) {
                setMesaj("❌ Sefer veya proje kayıtları eklenemedi.");
                showToast("error", "Sefer/Proje kayıtları eklenemedi.");
            } else {
                setMesaj("✅ Başarıyla eklendi.");
                showToast("success", "Kaydedildi.");

                setForm(emptyForm);
                setInitialSnapshot(JSON.stringify(emptyForm));
                try {
                    localStorage.removeItem(DRAFT_KEY);
                } catch { }

                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2200);
            }

            setTimeout(() => setMesaj(""), 2500);
        } finally {
            setSaving(false);
        }
    };

    const clearAll = () => {
        const ok = !isDirty || window.confirm("Form temizlensin mi?");
        if (!ok) return;
        setForm(emptyForm);
        setInitialSnapshot(JSON.stringify(emptyForm));
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch { }
        showToast("success", "Form temizlendi.");
    };

    return (
        <Layout>
            <Toast show={toast.show} type={toast.type} message={toast.message} />

            <div
                className="min-h-screen bg-[#F7F5FF] dark:bg-[#070A13]
          [background-image:radial-gradient(900px_circle_at_18%_10%,rgba(139,92,246,0.14),transparent_55%),radial-gradient(850px_circle_at_82%_40%,rgba(236,72,153,0.10),transparent_60%)]
          dark:[background-image:radial-gradient(900px_circle_at_18%_10%,rgba(139,92,246,0.18),transparent_55%),radial-gradient(850px_circle_at_82%_40%,rgba(236,72,153,0.10),transparent_60%),radial-gradient(700px_circle_at_50%_85%,rgba(34,211,238,0.08),transparent_55%)]
          text-zinc-950 dark:text-zinc-50 transition-colors duration-300"
            >
                <div className="mx-auto max-w-6xl px-4 py-8">
                    {/* Header */}
                    <div className="mb-6 overflow-hidden rounded-[28px] border border-violet-200/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                        <div className="px-6 py-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <Tag tone="info">
                                        <FiZap /> Hızlı Giriş • Excel Yapıştır
                                    </Tag>

                                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight">📄 Evrak Ekle</h2>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                        Adım {step}/3 — {step === 1 ? "Temel Bilgiler" : step === 2 ? "Projeler" : hasDuplicateSeferNo ? "Mükerrer Kontrol" : "Hazır"}
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <StepPill idx={1} label="Temel" active={step === 1} done={step > 1} />
                                        <StepPill idx={2} label="Projeler" active={step === 2} done={step > 2} />
                                        <StepPill idx={3} label="Kontrol" active={step === 3} done={step === 3 && !hasDuplicateSeferNo && validBasics && validProjects} />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Btn variant="secondary" size="md" leftIcon={FiHome} onClick={goHome} title="Anasayfaya dön">
                                        Anasayfa
                                    </Btn>

                                    <Tag tone="neutral" title="Projelerden otomatik hesaplanır">
                                        Toplam Sefer: <b className="ml-1 text-violet-700 dark:text-violet-200">{toplamSeferSayisi}</b>
                                    </Tag>

                                    <Tag tone={isDirty ? "warn" : "ok"} title={isDirty ? "Kaydedilmemiş değişiklik var" : "Her şey güncel"}>
                                        {isDirty ? "Kaydedilmemiş" : "Güncel"}
                                    </Tag>

                                    <Tag tone="neutral" title="Kısayol">
                                        Ctrl/⌘+S
                                    </Tag>
                                </div>
                            </div>

                            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-violet-100/80 dark:bg-white/[0.06]">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all"
                                    style={{ width: `${step === 1 ? 33 : step === 2 ? 66 : 100}%` }}
                                />
                            </div>
                        </div>

                        {mesaj && (
                            <div
                                className={`px-6 py-4 text-sm font-extrabold ${mesaj.includes("✅")
                                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                                        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                                    }`}
                            >
                                {mesaj}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                        {/* MAIN */}
                        <div className="space-y-6">
                            <Card
                                icon={FiClipboard}
                                title="Excel’den Yapıştır"
                                subtitle="Ctrl+V ile yapıştır. Tarih & lokasyon ilk satırdan alınır."
                                right={<Tag tone="info">Opsiyonel</Tag>}
                            >
                                <textarea
                                    placeholder="Excel'den verileri buraya yapıştır (Ctrl+V)"
                                    onPaste={handlePaste}
                                    className="w-full min-h-[120px] rounded-3xl border border-violet-200/60 bg-white/70 p-4 font-mono text-sm outline-none transition
                    focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70
                    dark:bg-white/[0.04] dark:border-white/10"
                                />
                            </Card>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <Card
                                    icon={FiCalendar}
                                    title="Temel Bilgiler"
                                    subtitle="Tarih ve lokasyon zorunlu"
                                    right={
                                        !validBasics ? (
                                            <Tag tone="warn">
                                                <FiAlertTriangle /> Eksik
                                            </Tag>
                                        ) : (
                                            <Tag tone="ok">
                                                <FiCheckCircle /> Tamam
                                            </Tag>
                                        )
                                    }
                                >
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 flex items-center gap-2 text-xs font-extrabold text-zinc-600 dark:text-zinc-300">
                                                <FiCalendar /> Tarih
                                            </label>
                                            <input
                                                type="date"
                                                name="tarih"
                                                value={form.tarih}
                                                onChange={handleChange}
                                                required
                                                className="w-full rounded-2xl border border-violet-200/60 bg-white/70 px-4 py-3 text-sm outline-none transition
                          focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70
                          dark:bg-white/[0.04] dark:border-white/10"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 flex items-center gap-2 text-xs font-extrabold text-zinc-600 dark:text-zinc-300">
                                                <FiMapPin /> Lokasyon
                                            </label>

                                            {loading ? (
                                                <Skeleton className="h-[46px]" />
                                            ) : (
                                                <select
                                                    name="lokasyonid"
                                                    value={form.lokasyonid}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full rounded-2xl border border-violet-200/60 bg-white/70 px-4 py-3 text-sm outline-none transition
                            focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70
                            dark:bg-white/[0.04] dark:border-white/10"
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
                                </Card>

                                <Card
                                    icon={FiLayers}
                                    title="Projeler"
                                    subtitle="En az 1 proje + sefer sayısı girilmeli"
                                    right={
                                        <Btn variant="primary" size="sm" leftIcon={FiPlus} type="button" onClick={handleProjeEkle}>
                                            Proje Ekle
                                        </Btn>
                                    }
                                >
                                    <div className="space-y-3">
                                        {form.projeler.map((p, i) => (
                                            <div
                                                key={i}
                                                className="rounded-3xl border border-violet-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl
                          dark:border-white/10 dark:bg-white/[0.04]"
                                            >
                                                <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-center">
                                                    {loading ? (
                                                        <Skeleton className="h-[46px]" />
                                                    ) : (
                                                        <select
                                                            value={p.projeid}
                                                            onChange={(e) => handleProjeChange(i, "projeid", e.target.value)}
                                                            className="w-full rounded-2xl border border-violet-200/60 bg-white/70 px-4 py-3 text-sm outline-none transition
                                focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70
                                dark:bg-white/[0.04] dark:border-white/10"
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
                                                        onChange={(e) => handleProjeChange(i, "sefersayisi", e.target.value)}
                                                        className="w-full rounded-2xl border border-violet-200/60 bg-white/70 px-4 py-3 text-sm outline-none transition
                              focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70
                              dark:bg-white/[0.04] dark:border-white/10"
                                                    />

                                                    <div className="flex items-center justify-end">
                                                        {form.projeler.length > 1 && (
                                                            <Btn
                                                                variant="danger"
                                                                size="sm"
                                                                leftIcon={FiTrash2}
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = form.projeler.filter((_, idx) => idx !== i);
                                                                    setForm({ ...form, projeler: updated });
                                                                }}
                                                            >
                                                                Sil
                                                            </Btn>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {!validProjects && (
                                        <div className="mt-4">
                                            <Tag tone="warn">En az 1 proje seçip sefer sayısı girin.</Tag>
                                        </div>
                                    )}
                                </Card>

                                <Card
                                    icon={FiHash}
                                    title="Sefer Detayları"
                                    subtitle="Opsiyonel — Sefer No giriyorsan mükerrer olmasın"
                                    right={
                                        <Btn variant="primary" size="sm" leftIcon={FiPlus} type="button" onClick={handleSeferEkle}>
                                            Sefer Ekle
                                        </Btn>
                                    }
                                >
                                    {hasDuplicateSeferNo && (
                                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700
                      dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300"
                                        >
                                            <div className="flex items-center gap-2 font-extrabold">
                                                <FiAlertTriangle />
                                                Mükerrer Sefer No:
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {duplicateSeferNos.map((d) => (
                                                    <span
                                                        key={d.seferno}
                                                        className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-extrabold text-red-700
                              dark:bg-red-900/30 dark:text-red-200"
                                                    >
                                                        {d.seferno} <span className="ml-2 opacity-80">({d.count}x)</span>
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="mt-2 text-xs opacity-80">Karşılaştırma: boşluk/harf duyarsız.</div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {form.seferler.map((s, i) => {
                                            const isDupRow = duplicateRowIndexes.has(i);
                                            return (
                                                <div
                                                    key={i}
                                                    className="rounded-3xl border border-violet-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl
                            dark:border-white/10 dark:bg-white/[0.04]"
                                                >
                                                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                                        <div>
                                                            <label className="mb-1 flex items-center gap-2 text-xs font-extrabold text-zinc-600 dark:text-zinc-300">
                                                                <FiHash /> Sefer No
                                                            </label>
                                                            <input
                                                                placeholder="Sefer No"
                                                                value={s.seferno}
                                                                onChange={(e) => handleSeferChange(i, "seferno", e.target.value)}
                                                                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-4
                                  ${isDupRow
                                                                        ? "border-red-300 bg-red-50 focus:ring-red-200/60 dark:border-red-900/30 dark:bg-red-900/20 dark:focus:ring-red-900/20"
                                                                        : "border-violet-200/60 bg-white/70 focus:ring-violet-500/15 focus:border-violet-300/70 dark:bg-white/[0.04] dark:border-white/10"
                                                                    }`}
                                                            />
                                                            {isDupRow && (
                                                                <div className="mt-1 text-xs font-extrabold text-red-600 dark:text-red-300">
                                                                    Bu Sefer No başka satırda da var.
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 flex items-center gap-2 text-xs font-extrabold text-zinc-600 dark:text-zinc-300">
                                                                <FiType /> Açıklama
                                                            </label>
                                                            <select
                                                                value={s.aciklama}
                                                                onChange={(e) => handleSeferChange(i, "aciklama", e.target.value)}
                                                                className="w-full rounded-2xl border border-violet-200/60 bg-white/70 px-4 py-3 text-sm outline-none transition
                                  focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70
                                  dark:bg-white/[0.04] dark:border-white/10"
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
                                                                <Btn
                                                                    variant="danger"
                                                                    size="sm"
                                                                    leftIcon={FiTrash2}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = form.seferler.filter((_, idx) => idx !== i);
                                                                        setForm({ ...form, seferler: updated });
                                                                    }}
                                                                >
                                                                    Sil
                                                                </Btn>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>

                                {/* Sticky actions */}
                                <div className="sticky bottom-0 z-10">
                                    <div className="rounded-[28px] border border-violet-200/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="text-xs font-extrabold text-zinc-600 dark:text-zinc-300">
                                                {saving ? "Kaydediliyor…" : isDirty ? "Değişiklikler kaydedilmedi." : "Her şey güncel."}
                                                {hasDuplicateSeferNo && (
                                                    <span className="ml-2">
                                                        <Tag tone="danger">
                                                            <FiAlertTriangle /> Mükerrer Sefer No
                                                        </Tag>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <Btn variant="secondary" size="md" type="button" onClick={clearAll} disabled={saving}>
                                                    Temizle
                                                </Btn>

                                                <Btn
                                                    id="evrak-submit-btn"
                                                    variant="primary"
                                                    size="md"
                                                    type="submit"
                                                    disabled={!canSubmit}
                                                    leftIcon={FiSave}
                                                >
                                                    {saving ? "Kaydediliyor…" : "Kaydet"}
                                                </Btn>
                                            </div>
                                        </div>

                                        {!canSubmit && (
                                            <div className="mt-3 grid gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${validBasics ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                    Tarih ve lokasyon seçili olmalı
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${validProjects ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                    En az 1 proje + sefer sayısı girilmeli
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${!hasDuplicateSeferNo ? "bg-emerald-500" : "bg-red-500"}`} />
                                                    Mükerrer Sefer No olmamalı
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* SIDE SUMMARY */}
                        <aside className="hidden lg:block">
                            <div className="sticky top-6 space-y-4">
                                <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                                    <div className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50">Özet</div>
                                    <div className="mt-3 space-y-3 text-sm">
                                        <div className="flex items-center justify-between rounded-2xl bg-violet-50/70 border border-violet-200/50 px-4 py-3 dark:bg-white/[0.04] dark:border-white/10">
                                            <span className="text-zinc-600 dark:text-zinc-300">Adım</span>
                                            <b className="text-zinc-950 dark:text-white">{step}/3</b>
                                        </div>
                                        <div className="flex items-center justify-between rounded-2xl bg-violet-50/70 border border-violet-200/50 px-4 py-3 dark:bg-white/[0.04] dark:border-white/10">
                                            <span className="text-zinc-600 dark:text-zinc-300">Toplam Sefer</span>
                                            <b className="text-violet-700 dark:text-violet-200">{toplamSeferSayisi}</b>
                                        </div>
                                        <div className="flex items-center justify-between rounded-2xl bg-violet-50/70 border border-violet-200/50 px-4 py-3 dark:bg-white/[0.04] dark:border-white/10">
                                            <span className="text-zinc-600 dark:text-zinc-300">Durum</span>
                                            <b className={isDirty ? "text-amber-600 dark:text-amber-200" : "text-emerald-600 dark:text-emerald-200"}>
                                                {isDirty ? "Kaydedilmemiş" : "Güncel"}
                                            </b>
                                        </div>
                                        <div className="flex items-center justify-between rounded-2xl bg-violet-50/70 border border-violet-200/50 px-4 py-3 dark:bg-white/[0.04] dark:border-white/10">
                                            <span className="text-zinc-600 dark:text-zinc-300">Mükerrer</span>
                                            <b className={hasDuplicateSeferNo ? "text-red-600 dark:text-red-300" : "text-emerald-600 dark:text-emerald-200"}>
                                                {hasDuplicateSeferNo ? "Var" : "Yok"}
                                            </b>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-600/10 via-fuchsia-600/10 to-cyan-600/10 p-4 text-xs text-zinc-600 dark:text-zinc-300">
                                        İpucu: Excel yapıştırdıktan sonra sadece eksikleri düzenleyip <b>Ctrl/⌘+S</b> ile kaydedebilirsin.
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                                    <div className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50">Taslak</div>
                                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                                        Değişiklikler otomatik taslak olarak saklanır. Kaydet sonrası temizlenir.
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>

                <KonfetiSideBurst run={showSuccess} />

                {showSuccess && (
                    <div className="fixed inset-0 z-[80] grid place-items-center">
                        <div className="absolute inset-0 bg-black/40"></div>
                        <div className="relative z-[81] animate-pop-in rounded-3xl border border-white/10 bg-white/90 px-8 py-7 text-center shadow-2xl backdrop-blur-xl dark:bg-white/[0.06]">
                            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                                <FiCheckCircle className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50">Kaydedildi</h3>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Kayıt başarıyla tamamlandı.</p>
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
            </div>
        </Layout>
    );
}