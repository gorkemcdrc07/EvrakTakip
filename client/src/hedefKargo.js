import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * HedefKargo – Modern UI Revamp
 * --------------------------------------------------------------
 * - Pure Tailwind (no extra UI libs needed)
 * - Soft gradient header, glass cards, refined buttons
 * - Accessible focus states, keyboard friendly
 * - Same data model/logic; only UI reworked
 */

function HedefKargo() {
    const [kargoData, setKargoData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [adding, setAdding] = useState(false);

    const [filters, setFilters] = useState({
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        teslim_tarihi: ''
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const filteredData = useMemo(() => (
        kargoData.filter((item) =>
            Object.entries(filters).every(([field, selected]) => {
                if (selected === '') return true;
                const itemValue = (item[field] || '').toString().toLocaleLowerCase('tr');
                const selectedValue = selected.toString().toLocaleLowerCase('tr');
                return itemValue.includes(selectedValue);
            })
        )
    ), [kargoData, filters]);

    const [editForm, setEditForm] = useState({
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        teslim_tarihi: ''
    });

    const [addForm, setAddForm] = useState({
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        teslim_tarihi: ''
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('hedef_kargo')
            .select('*')
            .filter('tarih', 'gte', '2025-01-01')
            .filter('tarih', 'lte', '2025-12-31')
            .order('tarih', { ascending: false });

        if (error) {
            console.error('Veri alınamadı:', error);
        } else {
            setKargoData(data || []);
        }
        setLoading(false);
    };

    const confirmDelete = (item) => setDeletingItem(item);

    const handleDeleteConfirmed = async () => {
        if (!deletingItem) return;
        const { error } = await supabase.from('hedef_kargo').delete().eq('id', deletingItem.id);
        if (!error) {
            setKargoData((prev) => prev.filter((item) => item.id !== deletingItem.id));
            setDeletingItem(null);
        } else {
            console.error('Silme hatası:', error);
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setEditForm({ ...item });
    };

    const handleFormChange = useCallback((e) => {
        setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleAddFormChange = useCallback((e) => {
        setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleSave = async () => {
        const updatableKeys = ['tarih', 'gonderici', 'tedarikci', 'teslim_edilen_kisi', 'teslim_tarihi'];
        const cleaned = updatableKeys.reduce((acc, key) => {
            if (key in editForm) {
                const val = editForm[key];
                acc[key] = (val === '') ? null : val;
            }
            return acc;
        }, {});

        const { data, error } = await supabase
            .from('hedef_kargo')
            .update(cleaned)
            .eq('id', editingItem.id)
            .select();

        if (!error && data?.[0]) {
            setKargoData(prev => prev.map(it => it.id === editingItem.id ? data[0] : it));
            setEditingItem(null);
        } else {
            console.error('Güncelleme hatası:', error);
        }
    };

    const handleAdd = async () => {
        const cleanedForm = Object.fromEntries(Object.entries(addForm).map(([key, val]) => [key, val === '' ? null : val]));
        const { data, error } = await supabase.from('hedef_kargo').insert([cleanedForm]).select();
        if (!error && data?.length > 0) {
            setKargoData((prev) => [data[0], ...prev]);
            setAdding(false);
            setAddForm({ tarih: '', gonderici: '', tedarikci: '', teslim_edilen_kisi: '', teslim_tarihi: '' });
        } else {
            console.error('Ekleme hatası:', error);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('HedefKargo');

        const columns = [
            { header: 'TARİH', key: 'tarih' },
            { header: 'GÖNDERİCİ', key: 'gonderici' },
            { header: 'TEDARİKÇİ', key: 'tedarikci' },
            { header: 'TESLİM EDİLEN KİŞİ', key: 'teslim_edilen_kisi' },
            { header: 'TESLİM TARİHİ', key: 'teslim_tarihi' }
        ];

        worksheet.columns = columns.map((col) => ({ ...col, width: 25 }));

        worksheet.getRow(1).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F2937' } };
            cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 12, name: 'Inter' };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });

        filteredData.forEach((item) => {
            worksheet.addRow({
                tarih: formatDate(item.tarih),
                gonderici: item.gonderici,
                tedarikci: item.tedarikci,
                teslim_edilen_kisi: item.teslim_edilen_kisi,
                teslim_tarihi: formatDate(item.teslim_tarihi)
            });
        });

        worksheet.eachRow((row, idx) => {
            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });
            if (idx > 1 && idx % 2 === 0) {
                row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } }; });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'hedef_kargo.xlsx');
    };

    const fieldLabels = {
        tarih: 'TARİH',
        gonderici: 'GÖNDERİCİ',
        tedarikci: 'TEDARİKÇİ',
        teslim_edilen_kisi: 'TESLİM EDİLEN KİŞİ',
        teslim_tarihi: 'TESLİM TARİHİ'
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-925 dark:to-indigo-950 text-gray-900 dark:text-gray-100">
            {/* HEADER */}
            <div className="relative overflow-hidden border-b border-gray-200/60 dark:border-gray-800/60">
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600/10 via-fuchsia-500/10 to-cyan-500/10" />
                <div className="max-w-7xl mx-auto px-6 py-10">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20">🎯</span>
                                HEDEF KARGO
                            </h1>
                            <p className="text-sm md:text-[15px] text-gray-600 dark:text-gray-300 mt-2">
                                Kargo kayıtlarını filtrele, düzenle ve tek tıkla Excel’e aktar.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setAdding(true)}
                                className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 ring-1 ring-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                <span className="font-medium">Yeni Kayıt</span>
                            </button>
                            <button
                                onClick={exportToExcel}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-white/80 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70 hover:bg-white dark:hover:bg-gray-800 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 transition"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M4 4h16v12H4z" stroke="currentColor" strokeWidth="2" /><path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                <span className="font-medium">Excel’e Aktar</span>
                            </button>
                            <button
                                onClick={fetchData}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-gray-100/80 dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 transition"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M4 4v6h6M20 20v-6h-6M20 10a8 8 0 10-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                <span className="font-medium">Yenile</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* FİLTRE KARTI */}
                {!editingItem && !adding && !loading && (
                    <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
                        <div className="px-5 py-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Filtreler</span>
                                <span className="mx-2 text-gray-400">•</span>
                                <span className="opacity-80">Toplam {filteredData.length} kayıt</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFilters({ tarih: '', gonderici: '', tedarikci: '', teslim_edilen_kisi: '', teslim_tarihi: '' })}
                                    className="text-xs rounded-lg px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition"
                                >
                                    Temizle
                                </button>
                            </div>
                        </div>
                        <div className="px-5 pb-5">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {Object.keys(filters).map((field) => {
                                    const uniqueValues = [
                                        ...new Set(kargoData.map((item) => (item[field] || '').toString().trim().toLowerCase()))
                                    ];
                                    return (
                                        <div key={field} className="flex flex-col">
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">{fieldLabels[field]}</label>
                                            <input
                                                list={`filter-${field}`}
                                                name={field}
                                                value={filters[field]}
                                                onChange={handleFilterChange}
                                                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-gray-400"
                                                placeholder="Filtrele..."
                                            />
                                            <datalist id={`filter-${field}`}>
                                                {uniqueValues.map((val, idx) => (
                                                    <option key={idx} value={val}>
                                                        {field.includes('tarih') ? formatDate(val) : val || '(boş)'}
                                                    </option>
                                                ))}
                                            </datalist>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TABLO KARTI */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
                    ) : (
                        !editingItem && !adding && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm md:text-[15px]">
                                    <thead className="bg-gray-50/80 dark:bg-gray-900/70 sticky top-0 z-10">
                                        <tr className="text-left">
                                            {Object.values(fieldLabels).map((label, i) => (
                                                <th key={i} className="px-4 py-3 text-[11px] tracking-wide uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                                                    {label}
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 text-[11px] tracking-wide uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 text-center">
                                                İşlemler
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((item, index) => (
                                            <tr
                                                key={item.id}
                                                className={`${index % 2 === 0 ? 'bg-white/80 dark:bg-gray-900/60' : 'bg-gray-50/60 dark:bg-gray-900/40'} hover:bg-indigo-50/60 dark:hover:bg-gray-800/60 transition-colors`}
                                            >
                                                <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{formatDate(item.tarih)}</td>
                                                <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{item.gonderici}</td>
                                                <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{item.tedarikci}</td>
                                                <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{item.teslim_edilen_kisi}</td>
                                                <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{formatDate(item.teslim_tarihi)}</td>
                                                <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                                    <div className="flex gap-2 justify-center flex-wrap">
                                                        <button
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white font-medium shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30 transition"
                                                            onClick={() => handleEdit(item)}
                                                            title="Düzenle"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                            Düzenle
                                                        </button>

                                                        <button
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-medium shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30 transition"
                                                            onClick={() => confirmDelete(item)}
                                                            title="Sil"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                            Sil
                                                        </button>

                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredData.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                                                    Kayıt bulunamadı. Filtreleri temizlemeyi deneyin.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* MODALLAR */}
            {editingItem && (
                <EditModal
                    form={editForm}
                    setForm={setEditForm}
                    handleFormChange={handleFormChange}
                    handleSave={handleSave}
                    onCancel={() => setEditingItem(null)}
                />
            )}

            {adding && (
                <AddModal
                    form={addForm}
                    setForm={setAddForm}
                    handleAddFormChange={handleAddFormChange}
                    handleAdd={handleAdd}
                    onCancel={() => setAdding(false)}
                />
            )}

            {deletingItem && (
                <DeleteModal onCancel={() => setDeletingItem(null)} onConfirm={handleDeleteConfirmed} />
            )}
        </div>
    );
}

/* =========================
   MODAL BİLEŞENLERİ – Modern Tasarım
   ========================= */

const ModalShell = ({ title, children, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/80 backdrop-blur shadow-2xl">
            <div className="px-6 pt-5 pb-3 border-b border-gray-200/80 dark:border-gray-800/80 flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
                <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg px-2 py-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20">Kapat</button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

const EditModal = ({ form, handleFormChange, handleSave, onCancel }) => (
    <ModalShell title="🛠 Kaydı Düzenle" onCancel={onCancel}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(form).map((field) => (
                <div key={field}>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">{field.replaceAll('_', ' ').toUpperCase()}</label>
                    <input
                        type={field.includes('tarih') ? 'date' : 'text'}
                        name={field}
                        value={form[field] ?? ''}
                        onChange={handleFormChange}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/50 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                </div>
            ))}
        </div>
        <div className="flex justify-end gap-2 mt-6">
            <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/20 transition"
            >
                İptal
            </button>
            <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 transition"
            >
                Kaydet
            </button>
        </div>
    </ModalShell>
);

const AddModal = ({ form, handleAddFormChange, handleAdd, onCancel }) => (
    <ModalShell title="📝 Yeni Kayıt Ekle" onCancel={onCancel}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(form).map((field) => (
                <div key={field}>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">{field.replaceAll('_', ' ').toUpperCase()}</label>
                    <input
                        type={field.includes('tarih') ? 'date' : 'text'}
                        name={field}
                        value={form[field] ?? ''}
                        onChange={handleAddFormChange}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/50 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                </div>
            ))}
        </div>
        <div className="flex justify-end gap-2 mt-6">
            <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/20 transition"
            >
                İptal
            </button>
            <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition"
            >
                Kaydet
            </button>
        </div>
    </ModalShell>
);

const DeleteModal = ({ onCancel, onConfirm }) => (
    <ModalShell title="⚠️ Emin misiniz?" onCancel={onCancel}>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">Bu kaydı silmek istediğinizden emin misiniz?</p>
        <div className="flex justify-end gap-2">
            <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/20 transition"
            >
                İptal
            </button>
            <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30 transition"
            >
                Evet, Sil
            </button>
        </div>
    </ModalShell>
);

export default HedefKargo;
