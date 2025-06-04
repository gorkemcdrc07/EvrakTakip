import { useEffect, useState } from 'react';

function useDarkMode() {
    const getInitialTheme = () => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme !== null) {
                return savedTheme === 'dark';
            }
            // Eðer localStorage'da yoksa tarayýcý tercihine göre ayarla
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    };

    const [darkMode, setDarkMode] = useState(getInitialTheme);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    return [darkMode, setDarkMode];
}

export default useDarkMode;
