import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { supabase } from './supabaseClient'; // 👈 Buraya dikkat

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
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>🔐 Giriş Yap</h2>
                <input
                    type="text"
                    value={kullaniciAdi}
                    onChange={(e) => setKullaniciAdi(e.target.value)}
                    placeholder="Kullanıcı Adı"
                    required
                />
                <input
                    type="password"
                    value={sifre}
                    onChange={(e) => setSifre(e.target.value)}
                    placeholder="Şifre"
                    required
                />
                <button type="submit">Giriş</button>
                {mesaj && <p className="mesaj">{mesaj}</p>}
            </form>
        </div>
    );
}

export default Login;
