import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
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
    FiX
} from 'react-icons/fi';

function Lokasyonlar() {
    const navigate = useNavigate();

    // data
    const [lokasyonlar, setLokasyonlar] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // ui
    const [q, setQ] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [toDelete, setToDelete] = useState(null);

    // toast
    const [toast, setToast] = useState(null); // {type:'success'|'error', msg:string}

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 2500);
    };

    useEffect(() => {
        document.title = 'Lokasyonlar';
        fetchData();
    }, []);

    const fetchData = async () => {
        setListLoading(true);
        const { data, error } = await supabase.from('lokasyonlar').select('*').order('lokasyon', { ascending: true });
        if (error) {
            console.error('❌ Veri çekme hatası:', error);
            setErrorMsg('Veriler alınamadı.');
            setLokasyonlar([]);
        } else {
            setErrorMsg('');
            setLokasyonlar(data || []);
        }
        setListLoading(false);
    };

    const existingNames = useMemo(
        () => new Set((lokasyonlar || []).map((l) => (l.lokasyon || '').trim().toLocaleLowerCase('tr'))),
        [lokasyonlar]
    );

    const filtered = useMemo(() => {
        const term = q.trim().toLocaleLowerCase('tr');
        let list = [...(lokasyonlar || [])];
        if (term) {
            list = list.filter((l) => (l.lokasyon || '').toLocaleLowerCase('tr').includes(term));
        }
        list.sort((a, b) => {
            const av = (a.lokasyon || '').toLocaleLowerCase('tr');
            const bv = (b.lokasyon || '').toLocaleLowerCase('tr');
            return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
        return list;
    }, [lokasyonlar, q, sortAsc]);

    // --- CRUD helpers
    const addLocation = async (name) => {
        const normalized = (name || '').trim();
        if (!normalized) return showToast('error', 'Lokasyon boş olamaz.');
        if (existingNames.has(normalized.toLocaleLowerCase('tr'))) {
            return showToast('error', 'Bu lokasyon zaten var.');
        }
        const { error } = await supabase.from('lokasyonlar').insert([{ lokasyon: normalized }]);
        if (error) {
            console.error(error);
            showToast('error', 'Lokasyon eklenemedi.');
        } else {
            showToast('success', 'Lokasyon eklendi.');
            await fetchData();
        }
    };

    const updateLocation = async (id, name) => {
        const normalized = (name || '').trim();
        if (!normalized) return showToast('error', 'Lokasyon boş olamaz.');
        const clash = lokasyonlar.find(
            (l) => l.id !== id && (l.lokasyon || '').trim().toLocaleLowerCase('tr') === normalized.toLocaleLowerCase('tr')
        );
        if (clash) return showToast('error', 'Aynı isimde başka bir lokasyon var.');
        const { error } = await supabase.from('lokasyonlar').update({ lokasyon: normalized }).eq('id', id);
        if (error) {
            console.error(error);
            showToast('error', 'Güncelleme başarısız.');
        } else {
            showToast('success', 'Lokasyon güncellendi.');
            await fetchData();
        }
    };

    const deleteLocation = async (id) => {
        const { error } = await supabase.from('lokasyonlar').delete().eq('id', id);
        if (error) {
            console.error(error);
            // muhtemel FK kısıtı durumuna özel mesaj
            showToast('error', 'Silinemedi. Bu lokasyon başka kayıtlarla ilişkili olabilir.');
        } else {
            showToast('success', 'Lokasyon silindi.');
            await fetchData();
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-white px-6 py-8 transition-colors duration-300">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            <FiMapPin size={22} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold leading-tight">Lokasyonlar</h2>
                            <p className="text-sm opacity-70">Toplam {lokasyonlar.length} kayıt</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAddOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 shadow-sm"
                        >
                            <FiPlus /> Yeni Lokasyon
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 text-white px-4 py-2"
                        >
                            <FiArrowLeft /> Geri
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-5">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Lokasyon ara…"
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => setSortAsc((v) => !v)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"
                        title="Sırala"
                    >
                        {sortAsc ? <FiChevronDown /> : <FiChevronUp />} {sortAsc ? 'A→Z' : 'Z→A'}
                    </button>
                </div>

                {/* Error */}
                {errorMsg && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        <FiAlertTriangle /> {errorMsg}
                    </div>
                )}

                {/* List / Skeleton */}
                {listLoading ? (
                    <div className="grid gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse border border-gray-200 dark:border-gray-800"
                            />
                        ))}
                    </div>
                ) : filtered.length ? (
                    <ul className="grid gap-3">
                        {filtered.map((lok) => (
                            <li
                                key={lok.id}
                                className="group flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="rounded-lg p-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        <FiMapPin />
                                    </div>
                                    <span className="truncate font-medium">{lok.lokasyon}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelected(lok);
                                            setEditOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 hover:bg-gray-50"
                                    >
                                        <FiEdit2 /> Düzenle
                                    </button>
                                    <button
                                        onClick={() => {
                                            setToDelete(lok);
                                            setConfirmOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-sm"
                                    >
                                        <FiTrash2 /> Sil
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                        <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <FiMapPin className="opacity-60" />
                        </div>
                        <div className="font-semibold">Kayıt bulunamadı</div>
                        <div className="text-sm opacity-70">Yeni lokasyon ekleyerek başlayabilirsin.</div>
                        <button
                            onClick={() => setAddOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                        >
                            <FiPlus /> Lokasyon Ekle
                        </button>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {addOpen && (
                <Modal onClose={() => setAddOpen(false)} title="Yeni Lokasyon Ekle">
                    <LocationForm
                        submitLabel="Ekle"
                        onCancel={() => setAddOpen(false)}
                        onSubmit={async (name) => {
                            await addLocation(name);
                            setAddOpen(false);
                        }}
                    />
                </Modal>
            )}

            {/* Edit Modal */}
            {editOpen && selected && (
                <Modal onClose={() => setEditOpen(false)} title="Lokasyonu Düzenle">
                    <LocationForm
                        defaultValue={selected.lokasyon}
                        submitLabel="Kaydet"
                        onCancel={() => setEditOpen(false)}
                        onSubmit={async (name) => {
                            await updateLocation(selected.id, name);
                            setEditOpen(false);
                            setSelected(null);
                        }}
                    />
                </Modal>
            )}

            {/* Confirm Delete */}
            {confirmOpen && toDelete && (
                <ConfirmDialog
                    title="Silme Onayı"
                    message={`“${toDelete.lokasyon}” lokasyonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
                    confirmLabel="Evet, Sil"
                    cancelLabel="Vazgeç"
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

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 shadow-lg ${toast.type === 'success'
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                    >
                        {toast.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
                        <span className="text-sm">{toast.msg}</span>
                    </div>
                </div>
            )}
        </Layout>
    );
}

/* ---------- Reusable UI bits ---------- */

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                        <FiX />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

function ConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <div className="p-5">
                    <p className="text-sm opacity-90">{message}</p>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={onCancel} className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-white dark:bg-gray-800">
                            {cancelLabel || 'Vazgeç'}
                        </button>
                        <button onClick={onConfirm} className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm">
                            {confirmLabel || 'Onayla'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LocationForm({ defaultValue = '', submitLabel = 'Kaydet', onSubmit, onCancel }) {
    const [value, setValue] = useState(defaultValue);
    const [saving, setSaving] = useState(false);

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                if (saving) return;
                setSaving(true);
                await onSubmit?.(value);
                setSaving(false);
            }}
            className="space-y-4"
        >
            <div>
                <label className="text-sm font-medium">Lokasyon Adı</label>
                <input
                    autoFocus
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Örn: İstanbul Depo"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-white dark:bg-gray-800"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    disabled={saving || !value.trim()}
                    className={`rounded-lg px-4 py-2 text-sm text-white ${saving || !value.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {saving ? 'Kaydediliyor…' : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default Lokasyonlar;
