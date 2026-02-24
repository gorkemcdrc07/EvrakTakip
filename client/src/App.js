// src/App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import useDarkMode from "./hooks/useDarkMode";

import Login from "./Login";
import Anasayfa from "./Anasayfa";
import Lokasyonlar from "./Lokasyonlar";
import Projeler from "./Projeler";
import TopluEvraklar from "./TopluEvraklar";
import EvrakEkle from "./EvrakEkle";
import KargoBilgisiEkle from "./KargoBilgisiEkle";
import TumKargoBilgileri from "./TumKargoBilgileri";
import Tutanak from "./Tutanak";
import Raporlar from "./Raporlar";
import HedefKargo from "./hedefKargo";
import EvrakRaporlari from "./EvrakRaporları";
import ExcelDonusum from "./ExcelDonusum";
import TopluTutanak from "./TopluTutanak";

// ✅ Tahakkuk
import Tahakkuk from "./Tahakkuk";

// ✅ Yeni sayfalar
import JpgToPdf from "./pages/JpgToPdf";
import PdfSikistirma from "./pages/PdfSikistirma";

function App() {
    const [darkMode, toggleDarkMode] = useDarkMode();

    // ✅ Dark class'ı anlık olarak <html> üstüne uygula (Tailwind dark: için en sağlam yöntem)
    useEffect(() => {
        document.documentElement.classList.toggle("dark", !!darkMode);
    }, [darkMode]);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0f] dark:text-gray-100 transition-colors duration-300">
            <Router>
                {/* ✅ İstersen test için tema butonu (sonra kaldırabilirsin) */}
                {/* 
        <button
          onClick={toggleDarkMode}
          className="fixed bottom-4 left-4 z-50 rounded-xl px-4 py-2 font-bold
          bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border border-black/10 dark:border-white/10"
        >
          Tema Değiştir
        </button>
        */}

                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />

                    <Route path="/anasayfa" element={<Anasayfa />} />
                    <Route path="/lokasyonlar" element={<Lokasyonlar />} />
                    <Route path="/projeler" element={<Projeler />} />
                    <Route path="/toplu-evraklar" element={<TopluEvraklar />} />
                    <Route path="/evrak-ekle" element={<EvrakEkle />} />
                    <Route path="/kargo-bilgisi-ekle" element={<KargoBilgisiEkle />} />
                    <Route path="/tum-kargo-bilgileri" element={<TumKargoBilgileri />} />
                    <Route path="/tutanak" element={<Tutanak />} />
                    <Route path="/raporlar" element={<Raporlar />} />

                    <Route path="/toplu-tutanak" element={<TopluTutanak />} />
                    <Route path="/hedef-kargo" element={<HedefKargo />} />
                    <Route path="/evrak-raporlari" element={<EvrakRaporlari />} />
                    <Route path="/ExcelDonusum" element={<ExcelDonusum />} />

                    {/* ✅ Tahakkuk */}
                    <Route path="/tahakkuk" element={<Tahakkuk />} />

                    {/* ✅ Yeni route'lar */}
                    <Route path="/jpg-to-pdf" element={<JpgToPdf />} />
                    <Route path="/pdf-sikistirma" element={<PdfSikistirma />} />

                    {/* opsiyonel: bilinmeyen route */}
                    <Route path="*" element={<Navigate to="/anasayfa" replace />} />
                </Routes>
            </Router>
        </div>
    );
}

export default App;