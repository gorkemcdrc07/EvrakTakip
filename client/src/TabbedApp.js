import React, { useEffect, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import TopTabs from "./TopTabs";
import useTabStore from "./stores/tabStore";
import { screenRegistry } from "./screenRegistry";
import ModernSidebar from "./components/ModernSidebar";
import PermissionActionGuard from "./components/PermissionActionGuard";
import { PermissionProvider, usePermissions } from "./permissions/PermissionContext";

function TabbedAppContent() {
    const location = useLocation();
    const tabs = useTabStore((s) => s.tabs);
    const activeTabId = useTabStore((s) => s.activeTabId);
    const openTab = useTabStore((s) => s.openTab);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { canAccessScreen } = usePermissions();

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
            <PermissionActionGuard />
            <ModernSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col">
            <TopTabs onMenuClick={() => setMobileMenuOpen(true)} />
            <main className="min-h-0 flex-1 overflow-hidden">
                <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-slate-500">Ekran hazırlanıyor…</div>}>
                    {tabs.map((tab) => {
                        const Screen = screenRegistry[tab.path]?.component;

                        if (!Screen) return null;
                        const allowed = canAccessScreen(tab.path);

                        return (
                            <div
                                key={tab.id}
                                className="h-full overflow-y-auto"
                                style={{
                                    display: activeTabId === tab.id ? "block" : "none",
                                }}
                            >
                                {allowed ? <Screen tabId={tab.id} /> : (
                                    <div className="grid min-h-[70vh] place-items-center bg-slate-50 p-6 dark:bg-[#0b1220]">
                                        <div className="max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-500/20 dark:bg-[#111927]">
                                            <div className="text-3xl">🔒</div>
                                            <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Bu ekrana erişim yetkiniz yok</h2>
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ekran yetkiniz yönetici tarafından kapatılmış.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Suspense>
            </main>
            </div>
        </div>
    );
}


export default function TabbedApp() {
    return (
        <PermissionProvider>
            <TabbedAppContent />
        </PermissionProvider>
    );
}
