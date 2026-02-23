import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";
import {
    FiFolder,
    FiSearch,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiChevronDown,
    FiChevronUp,
    FiHome,
    FiAlertTriangle,
    FiCheckCircle,
    FiX,
    FiGrid,
} from "react-icons/fi";

function Projeler() {
    const navigate = useNavigate();

    // ✅ IMPORTANT: Sizde "/" login'e gidiyor. Anasayfa'nın gerçek route'unu buraya yaz.
    // Eğer router'da <Route path="/anasayfa" ...> ise bunu "/anasayfa" yap.
    const HOME_PATH = "/Anasayfa";

    // data
    const [projeler, setProjeler] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    // ui
    const [q, setQ] = useState("");
    const [sortAsc, setSortAsc] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [toDelete, setToDelete] = useState(null);

    // toast
    const [toast, setToast] = useState(null);
    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        document.title = "Projeler | Yönetim Paneli";
        fetchProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProjects = async () => {
        setListLoading(true);
        const { data, error } = await supabase.from("projeler").select("*").order("proje", { ascending: true });

        if (error) {
            setErrorMsg("Veriler senkronize edilemedi.");
            setProjeler([]);
        } else {
            setErrorMsg("");
            setProjeler(data || []);
        }
        setListLoading(false);
    };

    const existingNames = useMemo(
        () => new Set((projeler || []).map((p) => (p.proje || "").trim().toLocaleLowerCase("tr"))),
        [projeler]
    );

    const filtered = useMemo(() => {
        const term = q.trim().toLocaleLowerCase("tr");
        let list = [...(projeler || [])];
        if (term) list = list.filter((p) => (p.proje || "").toLocaleLowerCase("tr").includes(term));
        list.sort((a, b) => {
            const av = (a.proje || "").toLocaleLowerCase("tr");
            const bv = (b.proje || "").toLocaleLowerCase("tr");
            return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
        return list;
    }, [projeler, q, sortAsc]);

    // CRUD
    const addProject = async (name) => {
        const normalized = (name || "").trim();
        if (!normalized) return showToast("error", "Lütfen geçerli bir isim girin.");
        if (existingNames.has(normalized.toLocaleLowerCase("tr"))) return showToast("error", "Bu isimde bir proje zaten mevcut.");

        const { error } = await supabase.from("projeler").insert([{ proje: normalized }]);
        if (error) {
            showToast("error", "Sistem hatası: Proje oluşturulamadı.");
        } else {
            showToast("success", "Harika! Yeni proje başarıyla oluşturuldu.");
            await fetchProjects();
        }
    };

    const updateProject = async (id, name) => {
        const normalized = (name || "").trim();
        if (!normalized) return showToast("error", "Lütfen geçerli bir isim girin.");

        const clash = projeler.find(
            (p) =>
                p.id !== id &&
                (p.proje || "").trim().toLocaleLowerCase("tr") === normalized.toLocaleLowerCase("tr")
        );
        if (clash) return showToast("error", "Bu isim başka bir projede kullanılıyor.");

        const { error } = await supabase.from("projeler").update({ proje: normalized }).eq("id", id);
        if (error) {
            showToast("error", "Güncelleme sırasında bir sorun oluştu.");
        } else {
            showToast("success", "Proje başarıyla güncellendi.");
            await fetchProjects();
        }
    };

    const deleteProject = async (id) => {
        const { error } = await supabase.from("projeler").delete().eq("id", id);
        if (error) {
            showToast("error", "Silinemedi: Proje bağlı veriler içeriyor olabilir.");
        } else {
            showToast("success", "Proje ve ilişkili tüm veriler silindi.");
            await fetchProjects();
        }
    };

    const goHome = () => {
        navigate(HOME_PATH, { replace: false });
    };

    return (
        <Layout>
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-500">
                <div className="max-w-6xl mx-auto px-4 py-10">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div className="space-y-4">
                            <button
                                onClick={goHome}
                                type="button"
                                className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors"
                            >
                                <FiHome className="group-hover:-translate-y-0.5 transition-transform" />
                                Ana Sayfaya Dön
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="p-3.5 rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-500/20">
                                    <FiGrid size={28} />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Proje Yönetimi</h1>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                                        Sistemdeki projeleri düzenleyin ve takip edin.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{projeler.length}</span>
                                <span className="text-sm text-slate-500 ml-1.5 uppercase tracking-wider font-semibold">Toplam</span>
                            </div>
                            <button
                                onClick={() => setAddOpen(true)}
                                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-violet-600/20 transition-all"
                            >
                                <FiPlus size={20} /> Yeni Proje
                            </button>
                        </div>
                    </div>

                    {/* Interactive Toolbar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                        <div className="md:col-span-9 relative group">
                            <FiSearch
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors"
                                size={20}
                            />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Proje ismine göre akıllı arama..."
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all font-medium"
                            />
                        </div>
                        <button
                            onClick={() => setSortAsc((v) => !v)}
                            className="md:col-span-3 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold text-slate-600 dark:text-slate-300"
                        >
                            {sortAsc ? <FiChevronDown /> : <FiChevronUp />}
                            {sortAsc ? "A'dan Z'ye" : "Z'den A'ya"}
                        </button>
                    </div>

                    {/* Main Content Area */}
                    {errorMsg && (
                        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                            <FiAlertTriangle size={20} />
                            <span className="font-medium">{errorMsg}</span>
                        </div>
                    )}

                    {listLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-28 rounded-3xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800"
                                />
                            ))}
                        </div>
                    ) : filtered.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.map((proje) => (
                                <div
                                    key={proje.id}
                                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600 dark:group-hover:bg-violet-900/30 dark:group-hover:text-violet-400 transition-colors">
                                            <FiFolder size={24} />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setSelected(proje);
                                                    setEditOpen(true);
                                                }}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-all"
                                                title="Düzenle"
                                            >
                                                <FiEdit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setToDelete(proje);
                                                    setConfirmOpen(true);
                                                }}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                                title="Sil"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold truncate pr-2" title={proje.proje}>
                                        {proje.proje}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide uppercase italic">
                                        ID: #{proje.id.toString().slice(0, 8)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 backdrop-blur-sm">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                                <FiSearch size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold">Sonuç bulunamadı</h3>
                            <p className="text-slate-500 mt-2">Aramanıza uygun proje yok veya henüz hiç eklenmemiş.</p>
                            <button onClick={() => setAddOpen(true)} className="mt-8 text-violet-600 font-bold hover:underline">
                                İlk projeyi oluşturmak için tıklayın
                            </button>
                        </div>
                    )}
                </div>

                {/* --- Modals & UI Components --- */}

                {addOpen && (
                    <Modal onClose={() => setAddOpen(false)} title="Yeni Proje Başlat">
                        <ProjectForm
                            submitLabel="Proje Oluştur"
                            onCancel={() => setAddOpen(false)}
                            onSubmit={async (name) => {
                                await addProject(name);
                                setAddOpen(false);
                            }}
                        />
                    </Modal>
                )}

                {editOpen && selected && (
                    <Modal onClose={() => setEditOpen(false)} title="Projeyi Yeniden Adlandır">
                        <ProjectForm
                            defaultValue={selected.proje}
                            submitLabel="Değişiklikleri Uygula"
                            onCancel={() => setEditOpen(false)}
                            onSubmit={async (name) => {
                                await updateProject(selected.id, name);
                                setEditOpen(false);
                                setSelected(null);
                            }}
                        />
                    </Modal>
                )}

                {confirmOpen && toDelete && (
                    <ConfirmDialog
                        title="Projeyi Sil?"
                        message={`"${toDelete.proje}" isimli projeyi kalıcı olarak siliyorsunuz. Bu işleme bağlı tüm veriler etkilenecektir.`}
                        confirmLabel="Evet, Kalıcı Olarak Sil"
                        onCancel={() => {
                            setConfirmOpen(false);
                            setToDelete(null);
                        }}
                        onConfirm={async () => {
                            await deleteProject(toDelete.id);
                            setConfirmOpen(false);
                            setToDelete(null);
                        }}
                    />
                )}

                {/* Modern Toast Notification */}
                {toast && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5">
                        <div
                            className={`flex items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-md ${toast.type === "success" ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
                                }`}
                        >
                            {toast.type === "success" ? <FiCheckCircle size={20} /> : <FiAlertTriangle size={20} />}
                            <span className="font-bold text-sm">{toast.msg}</span>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

/* ---------- UI Components ---------- */

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-8">{children}</div>
            </div>
        </div>
    );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={onCancel} />
            <div className="relative w-full max-w-md rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 shadow-2xl animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-6">
                    <FiTrash2 size={32} />
                </div>
                <h3 className="text-2xl font-black mb-3">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{message}</p>
                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-6 py-3.5 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProjectForm({ defaultValue = "", submitLabel = "Kaydet", onSubmit, onCancel }) {
    const [value, setValue] = useState(defaultValue);
    const [saving, setSaving] = useState(false);

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                if (saving || !value.trim()) return;
                setSaving(true);
                await onSubmit?.(value);
                setSaving(false);
            }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">Proje Başlığı</label>
                <input
                    autoFocus
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Örn: Global Operasyon Planı"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-violet-500 focus:ring-0 outline-none transition-all font-semibold text-lg"
                />
            </div>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    disabled={saving || !value.trim()}
                    className={`flex-[2] px-6 py-4 rounded-2xl font-bold text-white shadow-xl transition-all active:scale-95 ${saving || !value.trim()
                            ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                            : "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20"
                        }`}
                >
                    {saving ? "İşleniyor..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default Projeler;