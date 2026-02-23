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
        () => new Set((lokasyonlar || []).map((l) => (l.lokasyon || "").trim().toLocaleLowerCase("tr"))),
        [lokasyonlar]
    );

    const filtered = useMemo(() => {
        const term = q.trim().toLocaleLowerCase("tr");
        let list = [...(lokasyonlar || [])];

        if (term) {
            list = list.filter((l) => (l.lokasyon || "").toLocaleLowerCase("tr").includes(term));
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

        const { error } = await supabase.from("lokasyonlar").insert([{ lokasyon: normalized }]);
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
                (l.lokasyon || "").trim().toLocaleLowerCase("tr") === normalized.toLocaleLowerCase("tr")
        );
        if (clash) return showToast("error", "Bu isimde başka bir kayıt mevcut.");

        const { error } = await supabase.from("lokasyonlar").update({ lokasyon: normalized }).eq("id", id);
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

    // ✅ FIX: Root "/" sizde login'e gidiyor. Anasayfa dosyanız client/src/Anasayfa ise
    // route'unuz büyük ihtimalle "/Anasayfa" veya "/anasayfa".
    // Burayı router'daki gerçek path ile aynı yap.
    const HOME_PATH = "/Anasayfa"; // <-- eğer route /anasayfa ise bunu "/anasayfa" yap

    const goHome = () => {
        navigate(HOME_PATH, { replace: false });
    };

    return (
        <Layout>
            <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <div className="max-w-6xl mx-auto px-4 py-8">
                    {/* --- Navigation & Header --- */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div className="space-y-4">
                            <button
                                onClick={goHome}
                                type="button"
                                className="group flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                                Ana Sayfaya Dön
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 dark:shadow-none text-white">
                                    <FiMap size={28} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-extrabold tracking-tight">Lokasyonlar</h1>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                                        Sistemde tanımlı <span className="text-blue-600">{lokasyonlar.length}</span> adet bölge bulunuyor.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setAddOpen(true)}
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all"
                        >
                            <FiPlus strokeWidth={3} /> Yeni Lokasyon Tanımla
                        </button>
                    </div>

                    {/* --- Search & Filter Bar --- */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-2 mb-8">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Lokasyon ismine göre filtrele..."
                                className="w-full pl-11 pr-4 py-3 bg-transparent border-none focus:ring-0 text-sm font-medium"
                            />
                        </div>
                        <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-800 hidden sm:block self-center"></div>
                        <button
                            onClick={() => setSortAsc((v) => !v)}
                            className="flex items-center justify-center gap-2 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-sm font-bold text-gray-600 dark:text-gray-300"
                        >
                            {sortAsc ? <FiChevronDown /> : <FiChevronUp />}
                            {sortAsc ? "A'dan Z'ye" : "Z'den A'ya"}
                        </button>
                    </div>

                    {/* --- Content Area --- */}
                    {errorMsg && (
                        <div className="mb-6 animate-in fade-in slide-in-from-top-4 flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
                            <FiAlertTriangle className="flex-shrink-0" />
                            <p className="text-sm font-medium">{errorMsg}</p>
                        </div>
                    )}

                    {listLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-32 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : filtered.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((lok) => (
                                <div
                                    key={lok.id}
                                    className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-900 transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                                                <FiMapPin className="text-gray-400 group-hover:text-blue-500" />
                                            </div>
                                            <h3 className="font-bold text-lg truncate pr-4">{lok.lokasyon}</h3>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center gap-2 border-t border-gray-50 dark:border-gray-800 pt-4">
                                        <button
                                            onClick={() => {
                                                setSelected(lok);
                                                setEditOpen(true);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-all"
                                        >
                                            <FiEdit2 /> Düzenle
                                        </button>
                                        <button
                                            onClick={() => {
                                                setToDelete(lok);
                                                setConfirmOpen(true);
                                            }}
                                            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 dark:bg-gray-800 text-blue-600 mb-4">
                                <FiMapPin size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Kayıt Bulunamadı</h3>
                            <p className="text-gray-500 max-w-xs mx-auto mb-6">
                                Aradığınız kriterlere uygun bir lokasyon bulamadık veya henüz hiç ekleme yapmadınız.
                            </p>
                        </div>
                    )}
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

                {/* --- Animated Toast --- */}
                {toast && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div
                            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${toast.type === "success"
                                    ? "bg-white dark:bg-gray-900 border-green-500 text-green-600"
                                    : "bg-white dark:bg-gray-900 border-red-500 text-red-600"
                                }`}
                        >
                            {toast.type === "success" ? <FiCheckCircle size={20} /> : <FiAlertTriangle size={20} />}
                            <span className="text-sm font-bold">{toast.msg}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center mb-4">
                    <FiTrash2 size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-none transition-all"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Lokasyon İsmi</label>
                <input
                    autoFocus
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Örn: Merkez Depo A1"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                />
            </div>
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-sm border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    disabled={saving || !value.trim()}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none transition-all"
                >
                    {saving ? "İşleniyor..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default Lokasyonlar;