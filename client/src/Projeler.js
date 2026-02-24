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

    // ✅ Anasayfa route'unuz
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
        const { data, error } = await supabase
            .from("projeler")
            .select("*")
            .order("proje", { ascending: true });

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
        () =>
            new Set((projeler || []).map((p) => (p.proje || "").trim().toLocaleLowerCase("tr"))),
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
        if (existingNames.has(normalized.toLocaleLowerCase("tr")))
            return showToast("error", "Bu isimde bir proje zaten mevcut.");

        const { error } = await supabase.from("projeler").insert([{ proje: normalized }]);
        if (error) {
            showToast("error", "Sistem hatası: Proje oluşturulamadı.");
        } else {
            showToast("success", "Yeni proje başarıyla oluşturuldu.");
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
            showToast("success", "Proje silindi.");
            await fetchProjects();
        }
    };

    const goHome = () => {
        navigate(HOME_PATH, { replace: false });
    };

    return (
        <Layout>
            {/* ✅ ETS morumsu arka plan + aynı glow dili */}
            <div
                className="min-h-screen text-zinc-950 dark:text-zinc-50 transition-colors duration-300
        bg-[#F7F5FF] dark:bg-[#070A13]
        [background-image:radial-gradient(900px_circle_at_18%_10%,rgba(139,92,246,0.14),transparent_55%),radial-gradient(850px_circle_at_82%_40%,rgba(236,72,153,0.10),transparent_60%)]
        dark:[background-image:radial-gradient(900px_circle_at_18%_10%,rgba(139,92,246,0.18),transparent_55%),radial-gradient(850px_circle_at_82%_40%,rgba(236,72,153,0.10),transparent_60%),radial-gradient(700px_circle_at_50%_85%,rgba(34,211,238,0.08),transparent_55%)]
      "
            >
                <div className="max-w-6xl mx-auto px-4 py-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div className="space-y-4">
                            <button
                                onClick={goHome}
                                type="button"
                                className="group flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-violet-400 transition-colors"
                            >
                                <FiHome className="group-hover:-translate-y-0.5 transition-transform" />
                                Ana Sayfaya Dön
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="p-3.5 rounded-2xl bg-violet-600/90 text-white shadow-xl shadow-violet-200/60 dark:shadow-none">
                                    <FiGrid size={28} />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                        Proje Yönetimi
                                    </h1>
                                    <p className="text-zinc-600 dark:text-zinc-300 font-medium mt-1">
                                        Sistemdeki projeleri düzenleyin ve takip edin.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-white/70 dark:bg-white/[0.04] border border-violet-200/60 dark:border-white/10 rounded-xl shadow-sm backdrop-blur-xl">
                                <span className="text-sm font-extrabold text-violet-700 dark:text-violet-200">
                                    {projeler.length}
                                </span>
                                <span className="text-sm text-zinc-500 dark:text-zinc-300 ml-1.5 uppercase tracking-wider font-semibold">
                                    Toplam
                                </span>
                            </div>

                            <button
                                onClick={() => setAddOpen(true)}
                                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:scale-95
                  text-white px-6 py-3 rounded-xl font-extrabold
                  shadow-lg shadow-violet-200/60 dark:shadow-none transition-all"
                            >
                                <FiPlus size={20} /> Yeni Proje
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                        <div className="md:col-span-9 relative group">
                            <FiSearch
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-400 transition-colors"
                                size={20}
                            />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Proje ismine göre ara..."
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl
                  bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl
                  border border-violet-200/60 dark:border-white/10
                  focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70 outline-none transition-all font-semibold"
                            />
                        </div>

                        <button
                            onClick={() => setSortAsc((v) => !v)}
                            className="md:col-span-3 flex items-center justify-center gap-3 rounded-2xl
                bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl
                border border-violet-200/60 dark:border-white/10
                hover:bg-violet-50/70 dark:hover:bg-white/[0.06]
                transition-all font-extrabold text-zinc-700 dark:text-zinc-200"
                        >
                            {sortAsc ? <FiChevronDown /> : <FiChevronUp />}
                            {sortAsc ? "A'dan Z'ye" : "Z'den A'ya"}
                        </button>
                    </div>

                    {/* Error */}
                    {errorMsg && (
                        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl
              bg-red-50 border border-red-100 text-red-700
              dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-300 animate-in fade-in slide-in-from-top-2"
                        >
                            <FiAlertTriangle size={20} />
                            <span className="font-semibold">{errorMsg}</span>
                        </div>
                    )}

                    {/* Content */}
                    {listLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-28 rounded-[2rem] bg-white/70 dark:bg-white/[0.04]
                    border border-violet-200/60 dark:border-white/10 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : filtered.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.map((proje) => (
                                <div
                                    key={proje.id}
                                    className="group relative
                    bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl
                    border border-violet-200/60 dark:border-white/10
                    p-5 rounded-[2rem] shadow-sm
                    hover:shadow-xl hover:border-violet-300/70 dark:hover:border-violet-400/25
                    hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-2xl
                      bg-violet-50/80 dark:bg-white/[0.06]
                      text-zinc-500 group-hover:text-violet-700 dark:group-hover:text-violet-200
                      group-hover:bg-violet-100/80 dark:group-hover:bg-violet-500/10 transition-colors"
                                        >
                                            <FiFolder size={24} />
                                        </div>

                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setSelected(proje);
                                                    setEditOpen(true);
                                                }}
                                                className="p-2 rounded-lg text-zinc-400
                          hover:bg-violet-50/80 dark:hover:bg-white/[0.06]
                          hover:text-violet-700 dark:hover:text-violet-200 transition-all"
                                                title="Düzenle"
                                            >
                                                <FiEdit2 size={18} />
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setToDelete(proje);
                                                    setConfirmOpen(true);
                                                }}
                                                className="p-2 rounded-lg text-zinc-400
                          hover:bg-red-50 dark:hover:bg-red-900/20
                          hover:text-red-600 dark:hover:text-red-300 transition-all"
                                                title="Sil"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-extrabold truncate pr-2" title={proje.proje}>
                                        {proje.proje}
                                    </h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-1 font-semibold tracking-wide uppercase italic">
                                        ID: #{proje.id.toString().slice(0, 8)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center rounded-[3rem]
              border-2 border-dashed border-violet-200/70 dark:border-white/10
              bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl"
                        >
                            <div className="w-20 h-20 rounded-full bg-violet-50/80 dark:bg-white/[0.06] flex items-center justify-center mb-6">
                                <FiSearch size={32} className="text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-extrabold">Sonuç bulunamadı</h3>
                            <p className="text-zinc-600 dark:text-zinc-300 mt-2">
                                Aramanıza uygun proje yok veya henüz hiç eklenmemiş.
                            </p>
                            <button
                                onClick={() => setAddOpen(true)}
                                className="mt-8 text-violet-700 dark:text-violet-200 font-extrabold hover:underline"
                            >
                                İlk projeyi oluşturmak için tıklayın
                            </button>
                        </div>
                    )}
                </div>

                {/* --- Modals --- */}
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

                {/* Toast (glass + ETS uyumu) */}
                {toast && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
                        <div
                            className={`flex items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl border backdrop-blur-xl
                ${toast.type === "success"
                                    ? "bg-white/70 dark:bg-white/[0.06] border-violet-200/60 dark:border-white/10 text-violet-800 dark:text-violet-200"
                                    : "bg-white/70 dark:bg-white/[0.06] border-red-200/60 dark:border-red-900/30 text-red-700 dark:text-red-300"
                                }`}
                        >
                            {toast.type === "success" ? <FiCheckCircle size={20} /> : <FiAlertTriangle size={20} />}
                            <span className="font-extrabold text-sm">{toast.msg}</span>
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-[2.5rem]
        bg-white/85 dark:bg-[#0b1020]/90
        border border-violet-200/60 dark:border-white/10
        shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
            >
                <div className="flex items-center justify-between px-8 py-6 border-b border-violet-100/70 dark:border-white/10">
                    <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-violet-50/70 dark:hover:bg-white/[0.06] text-zinc-500 dark:text-zinc-300 transition-colors"
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onCancel} />
            <div className="relative w-full max-w-md rounded-[2.5rem]
        bg-white/85 dark:bg-[#0b1020]/90
        border border-red-200/60 dark:border-red-900/30
        p-8 shadow-2xl animate-in zoom-in-95"
            >
                <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 flex items-center justify-center mb-6">
                    <FiTrash2 size={32} />
                </div>
                <h3 className="text-2xl font-extrabold mb-3">{title}</h3>
                <p className="text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">{message}</p>
                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-6 py-3.5 rounded-2xl font-extrabold
              bg-violet-50/80 dark:bg-white/[0.06]
              hover:bg-violet-100/80 dark:hover:bg-white/[0.08] transition-all"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-6 py-3.5 rounded-2xl bg-red-600 text-white font-extrabold
              hover:bg-red-700 shadow-lg shadow-red-200/60 dark:shadow-none active:scale-95 transition-all"
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
                <label className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">
                    Proje Başlığı
                </label>
                <input
                    autoFocus
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Örn: Global Operasyon Planı"
                    className="w-full px-6 py-4 rounded-2xl
            border border-violet-200/70 dark:border-white/10
            bg-violet-50/50 dark:bg-black/20
            focus:ring-4 focus:ring-violet-500/15 focus:border-violet-300/70
            outline-none transition-all font-semibold text-lg"
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 rounded-2xl font-extrabold
            border border-violet-200/70 dark:border-white/10
            hover:bg-violet-50/70 dark:hover:bg-white/[0.06] transition-all"
                >
                    İptal
                </button>

                <button
                    type="submit"
                    disabled={saving || !value.trim()}
                    className={`flex-[2] px-6 py-4 rounded-2xl font-extrabold text-white shadow-xl transition-all active:scale-95 ${saving || !value.trim()
                            ? "bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed"
                            : "bg-violet-600 hover:bg-violet-700 shadow-violet-200/60 dark:shadow-none"
                        }`}
                >
                    {saving ? "İşleniyor..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default Projeler;