import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './Login';
import Anasayfa from './Anasayfa';
import Lokasyonlar from './Lokasyonlar';
import Projeler from './Projeler';
import TopluEvraklar from './TopluEvraklar';
import EvrakEkle from './EvrakEkle'; // ✅ EKLENDİ

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/anasayfa" element={<Anasayfa />} />
                <Route path="/lokasyonlar" element={<Lokasyonlar />} />
                <Route path="/projeler" element={<Projeler />} />
                <Route path="/toplu-evraklar" element={<TopluEvraklar />} />
                <Route path="/evrak-ekle" element={<EvrakEkle />} /> {/* ✅ YENİ */}
            </Routes>
        </Router>
    );
}

export default App;
