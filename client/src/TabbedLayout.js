import { useEffect } from "react";
import TopTabs from "./TopTabs";
import useTabStore from "./stores/tabStore";
import { screenRegistry } from "./screenRegistry";

export default function TabbedLayout() {
    const tabs = useTabStore((s) => s.tabs);
    const activeTabId = useTabStore((s) => s.activeTabId);
    const openTab = useTabStore((s) => s.openTab);

    useEffect(() => {
        if (!tabs.length) {
            openTab({
                path: "/anasayfa",
                title: "Anasayfa",
            });
        }
    }, [tabs.length, openTab]);

    const activeTab = tabs.find((t) => t.id === activeTabId);

    if (!activeTab) return null;

    const Screen = screenRegistry[activeTab.path]?.component;

    return (
        <div className="flex min-h-screen flex-col">
            <TopTabs />
            <div className="relative flex-1 overflow-hidden">
                {Screen ? <Screen tabId={activeTab.id} /> : null}
            </div>
        </div>
    );
}