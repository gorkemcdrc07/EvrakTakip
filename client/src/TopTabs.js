import useTabStore from "./stores/tabStore";

export default function TopTabs() {
    const tabs = useTabStore((s) => s.tabs);
    const activeTabId = useTabStore((s) => s.activeTabId);
    const setActiveTab = useTabStore((s) => s.setActiveTab);
    const closeTab = useTabStore((s) => s.closeTab);

    return (
        <div className="sticky top-0 z-[9999] border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-[#0a0a0f]/95">
            <div className="flex h-12 items-center gap-2 overflow-x-auto px-3">
                {tabs.map((tab) => {
                    const active = tab.id === activeTabId;

                    return (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex cursor-pointer items-center gap-2 rounded-t-xl border px-3 py-2 text-sm whitespace-nowrap ${active
                                    ? "border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                                    : "border-transparent bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                }`}
                        >
                            <span>{tab.title}</span>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                                className="rounded px-1 text-xs hover:bg-black/10 dark:hover:bg-white/10"
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}