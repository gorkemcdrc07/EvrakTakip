import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import useTabStore from "../../stores/tabStore";

function makeTitleFromPath(path: string) {
    if (!path || path === "/") return "Ana Sayfa";

    return path
        .split("/")
        .filter((part) => part.trim().length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" / ");
}

export default function TabRouteSync() {
    const location = useLocation();

    const addTab = useTabStore((state) => state.addTab);
    const setActiveTab = useTabStore((state) => state.setActiveTab);
    const tabs = useTabStore((state) => state.tabs);
    const activeTabId = useTabStore((state) => state.activeTabId);

    useEffect(() => {
        const fullPath = location.pathname;

        if (!fullPath.startsWith("/app")) return;

        const tabPath = fullPath.replace("/app", "") || "/";
        const existing = tabs.find((tab) => tab.path === tabPath);

        if (existing) {
            if (existing.id !== activeTabId) {
                setActiveTab(existing.id);
            }
            return;
        }

        addTab({
            id: tabPath,
            path: tabPath,
            title: makeTitleFromPath(tabPath),
        });
    }, [location.pathname, tabs, activeTabId, addTab, setActiveTab]);

    return null;
}