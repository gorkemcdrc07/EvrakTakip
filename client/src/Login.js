import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";

function ETSLogo({ className = "h-10 w-10" }) {
    return (
        <div className={`relative ${className}`} aria-hidden="true">
            <svg viewBox="0 0 64 64" className="h-full w-full">
                {/* Outer ring */}
                <path
                    d="M32 6c14.36 0 26 11.64 26 26S46.36 58 32 58 6 46.36 6 32 17.64 6 32 6Z"
                    fill="rgba(168,85,247,0.10)"          /* purple-500-ish */
                    stroke="rgba(216,180,254,0.22)"       /* purple-200-ish */
                    strokeWidth="2"
                />
                {/* Document */}
                <path
                    d="M22 18h14l6 6v22a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4Z"
                    fill="rgba(255,255,255,0.06)"
                    stroke="rgba(216,180,254,0.22)"
                    strokeWidth="1.5"
                />
                <path
                    d="M36 18v6h6"
                    fill="none"
                    stroke="rgba(216,180,254,0.22)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                {/* Lines */}
                <path
                    d="M24 30h16M24 36h16M24 42h12"
                    stroke="rgba(233,213,255,0.55)"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                {/* Check badge */}
                <circle cx="44" cy="44" r="8" fill="rgba(168,85,247,0.14)" stroke="rgba(216,180,254,0.25)" />
                <path
                    d="M40.8 44.2l2.2 2.2 4.6-5"
                    fill="none"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>

            {/* purple glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl blur-[16px] bg-fuchsia-500/15" />
        </div>
    );
}

export default function Login() {
    const [kullaniciAdi, setKullaniciAdi] = useState("");
    const [sifre, setSifre] = useState("");
    const [mesaj, setMesaj] = useState("");
    const [type, setType] = useState("password");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // UI only
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [shake, setShake] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (!mq) return;
        const onChange = () => setReduceMotion(!!mq.matches);
        onChange();
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    const onPasswordKey = (e) => {
        if (typeof e.getModifierState === "function") {
            setCapsLockOn(e.getModifierState("CapsLock"));
        }
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
            // ⚠️ Bu kısım (düz şifre) güvenli değil; UI işini bitirince Supabase Auth'a taşıyalım.
            const { data, error } = await supabase
                .from("login")
                .select("*")
                .eq("kullaniciAdi", kullaniciAdi.trim())
                .eq("sifre", sifre);

            if (error) throw error;

            if (!data || data.length === 0) {
                setMesaj("❌ Hatalı kullanıcı adı veya şifre");
                setShake(true);
                setTimeout(() => setShake(false), 520);
                return;
            }

            localStorage.setItem("auth", "true");
            localStorage.setItem("username", kullaniciAdi);
            localStorage.setItem("ad", data[0].kullanici ?? kullaniciAdi);
            navigate("/anasayfa");
        } catch (err) {
            console.error(err);
            setMesaj("⚠️ Bir şeyler ters gitti. Lütfen tekrar deneyin.");
            setShake(true);
            setTimeout(() => setShake(false), 520);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="relative min-h-screen overflow-hidden bg-[#05020b] text-white">
                {/* Purple dark background */}
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(168,85,247,0.18),transparent_55%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_80%_90%,rgba(236,72,153,0.14),transparent_55%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_50%_120%,rgba(139,92,246,0.10),transparent_60%)]" />

                    {/* subtle grid */}
                    <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(to_right,rgba(233,213,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(233,213,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />

                    {/* floating blobs */}
                    <div
                        className={[
                            "absolute -top-48 left-1/3 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[140px]",
                            "bg-purple-500/18",
                            !reduceMotion ? "animate-[floatSoft_12s_ease-in-out_infinite]" : "",
                        ].join(" ")}
                    />
                    <div
                        className={[
                            "absolute -bottom-56 left-2/3 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-[150px]",
                            "bg-fuchsia-500/14",
                            !reduceMotion ? "animate-[floatSoft2_14s_ease-in-out_infinite]" : "",
                        ].join(" ")}
                    />
                </div>

                <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12">
                    <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
                        {/* Left panel */}
                        <div className="hidden lg:block">
                            <div className="mb-6 flex items-center gap-4">
                                <ETSLogo className="h-12 w-12" />
                                <div>
                                    <div className="text-sm font-semibold tracking-wide text-white/70">ETS</div>
                                    <h2 className="text-3xl font-extrabold tracking-tight">
                                        Evrak Takip Sistemi
                                    </h2>
                                </div>
                            </div>

                            <p className="max-w-xl text-base leading-relaxed text-white/70">
                                Kayıt, zimmet, durum takibi ve arşiv tek panelde. Mor tonlu koyu tema ile modern,
                                premium bir yönetim ekranı.
                            </p>

                            <div className="mt-8 grid max-w-xl grid-cols-2 gap-4">
                                {[
                                    { title: "Hızlı Arama", desc: "Evrak / kişi / referans." },
                                    { title: "Durum Akışı", desc: "Onay–iade–tamamlandı." },
                                    { title: "Arşiv & Log", desc: "İşlem geçmişi kayıtlı." },
                                    { title: "Yetkilendirme", desc: "Rol bazlı erişim." },
                                ].map((x) => (
                                    <div
                                        key={x.title}
                                        className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/40"
                                    >
                                        <div className="text-sm font-extrabold">{x.title}</div>
                                        <div className="mt-1 text-sm text-white/60">{x.desc}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 flex flex-wrap items-center gap-2 text-xs text-white/55">
                                {["KVKK uyumlu süreç", "Audit log", "Kurumsal UI"].map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Login card */}
                        <div className="flex justify-center lg:justify-end">
                            <div className="w-full max-w-md">
                                <div
                                    className={[
                                        "relative overflow-hidden rounded-3xl border border-white/10 p-8 sm:p-10",
                                        "bg-white/[0.055] shadow-2xl shadow-black/60 backdrop-blur-xl",
                                        !reduceMotion ? "animate-[enter_420ms_ease-out]" : "",
                                        shake ? "animate-[shake_520ms_ease-in-out]" : "",
                                    ].join(" ")}
                                >
                                    {/* top hairline + subtle purple */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-200/25 to-transparent" />

                                    {/* header */}
                                    <div className="mb-8 flex flex-col items-center">
                                        <div className="mb-4 flex items-center gap-3">
                                            <ETSLogo className="h-12 w-12" />
                                            <div className="lg:hidden">
                                                <div className="text-xs font-semibold tracking-wide text-white/60">ETS</div>
                                                <div className="text-lg font-extrabold">Evrak Takip Sistemi</div>
                                            </div>
                                        </div>

                                        <h1 className="text-center text-3xl font-extrabold tracking-tight">
                                            Giriş Yap
                                        </h1>
                                        <p className="mt-2 text-center text-sm text-white/60">
                                            Paneline erişmek için bilgilerini gir.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                                        {/* Username */}
                                        <div className="relative">
                                            <input
                                                id="username"
                                                type="text"
                                                autoComplete="username"
                                                value={kullaniciAdi}
                                                onChange={(e) => setKullaniciAdi(e.target.value)}
                                                placeholder=" "
                                                required
                                                className="peer w-full rounded-2xl border border-white/10 bg-black/25 px-4 pb-3 pt-5 text-white outline-none transition
                          placeholder:text-transparent
                          focus:border-fuchsia-200/30 focus:ring-4 focus:ring-fuchsia-300/10"
                                            />
                                            <label
                                                htmlFor="username"
                                                className="pointer-events-none absolute left-4 top-4 origin-left text-sm text-white/55 transition-all
                          peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
                          peer-focus:-top-2 peer-focus:text-xs peer-focus:text-white/75
                          peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs"
                                            >
                                                Kullanıcı Adı
                                            </label>
                                            <p className="mt-1 text-xs text-white/45">En az 3 karakter.</p>
                                        </div>

                                        {/* Password */}
                                        <div className="relative">
                                            <input
                                                id="password"
                                                type={type}
                                                autoComplete="current-password"
                                                value={sifre}
                                                onChange={(e) => setSifre(e.target.value)}
                                                onKeyUp={onPasswordKey}
                                                placeholder=" "
                                                required
                                                className="peer w-full rounded-2xl border border-white/10 bg-black/25 px-4 pb-3 pt-5 text-white outline-none transition
                          placeholder:text-transparent
                          focus:border-fuchsia-200/30 focus:ring-4 focus:ring-fuchsia-300/10"
                                            />
                                            <label
                                                htmlFor="password"
                                                className="pointer-events-none absolute left-4 top-4 origin-left text-sm text-white/55 transition-all
                          peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
                          peer-focus:-top-2 peer-focus:text-xs peer-focus:text-white/75
                          peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs"
                                            >
                                                Şifre
                                            </label>

                                            <button
                                                type="button"
                                                onClick={() => setType((t) => (t === "password" ? "text" : "password"))}
                                                aria-label={type === "password" ? "Şifreyi göster" : "Şifreyi gizle"}
                                                className="absolute inset-y-0 right-3 flex items-center rounded-xl px-2 text-white/55 transition hover:text-white/90 focus:text-white/90"
                                            >
                                                {type === "password" ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M12 5.25c-4.72 0-9 4.39-9 7.75s4.28 7.75 9 7.75 9-4.39 9-7.75-4.28-7.75-9-7.75zM12 17a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M2.308 1.488a.75.75 0 10-1.06 1.06L4.5 5.71a10.884 10.884 0 00-3.328 6.04c0 3.36 4.28 7.75 9 7.75 2.193 0 4.26-.554 6.04-1.503l3.208 3.208a.75.75 0 101.06-1.06L3.368 1.488a.75.75 0 00-1.06 0zM12 17a4.5 4.5 0 01-3.6-7.228l.582.583a4.502 4.502 0 005.106-5.105l.582-.582A4.5 4.5 0 0112 17z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                )}
                                            </button>

                                            <div className="mt-2 flex items-center justify-between gap-3">
                                                <div className="flex flex-1 items-center gap-2">
                                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-400/50 via-fuchsia-300/50 to-purple-400/50"
                                                            style={{ width: `${(passwordScore / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-white/45">Güç</span>
                                                </div>

                                                {capsLockOn && (
                                                    <span className="rounded-full border border-fuchsia-200/20 bg-fuchsia-500/10 px-2 py-1 text-xs text-white/75">
                                                        Caps Lock açık
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <label className="flex items-center gap-2 text-sm text-white/65">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-white/20 bg-white/5 text-fuchsia-200 focus:ring-2 focus:ring-fuchsia-300/15"
                                                    />
                                                    Beni hatırla
                                                </label>
                                                <button
                                                    type="button"
                                                    className="text-sm font-semibold text-white/70 hover:text-white hover:underline"
                                                    onClick={() => setMesaj("🔐 Şifremi unuttum akışı eklenmedi (istersen ekleyelim).")}
                                                >
                                                    Şifremi unuttum
                                                </button>
                                            </div>
                                        </div>

                                        {mesaj && (
                                            <div className="rounded-2xl border border-fuchsia-200/15 bg-fuchsia-500/10 px-4 py-3 text-sm text-white/90">
                                                {mesaj}
                                            </div>
                                        )}

                                        {/* Purple primary button */}
                                        <button
                                            type="submit"
                                            disabled={!canSubmit}
                                            className="group relative inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-extrabold
                        text-white shadow-lg shadow-black/50 transition
                        focus:outline-none focus:ring-4 focus:ring-fuchsia-300/15
                        disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/95 via-fuchsia-600/90 to-purple-600/95" />
                                            <span className="absolute inset-0 rounded-2xl opacity-0 blur-md transition group-hover:opacity-100 bg-gradient-to-r from-purple-500/40 via-fuchsia-500/35 to-purple-500/40" />
                                            <span className="relative">
                                                {loading ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                        </svg>
                                                        Giriş Yapılıyor…
                                                    </span>
                                                ) : (
                                                    "Giriş Yap"
                                                )}
                                            </span>
                                        </button>

                                        <div className="mt-1 flex items-center justify-between text-xs text-white/45">
                                            <span>Oturum güvenli şekilde başlatılır.</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">v1.0</span>
                                        </div>

                                        <p className="text-center text-xs text-white/35">
                                            Bu site reCAPTCHA veya benzeri korumalarla güvence altında olabilir.
                                        </p>
                                    </form>

                                    <p className="mt-8 text-center text-sm text-white/55">
                                        Hesabın yok mu?{" "}
                                        <button
                                            type="button"
                                            className="font-extrabold text-white/80 hover:text-white hover:underline"
                                            onClick={() => setMesaj("🧩 Kayıt ekranı eklenmedi (istersen /kayit route’u yapalım).")}
                                        >
                                            Hemen Kaydol
                                        </button>
                                    </p>
                                </div>

                                <p className="mt-4 text-center text-xs text-white/35">
                                    İpucu: Kullanıcı adını yazıp Enter’a basabilirsin.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
          @keyframes enter {
            from { opacity: 0; transform: translateY(10px) scale(0.99); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
            20%, 40%, 60%, 80% { transform: translateX(6px); }
          }
          @keyframes floatSoft {
            0%, 100% { transform: translate3d(-50%, 0, 0); }
            50% { transform: translate3d(-50%, 12px, 0); }
          }
          @keyframes floatSoft2 {
            0%, 100% { transform: translate3d(-50%, 0, 0); opacity: 0.85; }
            50% { transform: translate3d(-50%, -14px, 0); opacity: 1; }
          }
        `}</style>
            </div>
        </Layout>
    );
}