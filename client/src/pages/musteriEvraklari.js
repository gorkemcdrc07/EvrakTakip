import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'Plus Jakarta Sans', sans-serif;
}

.mev {
    min-height: 100vh;
    background: #080810;
    color: #e2e0f0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    padding: 3.25rem 2.75rem;
    position: relative;
    overflow-x: hidden;
}

.mev::before {
    content: '';
    position: fixed;
    top: -30%; left: -10%;
    width: 60%; height: 70%;
    background: radial-gradient(ellipse, rgba(99,77,255,0.07) 0%, transparent 65%);
    pointer-events: none; z-index: 0;
}

.mev::after {
    content: '';
    position: fixed;
    bottom: -20%; right: -10%;
    width: 50%; height: 60%;
    background: radial-gradient(ellipse, rgba(180,100,255,0.05) 0%, transparent 65%);
    pointer-events: none; z-index: 0;
}

.mev-inner {
    position: relative;
    z-index: 1;
    max-width: 1180px;
    margin: 0 auto;
}

.mev-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 3.25rem;
    gap: 1rem;
    flex-wrap: wrap;
}

.mev-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.22em;
    color: #7c6fff;
    text-transform: uppercase;
    margin-bottom: 0.6rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.mev-eyebrow::before {
    content: '';
    display: inline-block;
    width: 22px;
    height: 1px;
    background: #7c6fff;
}

.mev-title {
    font-size: clamp(2.3rem, 4vw, 3.4rem);
    font-weight: 800;
    color: #f5f3ff;
    line-height: 1.05;
    letter-spacing: -0.03em;
}

.mev-title span {
    background: linear-gradient(135deg, #a78bff 0%, #e879f9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.mev-date-chip {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(124,111,255,0.08);
    border: 1px solid rgba(124,111,255,0.2);
    border-radius: 100px;
    padding: 0.75rem 1.35rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #a89fff;
    white-space: nowrap;
    align-self: flex-start;
    margin-top: 0.9rem;
    backdrop-filter: blur(8px);
}

.mev-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7c6fff;
    box-shadow: 0 0 6px #7c6fff;
    animation: mev-pulse 2s infinite;
    flex-shrink: 0;
}

@keyframes mev-pulse {
    0%,100% { opacity: 1; }
    50% { opacity: 0.4; }
}

.mev-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(124,111,255,0.25), transparent);
    margin: 0 0 1.75rem;
}

.mev-glass {
    background: rgba(255,255,255,0.028);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 24px;
    padding: 2.2rem;
    margin-bottom: 1.5rem;
    backdrop-filter: blur(12px);
    position: relative;
    overflow: hidden;
}

.mev-glass::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
}

.mev-section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.18em;
    color: #6a678b;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.mev-section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.05);
}

.mev-firms {
    display: grid;
    grid-template-columns: 1fr 58px 1fr;
    gap: 1rem;
    align-items: center;
}

.mev-firm-field {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 1.2rem 1.35rem;
    transition: border-color 0.2s;
}

.mev-firm-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.16em;
    color: #6a678b;
    text-transform: uppercase;
    margin-bottom: 0.65rem;
}

.mev-firm-input {
    background: transparent;
    border: none;
    outline: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: #f0eeff;
    width: 100%;
    resize: none;
    line-height: 1.6;
}

.mev-arrow-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(124,111,255,0.15), rgba(232,121,249,0.1));
    border: 1px solid rgba(124,111,255,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    justify-self: center;
    color: #a78bff;
    font-size: 15px;
}

.mev-desc-input {
    background: transparent;
    border: none;
    outline: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16px;
    color: #c8c6e8;
    width: 100%;
    resize: none;
    line-height: 1.9;
}

.mev-settings-toggle {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 0.6rem 1.1rem;
    color: #6a678b;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.08em;
}

.mev-settings-toggle:hover {
    border-color: rgba(124,111,255,0.3);
    color: #a89fff;
}

.mev-settings-toggle.active {
    border-color: rgba(124,111,255,0.35);
    color: #a89fff;
    background: rgba(124,111,255,0.06);
}

.mev-settings-panel {
    background: rgba(124,111,255,0.04);
    border: 1px solid rgba(124,111,255,0.15);
    border-radius: 16px;
    padding: 1.4rem 1.6rem;
    margin-bottom: 1.25rem;
}

.mev-settings-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    color: #7c6fff;
    text-transform: uppercase;
    margin-bottom: 1rem;
}

.mev-settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.85rem;
}

.mev-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 0.9rem 1rem;
    gap: 0.75rem;
}

.mev-toggle-label {
    font-size: 13px;
    font-weight: 600;
    color: #d8d6f0;
    margin-bottom: 2px;
}

.mev-toggle-desc {
    font-size: 11px;
    color: #575471;
    font-family: 'JetBrains Mono', monospace;
}

.mev-switch {
    position: relative;
    width: 38px;
    height: 22px;
    flex-shrink: 0;
}

.mev-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.mev-switch-track {
    position: absolute;
    inset: 0;
    border-radius: 100px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    cursor: pointer;
    transition: all 0.25s;
}

.mev-switch input:checked + .mev-switch-track {
    background: linear-gradient(135deg, #7c6fff, #b06fef);
    border-color: transparent;
    box-shadow: 0 2px 12px rgba(124,111,255,0.4);
}

.mev-switch-track::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    top: 3px;
    left: 3px;
    transition: all 0.25s;
}

.mev-switch input:checked + .mev-switch-track::after {
    left: 19px;
    background: #fff;
}

.mev-scanner-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.4rem;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.mev-scanner-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-wrap: wrap;
}

.mev-scanner-title {
    font-size: 19px;
    font-weight: 700;
    color: #f0eeff;
    letter-spacing: -0.02em;
}

.mev-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #a78bff;
    background: rgba(124,111,255,0.1);
    border: 1px solid rgba(124,111,255,0.2);
    border-radius: 100px;
    padding: 0.38rem 0.95rem;
}

.mev-input-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.1rem;
    align-items: stretch;
}

.mev-barcode-field {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.mev-barcode-icon {
    font-size: 18px;
    opacity: 0.4;
    flex-shrink: 0;
}

.mev-add-btn {
    background: linear-gradient(135deg, #7c6fff, #b06fef);
    border: none;
    border-radius: 14px;
    padding: 0 1.5rem;
    color: #fff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.2s;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(124,111,255,0.3);
}

.mev-add-btn:hover { opacity: 0.9; }
.mev-add-btn:active { transform: scale(0.97); }

.mev-manual-grid {
    display: grid;
    grid-template-columns: 170px 1fr auto;
    gap: 0.75rem;
    margin-bottom: 1.6rem;
}

.mev-manual-input {
    width: 100%;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 0.95rem 1rem;
    color: #eceaff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    outline: none;
}

.mev-manual-input::placeholder {
    color: #6d698f;
}

.mev-inline-hint {
    margin-bottom: 1rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #7d79a8;
}

.mev-dup-warning {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(234,179,8,0.07);
    border: 1px solid rgba(234,179,8,0.2);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #fbbf24;
    margin-bottom: 1rem;
}

.mev-parse-error {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    background: rgba(239,68,68,0.07);
    border: 1px solid rgba(239,68,68,0.22);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #f87171;
    margin-bottom: 1rem;
}

.mev-scan-box-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #d8d5fb;
    margin-bottom: 4px;
}

.mev-scan-box-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #746fb0;
    word-break: break-all;
    line-height: 1.5;
}

.mev-scan-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    border: 1px solid rgba(255,255,255,0.08);
    color: #7d79a8;
    background: rgba(255,255,255,0.03);
}

.mev-scan-chip.active {
    color: #d7d2ff;
    border-color: rgba(124,111,255,0.35);
    background: rgba(124,111,255,0.09);
}

.mev-scan-pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #8f7bff;
    box-shadow: 0 0 10px rgba(143,123,255,0.8);
    animation: mev-pulse 1.2s infinite;
}

.mev-table-outer {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.05);
}

.mev-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
}

.mev-table thead tr {
    background: rgba(255,255,255,0.025);
}

.mev-table th {
    color: #686582;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 500;
    padding: 0.95rem 1.15rem;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.mev-table td {
    padding: 0.95rem 1.15rem;
    border-bottom: 1px solid rgba(255,255,255,0.033);
    vertical-align: middle;
    transition: background 0.15s;
}

.mev-table tbody tr:last-child td {
    border-bottom: none;
}

.mev-table tbody tr:hover td {
    background: rgba(124,111,255,0.04);
}

.mev-td-no {
    color: #686582;
    font-size: 13px;
    width: 60px;
}

.mev-td-date {
    color: #a7a4c7;
    font-size: 14px;
}

.mev-td-code {
    color: #eceaff;
    font-weight: 500;
    letter-spacing: 0.02em;
    font-size: 14px;
}

.mev-del-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    color: #66637f;
    cursor: pointer;
    padding: 0.45rem 0.8rem;
    font-size: 11px;
    transition: all 0.15s;
    line-height: 1;
    font-family: 'Plus Jakarta Sans', sans-serif;
}

.mev-empty {
    text-align: center;
    padding: 4rem 1rem;
    color: #2e2c42;
}

.mev-empty-icon {
    font-size: 2.8rem;
    display: block;
    margin-bottom: 0.85rem;
    filter: grayscale(1);
    opacity: 0.4;
}

.mev-empty-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.1em;
    color: #3b3953;
}

@keyframes mev-flash {
    0% { background: rgba(124,111,255,0.18); }
    100% { background: transparent; }
}

.mev-flash td {
    animation: mev-flash 0.5s ease forwards;
}

.mev-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.9rem;
    padding-top: 0.6rem;
    flex-wrap: wrap;
}

.mev-btn-ghost {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 0.85rem 1.6rem;
    color: #66637f;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
}

.mev-btn-print {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 0.85rem 1.9rem;
    color: #f0eeff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.mev-btn-print:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.mev-edit-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font: inherit;
    font-size: 14px;
    padding: 0;
}

.mev-edit-input::placeholder {
    color: #6d698f;
}

/* PDF EXPORT */
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

.pdf-page:last-child {
    page-break-after: auto;
}

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

.print-grid th,
.print-grid td {
    border: 1px solid #555;
    padding: 6px 7px;
    font-size: 11.5px;
    line-height: 1.25;
    text-align: center;
    vertical-align: middle;
}

.print-grid th {
    font-weight: 700;
    background: #f3f3f3;
}

.print-grid td.code {
    text-align: left;
    padding-left: 8px;
}

.print-grid td.date {
    white-space: nowrap;
}

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
    padding: 10px 10px;
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

@media (max-width: 900px) {
    .mev-firms {
        grid-template-columns: 1fr;
    }

    .mev-arrow-circle {
        display: none;
    }

    .mev-manual-grid {
        grid-template-columns: 1fr;
    }
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
        .replace(/[“”„‟]/g, '"')
        .replace(/[‘’‚‛]/g, "'")
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/ı/g, "i")
        .replace(/İ/g, "I")
        .replace(/ş/g, "s")
        .replace(/Ş/g, "S")
        .replace(/ğ/g, "g")
        .replace(/Ğ/g, "G")
        .replace(/ü/g, "u")
        .replace(/Ü/g, "U")
        .replace(/ö/g, "o")
        .replace(/Ö/g, "O")
        .replace(/ç/g, "c")
        .replace(/Ç/g, "C")
        .trim();
}

function formatDateToTR(value) {
    if (!value) return "";

    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
        return `${m[3]}.${m[2]}.${m[1]}`;
    }

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

    const noVal = noMatch?.[1]
        ? noMatch[1].toUpperCase().trim()
        : null;

    const tarihVal = tarihMatch?.[1]
        ? formatDateToTR(tarihMatch[1])
        : "";

    if (!noVal) return null;

    return {
        irsaliye: noVal,
        tarih: tarihVal
    };
}

function splitRowsForTwoColumns(rowsForPage) {
    const half = Math.ceil(rowsForPage.length / 2);
    return {
        left: rowsForPage.slice(0, half),
        right: rowsForPage.slice(half)
    };
}

export default function MusteriEvraklari() {
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
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    });
    const [manualIrsaliye, setManualIrsaliye] = useState("");

    const scanAreaRef = useRef(null);
    const audioCtxRef = useRef(null);
    const scanTimeoutRef = useRef(null);
    const bufferRef = useRef("");
    const printSheetRef = useRef(null);

    // Çift kolon tablo için toplam satır kapasitesi
    const FIRST_PAGE_CAPACITY = 46;              // başlık + açıklama + tablo
    const OTHER_PAGE_CAPACITY = 58;              // sadece tablo olan sayfalar
    const LAST_PAGE_WITH_SIGN_CAPACITY = 34;     // tablo + imza aynı sayfadaysa güvenli toplam satır

    const pdfPages = useMemo(() => {
        const ordered = [...rows].reverse();
        const pages = [];

        if (ordered.length === 0) {
            return [
                {
                    rows: [],
                    showHeader: true,
                    showSignatures: true,
                    startNo: 1
                }
            ];
        }

        let index = 0;
        let startNo = 1;
        let isFirstPage = true;

        while (index < ordered.length) {
            const remaining = ordered.length - index;
            const normalCapacity = isFirstPage ? FIRST_PAGE_CAPACITY : OTHER_PAGE_CAPACITY;

            if (remaining <= LAST_PAGE_WITH_SIGN_CAPACITY) {
                const chunk = ordered.slice(index);
                pages.push({
                    rows: chunk,
                    showHeader: isFirstPage,
                    showSignatures: true,
                    startNo
                });
                index += chunk.length;
                startNo += chunk.length;
                break;
            }

            const chunk = ordered.slice(index, index + normalCapacity);
            pages.push({
                rows: chunk,
                showHeader: isFirstPage,
                showSignatures: false,
                startNo
            });

            index += chunk.length;
            startNo += chunk.length;
            isFirstPage = false;
        }

        if (!pages.some((p) => p.showSignatures)) {
            pages.push({
                rows: [],
                showHeader: false,
                showSignatures: true,
                startNo
            });
        }

        return pages;
    }, [rows]);

    const playBeep = useCallback((success = true) => {
        if (!beepEnabled) return;
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = success ? 880 : 320;
            osc.type = success ? "sine" : "square";
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.12 : 0.22));
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        } catch (_) { }
    }, [beepEnabled]);

    const stopScanMode = useCallback(() => {
        bufferRef.current = "";
        setScanBuffer("");
        setScanMode(false);
        if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
        }
    }, []);

    const insertRow = useCallback((irsaliyeNo, tarih, rawForError = "") => {
        const cleanNo = String(irsaliyeNo || "").trim().toUpperCase();
        const cleanDate = String(tarih || "").trim();

        if (!cleanNo) {
            setLastRawScan(rawForError);
            setParseError("NO_BULUNAMADI");
            setTimeout(() => setParseError(null), 3500);
            playBeep(false);
            return false;
        }

        if (cleanNo.length !== 16) {
            setLastRawScan(rawForError || cleanNo);
            setParseError({ type: "UZUNLUK_HATASI", val: cleanNo, len: cleanNo.length });
            setTimeout(() => setParseError(null), 3500);
            playBeep(false);
            return false;
        }

        if (dupCheck) {
            const exists = rows.some((r) => r.irsaliye === cleanNo);
            if (exists) {
                setDupWarning(cleanNo);
                setTimeout(() => setDupWarning(null), 2500);
                playBeep(false);
                return false;
            }
        }

        const fallbackToday = new Date().toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });

        const id = Date.now() + Math.floor(Math.random() * 1000);

        setRows((prev) => [{ id, tarih: cleanDate || fallbackToday, irsaliye: cleanNo }, ...prev]);
        setFlashId(id);
        setTimeout(() => setFlashId(null), 500);
        playBeep(true);

        return true;
    }, [rows, dupCheck, playBeep]);

    const addRow = useCallback((raw) => {
        const trimmed = String(raw || "").trim();
        if (!trimmed) return false;

        setDupWarning(null);
        setParseError(null);

        const parsed = parseBarcode(trimmed);

        if (!parsed?.irsaliye) {
            setLastRawScan(trimmed);
            playBeep(false);
            setParseError("NO_BULUNAMADI");
            setTimeout(() => setParseError(null), 3500);
            return false;
        }

        const success = insertRow(parsed.irsaliye, parsed.tarih, trimmed);

        if (success) {
            setLastRawScan(trimmed);

            if (autoStopAfterRead) {
                stopScanMode();
            } else {
                bufferRef.current = "";
                setScanBuffer("");
            }
        }

        return success;
    }, [insertRow, autoStopAfterRead, stopScanMode, playBeep]);

    const handleManualAdd = useCallback(() => {
        setDupWarning(null);
        setParseError(null);

        const success = insertRow(
            manualIrsaliye,
            formatDateToTR(manualDate),
            `manuel:${manualIrsaliye}`
        );

        if (success) {
            setManualIrsaliye("");
        }
    }, [insertRow, manualIrsaliye, manualDate]);

    const startScanMode = useCallback(() => {
        bufferRef.current = "";
        setScanBuffer("");
        setParseError(null);
        setDupWarning(null);
        setScanMode(true);
        setTimeout(() => {
            scanAreaRef.current?.focus();
        }, 10);
    }, []);

    useEffect(() => {
        const finalizeScan = () => {
            const payload = bufferRef.current.trim();
            if (!payload) return;
            addRow(payload);
            if (!autoStopAfterRead) {
                bufferRef.current = "";
                setScanBuffer("");
            }
        };

        const resetTimer = () => {
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = setTimeout(() => {
                finalizeScan();
            }, 180);
        };

        const handleKeyDown = (e) => {
            if (!scanMode) return;

            const tag = document.activeElement?.tagName;
            if (tag === "TEXTAREA" && document.activeElement !== scanAreaRef.current) return;
            if (tag === "INPUT") return;

            e.preventDefault();
            e.stopPropagation();

            if (e.key === "Enter") {
                finalizeScan();
                return;
            }

            if (e.key === "Escape") {
                stopScanMode();
                return;
            }

            if (e.key === "Backspace") {
                bufferRef.current = bufferRef.current.slice(0, -1);
                setScanBuffer(bufferRef.current);
                resetTimer();
                return;
            }

            if (e.key === "Tab") return;

            if (e.key && e.key.length === 1) {
                bufferRef.current += e.key;
                setScanBuffer(bufferRef.current);
                resetTimer();
            }
        };

        window.addEventListener("keydown", handleKeyDown, true);

        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
            }
        };
    }, [scanMode, addRow, stopScanMode, autoStopAfterRead]);

    const updateRow = (id, field, value) => {
        setRows((prev) =>
            prev.map((row) =>
                row.id === id ? { ...row, [field]: value } : row
            )
        );
    };

    const deleteRow = (id) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
    };

    const handleClear = () => {
        if (rows.length === 0) return;
        if (window.confirm("Tüm irsaliye kayıtları silinsin mi?")) {
            setRows([]);
        }
    };

    const waitForImages = useCallback(async (container) => {
        const images = Array.from(container.querySelectorAll("img"));
        await Promise.all(
            images.map((img) => {
                if (img.complete && img.naturalWidth > 0) {
                    return Promise.resolve();
                }

                return new Promise((resolve) => {
                    const done = () => resolve();
                    img.onload = done;
                    img.onerror = done;
                });
            })
        );
    }, []);

    const exportPDF = useCallback(async () => {
        const pageElements = Array.from(
            printSheetRef.current?.querySelectorAll(".pdf-page") || []
        );

        if (!pageElements.length) return;

        try {
            setIsExporting(true);

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            for (let i = 0; i < pageElements.length; i++) {
                const element = pageElements[i];

                await waitForImages(element);

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    logging: false
                });

                const imgData = canvas.toDataURL("image/png");

                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
            }

            pdf.save("evrak-teslim-tutanagi-" + today().replaceAll(".", "-") + ".pdf");
        } catch (err) {
            console.error("PDF export hatası:", err);
            alert("PDF oluşturulurken bir hata oluştu.");
        } finally {
            setIsExporting(false);
        }
    }, [waitForImages]);

    return (
        <>
            <style>{styles}</style>

            <div className="mev">
                <div className="mev-inner">
                    <div className="mev-header">
                        <div>
                            <div className="mev-eyebrow">Evrak Teslim Tutanağı</div>
                            <h1 className="mev-title">Müşteri <span>Evrakları</span></h1>
                        </div>

                        <div className="mev-date-chip">
                            <span className="mev-dot" />
                            TESLİM TARİHİ — {today()}
                        </div>
                    </div>

                    <div className="mev-divider" />

                    <div className="mev-glass">
                        <div className="mev-section-label">Taraflar</div>
                        <div className="mev-firms">
                            <div className="mev-firm-field">
                                <div className="mev-firm-tag">Teslim Eden</div>
                                <textarea
                                    className="mev-firm-input"
                                    rows={2}
                                    value={teslimEden}
                                    onChange={(e) => setTeslimEden(e.target.value)}
                                />
                            </div>

                            <div className="mev-arrow-circle">→</div>

                            <div className="mev-firm-field">
                                <div className="mev-firm-tag">Teslim Alan</div>
                                <textarea
                                    className="mev-firm-input"
                                    rows={2}
                                    value={teslimAlan}
                                    onChange={(e) => setTeslimAlan(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mev-glass">
                        <div className="mev-section-label">Açıklama</div>
                        <textarea
                            className="mev-desc-input"
                            value={aciklama}
                            rows={4}
                            readOnly
                        />
                    </div>

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
                                Barkod Ayarları
                            </button>
                        </div>

                        {showSettings && (
                            <div className="mev-settings-panel">
                                <div className="mev-settings-title">Barkod Okuyucu Ayarları</div>
                                <div className="mev-settings-grid">
                                    <div className="mev-toggle-row">
                                        <div>
                                            <div className="mev-toggle-label">Tekrar Okutma Engeli</div>
                                            <div className="mev-toggle-desc">Aynı barkod 2 kez eklenmesin</div>
                                        </div>
                                        <label className="mev-switch">
                                            <input
                                                type="checkbox"
                                                checked={dupCheck}
                                                onChange={(e) => setDupCheck(e.target.checked)}
                                            />
                                            <span className="mev-switch-track" />
                                        </label>
                                    </div>

                                    <div className="mev-toggle-row">
                                        <div>
                                            <div className="mev-toggle-label">Sesli Bip</div>
                                            <div className="mev-toggle-desc">Başarı / hata sesi</div>
                                        </div>
                                        <label className="mev-switch">
                                            <input
                                                type="checkbox"
                                                checked={beepEnabled}
                                                onChange={(e) => setBeepEnabled(e.target.checked)}
                                            />
                                            <span className="mev-switch-track" />
                                        </label>
                                    </div>

                                    <div className="mev-toggle-row">
                                        <div>
                                            <div className="mev-toggle-label">Her Okutmadan Sonra Kapat</div>
                                            <div className="mev-toggle-desc">Tek okutma sonrası aktif mod kapanır</div>
                                        </div>
                                        <label className="mev-switch">
                                            <input
                                                type="checkbox"
                                                checked={autoStopAfterRead}
                                                onChange={(e) => setAutoStopAfterRead(e.target.checked)}
                                            />
                                            <span className="mev-switch-track" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {parseError && (
                            <div className="mev-parse-error">
                                <span>✕</span>
                                <div>
                                    <div>
                                        {parseError === "NO_BULUNAMADI" ? (
                                            "Okutulan veride veya manuel girişte geçerli İrsaliye No bulunamadı."
                                        ) : (
                                            <span>
                                                <b>{parseError.val}</b> — {parseError.len} karakter, 16 olmalı.
                                            </span>
                                        )}
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
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleManualAdd();
                                }}
                            />
                            <button
                                type="button"
                                className="mev-add-btn"
                                onClick={handleManualAdd}
                                style={{ minHeight: 52, padding: "0 1.25rem" }}
                            >
                                Manuel Ekle
                            </button>
                        </div>

                        <div className="mev-input-row" style={{ display: "block" }}>
                            <div
                                ref={scanAreaRef}
                                tabIndex={0}
                                className="mev-barcode-field"
                                onClick={startScanMode}
                                style={{
                                    minHeight: 84,
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    justifyContent: "center",
                                    padding: "1rem 1.1rem"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}>
                                    <span className="mev-barcode-icon">▦</span>

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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                stopScanMode();
                                            }}
                                        >
                                            Kapat
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="mev-add-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startScanMode();
                                            }}
                                            style={{ height: 40, padding: "0 1rem" }}
                                        >
                                            Okutmayı Başlat
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mev-table-outer">
                            <table className="mev-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Tarih</th>
                                        <th>İrsaliye No</th>
                                        <th style={{ width: 52 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4}>
                                                <div className="mev-empty">
                                                    <span className="mev-empty-icon">▤</span>
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
                                                    <button
                                                        type="button"
                                                        className="mev-del-btn"
                                                        onClick={() => deleteRow(row.id)}
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mev-actions">
                        <button type="button" className="mev-btn-ghost" onClick={handleClear}>
                            Sıfırla
                        </button>
                        <button
                            type="button"
                            className="mev-btn-print"
                            onClick={exportPDF}
                            disabled={isExporting}
                        >
                            <span>⎙</span> {isExporting ? "PDF Oluşturuluyor..." : "PDF İndir"}
                        </button>
                    </div>

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
                                                        <col style={{ width: "5%" }} />
                                                        <col style={{ width: "14%" }} />
                                                        <col style={{ width: "31%" }} />
                                                        <col style={{ width: "5%" }} />
                                                        <col style={{ width: "14%" }} />
                                                        <col style={{ width: "31%" }} />
                                                    </colgroup>
                                                    <thead>
                                                        <tr>
                                                            <th>NO</th>
                                                            <th>TARİH</th>
                                                            <th>İRSALİYE NO</th>
                                                            <th>NO</th>
                                                            <th>TARİH</th>
                                                            <th>İRSALİYE NO</th>
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
                                                        <img
                                                            src={STAMP_URL}
                                                            alt="Firma Kaşesi"
                                                            className="print-stamp"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = "none";
                                                            }}
                                                        />
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