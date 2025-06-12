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
                .order('id', { ascending: false }) // ✅ Son girilen en üstte
                .limit(10000);

            if (error) {
                console.error('Veri çekme hatası:', error);
            } else {
                setVeriler(data); // ❌ yeniden sort etmene gerek kalmaz

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
            const { data, error, count } = await supabase
                .from('kargo_bilgileri')
                .select('*', { count: 'exact' })
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


    return (
        <Layout>
            <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
                <h1 className="text-2xl font-bold mb-6 text-pink-600 dark:text-pink-400">📋 Tüm Kargo Bilgileri</h1>

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
                        <input type="date" className="w-full p-2 rounded text-black" value={tarihBaslangic} onChange={e => setTarihBaslangic(e.target.value)} />
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
                </div>

                <div className="flex gap-2 mb-4">
                    <button onClick={filtrele} className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700">Filtrele</button>
                    <button onClick={() => setExcelModalAcik(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Excel’e Aktar</button>
                </div>

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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

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
            </div>
        </Layout>
    );
}

export default TumKargoBilgileri;
