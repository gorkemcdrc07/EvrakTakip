// EvrakEkle.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";
import { useNavigate } from "react-router-dom";
import {
    FiClipboard,
    FiCalendar,
    FiLayers,
    FiPlus,
    FiTrash2,
    FiHash,
    FiType,
    FiSave,
    FiCheckCircle,
    FiAlertTriangle,
    FiMapPin,
    FiFileText,
    FiCommand,
    FiShield,
    FiArrowLeft,
    FiRefreshCw,
} from "react-icons/fi";

/* =========================
   Kutlama efekti
   - klasik konfeti
   - kalp
   - çiçek
========================= */
function CelebrationBurst({ run = false }) {
    const colors = [
        "#6366f1",
        "#8b5cf6",
        "#ec4899",
        "#22c55e",
        "#0ea5e9",
        "#f59e0b",
        "#ef4444",
    ];

    const pieces = useMemo(() => {
        if (!run) return [];
        const N = 180;
        const shapes = ["rect", "circle", "heart", "flower"];
        const arr = [];

        for (let i = 0; i < N; i++) {
            const fromLeft = i % 2 === 0;
            const shape =
                i % 10 === 0
                    ? "flower"
                    : i % 7 === 0
                        ? "heart"
                        : shapes[Math.floor(Math.random() * 2)];

            arr.push({
                id: i,
                side: fromLeft ? "L" : "R",
                top: Math.floor(Math.random() * 78) + 6,
                dx: Math.floor(Math.random() * 34) + 28,
                dy: Math.floor(Math.random() * 42) + 26,
                amp: Math.floor(Math.random() * 14) + 6,
                size: Math.floor(Math.random() * 10) + 10,
                bg: colors[Math.floor(Math.random() * colors.length)],
                delay: (Math.random() * 0.28).toFixed(2),
                duration: (Math.random() * 1.4 + 1.8).toFixed(2),
                spin: (Math.random() * 1.2 + 0.8).toFixed(2),
                shape,
            });
        }
        return arr;
    }, [run]);

    if (!run) return null;

    return (
        <>
            <div className="celebration-layer">
                {pieces.map((p) => (
                    <span
                        key={p.id}
                        className={`cele-wrap ${p.side === "L" ? "from-left" : "from-right"}`}
                        style={{
                            top: `${p.top}vh`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            ["--dx"]: `${p.dx}vw`,
                            ["--dy"]: `${p.dy}vh`,
                        }}
                    >
                        <i
                            className="cele-rot"
                            style={{ animationDuration: `${(p.duration / p.spin).toFixed(2)}s` }}
                        >
                            {p.shape === "heart" ? (
                                <span
                                    className="heart-shape"
                                    style={{
                                        width: `${p.size}px`,
                                        height: `${p.size}px`,
                                        background: p.bg,
                                        ["--amp"]: `${p.amp}px`,
                                        animationDuration: `${(p.duration * 0.9).toFixed(2)}s`,
                                    }}
                                />
                            ) : p.shape === "flower" ? (
                                <span
                                    className="flower-shape"
                                    style={{
                                        width: `${p.size + 6}px`,
                                        height: `${p.size + 6}px`,
                                        ["--amp"]: `${p.amp}px`,
                                        animationDuration: `${(p.duration * 0.9).toFixed(2)}s`,
                                    }}
                                >
                                    <i style={{ background: p.bg }} />
                                    <i style={{ background: p.bg }} />
                                    <i style={{ background: p.bg }} />
                                    <i style={{ background: p.bg }} />
                                    <b />
                                </span>
                            ) : (
                                <span
                                    className={`cele-piece ${p.shape === "circle" ? "is-circle" : ""}`}
                                    style={{
                                        width: `${p.size}px`,
                                        height: `${p.shape === "rect" ? p.size + 3 : p.size}px`,
                                        background: p.bg,
                                        ["--amp"]: `${p.amp}px`,
                                        animationDuration: `${(p.duration * 0.9).toFixed(2)}s`,
                                    }}
                                />
                            )}
                        </i>
                    </span>
                ))}
            </div>

            <style>{`
        .celebration-layer{
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 80;
          overflow: hidden;
        }
        .cele-wrap{
          position: absolute;
          will-change: transform, opacity;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        .cele-wrap.from-left{ left: -24px; animation-name: cele-move-left; }
        .cele-wrap.from-right{ right: -24px; animation-name: cele-move-right; }

        .cele-rot{
          display: inline-block;
          will-change: transform;
          animation: cele-spin linear infinite;
        }

        .cele-piece,
        .heart-shape,
        .flower-shape{
          display: inline-block;
          will-change: transform;
          animation-name: cele-sway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }

        .cele-piece{
          border-radius: 4px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.10);
        }
        .cele-piece.is-circle{
          border-radius: 999px;
        }

        .heart-shape{
          position: relative;
          transform: rotate(-45deg);
          border-radius: 2px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.10);
        }
        .heart-shape::before,
        .heart-shape::after{
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background: inherit;
          border-radius: 999px;
        }
        .heart-shape::before{
          top: -50%;
          left: 0;
        }
        .heart-shape::after{
          top: 0;
          left: 50%;
        }

        .flower-shape{
          position: relative;
        }
        .flower-shape i{
          position: absolute;
          width: 52%;
          height: 52%;
          border-radius: 999px;
          opacity: .95;
          box-shadow: 0 1px 6px rgba(0,0,0,0.08);
        }
        .flower-shape i:nth-child(1){ top: 0; left: 24%; }
        .flower-shape i:nth-child(2){ top: 24%; right: 0; }
        .flower-shape i:nth-child(3){ bottom: 0; left: 24%; }
        .flower-shape i:nth-child(4){ top: 24%; left: 0; }
        .flower-shape b{
          position: absolute;
          inset: 34%;
          border-radius: 999px;
          background: #fde68a;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.35);
        }

        @keyframes cele-move-left{
          0%{ transform: translate3d(0,0,0); opacity: 1; }
          85%{ opacity: 1; }
          100%{ transform: translate3d(var(--dx), var(--dy), 0); opacity: 0; }
        }
        @keyframes cele-move-right{
          0%{ transform: translate3d(0,0,0); opacity: 1; }
          85%{ opacity: 1; }
          100%{ transform: translate3d(calc(var(--dx) * -1), var(--dy), 0); opacity: 0; }
        }
        @keyframes cele-sway{
          0%{ transform: translateX(0) scale(1); }
          25%{ transform: translateX(var(--amp)) scale(1.02); }
          50%{ transform: translateX(calc(var(--amp) * -1)) scale(.98); }
          75%{ transform: translateX(var(--amp)) scale(1.01); }
          100%{ transform: translateX(0) scale(1); }
        }
        @keyframes cele-spin{
          0%{ transform: rotate(0deg); }
          100%{ transform: rotate(720deg); }
        }
      `}</style>
        </>
    );
}

/* =========================
   UI yardımcıları
========================= */
function clsx(...arr) {
    return arr.filter(Boolean).join(" ");
}

function Btn({
    variant = "primary",
    size = "md",
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    children,
    ...props
}) {
    const sizes = {
        sm: "h-10 px-4 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-sm",
    };

    const base =
        "group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-extrabold " +
        "transition-all duration-300 select-none active:translate-y-0 active:scale-[0.96] " +
        "disabled:opacity-60 disabled:cursor-not-allowed " +
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/20";

    const variants = {
        primary:
            "text-white bg-gradient-to-r from-blue-600 to-cyan-500 " +
            "shadow-[0_12px_30px_rgba(8,145,178,0.22)] " +
            "hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_16px_36px_rgba(8,145,178,0.28)] " +
            "border border-white/10",
        secondary:
            "text-slate-700 dark:text-slate-100 " +
            "bg-white dark:bg-white/[0.06] backdrop-blur-md " +
            "border border-slate-200 dark:border-white/10 shadow-[0_6px_18px_rgba(15,23,42,.06)] " +
            "hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 hover:shadow-[0_12px_28px_rgba(8,145,178,.12)] dark:hover:border-cyan-500/30 dark:hover:bg-cyan-950/20 dark:hover:text-cyan-200",
        ghost:
            "text-cyan-700 dark:text-cyan-300 bg-transparent border border-transparent " +
            "hover:bg-cyan-50 dark:hover:bg-cyan-950/30",
        danger:
            "text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20 " +
            "shadow-[0_6px_18px_rgba(244,63,94,0.08)] hover:-translate-y-0.5 hover:bg-rose-600 hover:text-white hover:shadow-[0_12px_28px_rgba(244,63,94,0.22)] " +
            "border border-rose-200 dark:border-rose-500/20",
    };

    return (
        <button className={clsx(base, sizes[size], variants[variant], className)} {...props}>
            <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 opacity-0 blur-sm transition-all duration-700 group-hover/btn:left-[120%] group-hover/btn:opacity-100" />
            {LeftIcon ? (
                <span className="relative z-10 grid h-6 w-6 place-items-center rounded-lg bg-current/10 transition duration-300 group-hover/btn:-rotate-6 group-hover/btn:scale-110">
                    <LeftIcon className="h-4 w-4" />
                </span>
            ) : null}
            <span className="relative z-10">{children}</span>
            {RightIcon ? <RightIcon className="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-1" /> : null}
        </button>
    );
}

function Tag({ tone = "neutral", children, className = "" }) {
    const tones = {
        neutral:
            "bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",
        ok:
            "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200",
        warn:
            "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200",
        danger:
            "bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200",
        info:
            "bg-cyan-50 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-800/60 dark:text-cyan-200",
    };

    return (
        <span
            className={clsx(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold",
                tones[tone],
                className
            )}
        >
            {children}
        </span>
    );
}

function Skeleton({ className = "" }) {
    return <div className={`animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-700/60 ${className}`} />;
}

function Toast({ show, type = "success", message }) {
    if (!show) return null;

    const styles =
        type === "success"
            ? "border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
            : "border-red-200 dark:border-red-800 text-red-700 dark:text-red-200";

    return (
        <div className="fixed right-5 top-5 z-[90]">
            <div
                className={clsx(
                    "rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl px-4 py-3 text-sm font-extrabold animate-toast-in",
                    styles
                )}
            >
                <div className="flex items-center gap-2">
                    {type === "success" ? <FiCheckCircle /> : <FiAlertTriangle />}
                    <span>{message}</span>
                </div>
            </div>

            <style>{`
        @keyframes toast-in {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-toast-in { animation: toast-in .22s ease-out; }
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
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200"
                    : active
                        ? "bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-950/30 dark:border-cyan-800 dark:text-cyan-200"
                        : "bg-white/80 border-slate-200 text-slate-600 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300"
            )}
        >
            <span
                className={clsx(
                    "grid h-5 w-5 place-items-center rounded-full text-[11px]",
                    done
                        ? "bg-emerald-600 text-white"
                        : active
                            ? "bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-[0_3px_10px_rgba(6,182,212,.3)]"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
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
        <section className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.055)] transition duration-300 hover:border-cyan-300/70 hover:shadow-[0_16px_45px_rgba(8,145,178,0.09)] dark:border-white/[0.08] dark:bg-[#111927] dark:hover:border-cyan-500/25">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/70">
                <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-[0_8px_20px_rgba(8,145,178,.22)] transition duration-300 group-hover:scale-105 group-hover:rotate-3">
                        <Icon />
                    </div>
                    <div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{title}</div>
                        {subtitle && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">{subtitle}</div>}
                    </div>
                </div>
                {right}
            </div>
            <div className="px-5 py-5">{children}</div>
        </section>
    );
}

const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 outline-none transition duration-200 " +
    "placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 " +
    "dark:border-white/[0.09] dark:bg-[#0b1320] dark:text-slate-100 dark:hover:border-white/20 dark:focus:border-cyan-500";

const selectClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 outline-none transition duration-200 " +
    "hover:border-slate-300 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 " +
    "dark:border-white/[0.09] dark:bg-[#0b1320] dark:text-slate-100 dark:hover:border-white/20 dark:focus:border-cyan-500";

/* =========================
   Ana bileşen
========================= */
export default function EvrakEkle() {
    const navigate = useNavigate();

    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [projeler, setProjeler] = useState([]);

    const [mesaj, setMesaj] = useState("");
    const [toast, setToast] = useState({ show: false, type: "success", message: "" });
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const DRAFT_KEY = "evrakekle_draft_v2";
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

            const { data: yeniEvrak } = await supabase
                .from("evraklar")
                .select("id")
                .order("id", { ascending: false })
                .limit(1);

            const evrakId = yeniEvrak?.[0]?.id;

            const projeSeferKayitlari = form.projeler.map((p) => ({
                evrakid: evrakId,
                projeid: parseInt(p.projeid, 10),
                sefersayisi: parseInt(p.sefersayisi, 10),
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
                setTimeout(() => setShowSuccess(false), 2400);
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
                className="min-h-screen bg-[#f5f7fa] text-slate-900 transition-colors duration-300 dark:bg-[#080e18] dark:text-slate-50
        [background-image:radial-gradient(800px_circle_at_12%_2%,rgba(6,182,212,0.08),transparent_45%),radial-gradient(700px_circle_at_88%_18%,rgba(37,99,235,0.06),transparent_48%)]
        dark:[background-image:radial-gradient(800px_circle_at_12%_2%,rgba(6,182,212,0.10),transparent_45%),radial-gradient(700px_circle_at_88%_18%,rgba(37,99,235,0.10),transparent_48%)]"
            >
                <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8">
                    <div className="relative mb-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={goHome}
                                    className="group/back grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-[0_6px_20px_rgba(15,23,42,.07)] transition-all duration-300 hover:-translate-x-1 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-[0_12px_26px_rgba(8,145,178,.13)] active:scale-95 dark:border-white/10 dark:bg-[#111927] dark:text-slate-300 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-950/20 dark:hover:text-cyan-300"
                                    aria-label="Anasayfaya dön"
                                    title="Anasayfaya dön"
                                >
                                    <FiArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover/back:-translate-x-0.5" />
                                </button>

                                <div>
                                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-cyan-600 dark:text-cyan-400">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" /> Yeni kayıt
                                    </div>
                                    <div className="mt-1 flex items-center gap-3">
                                        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Evrak Ekle</h1>
                                        <span className={clsx("hidden rounded-full px-2.5 py-1 text-[10px] font-black sm:inline-flex", isDirty ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300")}>
                                            {isDirty ? "TASLAK" : "GÜNCEL"}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Yeni evrak ve sefer bilgilerini hızlıca oluştur.</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 shadow-sm dark:border-white/10 dark:bg-[#111927] dark:text-slate-400">
                                    <FiFileText className="text-cyan-500" /> Toplam sefer
                                    <b className="text-base text-slate-950 dark:text-white">{toplamSeferSayisi}</b>
                                </div>
                                <div className="hidden h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 shadow-sm sm:flex dark:border-white/10 dark:bg-[#111927] dark:text-slate-400">
                                    <FiCommand className="text-cyan-500" /> Ctrl/⌘ + S
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,.05)] dark:border-white/[0.08] dark:bg-[#111927]">
                            <div className="flex flex-wrap items-center gap-2">
                                <StepPill idx={1} label="Temel Bilgiler" active={step === 1} done={step > 1} />
                                <div className="hidden h-px flex-1 bg-slate-200 sm:block dark:bg-white/10" />
                                <StepPill idx={2} label="Proje & Sefer" active={step === 2} done={step > 2} />
                                <div className="hidden h-px flex-1 bg-slate-200 sm:block dark:bg-white/10" />
                                <StepPill idx={3} label="Kontrol & Kaydet" active={step === 3} done={step === 3 && !hasDuplicateSeferNo && validBasics && validProjects} />
                            </div>
                            <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700" style={{ width: `${step === 1 ? 33 : step === 2 ? 66 : 100}%` }} />
                            </div>
                        </div>

                        {mesaj && (
                            <div
                                className={clsx(
                                    "mt-3 rounded-xl px-5 py-3 text-sm font-extrabold",
                                    mesaj.includes("✅")
                                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                                        : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200"
                                )}
                            >
                                {mesaj}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-6">
                            <Card
                                icon={FiClipboard}
                                title="Excel’den Yapıştır"
                                subtitle="Ctrl+V ile yapıştır. Tarih ve lokasyon ilk satırdan alınır."
                                right={<Tag tone="info">Opsiyonel</Tag>}
                            >
                                <textarea
                                    placeholder="Excel'den verileri buraya yapıştır (Ctrl+V)"
                                    onPaste={handlePaste}
                                    className="min-h-[112px] w-full resize-y rounded-xl border border-dashed border-cyan-300 bg-cyan-50/35 p-4 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-cyan-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-cyan-500/25 dark:bg-cyan-950/10 dark:text-slate-100 dark:focus:bg-[#0b1320]"
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
                                            <label className="mb-1 flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-300">
                                                <FiCalendar /> Tarih
                                            </label>
                                            <input
                                                type="date"
                                                name="tarih"
                                                value={form.tarih}
                                                onChange={handleChange}
                                                required
                                                className={fieldClass}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-300">
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
                                                    className={selectClass}
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
                                    subtitle="En az 1 proje ve sefer sayısı girilmeli"
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
                                                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-cyan-300 hover:bg-white dark:border-white/[0.08] dark:bg-[#0b1320] dark:hover:border-cyan-500/25"
                                            >
                                                <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-center">
                                                    {loading ? (
                                                        <Skeleton className="h-[46px]" />
                                                    ) : (
                                                        <select
                                                            value={p.projeid}
                                                            onChange={(e) => handleProjeChange(i, "projeid", e.target.value)}
                                                            className={selectClass}
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
                                                        className={fieldClass}
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
                                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
                                            <div className="flex items-center gap-2 font-extrabold">
                                                <FiAlertTriangle />
                                                Mükerrer Sefer No:
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {duplicateSeferNos.map((d) => (
                                                    <span
                                                        key={d.seferno}
                                                        className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-extrabold text-red-700 dark:bg-red-900/40 dark:text-red-200"
                                                    >
                                                        {d.seferno}
                                                        <span className="ml-2 opacity-80">({d.count}x)</span>
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="mt-2 text-xs opacity-80">
                                                Karşılaştırma: boşluk ve harf duyarsız.
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {form.seferler.map((s, i) => {
                                            const isDupRow = duplicateRowIndexes.has(i);

                                            return (
                                                <div
                                                    key={i}
                                                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-cyan-300 hover:bg-white dark:border-white/[0.08] dark:bg-[#0b1320] dark:hover:border-cyan-500/25"
                                                >
                                                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                                        <div>
                                                            <label className="mb-1 flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-300">
                                                                <FiHash /> Sefer No
                                                            </label>
                                                            <input
                                                                placeholder="Sefer No"
                                                                value={s.seferno}
                                                                onChange={(e) => handleSeferChange(i, "seferno", e.target.value)}
                                                                className={clsx(
                                                                    "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-4",
                                                                    isDupRow
                                                                        ? "border-red-300 bg-red-50 text-red-800 placeholder:text-red-400 focus:ring-red-200/60 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100"
                                                                        : "border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:ring-cyan-500/10 focus:border-cyan-500 dark:border-white/[0.09] dark:bg-[#0b1320] dark:text-slate-100"
                                                                )}
                                                            />
                                                            {isDupRow && (
                                                                <div className="mt-1 text-xs font-extrabold text-red-600 dark:text-red-300">
                                                                    Bu Sefer No başka satırda da var.
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-300">
                                                                <FiType /> Açıklama
                                                            </label>
                                                            <select
                                                                value={s.aciklama}
                                                                onChange={(e) => handleSeferChange(i, "aciklama", e.target.value)}
                                                                className={selectClass}
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

                                <div className="sticky bottom-0 z-10">
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/[0.09] dark:bg-[#111927]/95">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                                                {saving ? "Kaydediliyor…" : isDirty ? "Değişiklikler kaydedilmedi." : "Her şey güncel."}
                                                {hasDuplicateSeferNo && (
                                                    <span className="ml-2 inline-block align-middle">
                                                        <Tag tone="danger">
                                                            <FiAlertTriangle /> Mükerrer Sefer No
                                                        </Tag>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <Btn variant="secondary" size="md" type="button" leftIcon={FiRefreshCw} onClick={clearAll} disabled={saving}>
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
                                            <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${validBasics ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                    Tarih ve lokasyon seçili olmalı
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${validProjects ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                    En az 1 proje ve sefer sayısı girilmeli
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

                        <aside className="hidden lg:block">
                            <div className="sticky top-6 space-y-4">
                                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.055)] dark:border-white/[0.08] dark:bg-[#111927]">
                                    <div className="border-b border-slate-200/70 bg-gradient-to-r from-slate-50 to-cyan-50/60 px-5 py-4 dark:border-white/[0.08] dark:from-[#111927] dark:to-cyan-950/20">
                                        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-50"><FiShield className="text-cyan-500" /> Kayıt Özeti</div>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Kaydetmeden önce canlı kontrol</p>
                                    </div>

                                    <div className="space-y-3 p-5 text-sm">
                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/[0.08] dark:bg-[#0b1320]">
                                            <span className="text-slate-600 dark:text-slate-300">Adım</span>
                                            <b className="text-slate-900 dark:text-white">{step}/3</b>
                                        </div>

                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/[0.08] dark:bg-[#0b1320]">
                                            <span className="text-slate-600 dark:text-slate-300">Toplam Sefer</span>
                                            <b className="text-cyan-700 dark:text-cyan-300">{toplamSeferSayisi}</b>
                                        </div>

                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/[0.08] dark:bg-[#0b1320]">
                                            <span className="text-slate-600 dark:text-slate-300">Durum</span>
                                            <b className={isDirty ? "text-amber-600 dark:text-amber-200" : "text-emerald-600 dark:text-emerald-200"}>
                                                {isDirty ? "Kaydedilmemiş" : "Güncel"}
                                            </b>
                                        </div>

                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/[0.08] dark:bg-[#0b1320]">
                                            <span className="text-slate-600 dark:text-slate-300">Mükerrer</span>
                                            <b className={hasDuplicateSeferNo ? "text-red-600 dark:text-red-300" : "text-emerald-600 dark:text-emerald-200"}>
                                                {hasDuplicateSeferNo ? "Var" : "Yok"}
                                            </b>
                                        </div>
                                    </div>

                                    <div className="mx-5 mb-5 rounded-xl border border-cyan-200/70 bg-cyan-50/70 p-4 text-xs text-slate-600 dark:border-cyan-500/15 dark:bg-cyan-950/15 dark:text-slate-300">
                                        İpucu: Excel yapıştırdıktan sonra sadece eksikleri düzenleyip <b>Ctrl/⌘+S</b> ile kaydedebilirsin.
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.055)] dark:border-white/[0.08] dark:bg-[#111927]">
                                    <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-50"><FiSave className="text-cyan-500" /> Akıllı Taslak</div>
                                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                        Değişiklikler otomatik taslak olarak saklanır. Kaydet sonrası temizlenir.
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>

                <CelebrationBurst run={showSuccess} />

                {showSuccess && (
                    <div className="fixed inset-0 z-[81] grid place-items-center">
                        <div className="absolute inset-0 bg-slate-950/35" />
                        <div className="relative z-[82] animate-pop-in rounded-3xl border border-white/10 bg-white/92 px-8 py-7 text-center shadow-2xl backdrop-blur-md dark:bg-slate-900/92">
                            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                                <FiCheckCircle className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">Kaydedildi</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                Kayıt başarıyla tamamlandı.
                            </p>
                        </div>
                    </div>
                )}

                <style>{`
          @keyframes pop-in {
            0% { transform: scale(.92); opacity: 0; }
            60% { transform: scale(1.02); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-pop-in {
            animation: pop-in .38s cubic-bezier(.18,.89,.32,1.28);
          }
        `}</style>
            </div>
        </Layout>
    );
}
