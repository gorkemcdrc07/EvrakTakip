import React, { useMemo, useState } from 'react';
import api from './apiClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiArrowLeft, FiBarChart2, FiCalendar, FiCheckCircle, FiChevronLeft, FiChevronRight,
  FiDownload, FiFileText, FiFilter, FiLayers, FiRefreshCw, FiSearch, FiTable,
  FiTruck, FiUsers, FiX, FiZap, FiAlertTriangle, FiActivity, FiBox, FiUser
} from 'react-icons/fi';


const PAGE_SIZE = 100;
const STATUS_LABELS = {
  1: 'BEKLİYOR', 2: 'ONAYLANDI', 3: 'SPOT ARAÇ PLANLAMADA', 4: 'ARAÇ ATANDI', 5: 'ARAÇ YÜKLENDİ',
  6: 'ARAÇ YOLDA', 7: 'TESLİM EDİLDİ', 8: 'TAMAMLANDI', 10: 'EKSİK EVRAK', 20: 'HASARSIZ GÖRÜNTÜ',
  30: 'HASARLI GÖRÜNTÜ İŞLENDİ', 31: 'HASARLI-ORJİNAL EVRAK', 40: 'ORJİNAL EVRAK GELDİ',
  50: 'EVRAK ARŞİVLENDİ', 80: 'ARAÇ BOŞALTMADA', 90: 'FİLO ARAÇ PLANLAMADA', 200: 'İPTAL',
};
const FOCUS_STATUSES = ['BEKLİYOR', 'EKSİK EVRAK', 'HASARLI GÖRÜNTÜ İŞLENDİ', 'HASARLI-ORJİNAL EVRAK', 'ORJİNAL EVRAK GELDİ'];
const U = (v) => (v ?? '').toString().trim().toLocaleUpperCase('tr-TR');
const PROJE_ENGEL = ['HASAR İADE', 'AKTÜL', 'KARGO HİZMETLERİ', 'HGS-YAKIT FATURA İŞLEME'].map(U);
const FIRMA_ENGEL = [
  'İZ KENT LOJİSTİK HİZMETLERİ LİMİTED ŞİRKETİ', 'ARKAS LOJİSTİK ANONİM ŞİRKETİ',
  'HEDEF TÜKETİM ÜRÜNLERİ SANAYİ VE DIŞ TİCARET ANONİM ŞİRKETİ',
  'MOKS MOBİLYA KURULUM SERVİS LOJİSTİK PETROL İTHALAT İHRACAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
  'ODAK TEDARİK ZİNCİRİ VE LOJİSTİK ANONİM ŞİRKETİ', 'KONFRUT AG TARIM ANONİM ŞİRKETİ',
].map(U);

const cx = (...a) => a.filter(Boolean).join(' ');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
const rangeLabel = (start, end) => start && end ? `${fmtDate(start)} – ${fmtDate(end)}` : start ? `${fmtDate(start)} sonrası` : end ? `${fmtDate(end)} öncesi` : 'Tüm Tarihler';
const inputDate = (d) => {
  if (!d) return 'tum-tarihler';
  const x = new Date(d); const y = x.getFullYear(); const m = String(x.getMonth() + 1).padStart(2, '0'); const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const parseFlexibleDateInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  let day, month, year;
  if (digits.length === 8) {
    day = Number(digits.slice(0, 2));
    month = Number(digits.slice(2, 4));
    year = Number(digits.slice(4, 8));
  } else {
    const parts = raw.split(/[.\/\-]/).filter(Boolean);
    if (parts.length !== 3) return undefined;
    day = Number(parts[0]); month = Number(parts[1]); year = Number(parts[2]);
    if (year < 100) year += 2000;
  }
  if (!day || !month || !year || year < 1900 || year > 2100) return undefined;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return undefined;
  d.setHours(0, 0, 0, 0);
  return d;
};
const formatDateInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};
const uniqBy = (arr, keyFn) => { const seen = new Set(); return arr.filter(x => { const k = keyFn(x); if (k == null) return true; if (seen.has(k)) return false; seen.add(k); return true; }); };
const normalize = (v) => U(v).replace(/[^A-Z0-9ÇĞİÖŞÜ]+/g, ' ').trim();

const isBaseAllowed = (item) => {
  if (U(item.VehicleWorkingTypeName) !== 'SPOT') return false;
  if (U(item.SpecialGroupName) !== 'SPOT') return false;
  if (!item.DocumentNo?.startsWith('SFR')) return false;
  if (!item.TMSDespatchInvoiceDocumentNo) return false;
  if (U(item.PlateNumber) === '34SEZ34') return false;
  if (PROJE_ENGEL.some(k => U(item.ProjectName).includes(k))) return false;
  if (FIRMA_ENGEL.includes(U(item.SupplierCurrentAccountFullTitle))) return false;
  return true;
};

const chunkDateRanges = (start, end, step = 2) => {
  const ranges = []; let cursor = new Date(start); const last = new Date(end);
  while (cursor <= last) {
    const s = new Date(cursor); const e = new Date(cursor); e.setDate(e.getDate() + step - 1); if (e > last) e.setTime(last.getTime());
    ranges.push({ start: s, end: e }); cursor.setDate(cursor.getDate() + step);
  }
  return ranges;
};

const excelBorder = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

function styleReportSheet(sheet, { title, subtitle, columns, headerRow, endRow }) {
  sheet.mergeCells(`A1:${columns}1`); sheet.getCell('A1').value = title;
  sheet.getCell('A1').font = { name: 'Aptos Display', bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = fill('FF0F172A'); sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }; sheet.getRow(1).height = 34;
  sheet.mergeCells(`A2:${columns}2`); sheet.getCell('A2').value = subtitle;
  sheet.getCell('A2').font = { name: 'Aptos', size: 10, color: { argb: 'FF475569' } }; sheet.getCell('A2').fill = fill('FFF0F9FF'); sheet.getRow(2).height = 24;
  const row = sheet.getRow(headerRow); row.height = 28;
  row.eachCell(cell => { cell.font = { name: 'Aptos', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }; cell.fill = fill('FF0284C7'); cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; cell.border = excelBorder; });
  for (let r = headerRow + 1; r <= endRow; r++) {
    const rr = sheet.getRow(r); rr.height = 22;
    rr.eachCell(cell => { cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF334155' } }; cell.fill = fill(r % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF'); cell.border = excelBorder; cell.alignment = { vertical: 'middle', wrapText: true }; });
  }
  sheet.views = [{ state: 'frozen', ySplit: headerRow, activeCell: `A${headerRow + 1}` }];
  sheet.autoFilter = { from: `A${headerRow}`, to: `${columns}${endRow}` };
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  sheet.headerFooter.oddFooter = '&L&9ODAK LOJİSTİK  |  Reel Raporları&C&9Kurumsal Rapor&R&9Sayfa &P / &N';
}

function addSummarySheet(workbook, data, startDate, endDate) {
  const sheet = workbook.addWorksheet('Yönetici Özeti', { views: [{ showGridLines: false }] });
  const uniqueSupplier = new Set(data.map(x => normalize(x.SupplierCurrentAccountFullTitle)).filter(Boolean)).size;
  const uniqueProject = new Set(data.map(x => normalize(x.ProjectName)).filter(Boolean)).size;
  const pending = data.filter(x => STATUS_LABELS[x.TMSDespatchDocumentStatu] === 'BEKLİYOR').length;
  const issue = data.filter(x => ['EKSİK EVRAK', 'HASARLI GÖRÜNTÜ İŞLENDİ', 'HASARLI-ORJİNAL EVRAK'].includes(STATUS_LABELS[x.TMSDespatchDocumentStatu])).length;
  const complete = data.filter(x => ['TESLİM EDİLDİ', 'TAMAMLANDI', 'EVRAK ARŞİVLENDİ'].includes(STATUS_LABELS[x.TMSDespatchDocumentStatu])).length;
  sheet.mergeCells('A1:H1'); sheet.getCell('A1').value = 'ODAK LOJİSTİK • REEL RAPORLARI';
  sheet.getCell('A1').font = { name: 'Aptos Display', bold: true, size: 22, color: { argb: 'FFFFFFFF' } }; sheet.getCell('A1').fill = fill('FF0F172A'); sheet.getCell('A1').alignment = { vertical: 'middle' }; sheet.getRow(1).height = 38;
  sheet.mergeCells('A2:H2'); sheet.getCell('A2').value = `${rangeLabel(startDate,endDate)}  •  Oluşturulma: ${new Date().toLocaleString('tr-TR')}`; sheet.getCell('A2').font = { color: { argb: 'FF475569' }, size: 10 }; sheet.getCell('A2').fill = fill('FFF0F9FF');
  const cards = [
    ['A4:B4', 'A5:B6', 'Toplam Sefer', data.length, 'FF0284C7'], ['C4:D4', 'C5:D6', 'Tedarikçi', uniqueSupplier, 'FF0891B2'],
    ['E4:F4', 'E5:F6', 'Proje', uniqueProject, 'FF0F766E'], ['G4:H4', 'G5:H6', 'Bekleyen', pending, 'FFF59E0B'],
    ['A8:B8', 'A9:B10', 'Sorunlu Evrak', issue, 'FFEF4444'], ['C8:D8', 'C9:D10', 'Tamamlanan', complete, 'FF10B981'],
    ['E8:F8', 'E9:F10', 'Tamamlanma Oranı', data.length ? `${Math.round((complete / data.length) * 100)}%` : '0%', 'FF2563EB'],
    ['G8:H8', 'G9:H10', 'Aktif Filtre Sonucu', data.length, 'FF334155'],
  ];
  cards.forEach(([labelRange, valueRange, label, value, color]) => { sheet.mergeCells(labelRange); sheet.mergeCells(valueRange); const l = sheet.getCell(labelRange.split(':')[0]); const v = sheet.getCell(valueRange.split(':')[0]); l.value = label; v.value = value; l.fill = fill(color); v.fill = fill('FFF8FAFC'); l.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }; v.font = { bold: true, size: 20, color: { argb: color } }; l.alignment = v.alignment = { horizontal: 'center', vertical: 'middle' }; });
  const top = (key) => Object.entries(data.reduce((m, x) => { const k = x[key] || 'Bilinmiyor'; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a,b)=>b[1]-a[1]).slice(0,8);
  sheet.getCell('A13').value = 'En Yoğun Tedarikçiler'; sheet.getCell('E13').value = 'En Yoğun Projeler';
  ['A13','E13'].forEach(c => { sheet.getCell(c).font = { bold: true, color: { argb: 'FF0F172A' }, size: 12 }; });
  top('SupplierCurrentAccountFullTitle').forEach(([name,count],i)=>{ sheet.mergeCells(`A${14+i}:C${14+i}`); sheet.getCell(`A${14+i}`).value = name; sheet.getCell(`D${14+i}`).value=count; });
  top('ProjectName').forEach(([name,count],i)=>{ sheet.mergeCells(`E${14+i}:G${14+i}`); sheet.getCell(`E${14+i}`).value = name; sheet.getCell(`H${14+i}`).value=count; });
  for(let r=14;r<=21;r++){ ['A','E'].forEach(c=>{ sheet.getCell(`${c}${r}`).font={size:10,color:{argb:'FF475569'}}; }); ['D','H'].forEach(c=>{ sheet.getCell(`${c}${r}`).font={bold:true,color:{argb:'FF0284C7'}}; sheet.getCell(`${c}${r}`).alignment={horizontal:'center'}; }); }
  sheet.columns = [{width:23},{width:14},{width:14},{width:11},{width:23},{width:14},{width:14},{width:11}];
  sheet.pageSetup = { orientation:'landscape', fitToPage:true, fitToWidth:1, fitToHeight:1 };
  return sheet;
}

const StatusBadge = ({ code }) => {
  const label = STATUS_LABELS[code] || code;
  const tone = label === 'İPTAL' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-300'
    : label === 'BEKLİYOR' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-300'
    : ['EKSİK EVRAK','HASARLI GÖRÜNTÜ İŞLENDİ','HASARLI-ORJİNAL EVRAK'].includes(label) ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-300'
    : ['ORJİNAL EVRAK GELDİ','TESLİM EDİLDİ','TAMAMLANDI','EVRAK ARŞİVLENDİ'].includes(label) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-500/10 dark:text-emerald-300'
    : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/15 dark:bg-sky-500/10 dark:text-sky-300';
  return <span className={cx('inline-flex max-w-[220px] items-center rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide',tone)}>{label}</span>;
};

function LoadingExperience({ progress, found }) {
  return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="overflow-hidden rounded-[24px] border border-sky-200/70 bg-white shadow-sm dark:border-sky-400/15 dark:bg-[#111925]">
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="relative mb-4 h-24 w-44">
        <motion.div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-sky-600" animate={{y:[0,-7,0],rotate:[0,-2,2,0]}} transition={{duration:1.45,repeat:Infinity}}><FiTruck size={58}/></motion.div>
        {[0,1,2].map(i=><motion.div key={i} className="absolute top-2 text-cyan-400" style={{left:28+i*48}} animate={{x:[-10,16],y:[0,38],opacity:[0,1,0],rotate:[0,12]}} transition={{duration:1.5,repeat:Infinity,delay:i*.3}}><FiFileText size={20}/></motion.div>)}
      </div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white">Reel kayıtlar analiz için hazırlanıyor…</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">Tarih aralığı parçalara ayrılıyor, seferler birleştiriliyor ve rapor kuralları uygulanıyor.</p>
      <div className="mt-5 w-full max-w-xl overflow-hidden rounded-full bg-slate-100 p-1 dark:bg-white/5"><motion.div className="h-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-400" animate={{width:`${progress}%`}} /></div>
      <div className="mt-2 flex w-full max-w-xl justify-between text-[11px] font-black text-slate-400"><span>{found.toLocaleString('tr-TR')} kayıt bulundu</span><span className="text-sky-600">%{progress}</span></div>
    </div>
    <div className="border-t border-slate-100 p-4 dark:border-white/5">{Array.from({length:6}).map((_,r)=><div key={r} className="mb-2 grid grid-cols-10 gap-3 rounded-xl px-3 py-3">{Array.from({length:10}).map((_,c)=><motion.div key={c} className="h-3 rounded bg-slate-100 dark:bg-white/5" animate={{opacity:[.35,1,.35]}} transition={{duration:1.2,repeat:Infinity,delay:(r+c)*.04}}/>)}</div>)}</div>
  </motion.div>;
}

const Kpi = ({ icon:Icon, label, value, helper, tone='sky' }) => <motion.div whileHover={{y:-2}} className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111925]">
  <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><motion.div key={value} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</motion.div>{helper&&<div className="mt-1 text-[11px] font-medium text-slate-400">{helper}</div>}</div><div className={cx('grid h-11 w-11 place-items-center rounded-2xl',tone==='rose'?'bg-rose-50 text-rose-500 dark:bg-rose-500/10':tone==='emerald'?'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10':'bg-sky-50 text-sky-600 dark:bg-sky-500/10')}><Icon size={20}/></div></div>
  <div className={cx('absolute bottom-0 left-0 h-[3px] w-full',tone==='rose'?'bg-rose-400':tone==='emerald'?'bg-emerald-400':'bg-gradient-to-r from-sky-500 to-cyan-400')}/>
</motion.div>;

export default function Raporlar() {
  const navigate = useNavigate();
  const today = useMemo(()=>new Date(),[]);
  const [veriler,setVeriler]=useState([]); const [loading,setLoading]=useState(false); const [hata,setHata]=useState(null);
  const [progress,setProgress]=useState(0); const [found,setFound]=useState(0);
  const [startDate,setStartDate]=useState(null); const [endDate,setEndDate]=useState(null);
  const [startDateText,setStartDateText]=useState(''); const [endDateText,setEndDateText]=useState('');
  const [filters,setFilters]=useState({firma:'',proje:'',durum:'',kullanici:''}); const [query,setQuery]=useState(''); const [page,setPage]=useState(1);

  const getUniqueValues=(key)=>[...new Set(veriler.map(x=>x[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'tr'));
  const baseData=useMemo(()=>uniqBy(veriler.filter(isBaseAllowed),x=>x.DocumentNo),[veriler]);
  const filtered=useMemo(()=>baseData.filter(item=>{
    const q=normalize(query); const hay=normalize([item.SupplierCurrentAccountFullTitle,item.ProjectName,item.DocumentNo,item.PlateNumber,item.TMSDespatchCreatedBy,item.TMSDespatchInvoiceDocumentNo].join(' '));
    return (!filters.firma||item.SupplierCurrentAccountFullTitle===filters.firma)&&(!filters.proje||item.ProjectName===filters.proje)&&(!filters.durum||String(item.TMSDespatchDocumentStatu)===String(filters.durum))&&(!filters.kullanici||item.TMSDespatchCreatedBy===filters.kullanici)&&(!q||hay.includes(q));
  }),[baseData,filters,query]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)); const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const uniqueSuppliers=new Set(filtered.map(x=>normalize(x.SupplierCurrentAccountFullTitle)).filter(Boolean)).size; const uniqueProjects=new Set(filtered.map(x=>normalize(x.ProjectName)).filter(Boolean)).size;
  const pending=filtered.filter(x=>STATUS_LABELS[x.TMSDespatchDocumentStatu]==='BEKLİYOR').length; const issue=filtered.filter(x=>['EKSİK EVRAK','HASARLI GÖRÜNTÜ İŞLENDİ','HASARLI-ORJİNAL EVRAK'].includes(STATUS_LABELS[x.TMSDespatchDocumentStatu])).length;
  const activeCount=Object.values(filters).filter(Boolean).length+(query.trim()?1:0);

  const updateDateText=(value,setText,setDate)=>{
    const cleaned=String(value||'').replace(/[^0-9.\/-]/g,'').slice(0,10);
    setText(cleaned);
    if(!cleaned){setDate(null);setPage(1);return;}
    const parsed=parseFlexibleDateInput(cleaned);
    if(parsed){setDate(parsed);setPage(1);}
  };
  const normalizeDateText=(text,setText,setDate)=>{
    if(!String(text||'').trim()){setText('');setDate(null);return;}
    const parsed=parseFlexibleDateInput(text);
    if(parsed){setDate(parsed);setText(formatDateInput(parsed));}
  };

  const fetchData=async()=>{
    setLoading(true);setHata(null);setProgress(5);setFound(0);setPage(1);
    try{
      const parsedStart=parseFlexibleDateInput(startDateText);
      const parsedEnd=parseFlexibleDateInput(endDateText);
      if(startDateText.trim() && !parsedStart) throw new Error('Başlangıç tarihi geçersiz. GG.AA.YYYY veya GGAAYYYY formatını kullanın.');
      if(endDateText.trim() && !parsedEnd) throw new Error('Bitiş tarihi geçersiz. GG.AA.YYYY veya GGAAYYYY formatını kullanın.');
      const effectiveStart=parsedStart||null;
      const effectiveEnd=parsedEnd||null;
      setStartDate(effectiveStart); setEndDate(effectiveEnd);
      if(effectiveStart)setStartDateText(formatDateInput(effectiveStart));
      if(effectiveEnd)setEndDateText(formatDateInput(effectiveEnd));
      if(effectiveStart&&effectiveEnd&&effectiveStart>effectiveEnd) throw new Error('Başlangıç tarihi bitiş tarihinden büyük olamaz.');
      const all=[];
      if(effectiveStart&&effectiveEnd){
        const ranges=chunkDateRanges(effectiveStart,effectiveEnd,2);
        for(let i=0;i<ranges.length;i++){
          const {start,end}=ranges[i]; const body={startDate:start.toISOString(),endDate:end.toISOString(),userId:1,CustomerId:0,SupplierId:0,DriverId:0,TMSDespatchId:0,VehicleId:0,DocumentPrint:'',WorkingTypesId:[]};
          const resp=await api.post('/tmsdespatches/getall',body); all.push(...(resp?.data?.Data||[])); setFound(all.length); setProgress(Math.min(94,Math.round(((i+1)/ranges.length)*92)));
        }
      }else{
        const body={startDate:effectiveStart?effectiveStart.toISOString():null,endDate:effectiveEnd?effectiveEnd.toISOString():null,userId:1,CustomerId:0,SupplierId:0,DriverId:0,TMSDespatchId:0,VehicleId:0,DocumentPrint:'',WorkingTypesId:[]};
        const resp=await api.post('/tmsdespatches/getall',body); all.push(...(resp?.data?.Data||[])); setFound(all.length); setProgress(94);
      }
      setVeriler(all);setProgress(100);
    }catch(e){console.error(e);setHata(e?.message||'Veri alınamadı. Lütfen tarih aralığını kontrol edip tekrar deneyin.');}
    finally{setTimeout(()=>setLoading(false),250);}
  };

  const resetFilters=()=>{setFilters({firma:'',proje:'',durum:'',kullanici:''});setQuery('');setPage(1);};
  const quickRange=(days)=>{const e=new Date();const s=new Date();s.setDate(e.getDate()-(days-1));setStartDate(s);setEndDate(e);setStartDateText(formatDateInput(s));setEndDateText(formatDateInput(e));setPage(1);};

  const saveWorkbook=async(workbook,name)=>{workbook.creator='Odak Lojistik';workbook.company='Odak Lojistik';workbook.created=new Date();const buffer=await workbook.xlsx.writeBuffer();saveAs(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);};

  const excelExportEt=async()=>{
    if(!filtered.length)return alert('Aktarılacak veri bulunamadı.');
    const wb=new ExcelJS.Workbook(); addSummarySheet(wb,filtered,startDate,endDate); const sh=wb.addWorksheet('Reel Kayıtlar',{views:[{showGridLines:false}]});
    const headers=['Tedarikçi Firma','Proje Adı','Sefer Tarihi','Sefer No','Durum','Plaka','Kullanıcı','Araç Alt Grubu','Çalışma Tipi','Alış Fatura No'];
    sh.addRow([]);sh.addRow([]);sh.addRow([]);sh.addRow(headers);
    filtered.forEach(x=>sh.addRow([x.SupplierCurrentAccountFullTitle,x.ProjectName,x.DespatchDate?new Date(x.DespatchDate):'',x.DocumentNo,STATUS_LABELS[x.TMSDespatchDocumentStatu]??x.TMSDespatchDocumentStatu,x.PlateNumber,x.TMSDespatchCreatedBy,x.SpecialGroupName,x.VehicleWorkingTypeName,x.TMSDespatchInvoiceDocumentNo]));
    styleReportSheet(sh,{title:'ODAK LOJİSTİK • REEL DETAY RAPORU',subtitle:`${rangeLabel(startDate,endDate)}  •  ${filtered.length.toLocaleString('tr-TR')} filtrelenmiş kayıt`,columns:'J',headerRow:4,endRow:4+filtered.length});
    sh.columns=[{width:42},{width:32},{width:15},{width:18},{width:28},{width:15},{width:24},{width:20},{width:18},{width:22}]; sh.getColumn(3).numFmt='dd.mm.yyyy';
    for(let r=5;r<=4+filtered.length;r++){const c=sh.getCell(`E${r}`);const v=String(c.value||'');if(['TESLİM EDİLDİ','TAMAMLANDI','EVRAK ARŞİVLENDİ'].includes(v)){c.fill=fill('FFDCFCE7');c.font={bold:true,color:{argb:'FF15803D'}};}else if(v==='BEKLİYOR'){c.fill=fill('FFFEF3C7');c.font={bold:true,color:{argb:'FFB45309'}};}else if(v.includes('EKSİK')||v.includes('HASAR')){c.fill=fill('FFFEE2E2');c.font={bold:true,color:{argb:'FFB91C1C'}};}}
    await saveWorkbook(wb,`reel_raporu_${inputDate(startDate)}_${inputDate(endDate)}.xlsx`);
  };

  const projeBazliRaporOlustur=async()=>{
    if(!filtered.length)return alert('Raporlanacak veri bulunamadı.'); const grouped={};
    filtered.forEach(x=>{const p=x.ProjectName||'Bilinmeyen Proje';const d=STATUS_LABELS[x.TMSDespatchDocumentStatu];if(!FOCUS_STATUSES.includes(d))return;if(!grouped[p]){grouped[p]={};FOCUS_STATUSES.forEach(s=>grouped[p][s]=0);}grouped[p][d]++;});
    const wb=new ExcelJS.Workbook();addSummarySheet(wb,filtered,startDate,endDate);const sh=wb.addWorksheet('Proje Durum',{views:[{showGridLines:false}]});const headers=['Proje',...FOCUS_STATUSES,'Genel Toplam',...FOCUS_STATUSES.map(x=>`${x} %`)];sh.addRow([]);sh.addRow([]);sh.addRow([]);sh.addRow(headers);
    Object.entries(grouped).sort((a,b)=>Object.values(b[1]).reduce((s,n)=>s+n,0)-Object.values(a[1]).reduce((s,n)=>s+n,0)).forEach(([p,o])=>{const t=FOCUS_STATUSES.reduce((s,k)=>s+(o[k]||0),0);sh.addRow([p,...FOCUS_STATUSES.map(k=>o[k]||0),t,...FOCUS_STATUSES.map(k=>t?o[k]/t:0)]);});
    styleReportSheet(sh,{title:'ODAK LOJİSTİK • PROJE DURUM ANALİZİ',subtitle:`${rangeLabel(startDate,endDate)}  •  Proje bazlı evrak durum dağılımı`,columns:'L',headerRow:4,endRow:3+Object.keys(grouped).length+1});sh.columns=[{width:38},...Array(11).fill({width:20})];for(let c=8;c<=12;c++)sh.getColumn(c).numFmt='0.00%';
    await saveWorkbook(wb,`proje_durum_${inputDate(startDate)}_${inputDate(endDate)}.xlsx`);
  };

  const tedarikciPivotGrupRaporOlustur=async()=>{
    if(!filtered.length)return alert('Raporlanacak veri bulunamadı.');const grouped={};
    filtered.forEach(x=>{const t=x.SupplierCurrentAccountFullTitle||'Bilinmeyen Tedarikçi';const p=x.ProjectName||'Bilinmeyen Proje';const d=STATUS_LABELS[x.TMSDespatchDocumentStatu];if(!FOCUS_STATUSES.includes(d))return;if(!grouped[t])grouped[t]={};if(!grouped[t][p]){grouped[t][p]={docs:new Set()};FOCUS_STATUSES.forEach(s=>grouped[t][p][s]=0);}grouped[t][p][d]++;if(x.DocumentNo)grouped[t][p].docs.add(x.DocumentNo);});
    const wb=new ExcelJS.Workbook();addSummarySheet(wb,filtered,startDate,endDate);const sh=wb.addWorksheet('Tedarikçi Projeler',{views:[{showGridLines:false}]});sh.mergeCells('A1:G1');sh.getCell('A1').value='ODAK LOJİSTİK • TEDARİKÇİ / PROJE ANALİZİ';sh.getCell('A1').font={bold:true,size:20,color:{argb:'FFFFFFFF'}};sh.getCell('A1').fill=fill('FF0F172A');sh.getRow(1).height=34;sh.mergeCells('A2:G2');sh.getCell('A2').value=`${rangeLabel(startDate,endDate)} • ${filtered.length} sefer`;sh.getCell('A2').fill=fill('FFF0F9FF');let rowNo=4;
    Object.entries(grouped).sort((a,b)=>Object.keys(b[1]).length-Object.keys(a[1]).length).forEach(([t,projects])=>{sh.mergeCells(`A${rowNo}:G${rowNo}`);const tc=sh.getCell(`A${rowNo}`);tc.value=t;tc.fill=fill('FF0369A1');tc.font={bold:true,color:{argb:'FFFFFFFF'},size:11};tc.alignment={vertical:'middle'};rowNo++;const hr=sh.addRow(['Proje',...FOCUS_STATUSES,'Toplam Sefer']);hr.eachCell(c=>{c.fill=fill('FFE0F2FE');c.font={bold:true,color:{argb:'FF075985'}};c.border=excelBorder;c.alignment={horizontal:'center',wrapText:true};});rowNo++;Object.entries(projects).forEach(([p,o],idx)=>{const rr=sh.addRow([p,...FOCUS_STATUSES.map(k=>o[k]||0),o.docs.size]);rr.eachCell(c=>{c.fill=fill(idx%2?'FFFFFFFF':'FFF8FAFC');c.border=excelBorder;c.alignment={vertical:'middle',wrapText:true};});rowNo++;});sh.addRow([]);rowNo++;});
    sh.columns=[{width:42},...Array(6).fill({width:22})];sh.views=[{state:'frozen',ySplit:2}];sh.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};sh.headerFooter.oddFooter='&LODAK LOJİSTİK&CReel Raporları&R&P / &N';
    await saveWorkbook(wb,`tedarikci_proje_${inputDate(startDate)}_${inputDate(endDate)}.xlsx`);
  };

  const kullaniciBazliRaporOlustur=async()=>{
    if(!filtered.length)return alert('Raporlanacak veri bulunamadı.');const grouped={};
    filtered.forEach(x=>{const u=x.TMSDespatchCreatedBy||'Bilinmeyen Kullanıcı';const p=x.ProjectName||'Bilinmeyen Proje';const d=STATUS_LABELS[x.TMSDespatchDocumentStatu];if(!FOCUS_STATUSES.includes(d))return;if(!grouped[u])grouped[u]={};if(!grouped[u][p]){grouped[u][p]={};FOCUS_STATUSES.forEach(s=>grouped[u][p][s]=0);}grouped[u][p][d]++;});
    const wb=new ExcelJS.Workbook();addSummarySheet(wb,filtered,startDate,endDate);const sh=wb.addWorksheet('Kullanıcı Analizi',{views:[{showGridLines:false}]});const headers=['Kullanıcı / Proje',...FOCUS_STATUSES,'Genel Toplam'];sh.addRow([]);sh.addRow([]);sh.addRow([]);sh.addRow(headers);let r=5;
    Object.entries(grouped).forEach(([u,projects])=>{sh.mergeCells(`A${r}:G${r}`);const c=sh.getCell(`A${r}`);c.value=u;c.fill=fill('FF0369A1');c.font={bold:true,color:{argb:'FFFFFFFF'}};r++;Object.entries(projects).forEach(([p,o])=>{const t=FOCUS_STATUSES.reduce((s,k)=>s+(o[k]||0),0);sh.addRow([p,...FOCUS_STATUSES.map(k=>o[k]||0),t]);r++;});});
    styleReportSheet(sh,{title:'ODAK LOJİSTİK • KULLANICI ANALİZİ',subtitle:`${rangeLabel(startDate,endDate)}  •  Kullanıcı ve proje bazlı iş yükü`,columns:'G',headerRow:4,endRow:r-1});sh.columns=[{width:38},...Array(6).fill({width:21})];
    await saveWorkbook(wb,`kullanici_analizi_${inputDate(startDate)}_${inputDate(endDate)}.xlsx`);
  };

  return <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#0b1220] dark:text-white">
    <main className="mx-auto w-full max-w-[1900px] px-3 pb-10 pt-4 sm:px-5 lg:px-6">
      <section className="mb-4 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,.06)] dark:border-white/10 dark:bg-[#111925]">
        <div className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-500"/>
          <div className="flex items-center gap-4"><button onClick={()=>navigate('/anasayfa')} title="Ana sayfaya dön" className="group grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-x-0.5 hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><FiArrowLeft className="transition group-hover:-translate-x-0.5"/></button><div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-400 text-white shadow-lg shadow-sky-500/20"><FiActivity size={22}/></div><div><div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Reel • Analiz Merkezi</span><span className="text-[11px] font-bold text-slate-400">{rangeLabel(startDate,endDate)}</span></div><h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Reel Raporları</h1><p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Spot seferleri, tedarikçi performansını, proje durumlarını ve kullanıcı iş yükünü tek ekrandan analiz edin.</p></div></div>
          <div className="flex flex-wrap gap-2"><button onClick={fetchData} disabled={loading} className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-sky-500/15 transition hover:-translate-y-0.5 hover:shadow-sky-500/25 disabled:opacity-50"><FiRefreshCw className={loading?'animate-spin':'transition group-hover:rotate-90'}/>{loading?'Hazırlanıyor':'Veriyi Getir'}</button><button onClick={excelExportEt} disabled={!filtered.length} className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"><FiDownload className="transition group-hover:translate-y-0.5"/>Genel Excel</button></div>
        </div>
      </section>

      <section className="mb-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111925]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <label><span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><FiCalendar className="text-sky-500"/>Başlangıç</span><div className="relative"><FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" inputMode="numeric" autoComplete="off" value={startDateText} onChange={e=>updateDateText(e.target.value,setStartDateText,setStartDate)} onBlur={()=>normalizeDateText(startDateText,setStartDateText,setStartDate)} onKeyDown={e=>{if(e.key==='Enter'){normalizeDateText(startDateText,setStartDateText,setStartDate);fetchData();}}} placeholder="GG.AA.YYYY veya GGAAYYYY" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-bold text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-white dark:focus:ring-sky-500/10"/>{startDateText&&<button type="button" onClick={()=>{setStartDateText('');setStartDate(null);setPage(1)}} title="Başlangıç tarihini temizle" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-rose-500"><FiX/></button>}</div></label>
            <label><span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><FiCalendar className="text-cyan-500"/>Bitiş</span><div className="relative"><FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" inputMode="numeric" autoComplete="off" value={endDateText} onChange={e=>updateDateText(e.target.value,setEndDateText,setEndDate)} onBlur={()=>normalizeDateText(endDateText,setEndDateText,setEndDate)} onKeyDown={e=>{if(e.key==='Enter'){normalizeDateText(endDateText,setEndDateText,setEndDate);fetchData();}}} placeholder="GG.AA.YYYY veya GGAAYYYY" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-bold text-slate-700 outline-none transition hover:border-slate-300 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-white dark:focus:ring-cyan-500/10"/>{endDateText&&<button type="button" onClick={()=>{setEndDateText('');setEndDate(null);setPage(1)}} title="Bitiş tarihini temizle" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-rose-500"><FiX/></button>}</div></label>
            {[{key:'firma',label:'Tedarikçi',field:'SupplierCurrentAccountFullTitle'},{key:'proje',label:'Proje',field:'ProjectName'},{key:'durum',label:'Durum',field:'TMSDespatchDocumentStatu'},{key:'kullanici',label:'Kullanıcı',field:'TMSDespatchCreatedBy'}].map(f=><label key={f.key}><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">{f.label}</span><select value={filters[f.key]} onChange={e=>{setFilters(v=>({...v,[f.key]:e.target.value}));setPage(1)}} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-[#0d141f] dark:text-white dark:focus:ring-sky-500/10"><option value="">Tümü</option>{getUniqueValues(f.field).map(v=><option key={v} value={v}>{f.key==='durum'?(STATUS_LABELS[v]||v):v}</option>)}</select></label>)}
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={()=>{setStartDate(null);setEndDate(null);setStartDateText('');setEndDateText('');setPage(1)}} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-cyan-300 hover:text-cyan-600 dark:border-white/10 dark:text-slate-300">Tüm Tarihler</button><button onClick={()=>quickRange(7)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:text-slate-300">Son 7 Gün</button><button onClick={()=>quickRange(30)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:text-slate-300">Son 30 Gün</button><button onClick={resetFilters} disabled={!activeCount} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 transition hover:border-rose-200 hover:text-rose-500 disabled:opacity-40 dark:border-white/10"><FiX/>Temizle</button></div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center dark:border-white/5"><div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Sefer no, plaka, tedarikçi, proje, kullanıcı veya fatura no ara…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-sky-500/10"/></div><div className="flex items-center gap-2 text-xs font-bold text-slate-400"><FiZap className="text-sky-500"/><span>{activeCount?`${activeCount} aktif filtre • `:''}{filtered.length.toLocaleString('tr-TR')} sonuç</span></div></div>
      </section>

      <AnimatePresence mode="wait">{loading&&<motion.div key="loading" className="mb-4"><LoadingExperience progress={progress} found={found}/></motion.div>}</AnimatePresence>
      {!loading&&hata&&<div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-300">{hata}</div>}

      {!loading&&<>
        <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Kpi icon={FiLayers} label="Filtrelenmiş Sefer" value={filtered.length.toLocaleString('tr-TR')} helper={`${baseData.length.toLocaleString('tr-TR')} toplam uygun kayıt`}/><Kpi icon={FiTruck} label="Tedarikçi" value={uniqueSuppliers}/><Kpi icon={FiBox} label="Proje" value={uniqueProjects}/><Kpi icon={FiAlertTriangle} label="Bekleyen" value={pending} tone="rose"/><Kpi icon={FiFileText} label="Sorunlu Evrak" value={issue} helper="Eksik / hasarlı" tone={issue?'rose':'emerald'}/></section>

        <section className="mb-4 grid gap-3 md:grid-cols-3"><button onClick={projeBazliRaporOlustur} disabled={!filtered.length} className="group flex items-center justify-between rounded-[20px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 disabled:opacity-40 dark:border-white/10 dark:bg-[#111925]"><span><span className="block text-sm font-black text-slate-800 dark:text-white">Proje Durum Excel</span><span className="mt-1 block text-xs font-medium text-slate-400">Proje bazında evrak durum dağılımı ve yüzdeler</span></span><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:scale-110 dark:bg-sky-500/10"><FiBarChart2/></span></button><button onClick={tedarikciPivotGrupRaporOlustur} disabled={!filtered.length} className="group flex items-center justify-between rounded-[20px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/5 disabled:opacity-40 dark:border-white/10 dark:bg-[#111925]"><span><span className="block text-sm font-black text-slate-800 dark:text-white">Tedarikçi / Proje Excel</span><span className="mt-1 block text-xs font-medium text-slate-400">Tedarikçi altındaki projeleri gruplayarak analiz eder</span></span><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-600 transition group-hover:scale-110 dark:bg-cyan-500/10"><FiTruck/></span></button><button onClick={kullaniciBazliRaporOlustur} disabled={!filtered.length} className="group flex items-center justify-between rounded-[20px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 disabled:opacity-40 dark:border-white/10 dark:bg-[#111925]"><span><span className="block text-sm font-black text-slate-800 dark:text-white">Kullanıcı Analiz Excel</span><span className="mt-1 block text-xs font-medium text-slate-400">Kullanıcı ve proje bazlı iş yükünü gösterir</span></span><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-110 dark:bg-emerald-500/10"><FiUsers/></span></button></section>

        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,.06)] dark:border-white/10 dark:bg-[#111925]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950"><FiTable/></div><div><h2 className="text-sm font-black text-slate-900 dark:text-white">Reel Sefer Data Grid</h2><p className="text-[11px] font-medium text-slate-400">{filtered.length.toLocaleString('tr-TR')} kayıt • Sayfa {page}/{totalPages}</p></div></div><button onClick={excelExportEt} disabled={!filtered.length} className="group inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-600 disabled:opacity-40 dark:bg-white dark:text-slate-950"><FiDownload className="transition group-hover:translate-y-0.5"/>Modern Excel</button></div>
          <div className="overflow-auto"><table className="min-w-[1600px] w-full border-separate border-spacing-0 text-left"><thead className="sticky top-0 z-10 bg-slate-950 text-white"><tr className="text-[10px] font-black uppercase tracking-[.1em] text-slate-300">{['Tedarikçi Firma','Proje','Sefer Tarihi','Sefer No','Durum','Plaka','Kullanıcı','Araç Alt Grubu','Çalışma Tipi','Alış Fatura No'].map(h=><th key={h} className="border-b border-white/10 px-4 py-3.5">{h}</th>)}</tr></thead><tbody>{visible.length?visible.map((item,i)=><motion.tr initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.012,.3)}} key={item.DocumentNo||i} className="group border-b border-slate-100 transition-colors hover:bg-sky-50/55 dark:hover:bg-sky-500/[.04]"><td className="border-b border-slate-100 px-4 py-3 dark:border-white/5"><div className="flex max-w-[340px] items-center gap-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-xs font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{String(item.SupplierCurrentAccountFullTitle||'?').trim().slice(0,2).toLocaleUpperCase('tr-TR')}</div><span className="line-clamp-2 text-xs font-bold text-slate-700 dark:text-slate-200">{item.SupplierCurrentAccountFullTitle||'-'}</span></div></td><td className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-white/5 dark:text-slate-300">{item.ProjectName||'-'}</td><td className="border-b border-slate-100 px-4 py-3 text-xs font-bold text-slate-500 dark:border-white/5">{fmtDate(item.DespatchDate)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-white/5"><span className="rounded-lg bg-sky-50 px-2 py-1 font-mono text-xs font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{item.DocumentNo}</span></td><td className="border-b border-slate-100 px-4 py-3 dark:border-white/5"><StatusBadge code={item.TMSDespatchDocumentStatu}/></td><td className="border-b border-slate-100 px-4 py-3 dark:border-white/5"><span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200"><FiTruck className="text-slate-400"/>{item.PlateNumber||'-'}</span></td><td className="border-b border-slate-100 px-4 py-3 dark:border-white/5"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"><FiUser className="text-slate-400"/>{item.TMSDespatchCreatedBy||'-'}</span></td><td className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-white/5">{item.SpecialGroupName||'-'}</td><td className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-white/5">{item.VehicleWorkingTypeName||'-'}</td><td className="border-b border-slate-100 px-4 py-3 font-mono text-xs font-bold text-slate-600 dark:border-white/5 dark:text-slate-300">{item.TMSDespatchInvoiceDocumentNo||'-'}</td></motion.tr>):<tr><td colSpan="10" className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5"><FiFileText size={24}/></div><div className="mt-3 text-sm font-black text-slate-600 dark:text-slate-300">Gösterilecek kayıt yok</div><div className="mt-1 text-xs text-slate-400">Tarih aralığını seçip “Veriyi Getir” butonunu kullanın.</div></td></tr>}</tbody></table></div>
          {filtered.length>PAGE_SIZE&&<div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/5"><div className="text-xs font-bold text-slate-400">{((page-1)*PAGE_SIZE+1).toLocaleString('tr-TR')}–{Math.min(page*PAGE_SIZE,filtered.length).toLocaleString('tr-TR')} / {filtered.length.toLocaleString('tr-TR')} kayıt</div><div className="flex gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-30 dark:border-white/10"><FiChevronLeft/>Önceki</button><button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-30 dark:border-white/10">Sonraki<FiChevronRight/></button></div></div>}
        </section>
      </>}
    </main>
  </div>;
}
