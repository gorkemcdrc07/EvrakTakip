import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from './supabaseClient';
import { logAudit } from './services/operationsHub';
import { AnimatePresence, motion } from 'framer-motion';
import { FiArrowLeft, FiPlus, FiDownload, FiRefreshCw, FiSearch, FiCalendar, FiPackage, FiCheckCircle, FiClock, FiEdit3, FiTrash2, FiChevronLeft, FiChevronRight, FiZap, FiSliders, FiInbox, FiTruck, FiUser, FiMoreHorizontal, FiX, FiDatabase } from 'react-icons/fi';

const toInputDate = (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getTodayKey = () => toInputDate(new Date());

const getLast7Range = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return { start: toInputDate(start), end: toInputDate(end) };
};

function HedefKargo() {
    const navigate = useNavigate();

    const [kargoData, setKargoData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingCount, setLoadingCount] = useState(0);

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

    const initialRange = useMemo(() => getLast7Range(), []);
    const [dateStart, setDateStart] = useState(initialRange.start);
    const [dateEnd, setDateEnd] = useState(initialRange.end);
    const [loadedRange, setLoadedRange] = useState(initialRange);
    const [page, setPage] = useState(1);
    const pageSize = 100;

    const [filters, setFilters] = useState({
        __q: '',
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        beklenen_teslim_tarihi: '',
        teslim_tarihi: ''
    });

    const fieldLabels = {
        tarih: 'Tarih',
        gonderici: 'Gönderici',
        tedarikci: 'Tedarikçi',
        teslim_edilen_kisi: 'Teslim Edilen Kişi',
        beklenen_teslim_tarihi: 'Beklenen Teslim Tarihi',
        teslim_tarihi: 'Teslim Tarihi'
    };

    const [editForm, setEditForm] = useState({
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        beklenen_teslim_tarihi: '',
        teslim_tarihi: ''
    });

    const [addForm, setAddForm] = useState({
        tarih: '',
        gonderici: '',
        tedarikci: '',
        teslim_edilen_kisi: '',
        beklenen_teslim_tarihi: '',
        teslim_tarihi: ''
    });

    const ui = {
        panel:
            'rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.055)] dark:border-white/[0.08] dark:bg-[#111927] dark:shadow-[0_16px_50px_rgba(0,0,0,0.28)]',
        panelStrong:
            'rounded-[26px] border border-slate-200/80 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.06)] overflow-hidden dark:border-white/[0.08] dark:bg-[#111927] dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]',
        input:
            'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-sky-900/40',
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
        fetchData(initialRange.start, initialRange.end);

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

    const fetchData = async (startDate = dateStart, endDate = dateEnd) => {
        if (!startDate || !endDate) {
            showToast('error', 'Başlangıç ve bitiş tarihi seçmelisin.');
            return;
        }
        if (startDate > endDate) {
            showToast('error', 'Başlangıç tarihi bitiş tarihinden sonra olamaz.');
            return;
        }

        setLoading(true);
        setLoadingCount(0);
        setPage(1);
        clearSelection();

        const chunkSize = 1000;

        // Hedef Kargo'da tarih aralığı yalnızca teslim edilmiş kayıtların
        // "Durum Tarihi" (teslim_tarihi) alanını sınırlar. Durum tarihi boş
        // kayıtlar bekleyen olduğundan tarih aralığından bağımsız yüklenir.
        // Ayrıca bugün oluşturulan kayıtlar, durum tarihi ne olursa olsun
        // "Bugün Eklenen" kartında eksiksiz görünsün diye ayrıca alınır.
        const fetchPaged = async (buildQuery) => {
            let rows = [];
            let from = 0;
            while (true) {
                const { data, error } = await buildQuery(from, from + chunkSize - 1);
                if (error) throw error;
                const batch = data || [];
                rows = rows.concat(batch);
                setLoadingCount((prev) => prev + batch.length);
                if (batch.length < chunkSize) break;
                from += chunkSize;
            }
            return rows;
        };

        try {
            setLoadingCount(0);
            const today = getTodayKey();
            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrow = toInputDate(tomorrowDate);

            const [deliveredInRange, pendingRows, addedTodayRows] = await Promise.all([
                fetchPaged((from, to) =>
                    supabase
                        .from('hedef_kargo')
                        .select('*')
                        .not('teslim_tarihi', 'is', null)
                        .gte('teslim_tarihi', startDate)
                        .lte('teslim_tarihi', endDate)
                        .order('teslim_tarihi', { ascending: false })
                        .range(from, to)
                ),
                fetchPaged((from, to) =>
                    supabase
                        .from('hedef_kargo')
                        .select('*')
                        .is('teslim_tarihi', null)
                        .order('tarih', { ascending: false })
                        .range(from, to)
                ),
                fetchPaged((from, to) =>
                    supabase
                        .from('hedef_kargo')
                        .select('*')
                        .gte('tarih', today)
                        .lt('tarih', tomorrow)
                        .order('tarih', { ascending: false })
                        .range(from, to)
                )
            ]);

            // Aynı kayıt hem "bekleyen" hem "bugün eklenen" olabileceği için
            // id bazında tekilleştiriyoruz.
            const merged = new Map();
            [...deliveredInRange, ...pendingRows, ...addedTodayRows].forEach((row) => {
                merged.set(row.id, row);
            });

            const all = Array.from(merged.values()).sort((a, b) => {
                const aDate = a.teslim_tarihi || a.tarih || '';
                const bDate = b.teslim_tarihi || b.tarih || '';
                return String(bDate).localeCompare(String(aDate));
            });

            setKargoData(all);
            setLoadedRange({ start: startDate, end: endDate });
            showToast(
                'success',
                `${all.length.toLocaleString('tr-TR')} kayıt yüklendi • ${pendingRows.length.toLocaleString('tr-TR')} bekleyen`
            );
        } catch (error) {
            console.error(error);
            setKargoData([]);
            showToast('error', error.message || 'Veri alınamadı.');
        } finally {
            setLoading(false);
        }
    };

    const applyPreset = (type) => {
        const end = new Date();
        const start = new Date();
        if (type === '7d') start.setDate(end.getDate() - 6);
        if (type === '30d') start.setDate(end.getDate() - 29);
        if (type === 'month') start.setDate(1);
        const nextStart = toInputDate(start);
        const nextEnd = toInputDate(end);
        setDateStart(nextStart);
        setDateEnd(nextEnd);
        fetchData(nextStart, nextEnd);
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
        const today = getTodayKey();
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
            beklenen_teslim_tarihi: '',
            teslim_tarihi: ''
        });
        setQuickFilter('all');
        setPage(1);
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

    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    const pagedData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, page]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const stats = useMemo(() => {
        const total = kargoData.length;
        const delivered = kargoData.filter((x) => !!x.teslim_tarihi).length;
        const pending = total - delivered;
        const today = getTodayKey();
        const addedToday = kargoData.filter((x) => (x.tarih || '').slice(0, 10) === today).length;
        const deliveryRate = total ? Math.round((delivered / total) * 100) : 0;
        return { total, delivered, pending, addedToday, deliveryRate };
    }, [kargoData]);

    const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

    const isAllVisibleSelected = useMemo(() => {
        if (!pagedData.length) return false;
        return pagedData.every((r) => selectedIds.has(r.id));
    }, [pagedData, selectedIds]);

    const toggleSelectAllVisible = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (isAllVisibleSelected) {
                pagedData.forEach((r) => next.delete(r.id));
            } else {
                pagedData.forEach((r) => next.add(r.id));
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
            beklenen_teslim_tarihi: '',
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
            beklenen_teslim_tarihi: item.beklenen_teslim_tarihi ?? '',
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
            'beklenen_teslim_tarihi',
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
        await logAudit('Hedef Kargo kaydını düzenledi', 'hedef_kargo', editingItem.id, editingItem, cleaned, '/hedef-kargo');
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
        await logAudit('Hedef Kargo kaydı ekledi', 'hedef_kargo', data.id, null, data, '/hedef-kargo');
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
        await logAudit('Hedef Kargo kaydını sildi', 'hedef_kargo', deletingItem.id, deletingItem, null, '/hedef-kargo');
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
        if (!filteredData.length) {
            showToast('error', 'Excel için dışa aktarılacak kayıt bulunamadı.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Odak Lojistik';
        workbook.lastModifiedBy = 'Hedef Kargo';
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.company = 'Odak Lojistik';
        workbook.subject = 'Hedef Kargo Operasyon Raporu';
        workbook.title = 'Hedef Kargo Operasyon Raporu';
        workbook.description = 'Hedef Kargo ekranından oluşturulan operasyon ve teslimat raporu.';

        const COLORS = {
            navy: '0F172A',
            navy2: '111827',
            slate: '334155',
            muted: '64748B',
            line: 'E2E8F0',
            soft: 'F8FAFC',
            soft2: 'F1F5F9',
            sky: '0284C7',
            cyan: '06B6D4',
            skySoft: 'E0F2FE',
            cyanSoft: 'CFFAFE',
            green: '059669',
            greenSoft: 'D1FAE5',
            amber: 'D97706',
            amberSoft: 'FEF3C7',
            white: 'FFFFFF',
            rose: 'E11D48',
            roseSoft: 'FFE4E6'
        };

        const thinBorder = {
            top: { style: 'thin', color: { argb: COLORS.line } },
            left: { style: 'thin', color: { argb: COLORS.line } },
            bottom: { style: 'thin', color: { argb: COLORS.line } },
            right: { style: 'thin', color: { argb: COLORS.line } }
        };

        const reportStart = loadedRange?.start || dateStart;
        const reportEnd = loadedRange?.end || dateEnd;
        const generatedAt = new Date().toLocaleString('tr-TR');
        const deliveredCount = filteredData.filter((item) => isDelivered(item)).length;
        const pendingCount = filteredData.length - deliveredCount;
        const deliveredRate = filteredData.length ? Math.round((deliveredCount / filteredData.length) * 100) : 0;

        const makeCounts = (field) => {
            const map = new Map();
            filteredData.forEach((item) => {
                const value = String(item?.[field] || '').trim();
                if (!value) return;
                map.set(value, (map.get(value) || 0) + 1);
            });
            return [...map.entries()].sort((a, b) => b[1] - a[1]);
        };

        const senderRanking = makeCounts('gonderici');
        const supplierRanking = makeCounts('tedarikci');
        const receiverRanking = makeCounts('teslim_edilen_kisi');

        const summary = workbook.addWorksheet('Yönetici Özeti', {
            views: [{ showGridLines: false }],
            properties: { defaultRowHeight: 20 }
        });

        summary.columns = [
            { key: 'A', width: 4 },
            { key: 'B', width: 23 },
            { key: 'C', width: 17 },
            { key: 'D', width: 4 },
            { key: 'E', width: 23 },
            { key: 'F', width: 17 },
            { key: 'G', width: 4 },
            { key: 'H', width: 23 },
            { key: 'I', width: 17 },
            { key: 'J', width: 4 }
        ];

        summary.mergeCells('A1:J3');
        const titleCell = summary.getCell('A1');
        titleCell.value = 'ODAK LOJİSTİK  •  HEDEF KARGO';
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
        titleCell.font = { bold: true, size: 22, color: { argb: COLORS.white }, name: 'Aptos Display' };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        summary.mergeCells('A4:J4');
        const subtitleCell = summary.getCell('A4');
        subtitleCell.value = 'OPERASYON & TESLİMAT ANALİZ RAPORU';
        subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sky } };
        subtitleCell.font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Aptos' };
        subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        summary.getRow(4).height = 28;

        summary.mergeCells('B6:F6');
        summary.getCell('B6').value = `Rapor dönemi: ${formatDate(reportStart)} – ${formatDate(reportEnd)}`;
        summary.getCell('B6').font = { bold: true, size: 11, color: { argb: COLORS.slate }, name: 'Aptos' };
        summary.mergeCells('G6:I6');
        summary.getCell('G6').value = `Oluşturulma: ${generatedAt}`;
        summary.getCell('G6').font = { size: 10, color: { argb: COLORS.muted }, name: 'Aptos' };
        summary.getCell('G6').alignment = { horizontal: 'right' };

        const addKpi = (range, label, value, accent, softColor, helper) => {
            summary.mergeCells(range);
            const tl = range.split(':')[0];
            const cell = summary.getCell(tl);
            cell.value = `${label}\n${value}${helper ? `\n${helper}` : ''}`;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softColor } };
            cell.font = { bold: true, size: 11, color: { argb: accent }, name: 'Aptos' };
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
            cell.border = thinBorder;
        };

        addKpi('B8:C11', 'TOPLAM KAYIT', filteredData.length.toLocaleString('tr-TR'), COLORS.sky, COLORS.skySoft, 'Filtrelenmiş rapor sonucu');
        addKpi('E8:F11', 'TESLİM EDİLEN', deliveredCount.toLocaleString('tr-TR'), COLORS.green, COLORS.greenSoft, `%${deliveredRate} tamamlanma`);
        addKpi('H8:I11', 'BEKLEYEN', pendingCount.toLocaleString('tr-TR'), COLORS.amber, COLORS.amberSoft, 'Teslim tarihi bulunmayan');

        summary.mergeCells('B13:I13');
        summary.getCell('B13').value = 'OPERASYON ÖZETİ';
        summary.getCell('B13').font = { bold: true, size: 12, color: { argb: COLORS.navy }, name: 'Aptos' };
        summary.getCell('B13').border = { bottom: { style: 'medium', color: { argb: COLORS.sky } } };

        const summaryRows = [
            ['B15', 'C15', 'Benzersiz Gönderici', senderRanking.length],
            ['E15', 'F15', 'Benzersiz Tedarikçi', supplierRanking.length],
            ['H15', 'I15', 'Teslim Alan Kişi', receiverRanking.length],
            ['B17', 'C17', 'Teslim Oranı', `%${deliveredRate}`],
            ['E17', 'F17', 'En Yoğun Gönderici', senderRanking[0]?.[0] || '-'],
            ['H17', 'I17', 'En Yoğun Tedarikçi', supplierRanking[0]?.[0] || '-']
        ];
        summaryRows.forEach(([labelCell, valueCell, label, value]) => {
            summary.getCell(labelCell).value = label;
            summary.getCell(labelCell).font = { bold: true, color: { argb: COLORS.muted }, size: 9, name: 'Aptos' };
            summary.getCell(valueCell).value = value;
            summary.getCell(valueCell).font = { bold: true, color: { argb: COLORS.navy }, size: 11, name: 'Aptos' };
        });

        const writeRanking = (startCol, title, rows, accent) => {
            const start = summary.getColumn(startCol).number;
            const left = summary.getCell(20, start);
            const right = summary.getCell(20, start + 1);
            summary.mergeCells(20, start, 20, start + 1);
            left.value = title;
            left.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
            left.font = { bold: true, color: { argb: COLORS.white }, size: 10, name: 'Aptos' };
            left.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            void right;
            rows.slice(0, 6).forEach(([name, count], index) => {
                const row = 21 + index;
                const nameCell = summary.getCell(row, start);
                const countCell = summary.getCell(row, start + 1);
                nameCell.value = name;
                countCell.value = count;
                nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? COLORS.white : COLORS.soft } };
                countCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? COLORS.white : COLORS.soft } };
                nameCell.font = { size: 9, color: { argb: COLORS.slate }, name: 'Aptos' };
                countCell.font = { bold: true, size: 9, color: { argb: accent }, name: 'Aptos' };
                countCell.alignment = { horizontal: 'center' };
                nameCell.border = thinBorder;
                countCell.border = thinBorder;
            });
        };

        writeRanking('B', 'EN YOĞUN GÖNDERİCİLER', senderRanking, COLORS.sky);
        writeRanking('E', 'EN YOĞUN TEDARİKÇİLER', supplierRanking, COLORS.cyan);
        writeRanking('H', 'TESLİM ALAN KİŞİLER', receiverRanking, COLORS.green);

        summary.mergeCells('B29:I29');
        summary.getCell('B29').value = 'Bu rapor Hedef Kargo ekranındaki Durum/Teslim Tarihi aralığı ve aktif filtreler dikkate alınarak hazırlanmıştır.';
        summary.getCell('B29').font = { italic: true, size: 9, color: { argb: COLORS.muted }, name: 'Aptos' };
        summary.getCell('B29').alignment = { wrapText: true };

        summary.pageSetup = {
            orientation: 'landscape',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
        };
        summary.headerFooter.oddFooter = '&LODAK LOJİSTİK&C Hedef Kargo&R Sayfa &P / &N';

        const worksheet = workbook.addWorksheet('Kargo Kayıtları', {
            views: [{ state: 'frozen', ySplit: 8, showGridLines: false }],
            properties: { defaultRowHeight: 21 }
        });

        worksheet.columns = [
            { key: 'tarih', width: 18 },
            { key: 'gonderici', width: 31 },
            { key: 'tedarikci', width: 31 },
            { key: 'teslim_edilen_kisi', width: 29 },
            { key: 'teslim_tarihi', width: 18 },
            { key: 'durum', width: 18 }
        ];

        worksheet.mergeCells('A1:F2');
        const detailTitle = worksheet.getCell('A1');
        detailTitle.value = 'ODAK LOJİSTİK  •  HEDEF KARGO DETAY RAPORU';
        detailTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
        detailTitle.font = { bold: true, size: 18, color: { argb: COLORS.white }, name: 'Aptos Display' };
        detailTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        worksheet.getRow(1).height = 28;
        worksheet.getRow(2).height = 23;

        worksheet.mergeCells('A3:F3');
        worksheet.getCell('A3').value = `${formatDate(reportStart)} – ${formatDate(reportEnd)}  •  ${filteredData.length.toLocaleString('tr-TR')} kayıt  •  Teslim: ${deliveredCount.toLocaleString('tr-TR')}  •  Bekleyen: ${pendingCount.toLocaleString('tr-TR')}`;
        worksheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sky } };
        worksheet.getCell('A3').font = { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Aptos' };
        worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        worksheet.getRow(3).height = 24;

        worksheet.mergeCells('A5:F5');
        worksheet.getCell('A5').value = activeFilterCount
            ? `Aktif filtre sayısı: ${activeFilterCount}  •  Bu dosya yalnızca ekranda filtrelenmiş kayıtları içerir.`
            : 'Aktif ek filtre yok  •  Seçili Durum/Teslim Tarihi aralığındaki tüm kayıtlar rapora dahil edilmiştir.';
        worksheet.getCell('A5').font = { italic: true, size: 9, color: { argb: COLORS.muted }, name: 'Aptos' };
        worksheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.soft } };
        worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        const headerRow = 8;
        const headers = ['TARİH', 'GÖNDERİCİ', 'TEDARİKÇİ', 'TESLİM EDİLEN KİŞİ', 'TESLİM TARİHİ', 'DURUM'];
        worksheet.getRow(headerRow).values = headers;
        worksheet.getRow(headerRow).height = 30;
        worksheet.getRow(headerRow).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
            cell.font = { color: { argb: COLORS.white }, bold: true, size: 10, name: 'Aptos' };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = thinBorder;
        });

        filteredData.forEach((item, index) => {
            const delivered = isDelivered(item);
            const row = worksheet.addRow({
                tarih: formatDate(item.tarih),
                gonderici: item.gonderici || '-',
                tedarikci: item.tedarikci || '-',
                teslim_edilen_kisi: item.teslim_edilen_kisi || '-',
                teslim_tarihi: item.teslim_tarihi ? formatDate(item.teslim_tarihi) : '-',
                durum: delivered ? 'TESLİM EDİLDİ' : 'BEKLİYOR'
            });

            row.height = 24;
            row.eachCell((cell, colNumber) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: index % 2 === 0 ? COLORS.white : COLORS.soft }
                };
                cell.font = { size: 10, color: { argb: COLORS.slate }, name: 'Aptos' };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: colNumber === 1 || colNumber >= 5 ? 'center' : 'left',
                    wrapText: true
                };
                cell.border = {
                    bottom: { style: 'thin', color: { argb: COLORS.line } }
                };
            });

            const statusCell = row.getCell(6);
            statusCell.font = {
                bold: true,
                size: 9,
                color: { argb: delivered ? COLORS.green : COLORS.amber },
                name: 'Aptos'
            };
            statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: delivered ? COLORS.greenSoft : COLORS.amberSoft }
            };
            statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        const lastRow = Math.max(headerRow + 1, worksheet.rowCount);
        worksheet.autoFilter = {
            from: { row: headerRow, column: 1 },
            to: { row: lastRow, column: 6 }
        };

        worksheet.pageSetup = {
            orientation: 'landscape',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
            printTitlesRow: '1:8'
        };
        worksheet.headerFooter.oddHeader = '&L&"Aptos,Bold"ODAK LOJİSTİK&C&"Aptos"Hedef Kargo';
        worksheet.headerFooter.oddFooter = `&L${formatDate(reportStart)} - ${formatDate(reportEnd)}&C${generatedAt}&R Sayfa &P / &N`;

        worksheet.getRow(lastRow + 2).height = 8;
        worksheet.mergeCells(`A${lastRow + 3}:F${lastRow + 3}`);
        const footerNote = worksheet.getCell(`A${lastRow + 3}`);
        footerNote.value = 'ODAK LOJİSTİK • Hedef Kargo Operasyon Raporu';
        footerNote.font = { bold: true, size: 9, color: { argb: COLORS.muted }, name: 'Aptos' };
        footerNote.alignment = { horizontal: 'right' };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const safeStart = reportStart || 'baslangic';
        const safeEnd = reportEnd || 'bitis';
        saveAs(blob, `hedef_kargo_${safeStart}_${safeEnd}.xlsx`);
        showToast('success', 'Modern Excel raporu hazırlandı.');
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
                bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]
                text-slate-900
                dark:bg-[linear-gradient(180deg,#07101b_0%,#0b1220_100%)]
                dark:text-slate-100
            "
        >
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-20 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
                <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-400/10" />
                <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />
            </div>

            <div className="mx-auto w-full max-w-none px-4 py-6 md:px-6 md:py-8">
                <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, ease: 'easeOut' }} className={ui.panelStrong}>
                    <div className="relative overflow-hidden px-5 py-5 md:px-6 md:py-6">
                        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
                        <div className="pointer-events-none absolute right-32 top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />

                        <div className="relative flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                                <motion.div whileHover={{ rotate: -5, scale: 1.04 }} className="relative grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-gradient-to-br from-sky-600 to-cyan-500 text-xl text-white shadow-[0_12px_28px_rgba(14,165,233,.25)]">
                                    <FiPackage />
                                    <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-[#111927]" />
                                </motion.div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.16em] text-sky-700 dark:border-sky-400/15 dark:bg-sky-500/10 dark:text-sky-300">Operasyon Merkezi</span>
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Canlı veri görünümü</span>
                                    </div>
                                    <h1 className={`mt-2 text-2xl font-black tracking-tight md:text-3xl ${ui.title}`}>Hedef Kargo</h1>
                                    <p className={`mt-1 max-w-2xl text-sm leading-6 ${ui.muted}`}>Kargo hareketlerini hızlıca ara, filtrele, düzenle ve teslim durumlarını tek ekrandan yönet.</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-400">
                                        <span className="inline-flex items-center gap-1.5"><FiCalendar className="text-sky-500" /> {formatDate(loadedRange.start)} – {formatDate(loadedRange.end)}</span>
                                        <span className="inline-flex items-center gap-1.5"><FiDatabase className="text-cyan-500" /> {kargoData.length.toLocaleString('tr-TR')} kayıt yüklü</span>
                                        <span className="inline-flex items-center gap-1.5"><FiClock className="text-emerald-500" /> İlk açılış: son 7 gün</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <ActionButton onClick={() => navigate('/anasayfa')} label="Anasayfa" icon={<FiArrowLeft />} tone="secondary" />
                                <ActionButton onClick={() => fetchData(dateStart, dateEnd)} label="Yenile" icon={<FiRefreshCw className={loading ? 'animate-spin' : ''} />} tone="ghost" />
                                <ActionButton onClick={exportToExcel} label="Excel" icon={<FiDownload />} tone="secondary" />
                                <ActionButton onClick={openAddSheet} label="Yeni Kayıt" icon={<FiPlus />} tone="primary" />
                            </div>
                        </div>

                        <div className="relative mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            <StatCard title="Toplam Kayıt" value={stats.total} emoji={<FiPackage />} subtitle="Yüklenen dönemde" active={quickFilter === 'all'} onClick={() => setQuickFilter('all')} />
                            <StatCard title="Bugün Eklenen" value={stats.addedToday} emoji={<FiZap />} subtitle="Bugünkü girişler" active={quickFilter === 'today'} onClick={() => setQuickFilter((prev) => (prev === 'today' ? 'all' : 'today'))} />
                            <StatCard title="Teslim Edilen" value={stats.delivered} emoji={<FiCheckCircle />} subtitle="Tamamlanan teslimatlar" active={quickFilter === 'delivered'} onClick={() => setQuickFilter((prev) => (prev === 'delivered' ? 'all' : 'delivered'))} />
                            <StatCard title="Bekleyen" value={stats.pending} emoji={<FiClock />} subtitle="Durum tarihi girilmemiş" active={quickFilter === 'pending'} onClick={() => setQuickFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))} />
                            <RateCard title="Teslim Oranı" value={stats.deliveryRate} subtitle={`${stats.delivered.toLocaleString('tr-TR')} / ${stats.total.toLocaleString('tr-TR')} tamamlandı`} />
                        </div>
                    </div>
                </motion.header>

                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }} className={`mt-5 p-4 md:p-5 ${ui.panel}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><FiCalendar className="text-sky-500" /> Tarih Aralığı</div>
                            <p className={`mt-1 text-xs ${ui.muted}`}>Ekran ilk açıldığında son 7 günü otomatik getirir. Daha eski kayıtlar için istediğin aralığı seçebilirsin.</p>
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                            <label className="text-[11px] font-bold text-slate-500">Durum Tarihi Başlangıç<input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={`${ui.input} mt-1 min-w-[170px]`} /></label>
                            <label className="text-[11px] font-bold text-slate-500">Durum Tarihi Bitiş<input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={`${ui.input} mt-1 min-w-[170px]`} /></label>
                            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .98 }} onClick={() => fetchData(dateStart, dateEnd)} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-5 text-sm font-black text-white shadow-lg shadow-sky-600/20"><FiZap /> Verileri Getir</motion.button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {[['today','Bugün'],['7d','Son 7 Gün'],['30d','Son 30 Gün'],['month','Bu Ay']].map(([key,label]) => (
                            <button key={key} onClick={() => applyPreset(key)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">{label}</button>
                        ))}
                    </div>
                </motion.section>

                <section className={`mt-5 p-4 md:p-5 ${ui.panel}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-1 flex-col gap-3 lg:flex-row">
                            <div className="relative min-w-[260px] flex-1">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                                    <FiSearch />
                                </span>
                                <input
                                    value={filters.__q}
                                    onChange={(e) => { setFilters((f) => ({ ...f, __q: e.target.value })); setPage(1); }}
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
                                    <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white">
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
                                    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/15"
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
                    <div className={`flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5 ${ui.borderSoft}`}>
                        <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white shadow-lg dark:bg-white dark:text-slate-950"><FiInbox /></span>
                            <div><h2 className={`text-base font-black ${ui.title}`}>Kargo Kayıtları</h2><p className={`mt-0.5 text-xs ${ui.muted}`}>{filteredData.length.toLocaleString('tr-TR')} sonuç • satır seçebilir, düzenleyebilir veya silebilirsin.</p></div>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400"><FiSliders className="text-sky-500" /> 100 kayıt / sayfa <span className="h-1 w-1 rounded-full bg-slate-300" /> Toplam sınırı yok</div>
                    </div>

                    <AnimatePresence>
                        {loading && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mx-4 mt-4 overflow-hidden rounded-[20px] border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-4 shadow-[0_10px_30px_rgba(14,165,233,.08)] dark:border-sky-400/15 dark:from-sky-500/[.08] dark:via-[#111927] dark:to-cyan-500/[.06]">
                                <div className="flex items-center gap-4">
                                    <div className="relative h-14 w-14 shrink-0">
                                        <motion.div animate={{ y: [0, -5, 0], rotate: [0, -3, 3, 0] }} transition={{ duration: 1.35, repeat: Infinity }} className="absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-500 text-xl text-white shadow-lg shadow-sky-500/20"><FiPackage /></motion.div>
                                        <motion.span animate={{ x: [0, 16, 0], opacity: [.2, 1, .2] }} transition={{ duration: 1.3, repeat: Infinity }} className="absolute -right-3 top-2 h-2 w-2 rounded-full bg-cyan-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <div className="text-sm font-black text-slate-900 dark:text-white">Kargo kayıtları hazırlanıyor…</div>
                                                <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Seçili tarih aralığı okunuyor ve tablo görünümü hazırlanıyor.</div>
                                            </div>
                                            <motion.div key={loadingCount} initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-black text-sky-700 shadow-sm dark:border-sky-400/15 dark:bg-white/5 dark:text-sky-300">{loadingCount.toLocaleString('tr-TR')} kayıt bulundu</motion.div>
                                        </div>
                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                                            <motion.div className="h-full w-1/3 rounded-full bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-500" animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mx-3 mt-3 flex flex-col gap-3 rounded-[18px] border border-sky-100 bg-gradient-to-r from-sky-50/90 via-white to-cyan-50/70 px-4 py-3 shadow-sm dark:border-sky-400/10 dark:from-sky-500/[.07] dark:via-white/[.025] dark:to-cyan-500/[.05] md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-500/20">{quickFilter === 'pending' ? <FiClock /> : quickFilter === 'delivered' ? <FiCheckCircle /> : quickFilter === 'today' ? <FiZap /> : <FiPackage />}</div>
                            <div><div className="text-xs font-black uppercase tracking-[.12em] text-sky-600 dark:text-sky-300">Aktif görünüm</div><div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{quickFilter === 'pending' ? 'Bekleyen kargolar' : quickFilter === 'delivered' ? 'Teslim edilen kargolar' : quickFilter === 'today' ? 'Bugün eklenen kargolar' : 'Tüm kargolar'} <span className="ml-1 text-slate-400">• {filteredData.length.toLocaleString('tr-TR')} kayıt</span></div></div>
                        </div>
                        {activeFilterCount > 0 && <button onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-200 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><FiX /> Tüm filtreleri temizle</button>}
                    </div>

                    <div className="mx-3 mb-3 mt-3 overflow-hidden rounded-[20px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0d1521]">
                    <div className="overflow-x-auto">
                        <table className="min-w-[1080px] w-full border-separate border-spacing-0 text-sm">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xl dark:bg-[#0f1825]/95">
                                <tr>
                                    <Th>
                                        <label className="inline-flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isAllVisibleSelected}
                                                onChange={toggleSelectAllVisible}
                                                className="h-4 w-4 rounded border-slate-300 bg-white accent-sky-600 dark:border-slate-600 dark:bg-slate-800"
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
                                    pagedData.map((item, index) => (
                                        <motion.tr
                                            layout
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: .22, delay: Math.min(index * .012, .18) }}
                                            key={item.id}
                                            className={`group relative transition-all duration-200 hover:bg-sky-50/70 dark:hover:bg-sky-500/[.055] ${selectedIds.has(item.id) ? 'bg-sky-50/90 dark:bg-sky-500/[.08]' : 'bg-white dark:bg-transparent'}`}
                                        >
                                            <Td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelectOne(item.id)}
                                                    className="h-4 w-4 rounded border-slate-300 bg-white accent-sky-600 dark:border-slate-600 dark:bg-slate-800"
                                                />
                                            </Td>

                                            <Td><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-sky-100 group-hover:text-sky-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:bg-sky-500/10 dark:group-hover:text-sky-300"><FiCalendar /></span><div><div className="flex items-center gap-2"><span className="whitespace-nowrap text-xs font-black text-slate-700 dark:text-slate-200">{formatDate(item.tarih)}</span>{isAddedToday(item) && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-400/10">Bugün</span>}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kayıt tarihi</div></div></div></Td>

                                            <Td><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 text-xs font-black text-sky-700 ring-1 ring-sky-100 dark:from-sky-500/10 dark:to-cyan-500/10 dark:text-sky-300 dark:ring-sky-400/10">{(item.gonderici || '?').trim().slice(0,1).toLocaleUpperCase('tr')}</span><div className="min-w-0"><div className="max-w-[220px] truncate font-black text-slate-800 dark:text-slate-100">{item.gonderici || '-'}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Gönderici</div></div></div></Td>

                                            <Td><div className="max-w-[240px] truncate font-semibold text-slate-700 dark:text-slate-200">{item.tedarikci || '-'}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tedarikçi</div></Td>
                                            <Td><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5"><FiUser size={13}/></span><span className="max-w-[200px] truncate font-semibold text-slate-700 dark:text-slate-200">{item.teslim_edilen_kisi || '-'}</span></div></Td>

                                            <Td>
                                                {item.teslim_tarihi ? (
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                        <FiCheckCircle /> {formatDate(item.teslim_tarihi)}
                                                    </span>
                                                ) : (
                                                    <div>
                                                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                                            <FiClock /> Bekleyen
                                                        </span>
                                                        {item.beklenen_teslim_tarihi && (
                                                            <div className="mt-1.5 text-[10px] font-bold text-slate-400">
                                                                Beklenen: {formatDate(item.beklenen_teslim_tarihi)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Td>

                                            <Td center>
                                                <div className="flex items-center justify-center gap-1.5 opacity-80 transition group-hover:opacity-100">
                                                    <motion.button whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: .94 }} title="Kaydı düzenle" onClick={() => openEditSheet(item)} className="group/edit grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-sky-400/20 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"><FiEdit3 /></motion.button>
                                                    <motion.button whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: .94 }} title="Kaydı sil" onClick={() => confirmDelete(item)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-rose-400/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"><FiTrash2 /></motion.button>
                                                </div>
                                            </Td>
                                        </motion.tr>
                                    ))}

                                {!loading && filteredData.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <div className="mx-auto max-w-md">
                                                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-600 text-2xl text-white shadow-lg shadow-sky-600/20"><FiSearch />
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
                                                        className="rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 hover:from-sky-500 hover:to-cyan-500"
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
                    </div>
                    {!loading && filteredData.length > 0 && (
                        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                            <div className="text-xs font-bold text-slate-500">Toplam {filteredData.length.toLocaleString('tr-TR')} kayıt • Sayfa {page} / {totalPages} • Sayfada en fazla {pageSize}</div>
                            <div className="flex items-center gap-2">
                                <motion.button whileTap={{ scale: .94 }} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 disabled:opacity-30 dark:border-white/10 dark:bg-slate-800"><FiChevronLeft /></motion.button>
                                <span className="min-w-[72px] text-center text-xs font-black text-slate-700 dark:text-slate-200">{page} / {totalPages}</span>
                                <motion.button whileTap={{ scale: .94 }} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 disabled:opacity-30 dark:border-white/10 dark:bg-slate-800"><FiChevronRight /></motion.button>
                            </div>
                        </div>
                    )}
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
        primary: 'border-transparent bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-[0_10px_24px_rgba(14,165,233,.22)] hover:shadow-[0_14px_30px_rgba(14,165,233,.28)]',
        secondary: 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-sky-500/10 dark:hover:text-sky-300',
        ghost: 'border-slate-200/80 bg-slate-50 text-slate-600 hover:border-sky-200 hover:bg-white hover:text-sky-700 dark:border-white/10 dark:bg-white/[.035] dark:text-slate-300 dark:hover:bg-sky-500/10 dark:hover:text-sky-300'
    };

    return (
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .96 }} onClick={onClick}
            className={`group inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-black transition-all duration-200 ${styles[tone]}`}>
            <span className="text-[15px] transition-transform duration-200 group-hover:scale-110">{icon}</span>
            <span>{label}</span>
        </motion.button>
    );
};

const StatCard = ({ title, value, emoji, subtitle, onClick, active }) => (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .985 }} type="button" onClick={onClick}
        className={`group relative w-full overflow-hidden rounded-[18px] border px-4 py-3 text-left transition-all duration-200 ${active
            ? 'border-sky-300 bg-sky-50 shadow-[0_8px_24px_rgba(14,165,233,.10)] dark:border-sky-400/25 dark:bg-sky-500/[.08]'
            : 'border-slate-200/80 bg-slate-50/70 hover:border-sky-200 hover:bg-white hover:shadow-[0_8px_24px_rgba(15,23,42,.06)] dark:border-white/[.07] dark:bg-white/[.025] dark:hover:bg-white/[.045]'
        }`}>
        <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{title}</div>
                <motion.div key={value} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{Number(value || 0).toLocaleString('tr-TR')}</motion.div>
                <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{subtitle}</div>
            </div>
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base transition-all duration-200 ${active
                ? 'bg-gradient-to-br from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-500/20'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-sky-600 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:group-hover:text-sky-300'
            }`}>{emoji}</div>
        </div>
        {active && <motion.div layoutId="active-stat-line" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" />}
    </motion.button>
);

const RateCard = ({ title, value, subtitle }) => (
    <div className="relative w-full overflow-hidden rounded-[18px] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 dark:border-emerald-400/15 dark:from-emerald-500/[.08] dark:to-white/[.025]">
        <div className="flex items-center justify-between gap-3">
            <div><div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-600 dark:text-emerald-300">{title}</div><div className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">%{value}</div><div className="mt-0.5 text-[10px] font-semibold text-slate-400">{subtitle}</div></div>
            <div className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-xs font-black text-emerald-600 shadow-sm ring-1 ring-emerald-100 dark:bg-white/5 dark:text-emerald-300 dark:ring-emerald-400/15">%{value}</div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-white/[.06]"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: .7, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" /></div>
    </div>
);

const InfoPill = ({ label, value }) => (
    <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-slate-700 dark:bg-slate-800">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
);

const Th = ({ children, center }) => (
    <th
        className={`border-b border-slate-200/80 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:border-white/[0.07] dark:text-slate-500 ${center ? 'text-center' : 'text-left'
            }`}
    >
        {children}
    </th>
);

const Td = ({ children, center }) => (
    <td
        className={`border-b border-slate-100 px-4 py-3.5 text-sm text-slate-700 dark:border-white/[0.055] dark:text-slate-200 ${center ? 'text-center' : 'text-left'
            }`}
    >
        {children}
    </td>
);

const SkeletonRows = ({ rows = 6, cols = 7 }) => (
    <>
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`skeleton-${rowIndex}`} className="bg-white dark:bg-transparent">
                {Array.from({ length: cols }).map((__, colIndex) => (
                    <td key={`skeleton-cell-${rowIndex}-${colIndex}`} className="border-b border-slate-100 px-4 py-4 dark:border-white/[0.055]">
                        <motion.div animate={{ opacity: [.38, .9, .38] }} transition={{ duration: 1.25, repeat: Infinity, delay: (rowIndex + colIndex) * .035 }}
                            className={`h-4 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100 dark:from-white/[.04] dark:via-white/[.08] dark:to-white/[.04] ${colIndex === 0 ? 'w-5' : colIndex === cols - 1 ? 'mx-auto w-20' : 'w-full max-w-[180px]'}`} />
                    </td>
                ))}
            </tr>
        ))}
    </>
);

const FilterDrawer = ({ open, onClose, filters, onChange, onClear, uniqueValues }) => {
    const fields = [
        { name: 'tarih', label: 'Tarih', type: 'date' },
        { name: 'gonderici', label: 'Gönderici', type: 'text' },
        { name: 'tedarikci', label: 'Tedarikçi', type: 'text' },
        { name: 'teslim_edilen_kisi', label: 'Teslim Edilen Kişi', type: 'text' },
        { name: 'beklenen_teslim_tarihi', label: 'Beklenen Teslim Tarihi', type: 'date' },
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
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-sky-900/40"
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
                            className="h-12 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 hover:from-sky-500 hover:to-cyan-500"
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
        { name: 'beklenen_teslim_tarihi', label: 'Beklenen Teslim Tarihi', type: 'date' },
        { name: 'teslim_tarihi', label: 'Teslim Tarihi', type: 'date' }
    ];

    const submitClass =
        tone === 'success'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
            : 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 shadow-sky-600/20';

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
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-sky-900/40"
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