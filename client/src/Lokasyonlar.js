import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";
import {
    FiArrowLeft,
    FiMapPin,
    FiSearch,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiChevronDown,
    FiChevronUp,
    FiCheckCircle,
    FiAlertTriangle,
    FiX,
    FiMap,
    FiActivity,
    FiCompass,
    FiRefreshCw,
    FiNavigation,
} from "react-icons/fi";

function Lokasyonlar() {
    const navigate = useNavigate();

    // data
    const [lokasyonlar, setLokasyonlar] = useState([]);
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
        document.title = "Lokasyon Yönetimi";
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setListLoading(true);
        const { data, error } = await supabase
            .from("lokasyonlar")
            .select("*")
            .order("lokasyon", { ascending: true });

        if (error) {
            setErrorMsg("Veriler sunucudan alınamadı.");
            setLokasyonlar([]);
        } else {
            setErrorMsg("");
            setLokasyonlar(data || []);
        }
        setListLoading(false);
    };

    const existingNames = useMemo(
        () =>
            new Set(
                (lokasyonlar || []).map((l) =>
                    (l.lokasyon || "").trim().toLocaleLowerCase("tr")
                )
            ),
        [lokasyonlar]
    );

    const filtered = useMemo(() => {
        const term = q.trim().toLocaleLowerCase("tr");
        let list = [...(lokasyonlar || [])];

        if (term) {
            list = list.filter((l) =>
                (l.lokasyon || "").toLocaleLowerCase("tr").includes(term)
            );
        }

        list.sort((a, b) => {
            const av = (a.lokasyon || "").toLocaleLowerCase("tr");
            const bv = (b.lokasyon || "").toLocaleLowerCase("tr");
            return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });

        return list;
    }, [lokasyonlar, q, sortAsc]);

    // --- CRUD functions ---
    const addLocation = async (name) => {
        const normalized = (name || "").trim();
        if (!normalized) return showToast("error", "Lokasyon adı boş olamaz.");

        if (existingNames.has(normalized.toLocaleLowerCase("tr"))) {
            return showToast("error", "Bu lokasyon zaten sistemde kayıtlı.");
        }

        const { error } = await supabase
            .from("lokasyonlar")
            .insert([{ lokasyon: normalized }]);

        if (error) {
            showToast("error", "Ekleme sırasında bir hata oluştu.");
        } else {
            showToast("success", "Yeni lokasyon başarıyla eklendi.");
            await fetchData();
        }
    };

    const updateLocation = async (id, name) => {
        const normalized = (name || "").trim();
        if (!normalized) return showToast("error", "Lokasyon adı boş olamaz.");

        const clash = lokasyonlar.find(
            (l) =>
                l.id !== id &&
                (l.lokasyon || "")
                    .trim()
                    .toLocaleLowerCase("tr") === normalized.toLocaleLowerCase("tr")
        );
        if (clash) return showToast("error", "Bu isimde başka bir kayıt mevcut.");

        const { error } = await supabase
            .from("lokasyonlar")
            .update({ lokasyon: normalized })
            .eq("id", id);

        if (error) {
            showToast("error", "Güncelleme yapılamadı.");
        } else {
            showToast("success", "Lokasyon güncellendi.");
            await fetchData();
        }
    };

    const deleteLocation = async (id) => {
        const { error } = await supabase.from("lokasyonlar").delete().eq("id", id);
        if (error) {
            showToast("error", "Bu lokasyon kullanımda olduğu için silinemez.");
        } else {
            showToast("success", "Lokasyon başarıyla kaldırıldı.");
            await fetchData();
        }
    };

    const HOME_PATH = "/Anasayfa"; // sizde /anasayfa ise değiştir
    const goHome = () => navigate(HOME_PATH, { replace: false });

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#0b1220] dark:text-slate-50">
                <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {/* Compact page header — same visual language as Anasayfa */}
                    <div className="mb-5 flex flex-col gap-5 border-b border-slate-200/80 pb-5 dark:border-white/[0.08] lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <button onClick={goHome} type="button" className="group mb-4 inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 transition hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300">
                                <FiArrowLeft className="transition-transform duration-200 group-hover:-translate-x-1" /> Ana Sayfaya Dön
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-cyan-600 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-cyan-300">
                                    <FiMapPin size={21} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-cyan-600 dark:text-cyan-300">Operasyon Tanımları</p>
                                    <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Lokasyon Yönetimi</h1>
                                </div>
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Operasyon noktalarını hızlıca bulun, düzenleyin veya yeni lokasyon ekleyin.</p>
                        </div>

                        <button onClick={() => setAddOpen(true)} className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-cyan-950/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-950/15 active:translate-y-0 active:scale-[.98]">
                            <FiPlus className="transition-transform duration-300 group-hover:rotate-90" size={18} /> Yeni Lokasyon
                        </button>
                    </div>

                    {/* Single utility surface instead of multiple KPI cards */}
                    <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_10px_35px_rgba(15,23,42,.045)] dark:border-white/[0.08] dark:bg-[#111927]">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="relative min-w-0 flex-1 group">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-500" size={18} />
                                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lokasyon ara..." className="w-full rounded-xl border border-transparent bg-slate-50 py-3 pl-11 pr-11 text-sm font-semibold outline-none transition focus:border-cyan-400/40 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:bg-white/[0.04] dark:focus:bg-white/[0.055]" />
                                {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><FiX size={16}/></button>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setSortAsc(v => !v)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300 md:flex-none">
                                    {sortAsc ? <FiChevronDown/> : <FiChevronUp/>}{sortAsc ? "A → Z" : "Z → A"}
                                </button>
                                <button onClick={fetchData} className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 md:flex-none">
                                    <FiRefreshCw className="transition-transform duration-500 group-hover:rotate-180"/> Yenile
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-3 flex items-center justify-between px-1">
                        <p className="text-xs font-bold text-slate-400"><span className="text-slate-700 dark:text-slate-200">{filtered.length}</span> lokasyon gösteriliyor</p>
                        {q && <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-extrabold text-cyan-600 dark:text-cyan-300">Arama aktif</span>}
                    </div>

                    {errorMsg && <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/15 dark:text-red-300"><FiAlertTriangle size={18}/>{errorMsg}</div>}

                    {/* Modern list: fewer boxes, clearer scanning */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)] dark:border-white/[0.08] dark:bg-[#111927]">
                        <div className="hidden grid-cols-[64px_1fr_150px] items-center border-b border-slate-200 bg-slate-50/70 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400 sm:grid dark:border-white/[0.06] dark:bg-white/[0.018]">
                            <span>#</span><span>Lokasyon</span><span className="text-right">İşlemler</span>
                        </div>
                        {listLoading ? (
                            <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">{[...Array(6)].map((_,i)=><div key={i} className="h-[74px] animate-pulse bg-slate-50/60 dark:bg-white/[0.015]" />)}</div>
                        ) : filtered.length ? (
                            <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                                {filtered.map((lokasyon, index) => (
                                    <div key={lokasyon.id} style={{ animationDelay: `${Math.min(index * 24, 220)}ms` }} className="group grid gap-3 px-4 py-3.5 animate-in fade-in slide-in-from-bottom-1 transition duration-300 hover:bg-slate-50/90 dark:hover:bg-white/[0.025] sm:grid-cols-[64px_1fr_150px] sm:items-center sm:px-5">
                                        <div className="hidden sm:block"><span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 text-[11px] font-black text-slate-500 transition group-hover:bg-cyan-500/10 group-hover:text-cyan-600 dark:bg-white/[0.05] dark:text-slate-400 dark:group-hover:text-cyan-300">{String(index + 1).padStart(2, '0')}</span></div>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:border-cyan-300 group-hover:text-cyan-600 dark:border-white/10 dark:bg-white/[0.035] dark:group-hover:border-cyan-400/30 dark:group-hover:text-cyan-300"><FiMapPin size={18}/></div>
                                            <div className="min-w-0"><h3 className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{lokasyon.lokasyon}</h3><p className="mt-0.5 text-[11px] font-medium text-slate-400">Operasyon lokasyonu</p></div>
                                        </div>
                                        <div className="flex items-center justify-end gap-1 sm:opacity-60 sm:transition sm:group-hover:opacity-100">
                                            <button onClick={() => { setSelected(lokasyon); setEditOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300" title="Düzenle"><FiEdit2 size={15}/> Düzenle</button>
                                            <button onClick={() => { setToDelete(lokasyon); setConfirmOpen(true); }} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300" title="Sil"><FiTrash2 size={15}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-6 py-20 text-center">
                                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]"><FiMapPin size={24}/></div>
                                <h3 className="mt-4 text-base font-extrabold">Lokasyon bulunamadı</h3>
                                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">Aramanızı değiştirin veya yeni bir lokasyon ekleyin.</p>
                                <button onClick={() => setAddOpen(true)} className="mt-5 text-sm font-extrabold text-cyan-600 hover:text-cyan-700 dark:text-cyan-300">Yeni lokasyon ekle</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Modals & Overlays --- */}
                {addOpen && (
                    <Modal onClose={() => setAddOpen(false)} title="Yeni Lokasyon">
                        <LocationForm
                            submitLabel="Oluştur"
                            onCancel={() => setAddOpen(false)}
                            onSubmit={async (name) => {
                                await addLocation(name);
                                setAddOpen(false);
                            }}
                        />
                    </Modal>
                )}

                {editOpen && selected && (
                    <Modal onClose={() => setEditOpen(false)} title="İsmi Güncelle">
                        <LocationForm
                            defaultValue={selected.lokasyon}
                            submitLabel="Güncelle"
                            onCancel={() => setEditOpen(false)}
                            onSubmit={async (name) => {
                                await updateLocation(selected.id, name);
                                setEditOpen(false);
                                setSelected(null);
                            }}
                        />
                    </Modal>
                )}

                {confirmOpen && toDelete && (
                    <ConfirmDialog
                        title="Lokasyonu Sil"
                        message={`"${toDelete.lokasyon}" kaydı kalıcı olarak silinecektir. Onaylıyor musunuz?`}
                        confirmLabel="Silmeyi Onayla"
                        onCancel={() => {
                            setConfirmOpen(false);
                            setToDelete(null);
                        }}
                        onConfirm={async () => {
                            await deleteLocation(toDelete.id);
                            setConfirmOpen(false);
                            setToDelete(null);
                        }}
                    />
                )}

                {/* --- Toast --- */}
                {toast && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div
                            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl
                ${toast.type === "success"
                                    ? "bg-white/70 dark:bg-white/[0.06] border-slate-200/80 dark:border-white/10 text-cyan-700 dark:text-cyan-300"
                                    : "bg-white/70 dark:bg-white/[0.06] border-red-200/60 dark:border-red-900/30 text-red-700 dark:text-red-300"
                                }`}
                        >
                            {toast.type === "success" ? (
                                <FiCheckCircle size={20} />
                            ) : (
                                <FiAlertTriangle size={20} />
                            )}
                            <span className="text-sm font-extrabold">{toast.msg}</span>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

// --- UI Components ---

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white/85 dark:bg-[#0b1020]/90 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 dark:border-white/10">
                    <h3 className="text-xl font-extrabold">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white/85 dark:bg-[#0b1020]/90 rounded-3xl shadow-2xl p-6 border border-red-200/60 dark:border-red-900/30 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 flex items-center justify-center mb-4">
                    <FiTrash2 size={24} />
                </div>
                <h3 className="text-xl font-extrabold mb-2">{title}</h3>
                <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed mb-6">
                    {message}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl font-extrabold text-sm
              bg-cyan-50/80 dark:bg-white/[0.06]
              hover:bg-slate-100 dark:hover:bg-white/[0.08]
              transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 rounded-xl font-extrabold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200/60 dark:shadow-none transition-all"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function LocationForm({ defaultValue = "", submitLabel = "Kaydet", onSubmit, onCancel }) {
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
            className="space-y-5"
        >
            <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
                    Lokasyon İsmi
                </label>
                <input
                    autoFocus
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Örn: Merkez Depo A1"
                    className="w-full px-4 py-3 rounded-xl border
            border-slate-200/80 dark:border-white/10
            bg-cyan-50/50 dark:bg-black/20
            focus:ring-2 focus:ring-cyan-500/30 focus:border-transparent outline-none transition-all font-semibold"
                />
            </div>
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 rounded-xl font-extrabold text-sm
            border border-slate-200/80 dark:border-white/10
            hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    disabled={saving || !value.trim()}
                    className="flex-[2] bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white
            px-4 py-3 rounded-xl font-extrabold text-sm
            shadow-lg shadow-cyan-950/10 dark:shadow-none transition-all"
                >
                    {saving ? "İşleniyor..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default Lokasyonlar;