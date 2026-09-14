import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { createAllActionPermissions, createAllScreenPermissions, createDefaultAccessForUser, isAdminUsername, normalizeUsername } from "./permissionCatalog";
import {
    canAccessScreenFromAccess,
    canUseActionFromAccess,
    fetchUserAccess,
} from "../services/permissionService";

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
    const username = normalizeUsername(localStorage.getItem("username") || "");
    const [access, setAccess] = useState(() => {
        if (isAdminUsername(username)) {
            return {
                username,
                active: true,
                role: "admin",
                configured: true,
                screen_permissions: createAllScreenPermissions(true),
                action_permissions: createAllActionPermissions(true),
            };
        }
        const fallback = createDefaultAccessForUser(username);
        return {
            username,
            active: true,
            role: "user",
            configured: false,
            screen_permissions: fallback.screens,
            action_permissions: fallback.actions,
        };
    });
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            setAccess(await fetchUserAccess(username));
        } finally {
            setLoading(false);
        }
    }, [username]);

    useEffect(() => {
        refresh();
        window.addEventListener("permissions:changed", refresh);

        const channel = supabase
            .channel(`user-access-${username || "anonymous"}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "app_user_access", filter: `username=eq.${username}` },
                refresh
            )
            .subscribe();

        return () => {
            window.removeEventListener("permissions:changed", refresh);
            supabase.removeChannel(channel);
        };
    }, [refresh, username]);


    useEffect(() => {
        if (!access || access.active !== false) return;
        localStorage.removeItem("auth");
        localStorage.removeItem("username");
        localStorage.removeItem("ad");
        localStorage.removeItem("role");
        window.location.assign("/login");
    }, [access]);

    const value = useMemo(() => ({
        username,
        access,
        loading,
        refresh,
        canAccessScreen: (path) => canAccessScreenFromAccess(access, path),
        canUseAction: (path, action) => canUseActionFromAccess(access, path, action),
    }), [username, access, loading, refresh]);

    return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export const usePermissions = () => {
    const context = useContext(PermissionContext);
    if (!context) throw new Error("usePermissions must be used inside PermissionProvider");
    return context;
};
