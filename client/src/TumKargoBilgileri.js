import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import Layout from "./components/Layout";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import {
  FiActivity,
  FiArrowLeft,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiFilter,
  FiInfo,
  FiLayers,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiSliders,
  FiStar,
  FiTrash2,
  FiTruck,
  FiUsers,
  FiX,
  FiZap,
  FiEye,
  FiEyeOff,
  FiSave,
  FiAlertTriangle,
  FiTrendingUp,
  FiDatabase,
  FiColumns,
  FiClock,
  FiGrid,
  FiBarChart,
  FiPieChart,
  FiCheckCircle,
} from "react-icons/fi";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const PAGE_SIZE = 100;

const FIELD_META = {
  irsaliye_adi: { label: "İrsaliye Adı", icon: FiFileText },
  kargo_firmasi: { label: "Kargo Firması", icon: FiTruck },
  gonderen_firma: { label: "Gönderen Firma", icon: FiSend },
};

function toInputDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function uniqueValues(rows, field) {
  const map = new Map();
  rows.forEach((row) => {
    const raw = String(row?.[field] || "").trim();
    if (!raw) return;
    if (!map.has(raw)) map.set(raw, raw);
  });
  return [...map.values()].sort((a, b) => a.localeCompare(b, "tr"));
}

function groupVariants(values) {
  const groups = new Map();
  values.forEach((value) => {
    const key = compactText(value);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  });
  return groups;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("tr-TR");
}

function splitCodes(value) {
  return String(value || "")
    .split("-")
    .map((x) => x.trim())
    .filter(Boolean);
}

function useIsDark() {
  const [dark, setDark] = useState(() => document?.documentElement?.classList?.contains("dark"));
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function Toast({ toast }) {
  if (!toast.show) return null;
  const tone = toast.type === "error" ? "bg-rose-600" : toast.type === "info" ? "bg-slate-900" : "bg-emerald-600";
  return (
    <div className="fixed right-5 top-5 z-[100] animate-[cargoToast_.22s_ease-out]">
      <div className={cx("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-2xl", tone)}>
        {toast.type === "error" ? <FiX /> : <FiCheck />}
        {toast.text}
      </div>
      <style>{`@keyframes cargoToast{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <button aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
      <div className={cx("relative z-10 max-h-[92vh] w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101722]", wide ? "max-w-5xl" : "max-w-2xl")}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:rotate-90 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:hover:bg-white/5 dark:hover:text-white">
            <FiX />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-6">{children}</div>
        {footer && <div className="border-t border-slate-200 px-6 py-4 dark:border-white/10">{footer}</div>}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, helper }) {
  return (
    <div className="group flex min-w-[180px] flex-1 items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#111925]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 transition duration-300 group-hover:scale-110 group-hover:rotate-3 dark:bg-sky-500/10 dark:text-sky-300">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-slate-400">{label}</div>
        <div className="mt-0.5 truncate text-xl font-black text-slate-900 dark:text-white">{value}</div>
        {helper && <div className="truncate text-[11px] font-medium text-slate-400">{helper}</div>}
      </div>
    </div>
  );
}

function Distribution({ title, icon: Icon, items, total }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111925]">
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
        <Icon className="text-sky-500" /> {title}
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="py-5 text-center text-xs font-medium text-slate-400">Veri bulunamadı.</div>
        ) : (
          items.map(([name, count]) => {
            const percent = total ? Math.max(4, Math.round((count / total) * 100)) : 0;
            return (
              <div key={name} className="group">
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-bold text-slate-700 dark:text-slate-200" title={name}>{name}</span>
                  <span className="shrink-0 font-black text-slate-400">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-700 group-hover:brightness-110" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const selectStyles = (dark) => ({
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 14,
    borderColor: state.isFocused ? "#38bdf8" : dark ? "rgba(255,255,255,.1)" : "#e2e8f0",
    backgroundColor: dark ? "#111925" : "#fff",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(56,189,248,.12)" : "none",
    ":hover": { borderColor: "#38bdf8" },
  }),
  menu: (base) => ({ ...base, zIndex: 70, borderRadius: 14, overflow: "hidden", backgroundColor: dark ? "#111925" : "#fff" }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    backgroundColor: state.isSelected ? "rgba(14,165,233,.18)" : state.isFocused ? (dark ? "rgba(255,255,255,.06)" : "#f8fafc") : "transparent",
    color: dark ? "#e2e8f0" : "#334155",
  }),
  multiValue: (base) => ({ ...base, borderRadius: 999, backgroundColor: dark ? "rgba(14,165,233,.16)" : "#e0f2fe" }),
  multiValueLabel: (base) => ({ ...base, color: dark ? "#bae6fd" : "#0369a1", fontWeight: 800 }),
  multiValueRemove: (base) => ({ ...base, borderRadius: 999, ":hover": { backgroundColor: "#fecdd3", color: "#be123c" } }),
  input: (base) => ({ ...base, color: dark ? "#fff" : "#0f172a" }),
  placeholder: (base) => ({ ...base, color: dark ? "#64748b" : "#94a3b8", fontSize: 13 }),
});


const ALL_COLUMNS = [
  ["tarih", "Tarih"], ["kargo_firmasi", "Kargo Firması"], ["gonderi_numarasi", "Gönderi No"],
  ["gonderen_firma", "Gönderen Firma"], ["irsaliye_adi", "İrsaliye Adı"], ["irsaliye_no", "İrsaliye No"],
  ["odak_evrak_no", "Odak Evrak No"], ["evrak_adedi", "Evrak"], ["actions", "İşlem"],
];
const DEFAULT_COLUMNS = ALL_COLUMNS.map(([key]) => key);
const CHART_COLORS = ["#0ea5e9", "#06b6d4", "#22c55e", "#f59e0b", "#8b5cf6", "#f43f5e"];

function getSavedJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "") || fallback; } catch { return fallback; }
}
function setSavedJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function dayKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return toInputDate(d);
}
function smartSearchMatch(row, query) {
  const tokens = normalizeText(query).split(" ").filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeText([
    row.kargo_firmasi, row.gonderi_numarasi, row.gonderen_firma, row.irsaliye_adi,
    row.irsaliye_no, row.odak_evrak_no, row.tarih
  ].filter(Boolean).join(" "));
  return tokens.every((token) => haystack.includes(token));
}
function CargoLoadingExperience({ progress }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="overflow-hidden rounded-[26px] border border-sky-200/70 bg-white p-6 shadow-sm dark:border-sky-400/15 dark:bg-[#111925]">
      <div className="mx-auto flex max-w-2xl flex-col items-center py-8 text-center">
        <div className="relative h-28 w-44">
          <motion.div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sky-600 dark:text-sky-300"
            animate={{y:[0,-8,0], rotate:[0,-2,2,0]}} transition={{duration:1.4,repeat:Infinity}}>
            <FiPackage size={64}/>
          </motion.div>
          {[0,1,2].map(i => <motion.div key={i} className="absolute top-3 text-cyan-400" style={{left: 24+i*52}}
            animate={{x:[-12,18],y:[0,34],opacity:[0,1,0],rotate:[0,18]}} transition={{duration:1.5,repeat:Infinity,delay:i*.32}}>
            <FiFileText size={22}/>
          </motion.div>)}
          <motion.div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-sky-100 dark:bg-white/5">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" animate={{width:["8%","92%","38%"]}} transition={{duration:2.2,repeat:Infinity}}/>
          </motion.div>
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">Kargo kayıtları hazırlanıyor…</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">Seçtiğiniz dönem okunuyor, kayıtlar analiz için hazırlanıyor.</p>
        <div className="mt-5 w-full max-w-md overflow-hidden rounded-full bg-slate-100 p-1 dark:bg-white/5">
          <motion.div className="h-2 rounded-full bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-500" animate={{width:`${progress}%`}} transition={{ease:"easeOut"}}/>
        </div>
        <div className="mt-2 text-xs font-black text-sky-600 dark:text-sky-300">%{progress}</div>
      </div>
    </motion.div>
  );
}
function SkeletonTable() {
  return <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111925]">
    <div className="grid grid-cols-8 gap-3 bg-slate-950 px-4 py-4">{Array.from({length:8}).map((_,i)=><div key={i} className="h-3 rounded bg-white/10"/>)}</div>
    {Array.from({length:8}).map((_,r)=><div key={r} className="grid grid-cols-8 gap-3 border-t border-slate-100 px-4 py-4 dark:border-white/5">
      {Array.from({length:8}).map((_,c)=><motion.div key={c} className="h-4 rounded-lg bg-slate-100 dark:bg-white/5" animate={{opacity:[.45,1,.45]}} transition={{duration:1.2,repeat:Infinity,delay:(r+c)*.035}}/>)}
    </div>)}
  </div>
}

export default function TumKargoBilgileri() {
  const navigate = useNavigate();
  const isDark = useIsDark();
  const toastTimer = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [queryStart, setQueryStart] = useState("");
  const [queryEnd, setQueryEnd] = useState("");
  const [loadedRange, setLoadedRange] = useState(null);
  const [rangeError, setRangeError] = useState("");

  const [quickSearch, setQuickSearch] = useState("");
  const [irsaliyeNo, setIrsaliyeNo] = useState("");
  const [selectedIrsaliye, setSelectedIrsaliye] = useState([]);
  const [selectedKargo, setSelectedKargo] = useState([]);
  const [selectedGonderen, setSelectedGonderen] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState({ show: false, type: "success", text: "" });
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [extraEnabled, setExtraEnabled] = useState(false);
  const [extraCount, setExtraCount] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [excelPreviewOpen, setExcelPreviewOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [visibleColumns, setVisibleColumns] = useState(() => getSavedJson("cargoVisibleColumns", DEFAULT_COLUMNS));
  const [savedView, setSavedView] = useState(() => getSavedJson("cargoSavedView", null));
  const [highlightId, setHighlightId] = useState(null);
  const [presetName, setPresetName] = useState("");


  const showToast = (type, text) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, type, text });
    toastTimer.current = setTimeout(() => setToast((x) => ({ ...x, show: false })), 2500);
  };

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const last = getSavedJson("cargoLastRange", null);
    if (last?.start && last?.end) setLoadedRange((old) => old || { ...last, remembered: true });
  }, []);
  useEffect(() => { setSavedJson("cargoVisibleColumns", visibleColumns); }, [visibleColumns]);


  const setPreset = (preset) => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    if (preset === "yesterday") {
      start.setDate(start.getDate() - 1);
      end = new Date(start);
    }
    if (preset === "7days") start.setDate(start.getDate() - 6);
    if (preset === "month") start = new Date(today.getFullYear(), today.getMonth(), 1);
    setQueryStart(toInputDate(start));
    setQueryEnd(toInputDate(end));
    setRangeError("");
  };

  const applyFacetFilters = (sourceRows, excludedField = null) => {
    let data = [...sourceRows];
    const selectedSets = {
      irsaliye_adi: new Set(selectedIrsaliye.map((x) => x.value)),
      kargo_firmasi: new Set(selectedKargo.map((x) => x.value)),
      gonderen_firma: new Set(selectedGonderen.map((x) => x.value)),
    };

    Object.entries(selectedSets).forEach(([field, set]) => {
      if (field !== excludedField && set.size) {
        data = data.filter((row) => set.has(row?.[field]));
      }
    });

    if (irsaliyeNo.trim()) {
      const q = normalizeText(irsaliyeNo);
      data = data.filter((row) => normalizeText(row.irsaliye_no).includes(q));
    }

    if (quickSearch.trim()) {
      data = data.filter((row) => smartSearchMatch(row, quickSearch));
    }

    return data;
  };

  const buildFacetOptions = (field) => {
    const scopedRows = applyFacetFilters(rows, field);
    const counts = new Map();
    scopedRows.forEach((row) => {
      const value = String(row?.[field] ?? "").trim();
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
      .map(([value, count]) => ({
        value,
        label: `${value} (${count.toLocaleString("tr-TR")})`,
      }));
  };

  const irsaliyeOptions = useMemo(
    () => buildFacetOptions("irsaliye_adi"),
    [rows, selectedKargo, selectedGonderen, irsaliyeNo, quickSearch]
  );
  const kargoOptions = useMemo(
    () => buildFacetOptions("kargo_firmasi"),
    [rows, selectedIrsaliye, selectedGonderen, irsaliyeNo, quickSearch]
  );
  const gonderenOptions = useMemo(
    () => buildFacetOptions("gonderen_firma"),
    [rows, selectedIrsaliye, selectedKargo, irsaliyeNo, quickSearch]
  );

  const variantGroups = useMemo(() => ({
    irsaliye_adi: groupVariants(uniqueValues(rows, "irsaliye_adi")),
    kargo_firmasi: groupVariants(uniqueValues(rows, "kargo_firmasi")),
    gonderen_firma: groupVariants(uniqueValues(rows, "gonderen_firma")),
  }), [rows]);

  const detectSuggestion = (field, selected) => {
    if (!selected?.length) {
      if (suggestion?.field === field) setSuggestion(null);
      return;
    }
    const selectedValues = new Set(selected.map((x) => x.value));
    const variants = new Set();
    selected.forEach((item) => {
      const group = variantGroups[field]?.get(compactText(item.value)) || [];
      group.forEach((v) => { if (!selectedValues.has(v)) variants.add(v); });
    });
    if (variants.size) {
      setSuggestion({ field, variants: [...variants], base: selected.map((x) => x.value) });
    } else if (suggestion?.field === field) {
      setSuggestion(null);
    }
  };

  const handleSelect = (field, value) => {
    if (field === "irsaliye_adi") setSelectedIrsaliye(value || []);
    if (field === "kargo_firmasi") setSelectedKargo(value || []);
    if (field === "gonderen_firma") setSelectedGonderen(value || []);
    detectSuggestion(field, value || []);
    setPage(1);
  };

  const addSuggestedVariants = () => {
    if (!suggestion) return;
    const additions = suggestion.variants.map((value) => ({ value, label: value }));
    const merge = (current) => {
      const seen = new Set(current.map((x) => x.value));
      return [...current, ...additions.filter((x) => !seen.has(x.value))];
    };
    if (suggestion.field === "irsaliye_adi") setSelectedIrsaliye(merge(selectedIrsaliye));
    if (suggestion.field === "kargo_firmasi") setSelectedKargo(merge(selectedKargo));
    if (suggestion.field === "gonderen_firma") setSelectedGonderen(merge(selectedGonderen));
    showToast("success", `${suggestion.variants.length} benzer değer filtreye eklendi.`);
    setSuggestion(null);
  };

  const fetchRange = async () => {
    setRangeError("");
    if (!queryStart || !queryEnd) {
      setRangeError("Lütfen başlangıç ve bitiş tarihini seçin.");
      return;
    }
    if (queryStart > queryEnd) {
      setRangeError("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
      return;
    }

    setLoading(true);
    setLoadingProgress(8);
    setRows([]);
    setPage(1);
    setSuggestion(null);
    setSelectedIrsaliye([]);
    setSelectedKargo([]);
    setSelectedGonderen([]);
    setQuickSearch("");
    setIrsaliyeNo("");

    try {
      const pageSize = 1000;
      let from = 0;
      let all = [];
      let keepGoing = true;
      while (keepGoing) {
        const { data, error } = await supabase
          .from("kargo_bilgileri")
          .select("*")
          .gte("tarih", queryStart)
          .lte("tarih", queryEnd)
          .order("tarih", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = data || [];
        all = all.concat(batch);
        setLoadingProgress((p) => Math.min(88, Math.max(p + 12, 22)));
        keepGoing = batch.length === pageSize;
        from += pageSize;
      }
      setLoadingProgress(96);
      setRows(all);
      setLoadedRange({ start: queryStart, end: queryEnd });
      setSavedJson("cargoLastRange", { start: queryStart, end: queryEnd });
      setHasLoaded(true);
      showToast("success", `${all.length.toLocaleString("tr-TR")} kayıt yüklendi.`);
    } catch (err) {
      console.error(err);
      setHasLoaded(false);
      showToast("error", "Kargo verileri alınamadı.");
    } finally {
      setLoadingProgress(100);
      setTimeout(() => setLoading(false), 280);
    }
  };

  const filteredRows = useMemo(
    () => applyFacetFilters(rows),
    [rows, selectedIrsaliye, selectedKargo, selectedGonderen, irsaliyeNo, quickSearch]
  );

  useEffect(() => setPage(1), [quickSearch, irsaliyeNo]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = useMemo(() => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredRows, page]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const totalDocuments = useMemo(() => filteredRows.reduce((sum, row) => sum + (Number.parseInt(row.evrak_adedi, 10) || 0), 0), [filteredRows]);
  const uniqueCargo = useMemo(() => new Set(filteredRows.map((x) => compactText(x.kargo_firmasi)).filter(Boolean)).size, [filteredRows]);
  const uniqueSender = useMemo(() => new Set(filteredRows.map((x) => compactText(x.gonderen_firma)).filter(Boolean)).size, [filteredRows]);
  const uniqueInvoiceNames = useMemo(() => new Set(filteredRows.map((x) => compactText(x.irsaliye_adi)).filter(Boolean)).size, [filteredRows]);

  const topBy = (field) => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const name = String(row?.[field] || "Boş").trim() || "Boş";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  const topCargo = useMemo(() => topBy("kargo_firmasi"), [filteredRows]);
  const topSender = useMemo(() => topBy("gonderen_firma"), [filteredRows]);
  const topInvoice = useMemo(() => topBy("irsaliye_adi"), [filteredRows]);

  const dataQuality = useMemo(() => {
    const fields = ["irsaliye_adi", "kargo_firmasi", "gonderen_firma"];
    let variantFamilies = 0;
    let affectedValues = 0;
    fields.forEach((field) => {
      variantGroups[field].forEach((variants) => {
        if (variants.length > 1) {
          variantFamilies += 1;
          affectedValues += variants.length;
        }
      });
    });
    return { variantFamilies, affectedValues };
  }, [variantGroups]);


  const qualityFamilies = useMemo(() => {
    const result = [];
    Object.entries(variantGroups).forEach(([field, groups]) => groups.forEach((variants, key) => {
      if (variants.length > 1) result.push({ field, key, variants, canonical: variants.slice().sort((a,b)=>a.length-b.length || a.localeCompare(b,"tr"))[0] });
    }));
    return result.sort((a,b)=>b.variants.length-a.variants.length);
  }, [variantGroups]);

  const anomalies = useMemo(() => {
    const list = [];
    const missingInvoice = filteredRows.filter(r => !String(r.irsaliye_adi || "").trim()).length;
    const missingSender = filteredRows.filter(r => !String(r.gonderen_firma || "").trim()).length;
    const missingCargo = filteredRows.filter(r => !String(r.kargo_firmasi || "").trim()).length;
    if (missingInvoice) list.push({type:"Eksik İrsaliye Adı", count:missingInvoice, field:"irsaliye_adi"});
    if (missingSender) list.push({type:"Eksik Gönderen Firma", count:missingSender, field:"gonderen_firma"});
    if (missingCargo) list.push({type:"Eksik Kargo Firması", count:missingCargo, field:"kargo_firmasi"});
    const cargoCounts = new Map();
    filteredRows.forEach(r => { const k=String(r.kargo_firmasi||"").trim(); if(k)cargoCounts.set(k,(cargoCounts.get(k)||0)+1); });
    const vals=[...cargoCounts.values()];
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    [...cargoCounts.entries()].filter(([,n])=>avg && n>avg*2.5 && n>=10).slice(0,3).forEach(([name,count])=>list.push({type:`Yoğun trafik: ${name}`,count,field:"kargo_firmasi",value:name}));
    return list;
  }, [filteredRows]);

  const dailyTrend = useMemo(() => {
    const map = new Map();
    filteredRows.forEach(r => { const k=dayKey(r.tarih); if(k) map.set(k,(map.get(k)||0)+1); });
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,count])=>({date,label:formatDate(date),count}));
  }, [filteredRows]);

  const cargoChart = useMemo(() => topCargo.map(([name,count])=>({name,count})), [topCargo]);
  const senderChart = useMemo(() => topSender.map(([name,count])=>({name,count})), [topSender]);

  const filterChips = useMemo(() => {
    const chips = [];
    selectedKargo.forEach(x=>chips.push({kind:"kargo",label:x.value}));
    selectedGonderen.forEach(x=>chips.push({kind:"gonderen",label:x.value}));
    selectedIrsaliye.forEach(x=>chips.push({kind:"irsaliye",label:x.value}));
    if (irsaliyeNo.trim()) chips.push({kind:"no",label:`İrsaliye No: ${irsaliyeNo}`});
    if (quickSearch.trim()) chips.push({kind:"search",label:`Arama: ${quickSearch}`});
    if (loadedRange) chips.unshift({kind:"range",label:`${formatDate(loadedRange.start)} – ${formatDate(loadedRange.end)}`, locked:true});
    return chips;
  }, [selectedKargo,selectedGonderen,selectedIrsaliye,irsaliyeNo,quickSearch,loadedRange]);

  const removeChip = (chip) => {
    if(chip.kind==="kargo") setSelectedKargo(v=>v.filter(x=>x.value!==chip.label));
    if(chip.kind==="gonderen") setSelectedGonderen(v=>v.filter(x=>x.value!==chip.label));
    if(chip.kind==="irsaliye") setSelectedIrsaliye(v=>v.filter(x=>x.value!==chip.label));
    if(chip.kind==="no") setIrsaliyeNo("");
    if(chip.kind==="search") setQuickSearch("");
    setPage(1);
  };

  const applyView = (name) => {
    setPresetName(name); setAnalysisOpen(true); setFiltersOpen(true);
    if(name==="Eksik Veri Kontrolü") { setQuickSearch(""); setSelectedKargo([]); setSelectedGonderen([]); setSelectedIrsaliye([]); }
    if(name==="Kargo Firma Analizi") setComparisonOpen(false);
    if(name==="Gönderen Firma Analizi") setComparisonOpen(false);
    showToast("info", `${name} görünümü hazırlandı.`);
  };

  const saveCurrentView = () => {
    const view={visibleColumns, filtersOpen, analysisOpen};
    setSavedView(view); setSavedJson("cargoSavedView", view); showToast("success","Görünüm kaydedildi.");
  };
  const restoreSavedView = () => {
    if(!savedView) return showToast("info","Henüz kaydedilmiş görünüm yok.");
    setVisibleColumns(savedView.visibleColumns || DEFAULT_COLUMNS); setFiltersOpen(savedView.filtersOpen ?? true); setAnalysisOpen(savedView.analysisOpen ?? true);
    showToast("success","Kaydedilmiş görünüm uygulandı.");
  };

  const fixQualityFamily = async (family) => {
    const field = family.field;
    const affected = rows.filter(r => family.variants.includes(String(r?.[field]||"").trim()));
    if(!affected.length) return;
    if(!window.confirm(`${affected.length} kayıtta ${FIELD_META[field]?.label} değeri "${family.canonical}" olarak düzeltilecek. Devam edilsin mi?`)) return;
    const ids = affected.map(r=>r.id).filter(Boolean);
    const { error } = await supabase.from("kargo_bilgileri").update({[field]:family.canonical}).in("id", ids);
    if(error) return showToast("error","Veritabanı düzeltmesi başarısız.");
    setRows(prev=>prev.map(r=>ids.includes(r.id)?{...r,[field]:family.canonical}:r));
    showToast("success",`${ids.length} kayıt standartlaştırıldı.`);
  };

  const comparison = useMemo(() => {
    const countFor=(name)=>filteredRows.filter(r=>r.kargo_firmasi===name).length;
    const a=countFor(compareA), b=countFor(compareB);
    return {a,b,diff:a-b,pct:b?Math.round(((a-b)/b)*100):0};
  },[filteredRows,compareA,compareB]);

  const isCol = (key) => visibleColumns.includes(key);

  const activeFilterCount = [selectedIrsaliye.length, selectedKargo.length, selectedGonderen.length, irsaliyeNo.trim(), quickSearch.trim()].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedIrsaliye([]);
    setSelectedKargo([]);
    setSelectedGonderen([]);
    setIrsaliyeNo("");
    setQuickSearch("");
    setSuggestion(null);
    setPage(1);
  };

  const exportExcel = async () => {
    if (!filteredRows.length) {
      showToast("info", "Excel'e aktarılacak kayıt bulunamadı.");
      return;
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = "Odak Lojistik";
    wb.created = new Date();
    const ws = wb.addWorksheet("Kargo Analizi", { views: [{ state: "frozen", ySplit: 5 }] });
    ws.mergeCells("A1:H1");
    ws.getCell("A1").value = "ODAK LOJİSTİK • KARGO ANALİZ RAPORU";
    ws.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
    ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(1).height = 34;

    ws.mergeCells("A2:H2");
    ws.getCell("A2").value = `Dönem: ${formatDate(loadedRange?.start)} - ${formatDate(loadedRange?.end)}  •  Filtrelenmiş kayıt: ${filteredRows.length}  •  Evrak: ${totalDocuments}`;
    ws.getCell("A2").font = { size: 10, color: { argb: "FF475569" } };
    ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    ws.getRow(2).height = 24;

    ws.mergeCells("A3:H3");
    ws.getCell("A3").value = `Oluşturulma: ${new Date().toLocaleString("tr-TR")}  •  Kargo firması: ${uniqueCargo}  •  Gönderen firma: ${uniqueSender}  •  İrsaliye adı: ${uniqueInvoiceNames}`;
    ws.getCell("A3").font = { size: 9, italic: true, color: { argb: "FF64748B" } };
    ws.getRow(3).height = 22;

    const headers = ["Tarih", "Kargo Firması", "Gönderi No", "Gönderen Firma", "İrsaliye Adı", "İrsaliye No", "Odak Evrak No", "Evrak Adedi"];
    const headerRow = ws.getRow(5);
    headers.forEach((h, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
      cell.alignment = { vertical: "middle", horizontal: index === 7 ? "center" : "left" };
      cell.border = { bottom: { style: "thin", color: { argb: "FF0369A1" } } };
    });
    headerRow.height = 27;

    filteredRows.forEach((row, idx) => {
      const excelRow = ws.addRow([
        formatDate(row.tarih), row.kargo_firmasi || "", row.gonderi_numarasi || "", row.gonderen_firma || "",
        row.irsaliye_adi || "", row.irsaliye_no || "", row.odak_evrak_no || "", Number(row.evrak_adedi) || 0,
      ]);
      excelRow.height = 22;
      excelRow.eachCell((cell, col) => {
        cell.font = { size: 10, color: { argb: "FF334155" } };
        cell.alignment = { vertical: "middle", wrapText: true, horizontal: col === 8 ? "center" : "left" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 ? "FFF8FAFC" : "FFFFFFFF" } };
        cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      });
    });
    ws.autoFilter = { from: "A5", to: `H${5 + filteredRows.length}` };
    ws.columns = [
      { width: 14 }, { width: 24 }, { width: 22 }, { width: 30 }, { width: 30 }, { width: 30 }, { width: 30 }, { width: 14 },
    ];
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    ws.headerFooter.oddFooter = "&LOdak Lojistik&C Kargo Analizi&R Sayfa &P / &N";

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `kargo_analizi_${loadedRange?.start || "baslangic"}_${loadedRange?.end || "bitis"}.xlsx`);
    showToast("success", "Modern Excel raporu indirildi.");
  };

  const openEdit = (row) => {
    setEditing({ ...row });
    setExtraEnabled(false);
    setExtraCount("");
  };

  const computedDocumentCount = useMemo(() => {
    if (!editing) return 0;
    return splitCodes(editing.irsaliye_no).length + splitCodes(editing.odak_evrak_no).length + (extraEnabled ? (Number.parseInt(extraCount, 10) || 0) : 0);
  }, [editing, extraEnabled, extraCount]);

  const saveEdit = async () => {
    if (!editing?.id) return;
    const payload = {
      tarih: editing.tarih,
      kargo_firmasi: editing.kargo_firmasi,
      gonderi_numarasi: editing.gonderi_numarasi,
      gonderen_firma: editing.gonderen_firma,
      irsaliye_adi: editing.irsaliye_adi,
      irsaliye_no: editing.irsaliye_no,
      odak_evrak_no: editing.odak_evrak_no,
      evrak_adedi: computedDocumentCount,
    };
    const { error } = await supabase.from("kargo_bilgileri").update(payload).eq("id", editing.id);
    if (error) return showToast("error", "Güncelleme başarısız.");
    setRows((prev) => prev.map((row) => row.id === editing.id ? { ...row, ...payload } : row));
    setEditing(null);
    showToast("success", "Kargo kaydı güncellendi.");
  };

  const deleteRow = async (row) => {
    if (!row?.id || !window.confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("kargo_bilgileri").delete().eq("id", row.id);
    if (error) return showToast("error", "Silme işlemi başarısız.");
    setRows((prev) => prev.filter((x) => x.id !== row.id));
    if (editing?.id === row.id) setEditing(null);
    showToast("success", "Kayıt silindi.");
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      showToast("success", "Kopyalandı.");
    } catch {
      showToast("error", "Kopyalanamadı.");
    }
  };

  const copyRowAsImage = async (row) => {
    try {
      const fields = [
        ["TARİH", row.tarih],
        ["KARGO FİRMASI", row.kargo_firmasi],
        ["GÖNDERİ NUMARASI", row.gonderi_numarasi],
        ["GÖNDEREN FİRMA", row.gonderen_firma],
        ["İRSALİYE ADI", row.irsaliye_adi],
        ["İRSALİYE NO", row.irsaliye_no],
        ["ODAK EVRAK NO", row.odak_evrak_no],
      ];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const width = 1500, pad = 72, labelW = 290, valueX = pad + labelW;
      const maxTextW = width - valueX - pad;
      ctx.font = "600 27px Arial";
      const wrap = (value) => {
        const text = String(value ?? "-").trim() || "-";
        const tokens = text.split(/(\s+|\s*-\s*)/).filter(Boolean);
        const lines = []; let line = "";
        const pushLong = (token) => {
          let part = "";
          for (const ch of token) {
            if (ctx.measureText(part + ch).width > maxTextW && part) { lines.push(part); part = ch; } else part += ch;
          }
          return part;
        };
        for (const token of tokens) {
          const test = line + token;
          if (ctx.measureText(test).width <= maxTextW) line = test;
          else {
            if (line.trim()) lines.push(line.trim());
            line = ctx.measureText(token).width > maxTextW ? pushLong(token) : token.trimStart();
          }
        }
        if (line.trim()) lines.push(line.trim());
        return lines.length ? lines : ["-"];
      };
      const prepared = fields.map(([label,value]) => [label, wrap(value)]);
      const lineH = 40, rowPad = 25;
      const bodyH = prepared.reduce((sum,[,lines]) => sum + Math.max(66, lines.length*lineH + rowPad*2), 0);
      canvas.width = width; canvas.height = 190 + bodyH + 75;
      const g = ctx.createLinearGradient(0,0,width,canvas.height); g.addColorStop(0,"#08111f"); g.addColorStop(1,"#111c2b");
      ctx.fillStyle=g; ctx.fillRect(0,0,width,canvas.height);
      ctx.fillStyle="#38bdf8"; ctx.fillRect(0,0,12,canvas.height);
      ctx.fillStyle="#f8fafc"; ctx.font="800 42px Arial"; ctx.fillText("Kargo Bilgileri",pad,72);
      ctx.fillStyle="#94a3b8"; ctx.font="500 22px Arial"; ctx.fillText("Odak Lojistik • Kargo kayıt özeti",pad,112);
      ctx.strokeStyle="#263548"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(pad,148); ctx.lineTo(width-pad,148); ctx.stroke();
      let y=178;
      prepared.forEach(([label,lines])=>{
        const h=Math.max(66,lines.length*lineH+rowPad*2);
        ctx.fillStyle="#94a3b8"; ctx.font="800 19px Arial"; ctx.fillText(label,pad,y+39);
        ctx.fillStyle="#e2e8f0"; ctx.font="600 27px Arial";
        lines.forEach((line,i)=>ctx.fillText(line,valueX,y+38+i*lineH));
        ctx.strokeStyle="#1e2d40"; ctx.beginPath(); ctx.moveTo(pad,y+h-1); ctx.lineTo(width-pad,y+h-1); ctx.stroke();
        y+=h;
      });
      ctx.fillStyle="#64748b"; ctx.font="500 18px Arial"; ctx.fillText("BAPSİS • Oluşturulan kargo bilgi kartı",pad,canvas.height-28);
      const blob = await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Görsel oluşturulamadı")),"image/png"));
      await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);
      setCopySuccess(true);
      showToast("success", "Kargo bilgileri görsel olarak panoya kopyalandı.");
      setTimeout(()=>setCopySuccess(false),1700);
    } catch (error) {
      console.error(error);
      showToast("error", "Görsel panoya kopyalanamadı. Tarayıcı pano iznini kontrol edin.");
    }
  };

  return (
    <Layout>
      <Toast toast={toast} />
      <AnimatePresence>{copySuccess && <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px] pointer-events-none" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.div initial={{scale:.65,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:.8,opacity:0}} transition={{type:"spring",stiffness:320,damping:22}} className="relative overflow-hidden rounded-[28px] border border-emerald-400/30 bg-[#0b1522] px-14 py-10 text-center shadow-2xl shadow-emerald-500/20"><motion.div initial={{scale:0,rotate:-90}} animate={{scale:1,rotate:0}} transition={{delay:.12,type:"spring"}} className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-4xl text-white shadow-lg shadow-emerald-500/30"><FiCheck /></motion.div><div className="text-3xl font-black text-white">Kopyalandı!</div><div className="mt-2 text-sm font-semibold text-slate-400">Kargo bilgileri görsel olarak panoya kopyalandı.</div><motion.div className="absolute bottom-0 left-0 h-1 bg-emerald-400" initial={{width:"100%"}} animate={{width:"0%"}} transition={{duration:1.7,ease:"linear"}} /></motion.div></motion.div>}</AnimatePresence>
      <div className="min-h-screen w-full px-3 pb-8 pt-4 sm:px-5 lg:px-6">
        <style>{`
          @keyframes cargoFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
          @keyframes cargoPulse{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:.8;transform:scale(1.06)}}
          .cargo-enter{animation:cargoFade .42s cubic-bezier(.2,.8,.2,1) both}
          .cargo-row{animation:cargoFade .28s ease both;transition:transform .25s ease,background-color .25s ease,opacity .25s ease}.cargo-row:hover{transform:translateX(2px)}
        `}</style>

        <header className="cargo-enter mb-4 overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-sm dark:border-white/10 dark:bg-[#111925]">
          <div className="relative px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="pointer-events-none absolute right-32 top-0 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <button onClick={() => navigate("/anasayfa")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition duration-300 hover:-translate-x-1 hover:bg-slate-50 hover:text-sky-600 dark:border-white/10 dark:hover:bg-white/5 dark:hover:text-sky-300" title="Anasayfa">
                  <FiArrowLeft />
                </button>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/20">
                  <FiPackage size={23} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl dark:text-white">Tüm Kargo Bilgileri</h1>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300">Analiz Merkezi</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Tarih aralığına göre hızlı sorgula, veri kalitesini yakala ve kargo akışını analiz et.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AnimatePresence mode="wait">
          {loading && <motion.div key="loading" className="mb-4"><CargoLoadingExperience progress={loadingProgress}/><div className="mt-3"><SkeletonTable/></div></motion.div>}
        </AnimatePresence>

        {hasLoaded && (
                  <button onClick={fetchRange} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <FiRefreshCw className={loading ? "animate-spin" : ""} /> Yenile
                  </button>
                )}
                <button onClick={() => setExcelPreviewOpen(true)} disabled={!filteredRows.length} className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40">
                  <FiEye className="transition group-hover:scale-110" /> Excel Ön İzle
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="cargo-enter mb-4 rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111925]" style={{ animationDelay: ".05s" }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><FiCalendar /></div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Önce çalışma dönemini seçin</h2>
                  <p className="text-[11px] font-medium text-slate-400">Ekran açılışında veri yüklenmez. Sadece seçtiğiniz dönem sunucudan getirilir.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Başlangıç</span>
                  <input type="date" value={queryStart} onChange={(e) => { setQueryStart(e.target.value); setRangeError(""); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-200" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Bitiş</span>
                  <input type="date" value={queryEnd} onChange={(e) => { setQueryEnd(e.target.value); setRangeError(""); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-200" />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[["today", "Bugün"], ["yesterday", "Dün"], ["7days", "Son 7 Gün"], ["month", "Bu Ay"]].map(([key, label]) => (
                  <button key={key} onClick={() => setPreset(key)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-500 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:hover:bg-sky-500/10 dark:hover:text-sky-300">{label}</button>
                ))}
              </div>
              {rangeError && <div className="mt-3 flex items-center gap-2 text-xs font-bold text-rose-600"><FiInfo /> {rangeError}</div>}
            </div>

            <button onClick={fetchRange} disabled={loading} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-sky-600 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-sky-400">
              {loading ? <FiRefreshCw className="animate-spin" /> : <FiZap className="transition group-hover:scale-125" />}
              {loading ? "Veriler getiriliyor…" : "Dönemi Getir"}
            </button>
          </div>
        </section>

        {!hasLoaded && !loading && (
          <section className="cargo-enter relative grid min-h-[420px] place-items-center overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-[#111925]/80" style={{ animationDelay: ".1s" }}>
            <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" style={{ animation: "cargoPulse 4s ease-in-out infinite" }} />
            <div className="relative max-w-xl">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[24px] bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-xl shadow-sky-500/20"><FiActivity size={32} /></div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Analiz için bir dönem seçin</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">Tüm veriyi açılışta yüklemek yerine sadece ihtiyacınız olan gün veya tarih aralığını getiriyoruz. Bu sayede ekran çok daha hızlı açılır ve filtreler daha akıcı çalışır.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/5">Akıllı benzer değer önerileri</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/5">Kargo & gönderen analizi</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/5">Modern Excel raporu</span>
              </div>
            </div>
          </section>
        )}

        {loading && (
          <section className="grid min-h-[380px] place-items-center rounded-[28px] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111925]">
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><FiRefreshCw size={26} className="animate-spin" /></div>
              <div className="mt-4 text-base font-black text-slate-800 dark:text-white">Seçilen dönem yükleniyor</div>
              <div className="mt-1 text-xs font-medium text-slate-400">Yalnızca {formatDate(queryStart)} – {formatDate(queryEnd)} aralığı sorgulanıyor.</div>
            </div>
          </section>
        )}

        {hasLoaded && !loading && (
          <div className="space-y-4">
            <section className="cargo-enter flex flex-wrap gap-3" style={{ animationDelay: ".08s" }}>
              <Kpi icon={FiLayers} label="Kayıt" value={filteredRows.length.toLocaleString("tr-TR")} helper={`${rows.length.toLocaleString("tr-TR")} yüklenen`} />
              <Kpi icon={FiFileText} label="Toplam Evrak" value={totalDocuments.toLocaleString("tr-TR")} helper="Filtrelenen kayıtlar" />
              <Kpi icon={FiTruck} label="Kargo Firması" value={uniqueCargo.toLocaleString("tr-TR")} helper="Benzer yazımlar birleştirilmiş" />
              <Kpi icon={FiUsers} label="Gönderen Firma" value={uniqueSender.toLocaleString("tr-TR")} helper={`${uniqueInvoiceNames} irsaliye adı`} />
            </section>

            {dataQuality.variantFamilies > 0 && (
              <section className="cargo-enter flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/20 dark:bg-amber-500/10" style={{ animationDelay: ".12s" }}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><FiStar /></div>
                  <div>
                    <div className="text-sm font-black text-amber-900 dark:text-amber-100">Veri kalitesi uyarısı: {dataQuality.variantFamilies} benzer değer ailesi bulundu</div>
                    <div className="mt-0.5 text-xs font-medium text-amber-700/80 dark:text-amber-200/70">Büyük/küçük harf, boşluk ve Türkçe karakter farklılıkları nedeniyle aynı firma veya irsaliye farklı yazılmış olabilir. Bir filtre seçtiğinizde benzerlerini size önereceğim.</div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-amber-700 dark:bg-black/10 dark:text-amber-200">{dataQuality.affectedValues} varyasyon</span>
              </section>
            )}

            
            <motion.section layout className="mb-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111925]">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 xl:flex-row xl:items-center xl:justify-between dark:border-white/5">
                <div className="flex flex-wrap gap-2">
                  {["Kargo Firma Analizi","Gönderen Firma Analizi","Eksik Veri Kontrolü","İrsaliye Analizi"].map(name=>
                    <button key={name} onClick={()=>applyView(name)} className={cx("rounded-xl border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5",presetName===name?"border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-500/10":"border-slate-200 text-slate-600 hover:border-sky-300 dark:border-white/10 dark:text-slate-300")}>{name}</button>)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={()=>setColumnsOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:text-slate-300"><FiColumns/> Kolonlar</button>
                  <button onClick={saveCurrentView} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:text-slate-300"><FiSave/> Görünümü Kaydet</button>
                  <button onClick={restoreSavedView} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:text-slate-300"><FiGrid/> Kayıtlı Görünüm</button>
                  <button onClick={()=>setQualityOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:-translate-y-0.5 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-300"><FiDatabase/> Veri Kalitesi <span className="rounded-full bg-white/80 px-1.5">{qualityFamilies.length}</span></button>
                  <button onClick={()=>setComparisonOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-600 dark:bg-white dark:text-slate-950"><FiTrendingUp/> Karşılaştır</button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Aktif filtreler</span>
                <AnimatePresence initial={false}>
                  {filterChips.map((chip,i)=><motion.button layout initial={{opacity:0,scale:.85,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.8}} key={`${chip.kind}-${chip.label}-${i}`} disabled={chip.locked} onClick={()=>!chip.locked&&removeChip(chip)} className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-black",chip.locked?"border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5":"border-sky-200 bg-sky-50 text-sky-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-sky-400/15 dark:bg-sky-500/10 dark:text-sky-300")}>{chip.kind==="range"?<FiCalendar/>:<FiFilter/>}{chip.label}{!chip.locked&&<FiX/>}</motion.button>)}
                </AnimatePresence>
                {activeFilterCount>0&&<button onClick={clearFilters} className="ml-auto text-xs font-black text-rose-500 hover:underline">Tüm filtreleri temizle</button>}
              </div>
              <motion.div layout className="flex items-center gap-3 border-t border-slate-100 bg-sky-50/50 px-4 py-3 dark:border-white/5 dark:bg-sky-500/[.04]">
                <motion.div key={filteredRows.length} initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}} className="grid h-9 min-w-9 place-items-center rounded-xl bg-sky-600 px-2 text-sm font-black text-white">{filteredRows.length.toLocaleString("tr-TR")}</motion.div>
                <div><div className="text-xs font-black text-slate-700 dark:text-slate-200">Bu filtrelerle {filteredRows.length.toLocaleString("tr-TR")} kayıt görüntülenecek</div><div className="text-[11px] font-medium text-slate-400">Filtreler değiştikçe sonuç ve diğer filtre seçenekleri canlı güncellenir.</div></div>
              </motion.div>
            </motion.section>


            <AnimatePresence>
              {analysisOpen && (
                <motion.section initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mb-4 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
                  <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111925]">
                    <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Günlük Kargo Trendi</h3><p className="text-[11px] text-slate-400">Grafikte bir güne tıklayarak o güne odaklanabilirsiniz.</p></div><FiTrendingUp className="text-sky-500"/></div>
                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyTrend} onClick={(e)=>{const d=e?.activePayload?.[0]?.payload?.date;if(d){setQuickSearch(formatDate(d));setPage(1);}}}><defs><linearGradient id="cargoArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={.35}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" opacity={.15}/><XAxis dataKey="label" tick={{fontSize:10}} minTickGap={24}/><YAxis tick={{fontSize:10}}/><Tooltip/><Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} fill="url(#cargoArea)" activeDot={{r:6}}/></AreaChart></ResponsiveContainer></div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111925]">
                    <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Dikkat Gerektiren Kayıtlar</h3><p className="text-[11px] text-slate-400">Eksik ve sıra dışı dağılımlar.</p></div><FiAlertTriangle className="text-amber-500"/></div>
                    <div className="space-y-2">{anomalies.length?anomalies.map((a,i)=><motion.button whileHover={{x:3}} key={i} onClick={()=>{if(a.value){handleSelect(a.field,[{value:a.value,label:a.value}])}else if(a.field==="irsaliye_adi"){setPresetName("Eksik Veri Kontrolü")}}} className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-3 text-left transition hover:border-amber-200 hover:bg-amber-50/50 dark:border-white/5 dark:hover:bg-amber-500/5"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">{a.type}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{a.count}</span></motion.button>):<div className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><FiCheckCircle className="mb-2"/>Belirgin anomali bulunamadı.</div>}</div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
<section className="cargo-enter overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111925]" style={{ animationDelay: ".14s" }}>
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative min-w-0 flex-1 lg:max-w-xl">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} placeholder="Kargo, gönderi no, gönderen, irsaliye veya Odak evrak ara…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-200 dark:focus:bg-[#0d141f]" />
                  </div>
                  {loadedRange && <div className="hidden shrink-0 text-xs font-bold text-slate-400 xl:block"><FiCalendar className="mr-1 inline" /> {formatDate(loadedRange.start)} – {formatDate(loadedRange.end)}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFiltersOpen((v) => !v)} className={cx("inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-extrabold transition hover:-translate-y-0.5", filtersOpen ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300" : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300")}><FiSliders /> Filtreler {activeFilterCount > 0 && <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span>}</button>
                  <button onClick={() => setAnalysisOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-extrabold text-slate-600 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:text-slate-300"><FiBarChart2 /> Analiz</button>
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"><FiX /> Temizle</button>}
                </div>
              </div>

              {filtersOpen && (
                <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[.02]">
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-sky-100 bg-white/80 px-3 py-2.5 text-xs font-semibold text-slate-500 shadow-sm dark:border-sky-400/10 dark:bg-white/[.03] dark:text-slate-400">
                    <FiZap className="mt-0.5 shrink-0 text-sky-500" />
                    <span><strong className="text-slate-700 dark:text-slate-200">Akıllı bağlı filtreler aktif.</strong> Bir alan seçtiğinizde diğer filtrelerin seçenekleri yalnızca o seçime uyan kayıtlardan yeniden hesaplanır. Parantez içindeki sayı, o seçeneğin mevcut filtrelerle kaç kaydı temsil ettiğini gösterir.</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400"><FiFileText /> İrsaliye Adı</div>
                    <Select isMulti value={selectedIrsaliye} options={irsaliyeOptions} onChange={(v) => handleSelect("irsaliye_adi", v)} styles={selectStyles(isDark)} placeholder="İrsaliye adı seç…" noOptionsMessage={() => "Sonuç yok"} />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400"><FiTruck /> Kargo Firması</div>
                    <Select isMulti value={selectedKargo} options={kargoOptions} onChange={(v) => handleSelect("kargo_firmasi", v)} styles={selectStyles(isDark)} placeholder="Kargo firması seç…" noOptionsMessage={() => "Sonuç yok"} />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400"><FiSend /> Gönderen Firma</div>
                    <Select isMulti value={selectedGonderen} options={gonderenOptions} onChange={(v) => handleSelect("gonderen_firma", v)} styles={selectStyles(isDark)} placeholder="Gönderen firma seç…" noOptionsMessage={() => "Sonuç yok"} />
                  </div>
                  <label>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400"><FiSearch /> İrsaliye No</div>
                    <input value={irsaliyeNo} onChange={(e) => setIrsaliyeNo(e.target.value)} placeholder="İrsaliye no içinde ara…" className="h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-[#111925] dark:text-slate-200" />
                  </label>
                  </div>
                </div>
              )}

              {suggestion && (
                <div className="mx-4 mt-4 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-sky-400/20 dark:bg-sky-500/10">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sky-600 shadow-sm dark:bg-white/10 dark:text-sky-300"><FiStar /></div>
                    <div>
                      <div className="text-sm font-black text-sky-900 dark:text-sky-100">Buna benzeyen {suggestion.variants.length} değer daha buldum</div>
                      <div className="mt-1 text-xs font-medium text-sky-700/80 dark:text-sky-200/70">{suggestion.variants.slice(0, 4).join(" • ")}{suggestion.variants.length > 4 ? ` • +${suggestion.variants.length - 4}` : ""}</div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Harf büyüklüğü, boşluk ve Türkçe karakter farklılıkları benzer kabul edildi.</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => setSuggestion(null)} className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-white dark:hover:bg-white/5">Hayır</button>
                    <button onClick={addSuggestedVariants} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-sky-700"><FiCheck /> Filtreye Ekle</button>
                  </div>
                </div>
              )}

              {analysisOpen && (
                <div className="grid gap-3 border-b border-slate-200 p-4 dark:border-white/10 lg:grid-cols-3">
                  <Distribution title="Kargo Firmaları" icon={FiTruck} items={topCargo} total={filteredRows.length} />
                  <Distribution title="Gönderen Firmalar" icon={FiUsers} items={topSender} total={filteredRows.length} />
                  <Distribution title="İrsaliye Adları" icon={FiFileText} items={topInvoice} total={filteredRows.length} />
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-[1450px] w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-950 text-left text-[10px] font-black uppercase tracking-[.11em] text-slate-300 dark:bg-[#080d14]">
                    <tr>
                      <th className="px-4 py-3.5">Tarih</th>
                      <th className="px-4 py-3.5">Kargo Firması</th>
                      <th className="px-4 py-3.5">Gönderi No</th>
                      <th className="px-4 py-3.5">Gönderen Firma</th>
                      <th className="px-4 py-3.5">İrsaliye Adı</th>
                      <th className="px-4 py-3.5">İrsaliye No</th>
                      <th className="px-4 py-3.5">Odak Evrak No</th>
                      <th className="px-4 py-3.5 text-center">Evrak</th>
                      <th className="px-4 py-3.5 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {visibleRows.length === 0 ? (
                      <tr><td colSpan={9} className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5"><FiSearch size={23} /></div><div className="mt-3 text-sm font-black text-slate-600 dark:text-slate-300">Filtrelere uygun kayıt bulunamadı</div><div className="mt-1 text-xs text-slate-400">Filtreleri değiştirerek tekrar deneyin.</div></td></tr>
                    ) : visibleRows.map((row, index) => (
                      <tr key={row.id ?? `${page}-${index}`} className="cargo-row group bg-white transition hover:bg-sky-50/55 dark:bg-transparent dark:hover:bg-sky-500/[.055]" style={{ animationDelay: `${Math.min(index, 15) * 18}ms` }}>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">{formatDate(row.tarih)}</td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 transition group-hover:scale-105 dark:bg-sky-500/10 dark:text-sky-300"><FiTruck size={14} /></span><span className="max-w-[190px] truncate text-sm font-black text-slate-800 dark:text-slate-100" title={row.kargo_firmasi}>{row.kargo_firmasi || "—"}</span></div></td>
                        <td className="px-4 py-3"><button onClick={() => setDetail({ title: "Gönderi Numarası", value: row.gonderi_numarasi })} className="max-w-[180px] truncate font-mono text-xs font-bold text-sky-700 hover:underline dark:text-sky-300" title={row.gonderi_numarasi}>{row.gonderi_numarasi || "—"}</button></td>
                        <td className="px-4 py-3"><span className="block max-w-[230px] truncate text-sm font-semibold text-slate-700 dark:text-slate-200" title={row.gonderen_firma}>{row.gonderen_firma || "—"}</span></td>
                        <td className="px-4 py-3"><span className="inline-flex max-w-[220px] items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-extrabold text-slate-700 dark:bg-white/5 dark:text-slate-200" title={row.irsaliye_adi}><FiFileText className="shrink-0 text-sky-500" /><span className="truncate">{row.irsaliye_adi || "—"}</span></span></td>
                        <td className="px-4 py-3"><button onClick={() => setDetail({ title: "İrsaliye Numarası", value: row.irsaliye_no })} className="block max-w-[220px] truncate text-left text-xs font-bold text-sky-700 hover:underline dark:text-sky-300" title={row.irsaliye_no}>{row.irsaliye_no || "—"}</button></td>
                        <td className="px-4 py-3"><button onClick={() => setDetail({ title: "Odak Evrak Numarası", value: row.odak_evrak_no })} className="block max-w-[220px] truncate text-left text-xs font-bold text-slate-600 hover:text-sky-600 hover:underline dark:text-slate-300" title={row.odak_evrak_no}>{row.odak_evrak_no || "—"}</button></td>
                        <td className="px-4 py-3 text-center"><span className="inline-flex min-w-9 justify-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{row.evrak_adedi ?? 0}</span></td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-1.5"><button onClick={() => copyRowAsImage(row)} className="grid h-9 w-9 place-items-center rounded-lg border border-sky-200 bg-sky-50 text-sky-600 transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400" title="Görsel olarak kopyala"><FiCopy /></button><button onClick={() => openEdit(row)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-white/10 dark:hover:bg-amber-500/10" title="Düzenle"><FiEdit2 /></button><button onClick={() => deleteRow(row)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:hover:bg-rose-500/10" title="Sil"><FiTrash2 /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                <div className="text-xs font-semibold text-slate-400">{filteredRows.length.toLocaleString("tr-TR")} kaydın {filteredRows.length ? ((page - 1) * PAGE_SIZE + 1).toLocaleString("tr-TR") : 0}–{Math.min(page * PAGE_SIZE, filteredRows.length).toLocaleString("tr-TR")} arası gösteriliyor.</div>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-30 dark:border-white/10"><FiChevronLeft /></button>
                  <span className="min-w-24 text-center text-xs font-black text-slate-600 dark:text-slate-300">{page} / {pageCount}</span>
                  <button disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-30 dark:border-white/10"><FiChevronRight /></button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>


      {columnsOpen && <Modal title="Kolon Yönetimi" subtitle="Tabloda görmek istediğiniz alanları seçin. Seçiminiz bu tarayıcıda kaydedilir." onClose={()=>setColumnsOpen(false)} footer={<div className="flex justify-between"><button onClick={()=>setVisibleColumns(DEFAULT_COLUMNS)} className="text-sm font-black text-slate-500">Tümünü Göster</button><button onClick={()=>setColumnsOpen(false)} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white">Uygula</button></div>}>
        <div className="grid gap-2 sm:grid-cols-2">{ALL_COLUMNS.map(([key,label])=><button key={key} onClick={()=>setVisibleColumns(v=>v.includes(key)?v.filter(x=>x!==key):[...v,key])} className={cx("flex items-center justify-between rounded-xl border px-3 py-3 text-sm font-bold transition",visibleColumns.includes(key)?"border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-500/10":"border-slate-200 text-slate-400 dark:border-white/10")}><span>{label}</span>{visibleColumns.includes(key)?<FiEye/>:<FiEyeOff/>}</button>)}</div>
        <p className="mt-4 text-xs text-slate-400">Not: Kolon görünürlüğü kaydedilir; tablo dışa aktarma verisinin tamamını korur.</p>
      </Modal>}

      {excelPreviewOpen && <Modal wide title="Excel Ön İzleme" subtitle={`${filteredRows.length.toLocaleString("tr-TR")} filtrelenmiş kayıt dışa aktarılacak.`} onClose={()=>setExcelPreviewOpen(false)} footer={<div className="flex justify-end gap-2"><button onClick={()=>setExcelPreviewOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black dark:border-white/10">Vazgeç</button><button onClick={async()=>{setExcelPreviewOpen(false);await exportExcel();}} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-black text-white"><FiDownload/> Excel'i İndir</button></div>}>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Kpi icon={FiLayers} label="Kayıt" value={filteredRows.length}/><Kpi icon={FiFileText} label="Evrak" value={totalDocuments}/><Kpi icon={FiTruck} label="Kargo" value={uniqueCargo}/><Kpi icon={FiUsers} label="Gönderen" value={uniqueSender}/></div>
        <div className="overflow-auto rounded-2xl border border-slate-200 dark:border-white/10"><table className="min-w-full text-xs"><thead className="bg-slate-950 text-white"><tr>{["Tarih","Kargo","Gönderen","İrsaliye Adı","İrsaliye No"].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead><tbody>{filteredRows.slice(0,12).map((r,i)=><tr key={i} className="border-t border-slate-100 dark:border-white/5"><td className="px-3 py-2">{formatDate(r.tarih)}</td><td className="px-3 py-2">{r.kargo_firmasi}</td><td className="px-3 py-2">{r.gonderen_firma}</td><td className="px-3 py-2">{r.irsaliye_adi}</td><td className="px-3 py-2">{r.irsaliye_no}</td></tr>)}</tbody></table></div>
        {filteredRows.length>12&&<div className="mt-3 text-center text-xs font-bold text-slate-400">Ön izlemede ilk 12 kayıt gösteriliyor. Excel dosyasında {filteredRows.length.toLocaleString("tr-TR")} kaydın tamamı olacak.</div>}
      </Modal>}

      {qualityOpen && <Modal wide title="Veri Kalite Merkezi" subtitle="Aynı anlama gelebilecek farklı yazımları inceleyin; analizde birleştirin veya onayla veritabanında standartlaştırın." onClose={()=>setQualityOpen(false)}>
        <div className="space-y-3">{qualityFamilies.length?qualityFamilies.map((f,i)=><motion.div layout key={`${f.field}-${f.key}`} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-[10px] font-black uppercase tracking-wider text-sky-500">{FIELD_META[f.field]?.label}</div><div className="mt-1 text-sm font-black text-slate-800 dark:text-white">Önerilen standart: {f.canonical}</div><div className="mt-2 flex flex-wrap gap-1.5">{f.variants.map(v=><span key={v} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">{v}</span>)}</div></div>
          <div className="flex shrink-0 gap-2"><button onClick={()=>handleSelect(f.field,f.variants.map(v=>({value:v,label:v})))} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 dark:bg-sky-500/10">Birleştirilmiş Analiz</button><button onClick={()=>fixQualityFamily(f)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">Veritabanında Düzelt</button></div></div>
        </motion.div>):<div className="rounded-2xl bg-emerald-50 p-6 text-center text-sm font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Benzer yazılmış değer ailesi bulunamadı.</div>}</div>
      </Modal>}

      {comparisonOpen && <Modal wide title="Karşılaştırma Modu" subtitle="Yüklü tarih aralığında iki kargo firmasını yan yana karşılaştırın." onClose={()=>setComparisonOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">{[["A",compareA,setCompareA],["B",compareB,setCompareB]].map(([label,val,setter])=><label key={label}><div className="mb-1.5 text-[11px] font-black uppercase text-slate-400">Firma {label}</div><select value={val} onChange={e=>setter(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold dark:border-white/10 dark:bg-[#0d141f]">{uniqueValues(filteredRows,"kargo_firmasi").map(v=><option key={v}>{v}</option>)}</select></label>)}</div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><Kpi icon={FiTruck} label={compareA||"Firma A"} value={comparison.a}/><Kpi icon={FiTruck} label={compareB||"Firma B"} value={comparison.b}/><Kpi icon={FiTrendingUp} label="Fark" value={`${comparison.diff>0?"+":""}${comparison.diff} (${comparison.pct}%)`}/></div>
        <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:compareA||"A",count:comparison.a},{name:compareB||"B",count:comparison.b}]}><CartesianGrid strokeDasharray="3 3" opacity={.15}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="count" fill="#0ea5e9" radius={[10,10,0,0]}/></BarChart></ResponsiveContainer></div>
      </Modal>}

      {detail && (
        <Modal title={detail.title} subtitle="Uzun değerleri görüntüleyebilir veya kopyalayabilirsiniz." onClose={() => setDetail(null)} footer={<div className="flex justify-end gap-2"><button onClick={() => copy(detail.value)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-600 dark:bg-white dark:text-slate-950"><FiCopy /> Kopyala</button></div>}>
          <div className="whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-700 dark:bg-black/20 dark:text-slate-200">{detail.value || "—"}</div>
        </Modal>
      )}

      {editing && (
        <Modal wide title="Kargo Kaydını Düzenle" subtitle="Değişiklikler doğrudan seçili kayda uygulanır." onClose={() => setEditing(null)} footer={<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><button onClick={() => deleteRow(editing)} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"><FiTrash2 /> Kaydı Sil</button><div className="flex gap-2"><button onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-300">Vazgeç</button><button onClick={saveEdit} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-sky-700">Güncelle</button></div></div>}>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["tarih", "Tarih", "date"], ["kargo_firmasi", "Kargo Firması", "text"], ["gonderi_numarasi", "Gönderi Numarası", "text"], ["gonderen_firma", "Gönderen Firma", "text"], ["irsaliye_adi", "İrsaliye Adı", "text"], ["irsaliye_no", "İrsaliye No", "text"], ["odak_evrak_no", "Odak Evrak No", "text"],
            ].map(([key, label, type]) => (
              <label key={key} className={key === "irsaliye_no" || key === "odak_evrak_no" ? "md:col-span-2" : ""}>
                <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</div>
                <input type={type} value={editing[key] || ""} onChange={(e) => setEditing((old) => ({ ...old, [key]: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-[#0d141f] dark:text-slate-200" />
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[.02]">
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={extraEnabled} onChange={(e) => setExtraEnabled(e.target.checked)} className="h-4 w-4 accent-sky-600" /> Ekstra evrak adedi ekle</label>
            <div className="flex items-center gap-3">{extraEnabled && <input type="number" min="0" value={extraCount} onChange={(e) => setExtraCount(e.target.value)} className="h-10 w-24 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-sky-400 dark:border-white/10 dark:bg-[#0d141f]" />}<span className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Hesaplanan evrak: {computedDocumentCount}</span></div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
