import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";

// 💡 Not: İş mantığı (state'ler ve handleSubmit) tamamen aynı kalmıştır.
// 💡 Not: Kullanılan tüm stiller Tailwind CSS'tir.

export default function Login() {
    const [kullaniciAdi, setKullaniciAdi] = useState("");
    const [sifre, setSifre] = useState("");
    const [mesaj, setMesaj] = useState("");
    const [type, setType] = useState("password");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMesaj("");
        setLoading(true);

        try {
            // ❗ Mevcut tablo bazlı doğrulama (güvenlik açısından önerilmez)
            const { data, error } = await supabase
                .from("login")
                .select("*")
                .eq("kullaniciAdi", kullaniciAdi.trim())
                .eq("sifre", sifre);

            if (error) throw error;

            if (!data || data.length === 0) {
                setMesaj("❌ Hatalı kullanıcı adı veya şifre");
                return;
            }

            // ✅ Başarılı giriş
            localStorage.setItem("auth", "true");
            localStorage.setItem("username", kullaniciAdi);
            localStorage.setItem("ad", data[0].kullanici ?? kullaniciAdi);
            navigate("/anasayfa");
        } catch (err) {
            console.error(err);
            setMesaj("⚠️ Bir şeyler ters gitti. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = kullaniciAdi.trim().length >= 3 && sifre.length >= 4 && !loading;

    return (
        <Layout>
            <div className="relative min-h-screen overflow-hidden">
                {/* Arka plan: Daha sofistike bir gradyan ve merkezde hafif parlama (radial gradient) */}
                <div className="pointer-events-none absolute inset-0 -z-10">
                    {/* Arka plan ışık noktaları - daha hafif tonlar */}
                    <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-fuchsia-400/10 blur-[100px]" />
                    {/* Sayfayı kaplayan arka plan gradyanı */}
                    <div className="absolute inset-0 bg-gray-50 dark:bg-gray-950/95" />
                    {/* Merkezi radial gradyan - sayfaya derinlik katmak için */}
                    <div className="absolute inset-0 bg-radial-at-t from-gray-50/20 to-transparent dark:from-gray-950/20" />
                </div>

                {/* Sayfa içeriği */}
                <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-16">
                    <div className="w-full max-w-sm">
                        {/* Kart: Daha yuvarlak hatlar, daha güçlü gölge ve daha az şeffaflık */}
                        <div className="rounded-3xl border border-gray-200/50 bg-white/80 p-8 shadow-2xl backdrop-blur-md dark:border-gray-800/50 dark:bg-gray-900/80 sm:p-10">
                            <div className="mb-8 flex flex-col items-center">
                                {/* Kilit İkonu: Daha canlı bir renk ve dolgun gölge */}
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/50 dark:shadow-indigo-500/50">
                                    {/* kilit ikonu */}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6a3 3 0 003 3h10.5a3 3 0 003-3v-6a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3 8.25V6.75a3 3 0 10-6 0v3h6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <h1 className="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">Hoş Geldin!</h1>
                                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                                    Hesabına erişmek için bilgilerinle giriş yap.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                                {/* Kullanıcı Adı */}
                                <div className="group relative">
                                    <label htmlFor="username" className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Kullanıcı Adı
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="username"
                                            type="text"
                                            autoComplete="username"
                                            value={kullaniciAdi}
                                            onChange={(e) => setKullaniciAdi(e.target.value)}
                                            placeholder="kullanici_adin"
                                            required
                                            // Yeni Stil: Daha belirgin focus halkası ve modern kenarlık
                                            className="peer w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 peer-focus:text-indigo-500">
                                            {/* user icon */}
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">En az 3 karakter.</p>
                                </div>

                                {/* Şifre */}
                                <div className="group relative">
                                    <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Şifre
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={type}
                                            autoComplete="current-password"
                                            value={sifre}
                                            onChange={(e) => setSifre(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            // Yeni Stil: Daha belirgin focus halkası ve modern kenarlık
                                            className="peer w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setType((t) => (t === "password" ? "text" : "password"))}
                                            aria-label={type === "password" ? "Şifreyi göster" : "Şifreyi gizle"}
                                            className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition hover:text-indigo-600 focus:text-indigo-600 dark:hover:text-gray-200"
                                        >
                                            {/* eye icon */}
                                            {type === "password" ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                                    <path fillRule="evenodd" d="M12 5.25c-4.72 0-9 4.39-9 7.75s4.28 7.75 9 7.75 9-4.39 9-7.75-4.28-7.75-9-7.75zM12 17a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                                    <path fillRule="evenodd" d="M2.308 1.488a.75.75 0 10-1.06 1.06L4.5 5.71a10.884 10.884 0 00-3.328 6.04c0 3.36 4.28 7.75 9 7.75 2.193 0 4.26-.554 6.04-1.503l3.208 3.208a.75.75 0 101.06-1.06L3.368 1.488a.75.75 0 00-1.06 0zM6.92 11.25a.75.75 0 011.06 0l1.838 1.839a.75.75 0 01-.782 1.31L8.51 13.5l-.265-.133a.75.75 0 01-.325-.794zM12 17a4.5 4.5 0 01-3.6-7.228l.582.583a4.502 4.502 0 005.106-5.105l.582-.582A4.5 4.5 0 0112 17z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600" />
                                            Beni hatırla
                                        </label>
                                        <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 hover:underline">Şifremi unuttum</a>
                                    </div>
                                </div>

                                {/* Hata / bilgi mesajı */}
                                {mesaj && (
                                    <div className="rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 shadow-sm transition">
                                        {mesaj}
                                    </div>
                                )}

                                {/* Buton: Daha canlı gradyan, yumuşak geçiş ve gölge */}
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 font-bold text-white shadow-lg shadow-indigo-500/40 transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 hover:from-fuchsia-700 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-900/50"
                                >
                                    {loading ? (
                                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                    ) : (
                                        "Giriş Yap"
                                    )}
                                </button>

                                {/* Alt bilgi */}
                                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                                    Bu site reCAPTCHA veya benzeri korumalarla güvence altında olabilir.
                                </p>
                            </form>
                        </div>

                        {/* Footer */}
                        <p className="mt-8 text-center text-base text-gray-600 dark:text-gray-400">
                            Hesabın yok mu? {" "}
                            <a href="#" className="font-bold text-indigo-600 transition hover:text-indigo-500 hover:underline">
                                Hemen Kaydol
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}