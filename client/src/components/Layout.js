import React from 'react';
import useDarkMode from '../hooks/useDarkMode';
import DemoModeBanner from './DemoModeBanner';

function Layout({ children }) {
    useDarkMode();

    return (
        <div className="min-h-screen bg-[#f4f6f9] dark:bg-[#0c111b] transition-colors duration-300">\n            <DemoModeBanner />
            <div>
                {children}
            </div>
        </div>
    );
}

export default Layout;
