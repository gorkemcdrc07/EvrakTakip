import React, { useEffect, Suspense } from "react";
import { useLocation } from "react-router-dom";
import TopTabs from "./TopTabs";
import useTabStore from "./stores/tabStore";
import { screenRegistry } from "./screenRegistry";

export default function TabbedApp() {
    const location = useLocation();
    const tabs = useTabStore((s) => s.tabs);
    const activeTabId = useTabStore((s) => s.activeTabId);
    const openTab = useTabStore((s) => s.openTab);

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
        <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0f] dark:text-gray-100">
            <TopTabs />

            <div className="flex-1 min-h-0 overflow-hidden">
                <Suspense fallback={<div className="p-4">Yükleniyor...</div>}>
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
            </div>
        </div>
    );
}