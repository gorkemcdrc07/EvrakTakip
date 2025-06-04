import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';

function Login() {
    const [kullaniciAdi, setKullaniciAdi] = useState('');
    const [sifre, setSifre] = useState('');
    const [mesaj, setMesaj] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase
            .from('login')
            .select('*')
            .eq('kullaniciAdi', kullaniciAdi)
            .eq('sifre', sifre);

        if (error) {
            console.error(error);
            setMesaj('⚠️ Veritabanı hatası');
        } else if (data.length === 0) {
            setMesaj('❌ Hatalı kullanıcı adı veya şifre');
        } else {
            localStorage.setItem('auth', 'true');
            localStorage.setItem('username', kullaniciAdi);
            localStorage.setItem('ad', data[0].kullanici);
            navigate('/anasayfa');
        }
    };

    return (
        <Layout>
            <div className="min-h-screen flex items-center justify-center px-4">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-sm bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg flex flex-col gap-5"
                >
                    <h2 className="text-center text-2xl font-semibold text-gray-800 dark:text-gray-200">🔐 Giriş Yap</h2>

                    <input
                        type="text"
                        value={kullaniciAdi}
                        onChange={(e) => setKullaniciAdi(e.target.value)}
                        placeholder="Kullanıcı Adı"
                        required
                        className="px-4 py-3 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                    />

                    <input
                        type="password"
                        value={sifre}
                        onChange={(e) => setSifre(e.target.value)}
                        placeholder="Şifre"
                        required
                        className="px-4 py-3 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                    />

                    <button
                        type="submit"
                        className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded transition-colors duration-200"
                    >
                        Giriş
                    </button>

                    {mesaj && (
                        <p className="text-center text-sm text-red-600 dark:text-red-400 mt-1 select-none">
                            {mesaj}
                        </p>
                    )}
                </form>
            </div>
        </Layout>
    );
}

export default Login;
