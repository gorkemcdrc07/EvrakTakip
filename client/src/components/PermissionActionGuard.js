import React, { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { detectActionFromElement } from "../permissions/permissionCatalog";
import { usePermissions } from "../permissions/PermissionContext";

export default function PermissionActionGuard() {
    const location = useLocation();
    const { canUseAction } = usePermissions();
    const [denied, setDenied] = useState(null);

    useEffect(() => {
        const path = location.pathname.replace(/^\/app/, "") || "/anasayfa";

        const deny = (action) => {
            setDenied(action);
            window.clearTimeout(window.__permissionToastTimer);
            window.__permissionToastTimer = window.setTimeout(() => setDenied(null), 3200);
        };

        const onClickCapture = (event) => {
            const target = event.target?.closest?.("button,[role='button'],a,input[type='button'],input[type='submit']");
            if (!target || target.dataset?.permissionIgnore === "true" || target.closest?.('[data-permission-scope="global"]')) return;
            const action = detectActionFromElement(target);
            if (!action || canUseAction(path, action)) return;

            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent?.stopImmediatePropagation?.();
            deny(action);
        };

        const onSubmitCapture = (event) => {
            const form = event.target;
            if (form?.dataset?.permissionIgnore === "true" || form?.closest?.('[data-permission-scope="global"]')) return;
            if (canUseAction(path, "save")) return;
            event.preventDefault();
            event.stopPropagation();
            deny("save");
        };

        const onFileChangeCapture = (event) => {
            if (event.target?.type !== "file") return;
            if (event.target?.closest?.('[data-permission-scope="global"]')) return;
            if (canUseAction(path, "upload")) return;
            event.preventDefault();
            event.stopPropagation();
            event.target.value = "";
            deny("upload");
        };

        document.addEventListener("click", onClickCapture, true);
        document.addEventListener("submit", onSubmitCapture, true);
        document.addEventListener("change", onFileChangeCapture, true);
        return () => {
            document.removeEventListener("click", onClickCapture, true);
            document.removeEventListener("submit", onSubmitCapture, true);
            document.removeEventListener("change", onFileChangeCapture, true);
        };
    }, [location.pathname, canUseAction]);

    if (!denied) return null;

    return (
        <div className="fixed right-5 top-20 z-[20000] w-[min(390px,calc(100vw-32px))] rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl dark:border-amber-500/20 dark:bg-[#111927]">
            <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"><ShieldAlert size={19} /></div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 dark:text-white">Bu işlem için yetkiniz yok</div>
                    <div className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">Bu buton/işlem admin tarafından kapatılmış. Yetki gerekiyorsa yöneticinizle iletişime geçin.</div>
                </div>
                <button onClick={() => setDenied(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"><X size={15} /></button>
            </div>
        </div>
    );
}
