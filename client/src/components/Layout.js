import React from 'react';
import useDarkMode from '../hooks/useDarkMode';
import Logo from '../Logo';

function Layout({ children }) {
    const [darkMode] = useDarkMode();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
            {/* Arka plan büyük flu logo */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-10 blur-2xl pointer-events-none">
                <div className="w-[1000px] h-[1000px]">
                    <Logo
                        color={darkMode ? 'white' : '#db2777'}
                        width="100%"
                        height="100%"
                    />
                </div>
            </div>

            {/* Sayfa içeriði */}
            <div className="relative z-10">
                {children}
            </div>

            {/* Sað alt köþe salýnan logo */}
            <div className="fixed bottom-8 right-8 z-20 [perspective:1000px]">
                <Logo
                    color={darkMode ? 'white' : '#db2777'}
                    width={160}
                    height={160}
                    className="animate-swing"
                />
            </div>
        </div>
    );
}

export default Layout;
