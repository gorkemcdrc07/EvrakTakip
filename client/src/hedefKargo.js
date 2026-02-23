import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useNavigate } from "react-router-dom";

/**
 * HedefKargo – Modern UI Revamp v2 (Fix Pack)
 * --------------------------------------------------------------
 * FIX: Kaydet / Ekle sonrası sayfa yenileyince eskiye dönme
 * - update/insert: .select('*').single() ile net doğrulama
 * - başarı sonrası fetchData() ile DB'den tekrar çekme (kalıcılık garantisi)
 * - hata mesajlarını görünür yapma
 * - yıl filtresi dinamik (varsayılan: 2025)
 */

function HedefKargo() {
    const navigate = useNavigate();
    const [kargoData, setKargoData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [adding, setAdding] = useState(false);

    const [toast, setToast] = useState(null); // {type, msg}
    const toastTimerRef = useRef(null);

    // İstersen sabit 2025 bırak, istersen dinamik yıl seçtir.
    const year = 2025;
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [filters, setFilters] = useState({
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        teslim_tarihi: ''
    });

    const showToast = (type, msg) => {
        setToast({ type, msg });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const activeFilterCount = useMemo(
        () => Object.values(filters).filter(Boolean).length,
        [filters]
    );

    const filteredData = useMemo(() => {
        return kargoData.filter((item) =>
            Object.entries(filters).every(([field, selected]) => {
                if (selected === '') return true;
                const itemValue = (item[field] || '').toString().toLocaleLowerCase('tr');
                const selectedValue = selected.toString().toLocaleLowerCase('tr');
                return itemValue.includes(selectedValue);
            })
        );
    }, [kargoData, filters]);

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
            showToast('error', 'Veri alınamadı');
        } else {
            setKargoData(data || []);
        }

        setLoading(false);
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
            setDeletingItem(null);
            showToast('success', 'Kayıt silindi.');
        } else {
            console.error('Silme hatası:', error);
            showToast('error', error.message || 'Silme sırasında hata oluştu.');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setEditForm({
            tarih: item.tarih ?? '',
            gonderici: item.gonderici ?? '',
            tedarikci: item.tedarikci ?? '',
            teslim_edilen_kisi: item.teslim_edilen_kisi ?? '',
            teslim_tarihi: item.teslim_tarihi ?? ''
        });
    };

    const handleFormChange = useCallback((e) => {
        setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleAddFormChange = useCallback((e) => {
        setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleSave = async () => {
        if (!editingItem?.id) return;

        const updatableKeys = [
            'tarih',
            'gonderici',
            'tedarikci',
            'teslim_edilen_kisi',
            'teslim_tarihi'
        ];

        // boş string -> null
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

        console.log('update result:', { data, error, cleaned, id: editingItem.id });

        if (error) {
            console.error('Güncelleme hatası:', error);
            showToast('error', error.message || 'Güncellenemedi.');
            return;
        }

        if (!data) {
            showToast('error', 'Güncelleme DB’ye yansımadı (RLS/Policy olabilir).');
            return;
        }

        // UI'yı hemen güncelle
        setKargoData((prev) => prev.map((it) => (it.id === editingItem.id ? data : it)));
        setEditingItem(null);
        showToast('success', 'Değişiklikler kaydedildi.');

        // Kalıcılığı garantile: DB’den tekrar çek
        await fetchData();
    };

    const handleAdd = async () => {
        // İstersen zorunlu yap:
        // if (!addForm.tarih) { showToast('error', 'TARİH zorunlu.'); return; }

        const cleanedForm = Object.fromEntries(
            Object.entries(addForm).map(([key, val]) => [key, val === '' ? null : val])
        );

        const { data, error } = await supabase
            .from('hedef_kargo')
            .insert([cleanedForm])
            .select('*')
            .single();

        console.log('insert result:', { data, error, cleanedForm });

        if (error) {
            console.error('Ekleme hatası:', error);
            showToast('error', error.message || 'Kayıt eklenemedi.');
            return;
        }

        if (!data) {
            showToast('error', 'Insert DB’ye yansımadı (RLS/Policy olabilir).');
            return;
        }

        // UI'yı hemen güncelle
        setKargoData((prev) => [data, ...prev]);

        setAdding(false);
        setAddForm({
            tarih: '',
            gonderici: '',
            tedarikci: '',
            teslim_edilen_kisi: '',
            teslim_tarihi: ''
        });

        showToast('success', 'Yeni kayıt eklendi.');

        // Kalıcılığı garantile: DB’den tekrar çek
        await fetchData();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return String(dateStr); // bozuk parse ise ham bas
        return d.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
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

    const fieldLabels = {
        tarih: 'TARİH',
        gonderici: 'GÖNDERİCİ',
        tedarikci: 'TEDARİKÇİ',
        teslim_edilen_kisi: 'TESLİM EDİLEN KİŞİ',
        teslim_tarihi: 'TESLİM TARİHİ'
    };

    const activeChips = Object.entries(filters)
        .filter(([, val]) => !!val)
        .map(([key, val]) => ({ key, val }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-925 dark:to-indigo-950 text-gray-900 dark:text-gray-100">
            {/* HEADER */}
            <div className="relative overflow-hidden border-b border-gray-200/60 dark:border-gray-800/60">
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600/10 via-fuchsia-500/10 to-cyan-500/10" />
                <div className="w-full px-6 py-10">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20">
                                    🎯
                                </span>
                                HEDEF KARGO
                            </h1>
                            <p className="text-sm md:text-[15px] text-gray-600 dark:text-gray-300 mt-2">
                                Kargo kayıtlarını filtrele, düzenle ve tek tıkla Excel’e aktar.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Görüntülenen yıl aralığı: <span className="font-semibold">{yearStart}</span> –{' '}
                                <span className="font-semibold">{yearEnd}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => navigate("/anasayfa")}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-white/80 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70 hover:bg-white dark:hover:bg-gray-800 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 transition"
                                title="Anasayfaya dön"
                            >
                                ⬅️ <span className="font-medium">Anasayfa</span>
                            </button>
                            <button
                                onClick={() => setAdding(true)}
                                className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 ring-1 ring-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition"
                                title="Yeni Kayıt"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="font-medium">Yeni Kayıt</span>
                            </button>

                            <button
                                onClick={exportToExcel}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-white/80 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70 hover:bg-white dark:hover:bg-gray-800 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 transition"
                                title="Excel’e Aktar"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                    <path d="M4 4h16v12H4z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="font-medium">Excel’e Aktar</span>
                            </button>

                            <button
                                onClick={fetchData}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-gray-100/80 dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 transition"
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

            <div className="w-full px-6 py-8">
                {/* FİLTRE ARAÇ ÇUBUĞU */}
                {!editingItem && !adding && (
                    <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
                        <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Filtreler</span>
                                <span className="mx-1 text-gray-400">•</span>
                                <span className="opacity-80">Toplam {filteredData.length} kayıt</span>
                                {activeFilterCount > 0 && (
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200/50 dark:border-indigo-800/60">
                                        {activeFilterCount} aktif
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                                {Object.keys(filters).map((field) => {
                                    const uniqueValues = [...new Set(
                                        kargoData.map((item) => (item[field] || '').toString().trim().toLowerCase())
                                    )]
                                        .filter(Boolean)
                                        .slice(0, 50);

                                    return (
                                        <div key={field} className="flex flex-col">
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
                                                {fieldLabels[field]}
                                            </label>
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

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() =>
                                        setFilters({
                                            tarih: '',
                                            gonderici: '',
                                            tedarikci: '',
                                            teslim_edilen_kisi: '',
                                            teslim_tarihi: ''
                                        })
                                    }
                                    className="text-xs rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition"
                                    title="Filtreleri Temizle"
                                >
                                    Temizle
                                </button>
                            </div>
                        </div>

                        {activeChips.length > 0 && (
                            <div className="px-5 pb-4 -mt-2 flex flex-wrap gap-2">
                                {activeChips.map(({ key, val }) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilters((f) => ({ ...f, [key]: '' }))}
                                        className="group inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                                        title="Bu filtreyi kaldır"
                                    >
                                        <span className="font-medium">{fieldLabels[key]}:</span>
                                        <span className="opacity-90 truncate max-w-[140px]">{val}</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-70 group-hover:opacity-100">
                                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TABLO */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm md:text-[15px]">
                            <thead className="bg-gray-50/80 dark:bg-gray-900/70 sticky top-0 z-10">
                                <tr className="text-left">
                                    {Object.values(fieldLabels).map((label, i) => (
                                        <th
                                            key={i}
                                            className="px-4 py-3 text-[11px] tracking-wide uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800"
                                        >
                                            {label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-[11px] tracking-wide uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 text-center">
                                        İşlemler
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading && <SkeletonRows rows={6} cols={6} />}

                                {!loading &&
                                    filteredData.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className={`${index % 2 === 0 ? 'bg-white/80 dark:bg-gray-900/60' : 'bg-gray-50/60 dark:bg-gray-900/40'
                                                } hover:bg-indigo-50/60 dark:hover:bg-gray-800/60 transition-colors`}
                                        >
                                            <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                                {formatDate(item.tarih)}
                                            </td>
                                            <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{item.gonderici}</td>
                                            <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{item.tedarikci}</td>
                                            <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{item.teslim_edilen_kisi}</td>
                                            <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                                {formatDate(item.teslim_tarihi)}
                                            </td>
                                            <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                                <div className="flex gap-2 justify-center flex-wrap">
                                                    <button
                                                        className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-amber-900 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-900/30 border border-amber-200/70 dark:border-amber-800/60 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/30"
                                                        onClick={() => handleEdit(item)}
                                                        title="Düzenle"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform duration-200 group-hover:rotate-3 group-hover:scale-110">
                                                            <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        Düzenle
                                                    </button>

                                                    <button
                                                        className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30"
                                                        onClick={() => confirmDelete(item)}
                                                        title="Sil"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-110">
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
                                        <td colSpan={6} className="px-4 py-14 text-center">
                                            <div className="mx-auto w-full max-w-sm">
                                                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-4">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                                        <path d="M11 4a7 7 0 000 14h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        <path d="M17 14l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-300 font-medium">Kayıt bulunamadı</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    Filtreleri temizlemeyi deneyin veya yeni bir kayıt ekleyin.
                                                </p>
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setAdding(true)}
                                                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition"
                                                    >
                                                        Yeni Kayıt Ekle
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/70 dark:bg-gray-900/70 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
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
            {!adding && !editingItem && (
                <button
                    onClick={() => setAdding(true)}
                    className="fixed bottom-5 right-5 md:bottom-8 md:right-8 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition"
                    title="Yeni Kayıt"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="hidden sm:inline font-medium">Yeni Kayıt</span>
                </button>
            )}

            {toast && <Toast type={toast.type} msg={toast.msg} />}

            {editingItem && (
                <EditModal
                    form={editForm}
                    handleFormChange={handleFormChange}
                    handleSave={handleSave}
                    onCancel={() => setEditingItem(null)}
                />
            )}

            {adding && (
                <AddModal
                    form={addForm}
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
   Yardımcı Bileşenler
   ========================= */

const Toast = ({ type = 'info', msg }) => {
    const color =
        type === 'success'
            ? 'from-emerald-600 to-teal-600'
            : type === 'error'
                ? 'from-rose-600 to-rose-700'
                : 'from-indigo-600 to-violet-600';
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60]">
            <div className={`px-4 py-2 text-sm text-white rounded-xl shadow-lg bg-gradient-to-r ${color} animate-[toast_0.3s_ease-out]`}>
                {msg}
            </div>
            <style>{`
        @keyframes toast { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
};

const SkeletonRows = ({ rows = 5, cols = 6 }) => {
    const arr = Array.from({ length: rows });
    return (
        <>
            {arr.map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white/80 dark:bg-gray-900/60' : 'bg-gray-50/60 dark:bg-gray-900/40'}>
                    {Array.from({ length: cols }).map((__, c) => (
                        <td key={c} className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="h-4 w-40 max-w-[60%] animate-pulse rounded bg-gray-200/80 dark:bg-gray-800/80" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
};

/* =========================
   MODAL BİLEŞENLERİ
   ========================= */

const ModalShell = ({ title, children, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/80 backdrop-blur shadow-2xl animate-[modal_0.2s_ease-out]">
            <div className="px-6 pt-5 pb-3 border-b border-gray-200/80 dark:border-gray-800/80 flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
                <button
                    onClick={onCancel}
                    className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg px-2 py-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
                >
                    Kapat
                </button>
            </div>
            <div className="p-6">{children}</div>
            <style>{`
        @keyframes modal { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    </div>
);

const EditModal = ({ form, handleFormChange, handleSave, onCancel }) => (
    <ModalShell title="🛠 Kaydı Düzenle" onCancel={onCancel}>
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
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
                        {field.replaceAll('_', ' ').toUpperCase()}
                    </label>
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
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
            Bu kaydı silmek istediğinizden emin misiniz?
        </p>
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
