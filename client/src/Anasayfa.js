import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Anasayfa.css';

function Anasayfa() {
    const navigate = useNavigate();
    const adSoyad = localStorage.getItem('ad');
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('auth');
        localStorage.removeItem('username');
        localStorage.removeItem('ad');
        navigate('/login');
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <div className="page">
            {/* Yan Menü */}
            <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
                <button className="close-btn" onClick={toggleMenu}>✖</button>

                {/* Yeni sekmede açılan butonlar */}
                <button onClick={() => window.open('/lokasyonlar', '_blank')}>📍 Lokasyonlar</button>
                <button onClick={() => window.open('/projeler', '_blank')}>📁 Projeler</button>
                <button onClick={() => window.open('/evrak-ekle', '_blank')}>📄 Evrak Ekle</button>
            </div>

            {/* Üst Menü */}
            <nav className="navbar">
                <button className="hamburger" onClick={toggleMenu}>☰</button>
                <div className="navbar-title">📁 Evrak Takip Sistemi</div>
                <div className="navbar-user">
                    <span>{adSoyad}</span>
                    <button onClick={handleLogout}>Çıkış</button>
                </div>
            </nav>

            {/* İçerik */}
            <main className="content">
                <h2>🎉 Hoş geldin, {adSoyad}!</h2>
                <p>Bu sayfa sadece giriş yapan kullanıcılar içindir.</p>
            </main>
        </div>
    );
}

export default Anasayfa;
