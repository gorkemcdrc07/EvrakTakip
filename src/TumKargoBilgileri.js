import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Select from 'react-select';

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
            const { data, error } = await supabase
                .from('kargo_bilgileri')
                .select('*')
                .order('id', { ascending: false })
                .limit(10000);

            if (error) {
                console.error('Veri çekme hatası:', error);
            } else {
                setVeriler(data);

                const yıllar = [...new Set(data.map(v => getYil(v.tarih)))].filter(Boolean).sort((a, b) => b - a);
                setYilSecenekleri(yıllar);

                const irsaliyeSet = [...new Set(data.map(v => v.irsaliye_adi).filter(Boolean))];
                const kargoSet = [...new Set(data.map(v => v.kargo_firmasi).filter(Boolean))];
                const gonderenSet = [...new Set(data.map(v => v.gonderen_firma).filter(Boolean))];

                setIrsaliyeOptions(irsaliyeSet.map(v => ({ label: v, value: v })));
                setKargoOptions(kargoSet.map(v => ({ label: v, value: v })));
                setGonderenOptions(gonderenSet.map(v => ({ label: v, value: v })));
            }

            setLoading(false);
        };

        veriGetir();
    }, []);

    useEffect(() => {
        if (!loading) {
            filtrele();
        }
    }, [veriler, secilenYil, tarihBaslangic, tarihBitis, selectedIrsaliye, selectedKargo, selectedGonderen]);

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
        filtrelenmis = filtrelenmis.filter(v => getYil(v.tarih) === secilenYil);
    }

    if (tarihBaslangic) {
        filtrelenmis = filtrelenmis.filter(v => new Date(v.tarih) >= new Date(tarihBaslangic));
    }

    if (tarihBitis) {
        filtrelenmis = filtrelenmis.filter(v => new Date(v.tarih) <= new Date(tarihBitis));
    }

    if (selectedIrsaliye.length > 0) {
        const secilen = selectedIrsaliye.map(o => o.value.toLowerCase());
        filtrelenmis = filtrelenmis.filter(v => secilen.includes(v.irsaliye_adi?.toLowerCase()));
    }

    if (selectedKargo.length > 0) {
        const secilen = selectedKargo.map(o => o.value.toLowerCase());
        filtrelenmis = filtrelenmis.filter(v => secilen.includes(v.kargo_firmasi?.toLowerCase()));
    }

    if (selectedGonderen.length > 0) {
        const secilen = selectedGonderen.map(o => o.value.toLowerCase());
        filtrelenmis = filtrelenmis.filter(v => secilen.includes(v.gonderen_firma?.toLowerCase()));
    }

    if (irsaliyeNoInput.trim() !== '') {
        const aranan = irsaliyeNoInput.trim().toLowerCase();
        filtrelenmis = filtrelenmis.filter(v => v.irsaliye_no?.toLowerCase().includes(aranan));
    }

    setFilteredVeriler(filtrelenmis);
};


    const excelAktarVeri = (veri, tur) => {
        const aktarilacak = veri.map(item => ({
            Tarih: tarihFormatla(item.tarih),
            'Kargo Firması': item.kargo_firmasi,
            'Gönderi No': item.gonderi_numarasi,
            'Gönderen Firma': item.gonderen_firma,
            'İrsaliye Adı': item.irsaliye_adi,
            'İrsaliye No': item.irsaliye_no,
            'Odak Evrak No': item.odak_evrak_no,
            'Evrak Adedi': item.evrak_adedi
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
            const { data, error } = await supabase
                .from('kargo_bilgileri')
                .select('*')
                .range(from, to);

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
        setEkstraEvrakSoruAcik(true); // Soru sorulsun
        setEkstraEvrakEklendi(false); // İlk başta evet/hayır seçilmedi
    };


    const handleDuzenleInputChange = (e) => {
        const { name, value } = e.target;

        setDuzenlenenVeri(prev => {
            const yeniVeri = { ...prev, [name]: value };

            // İrsaliye ve odak evrak no'lara göre adet hesapla
            const irsaliyeAdet = yeniVeri.irsaliye_no?.split('-').filter(s => s.trim() !== '').length || 0;
            const odakAdet = yeniVeri.odak_evrak_no?.split('-').filter(s => s.trim() !== '').length || 0;
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
            odak_evrak_no
        } = duzenlenenVeri;

        const irsaliyeAdet = irsaliye_no?.split('-').filter(s => s.trim() !== '').length || 0;
        const odakAdet = odak_evrak_no?.split('-').filter(s => s.trim() !== '').length || 0;
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
                evrak_adedi
            })
            .eq('id', id);

        if (!error) {
            alert('Başarıyla güncellendi.');
            setVeriler(prev =>
                prev.map(v => v.id === id ? { ...duzenlenenVeri, evrak_adedi } : v)
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
                setVeriler(prev => prev.filter(v => v.id !== duzenlenenVeri.id));
                setDuzenleModalAcik(false);
            } else {
                alert('Silme işlemi başarısız!');
            }
        }
    };

    return (
        <Layout>
            <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
                <h1 className="text-2xl font-bold mb-6 text-pink-600 dark:text-pink-400">📋 Tüm Kargo Bilgileri</h1>

                {/* Filtreleme Alanları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block mb-1">Yıl</label>
                        <select
                            className="w-full p-2 rounded text-black"
                            value={secilenYil}
                            onChange={(e) => setSecilenYil(e.target.value)}
                        >
                            <option value="">Tüm Yıllar</option>
                            {yilSecenekleri.map((yil) => (
                                <option key={yil} value={yil}>{yil}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Tarih Başlangıç</label>
                        <input
                            type="number"
                            min="0"
                            className="p-2 rounded text-black w-full"
                            placeholder="Ekstra evrak sayısı"
                            value={ekstraEvrakSayisi}
                            onChange={(e) => {
                                const value = e.target.value;
                                setEkstraEvrakSayisi(value);

                                setDuzenlenenVeri(prev => {
                                    const irsaliyeAdet = prev.irsaliye_no?.split('-').filter(s => s.trim() !== '').length || 0;
                                    const odakAdet = prev.odak_evrak_no?.split('-').filter(s => s.trim() !== '').length || 0;
                                    const ekstra = parseInt(value) || 0;

                                    return {
                                        ...prev,
                                        evrak_adedi: irsaliyeAdet + odakAdet + ekstra
                                    };
                                });
                            }}
                        />



                    </div>
                    <div>
                        <label className="block mb-1">Tarih Bitiş</label>
                        <input type="date" className="w-full p-2 rounded text-black" value={tarihBitis} onChange={e => setTarihBitis(e.target.value)} />
                    </div>
                    <div>
                        <label className="block mb-1">İrsaliye Adı</label>
                        <Select options={irsaliyeOptions} value={selectedIrsaliye} onChange={setSelectedIrsaliye} isMulti className="text-black" />
                    </div>
                    <div>
                        <label className="block mb-1">Kargo Firması</label>
                        <Select options={kargoOptions} value={selectedKargo} onChange={setSelectedKargo} isMulti className="text-black" />
                    </div>
                    <div>
                        <label className="block mb-1">Gönderen Firma</label>
                        <Select options={gonderenOptions} value={selectedGonderen} onChange={setSelectedGonderen} isMulti className="text-black" />
                    </div>
                    <div>
                        <label className="block mb-1">İrsaliye No (içerir)</label>
                        <input
                            type="text"
                            className="w-full p-2 rounded text-black"
                            placeholder="İrsaliye No ara..."
                            value={irsaliyeNoInput}
                            onChange={e => setIrsaliyeNoInput(e.target.value)}
                        />
                    </div>

                </div>

                {/* Filtreleme ve Excel Butonları */}
                <div className="flex gap-2 mb-4">
                    <button onClick={filtrele} className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700">Filtrele</button>
                    <button onClick={() => setExcelModalAcik(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Excel’e Aktar</button>
                </div>

                {/* Veri Tablosu */}
                {loading ? (
                    <p>Yükleniyor...</p>
                ) : filteredVeriler.length === 0 ? (
                    <p>Filtreye uyan veri yok.</p>
                ) : (
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-md">
                        <table className="min-w-full text-sm sm:text-base">
                            <thead>
                                <tr className="bg-pink-200 dark:bg-pink-700">
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
                                    <tr key={index} className="border-t border-gray-300 dark:border-gray-700">
                                        <td className="px-4 py-3 text-center">{tarihFormatla(item.tarih)}</td>
                                        <td className="px-4 py-3 text-center">{item.kargo_firmasi}</td>
                                        <td className="px-4 py-3 text-center">{item.gonderi_numarasi}</td>
                                        <td className="px-4 py-3 text-center">{item.gonderen_firma}</td>
                                        <td className="px-4 py-3 text-center">{item.irsaliye_adi}</td>
                                        <td className="px-4 py-3 text-center text-blue-600 underline cursor-pointer" onClick={() => modalAc('İrsaliye No', item.irsaliye_no)}>{kisalt(item.irsaliye_no)}</td>
                                        <td className="px-4 py-3 text-center text-blue-600 underline cursor-pointer" onClick={() => modalAc('Odak Evrak No', item.odak_evrak_no)}>{kisalt(item.odak_evrak_no)}</td>
                                        <td className="px-4 py-3 text-center">{item.evrak_adedi}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => duzenleModaliAc(item)}
                                                className="px-2 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                            >
                                                Düzenle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal - Uzun Bilgiler */}
                {modalGoster && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full">
                            <h2 className="text-lg font-semibold mb-4">{modalBaslik}</h2>
                            <pre className="whitespace-pre-wrap break-words max-h-96 overflow-y-auto text-sm">{modalIcerik}</pre>
                            <div className="mt-4 text-right">
                                <button onClick={modalKapat} className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700">Kapat</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal - Excel Aktarımı */}
                {excelModalAcik && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                            <h2 className="text-lg font-semibold mb-4">Excel Aktarımı</h2>
                            <p className="mb-4">Hangi verileri Excel'e aktarmak istersiniz?</p>
                            <div className="flex justify-between gap-4">
                                <button
                                    onClick={() => {
                                        excelAktarVeri(filteredVeriler, 'filtreli');
                                        setExcelModalAcik(false);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Filtreli Aktar
                                </button>
                                <button
                                    onClick={tumVeriyiExceleAktar}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Tümünü Aktar
                                </button>
                            </div>
                            <div className="mt-4 text-right">
                                <button onClick={() => setExcelModalAcik(false)} className="px-3 py-1 text-sm text-gray-600 hover:underline">
                                    Vazgeç
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal - Düzenleme */}
                {duzenleModalAcik && duzenlenenVeri && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-xl w-full">
                            <h2 className="text-lg font-semibold mb-4">Kargo Bilgisi Düzenle</h2>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white">Kargo Firması</label>
                                    <input
                                        className="p-2 rounded text-black w-full"
                                        name="kargo_firmasi"
                                        value={duzenlenenVeri.kargo_firmasi || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="Kargo Firması"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white">Gönderi No</label>
                                    <input
                                        className="p-2 rounded text-black w-full"
                                        name="gonderi_numarasi"
                                        value={duzenlenenVeri.gonderi_numarasi || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="Gönderi No"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white">Gönderen Firma</label>
                                    <input
                                        className="p-2 rounded text-black w-full"
                                        name="gonderen_firma"
                                        value={duzenlenenVeri.gonderen_firma || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="Gönderen Firma"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white">İrsaliye Adı</label>
                                    <input
                                        className="p-2 rounded text-black w-full"
                                        name="irsaliye_adi"
                                        value={duzenlenenVeri.irsaliye_adi || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="İrsaliye Adı"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white">İrsaliye No</label>
                                    <textarea
                                        className="p-2 rounded text-black w-full"
                                        name="irsaliye_no"
                                        rows="2"
                                        value={duzenlenenVeri.irsaliye_no || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="İrsaliye No"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white">Odak Evrak No</label>
                                    <textarea
                                        className="p-2 rounded text-black w-full"
                                        name="odak_evrak_no"
                                        rows="2"
                                        value={duzenlenenVeri.odak_evrak_no || ''}
                                        onChange={handleDuzenleInputChange}
                                        placeholder="Odak Evrak No"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-white">Evrak Adedi</label>
                                    <input
                                        type="number"
                                        name="evrak_adedi"
                                        className="p-2 rounded text-black w-full"
                                        placeholder="Evrak Adedi"
                                        value={duzenlenenVeri.evrak_adedi || ''}
                                        onChange={handleDuzenleInputChange}
                                    />
                                </div>

                                {/* Ekstra Evrak Soru */}
                                {ekstraEvrakSoruAcik && !ekstraEvrakEklendi && (
                                    <div className="bg-yellow-100 border border-yellow-400 p-4 rounded">
                                        <p className="mb-2 font-semibold text-yellow-800">Ekstra evrak eklemek istiyor musunuz?</p>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setEkstraEvrakEklendi(true)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                            >
                                                Evet
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEkstraEvrakSoruAcik(false)}
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                            >
                                                Hayır
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Ekstra Evrak Sayısı */}
                                {ekstraEvrakEklendi && (
                                    <div>
                                        <label className="block mb-1 font-semibold text-yellow-800">Ekstra Evrak Sayısı</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="p-2 rounded text-black w-full"
                                            placeholder="Ekstra evrak sayısı"
                                            value={ekstraEvrakSayisi}
                                            onChange={(e) => {
                                                setEkstraEvrakSayisi(e.target.value);
                                                handleDuzenleInputChange({ target: { name: 'ekstra', value: e.target.value } });
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-between">
                                <button
                                    onClick={duzenleVeriyiGuncelle}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Güncelle
                                </button>
                                <button
                                    onClick={duzenleVeriyiSil}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Sil
                                </button>
                                <button
                                    onClick={() => setDuzenleModalAcik(false)}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
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
