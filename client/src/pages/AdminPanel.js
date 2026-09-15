import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import useDarkMode from "../hooks/useDarkMode";
import {
    Activity,
    Check,
    ChevronDown,
    KeyRound,
    LockKeyhole,
    Plus,
    RefreshCw,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    UserCog,
    FlaskConical,
    Users,
    X,
} from "lucide-react";
import {
    ACTION_DEFINITIONS,
    SCREEN_GROUPS,
    createAllActionPermissions,
    createAllScreenPermissions,
    createDefaultAccessForUser,
    isAdminUsername,
    normalizeUsername,
} from "../permissions/permissionCatalog";
import { deleteAdminUser, fetchAdminUsers, saveAdminUser } from "../services/permissionService";
import { isDemoMode } from "../supabaseClient";
import { resetDemoDatabase } from "../demo/demoSupabase";
import AdminOperations from "../components/AdminOperations";
import { logAudit } from "../services/operationsHub";

const emptyForm = () => ({
    isNew: true,
    originalUsername: "",
    username: "",
    displayName: "",
    password: "",
    role: "user",
    active: true,
    screens: createAllScreenPermissions(false),
    actions: createAllActionPermissions(false),
});

const clone = (value) => JSON.parse(JSON.stringify(value));


export default function AdminPanel() {
    const demoMode = isDemoMode();
    useDarkMode();
    const currentUsername = normalizeUsername(localStorage.getItem("username") || "");
    const admin = isAdminUsername(currentUsername);
    const [users, setUsers] = useState([]);
    const [selectedUsername, setSelectedUsername] = useState("");
    const [form, setForm] = useState(emptyForm());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(SCREEN_GROUPS.map((g) => [g.label, true])));

    const loadUsers = async (preferredUsername = selectedUsername) => {
        setLoading(true);
        try {
            const list = await fetchAdminUsers();
            setUsers(list);
            const target = list.find((u) => u.username === normalizeUsername(preferredUsername)) || list[0];
            if (target) selectUser(target, false);
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Kullanıcılar alınamadı." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (admin) loadUsers("");
    }, [admin]);

    const selectUser = (user, updateSelection = true) => {
        if (updateSelection) setSelectedUsername(user.username);
        else setSelectedUsername(user.username);
        setForm({
            isNew: false,
            originalUsername: user.originalUsername,
            username: user.username,
            displayName: user.displayName,
            password: user.password,
            role: user.role || "user",
            active: user.active !== false,
            screens: clone(user.screens),
            actions: clone(user.actions),
        });
        setConfirmDelete(false);
    };

    const newUser = () => {
        setSelectedUsername("");
        setForm(emptyForm());
        setConfirmDelete(false);
        setMessage(null);
    };

    const filteredUsers = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase("tr-TR");
        if (!needle) return users;
        return users.filter((user) => `${user.displayName} ${user.username}`.toLocaleLowerCase("tr-TR").includes(needle));
    }, [users, query]);

    const setScreen = (path, value) => {
        if (isAdminUsername(form.username)) return;
        setForm((prev) => {
            const next = clone(prev);
            next.screens[path] = value;
            if (!value) {
                ACTION_DEFINITIONS.forEach((action) => { next.actions[path][action.key] = false; });
            } else {
                ACTION_DEFINITIONS.forEach((action) => {
                    if (typeof next.actions[path][action.key] !== "boolean") next.actions[path][action.key] = true;
                });
            }
            return next;
        });
    };

    const setAction = (path, action, value) => {
        if (isAdminUsername(form.username)) return;
        setForm((prev) => {
            const next = clone(prev);
            next.actions[path] = next.actions[path] || {};
            next.actions[path][action] = value;
            return next;
        });
    };

    const setAllScreens = (value) => {
        if (isAdminUsername(form.username)) return;
        setForm((prev) => {
            const next = clone(prev);
            Object.keys(next.screens).forEach((path) => {
                if (["/ticket-yonetimi", "/yonetim-paneli"].includes(path)) {
                    next.screens[path] = false;
                    return;
                }
                next.screens[path] = value;
                ACTION_DEFINITIONS.forEach((action) => { next.actions[path][action.key] = value; });
            });
            return next;
        });
    };

    const setViewOnly = () => {
        if (isAdminUsername(form.username)) return;
        setForm((prev) => {
            const next = clone(prev);
            Object.keys(next.actions).forEach((path) => {
                ACTION_DEFINITIONS.forEach((action) => { next.actions[path][action.key] = false; });
            });
            return next;
        });
    };

    const applyLegacyPreset = () => {
        if (!form.username || isAdminUsername(form.username)) return;
        const defaults = createDefaultAccessForUser(form.username);
        setForm((prev) => ({ ...prev, screens: clone(defaults.screens), actions: clone(defaults.actions) }));
    };

    const handleSave = async () => {
        setMessage(null);
        setSaving(true);
        try {
            await saveAdminUser(form);
            await logAudit(form.isNew ? "Kullanıcı oluşturdu" : "Kullanıcı/yetki güncelledi", "user_access", form.username, null, { role: form.role, active: form.active, screens: form.screens, actions: form.actions }, "/yonetim-paneli");
            setMessage({ type: "success", text: form.isNew ? "Kullanıcı oluşturuldu ve yetkileri kaydedildi." : "Kullanıcı ve yetkileri güncellendi." });
            await loadUsers(form.username);
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Kayıt sırasında hata oluştu." });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!form.username || isAdminUsername(form.username)) return;
        setSaving(true);
        try {
            await deleteAdminUser(form.originalUsername || form.username);
            await logAudit("Kullanıcı sildi", "user_access", form.originalUsername || form.username, { username: form.originalUsername || form.username }, null, "/yonetim-paneli");
            setMessage({ type: "success", text: "Kullanıcı silindi." });
            setConfirmDelete(false);
            setForm(emptyForm());
            await loadUsers("");
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Kullanıcı silinemedi." });
        } finally {
            setSaving(false);
        }
    };

    const visibleScreenCount = Object.values(form.screens || {}).filter(Boolean).length;
    const enabledActionCount = Object.values(form.actions || {}).reduce(
        (total, item) => total + Object.values(item || {}).filter(Boolean).length,
        0
    );

    if (!admin) {
        return (
            <Layout>
                <div className="grid min-h-[72vh] place-items-center bg-slate-50 p-6 dark:bg-[#0b1220]">
                    <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-500/20 dark:bg-[#111927]">
                        <LockKeyhole size={36} className="mx-auto text-rose-500" />
                        <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Yönetim Paneli sadece admin içindir</h1>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Kullanıcı ve yetki yönetimine erişim yetkiniz bulunmuyor.</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-[1780px]">
                    <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#111927] sm:p-6">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-600 via-cyan-400 to-emerald-400" />
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-400 text-white shadow-lg shadow-sky-500/20"><UserCog size={23} /></div>
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-[.15em] text-sky-600 dark:text-sky-300">Sistem Yönetimi</div>
                                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Kullanıcı & Yetki Yönetimi</h1>
                                    <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Kullanıcı hesaplarını, ekran erişimlerini ve ekran bazlı işlem/buton izinlerini tek noktadan yönetin.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => {
                                        if (demoMode) {
                                            localStorage.removeItem("ets_demo_mode");
                                            localStorage.removeItem("ets_demo_database_v1");
                                        } else {
                                            resetDemoDatabase();
                                            localStorage.setItem("ets_demo_mode", "true");
                                        }
                                        window.location.reload();
                                    }}
                                    className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-black transition ${demoMode ? "border-amber-300 bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"}`}
                                >
                                    <FlaskConical size={15}/>{demoMode ? "DEMO MODU AÇIK" : "DEMO MOD"}
                                </button>
                                <button onClick={() => loadUsers()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-black text-slate-600 hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300"><RefreshCw size={14} /> Yenile</button>
                                <button onClick={newUser} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 text-xs font-black text-white shadow-md shadow-sky-500/15"><Plus size={15} /> Yeni Kullanıcı</button>
                            </div>
                        </div>
                    </header>

                    <section className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                            ["Toplam Kullanıcı", users.length, Users],
                            ["Aktif Kullanıcı", users.filter((u) => u.active).length, Activity],
                            ["Admin Yetkisi", "Tam Erişim", ShieldCheck],
                        ].map(([label, value, Icon]) => (
                            <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[.08] dark:bg-[#111927]">
                                <div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{label}</div><div className="mt-1 text-xl font-black text-slate-950 dark:text-white">{value}</div></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><Icon size={18} /></div></div>
                            </div>
                        ))}
                    </section>

                    {message && (
                        <div className={`mt-4 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"}`}>
                            <span>{message.text}</span><button onClick={() => setMessage(null)}><X size={15} /></button>
                        </div>
                    )}

                    <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                        <aside className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[.08] dark:bg-[#111927] xl:sticky xl:top-4 xl:self-start">
                            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kullanıcı ara..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold outline-none focus:border-sky-400 dark:border-white/10 dark:bg-[#0d141f] dark:text-white" /></div>
                            <div className="mt-3 max-h-[68vh] space-y-1 overflow-y-auto pr-1">
                                {loading ? <div className="p-5 text-center text-xs font-bold text-slate-400">Kullanıcılar yükleniyor...</div> : filteredUsers.map((user) => {
                                    const active = !form.isNew && user.username === selectedUsername;
                                    return <button key={user.username} onClick={() => selectUser(user)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-sky-300 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/[.07]" : "border-transparent hover:bg-slate-50 dark:hover:bg-white/[.03]"}`}>
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600 dark:bg-white/[.06] dark:text-slate-300">{user.displayName?.slice(0, 1)?.toLocaleUpperCase("tr-TR")}</div>
                                        <div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800 dark:text-slate-100">{user.displayName}</div><div className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">@{user.username}</div></div>
                                        <span className={`h-2 w-2 rounded-full ${user.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                                    </button>;
                                })}
                            </div>
                        </aside>

                        <main className="space-y-4">
                            <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#111927]">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div><div className="text-[9px] font-black uppercase tracking-[.12em] text-sky-600 dark:text-sky-300">{form.isNew ? "Yeni Hesap" : "Kullanıcı Bilgileri"}</div><h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{form.isNew ? "Yeni kullanıcı oluştur" : form.displayName || form.username}</h2></div>
                                    {!form.isNew && <div className="flex items-center gap-2"><span className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-500 dark:bg-white/[.05] dark:text-slate-300">{visibleScreenCount} ekran · {enabledActionCount} işlem izni</span>{!isAdminUsername(form.username) && <button onClick={() => setConfirmDelete(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10"><Trash2 size={15} /></button>}</div>}
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.1em] text-slate-400">Kullanıcı Adı</span><input disabled={isAdminUsername(form.username) && !form.isNew} value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: normalizeUsername(e.target.value) }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-[#0d141f] dark:text-white" /></label>
                                    <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.1em] text-slate-400">Ad Soyad</span><input value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-sky-400 dark:border-white/10 dark:bg-[#0d141f] dark:text-white" /></label>
                                    <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.1em] text-slate-400">Şifre</span><div className="relative"><KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold outline-none focus:border-sky-400 dark:border-white/10 dark:bg-[#0d141f] dark:text-white" /></div></label>
                                    <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.1em] text-slate-400">Rol</span><select disabled={isAdminUsername(form.username)} value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-[#0d141f] dark:text-white"><option value="user">Kullanıcı</option><option value="operator">Operasyon</option><option value="viewer">Görüntüleyici</option><option value="manager">Yönetici</option></select></label>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/[.06]">
                                    <button disabled={isAdminUsername(form.username)} onClick={() => setForm((p) => ({ ...p, active: !p.active }))} className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black ${form.active ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/[.04]"}`}><span className={`h-2 w-2 rounded-full ${form.active ? "bg-emerald-500" : "bg-slate-400"}`} /> {form.active ? "Kullanıcı Aktif" : "Kullanıcı Pasif"}</button>
                                    <span className="text-[10px] font-semibold text-slate-400">Pasif kullanıcı sisteme giriş yapamaz.</span>
                                </div>
                            </section>

                            <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#111927]">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div><div className="text-[9px] font-black uppercase tracking-[.12em] text-sky-600 dark:text-sky-300">Ekran & Buton Yetkileri</div><h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Hangi ekranı görebilir, hangi işlemi yapabilir?</h2><p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Ekran kapalıysa sidebar’da görünmez ve URL ile de açılamaz.</p></div>
                                    {!isAdminUsername(form.username) && <div className="flex flex-wrap gap-2"><button onClick={() => setAllScreens(true)} className="h-9 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">Tüm Yetkiler</button><button onClick={setViewOnly} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-500 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300">Sadece Görüntüle</button><button onClick={applyLegacyPreset} className="h-9 rounded-xl border border-sky-200 bg-sky-50 px-3 text-[10px] font-black text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">Eski Yetkisini Getir</button><button onClick={() => setAllScreens(false)} className="h-9 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[10px] font-black text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">Tümünü Kapat</button></div>}
                                </div>

                                <div className="mt-5 space-y-3">
                                    {SCREEN_GROUPS.map((group) => (
                                        <div key={group.label} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[.07]">
                                            <button onClick={() => setOpenGroups((old) => ({ ...old, [group.label]: !old[group.label] }))} className="flex h-11 w-full items-center justify-between bg-slate-50 px-4 text-xs font-black text-slate-700 dark:bg-[#0d141f] dark:text-slate-200"><span>{group.label}{group.adminOnly && <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-[8px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">ADMIN ÖZEL</span>}</span><ChevronDown size={15} className={`transition ${openGroups[group.label] ? "" : "-rotate-90"}`} /></button>
                                            {openGroups[group.label] && <div className="overflow-x-auto"><table className="w-full min-w-[980px] border-collapse"><thead><tr className="border-t border-slate-200 bg-white text-[8px] font-black uppercase tracking-[.08em] text-slate-400 dark:border-white/[.06] dark:bg-[#111927]"><th className="px-4 py-3 text-left">Ekran</th><th className="px-3 py-3 text-center">Gör</th>{ACTION_DEFINITIONS.map((action) => <th key={action.key} className="px-2 py-3 text-center">{action.short}</th>)}</tr></thead><tbody>{group.screens.map((screen) => {
                                                const locked = group.adminOnly || isAdminUsername(form.username);
                                                const visible = isAdminUsername(form.username) ? true : !!form.screens?.[screen.path];
                                                return <tr key={screen.path} className="border-t border-slate-100 dark:border-white/[.05]"><td className="px-4 py-3"><div className="text-xs font-black text-slate-800 dark:text-slate-100">{screen.title}</div><div className="mt-0.5 text-[9px] font-semibold text-slate-400">{screen.path}</div></td><td className="px-3 py-3 text-center"><PermissionToggle value={visible} disabled={locked} onChange={(v) => setScreen(screen.path, v)} /></td>{ACTION_DEFINITIONS.map((action) => <td key={action.key} className="px-2 py-3 text-center"><PermissionToggle value={isAdminUsername(form.username) ? true : !!form.actions?.[screen.path]?.[action.key]} disabled={locked || !visible} onChange={(v) => setAction(screen.path, action.key, v)} /></td>)}</tr>;
                                            })}</tbody></table></div>}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="sticky bottom-3 z-20 flex items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/[.08] dark:bg-[#111927]/95">
                                <div className="mr-auto hidden text-[10px] font-semibold text-slate-400 sm:block">Değişiklikler Kaydet butonuna basınca uygulanır.</div>
                                {!form.isNew && !isAdminUsername(form.username) && <button onClick={() => setConfirmDelete(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"><Trash2 size={14} /> Kullanıcıyı Sil</button>}
                                <button onClick={handleSave} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-5 text-xs font-black text-white shadow-md shadow-sky-500/15 disabled:opacity-60"><Save size={15} /> {saving ? "Kaydediliyor..." : form.isNew ? "Kullanıcı Oluştur" : "Değişiklikleri Kaydet"}</button>
                            </div>
                        </main>
                    </div>
                </div>

                {confirmDelete && <div className="fixed inset-0 z-[12000] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-500/20 dark:bg-[#111927]"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10"><Trash2 size={21} /></div><h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{form.displayName} silinsin mi?</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">Kullanıcı hesabı ve kayıtlı uygulama yetkileri silinecek. Bu işlem geri alınamaz.</p><div className="mt-5 flex gap-2"><button onClick={() => setConfirmDelete(false)} className="h-10 flex-1 rounded-xl border border-slate-200 text-xs font-black text-slate-500 dark:border-white/10 dark:text-slate-300">Vazgeç</button><button onClick={handleDelete} disabled={saving} className="h-10 flex-1 rounded-xl bg-rose-600 text-xs font-black text-white disabled:opacity-60">Sil</button></div></div></div>}
            </div>
        </Layout>
    );
}

function PermissionToggle({ value, disabled, onChange }) {
    return (
        <button disabled={disabled} onClick={() => onChange(!value)} className={`mx-auto grid h-7 w-7 place-items-center rounded-lg border transition ${value ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 bg-white text-transparent dark:border-white/10 dark:bg-white/[.03]"} ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-sky-300"}`} title={value ? "İzin açık" : "İzin kapalı"}>
            {value && <Check size={14} strokeWidth={3} />}
        </button>
    );
}