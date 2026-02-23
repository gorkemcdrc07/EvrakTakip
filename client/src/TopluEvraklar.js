import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import {
    FiFile,
    FiHome,
    FiFilter,
    FiX,
    FiDownload,
    FiTrash2,
    FiEdit2,
    FiInfo,
    FiSearch,
} from 'react-icons/fi';
import Layout from './components/Layout';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import EditEvrakModal from './components/EditEvrakModal';
import ModernSummary from "./components/ModernSummary";

function TopluEvraklar() {
    const navigate = useNavigate();

    const [evraklar, setEvraklar] = useState([]);
    const [lokasyonlar, setLokasyonlar] = useState({});
    const [projeler, setProjeler] = useState({});
    const [loading, setLoading] = useState(true);

    // kart -> panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelTitle, setPanelTitle] = useState('');
    const [panelRows, setPanelRows] = useState([]);

    // filtre state'leri
    const initialFilterState = {
        startDate: '',
        endDate: '',
        lokasyon: [],
        proje: [],
        aciklama: '',
        seferno: ''
    };
    const [filters, setFilters] = useState(initialFilterState);
    const [showFilters, setShowFilters] = useState(false);
    const [draft, setDraft] = useState(initialFilterState);

    const hasActiveFilters = Boolean(
        filters.startDate ||
        filters.endDate ||
        filters.lokasyon?.length ||
        filters.proje?.length ||
        filters.aciklama ||
        filters.seferno
    );

    const [selectedEvrak, setSelectedEvrak] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // --- KAYDEDİLMEMİŞ DEĞİŞİKLİK KORUMASI ---
    const [originalEvrak, setOriginalEvrak] = useState(null);
    const deepClone = (x) => JSON.parse(JSON.stringify(x));
    const hasUnsavedEdit = useMemo(() => {
        if (!showEditModal || !selectedEvrak || !originalEvrak) return false;
        try { return JSON.stringify(selectedEvrak) !== JSON.stringify(originalEvrak); }
        catch { return true; }
    }, [showEditModal, selectedEvrak, originalEvrak]);

    const [deletingId, setDeletingId] = useState(null);
    const [acikProjeId, setAcikProjeId] = useState(null);

    // Detay kartı
    const [detailEvrak, setDetailEvrak] = useState(null);
    const [showDetailCard, setShowDetailCard] = useState(false);

    const normalize = (str) => (str || '').trim().toLocaleUpperCase('tr').replace(/\s+/g, ' ');
    const toplamSefer = evraklar.reduce((sum, evrak) => sum + (evrak.sefersayisi || 0), 0);

    const duzeltilmis = evraklar.reduce(
        (sum, evrak) =>
            sum +
            (evrak.evrakseferler?.filter(
                (s) => normalize(s.aciklama) === 'TARAFIMIZCA DÜZELTİLMİŞTİR'
            ).length || 0),
        0
    );

    const orjinaleCekilmis = evraklar.reduce(
        (sum, evrak) =>
            sum +
            (evrak.evrakseferler?.filter(
                (s) => normalize(s.aciklama) === 'TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR'
            ).length || 0),
        0
    );

    const oran = (value) => (toplamSefer ? ((value / toplamSefer) * 100).toFixed(1) : '0.0');

    useEffect(() => { fetchVeriler(); }, []);

    // Modal açılınca orijinali yakala, kapanınca sıfırla
    useEffect(() => {
        if (showEditModal && selectedEvrak) setOriginalEvrak(deepClone(selectedEvrak));
        else setOriginalEvrak(null);
    }, [showEditModal, selectedEvrak?.id]);

    // Sekme kapanışı / sayfadan ayrılma uyarısı
    useEffect(() => {
        const handler = (e) => {
            if (!hasUnsavedEdit) return;
            e.preventDefault();
            e.returnValue = '';
        };
        if (hasUnsavedEdit) window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsavedEdit]);

    // SPA içinde anchor/Link tıklamalarını engelle
    useEffect(() => {
        const onAnchorClick = (e) => {
            if (!hasUnsavedEdit) return;
            const a = e.target.closest('a');
            if (!a) return;
            if (a.origin === window.location.origin && a.target !== '_blank') {
                const ok = window.confirm('Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?');
                if (!ok) { e.preventDefault(); e.stopPropagation(); }
            }
        };
        if (hasUnsavedEdit) document.addEventListener('click', onAnchorClick, true);
        return () => document.removeEventListener('click', onAnchorClick, true);
    }, [hasUnsavedEdit]);

    const fetchVeriler = async () => {
        const { data: evrakData, error } = await supabase
            .from('evraklar')
            .select(
                `
        id,
        tarih,
        lokasyonid,
        sefersayisi,
        evrakseferler:evrakseferler!fk_evrakseferler_evrakid (
          seferno,
          aciklama
        ),
        evrakproje:evrakproje!fk_evrakproje_evrakid (
          projeid,
          sefersayisi
        )
      `
            );

        if (error) {
            console.error('❌ Hata:', error);
            return;
        }

        const sortedEvraklar = (evrakData || []).sort(
            (a, b) => new Date(b.tarih) - new Date(a.tarih)
        );

        const { data: lokasyonData } = await supabase.from('lokasyonlar').select('*');
        const { data: projeData } = await supabase.from('projeler').select('*');

        const lokasyonMap = {};
        lokasyonData?.forEach((l) => (lokasyonMap[l.id] = l.lokasyon));

        const projeMap = {};
        projeData?.forEach((p) => (projeMap[p.id] = p.proje));

        setEvraklar(sortedEvraklar);
        setLokasyonlar(lokasyonMap);
        setProjeler(projeMap);
        setLoading(false);
    };

    const goHome = () => {
        if (hasUnsavedEdit) {
            const ok = window.confirm('Kaydedilmemiş değişiklikler var. Yine de anasayfaya dönülsün mü?');
            if (!ok) return;
        }
        navigate('/Anasayfa');
    };

    const handleCloseEditModal = () => {
        if (hasUnsavedEdit) {
            const ok = window.confirm('Kaydedilmemiş değişiklikler var. Kapatmak istiyor musunuz?');
            if (!ok) return;
        }
        setShowEditModal(false);
        setSelectedEvrak(null);
        setOriginalEvrak(null);
    };

    const handleEvrakSil = async (evrak) => {
        const onay = window.confirm(
            `#${evrak.id} numaralı evrağı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        );
        if (!onay) return;

        try {
            setDeletingId(evrak.id);

            await supabase.from('evrakseferler').delete().eq('evrakid', evrak.id);
            await supabase.from('evrakproje').delete().eq('evrakid', evrak.id);
            const { error } = await supabase.from('evraklar').delete().eq('id', evrak.id);
            if (error) throw error;

            setEvraklar((prev) => prev.filter((e) => e.id !== evrak.id));
        } catch (err) {
            console.error('Silme hatası:', err);
            alert('Silme sırasında bir hata oluştu.');
        } finally {
            setDeletingId(null);
        }
    };

    // "Diğer" gibi birden fazla etiketi de açabilmek için:
    const openCardPanel = (arg) => {
        const norm = (v) => (v || '').trim().toLocaleUpperCase('tr');
        const labelOf = (v) => (norm(v) || '(BOŞ)');

        let targetLabels = [];
        if (typeof arg === 'string') {
            targetLabels = [labelOf(arg)];
        } else if (arg && Array.isArray(arg.names)) {
            targetLabels = arg.names.map(labelOf);
        } else {
            return;
        }

        const rows = [];
        evraklar.forEach((e) => {
            const lok = lokasyonlar[e.lokasyonid] || '';
            (e.evrakseferler || []).forEach((s) => {
                const lbl = labelOf(s.aciklama);
                if (targetLabels.includes(lbl)) {
                    rows.push({
                        evrakId: e.id,
                        tarih: e.tarih,
                        lokasyon: lok,
                        seferno: (s.seferno || '').trim() || '(Boş)',
                        aciklama: s.aciklama || '',
                    });
                }
            });
        });

        rows.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
        const title = targetLabels.length === 1 ? (arg?.name || arg || 'Detay') : 'Diğer';

        setPanelRows(rows);
        setPanelTitle(title);
        setPanelOpen(true);
    };

    // 🔧 GÜNCELLEME: payload opsiyonel, yoksa selectedEvrak kullan
    const handleEvrakGuncelle = async (payload) => {
        const evrakObj = payload || selectedEvrak;
        if (!evrakObj) return;

        const evrakId = evrakObj.id;
        const tarih = evrakObj.tarih;
        const lokasyonid = evrakObj.lokasyonid;

        const evrakproje = Array.isArray(evrakObj.evrakproje)
            ? evrakObj.evrakproje.filter((p) => p.projeid && !isNaN(p.projeid))
            : [];

        const toplamSefer = evrakproje.reduce((sum, p) => sum + Number(p.sefersayisi || 0), 0);

        const evrakseferler = Array.isArray(evrakObj.evrakseferler)
            ? evrakObj.evrakseferler.filter((s) => s.seferno && s.aciklama)
            : [];

        // ✅ seferno bazlı dedup
        const seen = new Set();
        const uniqueSeferler = [];
        for (const s of evrakseferler) {
            const key = String(s.seferno).trim();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueSeferler.push({ ...s, seferno: key });
            }
        }

        try {
            const { error: errEvrak } = await supabase
                .from('evraklar')
                .update({ tarih, lokasyonid, sefersayisi: toplamSefer })
                .eq('id', evrakId);
            if (errEvrak) throw errEvrak;

            const { error: errProjDel } = await supabase.from('evrakproje').delete().eq('evrakid', evrakId);
            if (errProjDel) throw errProjDel;

            if (evrakproje.length > 0) {
                const { error: errProjIns } = await supabase.from('evrakproje').insert(
                    evrakproje.map((p) => ({
                        evrakid: evrakId,
                        projeid: Number(p.projeid),
                        sefersayisi: Number(p.sefersayisi || 0)
                    }))
                );
                if (errProjIns) throw errProjIns;
            }

            const { error: errSeferDel } = await supabase.from('evrakseferler').delete().eq('evrakid', evrakId);
            if (errSeferDel) throw errSeferDel;

            if (uniqueSeferler.length > 0) {
                const { error: errSeferIns } = await supabase.from('evrakseferler').insert(
                    uniqueSeferler.map((s) => ({
                        evrakid: evrakId,
                        seferno: s.seferno,
                        aciklama: s.aciklama
                    }))
                );
                if (errSeferIns) {
                    console.error('Insert error (evrakseferler):', {
                        message: errSeferIns.message,
                        details: errSeferIns.details,
                        hint: errSeferIns.hint,
                        code: errSeferIns.code,
                    });
                    throw errSeferIns;
                }
            }

            await fetchVeriler();
            setOriginalEvrak(evrakObj ? deepClone(evrakObj) : null);
            setShowEditModal(false);
            setSelectedEvrak(null);
        } catch (error) {
            console.error('Evrak güncelleme hatası:', error);
            alert('Güncelleme sırasında bir hata oluştu.');
        }
    };

    const exportToExcel = () => {
        const sheetData = [];
        const merges = [];

        const headers = ['Tarih', 'Lokasyon', 'Projeler', 'Toplam Sefer Sayısı', 'Sefer No', 'Açıklama'];
        sheetData.push(headers);

        let currentRow = 1;

        evraklar.forEach((evrak) => {
            const tarih = new Date(evrak.tarih).toLocaleDateString('tr-TR');
            const lokasyon = lokasyonlar[evrak.lokasyonid] || 'Bilinmeyen Lokasyon';
            const projeList =
                evrak.evrakproje?.map((p) => `${projeler[p.projeid]} (${p.sefersayisi})`).join(', ') || 'Yok';
            const toplamSefer = evrak.sefersayisi || 0;

            const seferler = evrak.evrakseferler?.length
                ? evrak.evrakseferler
                : [{ seferno: 'Yok', aciklama: 'Sefer kaydı bulunamadı' }];

            const rowStart = currentRow;
            const rowEnd = currentRow + seferler.length - 1;

            seferler.forEach((sefer) => {
                sheetData.push([
                    tarih,
                    lokasyon,
                    projeList,
                    toplamSefer,
                    sefer.seferno || 'Yok',
                    sefer.aciklama || 'Yok'
                ]);
                currentRow++;
            });

            if (seferler.length > 1) {
                merges.push(
                    { s: { r: rowStart, c: 0 }, e: { r: rowEnd, c: 0 } },
                    { s: { r: rowStart, c: 1 }, e: { r: rowEnd, c: 1 } },
                    { s: { r: rowStart, c: 2 }, e: { r: rowEnd, c: 2 } },
                    { s: { r: rowStart, c: 3 }, e: { r: rowEnd, c: 3 } }
                );
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!merges'] = merges;

        ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 22 }, { wch: 18 }, { wch: 40 }];

        const borderStyle = {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: '3B82F6' } },
            border: borderStyle
        };

        const rowStyleLight = { fill: { fgColor: { rgb: 'F9FAFB' } }, border: borderStyle };
        const rowStyleDark = { fill: { fgColor: { rgb: 'EDF2F7' } }, border: borderStyle };
        const plainCell = { border: borderStyle };

        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = { c: C, r: R };
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                if (!ws[cellRef]) continue;

                if (R === 0) {
                    ws[cellRef].s = headerStyle;
                } else {
                    const isEven = R % 2 === 0;
                    ws[cellRef].s = { ...plainCell, ...(isEven ? rowStyleDark : rowStyleLight) };
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Evraklar');
        XLSX.writeFile(wb, 'Toplu_Evraklar_Rapor.xlsx');
    };

    const exportFilteredExcel = () => {
        const allAciklamalar = new Set();
        filteredEvraklar.forEach((evrak) => {
            evrak.evrakseferler?.forEach((s) => {
                if (s.aciklama && s.aciklama.trim()) {
                    allAciklamalar.add(s.aciklama.trim());
                }
            });
        });

        const aciklamaListesi = [...allAciklamalar];

        const headers = ["TARİH", "LOKASYON", "TOPLAM SEFER", ...aciklamaListesi];
        const sheetData = [headers];

        filteredEvraklar.forEach((evrak) => {
            const tarih = new Date(evrak.tarih).toLocaleDateString("tr-TR");
            const lokasyon = lokasyonlar[evrak.lokasyonid] || "—";
            const toplamSefer = evrak.sefersayisi || 0;

            const counter = {};
            aciklamaListesi.forEach((a) => (counter[a] = 0));

            evrak.evrakseferler?.forEach((s) => {
                const a = (s.aciklama || "").trim();
                if (counter[a] !== undefined) counter[a]++;
            });

            sheetData.push([
                tarih,
                lokasyon,
                toplamSefer,
                ...aciklamaListesi.map((a) => counter[a]),
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!cols"] = headers.map((h) => ({ wch: Math.max(20, h.length + 5) }));

        const border = {
            top: { style: "thin", color: { rgb: "999999" } },
            bottom: { style: "thin", color: { rgb: "999999" } },
            left: { style: "thin", color: { rgb: "999999" } },
            right: { style: "thin", color: { rgb: "999999" } },
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "ffffff" } },
            fill: { fgColor: { rgb: "1E3A8A" } },
            alignment: { horizontal: "center", vertical: "center" },
            border,
        };

        const rowLight = { fill: { fgColor: { rgb: "F3F4F6" } }, border };
        const rowDark = { fill: { fgColor: { rgb: "E5E7EB" } }, border };

        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellRef];
                if (!cell) continue;

                if (R === 0) cell.s = headerStyle;
                else cell.s = R % 2 === 0 ? rowDark : rowLight;
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detay Rapor");
        XLSX.writeFile(wb, "Detay_Rapor.xlsx");
    };

    const exportEvrakToExcel = (evrak) => {
        const tarih = new Date(evrak.tarih).toLocaleDateString('tr-TR');
        const lokasyon = lokasyonlar[evrak.lokasyonid] || 'Bilinmeyen Lokasyon';
        const toplamSefer = evrak.sefersayisi || 0;

        const sheetData = [];
        sheetData.push(['TARİH', 'LOKASYON', 'TOPLAM SEFER']);
        sheetData.push([tarih, lokasyon, toplamSefer]);
        sheetData.push([]);

        sheetData.push(['PROJE', 'SEFER SAYISI']);
        (evrak.evrakproje || []).forEach((p) => {
            const projeAd = projeler[p.projeid] || 'Bilinmeyen Proje';
            sheetData.push([projeAd, p.sefersayisi]);
        });
        sheetData.push([]);

        const aciklamaSayaci = {};
        (evrak.evrakseferler || []).forEach((s) => {
            const aciklama = s.aciklama || 'Bilinmeyen';
            aciklamaSayaci[aciklama] = (aciklamaSayaci[aciklama] || 0) + 1;
        });

        sheetData.push(['AÇIKLAMA ÖZETİ']);
        Object.entries(aciklamaSayaci).forEach(([aciklama, count]) => {
            sheetData.push([`${aciklama}: ${count}`]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 20 }];

        const borderAll = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
        };

        const styles = {
            header: {
                font: { bold: true, color: { rgb: '000000' } },
                fill: { fgColor: { rgb: 'D9D9D9' } },
                border: borderAll
            },
            subHeader: {
                font: { bold: true },
                fill: { fgColor: { rgb: 'BDD7EE' } },
                border: borderAll
            },
            summaryHeader: {
                font: { bold: true },
                fill: { fgColor: { rgb: 'C6EFCE' } },
                border: borderAll
            },
            cell: { border: borderAll }
        };

        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellAddress];
                if (!cell) continue;

                if (R === 0) cell.s = styles.header;
                else if (R === 3) cell.s = styles.subHeader;
                else if (sheetData[R] && sheetData[R][0] === 'AÇIKLAMA ÖZETİ') cell.s = styles.summaryHeader;
                else cell.s = styles.cell;
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Evrak Raporu');
        XLSX.writeFile(wb, `evrak_raporu_${evrak.id}.xlsx`);
    };

    // tablo filtresi
    const filteredEvraklar = evraklar.filter((evrak) => {
        const tarihMatch =
            (!filters.startDate || new Date(evrak.tarih) >= new Date(filters.startDate)) &&
            (!filters.endDate || new Date(evrak.tarih) <= new Date(filters.endDate));

        const lokasyonMatch =
            filters.lokasyon.length === 0 || filters.lokasyon.includes(String(evrak.lokasyonid));

        const evrakProjeIds = evrak.evrakproje?.map((p) => String(p.projeid)) || [];
        const projeMatch =
            filters.proje.length === 0 || evrakProjeIds.some((pid) => filters.proje.includes(pid));

        const seferAciklamalari = (evrak.evrakseferler || []).map((s) => s.aciklama).join(', ');
        const aciklamaMatch = filters.aciklama
            ? seferAciklamalari
                .toLocaleLowerCase('tr')
                .includes(filters.aciklama.toLocaleLowerCase('tr'))
            : true;

        const seferNoMatch = filters.seferno
            ? filters.seferno === '(Boş)'
                ? (evrak.evrakseferler || []).some((s) => !s.seferno?.trim())
                : (evrak.evrakseferler || []).some((s) =>
                    (s.seferno || '')
                        .toLocaleLowerCase('tr')
                        .includes(filters.seferno.toLocaleLowerCase('tr'))
                )
            : true;

        return tarihMatch && lokasyonMatch && projeMatch && aciklamaMatch && seferNoMatch;
    });

    const filteredAciklamaVerileri = () => {
        const counts = {};
        filteredEvraklar.forEach((evrak) => {
            evrak.evrakseferler?.forEach((sefer) => {
                const key = sefer.aciklama || '(Boş)';
                counts[key] = (counts[key] || 0) + 1;
            });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    };

    const filteredToplamSefer = filteredEvraklar.reduce(
        (sum, evrak) => sum + (evrak.sefersayisi || 0),
        0
    );

    // panel için bağımlı seçenekler
    const candidateEvraklar = useMemo(() => {
        let arr = evraklar || [];
        if (draft.startDate) arr = arr.filter((e) => new Date(e.tarih) >= new Date(draft.startDate));
        if (draft.endDate) arr = arr.filter((e) => new Date(e.tarih) <= new Date(draft.endDate));
        if (draft.proje?.length) {
            arr = arr.filter((e) => {
                const ids = (e.evrakproje || []).map((p) => String(p.projeid));
                return ids.some((id) => draft.proje.includes(id));
            });
        }
        return arr;
    }, [evraklar, draft.startDate, draft.endDate, draft.proje]);

    const projeOptions = useMemo(() => {
        const ids = new Set();
        candidateEvraklar.forEach((e) => e.evrakproje?.forEach((p) => ids.add(String(p.projeid))));
        return [...ids]
            .map((id) => ({ id, name: projeler?.[id] }))
            .filter((x) => x.name);
    }, [candidateEvraklar, projeler]);

    const lokasyonOptions = useMemo(() => {
        const ids = new Set(candidateEvraklar.map((e) => String(e.lokasyonid)));
        return [...ids]
            .map((id) => ({ id, name: lokasyonlar?.[id] }))
            .filter((x) => x.name);
    }, [candidateEvraklar, lokasyonlar]);

    const aciklamaOptions = useMemo(() => {
        const s = new Set();
        candidateEvraklar.forEach((e) =>
            e.evrakseferler?.forEach((x) => x.aciklama?.trim() && s.add(x.aciklama.trim()))
        );
        return [...s];
    }, [candidateEvraklar]);

    const seferOptions = useMemo(() => {
        const s = new Set();
        candidateEvraklar.forEach((e) =>
            e.evrakseferler?.forEach((x) => s.add(x.seferno?.trim() || '(Boş)'))
        );
        return [...s];
    }, [candidateEvraklar]);

    const openDetail = (evrak) => {
        setDetailEvrak(evrak);
        setShowDetailCard(true);
    };

    // ✅ Modern mini skeleton
    const TableSkeleton = () => (
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/50 p-5 shadow-sm backdrop-blur-xl">
            <div className="h-6 w-48 rounded bg-gray-200/70 dark:bg-gray-700/40 animate-pulse mb-4" />
            <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-gray-200/70 dark:bg-gray-700/40 animate-pulse" />
                ))}
            </div>
        </div>
    );

    return (
        <>
            {showEditModal && selectedEvrak && (
                <EditEvrakModal
                    value={selectedEvrak}
                    lokasyonlar={lokasyonlar}
                    projeler={projeler}
                    onClose={handleCloseEditModal}
                    onSave={handleEvrakGuncelle}
                />
            )}

            <Layout>
                {/* Arkaplan glow */}
                <div className="pointer-events-none fixed inset-0 -z-10">
                    <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400/25 via-violet-400/20 to-fuchsia-400/25 blur-3xl" />
                    <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/10 blur-3xl" />
                </div>

                <div className="mx-auto max-w-7xl px-4 py-8">
                    {/* HERO */}
                    <div className="mb-6 overflow-hidden rounded-[28px] border border-gray-200/70 bg-white/60 shadow-sm backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/50">
                        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 px-6 py-5 text-white dark:from-black dark:via-gray-950 dark:to-black">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                                        <FiSearch /> Liste • Filtre • Excel
                                    </div>
                                    <h2 className="mt-3 text-2xl font-bold tracking-tight">📚 Toplu Evraklar</h2>
                                    <p className="mt-1 text-sm text-white/70">
                                        Toplam Evrak: <b className="text-white">{filteredEvraklar.length}</b> • Toplam Sefer: <b className="text-white">{filteredToplamSefer}</b>
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={goHome}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/15 hover:bg-white/15 active:scale-[0.98] transition"
                                        title="Anasayfaya dön"
                                    >
                                        <FiHome />
                                        Anasayfaya Dön
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDraft(filters);
                                            setShowFilters(true);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition"
                                    >
                                        <FiFilter />
                                        Filtre
                                    </button>

                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={() => setFilters(initialFilterState)}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/15 hover:bg-white/15 active:scale-[0.98] transition"
                                            title="Filtreleri temizle"
                                        >
                                            <FiX />
                                            Temizle
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={exportToExcel}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition"
                                    >
                                        <FiDownload />
                                        Excel'e Aktar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={exportFilteredExcel}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-fuchsia-700 active:scale-[0.98] transition"
                                    >
                                        <FiFile />
                                        Detay Excel
                                    </button>
                                </div>
                            </div>

                            {/* mini stats */}
                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                                    <div className="text-xs text-white/70">Düzeltilmiş</div>
                                    <div className="mt-1 text-lg font-bold">{duzeltilmis} <span className="text-xs font-semibold text-white/70">({oran(duzeltilmis)}%)</span></div>
                                </div>
                                <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                                    <div className="text-xs text-white/70">Orijinale Çekilmiş</div>
                                    <div className="mt-1 text-lg font-bold">{orjinaleCekilmis} <span className="text-xs font-semibold text-white/70">({oran(orjinaleCekilmis)}%)</span></div>
                                </div>
                                <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                                    <div className="text-xs text-white/70">Toplam Sefer (Genel)</div>
                                    <div className="mt-1 text-lg font-bold">{toplamSefer}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Özet kartları */}
                    {!showFilters && (
                        <div className="mb-6">
                            <ModernSummary
                                title="Açıklama Dağılımı"
                                data={filteredAciklamaVerileri()}
                                total={filteredToplamSefer}
                                onCardClick={openCardPanel}
                            />
                        </div>
                    )}

                    {/* Tablo */}
                    {loading ? (
                        <TableSkeleton />
                    ) : (
                        <div className="rounded-2xl overflow-hidden border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/50 shadow-sm backdrop-blur-xl">
                            <div className="overflow-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-100/90 dark:bg-gray-800/80 sticky top-0 z-10 backdrop-blur">
                                        <tr>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60 text-left text-xs font-bold tracking-wide text-gray-700 dark:text-gray-200">#</th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60 text-left text-xs font-bold tracking-wide text-gray-700 dark:text-gray-200">Tarih</th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60 text-left text-xs font-bold tracking-wide text-gray-700 dark:text-gray-200">Lokasyon</th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60 text-left text-xs font-bold tracking-wide text-gray-700 dark:text-gray-200">Projeler</th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60 text-left text-xs font-bold tracking-wide text-gray-700 dark:text-gray-200">Toplam</th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60 text-center text-xs font-bold tracking-wide text-gray-700 dark:text-gray-200">Sefer</th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60 text-center text-xs font-bold tracking-wide text-gray-700 dark:text-gray-200">Açıklama</th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60"></th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60"></th>
                                            <th className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-700/60"></th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredEvraklar.map((evrak, index) => {
                                            const isProjelerVisible = acikProjeId === evrak.id;

                                            return (
                                                <tr
                                                    key={evrak.id}
                                                    className="bg-white/60 text-gray-900 dark:bg-gray-900/20 dark:text-gray-100 odd:bg-gray-50/70 dark:odd:bg-gray-900/35 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/25 transition-colors"
                                                >
                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50 font-semibold text-center">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50">
                                                        {new Date(evrak.tarih).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50">
                                                        {lokasyonlar[evrak.lokasyonid]}
                                                    </td>

                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAcikProjeId(isProjelerVisible ? null : evrak.id);
                                                            }}
                                                            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold bg-gray-100/80 border border-gray-200 text-gray-900
                                         hover:bg-gray-200/70 dark:bg-gray-800/60 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                                                        >
                                                            <FiInfo />
                                                            {isProjelerVisible ? 'Projeleri Gizle' : 'Projeleri Göster'}
                                                        </button>

                                                        {isProjelerVisible && (
                                                            <ul className="mt-2 space-y-1 rounded-xl bg-white/60 dark:bg-gray-900/30 border border-gray-200/60 dark:border-gray-700/50 p-3">
                                                                {evrak.evrakproje?.map((p, idx) => (
                                                                    <li key={idx} className="text-sm">
                                                                        <span className="font-semibold">{projeler[p.projeid]}</span>{' '}
                                                                        <span className="opacity-80">({p.sefersayisi})</span>
                                                                    </li>
                                                                ))}
                                                                {(!evrak.evrakproje || !evrak.evrakproje.length) && (
                                                                    <li className="text-sm opacity-70">Proje kaydı yok.</li>
                                                                )}
                                                            </ul>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50">
                                                        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200 px-3 py-1 text-xs font-bold">
                                                            {evrak.sefersayisi}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50 text-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDetail(evrak);
                                                            }}
                                                            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-semibold hover:bg-indigo-700 active:scale-[0.98] transition"
                                                        >
                                                            Detay
                                                        </button>
                                                    </td>

                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50 text-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDetail(evrak);
                                                            }}
                                                            className="inline-flex items-center justify-center rounded-xl bg-white/60 dark:bg-gray-900/25 border border-gray-200/70 dark:border-gray-700/60 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-white/90 dark:hover:bg-gray-900/40 active:scale-[0.98] transition"
                                                        >
                                                            Detay
                                                        </button>
                                                    </td>

                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50 text-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEvrak(evrak);
                                                                setShowEditModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-semibold hover:bg-blue-700 active:scale-[0.98] transition"
                                                        >
                                                            <FiEdit2 />
                                                            Düzenle
                                                        </button>
                                                    </td>

                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50 text-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                exportEvrakToExcel(evrak);
                                                            }}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-700 active:scale-[0.98] transition"
                                                        >
                                                            <FiDownload />
                                                            Satır Raporu
                                                        </button>
                                                    </td>

                                                    <td className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/50 text-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEvrakSil(evrak);
                                                            }}
                                                            disabled={deletingId === evrak.id}
                                                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white active:scale-[0.98] transition
                                ${deletingId === evrak.id ? 'bg-rose-300 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'}`}
                                                        >
                                                            <FiTrash2 />
                                                            {deletingId === evrak.id ? 'Siliniyor…' : 'Sil'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {filteredEvraklar.length === 0 && (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-600 dark:text-gray-300">
                                                    Kayıt bulunamadı. Filtreleri gevşetmeyi deneyin.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </Layout>

            {/* SOL FİLTRE PANELİ */}
            {showFilters && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
                    <div className="absolute left-0 top-0 h-full w-full max-w-[420px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl p-5 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Filtreler</h3>
                            <button onClick={() => setShowFilters(false)} className="text-xl px-2" aria-label="Kapat">×</button>
                        </div>

                        {/* Tarihler */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm">Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    value={draft.startDate}
                                    onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm">Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    value={draft.endDate}
                                    onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        {/* Projeler */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Projeler</label>
                                <button onClick={() => setDraft((d) => ({ ...d, proje: [] }))} className="text-xs px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700">
                                    Temizle
                                </button>
                            </div>
                            <div className="mt-2 max-h-40 overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                                {projeOptions.map(({ id, name }) => (
                                    <label key={id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                        <input
                                            type="checkbox"
                                            checked={draft.proje.includes(id)}
                                            onChange={() =>
                                                setDraft((d) => ({
                                                    ...d,
                                                    proje: d.proje.includes(id) ? d.proje.filter((x) => x !== id) : [...d.proje, id],
                                                }))
                                            }
                                        />
                                        <span>{name}</span>
                                    </label>
                                ))}
                                {projeOptions.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-500">Seçili tarih aralığında proje yok.</div>
                                )}
                            </div>
                        </div>

                        {/* Lokasyonlar */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Lokasyonlar</label>
                                <button onClick={() => setDraft((d) => ({ ...d, lokasyon: [] }))} className="text-xs px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700">
                                    Temizle
                                </button>
                            </div>
                            <div className="mt-2 max-h-40 overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                                {lokasyonOptions.map(({ id, name }) => (
                                    <label key={id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                        <input
                                            type="checkbox"
                                            checked={draft.lokasyon.includes(id)}
                                            onChange={() =>
                                                setDraft((d) => ({
                                                    ...d,
                                                    lokasyon: d.lokasyon.includes(id) ? d.lokasyon.filter((x) => x !== id) : [...d.lokasyon, id],
                                                }))
                                            }
                                        />
                                        <span>{name}</span>
                                    </label>
                                ))}
                                {lokasyonOptions.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-500">Seçili projelere ait lokasyon yok.</div>
                                )}
                            </div>
                        </div>

                        {/* Açıklama */}
                        <div className="mt-5">
                            <label className="text-sm font-medium">Açıklama</label>
                            <input
                                type="text"
                                list="aciklama-list"
                                value={draft.aciklama}
                                onChange={(e) => setDraft({ ...draft, aciklama: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
                                placeholder="Ara ya da yaz..."
                            />
                            <datalist id="aciklama-list">
                                {aciklamaOptions.map((a, i) => (
                                    <option key={i} value={a} />
                                ))}
                            </datalist>
                        </div>

                        {/* Sefer No */}
                        <div className="mt-5">
                            <label className="text-sm font-medium">Sefer No</label>
                            <input
                                type="text"
                                list="sefer-list"
                                value={draft.seferno}
                                onChange={(e) => setDraft({ ...draft, seferno: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
                                placeholder="Ara ya da yaz..."
                            />
                            <datalist id="sefer-list">
                                {seferOptions.map((s, i) => (
                                    <option key={i} value={s} />
                                ))}
                            </datalist>
                        </div>

                        {/* Butonlar */}
                        <div className="mt-6 flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setFilters(initialFilterState);
                                    setDraft(initialFilterState);
                                    setShowFilters(false);
                                }}
                                className="h-[44px] px-4 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-semibold"
                            >
                                Temizle
                            </button>
                            <button
                                onClick={() => {
                                    setFilters(draft);
                                    setShowFilters(false);
                                }}
                                className="h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                                Uygula
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ DETAY CARD */}
            {showDetailCard && detailEvrak && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetailCard(false)} />
                    <div className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl p-6 overflow-y-auto border border-gray-200/60 dark:border-gray-700/60">
                        <button onClick={() => setShowDetailCard(false)} className="absolute top-3 right-4 text-2xl leading-none" aria-label="Kapat">×</button>

                        <h3 className="text-lg font-semibold mb-4">Sefer Detayları — Evrak #{detailEvrak.id}</h3>

                        {/* Meta */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3">
                                <div className="text-xs opacity-70">Tarih</div>
                                <div className="font-medium">{new Date(detailEvrak.tarih).toLocaleDateString('tr-TR')}</div>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3">
                                <div className="text-xs opacity-70">Lokasyon</div>
                                <div className="font-medium">{lokasyonlar[detailEvrak.lokasyonid]}</div>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3">
                                <div className="text-xs opacity-70">Toplam Sefer</div>
                                <div className="font-medium">{detailEvrak.sefersayisi || 0}</div>
                            </div>
                        </div>

                        {/* Projeler */}
                        <div className="mb-4">
                            <div className="text-sm font-semibold mb-2">Projeler</div>
                            <div className="flex flex-wrap gap-2">
                                {(detailEvrak.evrakproje || []).map((p, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                                        {projeler[p.projeid]} — {p.sefersayisi}
                                    </span>
                                ))}
                                {(!detailEvrak.evrakproje || !detailEvrak.evrakproje.length) && (
                                    <span className="text-xs opacity-70">Proje kaydı yok.</span>
                                )}
                            </div>
                        </div>

                        {/* Sefer listesi */}
                        <div>
                            <div className="text-sm font-semibold mb-2">Seferler</div>
                            <div className="space-y-2">
                                {(detailEvrak.evrakseferler || []).length ? (
                                    detailEvrak.evrakseferler.map((s, i) => {
                                        const normalized = (s.aciklama || '').trim().toLocaleUpperCase('tr');
                                        const badgeClass =
                                            normalized === 'TARAFIMIZCA DÜZELTİLMİŞTİR'
                                                ? 'bg-emerald-600 text-white'
                                                : normalized === 'TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100';

                                        return (
                                            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-3 flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-xs opacity-70">Sefer No</div>
                                                    <div className="font-medium">{s.seferno || '(Boş)'}</div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs ${badgeClass}`}>{s.aciklama || '—'}</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-sm opacity-70">Sefer kaydı bulunamadı.</div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => exportEvrakToExcel(detailEvrak)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                                Excel (Satır Raporu)
                            </button>
                            <button onClick={() => setShowDetailCard(false)} className="px-4 py-2 rounded-xl bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold">
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 👉 Sağdan kayan PANEL */}
            {panelOpen && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
                    <div className="absolute right-0 top-0 h-full w-full sm:w-[620px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl p-5 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">
                                {panelTitle} — {panelRows.length} satır
                            </h3>
                            <button onClick={() => setPanelOpen(false)} className="text-xl px-2" aria-label="Kapat">×</button>
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">#</th>
                                        <th className="px-3 py-2 text-left">Tarih</th>
                                        <th className="px-3 py-2 text-left">Evrak</th>
                                        <th className="px-3 py-2 text-left">Lokasyon</th>
                                        <th className="px-3 py-2 text-left">Sefer No</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {panelRows.map((r, i) => (
                                        <tr key={`${r.evrakId}-${i}`} className="odd:bg-gray-50 dark:odd:bg-gray-900">
                                            <td className="px-3 py-2">{i + 1}</td>
                                            <td className="px-3 py-2">{new Date(r.tarih).toLocaleDateString('tr-TR')}</td>
                                            <td className="px-3 py-2">#{r.evrakId}</td>
                                            <td className="px-3 py-2">{r.lokasyon}</td>
                                            <td className="px-3 py-2">{r.seferno}</td>
                                        </tr>
                                    ))}
                                    {panelRows.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center opacity-70">Kayıt bulunamadı.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default TopluEvraklar;