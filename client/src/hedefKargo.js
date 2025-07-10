import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';

function HedefKargo() {
    const [kargoData, setKargoData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [adding, setAdding] = useState(false);

    const [filters, setFilters] = useState({
        tarih: [],
        gonderici: [],
        tedarikci: [],
        teslim_edilen_kisi: [],
        teslim_tarihi: []
    });

    const toggleFilter = (column, value) => {
        setFilters((prev) => {
            const currentValues = new Set(prev[column]);
            if (currentValues.has(value)) {
                currentValues.delete(value);
            } else {
                currentValues.add(value);
            }
            return { ...prev, [column]: Array.from(currentValues) };
        });
    };

    const filteredData = kargoData.filter((item) =>
        Object.entries(filters).every(([field, selected]) =>
            selected.length === 0 || selected.includes(item[field])
        )
    );

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
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('hedef_kargo')
            .select('*')
            .order('tarih', { ascending: false });

        if (!error) setKargoData(data);
        else console.error('Veri alınamadı:', error);

        setLoading(false);
    };

    const confirmDelete = (item) => setDeletingItem(item);

    const handleDeleteConfirmed = async () => {
        if (!deletingItem) return;
        const { error } = await supabase.from('hedef_kargo').delete().eq('id', deletingItem.id);
        if (!error) {
            setKargoData(prev => prev.filter(item => item.id !== deletingItem.id));
            setDeletingItem(null);
        } else {
            console.error('Silme hatası:', error);
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setEditForm({
            tarih: item.tarih || '',
            gonderici: item.gonderici || '',
            tedarikci: item.tedarikci || '',
            teslim_edilen_kisi: item.teslim_edilen_kisi || '',
            teslim_tarihi: item.teslim_tarihi || ''
        });
    };

    const handleFormChange = useCallback((e) => {
        setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleAddFormChange = useCallback((e) => {
        setAddForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleSave = async () => {
        const { error } = await supabase
            .from('hedef_kargo')
            .update(editForm)
            .eq('id', editingItem.id);

        if (!error) {
            setKargoData(prev =>
                prev.map(item =>
                    item.id === editingItem.id ? { ...item, ...editForm } : item
                )
            );
            setEditingItem(null);
        } else {
            console.error('Güncelleme hatası:', error);
        }
    };

    const handleAdd = async () => {
        const { data, error } = await supabase
            .from('hedef_kargo')
            .insert([addForm])
            .select();

        if (!error && data?.length > 0) {
            setKargoData(prev => [data[0], ...prev]);
            setAdding(false);
            setAddForm({
                tarih: '',
                gonderici: '',
                tedarikci: '',
                teslim_edilen_kisi: '',
                teslim_tarihi: ''
            });
        } else {
            console.error('Ekleme hatası:', error);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="p-6 bg-gradient-to-br from-white to-pink-50 dark:from-gray-900 dark:to-gray-800 min-h-screen text-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">🎯 HEDEF KARGO</h1>
                <button
                    onClick={() => setAdding(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                    ➕ Veri Ekle
                </button>
            </div>

            {/* 🔍 FİLTRE PANELİ */}
            {!editingItem && !adding && !loading && (
                <div className="mb-6 p-4 bg-white dark:bg-gray-700 shadow rounded-lg">
                    <h2 className="text-lg font-semibold mb-3">🔍 Detaylı Filtre</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {["tarih", "gonderici", "tedarikci", "teslim_edilen_kisi", "teslim_tarihi"].map((field) => {
                            const uniqueValues = [...new Set(kargoData.map(item => item[field]))];
                            return (
                                <div key={field}>
                                    <label className="block mb-1 text-sm font-medium">{field.replaceAll("_", " ").toUpperCase()}</label>
                                    <input
                                        type="text"
                                        placeholder="Metinle ara..."
                                        onChange={(e) => {
                                            const input = e.target.value.toLowerCase();
                                            const matched = uniqueValues.filter(val =>
                                                (val || "").toLowerCase().includes(input)
                                            );
                                            setFilters(prev => ({
                                                ...prev,
                                                [field]: input === "" ? [] : matched
                                            }));
                                        }}
                                        className="w-full px-3 py-2 rounded border dark:bg-gray-800"
                                    />
                                    <div className="max-h-32 overflow-auto mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded border">
                                        {uniqueValues.map((val) => (
                                            <label key={val} className="block text-sm mb-1">
                                                <input
                                                    type="checkbox"
                                                    checked={filters[field].includes(val)}
                                                    onChange={() => toggleFilter(field, val)}
                                                    className="mr-2"
                                                />
                                                {field.includes("tarih") ? formatDate(val) : val || "(boş)"}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 text-right">
                        <button
                            onClick={() =>
                                setFilters({
                                    tarih: [],
                                    gonderici: [],
                                    tedarikci: [],
                                    teslim_edilen_kisi: [],
                                    teslim_tarihi: []
                                })
                            }
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                        >
                            Filtreleri Temizle
                        </button>
                    </div>
                </div>
            )}

            {/* TABLO */}
            {loading ? (
                <p className="text-lg">Yükleniyor...</p>
            ) : (!editingItem && !adding && (
                <div className="overflow-x-auto shadow-xl rounded-xl">
                    <table className="min-w-full text-sm md:text-base bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                        <thead className="bg-pink-100 dark:bg-gray-700 text-left">
                            <tr>
                                <th className="px-4 py-3 border-b">TARİH</th>
                                <th className="px-4 py-3 border-b">GÖNDERİCİ</th>
                                <th className="px-4 py-3 border-b">TEDARİKÇİ</th>
                                <th className="px-4 py-3 border-b">TESLİM EDİLEN KİŞİ</th>
                                <th className="px-4 py-3 border-b">TESLİM TARİHİ</th>
                                <th className="px-4 py-3 border-b text-center">İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item, index) => (
                                <tr
                                    key={item.id}
                                    className={`${index % 2 === 0
                                        ? 'bg-white dark:bg-gray-800'
                                        : 'bg-gray-50 dark:bg-gray-700'
                                        } hover:bg-pink-50 dark:hover:bg-gray-600 transition`}
                                >
                                    <td className="px-4 py-3 border-b">{formatDate(item.tarih)}</td>
                                    <td className="px-4 py-3 border-b">{item.gonderici}</td>
                                    <td className="px-4 py-3 border-b">{item.tedarikci}</td>
                                    <td className="px-4 py-3 border-b">{item.teslim_edilen_kisi}</td>
                                    <td className="px-4 py-3 border-b">{formatDate(item.teslim_tarihi)}</td>
                                    <td className="px-4 py-3 border-b flex gap-2 justify-center flex-wrap">
                                        <button
                                            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded"
                                            onClick={() => handleEdit(item)}
                                        >
                                            Düzenle
                                        </button>
                                        <button
                                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
                                            onClick={() => confirmDelete(item)}
                                        >
                                            Sil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {/* MODALLAR */}
            {editingItem && (
                <EditModal
                    editForm={editForm}
                    handleFormChange={handleFormChange}
                    handleSave={handleSave}
                    onCancel={() => setEditingItem(null)}
                />
            )}

            {adding && (
                <AddModal
                    addForm={addForm}
                    handleAddFormChange={handleAddFormChange}
                    handleAdd={handleAdd}
                    onCancel={() => setAdding(false)}
                />
            )}

            {deletingItem && (
                <DeleteModal
                    onCancel={() => setDeletingItem(null)}
                    onConfirm={handleDeleteConfirmed}
                />
            )}
        </div>
    );
}

// MODAL BİLEŞENLERİ

const EditModal = ({ editForm, handleFormChange, handleSave, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-2xl shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">🛠 Kaydı Düzenle</h2>
            <div className="grid grid-cols-1 gap-5">
                {Object.keys(editForm).map((field) => (
                    <div key={field}>
                        <label className="block mb-1 font-medium">{field.replaceAll('_', ' ').toUpperCase()}</label>
                        <input
                            type={field.includes('tarih') ? 'date' : 'text'}
                            name={field}
                            value={editForm[field]}
                            onChange={handleFormChange}
                            className="w-full px-4 py-3 rounded-lg border dark:bg-gray-700"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-3 mt-8">
                <button onClick={onCancel} className="px-5 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg">İptal</button>
                <button onClick={handleSave} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Kaydet</button>
            </div>
        </div>
    </div>
);

const AddModal = ({ addForm, handleAddFormChange, handleAdd, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-2xl shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">📝 Yeni Kayıt Ekle</h2>
            <div className="grid grid-cols-1 gap-5">
                {Object.keys(addForm).map((field) => (
                    <div key={field}>
                        <label className="block mb-1 font-medium">{field.replaceAll('_', ' ').toUpperCase()}</label>
                        <input
                            type={field.includes('tarih') ? 'date' : 'text'}
                            name={field}
                            value={addForm[field]}
                            onChange={handleAddFormChange}
                            className="w-full px-4 py-3 rounded-lg border dark:bg-gray-700"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-3 mt-8">
                <button onClick={onCancel} className="px-5 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg">İptal</button>
                <button onClick={handleAdd} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Kaydet</button>
            </div>
        </div>
    </div>
);

const DeleteModal = ({ onCancel, onConfirm }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">⚠️ Emin misiniz?</h2>
            <p className="mb-6">Bu kaydı silmek istediğinizden emin misiniz?</p>
            <div className="flex justify-end gap-3">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded">İptal</button>
                <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded">Evet, Sil</button>
            </div>
        </div>
    </div>
);

export default HedefKargo;
