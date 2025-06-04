import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './components/Layout'; // Yol projenin yapısına göre değişebilir

function Anasayfa() {
    const navigate = useNavigate();
    const adSoyad = localStorage.getItem('ad');
    const [menuOpen, setMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const handleLogout = () => {
        localStorage.removeItem('auth');
        localStorage.removeItem('username');
        localStorage.removeItem('ad');
        navigate('/login');
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const newMode = !prev;
            localStorage.setItem('theme', newMode ? 'dark' : 'light');
            return newMode;
        });
    };

    return (
        <Layout>
            <div className="min-h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                {/* Sidebar */}
                <div
                    className={`fixed top-0 left-0 h-full w-64 bg-pink-100 dark:bg-gray-800 shadow-md p-4 transform transition-transform duration-300 z-50 ${menuOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <button
                        className="text-gray-600 dark:text-gray-300 text-xl self-end"
                        onClick={toggleMenu}
                    >
                        ✖
                    </button>

                    <div className="flex flex-col gap-4 mt-4">
                        <button
                            onClick={() => window.open('/lokasyonlar', '_blank')}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left"
                        >
                            📍 Lokasyonlar
                        </button>
                        <button
                            onClick={() => window.open('/projeler', '_blank')}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left"
                        >
                            📁 Projeler
                        </button>
                        <button
                            onClick={() => window.open('/evrak-ekle', '_blank')}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left"
                        >
                            📄 Evrak Ekle
                        </button>
                        <button
                            onClick={() => window.open('/toplu-evraklar', '_blank')}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded text-left"
                        >
                            📄 Tüm Evraklar
                        </button>
                    </div>
                </div>

                {/* Navbar */}
                <nav className="flex justify-between items-center bg-pink-100 dark:bg-gray-800 shadow px-6 py-4">
                    <button className="text-2xl text-gray-700 dark:text-gray-200" onClick={toggleMenu}>
                        ☰
                    </button>
                    <div className="text-lg font-bold">📁 Evrak Takip Sistemi</div>
                    <div className="flex items-center gap-3">
                        <span className="font-medium">{adSoyad}</span>

                        {/* Tema Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="relative w-14 h-8 bg-gray-300 rounded-full dark:bg-gray-600 flex items-center px-1 cursor-pointer select-none"
                            aria-label="Toggle Dark Mode"
                            role="switch"
                            aria-checked={darkMode}
                        >
                            <div
                                className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'
                                    } flex items-center justify-center text-yellow-500 dark:text-yellow-400`}
                            >
                                {darkMode ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-11H21m-18 0H3m15.36 7.36l.7.7m-12.02-12l.7.7m12.02 0l-.7.7m-12.02 12l-.7.7M12 7a5 5 0 100 10 5 5 0 000-10z" />
                                    </svg>
                                )}
                            </div>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                        >
                            Çıkış
                        </button>
                    </div>
                </nav>

                {/* İçerik */}
                <main className="p-6">
                    <h2 className="text-2xl font-semibold">🎉 Hoş geldin, {adSoyad}!</h2>
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                        Bu sayfa sadece giriş yapan kullanıcılar içindir.
                    </p>
                </main>
            </div>
        </Layout>
    );
}

export default Anasayfa;
