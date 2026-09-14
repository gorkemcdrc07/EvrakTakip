import React, { useEffect, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import TopTabs from "./TopTabs";
import useTabStore from "./stores/tabStore";
import { screenRegistry } from "./screenRegistry";
import ModernSidebar from "./components/ModernSidebar";

export default function TabbedApp() {
    const location = useLocation();
    const tabs = useTabStore((s) => s.tabs);
    const activeTabId = useTabStore((s) => s.activeTabId);
    const openTab = useTabStore((s) => s.openTab);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const currentPath = location.pathname.replace("/app", "") || "/anasayfa";
        const screen = screenRegistry[currentPath];

        if (screen) {
            openTab({
                path: currentPath,
                title: screen.title,
            });
        }
    }, [location.pathname, openTab]);

    if (!tabs.length) return null;

    return (
        <div className="flex h-screen overflow-hidden bg-[#f4f6f9] text-[#101827] dark:bg-[#0c111b] dark:text-gray-100">
            <ModernSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col">
            <TopTabs onMenuClick={() => setMobileMenuOpen(true)} />
            <main className="min-h-0 flex-1 overflow-hidden">
                <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-slate-500">Ekran hazırlanıyor…</div>}>
                    {tabs.map((tab) => {
                        const Screen = screenRegistry[tab.path]?.component;

                        if (!Screen) return null;

                        return (
                            <div
                                key={tab.id}
                                className="h-full overflow-y-auto"
                                style={{
                                    display: activeTabId === tab.id ? "block" : "none",
                                }}
                            >
                                <Screen tabId={tab.id} />
                            </div>
                        );
                    })}
                </Suspense>
            </main>
            </div>
        </div>
    );
}
