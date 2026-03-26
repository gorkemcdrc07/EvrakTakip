import useTabStore from "../stores/tabStore";
import { screenRegistry } from "../screenRegistry";

export default function useOpenTab() {
    const openTab = useTabStore((s) => s.openTab);

    return (path, params = {}) => {
        const screen = screenRegistry[path];
        if (!screen) return;

        openTab({
            path,
            title: screen.title,
            params,
        });
    };
}