import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { FiFile } from 'react-icons/fi';
import Layout from './components/Layout';
import * as XLSX from 'xlsx';
import EditEvrakModal from './components/EditEvrakModal';
import ModernSummary from "./components/ModernSummary";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

function TopluEvraklar() {
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

    useEffect(() => {
        fetchVeriler();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    const openCardPanel = (aciklamaKey) => {
        const keyNorm = normalize(aciklamaKey);
        const rows = [];

        evraklar.forEach((e) => {
            const lok = lokasyonlar[e.lokasyonid] || '';
            (e.evrakseferler || []).forEach((s) => {
                if (normalize(s.aciklama) === keyNorm) {
                    rows.push({
                        evrakId: e.id,
                        tarih: e.tarih,
                        lokasyon: lok,
                        seferno: s.seferno || '(Boş)',
                        aciklama: s.aciklama || '',
                    });
                }
            });
        });

        // tarih DESC
        rows.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

        setPanelRows(rows);
        setPanelTitle(aciklamaKey);
        setPanelOpen(true);
    };


    const handleEvrakGuncelle = async () => {
        const evrakId = selectedEvrak.id;
        const tarih = selectedEvrak.tarih;
        const lokasyonid = selectedEvrak.lokasyonid;

        const evrakproje = Array.isArray(selectedEvrak.evrakproje)
            ? selectedEvrak.evrakproje.filter((p) => p.projeid && !isNaN(p.projeid))
            : [];

        const toplamSefer = evrakproje.reduce((sum, p) => sum + Number(p.sefersayisi || 0), 0);

        const evrakseferler = Array.isArray(selectedEvrak.evrakseferler)
            ? selectedEvrak.evrakseferler.filter((s) => s.seferno && s.aciklama)
            : [];

        try {
            await supabase
                .from('evraklar')
                .update({ tarih, lokasyonid, sefersayisi: toplamSefer })
                .eq('id', evrakId);

            await supabase.from('evrakproje').delete().eq('evrakid', evrakId);
            if (evrakproje.length > 0) {
                await supabase.from('evrakproje').insert(
                    evrakproje.map((p) => ({
                        evrakid: evrakId,
                        projeid: Number(p.projeid),
                        sefersayisi: Number(p.sefersayisi || 0)
                    }))
                );
            }

            await supabase.from('evrakseferler').delete().eq('evrakid', evrakId);
            if (evrakseferler.length > 0) {
                await supabase.from('evrakseferler').insert(
                    evrakseferler.map((s) => ({
                        evrakid: evrakId,
                        seferno: s.seferno,
                        aciklama: s.aciklama
                    }))
                );
            }

            await fetchVeriler();
            setShowEditModal(false);
            setSelectedEvrak(null);
        } catch (error) {
            console.error('Evrak güncelleme hatası:', error);
            alert('Güncelleme sırasında bir hata oluştu.');
        }
    };

    const aciklamaVerileri = () => {
        const counts = {};
        evraklar.forEach((evrak) => {
            evrak.evrakseferler?.forEach((sefer) => {
                counts[sefer.aciklama] = (counts[sefer.aciklama] || 0) + 1;
            });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    };

    const projeSeferVerileri = () => {
        const projeCount = {};
        evraklar.forEach((e) => {
            e.evrakproje?.forEach((p) => {
                const proje = projeler[p.projeid];
                if (proje) {
                    projeCount[proje] = (projeCount[proje] || 0) + p.sefersayisi;
                }
            });
        });
        return Object.entries(projeCount).map(([name, value]) => ({ name, value }));
    };

    const lokasyonBazliAciklamaVerileri = () => {
        const sonuc = {};
        evraklar.forEach((evrak) => {
            const lokasyonAdi = lokasyonlar?.[evrak.lokasyonid];
            if (!lokasyonAdi) return;

            if (!sonuc[lokasyonAdi]) {
                sonuc[lokasyonAdi] = { toplamSefer: 0, aciklamalar: {} };
            }
            sonuc[lokasyonAdi].toplamSefer += evrak.sefersayisi || 0;

            evrak.evrakseferler?.forEach((sefer) => {
                const aciklama = sefer.aciklama;
                if (aciklama) {
                    sonuc[lokasyonAdi].aciklamalar[aciklama] =
                        (sonuc[lokasyonAdi].aciklamalar[aciklama] || 0) + 1;
                }
            });
        });

        return sonuc;
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

    return (
        <>
            {showEditModal && selectedEvrak && (
                <EditEvrakModal
                    value={selectedEvrak}
                    lokasyonlar={lokasyonlar}
                    projeler={projeler}
                    onChange={setSelectedEvrak}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEvrakGuncelle}
                />
            )}

            <Layout>
                <div className="flex flex-col gap-8 p-8 bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
                    {/* Üst bar */}
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-2 flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => {
                                setDraft(filters);
                                setShowFilters(true);
                            }}
                            className="h-[40px] px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                            🔎 Filtre
                        </button>

                        {hasActiveFilters && (
                            <button
                                onClick={() => setFilters(initialFilterState)}
                                className="h-[40px] px-4 rounded-md bg-gray-600 hover:bg-gray-700 text-white"
                            >
                                Temizle
                            </button>
                        )}

                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 h-[40px] px-4 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                            <FiFile size={18} />
                            Excel'e Aktar
                        </button>
                    </div>

                    {/* Ana içerik */}
                    <div className="flex gap-8">
                        {/* Sol: tablo */}
                        <div className="flex-[2]">
                            {loading ? (
                                <p className="text-center">Yükleniyor...</p>
                            ) : (
                                <div className="rounded-xl overflow-hidden shadow">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">#</th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Tarih</th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Lokasyon</th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Projeler</th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Toplam Sefer</th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Sefer No</th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Açıklama</th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700"></th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700"></th>
                                                <th className="px-4 py-2 border border-gray-200 dark:border-gray-700"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredEvraklar.map((evrak, index) => {
                                                const isProjelerVisible = acikProjeId === evrak.id;

                                                return (
                                                    <tr
                                                        key={evrak.id}
                                                        className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 odd:bg-gray-50 dark:odd:bg-gray-900 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors"
                                                    >
                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 font-semibold text-center">
                                                            {index + 1}
                                                        </td>
                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                                                            {new Date(evrak.tarih).toLocaleDateString('tr-TR')}
                                                        </td>
                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                                                            {lokasyonlar[evrak.lokasyonid]}
                                                        </td>
                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAcikProjeId(isProjelerVisible ? null : evrak.id);
                                                                }}
                                                                className="rounded-md px-2 py-1 text-xs cursor-pointer mb-2 bg-gray-100 border border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            >
                                                                {isProjelerVisible ? 'Projeleri Gizle' : 'Projeleri Göster'}
                                                            </button>
                                                            {isProjelerVisible && (
                                                                <ul className="list-none p-2 m-0">
                                                                    {evrak.evrakproje?.map((p, idx) => (
                                                                        <li key={idx}>
                                                                            {projeler[p.projeid]} ({p.sefersayisi})
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
                                                            {evrak.sefersayisi}
                                                        </td>

                                                        {/* Sefer No: Detay */}
                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDetail(evrak);
                                                                }}
                                                                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                                                            >
                                                                Detay
                                                            </button>
                                                        </td>

                                                        {/* Açıklama: Detay */}
                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDetail(evrak);
                                                                }}
                                                                className="text-xs underline text-blue-700 dark:text-blue-400"
                                                            >
                                                                Detay
                                                            </button>
                                                        </td>

                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedEvrak(evrak);
                                                                    setShowEditModal(true);
                                                                }}
                                                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                                            >
                                                                Düzenle
                                                            </button>
                                                        </td>

                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    exportEvrakToExcel(evrak);
                                                                }}
                                                                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                                            >
                                                                Satır Raporu Al
                                                            </button>
                                                        </td>

                                                        <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEvrakSil(evrak);
                                                                }}
                                                                disabled={deletingId === evrak.id}
                                                                className={`text-xs px-3 py-1 rounded ${deletingId === evrak.id
                                                                    ? 'bg-red-300 cursor-not-allowed text-white'
                                                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                                                    }`}
                                                            >
                                                                {deletingId === evrak.id ? 'Siliniyor…' : 'Sil'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Sağ: modern dashboard */}
                        {!showFilters && (
                            <div className="flex flex-col gap-8 pb-8 flex-[1.5]">
                                <ModernSummary
                                    title="Açıklama Dağılımı"
                                    data={aciklamaVerileri()}
                                    total={toplamSefer}
                                    onCardClick={openCardPanel}
                                />
                                {/* Proje Bazlı Seferler (ister bırakırsın ister ModernSummary içine alırız) */}
                                <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-lg p-6">
                                    <h4 className="text-lg font-semibold mb-4">📦 Proje Bazlı Seferler</h4>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {projeSeferVerileri()
                                            .sort((a, b) => b.value - a.value)
                                            .map((item) => (
                                                <div
                                                    key={item.name}
                                                    className="p-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow"
                                                >
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-indigo-600 dark:text-indigo-400 font-bold">
                                                        {item.value.toLocaleString()} sefer
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </Layout>

            {/* SOL FİLTRE PANELİ */}
            {showFilters && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
                    <div className="absolute left-0 top-0 h-full w-full max-w-[380px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl p-5 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Filtreler</h3>
                            <button onClick={() => setShowFilters(false)} className="text-xl px-2">×</button>
                        </div>

                        {/* Tarihler */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm">Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    value={draft.startDate}
                                    onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm">Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    value={draft.endDate}
                                    onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        {/* Projeler */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Projeler</label>
                                <button onClick={() => setDraft((d) => ({ ...d, proje: [] }))} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">
                                    Temizle
                                </button>
                            </div>
                            <div className="mt-2 max-h-40 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                                {projeOptions.map(({ id, name }) => (
                                    <label key={id} className="flex items-center gap-2 px-3 py-1 text-sm cursor-pointer">
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
                                <button onClick={() => setDraft((d) => ({ ...d, lokasyon: [] }))} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">
                                    Temizle
                                </button>
                            </div>
                            <div className="mt-2 max-h-40 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                                {lokasyonOptions.map(({ id, name }) => (
                                    <label key={id} className="flex items-center gap-2 px-3 py-1 text-sm cursor-pointer">
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
                                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
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
                                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
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
                                className="h-[40px] px-4 rounded-md bg-gray-600 hover:bg-gray-700 text-white"
                            >
                                Temizle
                            </button>
                            <button
                                onClick={() => {
                                    setFilters(draft);
                                    setShowFilters(false);
                                }}
                                className="h-[40px] px-4 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold"
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
                    <div className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl p-6 overflow-y-auto">
                        <button onClick={() => setShowDetailCard(false)} className="absolute top-3 right-4 text-2xl leading-none" aria-label="Kapat">×</button>

                        <h3 className="text-lg font-semibold mb-4">Sefer Detayları — Evrak #{detailEvrak.id}</h3>

                        {/* Meta */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                                <div className="text-xs opacity-70">Tarih</div>
                                <div className="font-medium">{new Date(detailEvrak.tarih).toLocaleDateString('tr-TR')}</div>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                                <div className="text-xs opacity-70">Lokasyon</div>
                                <div className="font-medium">{lokasyonlar[detailEvrak.lokasyonid]}</div>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
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
                                                ? 'bg-green-600 text-white'
                                                : normalized === 'TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100';

                                        return (
                                            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-start justify-between gap-3">
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
                            <button onClick={() => exportEvrakToExcel(detailEvrak)} className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm">
                                Excel (Satır Raporu)
                            </button>
                            <button onClick={() => setShowDetailCard(false)} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm">
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 👉 Sağdan kayan PANEL: kart tıklanınca açılır (DETAY CARD'ın DIŞINDA) */}
            {panelOpen && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
                    <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl p-5 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">
                                {panelTitle} — {panelRows.length} satır
                            </h3>
                            <button onClick={() => setPanelOpen(false)} className="text-xl px-2">×</button>
                        </div>

                        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
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



const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    boxShadow: '0 0 10px rgba(0,0,0,0.05)',
    borderRadius: '8px',
    overflow: 'hidden'
};

const cellStyle = {
    border: '1px solid #e5e7eb',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.95rem',
    color: '#1f2937'
};

export default TopluEvraklar;
