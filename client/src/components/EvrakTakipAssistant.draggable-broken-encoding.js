import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FileSearch, Loader2, MapPin, Send, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useTabStore from "../stores/tabStore";
import { screenRegistry } from "../screenRegistry";

const low = (v) => String(v || "").toLocaleLowerCase("tr-TR");
const fmt = (v) => v ? new Date(v).toLocaleDateString("tr-TR") : "â€”";
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today = () => ymd(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return ymd(d); };

const QUICK = [
  "Sefer no ile evrak bul", "Evrak numarasÄ±yla bul", "Lokasyona gÃ¶re evrak bul", "Projeye gÃ¶re evrak bul",
  "AÃ§Ä±klamaya gÃ¶re evrak bul", "BugÃ¼nkÃ¼ evraklarÄ± gÃ¶ster", "Son 7 gÃ¼n evraklarÄ±", "Ä°rsaliye ara",
  "GÃ¶nderi numarasÄ± ara", "Odak evrak no ara", "Kargo firmasÄ±na gÃ¶re ara", "GÃ¶nderen firmaya gÃ¶re ara"
];

const starter = { id:"welcome", role:"bot", text:"Merhaba! Ben AI Asistan. TÃ¼m Evraklar ve kargo tablolarÄ±nda arama yapabilir, filtreleri senin yerine uygulayabilir ve istediÄŸin ekrana doÄŸrudan gÃ¶tÃ¼rebilirim.", chips: QUICK.slice(0,8) };

const RobotAvatar = ({ compact=false }) => <div className={`relative ${compact?"h-12 w-12":"h-24 w-24"} shrink-0`}>
  <motion.div animate={{y:[0,-3,0],rotate:[-1,1,-1]}} transition={{duration:3,repeat:Infinity}} className="absolute inset-0">
    <div className="absolute left-[16%] top-[5%] h-[58%] w-[68%] rounded-[42%] border border-cyan-100 bg-gradient-to-br from-white via-slate-100 to-slate-400 shadow-[0_0_24px_rgba(34,211,238,.32)]">
      <div className="absolute inset-[13%] rounded-[38%] bg-gradient-to-br from-[#071426] to-[#0b3152]"><i className="absolute left-[23%] top-[38%] h-[15%] w-[13%] rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]"/><i className="absolute right-[23%] top-[38%] h-[15%] w-[13%] rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]"/><i className="absolute bottom-[20%] left-[39%] h-[8%] w-[23%] rounded-b-full border-b-2 border-cyan-200"/></div>
    </div><div className="absolute bottom-[3%] left-[27%] h-[38%] w-[46%] rounded-[45%] border border-white bg-gradient-to-br from-white to-slate-400"><i className="absolute left-1/2 top-[30%] h-[28%] w-[28%] -translate-x-1/2 rounded-lg bg-cyan-400 shadow-[0_0_14px_#22d3ee]"/></div>
  </motion.div>
</div>;

export default function EvrakTakipAssistant(){
  const [open,setOpen]=useState(false), [messages,setMessages]=useState([starter]), [input,setInput]=useState(""), [busy,setBusy]=useState(false);

  // Robot konumu / gizleme durumu
  const [robotPos,setRobotPos]=useState(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem("bapsis-assistant-position")||"null");
      if(saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
    }catch{}
    return {x:null,y:null};
  });

  const [robotHidden,setRobotHidden]=useState(()=>{
    try{return localStorage.getItem("bapsis-assistant-hidden")==="1"}catch{return false}
  });

  const [hiddenSide,setHiddenSide]=useState(()=>{
    try{return localStorage.getItem("bapsis-assistant-side")||"right"}catch{return "right"}
  });

  const dragRef=useRef(null);
  const dragData=useRef(null);
  const scrollRef=useRef(null); const navigate=useNavigate(); const openTab=useTabStore(s=>s.openTab);
  useEffect(()=>{ if(open) setTimeout(()=>scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"}),50); },[messages,busy,open]);

  // Kaydedilmiş robot konumunu ekran sınırları içinde tut.
  useEffect(()=>{
    const clampRobot=()=>{
      setRobotPos(p=>{
        if(p.x===null || p.y===null) return p;

        const size=64;
        const gap=12;

        const next={
          x:Math.max(gap,Math.min(p.x,window.innerWidth-size-gap)),
          y:Math.max(gap,Math.min(p.y,window.innerHeight-size-gap))
        };

        try{
          localStorage.setItem("bapsis-assistant-position",JSON.stringify(next));
        }catch{}

        return next;
      });
    };

    window.addEventListener("resize",clampRobot);
    return ()=>window.removeEventListener("resize",clampRobot);
  },[]);

  const saveRobotPosition=(pos)=>{
    setRobotPos(pos);
    try{
      localStorage.setItem("bapsis-assistant-position",JSON.stringify(pos));
    }catch{}
  };

  const hideRobot=(side)=>{
    const nextSide=side==="left"?"left":"right";
    setOpen(false);
    setRobotHidden(true);
    setHiddenSide(nextSide);

    try{
      localStorage.setItem("bapsis-assistant-hidden","1");
      localStorage.setItem("bapsis-assistant-side",nextSide);
    }catch{}
  };

  const showRobot=()=>{
    setRobotHidden(false);

    try{
      localStorage.setItem("bapsis-assistant-hidden","0");
    }catch{}
  };

  const handleRobotPointerDown=(e)=>{
    // Mouse/touch ile sürükleme. Butonun normal tıklaması da korunur.
    if(e.button!==undefined && e.button!==0) return;

    const rect=e.currentTarget.getBoundingClientRect();

    dragData.current={
      pointerId:e.pointerId,
      startX:e.clientX,
      startY:e.clientY,
      originX:rect.left,
      originY:rect.top,
      moved:false
    };

    try{
      e.currentTarget.setPointerCapture(e.pointerId);
    }catch{}
  };

  const handleRobotPointerMove=(e)=>{
    const d=dragData.current;
    if(!d || d.pointerId!==e.pointerId) return;

    const dx=e.clientX-d.startX;
    const dy=e.clientY-d.startY;

    if(Math.abs(dx)>4 || Math.abs(dy)>4) d.moved=true;
    if(!d.moved) return;

    const size=64;
    const gap=8;

    const next={
      x:Math.max(gap,Math.min(d.originX+dx,window.innerWidth-size-gap)),
      y:Math.max(gap,Math.min(d.originY+dy,window.innerHeight-size-gap))
    };

    setRobotPos(next);
  };

  const handleRobotPointerUp=(e)=>{
    const d=dragData.current;
    if(!d || d.pointerId!==e.pointerId) return;

    if(d.moved){
      const size=64;
      const gap=8;

      const rect=e.currentTarget.getBoundingClientRect();

      const next={
        x:Math.max(gap,Math.min(rect.left,window.innerWidth-size-gap)),
        y:Math.max(gap,Math.min(rect.top,window.innerHeight-size-gap))
      };

      saveRobotPosition(next);

      // Kenara çok yaklaştırılırsa otomatik olarak o kenara gizle.
      const centerX=next.x+(size/2);

      if(centerX<85){
        hideRobot("left");
      }else if(centerX>window.innerWidth-85){
        hideRobot("right");
      }
    }

    try{
      e.currentTarget.releasePointerCapture(e.pointerId);
    }catch{}

    setTimeout(()=>{
      dragData.current=null;
    },0);
  };

  const handleRobotClick=()=>{
    // Sürükleme tamamlandığında yanlışlıkla sohbet açılmasını engelle.
    if(dragData.current?.moved) return;
    setOpen(v=>!v);
  };

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
  const docCards=(rows,meta)=>rows.slice(0,8).map(x=>({id:x.id,title:`Evrak #${x.id}`,subtitle:`${fmt(x.tarih)} â€¢ ${meta.loc.find(l=>String(l.id)===String(x.lokasyonid))?.lokasyon||"Lokasyon yok"}`,meta:`${x.sefersayisi||0} sefer â€¢ ${(x.evrakseferler||[]).slice(0,3).map(s=>s.seferno).filter(Boolean).join(", ")||"Sefer no yok"}`,evrakId:x.id,sefer:(x.evrakseferler||[])[0]?.seferno||""}));
  const searchCargo=async(term)=>{ const s=String(term).replace(/[,%()]/g," ").trim(); const {data,error}=await supabase.from("kargo_bilgileri").select("*").or(`gonderi_numarasi.ilike.%${s}%,irsaliye_no.ilike.%${s}%,odak_evrak_no.ilike.%${s}%,kargo_firmasi.ilike.%${s}%,gonderen_firma.ilike.%${s}%`).order("tarih",{ascending:false}).limit(10); if(error)throw error; return data||[]; };

  const screenCommand=(q)=>{ const aliases=[
    ["tÃ¼m evrak","/toplu-evraklar"],["toplu evrak","/toplu-evraklar"],["tÃ¼m kargo","/tum-kargo-bilgileri"],["hedef kargo","/hedef-kargo"],["evrak ekle","/evrak-ekle"],["kargo bilgisi ekle","/kargo-bilgisi-ekle"],["tutanak","/tutanak"],["rapor merkezi","/rapor-merkezi"],["evrak rapor","/evrak-raporlari"],["tahakkuk takip","/tahakkuk-takip"],["tahakkuk","/tahakkuk"],["mÃ¼ÅŸteri evrak","/musteri-evraki"],["lokasyon","/lokasyonlar"],["proje","/projeler"],["gÃ¶rev","/gorev-merkezi"],["takvim","/operasyon-takvimi"],["anasayfa","/anasayfa"]
  ]; return aliases.find(([a])=>q.includes(a)); };

  const answer=async(raw)=>{
    const q=low(raw).trim();
    if(/^(sefer no ile evrak bul|evrak numarasÄ±yla bul|lokasyona gÃ¶re evrak bul|projeye gÃ¶re evrak bul|aÃ§Ä±klamaya gÃ¶re evrak bul|irsaliye ara|gÃ¶nderi numarasÄ± ara|odak evrak no ara|kargo firmasÄ±na gÃ¶re ara|gÃ¶nderen firmaya gÃ¶re ara)$/i.test(raw.trim())) return bot(`Aramak istediÄŸin deÄŸeri yaz. â€œ${raw}â€ seÃ§eneÄŸine gÃ¶re ilgili tabloda arayacaÄŸÄ±m.`,{chips:["BugÃ¼nkÃ¼ evraklarÄ± gÃ¶ster","Son 7 gÃ¼n evraklarÄ±","TÃ¼m Evraklar'Ä± aÃ§"]});
    const scr=screenCommand(q); if(scr && /aÃ§|git|gÃ¶ster|ekran/.test(q)) return bot(`${scr[0]} ekranÄ±nÄ± aÃ§abilirim.`,{action:{label:"EkranÄ± aÃ§",path:scr[1]},chips:QUICK.slice(0,4)});

    const meta=await loadMeta();
    if(/bugÃ¼n.*evrak|bugÃ¼nkÃ¼ evrak/.test(q)){ const rows=await searchDocs({start:today(),end:today()}); return bot(`BugÃ¼n ${rows.length} evrak kaydÄ± var.`,{docs:docCards(rows,meta),action:{label:`TÃ¼m Evraklar'da ${rows.length} kaydÄ± gÃ¶ster`,path:"/toplu-evraklar",params:{aiStartDate:today(),aiEndDate:today()}},chips:["Son 7 gÃ¼n evraklarÄ±","Toplam kaÃ§ sefer var?"]}); }
    if(/son 7 gÃ¼n.*evrak|son 7 gÃ¼nÃ¼.*evrak/.test(q)){ const rows=await searchDocs({start:daysAgo(6),end:today()}); return bot(`Son 7 gÃ¼nde ${rows.length} evrak ve ${rows.reduce((a,x)=>a+(Number(x.sefersayisi)||0),0)} sefer var.`,{docs:docCards(rows,meta),action:{label:"Son 7 gÃ¼nÃ¼ TÃ¼m Evraklar'da aÃ§",path:"/toplu-evraklar",params:{aiStartDate:daysAgo(6),aiEndDate:today()}}}); }
    if(/toplam kaÃ§ sefer/.test(q)){ const rows=await searchDocs(); return bot(`TÃ¼m Evraklar'da toplam ${rows.reduce((a,x)=>a+(Number(x.sefersayisi)||0),0)} sefer bulunuyor.`,{action:{label:"TÃ¼m Evraklar'Ä± aÃ§",path:"/toplu-evraklar"}}); }

    const trip=raw.match(/(?:sefer(?:\s*no|\s*numarasÄ±)?\s*[:#-]?\s*)([A-Za-z0-9._\/-]{2,})/i);
    if(trip){ const val=trip[1], rows=await searchDocs({sefer:val}); return bot(rows.length?`â€œ${val}â€ iÃ§in ${rows.length} evrak buldum.`:`â€œ${val}â€ sefer numarasÄ±yla evrak bulamadÄ±m.`,{docs:docCards(rows,meta),action:rows.length?{label:"TÃ¼m Evraklar'da doÄŸru satÄ±ra git",path:"/toplu-evraklar",params:{aiSefer:val,aiEvrakId:rows[0].id}}:null,chips:["Lokasyona gÃ¶re evrak bul","Projeye gÃ¶re evrak bul"]}); }
    const evid=raw.match(/(?:evrak\s*(?:no|numarasÄ±|#)?\s*[:#-]?\s*)(\d+)/i); if(evid){ const rows=await searchDocs({id:evid[1]}); return bot(rows.length?`Evrak #${evid[1]} bulundu.`:`Evrak #${evid[1]} bulunamadÄ±.`,{docs:docCards(rows,meta),action:rows.length?{label:"TÃ¼m Evraklar'da aÃ§",path:"/toplu-evraklar",params:{aiEvrakId:rows[0].id}}:null}); }

    const loc=meta.loc.find(x=>q.includes(low(x.lokasyon))); if(loc){ const rows=await searchDocs({locIds:[String(loc.id)]}); return bot(`${loc.lokasyon} lokasyonunda ${rows.length} evrak buldum.`,{docs:docCards(rows,meta),action:{label:`${loc.lokasyon} filtresini uygula`,path:"/toplu-evraklar",params:{aiLokasyon:[String(loc.id)]}},chips:["BugÃ¼nkÃ¼ evraklarÄ± gÃ¶ster","AÃ§Ä±klamaya gÃ¶re evrak bul"]}); }
    const proj=meta.proj.find(x=>q.includes(low(x.proje))); if(proj){ const rows=await searchDocs({projIds:[String(proj.id)]}); return bot(`${proj.proje} projesinde ${rows.length} evrak buldum.`,{docs:docCards(rows,meta),action:{label:`${proj.proje} filtresini uygula`,path:"/toplu-evraklar",params:{aiProje:[String(proj.id)]}}}); }
    const desc=raw.match(/(?:aÃ§Ä±klama(?:sÄ±)?|aciklama)\s*[:#-]?\s*["']?(.{2,})["']?$/i); if(desc){ const val=desc[1].trim(),rows=await searchDocs({desc:val}); return bot(`AÃ§Ä±klamasÄ±nda â€œ${val}â€ geÃ§en ${rows.length} evrak buldum.`,{docs:docCards(rows,meta),action:{label:"AÃ§Ä±klama filtresini uygula",path:"/toplu-evraklar",params:{aiAciklama:val}}}); }

    if(/irsaliye|gÃ¶nderi|odak|kargo|firma/.test(q)){ const terms=raw.match(/[A-Za-z0-9Ã‡ÄÄ°Ã–ÅÃœÃ§ÄŸÄ±Ã¶ÅŸÃ¼._\/-]{3,}/g)||[]; const stop=new Set(["irsaliye","gÃ¶nderi","gonderi","numarasÄ±","numarasi","odak","evrak","kargo","firma","firmasÄ±","firmasi","gÃ¶nderen","gonderen","ara","bul","gÃ¶ster","goster"]); const term=[...terms].reverse().find(x=>!stop.has(low(x))); if(term){ const rows=await searchCargo(term); return bot(rows.length?`â€œ${term}â€ iÃ§in ${rows.length} kargo kaydÄ± buldum.`:`â€œ${term}â€ iÃ§in kargo kaydÄ± bulamadÄ±m.`,{cargo:rows,action:rows.length?{label:"TÃ¼m Kargo Bilgileri'ni aÃ§",path:"/tum-kargo-bilgileri"}:null,chips:["Sefer no ile evrak bul","BugÃ¼nkÃ¼ evraklarÄ± gÃ¶ster"]}); } }

    // Serbest arama: kullanÄ±cÄ± sadece "EskiÅŸehir", "12345" veya bir aÃ§Ä±klama yazsa bile tÃ¼m evrak alanlarÄ±nÄ± sÄ±rayla dener.
    const bare = raw.trim();
    if (bare.length >= 2) {
      const bareLoc = meta.loc.find(x => low(x.lokasyon) === q || low(x.lokasyon).includes(q) || q.includes(low(x.lokasyon)));
      if (bareLoc) {
        const rows = await searchDocs({ locIds: [String(bareLoc.id)] });
        return bot(`${bareLoc.lokasyon} lokasyonunda ${rows.length} evrak buldum.`, { docs: docCards(rows, meta), action: { label: `${bareLoc.lokasyon} filtresiyle TÃ¼m Evraklar'Ä± aÃ§`, path: "/toplu-evraklar", params: { aiLokasyon: [String(bareLoc.id)] } }, chips: ["BugÃ¼nkÃ¼ evraklarÄ± gÃ¶ster", "Son 7 gÃ¼n evraklarÄ±"] });
      }
      const bareProj = meta.proj.find(x => low(x.proje) === q || low(x.proje).includes(q) || q.includes(low(x.proje)));
      if (bareProj) {
        const rows = await searchDocs({ projIds: [String(bareProj.id)] });
        return bot(`${bareProj.proje} projesinde ${rows.length} evrak buldum.`, { docs: docCards(rows, meta), action: { label: `${bareProj.proje} filtresiyle TÃ¼m Evraklar'Ä± aÃ§`, path: "/toplu-evraklar", params: { aiProje: [String(bareProj.id)] } } });
      }
      // Ã–nce sefer no: Ã§Ä±plak sayÄ±sal/deÄŸer giriÅŸlerinde en Ã¶nemli operasyon aramasÄ±.
      const tripRows = await searchDocs({ sefer: bare });
      if (tripRows.length) return bot(`â€œ${bare}â€ deÄŸeri sefer numarasÄ±nda eÅŸleÅŸti. ${tripRows.length} evrak buldum.`, { docs: docCards(tripRows, meta), action: { label: `Sefer ${bare} satÄ±rÄ±na git`, path: "/toplu-evraklar", params: { aiSefer: bare, aiEvrakId: tripRows[0].id } }, chips: ["Lokasyona gÃ¶re evrak bul", "Projeye gÃ¶re evrak bul"] });
      if (/^\d+$/.test(bare)) {
        const idRows = await searchDocs({ id: bare });
        if (idRows.length) return bot(`â€œ${bare}â€ evrak numarasÄ± olarak eÅŸleÅŸti.`, { docs: docCards(idRows, meta), action: { label: `Evrak #${bare} satÄ±rÄ±na git`, path: "/toplu-evraklar", params: { aiEvrakId: bare } } });
      }
      const descRows = await searchDocs({ desc: bare });
      if (descRows.length) return bot(`â€œ${bare}â€ aÃ§Ä±klamasÄ±nda geÃ§en ${descRows.length} evrak buldum.`, { docs: docCards(descRows, meta), action: { label: `â€œ${bare}â€ aÃ§Ä±klama filtresini uygula`, path: "/toplu-evraklar", params: { aiAciklama: bare } } });
      const cargoRows = await searchCargo(bare);
      if (cargoRows.length) return bot(`â€œ${bare}â€ deÄŸeri kargo bilgilerinde eÅŸleÅŸti. ${cargoRows.length} kayÄ±t buldum.`, { cargo: cargoRows, action: { label: "TÃ¼m Kargo Bilgileri'ni aÃ§", path: "/tum-kargo-bilgileri" } });
    }

    return bot("Bu deÄŸer TÃ¼m Evraklar, seferler, lokasyonlar, projeler, aÃ§Ä±klamalar ve kargo bilgilerinde bulunamadÄ±. Sefer no, lokasyon, proje, aÃ§Ä±klama, irsaliye veya gÃ¶nderi numarasÄ± yazabilirsin.",{chips:QUICK});
  };
  const send=async(v)=>{ const text=String(v??input).trim(); if(!text||busy)return; setMessages(m=>[...m,{id:`${Date.now()}u`,role:"user",text}]); setInput(""); setBusy(true); try{await answer(text)}catch(e){console.error(e);bot("Veriyi sorgularken bir hata oluÅŸtu. Sorguyu daha kÄ±sa bir deÄŸerle tekrar deneyebilirsin.",{chips:QUICK.slice(0,6)})}finally{setBusy(false)}};

  return <><AnimatePresence>{open&&<motion.div initial={{opacity:0,y:20,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:18,scale:.96}} className="fixed bottom-24 right-5 z-[12000] flex h-[min(760px,calc(100vh-125px))] w-[min(480px,calc(100vw-28px))] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,.24)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#07111f]/95">
    <div className="relative overflow-hidden bg-gradient-to-br from-[#111827] via-[#172554] to-[#312e81] px-5 pb-5 pt-4 text-white"><div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-indigo-300/15 blur-3xl"/><div className="relative flex items-center gap-3"><RobotAvatar compact/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-lg font-black">AI Asistan</span><span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[9px] font-black text-emerald-200">CANLI VERÄ°</span></div><p className="mt-1 text-[11px] font-semibold text-indigo-100/75">TÃ¼m ekranlarda ara â€¢ filtrele â€¢ bul â€¢ yÃ¶nlendir</p></div><button onClick={()=>setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><X size={17}/></button></div></div>
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f7f8fc] p-4 text-slate-800 dark:bg-[#07111f] dark:text-slate-100">{messages.map(m=><div key={m.id} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}><div className="max-w-[92%]">{m.role==="bot"&&<div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300"><Sparkles size={12}/> AI Asistan</div>}<div className={m.role==="user"?"rounded-[18px] rounded-br-[6px] bg-gradient-to-br from-[#1e293b] to-[#312e81] px-4 py-3 text-[13px] font-semibold leading-5 text-white dark:bg-indigo-600":"rounded-[18px] rounded-tl-[6px] border border-slate-200/80 bg-white px-4 py-3 text-[13px] font-medium leading-5 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[.055] dark:text-slate-200"}>{m.text}</div>
      {m.docs?.length>0&&<div className="mt-2 space-y-2">{m.docs.map(r=><button key={r.id} onClick={()=>go("/toplu-evraklar",{aiEvrakId:r.evrakId,aiSefer:r.sefer})} className="w-full rounded-2xl border border-indigo-100 bg-indigo-50/80 p-3 text-left transition hover:border-indigo-400 dark:border-indigo-400/15 dark:bg-indigo-400/[.06]"><div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white"><FileSearch size={14} className="text-indigo-600"/>{r.title}</div><div className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{r.subtitle}</div><div className="mt-1 text-[9px] font-bold text-slate-400">{r.meta}</div><div className="mt-2 flex items-center gap-1 text-[10px] font-black text-indigo-700">TÃ¼m Evraklar'da satÄ±ra git <ChevronRight size={12}/></div></button>)}</div>}
      {m.cargo?.length>0&&<div className="mt-2 space-y-2">{m.cargo.slice(0,6).map(r=><div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] shadow-sm dark:border-white/10 dark:bg-white/[.05]"><b className="text-xs text-slate-800 dark:text-white">{r.kargo_firmasi||"Kargo kaydÄ±"}</b><div className="mt-2 grid grid-cols-2 gap-1 text-slate-500"><span>GÃ¶nderi: <b>{r.gonderi_numarasi||"â€”"}</b></span><span>Tarih: <b>{fmt(r.tarih)}</b></span><span className="col-span-2">Ä°rsaliye: <b>{r.irsaliye_no||"â€”"}</b></span><span className="col-span-2">Odak Evrak: <b>{r.odak_evrak_no||"â€”"}</b></span></div></div>)}</div>}
      {m.action&&<button onClick={()=>go(m.action.path,m.action.params||{})} className="mt-2 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-xs font-black text-white shadow-sm">{m.action.label}<ChevronRight size={15}/></button>}
      {m.chips&&<div className="mt-2 flex flex-wrap gap-1.5">{m.chips.map(c=><button key={c} onClick={()=>send(c)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-700 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300">{c}</button>)}</div>}
    </div></div>)}{busy&&<div className="flex items-center gap-2 text-xs font-bold text-slate-400"><Loader2 size={15} className="animate-spin text-indigo-500"/> Tablolar taranÄ±yorâ€¦</div>}</div>
    <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#08111e]"><div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400 dark:border-white/10 dark:bg-white/[.04]"><textarea rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ã–rn: Sefer 12345, Adana lokasyonu, irsaliye 987â€¦" className="max-h-24 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-xs font-semibold outline-none dark:text-white"/><button disabled={!input.trim()||busy} onClick={()=>send()} className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white disabled:opacity-35"><Send size={16}/></button></div></div>
  </motion.div>}</AnimatePresence>{robotHidden ? (
    <motion.button
      initial={{opacity:0,scale:.85}}
      animate={{opacity:1,scale:1}}
      onClick={showRobot}
      className={`fixed top-1/2 z-[11990] flex h-16 -translate-y-1/2 items-center bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-[0_14px_40px_rgba(49,46,129,.35)] ${
        hiddenSide==="left"
          ?"left-0 rounded-r-2xl pl-1 pr-2"
          :"right-0 rounded-l-2xl pl-2 pr-1"
      }`}
      title="AI Asistanı göster"
      aria-label="AI Asistanı göster"
    >
      {hiddenSide==="right" && <ChevronRight className="rotate-180" size={15}/>}
      <div className="scale-[.72]">
        <RobotAvatar compact/>
      </div>
      {hiddenSide==="left" && <ChevronRight size={15}/>}
    </motion.button>
  ) : (
    <div
      ref={dragRef}
      className="fixed z-[11990]"
      style={
        robotPos.x===null || robotPos.y===null
          ? {right:20,bottom:20}
          : {left:robotPos.x,top:robotPos.y}
      }
    >
      <motion.button
        onPointerDown={handleRobotPointerDown}
        onPointerMove={handleRobotPointerMove}
        onPointerUp={handleRobotPointerUp}
        onPointerCancel={handleRobotPointerUp}
        onClick={handleRobotClick}
        whileHover={{scale:1.06}}
        whileTap={{scale:.94}}
        className="group relative grid h-16 w-16 touch-none select-none place-items-center rounded-full border border-white bg-gradient-to-br from-white to-indigo-50 shadow-[0_16px_45px_rgba(49,46,129,.28)] ring-1 ring-indigo-100 cursor-grab active:cursor-grabbing dark:border-white/10 dark:from-[#101827] dark:to-[#0b1220] dark:ring-white/10"
        title="AI Asistan • Taşımak için sürükle"
        aria-label="AI Asistan"
      >
        <RobotAvatar compact/>

        <span className="pointer-events-none absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-900 text-[9px] font-black text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          ✥
        </span>
      </motion.button>

      <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={()=>hideRobot("left")}
          className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-lg hover:bg-indigo-50 hover:text-indigo-700 dark:border-white/10 dark:bg-[#101827] dark:text-slate-300"
          title="Sola gizle"
          aria-label="Sola gizle"
        >
          <ChevronRight className="rotate-180" size={15}/>
        </button>

        <button
          type="button"
          onClick={()=>hideRobot("right")}
          className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-lg hover:bg-indigo-50 hover:text-indigo-700 dark:border-white/10 dark:bg-[#101827] dark:text-slate-300"
          title="Sağa gizle"
          aria-label="Sağa gizle"
        >
          <ChevronRight size={15}/>
        </button>
      </div>
    </div>
  )}</>;
}

