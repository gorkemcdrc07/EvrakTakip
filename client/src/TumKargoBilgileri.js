import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Select from 'react-select';
import {
    FiFilter,
    FiDownload,
    FiRotateCcw,
    FiSearch,
    FiEdit2,
    FiX,
    FiCalendar,
    FiTruck,
    FiFileText,
    FiPackage,
    FiUsers,
} from 'react-icons/fi';

function TumKargoBilgileri() {
    const [veriler, setVeriler] = useState([]);
    const [filteredVeriler, setFilteredVeriler] = useState([]);
    const [loading, setLoading] = useState(true);

    const [tarihBaslangic, setTarihBaslangic] = useState('');
    const [tarihBitis, setTarihBitis] = useState('');
    const [yilSecenekleri, setYilSecenekleri] = useState([]);
    const [secilenYil, setSecilenYil] = useState('');

    const [irsaliyeOptions, setIrsaliyeOptions] = useState([]);
    const [kargoOptions, setKargoOptions] = useState([]);
    const [gonderenOptions, setGonderenOptions] = useState([]);

    const [selectedIrsaliye, setSelectedIrsaliye] = useState([]);
    const [selectedKargo, setSelectedKargo] = useState([]);
    const [selectedGonderen, setSelectedGonderen] = useState([]);

    const [modalIcerik, setModalIcerik] = useState('');
    const [modalBaslik, setModalBaslik] = useState('');
    const [modalGoster, setModalGoster] = useState(false);
    const [excelModalAcik, setExcelModalAcik] = useState(false);

    const [duzenlenenVeri, setDuzenlenenVeri] = useState(null);
    const [duzenleModalAcik, setDuzenleModalAcik] = useState(false);
    const [ekstraEvrakSayisi, setEkstraEvrakSayisi] = useState('');
    const [ekstraEvrakSoruAcik, setEkstraEvrakSoruAcik] = useState(false);
    const [ekstraEvrakEklendi, setEkstraEvrakEklendi] = useState(false);
    const [irsaliyeNoInput, setIrsaliyeNoInput] = useState('');

    const getYil = (tarih) => {
        if (!tarih) return '';
        const date = new Date(tarih);
        return isNaN(date) ? '' : String(date.getFullYear());
    };

    useEffect(() => {
        const veriGetir = async () => {
            const pageSize = 1000;  // her seferde kaç kayıt çekilecek
            let from = 0;
            let to = pageSize - 1;
            let hasMore = true;
            let allData = [];

            while (hasMore) {
                const { data, error } = await supabase
                    .from('kargo_bilgileri')
                    .select('*')
                    .order('id', { ascending: false })
                    .range(from, to);

                if (error) {
                    console.error('Veri çekme hatası:', error);
                    break;
                }

                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    from += pageSize;
                    to += pageSize;
                    hasMore = data.length === pageSize;  // sayfa doluysa devam et
                } else {
                    hasMore = false;
                }
            }

            setVeriler(allData);

            const yıllar = [...new Set(allData.map((v) => getYil(v.tarih)))]
                .filter(Boolean)
                .sort((a, b) => b - a);
            setYilSecenekleri(yıllar);

            const irsaliyeSet = [...new Set(allData.map((v) => v.irsaliye_adi).filter(Boolean))];
            const kargoSet = [...new Set(allData.map((v) => v.kargo_firmasi).filter(Boolean))];
            const gonderenSet = [...new Set(allData.map((v) => v.gonderen_firma).filter(Boolean))];

            setIrsaliyeOptions(irsaliyeSet.map((v) => ({ label: v, value: v })));
            setKargoOptions(kargoSet.map((v) => ({ label: v, value: v })));
            setGonderenOptions(gonderenSet.map((v) => ({ label: v, value: v })));

            setLoading(false);
        };

        veriGetir();
    }, []);

    useEffect(() => {
        if (!loading) {
            filtrele();
        }
    }, [
        veriler,
        secilenYil,
        tarihBaslangic,
        tarihBitis,
        selectedIrsaliye,
        selectedKargo,
        selectedGonderen,
        irsaliyeNoInput,
        loading,
    ]);

    const tarihFormatla = (tarihStr) => {
        const tarih = new Date(tarihStr);
        return isNaN(tarih) ? '' : tarih.toLocaleDateString('tr-TR');
    };

    const kisalt = (metin, limit = 30) =>
        metin?.length > limit ? metin.slice(0, limit) + '...' : metin;

    const modalAc = (baslik, icerik) => {
        setModalBaslik(baslik);
        setModalIcerik(icerik);
        setModalGoster(true);
    };
    const modalKapat = () => {
        setModalGoster(false);
        setModalIcerik('');
        setModalBaslik('');
    };

    const filtrele = () => {
        let filtrelenmis = [...veriler];

        if (secilenYil) {
            filtrelenmis = filtrelenmis.filter((v) => getYil(v.tarih) === secilenYil);
        }
        if (tarihBaslangic) {
            filtrelenmis = filtrelenmis.filter((v) => new Date(v.tarih) >= new Date(tarihBaslangic));
        }
        if (tarihBitis) {
            filtrelenmis = filtrelenmis.filter((v) => new Date(v.tarih) <= new Date(tarihBitis));
        }

        if (selectedIrsaliye.length > 0) {
            const secilen = selectedIrsaliye.map((o) => o.value.toLowerCase());
            filtrelenmis = filtrelenmis.filter((v) => secilen.includes(v.irsaliye_adi?.toLowerCase()));
        }
        if (selectedKargo.length > 0) {
            const secilen = selectedKargo.map((o) => o.value.toLowerCase());
            filtrelenmis = filtrelenmis.filter((v) => secilen.includes(v.kargo_firmasi?.toLowerCase()));
        }
        if (selectedGonderen.length > 0) {
            const secilen = selectedGonderen.map((o) => o.value.toLowerCase());
            filtrelenmis = filtrelenmis.filter((v) => secilen.includes(v.gonderen_firma?.toLowerCase()));
        }
        if (irsaliyeNoInput.trim() !== '') {
            const aranan = irsaliyeNoInput.trim().toLowerCase();
            filtrelenmis = filtrelenmis.filter((v) => v.irsaliye_no?.toLowerCase().includes(aranan));
        }

        setFilteredVeriler(filtrelenmis);
    };

    const hasActiveFilters = useMemo(() => {
        return (
            !!secilenYil ||
            !!tarihBaslangic ||
            !!tarihBitis ||
            selectedIrsaliye.length > 0 ||
            selectedKargo.length > 0 ||
            selectedGonderen.length > 0 ||
            irsaliyeNoInput.trim() !== ''
        );
    }, [
        secilenYil,
        tarihBaslangic,
        tarihBitis,
        selectedIrsaliye,
        selectedKargo,
        selectedGonderen,
        irsaliyeNoInput,
    ]);

    const filtreleriTemizle = () => {
        setSecilenYil('');
        setTarihBaslangic('');
        setTarihBitis('');
        setSelectedIrsaliye([]);
        setSelectedKargo([]);
        setSelectedGonderen([]);
        setIrsaliyeNoInput('');
        setFilteredVeriler(veriler);
    };

    const excelAktarVeri = (veri, tur) => {
        const aktarilacak = veri.map((item) => ({
            Tarih: tarihFormatla(item.tarih),
            'Kargo Firması': item.kargo_firmasi,
            'Gönderi No': item.gonderi_numarasi,
            'Gönderen Firma': item.gonderen_firma,
            'İrsaliye Adı': item.irsaliye_adi,
            'İrsaliye No': item.irsaliye_no,
            'Odak Evrak No': item.odak_evrak_no,
            'Evrak Adedi': item.evrak_adedi,
        }));

        const worksheet = XLSX.utils.json_to_sheet(aktarilacak);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Kargo Verileri');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(blob, `kargo_bilgileri_${tur}.xlsx`);
    };

    const tumVeriyiExceleAktar = async () => {
        const pageSize = 1000;
        let allData = [];
        let from = 0;
        let to = pageSize - 1;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase.from('kargo_bilgileri').select('*').range(from, to);
            if (error) {
                console.error('Veri çekme hatası:', error);
                break;
            }
            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += pageSize;
                to += pageSize;
                hasMore = data.length === pageSize;
            } else {
                hasMore = false;
            }
        }

        excelAktarVeri(allData, 'tum');
        setExcelModalAcik(false);
    };

    const duzenleModaliAc = (veri) => {
        setDuzenlenenVeri({ ...veri });
        setDuzenleModalAcik(true);
        setEkstraEvrakSayisi('');
        setEkstraEvrakSoruAcik(true);
        setEkstraEvrakEklendi(false);
    };

    const handleDuzenleInputChange = (e) => {
        const { name, value } = e.target;
        setDuzenlenenVeri((prev) => {
            const yeniVeri = { ...prev, [name]: value };
            const irsaliyeAdet =
                yeniVeri.irsaliye_no?.split('-').filter((s) => s.trim() !== '').length || 0;
            const odakAdet = yeniVeri.odak_evrak_no?.split('-').filter((s) => s.trim() !== '')
                .length || 0;
            const ekstra = parseInt(ekstraEvrakSayisi) || 0;
            yeniVeri.evrak_adedi = irsaliyeAdet + odakAdet + ekstra;
            return yeniVeri;
        });
    };

    const duzenleVeriyiGuncelle = async () => {
        const {
            id,
            tarih,
            kargo_firmasi,
            gonderi_numarasi,
            gonderen_firma,
            irsaliye_adi,
            irsaliye_no,
            odak_evrak_no,
        } = duzenlenenVeri;

        const irsaliyeAdet = irsaliye_no?.split('-').filter((s) => s.trim() !== '').length || 0;
        const odakAdet =
            odak_evrak_no?.split('-').filter((s) => s.trim() !== '').length || 0;
        const ekstra = parseInt(ekstraEvrakSayisi) || 0;
        const evrak_adedi = irsaliyeAdet + odakAdet + ekstra;

        const { error } = await supabase
            .from('kargo_bilgileri')
            .update({
                tarih,
                kargo_firmasi,
                gonderi_numarasi,
                gonderen_firma,
                irsaliye_adi,
                irsaliye_no,
                odak_evrak_no,
                evrak_adedi,
            })
            .eq('id', id);

        if (!error) {
            alert('Başarıyla güncellendi.');
            setVeriler((prev) =>
                prev.map((v) => (v.id === id ? { ...duzenlenenVeri, evrak_adedi } : v))
            );
            setDuzenleModalAcik(false);
        } else {
            alert('Güncelleme başarısız!');
        }
    };

    const duzenleVeriyiSil = async () => {
        if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
            const { error } = await supabase
                .from('kargo_bilgileri')
                .delete()
                .eq('id', duzenlenenVeri.id);

            if (!error) {
                alert('Kayıt silindi.');
                setVeriler((prev) => prev.filter((v) => v.id !== duzenlenenVeri.id));
                setDuzenleModalAcik(false);
            } else {
                alert('Silme işlemi başarısız!');
            }
        }
    };

    // Küçük özetler
    const toplamKayit = veriler.length;
    const toplamFiltreli = filteredVeriler.length;
    const toplamEvrak = useMemo(
        () =>
            filteredVeriler.reduce(
                (sum, v) => sum + (parseInt(v.evrak_adedi, 10) || 0),
                0
            ),
        [filteredVeriler]
    );

    return (
        <Layout>
            <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 bg-gray-100 text-gray-900 transition-colors duration-300 dark:bg-gray-900 dark:text-white">
                {/* Üst başlık + aksiyonlar */}
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                            📋 Tüm Kargo Bilgileri
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Filtreleyin, detayları görüntüleyin, Excel’e aktarın.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setExcelModalAcik(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                        >
                            <FiDownload /> Excel’e Aktar
                        </button>
                        <button
                            onClick={filtreleriTemizle}
                            disabled={!hasActiveFilters}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 ${hasActiveFilters
                                    ? 'bg-gray-700 text-white hover:bg-gray-800'
                                    : 'bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                                }`}
                            title="Filtreleri temizle"
                        >
                            <FiRotateCcw /> Temizle
                        </button>
                    </div>
                </div>

                {/* Hızlı istatistikler */}
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                                <FiFileText />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Toplam Kayıt</div>
                                <div className="text-xl font-semibold">{toplamKayit.toLocaleString('tr-TR')}</div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                <FiSearch />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Filtreli Kayıt</div>
                                <div className="text-xl font-semibold">
                                    {toplamFiltreli.toLocaleString('tr-TR')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <FiPackage />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Toplam Evrak</div>
                                <div className="text-xl font-semibold">
                                    {toplamEvrak.toLocaleString('tr-TR')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtreler */}
                <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                    <div className="mb-4 flex items-center gap-2 font-semibold">
                        <FiFilter />
                        <span>Filtreler</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                <FiCalendar className="inline" /> Yıl
                            </label>
                            <select
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                value={secilenYil}
                                onChange={(e) => setSecilenYil(e.target.value)}
                            >
                                <option value="">Tüm Yıllar</option>
                                {yilSecenekleri.map((yil) => (
                                    <option key={yil} value={yil}>
                                        {yil}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">Tarih Başlangıç</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                value={tarihBaslangic}
                                onChange={(e) => setTarihBaslangic(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">Tarih Bitiş</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                value={tarihBitis}
                                onChange={(e) => setTarihBitis(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">İrsaliye Adı</label>
                            <Select
                                options={irsaliyeOptions}
                                value={selectedIrsaliye}
                                onChange={setSelectedIrsaliye}
                                isMulti
                                className="text-black"
                                classNamePrefix="rs"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                <FiTruck className="inline" /> Kargo Firması
                            </label>
                            <Select
                                options={kargoOptions}
                                value={selectedKargo}
                                onChange={setSelectedKargo}
                                isMulti
                                className="text-black"
                                classNamePrefix="rs"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                <FiUsers className="inline" /> Gönderen Firma
                            </label>
                            <Select
                                options={gonderenOptions}
                                value={selectedGonderen}
                                onChange={setSelectedGonderen}
                                isMulti
                                className="text-black"
                                classNamePrefix="rs"
                            />
                        </div>

                        <div className="lg:col-span-3">
                            <label className="mb-1 block text-sm font-medium">İrsaliye No (içerir)</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                placeholder="İrsaliye No ara..."
                                value={irsaliyeNoInput}
                                onChange={(e) => setIrsaliyeNoInput(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            onClick={filtrele}
                            className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-white hover:bg-pink-700"
                        >
                            <FiSearch /> Filtrele
                        </button>
                        <button
                            onClick={filtreleriTemizle}
                            disabled={!hasActiveFilters}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 ${hasActiveFilters
                                    ? 'bg-gray-700 text-white hover:bg-gray-800'
                                    : 'bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                                }`}
                        >
                            <FiRotateCcw /> Temizle
                        </button>
                    </div>
                </div>

                {/* Veri Tablosu */}
                {loading ? (
                    <div className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                        Yükleniyor…
                    </div>
                ) : filteredVeriler.length === 0 ? (
                    <div className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                        Filtreye uyan veri yok.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl bg-white shadow-md ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        {/* sabit yükseklik + iç scroll */}
                        <div className="max-h-[70vh] overflow-y-auto">
                            <table className="min-w-full text-sm sm:text-base">
                                {/* başlıklar yapışkan olsun diye class'ı thead'e taşıdık */}
                                <thead className="sticky top-0 z-10 bg-pink-200 text-gray-900 dark:bg-pink-700 dark:text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-center">Tarih</th>
                                        <th className="px-4 py-3 text-center">Kargo Firması</th>
                                        <th className="px-4 py-3 text-center">Gönderi No</th>
                                        <th className="px-4 py-3 text-center">Gönderen Firma</th>
                                        <th className="px-4 py-3 text-center">İrsaliye Adı</th>
                                        <th className="px-4 py-3 text-center">İrsaliye No</th>
                                        <th className="px-4 py-3 text-center">Odak Evrak No</th>
                                        <th className="px-4 py-3 text-center">Evrak Adedi</th>
                                        <th className="px-4 py-3 text-center">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVeriler.map((item, index) => (
                                        <tr
                                            key={index}
                                            className="border-t border-gray-200 hover:bg-pink-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
                                        >
                                            <td className="px-4 py-3 text-center">{tarihFormatla(item.tarih)}</td>
                                            <td className="px-4 py-3 text-center">{item.kargo_firmasi}</td>
                                            <td className="px-4 py-3 text-center">{item.gonderi_numarasi}</td>
                                            <td className="px-4 py-3 text-center">{item.gonderen_firma}</td>
                                            <td className="px-4 py-3 text-center">{item.irsaliye_adi}</td>
                                            <td
                                                className="px-4 py-3 text-center text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 cursor-pointer"
                                                onClick={() => modalAc('İrsaliye No', item.irsaliye_no)}
                                            >
                                                {kisalt(item.irsaliye_no)}
                                            </td>
                                            <td
                                                className="px-4 py-3 text-center text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 cursor-pointer"
                                                onClick={() => modalAc('Odak Evrak No', item.odak_evrak_no)}
                                            >
                                                {kisalt(item.odak_evrak_no)}
                                            </td>
                                            <td className="px-4 py-3 text-center">{item.evrak_adedi}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => duzenleModaliAc(item)}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-3 py-1 text-white hover:bg-yellow-600"
                                                >
                                                    <FiEdit2 /> Düzenle
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal - Uzun Bilgiler */}
                {modalGoster && (
                    <div className="fixed inset-0 z-50 grid place-items-center">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={modalKapat}
                            aria-hidden="true"
                        />
                        <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">{modalBaslik}</h2>
                                <button
                                    onClick={modalKapat}
                                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <FiX />
                                </button>
                            </div>
                            <pre className="max-h-[60vh] whitespace-pre-wrap break-words overflow-y-auto rounded-lg bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-100">
                                {modalIcerik}
                            </pre>
                            <div className="mt-4 text-right">
                                <button
                                    onClick={modalKapat}
                                    className="rounded-lg bg-pink-600 px-4 py-2 text-white hover:bg-pink-700"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal - Excel Aktarımı */}
                {excelModalAcik && (
                    <div className="fixed inset-0 z-50 grid place-items-center">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setExcelModalAcik(false)}
                            aria-hidden="true"
                        />
                        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Excel Aktarımı</h2>
                                <button
                                    onClick={() => setExcelModalAcik(false)}
                                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <FiX />
                                </button>
                            </div>
                            <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
                                Hangi verileri Excel'e aktarmak istersiniz?
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={() => {
                                        excelAktarVeri(filteredVeriler, 'filtreli');
                                        setExcelModalAcik(false);
                                    }}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    <FiDownload /> Filtreli Aktar
                                </button>
                                <button
                                    onClick={tumVeriyiExceleAktar}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                                >
                                    <FiDownload /> Tümünü Aktar
                                </button>
                            </div>
                            <div className="mt-4 text-right">
                                <button
                                    onClick={() => setExcelModalAcik(false)}
                                    className="text-sm text-gray-600 hover:underline dark:text-gray-300"
                                >
                                    Vazgeç
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Modal - Düzenleme */}
                {duzenleModalAcik && duzenlenenVeri && (
                    <div className="fixed inset-0 z-50 grid place-items-center">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setDuzenleModalAcik(false)}
                            aria-hidden="true"
                        />
                        <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Kargo Bilgisi Düzenle</h2>
                                <button
                                    onClick={() => setDuzenleModalAcik(false)}
                                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <FiX />
                                </button>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Kargo Firması</label>
                                    <input
                                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        name="kargo_firmasi"
                                        value={duzenlenenVeri.kargo_firmasi || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="Kargo Firması"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Gönderi No</label>
                                    <input
                                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        name="gonderi_numarasi"
                                        value={duzenlenenVeri.gonderi_numarasi || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="Gönderi No"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Gönderen Firma</label>
                                    <input
                                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        name="gonderen_firma"
                                        value={duzenlenenVeri.gonderen_firma || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="Gönderen Firma"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">İrsaliye Adı</label>
                                    <input
                                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        name="irsaliye_adi"
                                        value={duzenlenenVeri.irsaliye_adi || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="İrsaliye Adı"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium">İrsaliye No</label>
                                    <textarea
                                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        name="irsaliye_no"
                                        rows="2"
                                        value={duzenlenenVeri.irsaliye_no || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="İrsaliye No"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium">Odak Evrak No</label>
                                    <textarea
                                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        name="odak_evrak_no"
                                        rows="2"
                                        value={duzenlenenVeri.odak_evrak_no || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="Odak Evrak No"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Evrak Adedi</label>
                                    <input
                                        type="number"
                                        name="evrak_adedi"
                                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        placeholder="Evrak Adedi"
                                        value={duzenlenenVeri.evrak_adedi || ''}
                                        onChange={handleDuzenleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Ekstra Evrak Soru */}
                            {ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                                <div className="mt-4 rounded-lg border border-yellow-400 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/30">
                                    <p className="mb-2 font-semibold text-yellow-800 dark:text-yellow-200">
                                        Ekstra evrak eklemek istiyor musunuz?
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setEkstraEvrakEklendi(true)}
                                            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                                        >
                                            Evet
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEkstraEvrakSoruAcik(false)}
                                            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                                        >
                                            Hayır
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Ekstra Evrak Sayısı */}
                            {ekstraEvrakEklendi && (
                                <div className="mt-4">
                                    <label className="mb-1 block text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                        Ekstra Evrak Sayısı
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-black outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        placeholder="Ekstra evrak sayısı"
                                        value={ekstraEvrakSayisi}
                                        onChange={(e) => {
                                            setEkstraEvrakSayisi(e.target.value);
                                            handleDuzenleInputChange({
                                                target: { name: 'ekstra', value: e.target.value },
                                            });
                                        }}
                                    />
                                </div>
                            )}

                            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
                                <div className="flex gap-2">
                                    <button
                                        onClick={duzenleVeriyiGuncelle}
                                        className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                                    >
                                        Güncelle
                                    </button>
                                    <button
                                        onClick={duzenleVeriyiSil}
                                        className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                                    >
                                        Sil
                                    </button>
                                </div>
                                <button
                                    onClick={() => setDuzenleModalAcik(false)}
                                    className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                                >
                                    Vazgeç
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default TumKargoBilgileri;
