import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useDarkMode from "../hooks/useDarkMode";
import { ArrowLeft, ArrowRight, Barcode, Building2, CheckCircle2, Download, FileText, Plus, RotateCcw, ScanLine, Settings2, ShieldCheck, Trash2, X } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const STAMP_URL = "/images/kase.png";

const today = () => {
    const d = new Date();
    return d.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

const styles = `
.mev, .mev * { box-sizing: border-box; }
.mev {
    --bg:#f6f8fb;
    --surface:#ffffff;
    --surface-soft:#f8fafc;
    --surface-muted:#f1f5f9;
    --border:#e2e8f0;
    --border-strong:#cbd5e1;
    --text:#0f172a;
    --text-2:#475569;
    --text-3:#94a3b8;
    --blue:#0284c7;
    --cyan:#06b6d4;
    --green:#059669;
    --amber:#d97706;
    --red:#e11d48;
    min-height:100vh;
    background:var(--bg);
    color:var(--text);
    padding:20px 24px 42px;
    font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    transition:background .2s,color .2s;
}
.dark .mev {
    --bg:#0b1220;
    --surface:#111927;
    --surface-soft:#0d141f;
    --surface-muted:#182234;
    --border:rgba(255,255,255,.08);
    --border-strong:rgba(255,255,255,.14);
    --text:#f8fafc;
    --text-2:#cbd5e1;
    --text-3:#64748b;
}
.mev button,.mev input,.mev textarea{font:inherit}
.mev-inner{width:100%;max-width:1880px;margin:0 auto}
@keyframes mevFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mevPulse{0%,100%{opacity:.55;transform:scale(.88)}50%{opacity:1;transform:scale(1.1)}}
@keyframes mevScan{from{transform:translateX(-120%)}to{transform:translateX(420%)}}
@keyframes mevFlash{0%{background:rgba(14,165,233,.18)}100%{background:transparent}}

.mev-hero{
    position:relative;overflow:hidden;
    border:1px solid var(--border);border-radius:24px;background:var(--surface);
    box-shadow:0 14px 44px rgba(15,23,42,.05);padding:20px 22px;
    animation:mevFade .28s ease both;
}
.dark .mev-hero{box-shadow:0 18px 48px rgba(0,0,0,.22)}
.mev-hero::before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,#0284c7,#22d3ee,#06b6d4)}
.mev-topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0}
.mev-home-btn{
    width:42px;height:42px;display:grid;place-items:center;padding:0;border-radius:14px;
    background:var(--surface);border:1px solid var(--border);color:var(--text-2);cursor:pointer;
    transition:.18s ease;box-shadow:0 1px 2px rgba(15,23,42,.04)
}
.mev-home-btn:hover{border-color:#7dd3fc;color:var(--blue);background:rgba(14,165,233,.05);transform:translateX(-2px)}
.mev-home-btn-arrow{display:grid;place-items:center}
.mev-date-chip{
    display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 12px;border-radius:11px;
    background:rgba(14,165,233,.07);border:1px solid rgba(14,165,233,.16);color:var(--blue);
    font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase
}
.dark .mev-date-chip{color:#7dd3fc;background:rgba(14,165,233,.09)}
.mev-dot{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.10);animation:mevPulse 1.7s infinite}

.mev-header{margin:16px 0 0;display:flex;gap:14px;align-items:flex-start}
.mev-header-icon{
    width:48px;height:48px;flex:0 0 auto;border-radius:16px;display:grid;place-items:center;color:white;
    background:linear-gradient(135deg,#0284c7,#06b6d4);box-shadow:0 10px 24px rgba(14,165,233,.18)
}
.mev-header-copy{min-width:0}
.mev-eyebrow{
    display:inline-flex;align-items:center;gap:7px;padding:5px 9px;border-radius:999px;
    background:rgba(14,165,233,.07);color:var(--blue);font-size:9px;font-weight:950;
    letter-spacing:.12em;text-transform:uppercase
}
.dark .mev-eyebrow{color:#7dd3fc;background:rgba(14,165,233,.10)}
.mev-title{margin:7px 0 0;font-size:clamp(25px,3vw,32px);line-height:1.05;font-weight:950;letter-spacing:-.035em;color:var(--text)}
.mev-title span{color:var(--cyan)}
.mev-subtitle{margin-top:6px;color:var(--text-2);font-size:12px;font-weight:600;line-height:1.55}
.mev-divider{display:none}

.mev-workflow{
    margin-top:12px;padding:10px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;
    border:1px solid var(--border);border-radius:18px;background:var(--surface)
}
.mev-step{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--surface-soft);border:1px solid transparent}
.mev-step.active{border-color:rgba(14,165,233,.14);background:rgba(14,165,233,.045)}
.mev-step-no{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--surface-muted);color:var(--text-2);font-size:10px;font-weight:950;flex:0 0 auto}
.mev-step.active .mev-step-no{background:#0284c7;color:white}
.mev-step.done .mev-step-no{background:#ecfdf5;color:#047857}
.dark .mev-step.done .mev-step-no{background:rgba(16,185,129,.10);color:#6ee7b7}
.mev-step strong{display:block;font-size:11px;color:var(--text);font-weight:950}
.mev-step span{display:block;margin-top:2px;font-size:9px;color:var(--text-3);font-weight:650}

.mev-summary{margin-top:12px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.mev-summary-card{border:1px solid var(--border);border-radius:16px;background:var(--surface);padding:13px 14px}
.mev-summary-label{font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.11em;color:var(--text-3)}
.mev-summary-value{margin-top:5px;font-size:20px;font-weight:950;letter-spacing:-.025em;color:var(--text)}
.mev-summary-note{margin-top:3px;font-size:9px;font-weight:650;color:var(--text-3)}

.mev-glass{
    position:relative;margin-top:12px;padding:18px;border-radius:20px;background:var(--surface);
    border:1px solid var(--border);box-shadow:0 9px 28px rgba(15,23,42,.035);overflow:hidden
}
.dark .mev-glass{box-shadow:0 12px 32px rgba(0,0,0,.14)}
.mev-section-label{
    display:flex;align-items:center;gap:9px;margin-bottom:14px;color:var(--blue);
    font-size:9px;font-weight:950;letter-spacing:.13em;text-transform:uppercase
}
.mev-section-label::after{content:"";height:1px;background:var(--border);flex:1}
.mev-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
.mev-section-title{font-size:16px;font-weight:950;letter-spacing:-.02em;color:var(--text)}
.mev-section-sub{margin-top:3px;font-size:10px;font-weight:600;color:var(--text-3)}

.mev-firms{display:grid;grid-template-columns:1fr 48px 1fr;gap:10px;align-items:center}
.mev-firm-field{
    background:var(--surface-soft);border:1px solid var(--border);border-radius:15px;padding:13px 14px;transition:.18s
}
.mev-firm-field:focus-within{border-color:#38bdf8;box-shadow:0 0 0 4px rgba(14,165,233,.08)}
.mev-firm-tag{font-size:8px;font-weight:950;letter-spacing:.12em;color:var(--text-3);text-transform:uppercase;margin-bottom:6px}
.mev-firm-input{width:100%;background:transparent;border:0;outline:0;resize:none;color:var(--text);font-size:13px;font-weight:800;line-height:1.45}
.mev-arrow-circle{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;justify-self:center;background:rgba(14,165,233,.08);border:1px solid rgba(14,165,233,.15);color:var(--blue)}
.mev-desc-input{width:100%;min-height:84px;background:var(--surface-soft);border:1px solid var(--border);border-radius:15px;padding:13px 14px;outline:0;resize:none;color:var(--text-2);font-size:12px;font-weight:600;line-height:1.7}

.mev-scanner-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.mev-scanner-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mev-scanner-title{font-size:17px;font-weight:950;letter-spacing:-.02em;color:var(--text)}
.mev-count,.mev-scan-chip{height:27px;display:inline-flex;align-items:center;gap:6px;padding:0 9px;border-radius:9px;font-size:9px;font-weight:900}
.mev-count{background:var(--surface-muted);color:var(--text-2);border:1px solid var(--border)}
.mev-scan-chip{border:1px solid var(--border);background:var(--surface-soft);color:var(--text-3)}
.mev-scan-chip.active{color:#047857;background:#ecfdf5;border-color:#a7f3d0}
.dark .mev-scan-chip.active{color:#6ee7b7;background:rgba(16,185,129,.08);border-color:rgba(52,211,153,.16)}
.mev-scan-pulse{width:6px;height:6px;border-radius:50%;background:#10b981;animation:mevPulse 1.1s infinite}
.mev-settings-toggle,.mev-del-btn{
    border:1px solid var(--border);background:var(--surface);color:var(--text-2);border-radius:11px;cursor:pointer;transition:.16s
}
.mev-settings-toggle{height:36px;padding:0 12px;font-size:10px;font-weight:900}
.mev-settings-toggle:hover,.mev-settings-toggle.active{border-color:#7dd3fc;color:var(--blue);background:rgba(14,165,233,.05)}
.mev-settings-panel{margin-bottom:13px;padding:14px;border-radius:15px;border:1px solid rgba(14,165,233,.13);background:rgba(14,165,233,.035)}
.mev-settings-title{font-size:9px;font-weight:950;letter-spacing:.12em;color:var(--blue);text-transform:uppercase;margin-bottom:10px}
.mev-settings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.mev-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border-radius:12px;border:1px solid var(--border);background:var(--surface)}
.mev-toggle-label{font-size:10px;font-weight:900;color:var(--text)}
.mev-toggle-desc{margin-top:2px;font-size:8.5px;font-weight:600;color:var(--text-3)}
.mev-switch{position:relative;width:38px;height:22px;flex:0 0 auto}
.mev-switch input{opacity:0;width:0;height:0}
.mev-switch-track{position:absolute;inset:0;border-radius:999px;background:var(--surface-muted);border:1px solid var(--border);cursor:pointer;transition:.2s}
.mev-switch-track::after{content:"";position:absolute;width:14px;height:14px;border-radius:50%;background:#94a3b8;left:3px;top:3px;transition:.2s}
.mev-switch input:checked + .mev-switch-track{background:#0284c7;border-color:#0284c7}
.mev-switch input:checked + .mev-switch-track::after{left:19px;background:white}

.mev-inline-hint{margin-bottom:10px;font-size:9.5px;font-weight:650;color:var(--text-3)}
.mev-dup-warning,.mev-parse-error{display:flex;gap:8px;align-items:flex-start;margin-bottom:10px;padding:10px 11px;border-radius:12px;font-size:10px;font-weight:700}
.mev-dup-warning{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
.mev-parse-error{background:#fff1f2;border:1px solid #fecdd3;color:#be123c}
.dark .mev-dup-warning{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.18);color:#fbbf24}
.dark .mev-parse-error{background:rgba(225,29,72,.08);border-color:rgba(244,63,94,.18);color:#fda4af}

.mev-manual-grid{display:grid;grid-template-columns:170px minmax(0,1fr) auto;gap:8px;margin-bottom:12px}
.mev-manual-input{width:100%;height:44px;padding:0 12px;border-radius:12px;border:1px solid var(--border);background:var(--surface-soft);color:var(--text);outline:0;font-size:11px;font-weight:700;transition:.16s}
.mev-manual-input:focus{border-color:#38bdf8;box-shadow:0 0 0 4px rgba(14,165,233,.07)}
.mev-manual-input::placeholder{color:var(--text-3)}
.mev-add-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:12px;background:linear-gradient(90deg,#0284c7,#06b6d4);color:white;padding:0 15px;font-size:10px;font-weight:950;cursor:pointer;box-shadow:0 8px 18px rgba(14,165,233,.14);transition:.16s}
.mev-add-btn:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(14,165,233,.20)}

.mev-barcode-field{position:relative;overflow:hidden;border:1px dashed var(--border-strong);border-radius:15px;background:var(--surface-soft);transition:.18s}
.mev-barcode-field:hover{border-color:#7dd3fc;background:rgba(14,165,233,.035)}
.mev-barcode-field.scanning{border-style:solid;border-color:#38bdf8;background:rgba(14,165,233,.055);box-shadow:0 0 0 4px rgba(14,165,233,.06)}
.mev-barcode-field.scanning::after{content:"";position:absolute;inset:0 auto 0 0;width:28%;background:linear-gradient(90deg,transparent,rgba(34,211,238,.13),transparent);animation:mevScan 1.35s infinite}
.mev-barcode-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:rgba(14,165,233,.09);color:var(--blue);flex:0 0 auto}
.mev-scan-box-title{font-size:11px;font-weight:950;color:var(--text)}
.mev-scan-box-sub{margin-top:3px;font-size:9px;font-weight:650;color:var(--text-3);word-break:break-all;line-height:1.4}

.mev-table-outer{overflow:auto;border:1px solid var(--border);border-radius:15px;max-height:560px}
.mev-table{width:100%;border-collapse:separate;border-spacing:0;font-size:11px;min-width:620px}
.mev-table thead{position:sticky;top:0;z-index:4}
.mev-table thead tr{background:#0f172a}
.dark .mev-table thead tr{background:#08111f}
.mev-table th{padding:11px 12px;text-align:left;color:#cbd5e1;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.1em;border-right:1px solid rgba(255,255,255,.06)}
.mev-table td{padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text-2);background:var(--surface)}
.mev-table tbody tr:hover td{background:rgba(14,165,233,.04)}
.mev-table tbody tr:last-child td{border-bottom:0}
.mev-td-no{width:60px;color:var(--text-3)!important;font-size:9px;font-weight:900}
.mev-td-date{width:180px}
.mev-td-code{font-weight:800;color:var(--text)!important}
.mev-edit-input{width:100%;border:0;background:transparent;color:inherit;outline:0;font:inherit;font-weight:inherit;padding:0}
.mev-edit-input::placeholder{color:var(--text-3)}
.mev-del-btn{width:30px;height:30px;display:grid;place-items:center;padding:0}
.mev-del-btn:hover{border-color:#fecdd3;color:#e11d48;background:#fff1f2}
.dark .mev-del-btn:hover{background:rgba(225,29,72,.08);border-color:rgba(244,63,94,.18)}
.mev-empty{text-align:center;padding:44px 14px}
.mev-empty-icon{width:46px;height:46px;margin:0 auto 10px;display:grid;place-items:center;border-radius:14px;background:var(--surface-muted);color:var(--text-3)}
.mev-empty-text{font-size:10px;font-weight:650;color:var(--text-3)}
.mev-flash td{animation:mevFlash .55s ease}

.mev-actions{position:sticky;bottom:12px;z-index:12;margin-top:12px;display:flex;justify-content:flex-end;gap:8px;padding:10px;border:1px solid var(--border);border-radius:16px;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(14px);box-shadow:0 12px 30px rgba(15,23,42,.07)}
.mev-btn-ghost,.mev-btn-print{height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:11px;padding:0 14px;font-size:10px;font-weight:950;cursor:pointer;transition:.16s}
.mev-btn-ghost{border:1px solid var(--border);background:var(--surface);color:var(--text-2)}
.mev-btn-ghost:hover{color:#e11d48;border-color:#fecdd3;background:#fff1f2}
.dark .mev-btn-ghost:hover{background:rgba(225,29,72,.08);border-color:rgba(244,63,94,.18)}
.mev-btn-print{border:0;background:linear-gradient(90deg,#0284c7,#06b6d4);color:white;box-shadow:0 9px 22px rgba(14,165,233,.16)}
.mev-btn-print:hover{transform:translateY(-1px);box-shadow:0 11px 26px rgba(14,165,233,.22)}
.mev-btn-print:disabled{opacity:.55;cursor:not-allowed;transform:none}

@media(max-width:900px){
    .mev{padding:14px}
    .mev-workflow,.mev-summary,.mev-settings-grid{grid-template-columns:1fr}
    .mev-firms{grid-template-columns:1fr}
    .mev-arrow-circle{transform:rotate(90deg)}
    .mev-manual-grid{grid-template-columns:1fr}
}
@media(max-width:620px){
    .mev-hero{padding:17px}
    .mev-topbar{align-items:flex-start}
    .mev-date-chip{font-size:8px}
    .mev-summary{grid-template-columns:1fr 1fr}
    .mev-actions{position:static;flex-direction:column}
    .mev-btn-ghost,.mev-btn-print{width:100%}
}

/* ── PDF PRINT SHEET ── */
.print-sheet {
    position: fixed;
    left: -99999px;
    top: 0;
    width: 210mm;
    background: #fff;
    color: #111;
    z-index: -1;
}
.pdf-page {
    width: 210mm;
    height: 297mm;
    background: #fff;
    color: #111;
    overflow: hidden;
    position: relative;
    page-break-after: always;
}
.pdf-page:last-child { page-break-after: auto; }
.print-sheet-inner {
    width: 190mm;
    margin: 10mm auto;
    color: #111;
    font-family: Arial, sans-serif;
}
.print-top-title {
    border: 1.5px solid #222;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.2px;
    padding: 12px 10px;
    margin-bottom: 8px;
}
.print-top-date {
    border: 1px solid #444;
    text-align: right;
    font-size: 12px;
    font-weight: 700;
    padding: 8px 12px;
    margin-bottom: 8px;
}
.print-desc {
    border: 1px solid #444;
    text-align: center;
    font-size: 12px;
    line-height: 1.8;
    padding: 20px 18px;
    min-height: auto;
    margin-bottom: 12px;
}
.print-table-wrap {
    width: 100%;
    border: 1px solid #333;
    margin-bottom: 16px;
}
.print-grid {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: Arial, sans-serif;
}
.print-grid th, .print-grid td {
    border: 1px solid #555;
    padding: 6px 7px;
    font-size: 11.5px;
    line-height: 1.25;
    text-align: center;
    vertical-align: middle;
}
.print-grid th { font-weight: 700; background: #f3f3f3; }
.print-grid td.code { text-align: left; padding-left: 8px; }
.print-grid td.date { white-space: nowrap; }
.print-sign-row {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    width: 100%;
    break-inside: avoid;
    page-break-inside: avoid;
}
.print-sign-box {
    flex: 1;
    border: 1px solid #333;
    min-height: 150px;
    display: flex;
    flex-direction: column;
}
.print-sign-title {
    border-bottom: 1px solid #444;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    padding: 8px 6px;
    background: #f7f7f7;
}
.print-sign-firm {
    border-bottom: 1px solid #444;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    padding: 10px;
    line-height: 1.45;
    min-height: 40px;
}
.print-sign-body {
    flex: 1;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
}
.print-stamp {
    width: 150px;
    max-width: 100%;
    max-height: 75px;
    object-fit: contain;
    display: block;
    opacity: 0.98;
}
`;

const DEFAULT_EDEN = "ODAK TEDARİK ZİNCİRİ VE LOJİSTİK A.Ş.";
const DEFAULT_ALAN = "ES GLOBAL GIDA SANAYİ VE TİCARET A.Ş.";

function buildDescription(teslimAlan) {
    return `Aşağıda Tarih ve İrsaliye numaraları bulunan ${teslimAlan} firma irsaliyelerinin kaşe-imzalı (ürünlerin teslim edildiklerine dair teslimat onaylı) nüshaları ODAK TEDARİK ZİNCİRİ VE LOJİSTİK A.Ş. yetkilisi tarafından, ${teslimAlan} yetkilisine teslim edilmiştir.`;
}

function normalizeBarcodeText(input) {
    if (!input) return "";
    return String(input)
        .replace(/[""„‟]/g, '"').replace(/[''‚‛]/g, "'")
        .replace(/\r?\n/g, " ").replace(/\s+/g, " ")
        .replace(/ı/g, "i").replace(/İ/g, "I")
        .replace(/ş/g, "s").replace(/Ş/g, "S")
        .replace(/ğ/g, "g").replace(/Ğ/g, "G")
        .replace(/ü/g, "u").replace(/Ü/g, "U")
        .replace(/ö/g, "o").replace(/Ö/g, "O")
        .replace(/ç/g, "c").replace(/Ç/g, "C")
        .trim();
}

function formatDateToTR(value) {
    if (!value) return "";
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return value;
}

function parseBarcode(raw) {
    if (!raw) return null;
    const text = normalizeBarcodeText(raw);
    const noMatch =
        text.match(/["']?no["']?\s*[\.\:\=\-]?\s*["']?([a-z0-9]{16})["']?/i) ||
        text.match(/\b([a-z]{2}\d{14})\b/i);
    const tarihMatch =
        text.match(/["']?tarih["']?\s*[\.\:\=\-]?\s*["']?(\d{4}-\d{2}-\d{2})["']?/i) ||
        text.match(/["']?sevktarihi["']?\s*[\.\:\=\-]?\s*["']?(\d{4}-\d{2}-\d{2})["']?/i);
    const noVal = noMatch?.[1] ? noMatch[1].toUpperCase().trim() : null;
    const tarihVal = tarihMatch?.[1] ? formatDateToTR(tarihMatch[1]) : "";
    if (!noVal) return null;
    return { irsaliye: noVal, tarih: tarihVal };
}

function splitRowsForTwoColumns(rowsForPage) {
    const half = Math.ceil(rowsForPage.length / 2);
    return { left: rowsForPage.slice(0, half), right: rowsForPage.slice(half) };
}

export default function MusteriEvraklari() {
    const navigate = useNavigate();
    useDarkMode();

    const [teslimEden, setTeslimEden] = useState(DEFAULT_EDEN);
    const [teslimAlan, setTeslimAlan] = useState(DEFAULT_ALAN);
    const aciklama = useMemo(() => buildDescription(teslimAlan), [teslimAlan]);

    const [rows, setRows] = useState([]);
    const [flashId, setFlashId] = useState(null);
    const [dupWarning, setDupWarning] = useState(null);
    const [parseError, setParseError] = useState(null);
    const [lastRawScan, setLastRawScan] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [scanMode, setScanMode] = useState(false);
    const [scanBuffer, setScanBuffer] = useState("");

    const [dupCheck, setDupCheck] = useState(true);
    const [beepEnabled, setBeepEnabled] = useState(true);
    const [autoStopAfterRead, setAutoStopAfterRead] = useState(false);

    const [manualDate, setManualDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    });
    const [manualIrsaliye, setManualIrsaliye] = useState("");

    const scanAreaRef = useRef(null);
    const audioCtxRef = useRef(null);
    const scanTimeoutRef = useRef(null);
    const bufferRef = useRef("");
    const printSheetRef = useRef(null);

    // ─── Sayfalama sabitleri ────────────────────────────────────────────────
    const FIRST_PAGE_CAPACITY = 46;
    const OTHER_PAGE_CAPACITY = 58;
    // ────────────────────────────────────────────────────────────────────────

    const pdfPages = useMemo(() => {
        const ordered = [...rows].reverse();
        const pages = [];

        if (ordered.length === 0) {
            return [{ rows: [], showHeader: true, showSignatures: true, startNo: 1 }];
        }

        let index = 0;
        let startNo = 1;
        let isFirstPage = true;

        while (index < ordered.length) {
            const remaining = ordered.length - index;
            const capacity = isFirstPage ? FIRST_PAGE_CAPACITY : OTHER_PAGE_CAPACITY;

            if (remaining <= capacity) {
                const chunk = ordered.slice(index);
                pages.push({ rows: chunk, showHeader: isFirstPage, showSignatures: true, startNo });
                index += chunk.length;
                startNo += chunk.length;
                break;
            }

            const chunk = ordered.slice(index, index + capacity);
            pages.push({ rows: chunk, showHeader: isFirstPage, showSignatures: false, startNo });
            index += chunk.length;
            startNo += chunk.length;
            isFirstPage = false;
        }

        if (!pages.some((p) => p.showSignatures)) {
            pages.push({ rows: [], showHeader: false, showSignatures: true, startNo });
        }

        return pages;
    }, [rows]);

    const playBeep = useCallback((success = true) => {
        if (!beepEnabled) return;
        try {
            if (!audioCtxRef.current)
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = success ? 880 : 320;
            osc.type = success ? "sine" : "square";
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.12 : 0.22));
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
        } catch (_) { }
    }, [beepEnabled]);

    const stopScanMode = useCallback(() => {
        bufferRef.current = ""; setScanBuffer(""); setScanMode(false);
        if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
    }, []);

    const insertRow = useCallback((irsaliyeNo, tarih, rawForError = "") => {
        const cleanNo = String(irsaliyeNo || "").trim().toUpperCase();
        const cleanDate = String(tarih || "").trim();

        if (!cleanNo) {
            setLastRawScan(rawForError); setParseError("NO_BULUNAMADI");
            setTimeout(() => setParseError(null), 3500); playBeep(false); return false;
        }
        if (cleanNo.length !== 16) {
            setLastRawScan(rawForError || cleanNo);
            setParseError({ type: "UZUNLUK_HATASI", val: cleanNo, len: cleanNo.length });
            setTimeout(() => setParseError(null), 3500); playBeep(false); return false;
        }
        if (dupCheck) {
            const exists = rows.some((r) => r.irsaliye === cleanNo);
            if (exists) {
                setDupWarning(cleanNo); setTimeout(() => setDupWarning(null), 2500); playBeep(false); return false;
            }
        }

        const fallbackToday = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setRows((prev) => [{ id, tarih: cleanDate || fallbackToday, irsaliye: cleanNo }, ...prev]);
        setFlashId(id); setTimeout(() => setFlashId(null), 500); playBeep(true);
        return true;
    }, [rows, dupCheck, playBeep]);

    const addRow = useCallback((raw) => {
        const trimmed = String(raw || "").trim();
        if (!trimmed) return false;
        setDupWarning(null); setParseError(null);
        const parsed = parseBarcode(trimmed);
        if (!parsed?.irsaliye) {
            setLastRawScan(trimmed); playBeep(false); setParseError("NO_BULUNAMADI");
            setTimeout(() => setParseError(null), 3500); return false;
        }
        const success = insertRow(parsed.irsaliye, parsed.tarih, trimmed);
        if (success) {
            setLastRawScan(trimmed);
            if (autoStopAfterRead) stopScanMode();
            else { bufferRef.current = ""; setScanBuffer(""); }
        }
        return success;
    }, [insertRow, autoStopAfterRead, stopScanMode, playBeep]);

    const handleManualAdd = useCallback(() => {
        setDupWarning(null); setParseError(null);
        const success = insertRow(manualIrsaliye, formatDateToTR(manualDate), `manuel:${manualIrsaliye}`);
        if (success) setManualIrsaliye("");
    }, [insertRow, manualIrsaliye, manualDate]);

    const startScanMode = useCallback(() => {
        bufferRef.current = ""; setScanBuffer(""); setParseError(null); setDupWarning(null); setScanMode(true);
        setTimeout(() => { scanAreaRef.current?.focus(); }, 10);
    }, []);

    useEffect(() => {
        const finalizeScan = () => {
            const payload = bufferRef.current.trim();
            if (!payload) return;
            addRow(payload);
            if (!autoStopAfterRead) { bufferRef.current = ""; setScanBuffer(""); }
        };
        const resetTimer = () => {
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = setTimeout(finalizeScan, 180);
        };
        const handleKeyDown = (e) => {
            if (!scanMode) return;
            const tag = document.activeElement?.tagName;
            if (tag === "TEXTAREA" && document.activeElement !== scanAreaRef.current) return;
            if (tag === "INPUT") return;
            e.preventDefault(); e.stopPropagation();
            if (e.key === "Enter") { finalizeScan(); return; }
            if (e.key === "Escape") { stopScanMode(); return; }
            if (e.key === "Backspace") { bufferRef.current = bufferRef.current.slice(0, -1); setScanBuffer(bufferRef.current); resetTimer(); return; }
            if (e.key === "Tab") return;
            if (e.key && e.key.length === 1) { bufferRef.current += e.key; setScanBuffer(bufferRef.current); resetTimer(); }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
        };
    }, [scanMode, addRow, stopScanMode, autoStopAfterRead]);

    const updateRow = (id, field, value) =>
        setRows((prev) => prev.map((row) => row.id === id ? { ...row, [field]: value } : row));
    const deleteRow = (id) =>
        setRows((prev) => prev.filter((r) => r.id !== id));
    const handleClear = () => {
        if (rows.length === 0) return;
        if (window.confirm("Tüm irsaliye kayıtları silinsin mi?")) setRows([]);
    };

    const waitForImages = useCallback(async (container) => {
        const imgs = Array.from(container.querySelectorAll("img"));
        await Promise.all(imgs.map((img) =>
            img.complete && img.naturalWidth > 0
                ? Promise.resolve()
                : new Promise((res) => { img.onload = res; img.onerror = res; })
        ));
    }, []);

    const exportPDF = useCallback(async () => {
        const pageElements = Array.from(printSheetRef.current?.querySelectorAll(".pdf-page") || []);
        if (!pageElements.length) return;
        try {
            setIsExporting(true);
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            for (let i = 0; i < pageElements.length; i++) {
                await waitForImages(pageElements[i]);
                const canvas = await html2canvas(pageElements[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
            }
            pdf.save("evrak-teslim-tutanagi-" + today().replaceAll(".", "-") + ".pdf");
        } catch (err) {
            console.error("PDF export hatası:", err);
            alert("PDF oluşturulurken bir hata oluştu.");
        } finally {
            setIsExporting(false);
        }
    }, [waitForImages]);

    const handleGoHome = (e) => {
        e.preventDefault();
        navigate("/anasayfa");
    };

    return (
        <>
            <style>{styles}</style>

            <div className="mev">
                <div className="mev-inner">

                    <section className="mev-hero">
                        <div className="mev-topbar">
                            <button className="mev-home-btn" onClick={handleGoHome} title="Ana sayfaya dön">
                                <span className="mev-home-btn-arrow"><ArrowLeft size={17} /></span>
                            </button>
                            <div className="mev-date-chip">
                                <span className="mev-dot" />
                                Teslim tarihi · {today()}
                            </div>
                        </div>

                        <div className="mev-header">
                            <div className="mev-header-icon"><FileText size={22} /></div>
                            <div className="mev-header-copy">
                                <div className="mev-eyebrow"><ShieldCheck size={12} /> Evrak Teslim Merkezi</div>
                                <h1 className="mev-title">Müşteri <span>Evrakları</span></h1>
                                <p className="mev-subtitle">Teslim taraflarını belirleyin, irsaliyeleri manuel veya barkod ile ekleyin ve teslim tutanağını PDF olarak oluşturun.</p>
                            </div>
                        </div>
                    </section>

                    <section className="mev-workflow">
                        <div className="mev-step active done">
                            <div className="mev-step-no"><CheckCircle2 size={15} /></div>
                            <div><strong>Tarafları Kontrol Et</strong><span>Teslim eden ve alan firma bilgileri</span></div>
                        </div>
                        <div className={`mev-step ${rows.length ? "active done" : "active"}`}>
                            <div className="mev-step-no">{rows.length ? <CheckCircle2 size={15} /> : <ScanLine size={15} />}</div>
                            <div><strong>İrsaliyeleri Ekle</strong><span>Manuel giriş veya barkod okutma</span></div>
                        </div>
                        <div className={`mev-step ${rows.length ? "active" : ""}`}>
                            <div className="mev-step-no"><Download size={15} /></div>
                            <div><strong>Tutanağı Oluştur</strong><span>Kontrol et ve PDF olarak indir</span></div>
                        </div>
                    </section>

                    <section className="mev-summary">
                        <div className="mev-summary-card">
                            <div className="mev-summary-label">İrsaliye</div>
                            <div className="mev-summary-value">{rows.length}</div>
                            <div className="mev-summary-note">Listede bulunan kayıt</div>
                        </div>
                        <div className="mev-summary-card">
                            <div className="mev-summary-label">Okutma</div>
                            <div className="mev-summary-value">{scanMode ? "Aktif" : "Hazır"}</div>
                            <div className="mev-summary-note">Barkod okuyucu durumu</div>
                        </div>
                        <div className="mev-summary-card">
                            <div className="mev-summary-label">Tekrar Kontrolü</div>
                            <div className="mev-summary-value">{dupCheck ? "Açık" : "Kapalı"}</div>
                            <div className="mev-summary-note">Mükerrer kayıt koruması</div>
                        </div>
                        <div className="mev-summary-card">
                            <div className="mev-summary-label">PDF Sayfası</div>
                            <div className="mev-summary-value">{pdfPages.length}</div>
                            <div className="mev-summary-note">Oluşturulacak tutanak</div>
                        </div>
                    </section>

                    {/* ── TARAFLAR ── */}
                    <div className="mev-glass">
                        <div className="mev-section-head">
                            <div>
                                <div className="mev-section-label"><Building2 size={12} /> Taraf Bilgileri</div>
                                <div className="mev-section-title">Teslim eden ve teslim alan</div>
                                <div className="mev-section-sub">Tutanakta görünecek firma bilgilerini kontrol edin.</div>
                            </div>
                        </div>
                        <div className="mev-firms">
                            <div className="mev-firm-field">
                                <div className="mev-firm-tag">Teslim Eden</div>
                                <textarea className="mev-firm-input" rows={2} value={teslimEden} onChange={(e) => setTeslimEden(e.target.value)} />
                            </div>
                            <div className="mev-arrow-circle"><ArrowRight size={16} /></div>
                            <div className="mev-firm-field">
                                <div className="mev-firm-tag">Teslim Alan</div>
                                <textarea className="mev-firm-input" rows={2} value={teslimAlan} onChange={(e) => setTeslimAlan(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* ── AÇIKLAMA ── */}
                    <div className="mev-glass">
                        <div className="mev-section-head">
                            <div>
                                <div className="mev-section-label"><FileText size={12} /> Tutanak Açıklaması</div>
                                <div className="mev-section-title">PDF'de yer alacak açıklama</div>
                                <div className="mev-section-sub">Teslim alan bilgisine göre otomatik hazırlanır.</div>
                            </div>
                        </div>
                        <textarea className="mev-desc-input" value={aciklama} rows={4} readOnly />
                    </div>

                    {/* ── İRSALİYE LİSTESİ ── */}
                    <div className="mev-glass">
                        <div className="mev-scanner-header">
                            <div className="mev-scanner-left">
                                <div className="mev-scanner-title">İrsaliye Listesi</div>
                                <div className="mev-count">{rows.length} adet</div>
                                <div className={`mev-scan-chip${scanMode ? " active" : ""}`}>
                                    {scanMode && <span className="mev-scan-pulse" />}
                                    {scanMode ? "OKUTMA AKTİF" : "BEKLEMEDE"}
                                </div>
                            </div>
                            <button
                                className={`mev-settings-toggle${showSettings ? " active" : ""}`}
                                onClick={() => setShowSettings((p) => !p)}
                                type="button"
                            >
                                <Settings2 size={14} /> Barkod Ayarları
                            </button>
                        </div>

                        {showSettings && (
                            <div className="mev-settings-panel">
                                <div className="mev-settings-title">Barkod Okuyucu Ayarları</div>
                                <div className="mev-settings-grid">
                                    {[
                                        { label: "Tekrar Okutma Engeli", desc: "Aynı barkod 2 kez eklenmesin", val: dupCheck, set: setDupCheck },
                                        { label: "Sesli Bip", desc: "Başarı / hata sesi", val: beepEnabled, set: setBeepEnabled },
                                        { label: "Her Okutmadan Sonra Kapat", desc: "Tek okutma sonrası aktif mod kapanır", val: autoStopAfterRead, set: setAutoStopAfterRead },
                                    ].map(({ label, desc, val, set }) => (
                                        <div className="mev-toggle-row" key={label}>
                                            <div>
                                                <div className="mev-toggle-label">{label}</div>
                                                <div className="mev-toggle-desc">{desc}</div>
                                            </div>
                                            <label className="mev-switch">
                                                <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
                                                <span className="mev-switch-track" />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {parseError && (
                            <div className="mev-parse-error">
                                <span>✕</span>
                                <div>
                                    <div>
                                        {parseError === "NO_BULUNAMADI"
                                            ? "Okutulan veride veya manuel girişte geçerli İrsaliye No bulunamadı."
                                            : <span><b>{parseError.val}</b> — {parseError.len} karakter, 16 olmalı.</span>
                                        }
                                    </div>
                                    {lastRawScan && (
                                        <div style={{ marginTop: 6, opacity: 0.9, wordBreak: "break-all" }}>
                                            <b>Ham veri:</b> {lastRawScan}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {dupWarning && (
                            <div className="mev-dup-warning">
                                <span>⚠</span>
                                <span><b>{dupWarning}</b> zaten listede mevcut — tekrar eklenmedi.</span>
                            </div>
                        )}

                        <div className="mev-inline-hint">
                            Manuel giriş veya barkod okutma ile kayıt ekleyebilirsiniz.
                        </div>

                        <div className="mev-manual-grid">
                            <input
                                type="date"
                                className="mev-manual-input"
                                value={manualDate}
                                onChange={(e) => setManualDate(e.target.value)}
                            />
                            <input
                                type="text"
                                className="mev-manual-input"
                                placeholder="Manuel İrsaliye No (16 karakter)"
                                value={manualIrsaliye}
                                onChange={(e) => setManualIrsaliye(e.target.value.toUpperCase())}
                                onKeyDown={(e) => { if (e.key === "Enter") handleManualAdd(); }}
                            />
                            <button
                                type="button"
                                className="mev-add-btn"
                                onClick={handleManualAdd}
                                style={{ minHeight: 56, padding: "0 1.5rem" }}
                            >
                                <Plus size={15} /> Manuel Ekle
                            </button>
                        </div>

                        {/* ── BARKOD OKUTMA ALANI ── */}
                        <div style={{ marginBottom: "1.75rem" }}>
                            <div
                                ref={scanAreaRef}
                                tabIndex={0}
                                className={`mev-barcode-field${scanMode ? " scanning" : ""}`}
                                onClick={startScanMode}
                                style={{
                                    minHeight: 92,
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    justifyContent: "center",
                                    padding: "1.25rem 1.4rem"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", width: "100%", position: "relative", zIndex: 1 }}>
                                    <span className="mev-barcode-icon"><Barcode size={18} /></span>
                                    <div style={{ flex: 1 }}>
                                        <div className="mev-scan-box-title">
                                            {scanMode ? "Okutma aktif — barkodu okutun" : "Barkod okutmak için tıklayın"}
                                        </div>
                                        <div className="mev-scan-box-sub">
                                            {scanBuffer || (scanMode ? "Veri bekleniyor..." : "Tıklayın, sonra barkodu okutun")}
                                        </div>
                                    </div>
                                    {scanMode ? (
                                        <button
                                            type="button"
                                            className="mev-del-btn"
                                            onClick={(e) => { e.stopPropagation(); stopScanMode(); }}
                                            style={{ fontSize: 14, padding: "0.6rem 1.1rem" }}
                                        >
                                            <X size={14} />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="mev-add-btn"
                                            onClick={(e) => { e.stopPropagation(); startScanMode(); }}
                                            style={{ height: 44, padding: "0 1.2rem", fontSize: 14 }}
                                        >
                                            <ScanLine size={15} /> Okutmayı Başlat
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── TABLO ── */}
                        <div className="mev-table-outer">
                            <table className="mev-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Tarih</th>
                                        <th>İrsaliye No</th>
                                        <th style={{ width: 60 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4}>
                                                <div className="mev-empty">
                                                    <span className="mev-empty-icon"><FileText size={20} /></span>
                                                    <span className="mev-empty-text">
                                                        Manuel ekleyin veya barkod okutun — irsaliyeler burada görünecek
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, i) => (
                                            <tr key={row.id} className={flashId === row.id ? "mev-flash" : ""}>
                                                <td className="mev-td-no">{rows.length - i}</td>
                                                <td className="mev-td-date">
                                                    <input
                                                        type="text"
                                                        value={row.tarih}
                                                        onChange={(e) => updateRow(row.id, "tarih", e.target.value)}
                                                        className="mev-edit-input"
                                                        placeholder="gg.aa.yyyy"
                                                    />
                                                </td>
                                                <td className="mev-td-code">
                                                    <input
                                                        type="text"
                                                        value={row.irsaliye}
                                                        onChange={(e) => updateRow(row.id, "irsaliye", e.target.value.toUpperCase())}
                                                        className="mev-edit-input"
                                                        placeholder="İrsaliye No"
                                                    />
                                                </td>
                                                <td>
                                                    <button type="button" className="mev-del-btn" onClick={() => deleteRow(row.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── ACTIONS ── */}
                    <div className="mev-actions">
                        <button type="button" className="mev-btn-ghost" onClick={handleClear}>
                            <RotateCcw size={14} /> Sıfırla
                        </button>
                        <button type="button" className="mev-btn-print" onClick={exportPDF} disabled={isExporting}>
                            <Download size={15} /> {isExporting ? "PDF Oluşturuluyor..." : "PDF İndir"}
                        </button>
                    </div>

                    {/* ── GİZLİ PDF SAYFASI ── */}
                    <div className="print-sheet" ref={printSheetRef}>
                        {pdfPages.map((page, pageIndex) => {
                            const pageRows = splitRowsForTwoColumns(page.rows);
                            const rowCount = Math.max(pageRows.left.length, pageRows.right.length);
                            return (
                                <div className="pdf-page" key={pageIndex}>
                                    <div className="print-sheet-inner">
                                        {page.showHeader && (
                                            <>
                                                <div className="print-top-title">EVRAK TESLİM TUTANAĞI</div>
                                                <div className="print-top-date">TESLİM TARİHİ : {today()}</div>
                                                <div className="print-desc">{aciklama}</div>
                                            </>
                                        )}
                                        {page.rows.length > 0 && (
                                            <div className="print-table-wrap">
                                                <table className="print-grid">
                                                    <colgroup>
                                                        <col style={{ width: "5%" }} /><col style={{ width: "14%" }} /><col style={{ width: "31%" }} />
                                                        <col style={{ width: "5%" }} /><col style={{ width: "14%" }} /><col style={{ width: "31%" }} />
                                                    </colgroup>
                                                    <thead>
                                                        <tr>
                                                            <th>NO</th><th>TARİH</th><th>İRSALİYE NO</th>
                                                            <th>NO</th><th>TARİH</th><th>İRSALİYE NO</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Array.from({ length: rowCount }).map((_, idx) => {
                                                            const left = pageRows.left[idx];
                                                            const right = pageRows.right[idx];
                                                            return (
                                                                <tr key={idx}>
                                                                    <td>{left ? page.startNo + idx : ""}</td>
                                                                    <td className="date">{left?.tarih || ""}</td>
                                                                    <td className="code">{left?.irsaliye || ""}</td>
                                                                    <td>{right ? page.startNo + pageRows.left.length + idx : ""}</td>
                                                                    <td className="date">{right?.tarih || ""}</td>
                                                                    <td className="code">{right?.irsaliye || ""}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        {page.showSignatures && (
                                            <div className="print-sign-row">
                                                <div className="print-sign-box">
                                                    <div className="print-sign-title">EVRAK TESLİM EDEN</div>
                                                    <div className="print-sign-firm">{teslimEden}</div>
                                                    <div className="print-sign-body">
                                                        <img src={STAMP_URL} alt="Firma Kaşesi" className="print-stamp" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                                    </div>
                                                </div>
                                                <div className="print-sign-box">
                                                    <div className="print-sign-title">EVRAK TESLİM ALAN</div>
                                                    <div className="print-sign-firm">{teslimAlan}</div>
                                                    <div className="print-sign-body" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </>
    );
}