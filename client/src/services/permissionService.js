import { supabase, isDemoMode } from "../supabaseClient";
import {
    ACTION_DEFINITIONS,
    ADMIN_ONLY_PATHS,
    ALL_SCREENS,
    createAllActionPermissions,
    createAllScreenPermissions,
    createDefaultAccessForUser,
    isAdminUsername,
    normalizeUsername,
} from "../permissions/permissionCatalog";

export const fetchUserAccess = async (username) => {
    const userKey = normalizeUsername(username);

    if (isDemoMode()) {
        return {
            username: userKey || "demo",
            active: true,
            role: "admin",
            configured: true,
            screen_permissions: createAllScreenPermissions(true),
            action_permissions: createAllActionPermissions(true),
        };
    }

    if (isAdminUsername(userKey)) {
        return {
            username: userKey,
            active: true,
            role: "admin",
            configured: true,
            screen_permissions: createAllScreenPermissions(true),
            action_permissions: createAllActionPermissions(true),
        };
    }

    const fallback = createDefaultAccessForUser(userKey);

    try {
        const { data, error } = await supabase
            .from("app_user_access")
            .select("*")
            .eq("username", userKey)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return {
                username: userKey,
                active: true,
                role: "user",
                configured: false,
                screen_permissions: fallback.screens,
                action_permissions: fallback.actions,
            };
        }

        return {
            username: userKey,
            active: data.active !== false,
            role: data.role || "user",
            configured: true,
            screen_permissions: {
                ...createAllScreenPermissions(false),
                ...(data.screen_permissions || {}),
            },
            action_permissions: {
                ...createAllActionPermissions(false),
                ...(data.action_permissions || {}),
            },
        };
    } catch (error) {
        console.warn("Yetki tablosu okunamadı, eski yetkiler kullanılıyor:", error?.message || error);
        return {
            username: userKey,
            active: true,
            role: "user",
            configured: false,
            screen_permissions: fallback.screens,
            action_permissions: fallback.actions,
        };
    }
};

export const canAccessScreenFromAccess = (access, path) => {
    if (!access) return false;
    if (isAdminUsername(access.username)) return true;
    if (path === "/tahakkuk-takip") return access.screen_permissions?.["/tahakkuk"] === true;
    if (ADMIN_ONLY_PATHS.has(path)) return false;
    return access.screen_permissions?.[path] === true;
};

export const canUseActionFromAccess = (access, path, action) => {
    if (!access) return false;
    if (isAdminUsername(access.username)) return true;
    if (!canAccessScreenFromAccess(access, path)) return false;
    if (!ACTION_DEFINITIONS.some((item) => item.key === action)) return true;

    const pathActions = access.action_permissions?.[path];
    if (!pathActions) return true;
    return pathActions[action] !== false;
};

export const fetchAdminUsers = async () => {
    const [{ data: loginRows, error: loginError }, { data: accessRows, error: accessError }] = await Promise.all([
        supabase.from("login").select("*"),
        supabase.from("app_user_access").select("*"),
    ]);

    if (loginError) throw loginError;
    if (accessError) throw accessError;

    const accessMap = new Map((accessRows || []).map((row) => [normalizeUsername(row.username), row]));

    return (loginRows || [])
        .map((row) => {
            const username = normalizeUsername(row.kullaniciAdi);
            const configured = accessMap.get(username);
            const fallback = createDefaultAccessForUser(username);
            const admin = isAdminUsername(username);

            return {
                id: row.id ?? username,
                originalUsername: row.kullaniciAdi,
                username,
                displayName: row.kullanici || row.kullaniciAdi,
                password: row.sifre || "",
                role: admin ? "admin" : configured?.role || "user",
                active: admin ? true : configured?.active !== false,
                configured: !!configured || admin,
                screens: admin
                    ? createAllScreenPermissions(true)
                    : configured?.screen_permissions || fallback.screens,
                actions: admin
                    ? createAllActionPermissions(true)
                    : configured?.action_permissions || fallback.actions,
            };
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "tr-TR", { sensitivity: "base" }));
};

const ensurePermissionShape = (screens = {}, actions = {}) => {
    const normalizedScreens = createAllScreenPermissions(false);
    const normalizedActions = createAllActionPermissions(false);

    ALL_SCREENS.forEach((screen) => {
        normalizedScreens[screen.path] = !!screens[screen.path];
        ACTION_DEFINITIONS.forEach((action) => {
            normalizedActions[screen.path][action.key] = !!actions?.[screen.path]?.[action.key];
        });
    });

    return { normalizedScreens, normalizedActions };
};

export const saveAdminUser = async ({ isNew, originalUsername, username, displayName, password, role, active, screens, actions }) => {
    const cleanUsername = normalizeUsername(username);
    if (!cleanUsername) throw new Error("Kullanıcı adı boş olamaz.");
    if (!String(displayName || "").trim()) throw new Error("Ad soyad boş olamaz.");
    if (!String(password || "").trim()) throw new Error("Şifre boş olamaz.");

    const admin = isAdminUsername(cleanUsername);
    const { normalizedScreens, normalizedActions } = ensurePermissionShape(
        admin ? createAllScreenPermissions(true) : screens,
        admin ? createAllActionPermissions(true) : actions
    );

    const { data: duplicateRows, error: duplicateError } = await supabase
        .from("login")
        .select("kullaniciAdi")
        .ilike("kullaniciAdi", cleanUsername);
    if (duplicateError) throw duplicateError;
    const duplicateExists = (duplicateRows || []).some((row) =>
        normalizeUsername(row.kullaniciAdi) === cleanUsername &&
        (isNew || normalizeUsername(row.kullaniciAdi) !== normalizeUsername(originalUsername))
    );
    if (duplicateExists) throw new Error("Bu kullanıcı adı zaten kullanılıyor.");

    if (isNew) {
        const { error } = await supabase.from("login").insert([{
            kullaniciAdi: cleanUsername,
            kullanici: String(displayName).trim(),
            sifre: String(password),
        }]);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from("login")
            .update({
                kullaniciAdi: cleanUsername,
                kullanici: String(displayName).trim(),
                sifre: String(password),
            })
            .eq("kullaniciAdi", originalUsername);
        if (error) throw error;
    }

    const { error: accessError } = await supabase.from("app_user_access").upsert({
        username: cleanUsername,
        role: admin ? "admin" : role || "user",
        active: admin ? true : active !== false,
        screen_permissions: normalizedScreens,
        action_permissions: normalizedActions,
        updated_at: new Date().toISOString(),
    }, { onConflict: "username" });
    if (accessError) throw accessError;

    const oldKey = normalizeUsername(originalUsername);
    if (!isNew && oldKey && oldKey !== cleanUsername) {
        await supabase.from("app_user_access").delete().eq("username", oldKey);
    }

    window.dispatchEvent(new Event("permissions:changed"));
};

export const deleteAdminUser = async (username) => {
    const cleanUsername = normalizeUsername(username);
    if (isAdminUsername(cleanUsername)) throw new Error("Ana admin kullanıcısı silinemez.");

    const { error: accessError } = await supabase.from("app_user_access").delete().eq("username", cleanUsername);
    if (accessError) throw accessError;

    const { error: loginError } = await supabase.from("login").delete().eq("kullaniciAdi", username);
    if (loginError) throw loginError;
};
