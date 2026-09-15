export const TICKET_ADMIN_USER = "admin";

export const normalizeUsername = (value) =>
    String(value || "").trim().toLocaleLowerCase("tr-TR");

export const isTicketAdmin = () =>
    normalizeUsername(localStorage.getItem("username")) === TICKET_ADMIN_USER;

export const TICKET_STATUSES = {
    new: { label: "Yeni", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
    reviewing: { label: "İnceleniyor", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
    in_progress: { label: "İşlemde", dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" },
    resolved: { label: "Çözüldü", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
    closed: { label: "Kapatıldı", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 dark:bg-white/[.06] dark:text-slate-300" },
};

export const TICKET_PRIORITIES = {
    "Düşük": "bg-slate-400",
    "Normal": "bg-cyan-500",
    "Yüksek": "bg-amber-500",
    "Acil": "bg-rose-500",
};

export const createTicketNo = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const stamp = `${String(d.getFullYear()).slice(-2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    return `TK-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

export const formatTicketDate = (value, withTime = true) => {
    if (!value) return "-";
    try {
        return new Intl.DateTimeFormat("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
        }).format(new Date(value));
    } catch {
        return "-";
    }
};
