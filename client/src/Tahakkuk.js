import React, { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

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
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

    const paymentOptions = useMemo(() => {
        const today = new Date();
        const options = [];
        for (let i = 0; i < 3; i++) {
            [1, 4].forEach(dayIdx => {
                const d = new Date(today);
                const currentDay = (today.getDay() + 6) % 7;
                d.setDate(today.getDate() - currentDay + (i * 7) + dayIdx);
                const val = d.toISOString().split('T')[0];
                options.push({ v: val, l: `${i === 0 ? "Bu" : i === 1 ? "Gelecek" : "Sonraki"} ${dayIdx === 1 ? "Salı" : "Cuma"} (${formatTR(val)})` });
            });
        }
        return options;
    }, []);

    const [form, setForm] = useState({ tedarikci_firma: "", odeme_gunu: paymentOptions[0].v, tarih: new Date().toISOString().split('T')[0], not: "" });

    const fetchRows = async () => {
        const { data } = await supabase.from("tahakkuk").select("*").order("olusturulma_tarihi", { ascending: false });
        if (data) setRows(data);
    };

    useEffect(() => { fetchRows(); }, []);

    const updateStatus = async (id, newStatus) => {
        const now = new Date().toISOString();
        const islemNotu = STATUS_MAP[newStatus].label.toUpperCase() + " YAPILDI"; // Yeni eklenen islem kaydı

        const { error } = await supabase.from("tahakkuk").update({
            durum: newStatus,
            guncelleyen_kullanici: adSoyad,
            guncelleme_tarihi: now,
            son_islem: islemNotu // Veritabanına yazılan yeni alan
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
        if (!error) { setOpen(false); setEditingId(null); setForm({ tedarikci_firma: "", odeme_gunu: paymentOptions[0].v, tarih: new Date().toISOString().split('T')[0], not: "" }); fetchRows(); }
        setSaving(false);
    };

    const confirmDeleteRow = async () => {
        const { error } = await supabase.from("tahakkuk").delete().eq("id", confirmDelete.id);
        if (!error) fetchRows();
        setConfirmDelete({ open: false, id: null });
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
        return matchesSearch && matchesStatus;
    });

    return (
        <Layout>
            <div className="min-h-screen bg-black text-slate-100 p-10 font-sans w-full">

                <header className="w-full mb-12 flex justify-between items-center border-b border-slate-900 pb-8">
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic">Tahakkuk <span className="text-indigo-600">Paneli</span></h1>
                        <p className="text-2xl text-slate-500 font-bold uppercase mt-2">Kullanıcı: {adSoyad}</p>
                    </div>
                    <div className="flex gap-4">
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ARA..." className="w-[400px] px-8 py-5 rounded-2xl bg-slate-900 border-2 border-slate-800 text-2xl font-black text-indigo-500 outline-none focus:border-indigo-600 transition-all" />
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
                </div>

                <div className="w-full space-y-6">
                    {filteredRows.map((r) => (
                        <div key={r.id} onClick={() => setSelectedRow(r)} className="w-full bg-slate-900/40 rounded-[3.5rem] border border-slate-800 p-10 flex items-center justify-between gap-8 hover:bg-slate-900 transition-all cursor-pointer group relative">

                            <div className="flex-1 min-w-[200px] max-w-[25%] overflow-hidden">
                                <h3 className="text-4xl font-black text-white uppercase truncate group-hover:text-indigo-400">{r.tedarikci_firma}</h3>
                                <p className="text-xl text-slate-500 font-bold mt-2 line-clamp-1 break-all italic uppercase">
                                    {r.aciklama || "---"}
                                </p>
                            </div>

                            <div className="flex gap-4 shrink-0">
                                <div className="bg-black px-6 py-4 rounded-[2rem] border border-indigo-900/30 text-center">
                                    <div className="text-[10px] font-black text-indigo-500 mb-1 uppercase tracking-widest">ÖDEME GÜNÜ</div>
                                    <div className="text-2xl font-black text-white">{formatTR(r.odeme_gunu)}</div>
                                </div>
                            </div>

                            {/* LOGLAR VE SON İŞLEM DURUMU */}
                            <div className="flex gap-6 border-l border-slate-800 pl-8 shrink-0">
                                <div className="min-w-[130px]">
                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">OLUŞTURAN</div>
                                    <div className="text-sm font-black text-slate-200 truncate max-w-[130px]">{r.olusturan_kullanici}</div>
                                    <div className="text-[11px] text-slate-500 font-bold">{formatTR(r.olusturulma_tarihi, true)}</div>
                                </div>
                                {r.guncelleyen_kullanici && (
                                    <div className="min-w-[180px] border-l border-slate-800/50 pl-6">
                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">SON İŞLEM</div>
                                        <div className="text-sm font-black text-indigo-300">
                                            {r.guncelleyen_kullanici}
                                        </div>
                                        <div className="text-[10px] font-black text-white bg-indigo-600/20 px-2 py-0.5 rounded inline-block mt-1">
                                            {r.son_islem || "GÜNCELLEME"}
                                        </div>
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
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: r.id }); }} className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center text-xl">🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* SİLME ONAY MODALI */}
                <AnimatePresence>
                    {confirmDelete.open && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 w-full max-w-lg rounded-[3rem] p-12 border-2 border-rose-900/30 text-center">
                                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
                                <h2 className="text-3xl font-black text-white mb-4 uppercase italic">KAYIT SİLİNSİN Mİ?</h2>
                                <p className="text-lg text-slate-400 font-bold mb-8 uppercase tracking-tighter">Bu işlemi geri alamazsınız.</p>
                                <div className="flex flex-col gap-3">
                                    <button onClick={confirmDeleteRow} className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xl transition-all">SİLMEYİ ONAYLA</button>
                                    <button onClick={() => setConfirmDelete({ open: false, id: null })} className="w-full py-5 bg-slate-800 text-slate-400 rounded-2xl font-black text-xl hover:bg-slate-700">VAZGEÇ</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* DETAY PANELİ */}
                <AnimatePresence>
                    {selectedRow && (
                        <div className="fixed inset-0 z-[150] flex justify-end bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRow(null)}>
                            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl bg-slate-950 h-full p-16 border-l border-slate-800 overflow-y-auto">
                                <button onClick={() => setSelectedRow(null)} className="text-3xl font-black text-slate-500 hover:text-white mb-10 italic">❮ GERİ DÖN</button>
                                <div className="space-y-12">
                                    <header>
                                        <div className={`inline-block px-6 py-2 rounded-xl text-xl font-black mb-4 ${STATUS_MAP[selectedRow.durum].light}`}>
                                            {STATUS_MAP[selectedRow.durum].icon} {STATUS_MAP[selectedRow.durum].label.toUpperCase()}
                                        </div>
                                        <h2 className="text-7xl font-black text-white uppercase break-all leading-none tracking-tighter">{selectedRow.tedarikci_firma}</h2>
                                    </header>
                                    <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800">
                                        <div className="text-slate-500 font-black text-sm uppercase mb-6 tracking-widest">AÇIKLAMA DETAYI</div>
                                        <p className="text-4xl text-slate-100 font-bold leading-relaxed italic whitespace-pre-wrap break-all uppercase">
                                            {selectedRow.aciklama || "AÇIKLAMA GİRİLMEMİŞ"}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-900">
                                        <div className="bg-black/40 p-8 rounded-3xl border border-slate-800/50">
                                            <div className="text-slate-600 font-black text-xs uppercase mb-2">OLUŞTURAN</div>
                                            <div className="text-2xl font-black text-white uppercase">{selectedRow.olusturan_kullanici}</div>
                                            <div className="text-sm text-slate-500">{formatTR(selectedRow.olusturulma_tarihi, true)}</div>
                                        </div>
                                        {selectedRow.guncelleyen_kullanici && (
                                            <div className="bg-indigo-500/5 p-8 rounded-3xl border border-indigo-500/10">
                                                <div className="text-indigo-500 font-black text-xs uppercase mb-2 tracking-widest">SON İŞLEM BİLGİSİ</div>
                                                <div className="text-2xl font-black text-indigo-300 uppercase">{selectedRow.guncelleyen_kullanici}</div>
                                                <div className="text-lg font-black text-white/60 mb-2">{selectedRow.son_islem}</div>
                                                <div className="text-sm text-indigo-900">{formatTR(selectedRow.guncelleme_tarihi, true)}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* KAYIT / DÜZENLEME MODALI */}
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