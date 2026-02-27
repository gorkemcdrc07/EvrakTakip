import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useNavigate } from "react-router-dom";

/**
 * HEDEF KARGO – Ultra Modern UI (Full Updated Code)
 * --------------------------------------------------------------
 * ✅ KPI Stat Cards
 * ✅ Global Search + Filter Drawer
 * ✅ Sticky Header + Cleaner Table
 * ✅ Row hover Actions reveal
 * ✅ Row selection + Bulk Delete
 * ✅ Add/Edit as right-side Sheet (slide-over)
 * ✅ Toast improvements
 * ✅ Insert/Update .select('*').single() + fetchData refresh
 */

function HedefKargo() {
    const navigate = useNavigate();

    const [kargoData, setKargoData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [toast, setToast] = useState(null); // {type, msg}
    const toastTimerRef = useRef(null);

    // Year info (UI)
    const year = 2025;
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    // UI states
    const [filterOpen, setFilterOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState(null); // null | 'add' | 'edit'
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    // Filters (+ global search __q)
    const [filters, setFilters] = useState({
        __q: '',
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        teslim_tarihi: ''
    });

    const fieldLabels = {
        tarih: 'TARİH',
        gonderici: 'GÖNDERİCİ',
        tedarikci: 'TEDARİKÇİ',
        teslim_edilen_kisi: 'TESLİM EDİLEN KİŞİ',
        teslim_tarihi: 'TESLİM TARİHİ'
    };

    // Forms
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

    const showToast = (type, msg) => {
        setToast({ type, msg });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 2600);
    };

    useEffect(() => {
        fetchData();
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from('hedef_kargo')
            .select('*')
            .order('tarih', { ascending: false });

        if (error) {
            console.error(error);
            showToast('error', error.message || 'Veri alınamadı');
            setKargoData([]);
        } else {
            setKargoData(data || []);
        }

        setLoading(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            __q: '',
            tarih: '',
            gonderici: '',
            tedarikci: '',
            teslim_edilen_kisi: '',
            teslim_tarihi: ''
        });
    };

    const activeFilterCount = useMemo(() => {
        const { __q, ...rest } = filters;
        return Object.values(rest).filter(Boolean).length + (filters.__q ? 1 : 0);
    }, [filters]);

    const activeChips = useMemo(() => {
        return Object.entries(filters)
            .filter(([k, v]) => k !== '__q' && !!v)
            .map(([key, val]) => ({ key, val }));
    }, [filters]);

    const filteredData = useMemo(() => {
        const q = (filters.__q || '').toLocaleLowerCase('tr').trim();

        return (kargoData || []).filter((item) => {
            if (q) {
                const hay = [
                    item.gonderici,
                    item.tedarikci,
                    item.teslim_edilen_kisi,
                    item.tarih,
                    item.teslim_tarihi
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toString()
                    .toLocaleLowerCase('tr');

                if (!hay.includes(q)) return false;
            }

            return Object.entries(filters).every(([field, selected]) => {
                if (field === '__q') return true;
                if (selected === '') return true;
                const itemValue = (item[field] || '').toString().toLocaleLowerCase('tr');
                const selectedValue = selected.toString().toLocaleLowerCase('tr');
                return itemValue.includes(selectedValue);
            });
        });
    }, [kargoData, filters]);

    const stats = useMemo(() => {
        const total = kargoData.length;
        const delivered = kargoData.filter((x) => !!x.teslim_tarihi).length;
        const pending = total - delivered;
        const today = new Date().toISOString().slice(0, 10);
        const addedToday = kargoData.filter((x) => (x.tarih || '').slice(0, 10) === today).length;
        return { total, delivered, pending, addedToday };
    }, [kargoData]);

    // Selection helpers
    const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

    const isAllVisibleSelected = useMemo(() => {
        if (!filteredData.length) return false;
        return filteredData.every((r) => selectedIds.has(r.id));
    }, [filteredData, selectedIds]);

    const toggleSelectAllVisible = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (isAllVisibleSelected) {
                filteredData.forEach((r) => next.delete(r.id));
            } else {
                filteredData.forEach((r) => next.add(r.id));
            }
            return next;
        });
    };

    const toggleSelectOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    // Open sheets
    const openAddSheet = () => {
        setAddForm({
            tarih: '',
            gonderici: '',
            tedarikci: '',
            teslim_edilen_kisi: '',
            teslim_tarihi: ''
        });
        setEditingItem(null);
        setSheetMode('add');
    };

    const openEditSheet = (item) => {
        setEditingItem(item);
        setEditForm({
            tarih: item.tarih ?? '',
            gonderici: item.gonderici ?? '',
            tedarikci: item.tedarikci ?? '',
            teslim_edilen_kisi: item.teslim_edilen_kisi ?? '',
            teslim_tarihi: item.teslim_tarihi ?? ''
        });
        setSheetMode('edit');
    };

    const closeSheet = () => {
        setSheetMode(null);
        setEditingItem(null);
    };

    const handleEditFormChange = useCallback((e) => {
        setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleAddFormChange = useCallback((e) => {
        setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    // CRUD
    const handleSave = async () => {
        if (!editingItem?.id) return;

        const updatableKeys = [
            'tarih',
            'gonderici',
            'tedarikci',
            'teslim_edilen_kisi',
            'teslim_tarihi'
        ];

        const cleaned = updatableKeys.reduce((acc, key) => {
            const val = editForm[key];
            acc[key] = val === '' ? null : val;
            return acc;
        }, {});

        const { data, error } = await supabase
            .from('hedef_kargo')
            .update(cleaned)
            .eq('id', editingItem.id)
            .select('*')
            .single();

        if (error) {
            console.error('Güncelleme hatası:', error);
            showToast('error', error.message || 'Güncellenemedi.');
            return;
        }
        if (!data) {
            showToast('error', 'Güncelleme DB’ye yansımadı (RLS/Policy olabilir).');
            return;
        }

        setKargoData((prev) => prev.map((it) => (it.id === editingItem.id ? data : it)));
        showToast('success', 'Değişiklikler kaydedildi.');
        closeSheet();
        await fetchData();
    };

    const handleAdd = async () => {
        const cleanedForm = Object.fromEntries(
            Object.entries(addForm).map(([k, v]) => [k, v === '' ? null : v])
        );

        const { data, error } = await supabase
            .from('hedef_kargo')
            .insert([cleanedForm])
            .select('*')
            .single();

        if (error) {
            console.error('Ekleme hatası:', error);
            showToast('error', error.message || 'Kayıt eklenemedi.');
            return;
        }
        if (!data) {
            showToast('error', 'Insert DB’ye yansımadı (RLS/Policy olabilir).');
            return;
        }

        setKargoData((prev) => [data, ...prev]);
        showToast('success', 'Yeni kayıt eklendi.');
        closeSheet();
        await fetchData();
    };

    const confirmDelete = (item) => setDeletingItem(item);

    const handleDeleteConfirmed = async () => {
        if (!deletingItem) return;

        const { error } = await supabase
            .from('hedef_kargo')
            .delete()
            .eq('id', deletingItem.id);

        if (!error) {
            setKargoData((prev) => prev.filter((item) => item.id !== deletingItem.id));
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(deletingItem.id);
                return next;
            });
            setDeletingItem(null);
            showToast('success', 'Kayıt silindi.');
            await fetchData();
        } else {
            console.error('Silme hatası:', error);
            showToast('error', error.message || 'Silme sırasında hata oluştu.');
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;

        const ids = Array.from(selectedIds);

        // optimistic
        setKargoData((prev) => prev.filter((r) => !selectedIds.has(r.id)));

        const { error } = await supabase
            .from('hedef_kargo')
            .delete()
            .in('id', ids);

        if (error) {
            console.error('Toplu silme hatası:', error);
            showToast('error', error.message || 'Toplu silme başarısız.');
            // recover
            await fetchData();
            return;
        }

        showToast('success', `${ids.length} kayıt silindi.`);
        clearSelection();
        await fetchData();
    };

    // Export
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

        worksheet.columns = columns.map((col) => ({ ...col, width: 26 }));

        worksheet.getRow(1).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '111827' } };
            cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 12, name: 'Inter' };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
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
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            if (idx > 1 && idx % 2 === 0) {
                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, 'hedef_kargo.xlsx');
        showToast('success', 'Excel oluşturuldu.');
    };

    // Unique suggestions for datalist in drawer
    const uniqueValues = useCallback(
        (field) => {
            const vals = [...new Set(
                kargoData
                    .map((item) => (item[field] || '').toString().trim())
                    .filter(Boolean)
            )];
            // keep UI snappy
            return vals.slice(0, 80);
        },
        [kargoData]
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-[#050510] dark:via-[#07071a] dark:to-[#0a1638] text-gray-900 dark:text-gray-100">
            {/* TOP AURORA */}
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/18 via-fuchsia-400/14 to-cyan-400/14 blur-3xl" />
                <div className="absolute top-40 right-[-160px] h-[380px] w-[380px] rounded-full bg-gradient-to-br from-violet-500/12 to-indigo-400/10 blur-3xl" />
            </div>

            {/* HEADER */}
            <div className="relative border-b border-gray-200/60 dark:border-white/10">
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600/10 via-fuchsia-500/10 to-cyan-500/10" />
                <div className="w-full px-6 py-10">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight flex items-center gap-3">
                                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20">
                                    🎯
                                </span>
                                HEDEF KARGO
                            </h1>
                            <p className="text-sm md:text-[15px] text-gray-600 dark:text-gray-300 mt-2">
                                Kargo kayıtlarını yönet • filtrele • tek tıkla Excel’e aktar.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Görüntülenen yıl aralığı: <span className="font-semibold">{yearStart}</span> –{' '}
                                <span className="font-semibold">{yearEnd}</span>
                            </p>

                            {/* KPI CARDS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
                                <StatCard title="Toplam Kayıt" value={stats.total} emoji="📦" />
                                <StatCard title="Bugün Eklenen" value={stats.addedToday} emoji="✨" />
                                <StatCard title="Teslim Edilen" value={stats.delivered} emoji="✅" />
                                <StatCard title="Bekleyen" value={stats.pending} emoji="⏳" />
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => navigate("/anasayfa")}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-white/70 dark:bg-white/5 backdrop-blur-xl text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 transition"
                                title="Anasayfaya dön"
                            >
                                ⬅️ <span className="font-medium">Anasayfa</span>
                            </button>

                            <button
                                onClick={openAddSheet}
                                className="group inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 ring-1 ring-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition"
                                title="Yeni Kayıt"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="font-medium">Yeni Kayıt</span>
                            </button>

                            <button
                                onClick={exportToExcel}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-white/70 dark:bg-white/5 backdrop-blur-xl text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 transition"
                                title="Excel’e Aktar"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                    <path d="M4 4h16v12H4z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="font-medium">Excel</span>
                            </button>

                            <button
                                onClick={fetchData}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-gray-100/70 dark:bg-white/5 backdrop-blur-xl text-gray-800 dark:text-gray-100 border border-gray-200/70 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 transition"
                                title="Yenile"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                    <path d="M4 4v6h6M20 20v-6h-6M20 10a8 8 0 10-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="font-medium">Yenile</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* BODY */}
            <div className="w-full px-6 py-8">
                {/* TOOLBAR */}
                <div className="mb-5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Global search */}
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 21l-4.3-4.3M10.8 18.6a7.8 7.8 0 110-15.6 7.8 7.8 0 010 15.6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <input
                                value={filters.__q}
                                onChange={(e) => setFilters((f) => ({ ...f, __q: e.target.value }))}
                                className="h-11 w-[320px] max-w-full pl-10 pr-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-gray-400"
                                placeholder="Ara: gönderici, tedarikçi, kişi, tarih..."
                            />
                        </div>

                        {/* Filters button */}
                        <button
                            onClick={() => setFilterOpen(true)}
                            className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/10 transition"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                                <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span className="font-medium">Filtreler</span>
                            {activeFilterCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/60">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-gray-100/70 dark:bg-white/5 backdrop-blur-xl hover:bg-gray-50 dark:hover:bg-white/10 transition text-sm"
                            >
                                Temizle
                            </button>
                        )}
                    </div>

                    {/* Bulk bar */}
                    {selectedCount > 0 ? (
                        <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedCount}</span> seçili
                            </div>
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30 transition"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Toplu Sil
                            </button>
                            <button
                                onClick={clearSelection}
                                className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/10 transition"
                            >
                                Seçimi Kaldır
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            Toplam <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredData.length}</span> kayıt
                        </div>
                    )}
                </div>

                {/* Active chips */}
                {activeChips.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {activeChips.map(({ key, val }) => (
                            <button
                                key={key}
                                onClick={() => setFilters((f) => ({ ...f, [key]: '' }))}
                                className="group inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                                title="Bu filtreyi kaldır"
                            >
                                <span className="font-medium">{fieldLabels[key]}:</span>
                                <span className="opacity-90 truncate max-w-[160px]">{val}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-70 group-hover:opacity-100">
                                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        ))}
                    </div>
                )}

                {/* TABLE */}
                <div className="rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0b1220]/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm md:text-[15px] text-gray-900 dark:text-gray-100">
                            <thead className="bg-gray-50/80 dark:bg-[#0f172a]/80 sticky top-0 z-10">
                                <tr className="text-left">
                                    <th className="px-4 py-3 text-[11px] tracking-wide uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200/70 dark:border-white/10">
                                        <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isAllVisibleSelected}
                                                onChange={toggleSelectAllVisible}
                                                className="h-4 w-4 rounded border-gray-300 dark:border-white/20"
                                            />
                                            Seç
                                        </label>
                                    </th>

                                    {Object.entries(fieldLabels).map(([key, label]) => (
                                        <th
                                            key={key}
                                            className="px-4 py-3 text-[11px] tracking-wide uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200/70 dark:border-white/10"
                                        >
                                            {label}
                                        </th>
                                    ))}

                                    <th className="px-4 py-3 text-[11px] tracking-wide uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200/70 dark:border-white/10 text-center">
                                        İşlemler
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading && <SkeletonRows rows={7} cols={7} />}

                                {!loading && filteredData.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        className={`group ${index % 2 === 0
                                                ? 'bg-white/60 dark:bg-[#0b1220]/40'
                                                : 'bg-gray-50/50 dark:bg-[#0b1220]/25'
                                            } hover:bg-indigo-50/60 dark:hover:bg-[#111c33]/60 transition-colors`}                                    >
                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelectOne(item.id)}
                                                className="h-4 w-4 rounded border-gray-300 dark:border-white/20"
                                            />
                                        </td>

                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/10">{formatDate(item.tarih)}</td>
                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/10">{item.gonderici}</td>
                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/10">{item.tedarikci}</td>
                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/10">{item.teslim_edilen_kisi}</td>

                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                                            <div className="flex items-center gap-2">
                                                {item.teslim_tarihi ? (
                                                    <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/50">
                                                        ✅ {formatDate(item.teslim_tarihi)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 border border-amber-200/60 dark:border-amber-800/50">
                                                        ⏳ Bekliyor
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                                            <div className="flex gap-2 justify-center flex-wrap opacity-100 translate-y-0 transition">
                                                <button
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-amber-900 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-900/30 border border-amber-200/70 dark:border-amber-800/60 hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/30"
                                                    onClick={() => openEditSheet(item)}
                                                    title="Düzenle"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    Düzenle
                                                </button>

                                                <button
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 hover:shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30"
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

                                {!loading && filteredData.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <div className="mx-auto w-full max-w-md">
                                                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-4">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                                        <path d="M11 4a7 7 0 000 14h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        <path d="M17 14l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-200 font-medium">Kayıt bulunamadı</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    Filtreleri temizlemeyi deneyin veya yeni bir kayıt ekleyin.
                                                </p>
                                                <div className="mt-5 flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={openAddSheet}
                                                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition"
                                                    >
                                                        Yeni Kayıt
                                                    </button>
                                                    <button
                                                        onClick={clearFilters}
                                                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-gray-200/70 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 transition"
                                                    >
                                                        Filtreleri Temizle
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/70 dark:bg-[#0f172a]/70 border-t border-gray-200/70 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300">
                        <div>
                            Görüntülenen kayıt:{' '}
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                {!loading ? filteredData.length : '-'}
                            </span>
                        </div>
                        <div className="italic opacity-75">HEDEF • {new Date().toLocaleDateString('tr-TR')}</div>
                    </div>
                </div>
            </div>

            {/* FAB */}
            {!sheetMode && (
                <button
                    onClick={openAddSheet}
                    className="fixed bottom-5 right-5 md:bottom-8 md:right-8 inline-flex items-center gap-2 rounded-3xl px-4 py-3 text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition"
                    title="Yeni Kayıt"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="hidden sm:inline font-medium">Yeni Kayıt</span>
                </button>
            )}

            {/* Toast */}
            {toast && <Toast type={toast.type} msg={toast.msg} />}

            {/* Filter Drawer */}
            <Drawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtreler">
                <div className="space-y-4">
                    <div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">GLOBAL ARAMA</div>
                        <input
                            name="__q"
                            value={filters.__q}
                            onChange={handleFilterChange}
                            className="w-full h-11 px-3 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-gray-400"
                            placeholder="Örn: firma, kişi, tarih..."
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {Object.keys(fieldLabels).map((field) => {
                            const values = uniqueValues(field);
                            return (
                                <div key={field}>
                                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
                                        {fieldLabels[field]}
                                    </label>
                                    <input
                                        list={`filter-${field}`}
                                        name={field}
                                        value={filters[field]}
                                        onChange={handleFilterChange}
                                        className="w-full h-11 px-3 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-gray-400"
                                        placeholder="Filtrele..."
                                    />
                                    <datalist id={`filter-${field}`}>
                                        {values.map((val, idx) => (
                                            <option key={idx} value={val}>
                                                {field.includes('tarih') ? formatDate(val) : val}
                                            </option>
                                        ))}
                                    </datalist>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <button
                            onClick={clearFilters}
                            className="inline-flex items-center justify-center h-11 px-4 rounded-2xl bg-gray-100/80 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition w-full"
                        >
                            Filtreleri Temizle
                        </button>
                    </div>
                </div>
            </Drawer>

            {/* Add/Edit Sheet */}
            <Sheet open={!!sheetMode} onClose={closeSheet} title={sheetMode === 'edit' ? 'Kaydı Düzenle' : 'Yeni Kayıt'}>
                {sheetMode === 'edit' && (
                    <FormGrid
                        form={editForm}
                        onChange={handleEditFormChange}
                        onCancel={closeSheet}
                        onSubmit={handleSave}
                        submitLabel="Kaydet"
                        tone="success"
                    />
                )}
                {sheetMode === 'add' && (
                    <FormGrid
                        form={addForm}
                        onChange={handleAddFormChange}
                        onCancel={closeSheet}
                        onSubmit={handleAdd}
                        submitLabel="Kaydet"
                        tone="primary"
                    />
                )}
            </Sheet>

            {/* Delete confirm */}
            {deletingItem && (
                <DeleteModal onCancel={() => setDeletingItem(null)} onConfirm={handleDeleteConfirmed} />
            )}
        </div>
    );
}

/* =========================
   UI Components
   ========================= */

const StatCard = ({ title, value, emoji }) => (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-fuchsia-400/10 to-cyan-400/10" />
        <div className="relative flex items-center justify-between">
            <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
            </div>
            <div className="h-11 w-11 rounded-2xl grid place-items-center bg-white/70 dark:bg-white/10 border border-gray-200/60 dark:border-white/10">
                <span className="text-xl">{emoji}</span>
            </div>
        </div>
    </div>
);

const Toast = ({ type = 'info', msg }) => {
    const color =
        type === 'success'
            ? 'from-emerald-600 to-teal-600'
            : type === 'error'
                ? 'from-rose-600 to-rose-700'
                : 'from-indigo-600 to-violet-600';
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60]">
            <div className={`px-4 py-2 text-sm text-white rounded-2xl shadow-lg bg-gradient-to-r ${color} animate-[toast_0.25s_ease-out]`}>
                {msg}
            </div>
            <style>{`
        @keyframes toast { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
};

const SkeletonRows = ({ rows = 6, cols = 7 }) => {
    const arr = Array.from({ length: rows });
    return (
        <>
            {arr.map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white/60 dark:bg-white/3' : 'bg-gray-50/50 dark:bg-white/2'}>
                    {Array.from({ length: cols }).map((__, c) => (
                        <td key={c} className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                            <div className="h-4 w-40 max-w-[60%] animate-pulse rounded bg-gray-200/80 dark:bg-white/10" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
};

/* Drawer (Filters) */
const Drawer = ({ open, onClose, children, title }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white/80 dark:bg-[#07071a]/80 backdrop-blur-xl border-l border-gray-200/70 dark:border-white/10 p-5 animate-[slidein_0.18s_ease-out]">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-semibold tracking-tight">{title}</div>
                    <button
                        onClick={onClose}
                        className="px-3 py-2 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition"
                    >
                        Kapat
                    </button>
                </div>
                {children}
            </div>
            <style>{`
        @keyframes slidein { from { transform: translateX(12px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
        </div>
    );
};

/* Sheet (Add/Edit) */
const Sheet = ({ open, onClose, children, title }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[55]">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white/85 dark:bg-[#07071a]/85 backdrop-blur-xl border-l border-gray-200/70 dark:border-white/10 shadow-2xl animate-[slidein_0.18s_ease-out]">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200/70 dark:border-white/10 flex items-center justify-between">
                    <div>
                        <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">HEDEF KARGO</div>
                        <h2 className="text-xl md:text-2xl font-semibold tracking-tight mt-1">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-3 py-2 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition"
                    >
                        Kapat
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
            <style>{`
        @keyframes slidein { from { transform: translateX(12px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
        </div>
    );
};

const FormGrid = ({ form, onChange, onCancel, onSubmit, submitLabel, tone = 'primary' }) => {
    const submitClass =
        tone === 'success'
            ? 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus-visible:ring-emerald-500/30 shadow-emerald-600/20'
            : 'from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus-visible:ring-indigo-500/30 shadow-indigo-600/20';

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(form).map((field) => (
                    <div key={field}>
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
                            {field.replaceAll('_', ' ').toUpperCase()}
                        </label>
                        <input
                            type={field.includes('tarih') ? 'date' : 'text'}
                            name={field}
                            value={form[field] ?? ''}
                            onChange={onChange}
                            className="w-full h-11 px-3 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <button
                    onClick={onCancel}
                    className="px-4 py-2.5 rounded-2xl bg-gray-100/80 hover:bg-gray-50 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/20 transition"
                >
                    İptal
                </button>
                <button
                    onClick={onSubmit}
                    className={`px-4 py-2.5 rounded-2xl text-white bg-gradient-to-r ${submitClass} shadow-md focus:outline-none focus-visible:ring-4 transition`}
                >
                    {submitLabel}
                </button>
            </div>
        </>
    );
};

/* Delete Confirm Modal */
const ModalShell = ({ title, children, onCancel }) => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative w-full max-w-lg rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-[#07071a]/90 backdrop-blur-xl shadow-2xl animate-[modal_0.2s_ease-out]">
            <div className="px-6 pt-5 pb-3 border-b border-gray-200/70 dark:border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                <button
                    onClick={onCancel}
                    className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-xl px-3 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition"
                >
                    Kapat
                </button>
            </div>
            <div className="p-6">{children}</div>
            <style>{`
        @keyframes modal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    </div>
);

const DeleteModal = ({ onCancel, onConfirm }) => (
    <ModalShell title="⚠️ Emin misiniz?" onCancel={onCancel}>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
            Bu kaydı silmek istediğinizden emin misiniz?
        </p>
        <div className="flex justify-end gap-2">
            <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-2xl bg-gray-100/80 hover:bg-gray-50 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/20 transition"
            >
                İptal
            </button>
            <button
                onClick={onConfirm}
                className="px-4 py-2.5 rounded-2xl text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30 transition"
            >
                Evet, Sil
            </button>
        </div>
    </ModalShell>
);

export default HedefKargo;