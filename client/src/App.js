import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import useDarkMode from "./hooks/useDarkMode";
import Login from "./Login";
import TabbedApp from "./TabbedApp";

function App() {
    const [darkMode] = useDarkMode();

    useEffect(() => {
        document.documentElement.classList.toggle("dark", !!darkMode);
    }, [darkMode]);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0f] dark:text-gray-100 transition-colors duration-300">
            <Router>
                <Routes>
                    <Route path="/" element={<Navigate to="/app/anasayfa" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/app/*" element={<TabbedApp />} />
                    <Route path="*" element={<Navigate to="/app/anasayfa" replace />} />
                </Routes>
            </Router>
        </div>
    );
}

export default App;