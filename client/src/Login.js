import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";

// 💡 Notlar
// - Backend mantığını değiştirmedim (tablodan kontrol). Supabase Auth kullanmak istiyorsan alta bak:
//   const { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
//     email: kullaniciAdi, // eğer email ise
//     password: sifre,
//   });
// - Aşağıdaki UI tamamen Tailwind ile. Harici kütüphane gerektirmez.

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
                {/* Arka plan */}
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />
                    <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950" />
                </div>

                {/* Sayfa içeriği */}
                <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-16">
                    <div className="w-full max-w-md">
                        {/* Kart */}
                        <div className="rounded-2xl border border-gray-200/60 bg-white/70 p-6 shadow-xl backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/60 sm:p-8">
                            <div className="mb-6 flex items-center justify-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-600 text-white shadow-md">
                                    {/* kilit ikonu */}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                                        <path d="M12 1a5 5 0 00-5 5v3H6a3 3 0 00-3 3v6a3 3 0 003 3h12a3 3 0 003-3v-6a3 3 0 00-3-3h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 016 0v3H9z" />
                                    </svg>
                                </div>
                            </div>

                            <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">🔐 Giriş Yap</h1>
                            <p className="mb-8 text-center text-sm text-gray-600 dark:text-gray-400">
                                Hoş geldin! Devam etmek için bilgilerini gir.
                            </p>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                                {/* Kullanıcı Adı */}
                                <div className="group relative">
                                    <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                                            className="peer w-full rounded-xl border border-gray-300/80 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-200 dark:border-gray-700/80 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-pink-500 dark:focus:ring-pink-900/40"
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 peer-focus:text-pink-500">
                                            {/* user icon */}
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-9 9a9 9 0 1118 0H3z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">En az 3 karakter.</p>
                                </div>

                                {/* Şifre */}
                                <div className="group relative">
                                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                                            className="peer w-full rounded-xl border border-gray-300/80 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-200 dark:border-gray-700/80 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-pink-500 dark:focus:ring-pink-900/40"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setType((t) => (t === "password" ? "text" : "password"))}
                                            aria-label={type === "password" ? "Şifreyi göster" : "Şifreyi gizle"}
                                            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 focus:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            {/* eye icon */}
                                            {type === "password" ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                                    <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                                    <path d="M2.3 1.3l20.4 20.4-1.4 1.4-3.1-3.1A13.7 13.7 0 0112 19c-7 0-10-7-10-7a20.5 20.5 0 014.8-5.9L.9 2.7 2.3 1.3zM12 7a5 5 0 013.9 8.1L8 7.3A4.9 4.9 0 0112 7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 dark:border-gray-600" />
                                            Beni hatırla
                                        </label>
                                        <a href="#" className="text-sm font-medium text-pink-600 hover:underline">Şifremi unuttum</a>
                                    </div>
                                </div>

                                {/* Hata / bilgi mesajı */}
                                {mesaj && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                                        {mesaj}
                                    </div>
                                )}

                                {/* Buton */}
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 dark:focus:ring-pink-900/50"
                                >
                                    {loading && (
                                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                    )}
                                    {loading ? "Giriş yapılıyor..." : "Giriş"}
                                </button>

                                {/* Alt bilgi */}
                                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                                    Bu site reCAPTCHA veya benzeri korumalarla güvence altında olabilir.
                                </p>
                            </form>
                        </div>

                        {/* Footer */}
                        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                            Hesabın yok mu? {" "}
                            <a href="#" className="font-semibold text-pink-600 hover:underline">
                                Kaydol
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
