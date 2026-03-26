import { create } from "zustand";

const useTabStore = create((set, get) => ({
    tabs: [],
    activeTabId: null,

    openTab: ({ path, title }) => {
        const { tabs } = get();
        const existing = tabs.find((t) => t.path === path);

        if (existing) {
            set({ activeTabId: existing.id });
            return;
        }

        const newTab = {
            id: Date.now().toString(),
            path,
            title,
        };

        set({
            tabs: [...tabs, newTab],
            activeTabId: newTab.id,
        });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    closeTab: (id) => {
        const { tabs, activeTabId } = get();
        const filtered = tabs.filter((t) => t.id !== id);

        let next = activeTabId;
        if (activeTabId === id) {
            next = filtered.length ? filtered[filtered.length - 1].id : null;
        }

        set({
            tabs: filtered,
            activeTabId: next,
        });
    },
}));

export default useTabStore;