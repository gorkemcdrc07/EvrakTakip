import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip,
} from "recharts";
import {
  FiHome, FiRefreshCw, FiFilter, FiX, FiCalendar, FiTrendingUp,
  FiMapPin, FiLayers, FiFileText, FiCheckCircle, FiAlertTriangle,
  FiChevronRight, FiActivity, FiSearch, FiSliders, FiZap
} from "react-icons/fi";

const fmt = (n) => Number(n || 0).toLocaleString("tr-TR");
const cx = (...v) => v.filter(Boolean).join(" ");
const normalize = (str) => (str || "").trim().toLocaleUpperCase("tr").replace(/\s+/g, " ");
const normalizeProject = (str) => (str || "").toLocaleUpperCase("tr").replace(/["“”'`]+/g, "").replace(/\s+/g, " ").trim();
const CHART_COLORS = ["#0ea5e9", "#06b6d4", "#22c55e", "#f59e0b", "#64748b", "#3b82f6", "#14b8a6", "#84cc16"];

function canonicalProjectName(raw) {
  const n = normalizeProject(raw);
  if (n === "HEDEF DIŞ TEDARİK" || n.startsWith("HEDEF DIŞ TİCARET")) return "HEDEF DIŞ TEDARİK";
  if (n.startsWith("LEVENT OFSET")) return "LEVENT OFSET";
  if (n.startsWith("PAPİKS")) return "PAPİKS";
  if (n.includes("PARSİYEL")) return "PARSİYEL";
  if (n.startsWith("PEKER")) return "PEKER";
  if (n.startsWith("PETROL OFİSİ")) return "PETROL OFİSİ";
  if (n.startsWith("SARUHAN")) return "SARUHAN";
  if (n === "SGS") return "SGS";
  return n;
}

function toInputDate(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}
function shortDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat("tr-TR", { day:"2-digit", month:"short" }).format(d);
}
function fullDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat("tr-TR", { day:"2-digit", month:"2-digit", year:"numeric" }).format(d);
}

function Surface({ children, className = "" }) {
  return <div className={cx("rounded-[22px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)] dark:border-white/[0.08] dark:bg-[#111927]", className)}>{children}</div>;
}

function Kpi({ icon: Icon, label, value, hint, tone="sky", active=false, onClick }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  };
  const Wrapper = onClick ? motion.button : motion.div;
  return (
    <Wrapper layout whileHover={onClick ? { y:-3 } : undefined} onClick={onClick} className={cx("group relative overflow-hidden rounded-[20px] border bg-white p-4 text-left shadow-sm transition dark:bg-[#111927]", active ? "border-sky-300 ring-2 ring-sky-100 dark:ring-sky-500/10" : "border-slate-200/80 dark:border-white/[.08]", onClick && "cursor-pointer hover:border-sky-300")}> 
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</div>
          <motion.div key={String(value)} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</motion.div>
          {hint && <div className="mt-1 text-[11px] font-semibold text-slate-400">{hint}</div>}
        </div>
        <div className={cx("grid h-10 w-10 place-items-center rounded-xl transition group-hover:scale-110", tones[tone])}><Icon size={18}/></div>
      </div>
      {active && <motion.div layoutId="kpi-active" className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-400"/>}
    </Wrapper>
  );
}

function ChartHead({ icon: Icon, title, subtitle, right }) {
  return <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[.06]">
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><Icon size={17}/></div>
      <div><h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3><p className="mt-0.5 text-[11px] font-medium text-slate-400">{subtitle}</p></div>
    </div>
    {right}
  </div>;
}

function LoadingDashboard() {
  return <div className="grid gap-4">
    <div className="grid gap-3 md:grid-cols-4">{Array.from({length:4}).map((_,i)=><motion.div key={i} className="h-28 rounded-[20px] bg-slate-100 dark:bg-white/5" animate={{opacity:[.4,1,.4]}} transition={{repeat:Infinity,duration:1.2,delay:i*.08}}/>)}</div>
    <div className="grid gap-4 xl:grid-cols-2">{Array.from({length:2}).map((_,i)=><motion.div key={i} className="h-80 rounded-[22px] bg-slate-100 dark:bg-white/5" animate={{opacity:[.4,1,.4]}} transition={{repeat:Infinity,duration:1.2,delay:i*.12}}/>)}</div>
  </div>;
}

async function fetchAllEvraklar() {
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const { data, error } = await supabase
      .from("evraklar")
      .select(`id, tarih, lokasyonid, sefersayisi,
        evrakseferler:evrakseferler!fk_evrakseferler_evrakid ( seferno, aciklama ),
        evrakproje:evrakproje!fk_evrakproje_evrakid ( projeid, sefersayisi )`)
      .order("tarih", { ascending:false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data || [];
    all = all.concat(batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export default function EvrakRaporlari() {
  const navigate = useNavigate();
  const [evraklar, setEvraklar] = useState([]);
  const [lokasyonlar, setLokasyonlar] = useState({});
  const [projeKeyById, setProjeKeyById] = useState({});
  const [projeNameByKey, setProjeNameByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLokasyonId, setSelectedLokasyonId] = useState("");
  const [selectedProjeKey, setSelectedProjeKey] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const load = async () => {
    try {
      setLoading(true); setError("");
      const [evrakData, locRes, projectRes] = await Promise.all([
        fetchAllEvraklar(),
        supabase.from("lokasyonlar").select("*"),
        supabase.from("projeler").select("*")
      ]);
      if (locRes.error) throw locRes.error;
      if (projectRes.error) throw projectRes.error;
      const lm = {};
      (locRes.data || []).forEach(l => lm[l.id] = l.lokasyon);
      const pk = {}, pn = {};
      (projectRes.data || []).forEach(p => { const key = canonicalProjectName(p.proje); pk[p.id] = key; if (!pn[key]) pn[key]=(p.proje||"").trim(); });
      setEvraklar(evrakData); setLokasyonlar(lm); setProjeKeyById(pk); setProjeNameByKey(pn);
    } catch (e) {
      console.error(e); setError("Rapor verileri yüklenirken bir sorun oluştu.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const lokasyonOptions = useMemo(() => Object.entries(lokasyonlar).map(([id,ad])=>({id,ad})).sort((a,b)=>a.ad.localeCompare(b.ad,"tr")), [lokasyonlar]);
  const projeOptions = useMemo(() => Object.entries(projeNameByKey).map(([id,ad])=>({id,ad})).sort((a,b)=>a.ad.localeCompare(b.ad,"tr")), [projeNameByKey]);

  const scopedEvraklar = useMemo(() => evraklar.filter(e => {
    const d = new Date(e.tarih);
    if (startDate && d < new Date(startDate+"T00:00:00")) return false;
    if (endDate && d > new Date(endDate+"T23:59:59")) return false;
    if (selectedLokasyonId && String(e.lokasyonid)!==String(selectedLokasyonId)) return false;
    if (selectedProjeKey && !(e.evrakproje||[]).some(p=>projeKeyById[p.projeid]===selectedProjeKey)) return false;
    if (selectedStatus && !(e.evrakseferler||[]).some(s=>normalize(s.aciklama)===selectedStatus)) return false;
    if (search.trim()) {
      const q=normalize(search);
      const hay=normalize([lokasyonlar[e.lokasyonid], ...(e.evrakproje||[]).map(p=>projeNameByKey[projeKeyById[p.projeid]]), ...(e.evrakseferler||[]).flatMap(s=>[s.seferno,s.aciklama])].filter(Boolean).join(" "));
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [evraklar,startDate,endDate,selectedLokasyonId,selectedProjeKey,selectedStatus,search,lokasyonlar,projeKeyById,projeNameByKey]);

  const toplamSefer = useMemo(()=>scopedEvraklar.reduce((s,e)=>s+(e.sefersayisi||0),0),[scopedEvraklar]);
  const duzeltilmis = useMemo(()=>scopedEvraklar.reduce((a,e)=>a+(e.evrakseferler||[]).filter(s=>normalize(s.aciklama)==="TARAFIMIZCA DÜZELTİLMİŞTİR").length,0),[scopedEvraklar]);
  const orjinaleCekilmis = useMemo(()=>scopedEvraklar.reduce((a,e)=>a+(e.evrakseferler||[]).filter(s=>normalize(s.aciklama)==="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR").length,0),[scopedEvraklar]);
  const bosAciklama = useMemo(()=>scopedEvraklar.reduce((a,e)=>a+(e.evrakseferler||[]).filter(s=>!String(s.aciklama||"").trim()).length,0),[scopedEvraklar]);

  const aciklamaSeries = useMemo(()=>{
    const m={}; scopedEvraklar.forEach(e=>(e.evrakseferler||[]).forEach(s=>{ const k=(s.aciklama||"").trim()||"(Boş)"; m[k]=(m[k]||0)+1; }));
    const total=Object.values(m).reduce((a,b)=>a+b,0)||1;
    return Object.entries(m).map(([name,value])=>({name,value,pct:+(value*100/total).toFixed(1)})).sort((a,b)=>b.value-a.value);
  },[scopedEvraklar]);
  const projeSeries = useMemo(()=>{
    const m={}; scopedEvraklar.forEach(e=>(e.evrakproje||[]).forEach(p=>{ const k=projeKeyById[p.projeid]; if(k)m[k]=(m[k]||0)+(p.sefersayisi||0); }));
    return Object.entries(m).map(([k,value])=>({key:k,name:projeNameByKey[k]||k,value})).sort((a,b)=>b.value-a.value);
  },[scopedEvraklar,projeKeyById,projeNameByKey]);
  const lokasyonSeries = useMemo(()=>{
    const m={}; scopedEvraklar.forEach(e=>{ const name=lokasyonlar[e.lokasyonid]; if(name)m[name]=(m[name]||0)+(e.sefersayisi||0); });
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[scopedEvraklar,lokasyonlar]);
  const dailySeries = useMemo(()=>{
    const m={}; scopedEvraklar.forEach(e=>{ const key=toInputDate(e.tarih); if(!m[key])m[key]={date:key,evrak:0,sefer:0}; m[key].evrak+=1; m[key].sefer+=(e.sefersayisi||0); });
    return Object.values(m).sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({...x,label:shortDate(x.date)}));
  },[scopedEvraklar]);

  const topProject = projeSeries[0]; const topLocation=lokasyonSeries[0];
  const hasAnyFilter=!!(startDate||endDate||selectedLokasyonId||selectedProjeKey||selectedStatus||search.trim());
  const clearAll=()=>{setStartDate("");setEndDate("");setSelectedLokasyonId("");setSelectedProjeKey("");setSelectedStatus("");setSearch("");};
  const setPreset=(days)=>{const end=new Date();const start=new Date();start.setDate(end.getDate()-(days-1));setStartDate(toInputDate(start));setEndDate(toInputDate(end));};

  const tooltipStyle={background:"rgba(15,23,42,.96)",border:"1px solid rgba(255,255,255,.10)",borderRadius:14,color:"#fff",boxShadow:"0 12px 30px rgba(15,23,42,.25)"};

  return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0b1220] dark:text-slate-50">
    <div className="mx-auto w-full max-w-[1800px] px-4 py-5 lg:px-7 xl:px-8">
      <Surface className="mb-4 overflow-hidden">
        <div className="relative overflow-hidden px-5 py-5 lg:px-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl"/>
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <motion.div whileHover={{rotate:-5,scale:1.05}} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-400 text-white shadow-lg shadow-sky-500/15"><FiActivity size={22}/></motion.div>
              <div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[.22em] text-sky-600 dark:text-sky-300">Operasyon Analiz Merkezi</div><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-[28px]">Evrak Raporları</h1><p className="mt-1 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">Sefer, proje, lokasyon ve evrak açıklamalarını tek ekranda karşılaştırın; grafikten filtreye doğrudan inin.</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={()=>navigate("/anasayfa")} className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><FiHome className="transition group-hover:-translate-x-0.5"/> Ana Sayfa</button>
              <button onClick={()=>setFiltersOpen(v=>!v)} className={cx("group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-black shadow-sm transition hover:-translate-y-0.5",filtersOpen?"border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300":"border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300")}><FiSliders/> Filtreler</button>
              <button onClick={load} className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-sky-500/15 transition hover:-translate-y-0.5 hover:shadow-xl"><FiRefreshCw className={cx("transition group-hover:rotate-180",loading&&"animate-spin")}/> Veriyi Yenile</button>
            </div>
          </div>
        </div>
      </Surface>

      <AnimatePresence initial={false}>
        {filtersOpen && <motion.div initial={{opacity:0,y:-10,height:0}} animate={{opacity:1,y:0,height:"auto"}} exit={{opacity:0,y:-8,height:0}} className="mb-4 overflow-hidden">
          <Surface className="p-4">
            <div className="grid gap-3 xl:grid-cols-[1.2fr_.8fr_.8fr_.8fr_auto] xl:items-end">
              <div><label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Akıllı arama</label><div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sefer no, proje, lokasyon, açıklama..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[.04] dark:focus:ring-sky-500/10"/></div></div>
              <div><label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Başlangıç</label><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[.04] dark:focus:ring-sky-500/10"/></div>
              <div><label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Bitiş</label><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[.04] dark:focus:ring-sky-500/10"/></div>
              <div><label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Proje</label><select value={selectedProjeKey} onChange={e=>setSelectedProjeKey(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-sky-300 dark:border-white/10 dark:bg-[#111927]"><option value="">Tüm projeler</option>{projeOptions.map(o=><option key={o.id} value={o.id}>{o.ad}</option>)}</select></div>
              <div className="flex gap-2"><button onClick={clearAll} disabled={!hasAnyFilter} className={cx("h-11 rounded-xl px-3 text-xs font-black transition",hasAnyFilter?"border border-rose-200 bg-rose-50 text-rose-600 hover:-translate-y-0.5 dark:border-rose-400/15 dark:bg-rose-500/10":"cursor-not-allowed bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-slate-600")}><FiX className="inline mr-1"/>Temizle</button></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/[.06]">
              <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Hızlı dönem</span>
              {[7,30,90].map(d=><button key={d} onClick={()=>setPreset(d)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-500 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-white/10 dark:hover:bg-sky-500/10">Son {d} gün</button>)}
              <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-white/10"/>
              <select value={selectedLokasyonId} onChange={e=>setSelectedLokasyonId(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 dark:border-white/10 dark:bg-[#111927] dark:text-slate-300"><option value="">Tüm lokasyonlar</option>{lokasyonOptions.map(o=><option key={o.id} value={o.id}>{o.ad}</option>)}</select>
              {hasAnyFilter && <motion.span initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} className="ml-auto rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Filtrelenmiş görünüm · {fmt(scopedEvraklar.length)} evrak</motion.span>}
            </div>
          </Surface>
        </motion.div>}
      </AnimatePresence>

      {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
      {loading ? <LoadingDashboard/> : <>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={FiTrendingUp} label="Toplam Sefer" value={fmt(toplamSefer)} hint={`${fmt(scopedEvraklar.length)} evrak kaydı`} tone="sky" onClick={()=>setSelectedStatus("")} active={!selectedStatus}/>
          <Kpi icon={FiCheckCircle} label="Düzeltilmiş" value={fmt(duzeltilmis)} hint={toplamSefer?`%${((duzeltilmis/toplamSefer)*100).toFixed(1)} pay`:"Veri yok"} tone="cyan" onClick={()=>setSelectedStatus("TARAFIMIZCA DÜZELTİLMİŞTİR")} active={selectedStatus==="TARAFIMIZCA DÜZELTİLMİŞTİR"}/>
          <Kpi icon={FiFileText} label="Orijinale Çekilmiş" value={fmt(orjinaleCekilmis)} hint={toplamSefer?`%${((orjinaleCekilmis/toplamSefer)*100).toFixed(1)} pay`:"Veri yok"} tone="emerald" onClick={()=>setSelectedStatus("TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR")} active={selectedStatus==="TARAFIMIZCA ORİJİNALE ÇEKİLMİŞTİR"}/>
          <Kpi icon={FiAlertTriangle} label="Boş Açıklama" value={fmt(bosAciklama)} hint={bosAciklama?"Kontrol edilmesi önerilir":"Eksik açıklama yok"} tone="amber"/>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-[1.45fr_.75fr]">
          <Surface className="overflow-hidden"><ChartHead icon={FiTrendingUp} title="Zaman İçinde Operasyon Yoğunluğu" subtitle="Günlük evrak ve sefer hareketi — dönem davranışını tek bakışta görün" right={<span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-600 dark:bg-sky-500/10">{dailySeries.length} gün</span>}/><div className="h-[340px] p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailySeries} margin={{top:10,right:10,left:-12,bottom:0}}><defs><linearGradient id="evrakArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={.32}/><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient><linearGradient id="seferArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity={.18}/><stop offset="100%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,.18)"/><XAxis dataKey="label" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} minTickGap={26}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><ReTooltip contentStyle={tooltipStyle} labelFormatter={(_,p)=>p?.[0]?.payload?.date?fullDate(p[0].payload.date):""}/><Area type="monotone" dataKey="sefer" name="Sefer" stroke="#06b6d4" strokeWidth={2.5} fill="url(#seferArea)"/><Area type="monotone" dataKey="evrak" name="Evrak" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#evrakArea)"/></AreaChart></ResponsiveContainer></div></Surface>

          <Surface className="overflow-hidden"><ChartHead icon={FiZap} title="Hızlı İçgörüler" subtitle="Bu filtre kapsamındaki en güçlü sinyaller"/><div className="space-y-3 p-4">
            {[{icon:FiLayers,label:"En yoğun proje",value:topProject?.name||"—",sub:topProject?`${fmt(topProject.value)} sefer`:"Veri yok"},{icon:FiMapPin,label:"En yoğun lokasyon",value:topLocation?.name||"—",sub:topLocation?`${fmt(topLocation.value)} sefer`:"Veri yok"},{icon:FiActivity,label:"Düzeltme oranı",value:toplamSefer?`%${((duzeltilmis/toplamSefer)*100).toFixed(1)}`:"—",sub:"Toplam sefere göre"}].map((x,i)=><motion.div key={x.label} whileHover={{x:4}} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 transition hover:border-sky-200 hover:bg-sky-50/40 dark:border-white/[.06] dark:hover:bg-sky-500/[.04]"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300"><x.icon/></div><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{x.label}</div><div className="truncate text-sm font-black text-slate-800 dark:text-white">{x.value}</div><div className="text-[11px] font-semibold text-slate-400">{x.sub}</div></div></motion.div>)}
          </div></Surface>
        </div>

        <div className="mb-4 grid gap-4 2xl:grid-cols-2">
          <Surface className="overflow-hidden"><ChartHead icon={FiLayers} title="Proje Bazlı Sefer Dağılımı" subtitle="En yüksek hacimli projeler — çubuğa tıklayın, raporu o projeye indirin" right={selectedProjeKey&&<button onClick={()=>setSelectedProjeKey("")} className="text-[11px] font-black text-sky-600">Proje filtresini kaldır</button>}/><div className="h-[430px] p-4"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={projeSeries.slice(0,12)} margin={{top:4,right:24,left:18,bottom:4}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,.16)"/><XAxis type="number" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={132} tick={{fontSize:10,fill:"#64748b",fontWeight:700}} axisLine={false} tickLine={false}/><ReTooltip contentStyle={tooltipStyle} formatter={v=>[`${fmt(v)} sefer`,"Sefer"]}/><Bar dataKey="value" fill="#0ea5e9" radius={[0,8,8,0]} onClick={d=>d?.key&&setSelectedProjeKey(d.key)} cursor="pointer"/></BarChart></ResponsiveContainer></div></Surface>

          <Surface className="overflow-hidden"><ChartHead icon={FiMapPin} title="Lokasyon Bazlı Sefer Dağılımı" subtitle="Operasyon yoğunluğunu lokasyon bazında karşılaştırın" right={selectedLokasyonId&&<button onClick={()=>setSelectedLokasyonId("")} className="text-[11px] font-black text-sky-600">Lokasyon filtresini kaldır</button>}/><div className="h-[430px] p-4"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={lokasyonSeries.slice(0,12)} margin={{top:4,right:24,left:18,bottom:4}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,.16)"/><XAxis type="number" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={132} tick={{fontSize:10,fill:"#64748b",fontWeight:700}} axisLine={false} tickLine={false}/><ReTooltip contentStyle={tooltipStyle} formatter={v=>[`${fmt(v)} sefer`,"Sefer"]}/><Bar dataKey="value" fill="#06b6d4" radius={[0,8,8,0]} onClick={d=>{const found=lokasyonOptions.find(o=>o.ad===d?.name);if(found)setSelectedLokasyonId(found.id)}} cursor="pointer"/></BarChart></ResponsiveContainer></div></Surface>
        </div>

        <Surface className="mb-4 overflow-hidden"><ChartHead icon={FiFileText} title="Evrak Açıklama Analizi" subtitle="Açıklama kalitesini ve operasyon türlerini birlikte inceleyin"/><div className="grid gap-4 p-4 xl:grid-cols-[.8fr_1.2fr]">
          <div className="h-[380px]"><ResponsiveContainer width="100%" height="100%"><PieChart><ReTooltip contentStyle={tooltipStyle} formatter={(v,n,p)=>[`${fmt(v)} kayıt · %${p.payload.pct}`,n]}/><Pie data={aciklamaSeries.slice(0,8)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={82} outerRadius={126} paddingAngle={2} stroke="transparent">{aciklamaSeries.slice(0,8).map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><text x="50%" y="48%" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700">TOPLAM AÇIKLAMA</text><text x="50%" y="56%" textAnchor="middle" fill="#0f172a" fontSize="24" fontWeight="900">{fmt(aciklamaSeries.reduce((s,x)=>s+x.value,0))}</text></PieChart></ResponsiveContainer></div>
          <div className="grid content-start gap-2">{aciklamaSeries.slice(0,10).map((r,i)=><motion.button key={r.name} whileHover={{x:3}} onClick={()=>setSelectedStatus(normalize(r.name)==="(BOŞ)"?"":normalize(r.name))} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50/40 dark:border-white/[.06] dark:hover:bg-sky-500/[.04]"><span className="h-2.5 w-2.5 rounded-full" style={{background:CHART_COLORS[i%CHART_COLORS.length]}}/><span className="min-w-0 truncate text-xs font-bold text-slate-600 dark:text-slate-300" title={r.name}>{r.name}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-white/5">%{r.pct}</span><span className="w-16 text-right text-xs font-black tabular-nums text-slate-900 dark:text-white">{fmt(r.value)}</span></motion.button>)}</div>
        </div></Surface>
      </>}
    </div>
  </div>;
}
