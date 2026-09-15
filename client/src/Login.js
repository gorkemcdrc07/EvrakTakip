import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    FileSearch,
    LockKeyhole,
    Moon,
    ShieldCheck,
    Sun,
    UserRound,
    Zap,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";
import useDarkMode from "./hooks/useDarkMode";
import { touchActivity, logAudit } from "./services/operationsHub";

function BrandMark({ size = 56 }) {
    return (
        <div
            className="relative grid place-items-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20"
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <div className="absolute inset-[2px] rounded-[14px] border border-white/20 bg-white/10 backdrop-blur-sm" />
            <svg viewBox="0 0 64 64" className="relative h-[68%] w-[68%] text-white">
                <path d="M20 10h18l10 10v34H20a6 6 0 0 1-6-6V16a6 6 0 0 1 6-6Z" fill="currentColor" opacity="0.95" />
                <path d="M38 10v12h12" fill="none" stroke="#BFDBFE" strokeWidth="3" strokeLinejoin="round" />
                <path d="M23 31h18M23 39h18M23 47h12" stroke="#1E3A8A" strokeWidth="3.2" strokeLinecap="round" />
                <circle cx="44" cy="44" r="8" fill="#0EA5E9" stroke="#DBEAFE" strokeWidth="1.5" />
                <path d="m40.8 44 2.3 2.4 4.6-5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
}

function Feature({ icon: Icon, title, text }) {
    return (
        <div className="group rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-sky-300 dark:ring-blue-400/10">
                <Icon size={19} strokeWidth={2.2} />
            </div>
            <div className="text-sm font-extrabold text-slate-800 dark:text-white">{title}</div>
            <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{text}</div>
        </div>
    );
}

export default function Login() {
    const [kullaniciAdi, setKullaniciAdi] = useState("");
    const [sifre, setSifre] = useState("");
    const [mesaj, setMesaj] = useState("");
    const [type, setType] = useState("password");
    const [loading, setLoading] = useState(false);
    const [remember, setRemember] = useState(true);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [shake, setShake] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [darkMode, toggleDarkMode] = useDarkMode();
    const navigate = useNavigate();

    useEffect(() => {
        const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (!mq) return undefined;
        const onChange = () => setReduceMotion(Boolean(mq.matches));
        onChange();
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    useEffect(() => {
        const savedUser = localStorage.getItem("remember_username");
        if (savedUser) setKullaniciAdi(savedUser);
    }, []);

    const onPasswordKey = (e) => {
        if (typeof e.getModifierState === "function") setCapsLockOn(e.getModifierState("CapsLock"));
    };

    const passwordScore = useMemo(() => {
        const s = sifre || "";
        let score = 0;
        if (s.length >= 4) score += 1;
        if (s.length >= 8) score += 1;
        if (/[A-Z]/.test(s)) score += 1;
        if (/[0-9]/.test(s)) score += 1;
        if (/[^A-Za-z0-9]/.test(s)) score += 1;
        return Math.min(score, 5);
    }, [sifre]);

    const canSubmit = kullaniciAdi.trim().length >= 3 && sifre.length >= 4 && !loading;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMesaj("");
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("login")
                .select("*")
                .eq("kullaniciAdi", kullaniciAdi.trim())
                .eq("sifre", sifre);
            if (error) throw error;
            if (!data || data.length === 0) {
                setMesaj("Hatalı kullanıcı adı veya şifre.");
                setShake(true);
                window.setTimeout(() => setShake(false), 520);
                return;
            }

            let accessRow = null;
            try {
                const { data: accessData } = await supabase
                    .from("app_user_access")
                    .select("active,role")
                    .eq("username", kullaniciAdi.trim().toLocaleLowerCase("tr-TR"))
                    .maybeSingle();
                accessRow = accessData;
            } catch (accessError) {
                console.warn("Yetki profili okunamadı, eski login akışı devam ediyor.", accessError);
            }

            if (accessRow?.active === false) {
                setMesaj("Kullanıcı hesabınız pasif durumda. Yöneticinizle iletişime geçin.");
                setShake(true);
                window.setTimeout(() => setShake(false), 520);
                return;
            }

            if (remember) localStorage.setItem("remember_username", kullaniciAdi.trim());
            else localStorage.removeItem("remember_username");

            localStorage.setItem("auth", "true");
            localStorage.setItem("username", kullaniciAdi.trim().toLocaleLowerCase("tr-TR"));
            localStorage.setItem("ad", data[0].kullanici ?? kullaniciAdi);
            localStorage.setItem("role", accessRow?.role || (kullaniciAdi.trim().toLocaleLowerCase("tr-TR") === "admin" ? "admin" : "user"));
            await touchActivity("login", true);
            await logAudit("Sisteme giriş yaptı", "session", kullaniciAdi.trim(), null, null, "/login");
            navigate("/anasayfa");
        } catch (err) {
            console.error(err);
            setMesaj("Bağlantı sırasında bir sorun oluştu. Lütfen tekrar deneyin.");
            setShake(true);
            window.setTimeout(() => setShake(false), 520);
        } finally {
            setLoading(false);
        }
    };

    const scoreLabel = ["", "Zayıf", "Orta", "İyi", "Güçlü", "Çok güçlü"][passwordScore];

    return (
        <Layout>
            <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#07111F] dark:text-white">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl dark:bg-sky-500/10" />
                    <div className="absolute right-[-6rem] top-1/3 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-500/10" />
                    <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-500/5" />
                    <div className="absolute inset-0 opacity-[0.32] dark:opacity-[0.12] [background-image:linear-gradient(rgba(15,23,42,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.06)_1px,transparent_1px)] [background-size:36px_36px] dark:[background-image:linear-gradient(rgba(148,163,184,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.08)_1px,transparent_1px)]" />
                </div>

                <button
                    type="button"
                    onClick={toggleDarkMode}
                    className="absolute right-5 top-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm backdrop-blur transition hover:scale-105 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                    aria-label={darkMode ? "Açık temaya geç" : "Koyu temaya geç"}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
                    <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white/80 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-black/30 lg:grid-cols-[1.08fr_.92fr]">
                        <section className="relative hidden min-h-[720px] overflow-hidden p-10 lg:block">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#0B1730] via-[#10264C] to-[#0A1730]" />
                            <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(125,211,252,.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(96,165,250,.14),transparent_26%),radial-gradient(circle_at_50%_90%,rgba(14,165,233,.12),transparent_32%)]" />
                            <div className="absolute left-8 top-8 h-40 w-40 rounded-full border border-white/10" />
                            <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full border border-white/5" />

                            <div className="relative flex h-full flex-col">
                                <div className="flex items-center gap-4">
                                    <BrandMark size={64} />
                                    <div>
                                        <div className="text-xs font-bold tracking-[0.22em] text-sky-300">ODAK LOJİSTİK</div>
                                        <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Evrak Takip Sistemi</h1>
                                    </div>
                                </div>

                                <div className="mt-16 max-w-xl">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-xs font-bold text-sky-100">
                                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                        Operasyon merkezi
                                    </div>
                                    <h2 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight text-white">
                                        Evraklarını yönet.
                                        <br />
                                        Operasyonu hızlandır.
                                    </h2>
                                    <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
                                        Kargo, toplu evrak, raporlama ve ticket süreçlerini tek bir çalışma alanında güvenli ve hızlı şekilde yönetin.
                                    </p>
                                </div>

                                <div className="mt-12 grid max-w-xl grid-cols-2 gap-4">
                                    <Feature icon={FileSearch} title="Akıllı Evrak Arama" text="Sefer, irsaliye, lokasyon ve açıklamaya göre anında bulun." />
                                    <Feature icon={ShieldCheck} title="Güvenli Erişim" text="Rol bazlı yetkilendirme ve kayıt altına alınan işlemler." />
                                    <Feature icon={Zap} title="Hızlı Operasyon" text="Bekleyen işlemleri, bildirimleri ve görevleri tek yerden yönetin." />
                                    <Feature icon={CheckCircle2} title="Canlı Takip" text="Evrak ve kargo hareketlerini düzenli ve izlenebilir biçimde takip edin." />
                                </div>

                                <div className="mt-auto flex items-center gap-3 pt-10 text-sm text-slate-400">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5"><ShieldCheck size={17} /></span>
                                    <span>Kurumsal operasyon platformu • Güvenli oturum</span>
                                </div>
                            </div>
                        </section>

                        <section className="flex min-h-[720px] items-center justify-center p-5 sm:p-8 lg:p-12">
                            <div className="w-full max-w-md">
                                <div className="mb-10 flex items-center justify-between lg:hidden">
                                    <div className="flex items-center gap-3">
                                        <BrandMark size={48} />
                                        <div>
                                            <div className="text-[10px] font-bold tracking-[0.18em] text-blue-600 dark:text-sky-300">ODAK LOJİSTİK</div>
                                            <div className="font-extrabold text-slate-900 dark:text-white">Evrak Takip Sistemi</div>
                                        </div>
                                    </div>
                                </div>

                                <div className={shake ? "animate-[shake_520ms_ease-in-out]" : ""}>
                                    <div className="mb-8">
                                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-sky-400/10 dark:text-sky-300">
                                            <LockKeyhole size={14} /> Güvenli giriş
                                        </div>
                                        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Tekrar hoş geldin</h2>
                                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Operasyon paneline erişmek için kullanıcı bilgilerinle giriş yap.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                        <div>
                                            <label htmlFor="username" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">Kullanıcı adı</label>
                                            <div className="relative">
                                                <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                                                <input
                                                    id="username"
                                                    type="text"
                                                    autoComplete="username"
                                                    value={kullaniciAdi}
                                                    onChange={(e) => setKullaniciAdi(e.target.value)}
                                                    placeholder="Kullanıcı adınızı yazın"
                                                    required
                                                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="mb-2 flex items-center justify-between">
                                                <label htmlFor="password" className="text-sm font-bold text-slate-700 dark:text-slate-200">Şifre</label>
                                                <button type="button" className="text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-sky-300 dark:hover:text-sky-200" onClick={() => setMesaj("Şifremi unuttum akışı henüz eklenmedi.")}>Şifremi unuttum</button>
                                            </div>
                                            <div className="relative">
                                                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                                                <input
                                                    id="password"
                                                    type={type}
                                                    autoComplete="current-password"
                                                    value={sifre}
                                                    onChange={(e) => setSifre(e.target.value)}
                                                    onKeyUp={onPasswordKey}
                                                    placeholder="Şifrenizi yazın"
                                                    required
                                                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setType((t) => (t === "password" ? "text" : "password"))}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                                                    aria-label={type === "password" ? "Şifreyi göster" : "Şifreyi gizle"}
                                                >
                                                    {type === "password" ? <Eye size={19} /> : <EyeOff size={19} />}
                                                </button>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300" style={{ width: `${(passwordScore / 5) * 100}%` }} />
                                                </div>
                                                <span className="min-w-[72px] text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{sifre ? scoreLabel : ""}</span>
                                            </div>
                                            {capsLockOn && <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">Caps Lock açık</div>}
                                        </div>

                                        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-white/20 dark:bg-white/5" />
                                            Beni hatırla
                                        </label>

                                        {mesaj && (
                                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
                                                {mesaj}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={!canSubmit}
                                            className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 text-sm font-extrabold text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-blue-500/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <><svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" /><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg> Giriş yapılıyor...</>
                                            ) : (
                                                <>Giriş Yap <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" /></>
                                            )}
                                        </button>
                                    </form>

                                    <div className="my-8 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                                        Güvenli kurumsal oturum
                                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        {[
                                            [ShieldCheck, "Yetkili erişim"],
                                            [CheckCircle2, "İşlem kayıtları"],
                                            [FileSearch, "Akıllı arama"],
                                        ].map(([Icon, text]) => (
                                            <div key={text} className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 dark:border-white/10 dark:bg-white/[0.035]">
                                                <Icon size={18} className="mx-auto text-blue-600 dark:text-sky-300" />
                                                <div className="mt-1 text-[10px] font-bold leading-4 text-slate-500 dark:text-slate-400">{text}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="mt-7 text-center text-xs leading-5 text-slate-400 dark:text-slate-500">© 2026 Odak Lojistik • Evrak Takip Sistemi</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {!reduceMotion && (
                    <style>{`
                        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
                    `}</style>
                )}
            </div>
        </Layout>
    );
}
