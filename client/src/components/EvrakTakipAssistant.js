import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FileSearch, Loader2, MapPin, Send, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useTabStore from "../stores/tabStore";
import { screenRegistry } from "../screenRegistry";

const low = (v) => String(v || "").toLocaleLowerCase("tr-TR");
const fmt = (v) => v ? new Date(v).toLocaleDateString("tr-TR") : "—";
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today = () => ymd(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return ymd(d); };

const QUICK = [
  "Sefer no ile evrak bul", "Evrak numarasıyla bul", "Lokasyona göre evrak bul", "Projeye göre evrak bul",
  "Açıklamaya göre evrak bul", "Bugünkü evrakları göster", "Son 7 gün evrakları", "İrsaliye ara",
  "Gönderi numarası ara", "Odak evrak no ara", "Kargo firmasına göre ara", "Gönderen firmaya göre ara"
];

const starter = { id:"welcome", role:"bot", text:"Merhaba! Ben AI Asistan. Tüm Evraklar ve kargo tablolarında arama yapabilir, filtreleri senin yerine uygulayabilir ve istediğin ekrana doğrudan götürebilirim.", chips: QUICK.slice(0,8) };

const RobotAvatar = ({ compact=false }) => <div className={`relative ${compact?"h-12 w-12":"h-24 w-24"} shrink-0`}>
  <motion.div animate={{y:[0,-3,0],rotate:[-1,1,-1]}} transition={{duration:3,repeat:Infinity}} className="absolute inset-0">
    <div className="absolute left-[16%] top-[5%] h-[58%] w-[68%] rounded-[42%] border border-cyan-100 bg-gradient-to-br from-white via-slate-100 to-slate-400 shadow-[0_0_24px_rgba(34,211,238,.32)]">
      <div className="absolute inset-[13%] rounded-[38%] bg-gradient-to-br from-[#071426] to-[#0b3152]"><i className="absolute left-[23%] top-[38%] h-[15%] w-[13%] rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]"/><i className="absolute right-[23%] top-[38%] h-[15%] w-[13%] rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]"/><i className="absolute bottom-[20%] left-[39%] h-[8%] w-[23%] rounded-b-full border-b-2 border-cyan-200"/></div>
    </div><div className="absolute bottom-[3%] left-[27%] h-[38%] w-[46%] rounded-[45%] border border-white bg-gradient-to-br from-white to-slate-400"><i className="absolute left-1/2 top-[30%] h-[28%] w-[28%] -translate-x-1/2 rounded-lg bg-cyan-400 shadow-[0_0_14px_#22d3ee]"/></div>
  </motion.div>
</div>;

export default function EvrakTakipAssistant(){
  const [open,setOpen]=useState(false), [messages,setMessages]=useState([starter]), [input,setInput]=useState(""), [busy,setBusy]=useState(false);
  const scrollRef=useRef(null); const navigate=useNavigate(); const openTab=useTabStore(s=>s.openTab);
  useEffect(()=>{ if(open) setTimeout(()=>scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"}),50); },[messages,busy,open]);

  const go=(path,params={})=>{ const screen=screenRegistry[path]; if(screen) openTab({path,title:screen.title}); const sp=new URLSearchParams(); Object.entries(params).forEach(([k,v])=>Array.isArray(v)?v.forEach(x=>sp.append(k,x)):v!==undefined&&v!==null&&v!==""&&sp.set(k,v)); navigate(`/app${path}${sp.toString()?`?${sp}`:""}`); setOpen(false); };
  const bot=(text,extra={})=>setMessages(v=>[...v,{id:`${Date.now()}b`,role:"bot",text,...extra}]);

  const loadMeta=async()=>{ const [{data:l},{data:p}]=await Promise.all([supabase.from("lokasyonlar").select("id,lokasyon"),supabase.from("projeler").select("id,proje")]); return {loc:l||[],proj:p||[]}; };
  const searchDocs=async(f={})=>{
    const {data,error}=await supabase.from("evraklar").select("id,tarih,lokasyonid,sefersayisi,evrakseferler:evrakseferler!fk_evrakseferler_evrakid(id,seferno,aciklama),evrakproje:evrakproje!fk_evrakproje_evrakid(projeid,sefersayisi)").order("tarih",{ascending:false}).limit(500);
    if(error) throw error; let rows=data||[];
    if(f.start) rows=rows.filter(x=>String(x.tarih||"").slice(0,10)>=f.start); if(f.end) rows=rows.filter(x=>String(x.tarih||"").slice(0,10)<=f.end);
    if(f.locIds?.length) rows=rows.filter(x=>f.locIds.includes(String(x.lokasyonid)));
    if(f.projIds?.length) rows=rows.filter(x=>(x.evrakproje||[]).some(p=>f.projIds.includes(String(p.projeid))));
    if(f.sefer) rows=rows.filter(x=>(x.evrakseferler||[]).some(s=>low(s.seferno).includes(low(f.sefer))));
    if(f.desc) rows=rows.filter(x=>(x.evrakseferler||[]).some(s=>low(s.aciklama).includes(low(f.desc))));
    if(f.id) rows=rows.filter(x=>String(x.id)===String(f.id)); return rows;
  };
  const docCards=(rows,meta)=>rows.slice(0,8).map(x=>({id:x.id,title:`Evrak #${x.id}`,subtitle:`${fmt(x.tarih)} • ${meta.loc.find(l=>String(l.id)===String(x.lokasyonid))?.lokasyon||"Lokasyon yok"}`,meta:`${x.sefersayisi||0} sefer • ${(x.evrakseferler||[]).slice(0,3).map(s=>s.seferno).filter(Boolean).join(", ")||"Sefer no yok"}`,evrakId:x.id,sefer:(x.evrakseferler||[])[0]?.seferno||""}));
  const searchCargo=async(term)=>{ const s=String(term).replace(/[,%()]/g," ").trim(); const {data,error}=await supabase.from("kargo_bilgileri").select("*").or(`gonderi_numarasi.ilike.%${s}%,irsaliye_no.ilike.%${s}%,odak_evrak_no.ilike.%${s}%,kargo_firmasi.ilike.%${s}%,gonderen_firma.ilike.%${s}%`).order("tarih",{ascending:false}).limit(10); if(error)throw error; return data||[]; };

  const screenCommand=(q)=>{ const aliases=[
    ["tüm evrak","/toplu-evraklar"],["toplu evrak","/toplu-evraklar"],["tüm kargo","/tum-kargo-bilgileri"],["hedef kargo","/hedef-kargo"],["evrak ekle","/evrak-ekle"],["kargo bilgisi ekle","/kargo-bilgisi-ekle"],["tutanak","/tutanak"],["rapor merkezi","/rapor-merkezi"],["evrak rapor","/evrak-raporlari"],["tahakkuk takip","/tahakkuk-takip"],["tahakkuk","/tahakkuk"],["müşteri evrak","/musteri-evraki"],["lokasyon","/lokasyonlar"],["proje","/projeler"],["görev","/gorev-merkezi"],["takvim","/operasyon-takvimi"],["anasayfa","/anasayfa"]
  ]; return aliases.find(([a])=>q.includes(a)); };

  const answer=async(raw)=>{
    const q=low(raw).trim();
    if(/^(sefer no ile evrak bul|evrak numarasıyla bul|lokasyona göre evrak bul|projeye göre evrak bul|açıklamaya göre evrak bul|irsaliye ara|gönderi numarası ara|odak evrak no ara|kargo firmasına göre ara|gönderen firmaya göre ara)$/i.test(raw.trim())) return bot(`Aramak istediğin değeri yaz. “${raw}” seçeneğine göre ilgili tabloda arayacağım.`,{chips:["Bugünkü evrakları göster","Son 7 gün evrakları","Tüm Evraklar'ı aç"]});
    const scr=screenCommand(q); if(scr && /aç|git|göster|ekran/.test(q)) return bot(`${scr[0]} ekranını açabilirim.`,{action:{label:"Ekranı aç",path:scr[1]},chips:QUICK.slice(0,4)});

    const meta=await loadMeta();
    if(/bugün.*evrak|bugünkü evrak/.test(q)){ const rows=await searchDocs({start:today(),end:today()}); return bot(`Bugün ${rows.length} evrak kaydı var.`,{docs:docCards(rows,meta),action:{label:`Tüm Evraklar'da ${rows.length} kaydı göster`,path:"/toplu-evraklar",params:{aiStartDate:today(),aiEndDate:today()}},chips:["Son 7 gün evrakları","Toplam kaç sefer var?"]}); }
    if(/son 7 gün.*evrak|son 7 günü.*evrak/.test(q)){ const rows=await searchDocs({start:daysAgo(6),end:today()}); return bot(`Son 7 günde ${rows.length} evrak ve ${rows.reduce((a,x)=>a+(Number(x.sefersayisi)||0),0)} sefer var.`,{docs:docCards(rows,meta),action:{label:"Son 7 günü Tüm Evraklar'da aç",path:"/toplu-evraklar",params:{aiStartDate:daysAgo(6),aiEndDate:today()}}}); }
    if(/toplam kaç sefer/.test(q)){ const rows=await searchDocs(); return bot(`Tüm Evraklar'da toplam ${rows.reduce((a,x)=>a+(Number(x.sefersayisi)||0),0)} sefer bulunuyor.`,{action:{label:"Tüm Evraklar'ı aç",path:"/toplu-evraklar"}}); }

    const trip=raw.match(/(?:sefer(?:\s*no|\s*numarası)?\s*[:#-]?\s*)([A-Za-z0-9._\/-]{2,})/i);
    if(trip){ const val=trip[1], rows=await searchDocs({sefer:val}); return bot(rows.length?`“${val}” için ${rows.length} evrak buldum.`:`“${val}” sefer numarasıyla evrak bulamadım.`,{docs:docCards(rows,meta),action:rows.length?{label:"Tüm Evraklar'da doğru satıra git",path:"/toplu-evraklar",params:{aiSefer:val,aiEvrakId:rows[0].id}}:null,chips:["Lokasyona göre evrak bul","Projeye göre evrak bul"]}); }
    const evid=raw.match(/(?:evrak\s*(?:no|numarası|#)?\s*[:#-]?\s*)(\d+)/i); if(evid){ const rows=await searchDocs({id:evid[1]}); return bot(rows.length?`Evrak #${evid[1]} bulundu.`:`Evrak #${evid[1]} bulunamadı.`,{docs:docCards(rows,meta),action:rows.length?{label:"Tüm Evraklar'da aç",path:"/toplu-evraklar",params:{aiEvrakId:rows[0].id}}:null}); }

    const loc=meta.loc.find(x=>q.includes(low(x.lokasyon))); if(loc){ const rows=await searchDocs({locIds:[String(loc.id)]}); return bot(`${loc.lokasyon} lokasyonunda ${rows.length} evrak buldum.`,{docs:docCards(rows,meta),action:{label:`${loc.lokasyon} filtresini uygula`,path:"/toplu-evraklar",params:{aiLokasyon:[String(loc.id)]}},chips:["Bugünkü evrakları göster","Açıklamaya göre evrak bul"]}); }
    const proj=meta.proj.find(x=>q.includes(low(x.proje))); if(proj){ const rows=await searchDocs({projIds:[String(proj.id)]}); return bot(`${proj.proje} projesinde ${rows.length} evrak buldum.`,{docs:docCards(rows,meta),action:{label:`${proj.proje} filtresini uygula`,path:"/toplu-evraklar",params:{aiProje:[String(proj.id)]}}}); }
    const desc=raw.match(/(?:açıklama(?:sı)?|aciklama)\s*[:#-]?\s*["']?(.{2,})["']?$/i); if(desc){ const val=desc[1].trim(),rows=await searchDocs({desc:val}); return bot(`Açıklamasında “${val}” geçen ${rows.length} evrak buldum.`,{docs:docCards(rows,meta),action:{label:"Açıklama filtresini uygula",path:"/toplu-evraklar",params:{aiAciklama:val}}}); }

    if(/irsaliye|gönderi|odak|kargo|firma/.test(q)){ const terms=raw.match(/[A-Za-z0-9ÇĞİÖŞÜçğıöşü._\/-]{3,}/g)||[]; const stop=new Set(["irsaliye","gönderi","gonderi","numarası","numarasi","odak","evrak","kargo","firma","firması","firmasi","gönderen","gonderen","ara","bul","göster","goster"]); const term=[...terms].reverse().find(x=>!stop.has(low(x))); if(term){ const rows=await searchCargo(term); return bot(rows.length?`“${term}” için ${rows.length} kargo kaydı buldum.`:`“${term}” için kargo kaydı bulamadım.`,{cargo:rows,action:rows.length?{label:"Tüm Kargo Bilgileri'ni aç",path:"/tum-kargo-bilgileri"}:null,chips:["Sefer no ile evrak bul","Bugünkü evrakları göster"]}); } }

    // Serbest arama: kullanıcı sadece "Eskişehir", "12345" veya bir açıklama yazsa bile tüm evrak alanlarını sırayla dener.
    const bare = raw.trim();
    if (bare.length >= 2) {
      const bareLoc = meta.loc.find(x => low(x.lokasyon) === q || low(x.lokasyon).includes(q) || q.includes(low(x.lokasyon)));
      if (bareLoc) {
        const rows = await searchDocs({ locIds: [String(bareLoc.id)] });
        return bot(`${bareLoc.lokasyon} lokasyonunda ${rows.length} evrak buldum.`, { docs: docCards(rows, meta), action: { label: `${bareLoc.lokasyon} filtresiyle Tüm Evraklar'ı aç`, path: "/toplu-evraklar", params: { aiLokasyon: [String(bareLoc.id)] } }, chips: ["Bugünkü evrakları göster", "Son 7 gün evrakları"] });
      }
      const bareProj = meta.proj.find(x => low(x.proje) === q || low(x.proje).includes(q) || q.includes(low(x.proje)));
      if (bareProj) {
        const rows = await searchDocs({ projIds: [String(bareProj.id)] });
        return bot(`${bareProj.proje} projesinde ${rows.length} evrak buldum.`, { docs: docCards(rows, meta), action: { label: `${bareProj.proje} filtresiyle Tüm Evraklar'ı aç`, path: "/toplu-evraklar", params: { aiProje: [String(bareProj.id)] } } });
      }
      // Önce sefer no: çıplak sayısal/değer girişlerinde en önemli operasyon araması.
      const tripRows = await searchDocs({ sefer: bare });
      if (tripRows.length) return bot(`“${bare}” değeri sefer numarasında eşleşti. ${tripRows.length} evrak buldum.`, { docs: docCards(tripRows, meta), action: { label: `Sefer ${bare} satırına git`, path: "/toplu-evraklar", params: { aiSefer: bare, aiEvrakId: tripRows[0].id } }, chips: ["Lokasyona göre evrak bul", "Projeye göre evrak bul"] });
      if (/^\d+$/.test(bare)) {
        const idRows = await searchDocs({ id: bare });
        if (idRows.length) return bot(`“${bare}” evrak numarası olarak eşleşti.`, { docs: docCards(idRows, meta), action: { label: `Evrak #${bare} satırına git`, path: "/toplu-evraklar", params: { aiEvrakId: bare } } });
      }
      const descRows = await searchDocs({ desc: bare });
      if (descRows.length) return bot(`“${bare}” açıklamasında geçen ${descRows.length} evrak buldum.`, { docs: docCards(descRows, meta), action: { label: `“${bare}” açıklama filtresini uygula`, path: "/toplu-evraklar", params: { aiAciklama: bare } } });
      const cargoRows = await searchCargo(bare);
      if (cargoRows.length) return bot(`“${bare}” değeri kargo bilgilerinde eşleşti. ${cargoRows.length} kayıt buldum.`, { cargo: cargoRows, action: { label: "Tüm Kargo Bilgileri'ni aç", path: "/tum-kargo-bilgileri" } });
    }

    return bot("Bu değer Tüm Evraklar, seferler, lokasyonlar, projeler, açıklamalar ve kargo bilgilerinde bulunamadı. Sefer no, lokasyon, proje, açıklama, irsaliye veya gönderi numarası yazabilirsin.",{chips:QUICK});
  };
  const send=async(v)=>{ const text=String(v??input).trim(); if(!text||busy)return; setMessages(m=>[...m,{id:`${Date.now()}u`,role:"user",text}]); setInput(""); setBusy(true); try{await answer(text)}catch(e){console.error(e);bot("Veriyi sorgularken bir hata oluştu. Sorguyu daha kısa bir değerle tekrar deneyebilirsin.",{chips:QUICK.slice(0,6)})}finally{setBusy(false)}};

  return <><AnimatePresence>{open&&<motion.div initial={{opacity:0,y:20,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:18,scale:.96}} className="fixed bottom-24 right-5 z-[12000] flex h-[min(760px,calc(100vh-125px))] w-[min(480px,calc(100vw-28px))] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,.24)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#07111f]/95">
    <div className="relative overflow-hidden bg-gradient-to-br from-[#111827] via-[#172554] to-[#312e81] px-5 pb-5 pt-4 text-white"><div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-indigo-300/15 blur-3xl"/><div className="relative flex items-center gap-3"><RobotAvatar compact/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-lg font-black">AI Asistan</span><span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[9px] font-black text-emerald-200">CANLI VERİ</span></div><p className="mt-1 text-[11px] font-semibold text-indigo-100/75">Tüm ekranlarda ara • filtrele • bul • yönlendir</p></div><button onClick={()=>setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><X size={17}/></button></div></div>
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f7f8fc] p-4 text-slate-800 dark:bg-[#07111f] dark:text-slate-100">{messages.map(m=><div key={m.id} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}><div className="max-w-[92%]">{m.role==="bot"&&<div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300"><Sparkles size={12}/> AI Asistan</div>}<div className={m.role==="user"?"rounded-[18px] rounded-br-[6px] bg-gradient-to-br from-[#1e293b] to-[#312e81] px-4 py-3 text-[13px] font-semibold leading-5 text-white dark:bg-indigo-600":"rounded-[18px] rounded-tl-[6px] border border-slate-200/80 bg-white px-4 py-3 text-[13px] font-medium leading-5 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[.055] dark:text-slate-200"}>{m.text}</div>
      {m.docs?.length>0&&<div className="mt-2 space-y-2">{m.docs.map(r=><button key={r.id} onClick={()=>go("/toplu-evraklar",{aiEvrakId:r.evrakId,aiSefer:r.sefer})} className="w-full rounded-2xl border border-indigo-100 bg-indigo-50/80 p-3 text-left transition hover:border-indigo-400 dark:border-indigo-400/15 dark:bg-indigo-400/[.06]"><div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white"><FileSearch size={14} className="text-indigo-600"/>{r.title}</div><div className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{r.subtitle}</div><div className="mt-1 text-[9px] font-bold text-slate-400">{r.meta}</div><div className="mt-2 flex items-center gap-1 text-[10px] font-black text-indigo-700">Tüm Evraklar'da satıra git <ChevronRight size={12}/></div></button>)}</div>}
      {m.cargo?.length>0&&<div className="mt-2 space-y-2">{m.cargo.slice(0,6).map(r=><div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] shadow-sm dark:border-white/10 dark:bg-white/[.05]"><b className="text-xs text-slate-800 dark:text-white">{r.kargo_firmasi||"Kargo kaydı"}</b><div className="mt-2 grid grid-cols-2 gap-1 text-slate-500"><span>Gönderi: <b>{r.gonderi_numarasi||"—"}</b></span><span>Tarih: <b>{fmt(r.tarih)}</b></span><span className="col-span-2">İrsaliye: <b>{r.irsaliye_no||"—"}</b></span><span className="col-span-2">Odak Evrak: <b>{r.odak_evrak_no||"—"}</b></span></div></div>)}</div>}
      {m.action&&<button onClick={()=>go(m.action.path,m.action.params||{})} className="mt-2 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-xs font-black text-white shadow-sm">{m.action.label}<ChevronRight size={15}/></button>}
      {m.chips&&<div className="mt-2 flex flex-wrap gap-1.5">{m.chips.map(c=><button key={c} onClick={()=>send(c)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-700 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300">{c}</button>)}</div>}
    </div></div>)}{busy&&<div className="flex items-center gap-2 text-xs font-bold text-slate-400"><Loader2 size={15} className="animate-spin text-indigo-500"/> Tablolar taranıyor…</div>}</div>
    <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#08111e]"><div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400 dark:border-white/10 dark:bg-white/[.04]"><textarea rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Örn: Sefer 12345, Adana lokasyonu, irsaliye 987…" className="max-h-24 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-xs font-semibold outline-none dark:text-white"/><button disabled={!input.trim()||busy} onClick={()=>send()} className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white disabled:opacity-35"><Send size={16}/></button></div></div>
  </motion.div>}</AnimatePresence><motion.button onClick={()=>setOpen(v=>!v)} whileHover={{y:-3,scale:1.06}} whileTap={{scale:.94}} className="fixed bottom-5 right-5 z-[11990] grid h-16 w-16 place-items-center rounded-full border border-white bg-gradient-to-br from-white to-indigo-50 shadow-[0_16px_45px_rgba(49,46,129,.28)] ring-1 ring-indigo-100 dark:border-white/10 dark:from-[#101827] dark:to-[#0b1220] dark:ring-white/10" title="AI Asistan"><RobotAvatar compact/></motion.button></>;
}
