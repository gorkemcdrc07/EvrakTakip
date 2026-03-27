import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from './supabaseClient';

function HedefKargo() {
    const navigate = useNavigate();

    const [kargoData, setKargoData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    const [filterOpen, setFilterOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState(null); // null | 'add' | 'edit'
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [quickFilter, setQuickFilter] = useState('all');
    const [isDarkMode, setIsDarkMode] = useState(() =>
        typeof document !== 'undefined'
            ? document.documentElement.classList.contains('dark')
            : false
    );

    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [filters, setFilters] = useState({
        __q: '',
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        teslim_tarihi: ''
    });

    const fieldLabels = {
        tarih: 'Tarih',
        gonderici: 'Gönderici',
        tedarikci: 'Tedarikçi',
        teslim_edilen_kisi: 'Teslim Edilen Kişi',
        teslim_tarihi: 'Teslim Tarihi'
    };

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

    const ui = {
        panel:
            'rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-2xl shadow-[0_20px_80px_rgba(15,23,42,0.06)] dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)]',
        panelStrong:
            'rounded-[2rem] border border-white/70 bg-white/75 backdrop-blur-2xl shadow-[0_20px_80px_rgba(15,23,42,0.08)] overflow-hidden dark:border-slate-700/60 dark:bg-slate-900/75 dark:shadow-[0_20px_80px_rgba(0,0,0,0.45)]',
        input:
            'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-indigo-900/40',
        buttonSecondary:
            'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700',
        buttonGhost:
            'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
        title: 'text-slate-900 dark:text-slate-100',
        text: 'text-slate-600 dark:text-slate-300',
        muted: 'text-slate-500 dark:text-slate-400',
        borderSoft: 'border-slate-100 dark:border-slate-800'
    };

    const showToast = useCallback((type, msg) => {
        setToast({ type, msg });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 2600);
    }, []);

    useEffect(() => {
        fetchData();

        const syncTheme = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        syncTheme();

        const observer = new MutationObserver(syncTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            observer.disconnect();
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
            setKargoData([]);
            showToast('error', error.message || 'Veri alınamadı.');
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

    const isDelivered = (item) => !!item?.teslim_tarihi;
    const isPending = (item) => !item?.teslim_tarihi;
    const isAddedToday = (item) => {
        const today = new Date().toISOString().slice(0, 10);
        return (item?.tarih || '').slice(0, 10) === today;
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
        setQuickFilter('all');
    };

    const activeFilterCount = useMemo(() => {
        const { __q, ...rest } = filters;
        return Object.values(rest).filter(Boolean).length + (__q ? 1 : 0) + (quickFilter !== 'all' ? 1 : 0);
    }, [filters, quickFilter]);

    const activeChips = useMemo(() => {
        const chips = Object.entries(filters)
            .filter(([k, v]) => k !== '__q' && !!v)
            .map(([key, val]) => ({ key, val, type: 'field' }));

        if (filters.__q) chips.unshift({ key: '__q', val: filters.__q, type: 'search' });
        if (quickFilter !== 'all') {
            const quickLabels = {
                pending: 'Bekleyen',
                delivered: 'Teslim Edilen',
                today: 'Bugün Eklenen'
            };
            chips.unshift({ key: 'quickFilter', val: quickLabels[quickFilter], type: 'quick' });
        }
        return chips;
    }, [filters, quickFilter]);

    const filteredData = useMemo(() => {
        const q = (filters.__q || '').toLocaleLowerCase('tr').trim();

        return (kargoData || []).filter((item) => {
            if (quickFilter === 'pending' && !isPending(item)) return false;
            if (quickFilter === 'delivered' && !isDelivered(item)) return false;
            if (quickFilter === 'today' && !isAddedToday(item)) return false;

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
    }, [kargoData, filters, quickFilter]);

    const stats = useMemo(() => {
        const total = kargoData.length;
        const delivered = kargoData.filter((x) => !!x.teslim_tarihi).length;
        const pending = total - delivered;
        const today = new Date().toISOString().slice(0, 10);
        const addedToday = kargoData.filter((x) => (x.tarih || '').slice(0, 10) === today).length;
        return { total, delivered, pending, addedToday };
    }, [kargoData]);

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
            showToast('error', 'Güncelleme veritabanına yansımadı.');
            return;
        }

        setKargoData((prev) => prev.map((it) => (it.id === editingItem.id ? data : it)));
        showToast('success', 'Kayıt güncellendi.');
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
            showToast('error', 'Kayıt oluşturuldu ama geri dönmedi.');
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

        if (error) {
            console.error('Silme hatası:', error);
            showToast('error', error.message || 'Silinemedi.');
            return;
        }

        setKargoData((prev) => prev.filter((item) => item.id !== deletingItem.id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(deletingItem.id);
            return next;
        });
        setDeletingItem(null);
        showToast('success', 'Kayıt silindi.');
        await fetchData();
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;

        const ids = Array.from(selectedIds);

        const { error } = await supabase
            .from('hedef_kargo')
            .delete()
            .in('id', ids);

        if (error) {
            console.error('Toplu silme hatası:', error);
            showToast('error', error.message || 'Toplu silme başarısız.');
            return;
        }

        setKargoData((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        clearSelection();
        showToast('success', `${ids.length} kayıt silindi.`);
        await fetchData();
    };

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('HedefKargo');

        worksheet.columns = [
            { header: 'TARİH', key: 'tarih', width: 22 },
            { header: 'GÖNDERİCİ', key: 'gonderici', width: 28 },
            { header: 'TEDARİKÇİ', key: 'tedarikci', width: 28 },
            { header: 'TESLİM EDİLEN KİŞİ', key: 'teslim_edilen_kisi', width: 28 },
            { header: 'TESLİM TARİHİ', key: 'teslim_tarihi', width: 22 }
        ];

        worksheet.getRow(1).eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isDarkMode ? '0F172A' : '111827' }
            };
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
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: isDarkMode ? '1E293B' : 'F3F4F6' }
                    };
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, 'hedef_kargo.xlsx');
        showToast('success', 'Excel hazırlandı.');
    };

    const uniqueValues = useCallback(
        (field) => {
            const vals = [
                ...new Set(
                    kargoData
                        .map((item) => (item[field] || '').toString().trim())
                        .filter(Boolean)
                )
            ];
            return vals.slice(0, 80);
        },
        [kargoData]
    );

    return (
        <div
            className="
                min-h-screen
                bg-[radial-gradient(circle_at_top,#eef2ff,transparent_30%),radial-gradient(circle_at_right,#e0e7ff,transparent_20%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]
                text-slate-900
                dark:bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.15),transparent_30%),radial-gradient(circle_at_right,rgba(59,130,246,0.12),transparent_20%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]
                dark:text-slate-100
            "
        >
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-20 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-fuchsia-400/10 blur-3xl dark:bg-fuchsia-500/10" />
                <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-400/10" />
                <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />
            </div>

            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-8">
                <header className={ui.panelStrong}>
                    <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px]">
                        <div className="rounded-[calc(2rem-1px)] bg-white/95 px-5 py-6 md:px-8 md:py-8 dark:bg-slate-900/95">
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                                        Operasyon Paneli
                                    </div>

                                    <h1 className={`mt-3 flex items-center gap-3 text-3xl font-black tracking-tight md:text-4xl ${ui.title}`}>
                                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
                                            📦
                                        </span>
                                        HEDEF KARGO
                                    </h1>

                                    <p className={`mt-2 max-w-2xl text-sm md:text-base ${ui.text}`}>
                                        Modern, hızlı ve kullanışlı kargo yönetim ekranı. Karttan filtrele, satır seç, düzenle, sil ve Excel’e aktar.
                                    </p>

                                    <p className={`mt-2 text-xs ${ui.muted}`}>
                                        Görüntülenen yıl aralığı:{' '}
                                        <span className="font-semibold">{yearStart}</span> –{' '}
                                        <span className="font-semibold">{yearEnd}</span>
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <ActionButton onClick={() => navigate('/anasayfa')} label="Anasayfa" icon="⬅️" tone="secondary" />
                                    <ActionButton onClick={openAddSheet} label="Yeni Kayıt" icon="＋" tone="primary" />
                                    <ActionButton onClick={exportToExcel} label="Excel Aktar" icon="⬇️" tone="secondary" />
                                    <ActionButton onClick={fetchData} label="Yenile" icon="↻" tone="ghost" />
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    title="Toplam Kayıt"
                                    value={stats.total}
                                    emoji="📦"
                                    subtitle="Tüm liste"
                                    active={quickFilter === 'all'}
                                    onClick={() => setQuickFilter('all')}
                                />
                                <StatCard
                                    title="Bugün Eklenen"
                                    value={stats.addedToday}
                                    emoji="✨"
                                    subtitle="Bugünkü girişler"
                                    active={quickFilter === 'today'}
                                    onClick={() => setQuickFilter((prev) => (prev === 'today' ? 'all' : 'today'))}
                                />
                                <StatCard
                                    title="Teslim Edilen"
                                    value={stats.delivered}
                                    emoji="✅"
                                    subtitle="Teslim tamamlananlar"
                                    active={quickFilter === 'delivered'}
                                    onClick={() => setQuickFilter((prev) => (prev === 'delivered' ? 'all' : 'delivered'))}
                                />
                                <StatCard
                                    title="Bekleyen"
                                    value={stats.pending}
                                    emoji="⏳"
                                    subtitle="Teslim edilmemişler"
                                    active={quickFilter === 'pending'}
                                    onClick={() => setQuickFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))}
                                />
                            </div>
                        </div>
                    </div>
                </header>

                <section className={`mt-5 p-4 md:p-5 ${ui.panel}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-1 flex-col gap-3 lg:flex-row">
                            <div className="relative min-w-[260px] flex-1">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                                    🔎
                                </span>
                                <input
                                    value={filters.__q}
                                    onChange={(e) => setFilters((f) => ({ ...f, __q: e.target.value }))}
                                    className={`${ui.input} bg-white/90 pl-11 pr-4 dark:bg-slate-800/90`}
                                    placeholder="Gönderici, tedarikçi, kişi veya tarihe göre ara..."
                                />
                            </div>

                            <button
                                onClick={() => setFilterOpen(true)}
                                className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${ui.buttonSecondary}`}
                            >
                                Filtreler
                                {activeFilterCount > 0 && (
                                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={clearFilters}
                                className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${ui.buttonGhost}`}
                            >
                                Filtreleri Temizle
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <InfoPill label="Görünen Kayıt" value={filteredData.length} />
                            <InfoPill label="Seçili" value={selectedCount} />

                            {selectedCount > 0 && (
                                <>
                                    <button
                                        onClick={clearSelection}
                                        className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold ${ui.buttonSecondary}`}
                                    >
                                        Seçimi Temizle
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-rose-600"
                                    >
                                        Seçilenleri Sil
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {activeChips.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {activeChips.map((chip) => (
                                <button
                                    key={`${chip.type}-${chip.key}-${chip.val}`}
                                    onClick={() => {
                                        if (chip.key === 'quickFilter') setQuickFilter('all');
                                        else if (chip.key === '__q') setFilters((f) => ({ ...f, __q: '' }));
                                        else setFilters((f) => ({ ...f, [chip.key]: '' }));
                                    }}
                                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/15"
                                >
                                    <span>
                                        {chip.key === '__q'
                                            ? 'Arama'
                                            : chip.key === 'quickFilter'
                                                ? 'Hızlı Filtre'
                                                : fieldLabels[chip.key]}
                                    </span>
                                    <span className="max-w-[180px] truncate">{chip.val}</span>
                                    <span>✕</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className={`mt-5 overflow-hidden ${ui.panel}`}>
                    <div className={`flex items-center justify-between border-b px-4 py-4 md:px-5 ${ui.borderSoft}`}>
                        <div>
                            <h2 className={`text-lg font-bold ${ui.title}`}>Kargo Listesi</h2>
                            <p className={`text-sm ${ui.muted}`}>
                                Kartlara tıklayarak satırları anında filtreleyebilirsin.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
                                <tr>
                                    <Th>
                                        <label className="inline-flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isAllVisibleSelected}
                                                onChange={toggleSelectAllVisible}
                                                className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                                            />
                                            Seç
                                        </label>
                                    </Th>
                                    <Th>Tarih</Th>
                                    <Th>Gönderici</Th>
                                    <Th>Tedarikçi</Th>
                                    <Th>Teslim Edilen Kişi</Th>
                                    <Th>Durum</Th>
                                    <Th center>İşlemler</Th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading && <SkeletonRows rows={8} cols={7} />}

                                {!loading &&
                                    filteredData.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className={`group border-b transition hover:bg-indigo-50/50 dark:hover:bg-slate-800/70 ${index % 2 === 0
                                                    ? 'bg-white/70 dark:bg-slate-900/40'
                                                    : 'bg-slate-50/45 dark:bg-slate-950/30'
                                                } ${ui.borderSoft}`}
                                        >
                                            <Td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelectOne(item.id)}
                                                    className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                                                />
                                            </Td>

                                            <Td>{formatDate(item.tarih)}</Td>

                                            <Td>
                                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                                    {item.gonderici || '-'}
                                                </div>
                                            </Td>

                                            <Td>{item.tedarikci || '-'}</Td>
                                            <Td>{item.teslim_edilen_kisi || '-'}</Td>

                                            <Td>
                                                {item.teslim_tarihi ? (
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                        ✅ {formatDate(item.teslim_tarihi)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                                        ⏳ Bekleyen
                                                    </span>
                                                )}
                                            </Td>

                                            <Td center>
                                                <div className="flex flex-wrap items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditSheet(item)}
                                                        className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"
                                                    >
                                                        Düzenle
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(item)}
                                                        className="rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/20 transition hover:from-rose-500 hover:to-rose-600"
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}

                                {!loading && filteredData.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <div className="mx-auto max-w-md">
                                                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl text-white shadow-lg shadow-indigo-600/20">
                                                    🔍
                                                </div>
                                                <h3 className={`mt-4 text-lg font-bold ${ui.title}`}>Kayıt bulunamadı</h3>
                                                <p className={`mt-2 text-sm ${ui.muted}`}>
                                                    Filtreleri temizle veya yeni bir kayıt ekle.
                                                </p>
                                                <div className="mt-5 flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={clearFilters}
                                                        className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${ui.buttonSecondary}`}
                                                    >
                                                        Filtreleri Temizle
                                                    </button>
                                                    <button
                                                        onClick={openAddSheet}
                                                        className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500"
                                                    >
                                                        Yeni Kayıt
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <FilterDrawer
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                filters={filters}
                onChange={handleFilterChange}
                onClear={clearFilters}
                uniqueValues={uniqueValues}
            />

            <Sheet
                open={sheetMode === 'add' || sheetMode === 'edit'}
                title={sheetMode === 'edit' ? 'Kayıt Düzenle' : 'Yeni Kayıt Ekle'}
                description={sheetMode === 'edit' ? 'Seçilen kargo kaydını güncelle.' : 'Yeni kargo kaydı oluştur.'}
                onClose={closeSheet}
            >
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

            {deletingItem && (
                <DeleteModal
                    onCancel={() => setDeletingItem(null)}
                    onConfirm={handleDeleteConfirmed}
                />
            )}

            <Toast toast={toast} />
        </div>
    );
}

const ActionButton = ({ onClick, label, icon, tone = 'secondary' }) => {
    const styles = {
        primary:
            'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 border-transparent',
        secondary:
            'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700',
        ghost:
            'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
    };

    return (
        <button
            onClick={onClick}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${styles[tone]}`}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );
};

const StatCard = ({ title, value, emoji, subtitle, onClick, active }) => (
    <button
        type="button"
        onClick={onClick}
        className={`group relative w-full overflow-hidden rounded-3xl border p-4 text-left transition-all duration-200 ${active
                ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-[0_16px_40px_rgba(79,70,229,0.18)] dark:border-indigo-400 dark:from-slate-800 dark:to-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]'
                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
            }`}
    >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_32%)]" />
        <div className="relative flex items-start justify-between gap-3">
            <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {title}
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {value}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
            </div>
            <div
                className={`grid h-12 w-12 place-items-center rounded-2xl text-xl transition ${active
                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-slate-700'
                    }`}
            >
                {emoji}
            </div>
        </div>
    </button>
);

const InfoPill = ({ label, value }) => (
    <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-slate-700 dark:bg-slate-800">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
);

const Th = ({ children, center }) => (
    <th
        className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 ${center ? 'text-center' : 'text-left'
            }`}
    >
        {children}
    </th>
);

const Td = ({ children, center }) => (
    <td
        className={`px-4 py-4 text-sm text-slate-700 dark:text-slate-200 ${center ? 'text-center' : 'text-left'
            }`}
    >
        {children}
    </td>
);

const SkeletonRows = ({ rows = 6, cols = 7 }) => {
    return Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`} className="border-b border-slate-100 dark:border-slate-800">
            {Array.from({ length: cols }).map((__, colIndex) => (
                <td key={`skeleton-cell-${rowIndex}-${colIndex}`} className="px-4 py-4">
                    <div className="h-5 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                </td>
            ))}
        </tr>
    ));
};

const FilterDrawer = ({ open, onClose, filters, onChange, onClear, uniqueValues }) => {
    const fields = [
        { name: 'tarih', label: 'Tarih', type: 'date' },
        { name: 'gonderici', label: 'Gönderici', type: 'text' },
        { name: 'tedarikci', label: 'Tedarikçi', type: 'text' },
        { name: 'teslim_edilen_kisi', label: 'Teslim Edilen Kişi', type: 'text' },
        { name: 'teslim_tarihi', label: 'Teslim Tarihi', type: 'date' }
    ];

    return (
        <div className={`fixed inset-0 z-50 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div
                className={`absolute inset-0 bg-slate-950/35 backdrop-blur-sm transition ${open ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />
            <aside
                className={`absolute right-0 top-0 h-full w-full max-w-md transform border-l border-slate-200 bg-white shadow-2xl transition duration-300 dark:border-slate-800 dark:bg-slate-900 ${open ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex h-full flex-col">
                    <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Filtreler</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Listeyi detaylı daraltmak için alanları kullan.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                        {fields.map((field) => (
                            <div key={field.name}>
                                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {field.label}
                                </label>
                                <input
                                    name={field.name}
                                    value={filters[field.name]}
                                    onChange={onChange}
                                    type={field.type}
                                    list={field.type === 'text' ? `list-${field.name}` : undefined}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-indigo-900/40"
                                    placeholder={`${field.label} gir`}
                                />
                                {field.type === 'text' && (
                                    <datalist id={`list-${field.name}`}>
                                        {uniqueValues(field.name).map((item) => (
                                            <option value={item} key={`${field.name}-${item}`} />
                                        ))}
                                    </datalist>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-5 dark:border-slate-800">
                        <button
                            onClick={onClear}
                            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            Temizle
                        </button>
                        <button
                            onClick={onClose}
                            className="h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500"
                        >
                            Uygula
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
};

const Sheet = ({ open, title, description, onClose, children }) => (
    <div className={`fixed inset-0 z-50 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
            className={`absolute inset-0 bg-slate-950/35 backdrop-blur-sm transition ${open ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        />
        <aside
            className={`absolute right-0 top-0 h-full w-full max-w-2xl transform border-l border-slate-200 bg-white shadow-2xl transition duration-300 dark:border-slate-800 dark:bg-slate-900 ${open ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="flex h-full flex-col">
                <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">{children}</div>
            </div>
        </aside>
    </div>
);

const FormGrid = ({ form, onChange, onCancel, onSubmit, submitLabel, tone = 'primary' }) => {
    const fields = [
        { name: 'tarih', label: 'Tarih', type: 'date' },
        { name: 'gonderici', label: 'Gönderici', type: 'text' },
        { name: 'tedarikci', label: 'Tedarikçi', type: 'text' },
        { name: 'teslim_edilen_kisi', label: 'Teslim Edilen Kişi', type: 'text' },
        { name: 'teslim_tarihi', label: 'Teslim Tarihi', type: 'date' }
    ];

    const submitClass =
        tone === 'success'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/20';

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fields.map((field) => (
                    <div
                        key={field.name}
                        className={
                            field.name === 'tedarikci' || field.name === 'teslim_edilen_kisi'
                                ? 'md:col-span-2'
                                : ''
                        }
                    >
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {field.label}
                        </label>
                        <input
                            name={field.name}
                            value={form[field.name] ?? ''}
                            onChange={onChange}
                            type={field.type}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-indigo-900/40"
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-3">
                <button
                    onClick={onCancel}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                    Vazgeç
                </button>
                <button
                    onClick={onSubmit}
                    className={`h-12 rounded-2xl px-5 text-sm font-semibold text-white shadow-lg ${submitClass}`}
                >
                    {submitLabel}
                </button>
            </div>
        </div>
    );
};

const DeleteModal = ({ onCancel, onConfirm }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl dark:border-slate-700/60 dark:bg-slate-900">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-rose-50 text-2xl dark:bg-rose-500/10">
                🗑️
            </div>
            <h3 className="mt-4 text-center text-xl font-bold text-slate-900 dark:text-slate-100">
                Kaydı silmek istiyor musun?
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                Bu işlem geri alınamaz.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                    onClick={onCancel}
                    className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                    Vazgeç
                </button>
                <button
                    onClick={onConfirm}
                    className="h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-rose-600"
                >
                    Sil
                </button>
            </div>
        </div>
    </div>
);

const Toast = ({ toast }) => {
    if (!toast) return null;

    const tone =
        toast.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300';

    return (
        <div className="fixed bottom-5 right-5 z-[70]">
            <div className={`rounded-2xl border px-4 py-3 shadow-xl ${tone}`}>
                <div className="text-sm font-semibold">{toast.msg}</div>
            </div>
        </div>
    );
};

export default HedefKargo;