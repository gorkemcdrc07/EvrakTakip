import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import useDarkMode from './hooks/useDarkMode';
import Login from './Login';
import Anasayfa from './Anasayfa';
import Lokasyonlar from './Lokasyonlar';
import Projeler from './Projeler';
import TopluEvraklar from './TopluEvraklar';
import EvrakEkle from './EvrakEkle';

function App() {
    const [darkMode, toggleDarkMode] = useDarkMode();

    return (
        <div className="min-h-screen bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
            <Router>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/anasayfa" element={<Anasayfa />} />
                    <Route path="/lokasyonlar" element={<Lokasyonlar />} />
                    <Route path="/projeler" element={<Projeler />} />
                    <Route path="/toplu-evraklar" element={<TopluEvraklar />} />
                    <Route path="/evrak-ekle" element={<EvrakEkle />} />
                </Routes>
            </Router>
        </div>
    );
}

export default App;
