import React, { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from 'xlsx';

const formatTR = (dateStr, time = false) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (time) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return new Intl.DateTimeFormat('tr-TR', options).format(date);
};

const LargeButton = ({ children, primary = false, ...props }) => (
    <button {...props} className={`px-10 py-5 rounded-2xl font-black text-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${primary ? 'bg-indigo-600 text-white shadow-2xl hover:bg-indigo-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
        {children}
    </button>
);

const STATUS_MAP = {
    odenecek: { label: "Ödenecek", color: "bg-amber-500", light: "bg-amber-500/10 text-amber-400", icon: "⏳" },
    odendi: { label: "Ödendi", color: "bg-emerald-500", light: "bg-emerald-500/10 text-emerald-400", icon: "✅" },
    bulunamadi: { label: "Bulunamadı", color: "bg-rose-500", light: "bg-rose-500/10 text-rose-400", icon: "❌" }
};

export default function Tahakkuk() {
    const adSoyad = localStorage.getItem("ad") ?? "Kullanıcı";
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPaymentDay, setFilterPaymentDay] = useState("all"); // YENİ
    const [selectedIds, setSelectedIds] = useState([]); // YENİ
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, isBulk: false }); // GÜNCELLENDİ

    const paymentOptions = useMemo(() => {
        const options = [];
        const targets = [2, 5];
        targets.forEach(targetDay => {
            for (let i = 0; i < 3; i++) {
                const d = new Date();
                d.setHours(12, 0, 0, 0);
                const todayIdx = d.getDay();
                let diff = targetDay - todayIdx;
                if (diff <= 0) diff += 7;
                d.setDate(d.getDate() + diff + (i * 7));
                const val = d.toISOString().split('T')[0];
                const labelPrefix = i === 0 ? "En Yakın" : i === 1 ? "Gelecek" : "Sonraki";
                options.push({ v: val, l: `${labelPrefix} ${targetDay === 2 ? "Salı" : "Cuma"} (${formatTR(val)})`, dateObj: new Date(d) });
            }
        });
        return options.sort((a, b) => a.dateObj - b.dateObj);
    }, []);

    const [form, setForm] = useState({
        tedarikci_firma: "",
        odeme_gunu: paymentOptions[0]?.v || "",
        tarih: new Date().toISOString().split('T')[0],
        not: ""
    });

    useEffect(() => {
        if (open && !editingId) {
            setForm(prev => ({ ...prev, odeme_gunu: paymentOptions[0]?.v }));
        }
    }, [open, editingId, paymentOptions]);

    const fetchRows = async () => {
        const { data } = await supabase.from("tahakkuk").select("*").order("olusturulma_tarihi", { ascending: false });
        if (data) setRows(data);
    };

    useEffect(() => { fetchRows(); }, []);

    // TOPLU İŞLEM FONKSİYONLARI
    const handleBulkStatusUpdate = async (newStatus) => {
        const now = new Date().toISOString();
        const islemNotu = `TOPLU ${STATUS_MAP[newStatus].label.toUpperCase()} YAPILDI`;
        const { error } = await supabase.from("tahakkuk").update({
            durum: newStatus,
            guncelleyen_kullanici: adSoyad,
            guncelleme_tarihi: now,
            son_islem: islemNotu
        }).in("id", selectedIds);
        if (!error) { fetchRows(); setSelectedIds([]); }
    };

    const executeDelete = async () => {
        const targetIds = confirmDelete.isBulk ? selectedIds : [confirmDelete.id];
        const { error } = await supabase.from("tahakkuk").delete().in("id", targetIds);
        if (!error) { fetchRows(); setSelectedIds([]); setConfirmDelete({ open: false, id: null, isBulk: false }); }
    };

    const exportToExcel = () => {
        const excelData = filteredRows.map(r => ({
            "FİRMA": r.tedarikci_firma.toUpperCase(),
            "NOT / AÇIKLAMA": (r.aciklama || "-").toUpperCase(),
            "ÖDEME GÜNÜ": formatTR(r.odeme_gunu),
            "DURUM": STATUS_MAP[r.durum].label.toUpperCase()
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tahakkuk Listesi");
        XLSX.writeFile(workbook, `Tahakkuk_Listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const updateStatus = async (id, newStatus) => {
        const now = new Date().toISOString();
        const islemNotu = STATUS_MAP[newStatus].label.toUpperCase() + " YAPILDI";
        const { error } = await supabase.from("tahakkuk").update({
            durum: newStatus,
            guncelleyen_kullanici: adSoyad,
            guncelleme_tarihi: now,
            son_islem: islemNotu
        }).eq("id", id);
        if (!error) {
            fetchRows();
            if (selectedRow?.id === id) setSelectedRow({ ...selectedRow, durum: newStatus, guncelleyen_kullanici: adSoyad, guncelleme_tarihi: now, son_islem: islemNotu });
        }
    };

    const handleSave = async () => {
        if (!form.tedarikci_firma) return alert("Firma adı giriniz!");
        setSaving(true);
        const payload = {
            tedarikci_firma: form.tedarikci_firma,
            tarih: form.tarih,
            odeme_gunu: form.odeme_gunu,
            aciklama: form.not,
            guncelleyen_kullanici: adSoyad,
            guncelleme_tarihi: new Date().toISOString(),
            son_islem: editingId ? "KAYIT DÜZENLENDİ" : "YENİ KAYIT AÇILDI"
        };
        let error;
        if (editingId) {
            const res = await supabase.from("tahakkuk").update(payload).eq("id", editingId);
            error = res.error;
        } else {
            const res = await supabase.from("tahakkuk").insert([{ ...payload, durum: "odenecek", olusturan_kullanici: adSoyad }]);
            error = res.error;
        }
        if (!error) {
            setOpen(false);
            setEditingId(null);
            setForm({ tedarikci_firma: "", odeme_gunu: paymentOptions[0].v, tarih: new Date().toISOString().split('T')[0], not: "" });
            fetchRows();
        }
        setSaving(false);
    };

    const openEdit = (e, r) => {
        e.stopPropagation();
        setEditingId(r.id);
        setForm({ tedarikci_firma: r.tedarikci_firma, odeme_gunu: r.odeme_gunu, tarih: r.tarih, not: r.aciklama });
        setOpen(true);
    };

    const filteredRows = rows.filter(r => {
        const matchesSearch = (r.tedarikci_firma + r.aciklama).toLowerCase().includes(q.toLowerCase());
        const matchesStatus = filterStatus === "all" || r.durum === filterStatus;
        const matchesPaymentDay = filterPaymentDay === "all" || r.odeme_gunu === filterPaymentDay;
        return matchesSearch && matchesStatus && matchesPaymentDay;
    });

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <Layout>
            <div className="min-h-screen bg-black text-slate-100 p-10 font-sans w-full">

                {/* TOPLU İŞLEM BARI */}
                <AnimatePresence>
                    {selectedIds.length > 0 && (
                        <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-0 left-0 right-0 z-[300] bg-indigo-600 p-6 flex justify-between items-center shadow-2xl">
                            <div className="flex items-center gap-8 pl-10">
                                <span className="text-3xl font-black text-white">{selectedIds.length} KAYIT SEÇİLDİ</span>
                                <div className="flex gap-2">
                                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                                        <button key={key} onClick={() => handleBulkStatusUpdate(key)} className="px-6 py-2 bg-white/20 hover:bg-white/40 rounded-xl font-bold text-sm uppercase transition-all">
                                            {val.icon} {val.label} YAP
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-4 pr-10">
                                <button onClick={() => setConfirmDelete({ open: true, id: null, isBulk: true })} className="px-8 py-3 bg-rose-500 hover:bg-rose-400 rounded-xl font-black text-white">🗑️ TOPLU SİL</button>
                                <button onClick={() => setSelectedIds([])} className="px-8 py-3 bg-black/20 text-white font-bold rounded-xl">İPTAL</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="w-full mb-12 flex justify-between items-center border-b border-slate-900 pb-8">
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic">Tahakkuk <span className="text-indigo-600">Paneli</span></h1>
                        <p className="text-2xl text-slate-500 font-bold uppercase mt-2">Kullanıcı: {adSoyad}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <select
                            className="bg-slate-900 border-2 border-slate-800 text-white p-5 rounded-2xl font-bold text-lg focus:border-indigo-600 outline-none"
                            value={filterPaymentDay}
                            onChange={(e) => setFilterPaymentDay(e.target.value)}
                        >
                            <option value="all">TÜM ÖDEME GÜNLERİ</option>
                            {paymentOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <button onClick={exportToExcel} className="px-8 py-5 rounded-2xl font-black text-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-95 flex items-center gap-3 shadow-lg">📊 EXCEL</button>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ARA..." className="w-[300px] px-8 py-5 rounded-2xl bg-slate-900 border-2 border-slate-800 text-2xl font-black text-indigo-500 outline-none focus:border-indigo-600 transition-all" />
                        <LargeButton primary onClick={() => { setEditingId(null); setOpen(true); }}>＋ YENİ KAYIT</LargeButton>
                    </div>
                </header>

                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    <button onClick={() => setFilterStatus("all")} className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${filterStatus === "all" ? "bg-white text-black" : "bg-slate-900 text-slate-500 hover:text-slate-300"}`}>TÜMÜ</button>
                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <button key={key} onClick={() => setFilterStatus(key)} className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${filterStatus === key ? val.color + " text-white" : "bg-slate-900 text-slate-500 hover:text-slate-300"}`}>
                            {val.label.toUpperCase()}
                        </button>
                    ))}
                    <button onClick={() => setSelectedIds(selectedIds.length === filteredRows.length ? [] : filteredRows.map(r => r.id))} className="ml-auto px-6 py-4 rounded-xl border border-slate-800 text-slate-500 font-bold hover:bg-slate-900 transition-all">
                        {selectedIds.length === filteredRows.length ? "SEÇİMİ SIFIRLA" : "LİSTEYİ SEÇ"}
                    </button>
                </div>

                <div className="w-full space-y-6">
                    {filteredRows.map((r) => (
                        <div key={r.id} className={`w-full rounded-[3.5rem] border p-10 flex items-center justify-between gap-8 transition-all relative ${selectedIds.includes(r.id) ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900'}`}>

                            {/* CHECKBOX */}
                            <div className="shrink-0">
                                <button
                                    onClick={() => toggleSelect(r.id)}
                                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${selectedIds.includes(r.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-700 bg-black/40'}`}
                                >
                                    {selectedIds.includes(r.id) && <span className="text-white text-2xl font-black">✓</span>}
                                </button>
                            </div>

                            <div className="flex-1 min-w-[200px] max-w-[25%] overflow-hidden cursor-pointer" onClick={() => setSelectedRow(r)}>
                                <h3 className="text-4xl font-black text-white uppercase truncate group-hover:text-indigo-400">{r.tedarikci_firma}</h3>
                                <p className="text-xl text-slate-500 font-bold mt-2 line-clamp-1 break-all italic uppercase">{r.aciklama || "---"}</p>
                            </div>

                            <div className="flex gap-4 shrink-0">
                                <div className="bg-black px-6 py-4 rounded-[2rem] border border-indigo-900/30 text-center">
                                    <div className="text-[10px] font-black text-indigo-500 mb-1 uppercase tracking-widest">ÖDEME GÜNÜ</div>
                                    <div className="text-2xl font-black text-white">{formatTR(r.odeme_gunu)}</div>
                                </div>
                            </div>

                            <div className="flex gap-6 border-l border-slate-800 pl-8 shrink-0">
                                <div className="min-w-[130px]">
                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">OLUŞTURAN</div>
                                    <div className="text-sm font-black text-slate-200 truncate max-w-[130px]">{r.olusturan_kullanici}</div>
                                    <div className="text-[11px] text-slate-500 font-bold">{formatTR(r.olusturulma_tarihi, true)}</div>
                                </div>
                                {r.guncelleyen_kullanici && (
                                    <div className="min-w-[180px] border-l border-slate-800/50 pl-6">
                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">SON İŞLEM</div>
                                        <div className="text-sm font-black text-indigo-300">{r.guncelleyen_kullanici}</div>
                                        <div className="text-[10px] font-black text-white bg-indigo-600/20 px-2 py-0.5 rounded inline-block mt-1">{r.son_islem || "GÜNCELLEME"}</div>
                                        <div className="text-[11px] text-indigo-900 font-bold mt-1">{formatTR(r.guncelleme_tarihi, true)}</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <div className={`px-6 py-4 rounded-[1.5rem] text-lg font-black uppercase shadow-2xl ${STATUS_MAP[r.durum].light}`}>
                                    {STATUS_MAP[r.durum].icon} {STATUS_MAP[r.durum].label}
                                </div>
                                <div className="flex gap-1 bg-black p-2 rounded-[2rem] border border-slate-800">
                                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                                        <button key={key} onClick={() => updateStatus(r.id, key)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${r.durum === key ? `${val.color} text-white scale-110 shadow-lg` : 'hover:bg-slate-800 text-slate-700'}`}>
                                            <span className="text-xl">{val.icon}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button onClick={(e) => openEdit(e, r)} className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center text-xl">✏️</button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: r.id, isBulk: false }); }} className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center text-xl">🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* SİLME ONAYI */}
                <AnimatePresence>
                    {confirmDelete.open && (
                        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-black/95 backdrop-blur-xl">
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 w-full max-w-lg rounded-[3rem] p-12 border-2 border-rose-900/30 text-center">
                                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
                                <h2 className="text-3xl font-black text-white mb-4 uppercase italic">{confirmDelete.isBulk ? `${selectedIds.length} KAYIT SİLİNSİN Mİ?` : "BU KAYIT SİLİNSİN Mİ?"}</h2>
                                <p className="text-slate-400 font-bold uppercase tracking-tighter mb-8">Bu işlem geri alınamaz.</p>
                                <div className="flex flex-col gap-3">
                                    <button onClick={executeDelete} className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xl transition-all">SİLMEYİ ONAYLA</button>
                                    <button onClick={() => setConfirmDelete({ open: false, id: null, isBulk: false })} className="w-full py-5 bg-slate-800 text-slate-400 rounded-2xl font-black text-xl">VAZGEÇ</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {open && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/95 backdrop-blur-md">
                            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-slate-900 w-full max-w-4xl rounded-[4rem] p-16 border border-slate-800 shadow-2xl">
                                <h2 className="text-5xl font-black text-white mb-10 text-center uppercase italic tracking-tighter">{editingId ? "KAYIT DÜZENLE" : "YENİ KAYIT"}</h2>
                                <div className="space-y-8">
                                    <input value={form.tedarikci_firma} className="w-full p-8 rounded-3xl bg-black border-2 border-slate-800 text-3xl font-black text-white focus:border-indigo-500 outline-none uppercase" placeholder="FİRMA ADI" onChange={e => setForm({ ...form, tedarikci_firma: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-6">
                                        <input type="date" className="w-full p-8 rounded-3xl bg-black border-2 border-slate-800 text-2xl font-bold text-white uppercase" value={form.tarih} onChange={e => setForm({ ...form, tarih: e.target.value })} />
                                        <select value={form.odeme_gunu} className="w-full p-8 rounded-3xl bg-black border-2 border-slate-800 text-2xl font-bold text-white outline-none" onChange={e => setForm({ ...form, odeme_gunu: e.target.value })}>
                                            {paymentOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                        </select>
                                    </div>
                                    <textarea value={form.not} rows={3} className="w-full p-8 rounded-3xl bg-black border-2 border-slate-800 text-2xl text-white outline-none uppercase" placeholder="AÇIKLAMA..." onChange={e => setForm({ ...form, not: e.target.value })} />
                                </div>
                                <div className="flex gap-8 mt-12">
                                    <button className="flex-1 text-2xl font-black text-slate-600 hover:text-white transition-all" onClick={() => { setOpen(false); setEditingId(null); }}>İPTAL</button>
                                    <LargeButton primary onClick={handleSave} disabled={saving}>{saving ? "İŞLENİYOR..." : editingId ? "GÜNCELLE" : "KAYDET"}</LargeButton>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
}