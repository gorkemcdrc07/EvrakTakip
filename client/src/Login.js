import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";

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

    const canSubmit = kullaniciAdi.trim().length >= 3 && sifre.length >= 4 && !loading;

    // UI: reduce motion
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

    // UI: şifre “güç” barı (minimal, rengi abartmadan)
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

    return (
        <Layout>
            <div className="relative min-h-screen overflow-hidden bg-zinc-950">
                {/* Subtle dark background (minimal color) */}
                <div className="pointer-events-none absolute inset-0 -z-10">
                    {/* base */}
                    <div className="absolute inset-0 bg-zinc-950" />

                    {/* soft vignette */}
                    <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_30%,rgba(255,255,255,0.06),transparent_55%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_110%,rgba(255,255,255,0.05),transparent_55%)]" />

                    {/* subtle grid (very low contrast) */}
                    <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />

                    {/* a very soft “spot” that moves a bit */}
                    <div
                        className={[
                            "absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full blur-[120px]",
                            "bg-white/8",
                            !reduceMotion ? "animate-[floatSoft_10s_ease-in-out_infinite]" : "",
                        ].join(" ")}
                    />
                </div>

                <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-16">
                    <div className="w-full max-w-md">
                        <div
                            className={[
                                "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-10",
                                !reduceMotion ? "animate-[enter_420ms_ease-out]" : "",
                                shake ? "animate-[shake_520ms_ease-in-out]" : "",
                            ].join(" ")}
                        >
                            {/* top hairline */}
                            <div className="absolute inset-x-0 top-0 h-px bg-white/15" />

                            {/* header */}
                            <div className="mb-8 flex flex-col items-center">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg shadow-black/40">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                                        <path
                                            fillRule="evenodd"
                                            d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6a3 3 0 003 3h10.5a3 3 0 003-3v-6a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3 8.25V6.75a3 3 0 10-6 0v3h6z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>

                                <h1 className="text-center text-3xl font-extrabold tracking-tight text-white">
                                    Giriş Yap
                                </h1>
                                <p className="mt-2 text-center text-sm text-white/60">
                                    Hesabına erişmek için bilgilerini gir.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                                {/* Kullanıcı Adı (clean floating label) */}
                                <div className="relative">
                                    <input
                                        id="username"
                                        type="text"
                                        autoComplete="username"
                                        value={kullaniciAdi}
                                        onChange={(e) => setKullaniciAdi(e.target.value)}
                                        placeholder=" "
                                        required
                                        className="peer w-full rounded-2xl border border-white/10 bg-black/20 px-4 pb-3 pt-5 text-white outline-none transition
                               placeholder:text-transparent
                               focus:border-white/25 focus:ring-4 focus:ring-white/10"
                                    />
                                    <label
                                        htmlFor="username"
                                        className="pointer-events-none absolute left-4 top-4 origin-left text-sm text-white/50 transition-all
                               peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
                               peer-focus:-top-2 peer-focus:text-xs peer-focus:text-white/70
                               peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs"
                                    >
                                        Kullanıcı Adı
                                    </label>

                                    <p className="mt-1 text-xs text-white/45">En az 3 karakter.</p>
                                </div>

                                {/* Şifre */}
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
                                        className="peer w-full rounded-2xl border border-white/10 bg-black/20 px-4 pb-3 pt-5 text-white outline-none transition
                               placeholder:text-transparent
                               focus:border-white/25 focus:ring-4 focus:ring-white/10"
                                    />
                                    <label
                                        htmlFor="password"
                                        className="pointer-events-none absolute left-4 top-4 origin-left text-sm text-white/50 transition-all
                               peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
                               peer-focus:-top-2 peer-focus:text-xs peer-focus:text-white/70
                               peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs"
                                    >
                                        Şifre
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setType((t) => (t === "password" ? "text" : "password"))}
                                        aria-label={type === "password" ? "Şifreyi göster" : "Şifreyi gizle"}
                                        className="absolute inset-y-0 right-3 flex items-center rounded-xl px-2 text-white/50 transition hover:text-white/80 focus:text-white/80"
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

                                    {/* minimal strength + capslock */}
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <div className="flex flex-1 items-center gap-2">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className="h-full bg-white/35"
                                                    style={{ width: `${(passwordScore / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-white/45">Güç</span>
                                        </div>

                                        {capsLockOn && (
                                            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/65">
                                                Caps Lock açık
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm text-white/60">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-white/20 bg-white/5 text-white focus:ring-2 focus:ring-white/10"
                                            />
                                            Beni hatırla
                                        </label>
                                        <a href="#" className="text-sm font-semibold text-white/70 hover:text-white hover:underline">
                                            Şifremi unuttum
                                        </a>
                                    </div>
                                </div>

                                {/* Message */}
                                {mesaj && (
                                    <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">
                                        {mesaj}
                                    </div>
                                )}

                                {/* Submit (minimal, premium) */}
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="relative inline-flex w-full items-center justify-center gap-2 rounded-2xl
                             bg-white text-zinc-950 px-4 py-3 font-extrabold
                             shadow-lg shadow-black/40 transition
                             hover:bg-white/90 active:scale-[0.99]
                             focus:outline-none focus:ring-4 focus:ring-white/15
                             disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                            </svg>
                                            Giriş Yapılıyor…
                                        </>
                                    ) : (
                                        "Giriş Yap"
                                    )}
                                </button>

                                <p className="text-center text-xs text-white/40">
                                    Bu site reCAPTCHA veya benzeri korumalarla güvence altında olabilir.
                                </p>
                            </form>

                            {/* Footer */}
                            <p className="mt-8 text-center text-sm text-white/55">
                                Hesabın yok mu?{" "}
                                <a href="#" className="font-extrabold text-white/80 hover:text-white hover:underline">
                                    Hemen Kaydol
                                </a>
                            </p>
                        </div>

                        <p className="mt-4 text-center text-xs text-white/35">
                            İpucu: Kullanıcı adını yazıp Enter’a basabilirsin.
                        </p>
                    </div>
                </div>

                {/* Local keyframes (Tailwind config gerekmeden) */}
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
            50% { transform: translate3d(-50%, 10px, 0); }
          }
        `}</style>
            </div>
        </Layout>
    );
}