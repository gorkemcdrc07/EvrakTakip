import { useEffect, useState } from "react";

export default function useDarkMode() {
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem("theme");
        if (saved) return saved === "dark";
        // ilk açýlýþta OS temasýný baz al (istersen)
        return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
    });

    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
        localStorage.setItem("theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode((v) => !v);

    return [darkMode, toggleDarkMode];
}