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
    FiActivity,
    FiLayers,
    FiRefreshCw,
    FiCommand,
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
            <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#0b1220] dark:text-slate-50">
                <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <div className="mb-5 flex flex-col gap-5 border-b border-slate-200/80 pb-5 dark:border-white/[0.08] lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <button onClick={goHome} type="button" className="group mb-4 inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300">
                                <FiHome className="transition-transform duration-200 group-hover:-translate-y-0.5" /> Ana Sayfaya Dön
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-blue-600 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-blue-300"><FiFolder size={21}/></div>
                                <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600 dark:text-blue-300">Operasyon Tanımları</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Proje Yönetimi</h1></div>
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Projeleri tek ekrandan yönetin, arayın ve gerektiğinde hızlıca düzenleyin.</p>
                        </div>
                        <button onClick={() => setAddOpen(true)} className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-cyan-950/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-950/15 active:translate-y-0 active:scale-[.98]">
                            <FiPlus className="transition-transform duration-300 group-hover:rotate-90" size={18}/> Yeni Proje
                        </button>
                    </div>

                    <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_10px_35px_rgba(15,23,42,.045)] dark:border-white/[0.08] dark:bg-[#111927]">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="relative min-w-0 flex-1 group">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={18}/>
                                <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Proje ara..." className="w-full rounded-xl border border-transparent bg-slate-50 py-3 pl-11 pr-11 text-sm font-semibold outline-none transition focus:border-blue-400/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:bg-white/[0.04] dark:focus:bg-white/[0.055]"/>
                                {q && <button onClick={()=>setQ("")} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><FiX size={16}/></button>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={()=>setSortAsc(v=>!v)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 md:flex-none">{sortAsc ? <FiChevronDown/> : <FiChevronUp/>}{sortAsc ? "A → Z" : "Z → A"}</button>
                                <button onClick={fetchProjects} className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300 md:flex-none"><FiRefreshCw className="transition-transform duration-500 group-hover:rotate-180"/> Yenile</button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-3 flex items-center justify-between px-1"><p className="text-xs font-bold text-slate-400"><span className="text-slate-700 dark:text-slate-200">{filtered.length}</span> proje gösteriliyor</p>{q && <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-300">Arama aktif</span>}</div>
                    {errorMsg && <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/15 dark:text-red-300"><FiAlertTriangle size={18}/>{errorMsg}</div>}

                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)] dark:border-white/[0.08] dark:bg-[#111927]">
                        <div className="hidden grid-cols-[64px_1fr_150px] items-center border-b border-slate-200 bg-slate-50/70 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400 sm:grid dark:border-white/[0.06] dark:bg-white/[0.018]"><span>#</span><span>Proje</span><span className="text-right">İşlemler</span></div>
                        {listLoading ? (
                            <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">{[...Array(6)].map((_,i)=><div key={i} className="h-[74px] animate-pulse bg-slate-50/60 dark:bg-white/[0.015]" />)}</div>
                        ) : filtered.length ? (
                            <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                                {filtered.map((proje,index)=>(
                                    <div key={proje.id} style={{ animationDelay: `${Math.min(index * 24, 220)}ms` }} className="group grid gap-3 px-4 py-3.5 animate-in fade-in slide-in-from-bottom-1 transition duration-300 hover:bg-slate-50/90 dark:hover:bg-white/[0.025] sm:grid-cols-[64px_1fr_150px] sm:items-center sm:px-5">
                                        <div className="hidden sm:block"><span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 text-[11px] font-black text-slate-500 transition group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:bg-white/[0.05] dark:text-slate-400 dark:group-hover:text-blue-300">{String(index+1).padStart(2,'0')}</span></div>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-300 group-hover:text-blue-600 dark:border-white/10 dark:bg-white/[0.035] dark:group-hover:border-blue-400/30 dark:group-hover:text-blue-300"><FiFolder size={18}/></div>
                                            <div className="min-w-0"><h3 className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{proje.proje}</h3><p className="mt-0.5 text-[11px] font-medium text-slate-400">Tanımlı proje</p></div>
                                        </div>
                                        <div className="flex items-center justify-end gap-1 sm:opacity-60 sm:transition sm:group-hover:opacity-100">
                                            <button onClick={()=>{setSelected(proje);setEditOpen(true);}} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300" title="Düzenle"><FiEdit2 size={15}/> Düzenle</button>
                                            <button onClick={()=>{setToDelete(proje);setConfirmOpen(true);}} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300" title="Sil"><FiTrash2 size={15}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-6 py-20 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]"><FiFolder size={24}/></div><h3 className="mt-4 text-base font-extrabold">Proje bulunamadı</h3><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">Aramanızı değiştirin veya yeni bir proje oluşturun.</p><button onClick={()=>setAddOpen(true)} className="mt-5 text-sm font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-300">Yeni proje oluştur</button></div>
                        )}
                    </div>
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
                                    ? "bg-white/70 dark:bg-white/[0.06] border-slate-200/80 dark:border-white/10 text-blue-700 dark:text-blue-300"
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
        border border-slate-200/80 dark:border-white/10
        shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
            >
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/80 dark:border-white/10">
                    <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-zinc-500 dark:text-zinc-300 transition-colors"
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
              bg-blue-50/80 dark:bg-white/[0.06]
              hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all"
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
            border border-slate-200/80 dark:border-white/10
            bg-blue-50/50 dark:bg-black/20
            focus:ring-4 focus:ring-blue-500/15 focus:border-blue-300/70
            outline-none transition-all font-semibold text-lg"
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 rounded-2xl font-extrabold
            border border-slate-200/80 dark:border-white/10
            hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
                >
                    İptal
                </button>

                <button
                    type="submit"
                    disabled={saving || !value.trim()}
                    className={`flex-[2] px-6 py-4 rounded-2xl font-extrabold text-white shadow-xl transition-all active:scale-95 ${saving || !value.trim()
                            ? "bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 shadow-cyan-950/10 dark:shadow-none"
                        }`}
                >
                    {saving ? "İşleniyor..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default Projeler;