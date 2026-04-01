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
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
    --bg: #05050d;
    --surface: #0d0d1a;
    --surface2: #12121f;
    --border: rgba(255,255,255,0.07);
    --border-accent: rgba(108,92,231,0.35);
    --accent: #6c5ce7;
    --accent2: #a29bfe;
    --accent3: #fd79a8;
    --text-primary: #f0eeff;
    --text-secondary: #8b87b8;
    --text-muted: #4a4768;
    --font-display: 'Syne', sans-serif;
    --font-mono: 'DM Mono', monospace;
    --radius-sm: 12px;
    --radius-md: 18px;
    --radius-lg: 26px;
    --radius-xl: 36px;
}

body { font-family: var(--font-display); background: var(--bg); }

@keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-dot {
    0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(108,92,231,0.5); }
    50% { opacity: 0.6; box-shadow: 0 0 0 5px rgba(108,92,231,0); }
}
@keyframes scan-line {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
}
@keyframes flash-row {
    0% { background: rgba(108,92,231,0.22); }
    100% { background: transparent; }
}

.mev {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text-primary);
    font-family: var(--font-display);
    padding: 2.5rem 3rem 4rem;
    position: relative;
    overflow-x: hidden;
}

.mev::before {
    content: '';
    position: fixed;
    top: -20%; left: -15%;
    width: 55%; height: 65%;
    background: radial-gradient(ellipse, rgba(108,92,231,0.09) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
}
.mev::after {
    content: '';
    position: fixed;
    bottom: -20%; right: -15%;
    width: 50%; height: 60%;
    background: radial-gradient(ellipse, rgba(253,121,168,0.05) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
}

.mev-inner {
    position: relative;
    z-index: 1;
    max-width: 1280px;
    margin: 0 auto;
    animation: fadeUp 0.5s ease both;
}

/* ── TOP NAV BAR ── */
.mev-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 3rem;
    gap: 1rem;
}

.mev-home-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 0.7rem 1.4rem 0.7rem 1rem;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.22s;
    text-decoration: none;
}
.mev-home-btn:hover {
    border-color: var(--border-accent);
    color: var(--accent2);
    background: rgba(108,92,231,0.07);
    transform: translateX(-2px);
}
.mev-home-btn-arrow {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(108,92,231,0.15);
    border: 1px solid rgba(108,92,231,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--accent2);
    flex-shrink: 0;
    transition: transform 0.22s;
}
.mev-home-btn:hover .mev-home-btn-arrow {
    transform: translateX(-2px);
}

.mev-date-chip {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    background: rgba(108,92,231,0.07);
    border: 1px solid rgba(108,92,231,0.22);
    border-radius: 100px;
    padding: 0.8rem 1.5rem;
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--accent2);
    white-space: nowrap;
    letter-spacing: 0.04em;
}
.mev-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse-dot 2s infinite;
    flex-shrink: 0;
}

/* ── HEADER ── */
.mev-header { margin-bottom: 3rem; }
.mev-eyebrow {
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: 0.22em;
    color: var(--accent);
    text-transform: uppercase;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
}
.mev-eyebrow::before {
    content: '';
    display: inline-block;
    width: 28px;
    height: 2px;
    background: linear-gradient(90deg, var(--accent), transparent);
    border-radius: 2px;
}
.mev-title {
    font-size: clamp(2.8rem, 5vw, 4.5rem);
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.0;
    letter-spacing: -0.04em;
}
.mev-title span {
    background: linear-gradient(135deg, var(--accent2) 0%, var(--accent3) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.mev-subtitle {
    margin-top: 0.85rem;
    font-family: var(--font-mono);
    font-size: 15px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
}

/* ── DIVIDER ── */
.mev-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(108,92,231,0.3), transparent);
    margin: 0 0 2.5rem;
}

/* ── GLASS CARD ── */
.mev-glass {
    background: rgba(255,255,255,0.022);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2.5rem;
    margin-bottom: 1.75rem;
    backdrop-filter: blur(16px);
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s;
}
.mev-glass::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
}
.mev-glass:hover { border-color: rgba(108,92,231,0.18); }

/* ── SECTION LABEL ── */
.mev-section-label {
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: 0.2em;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 1.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
.mev-section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
}

/* ── FIRMS ── */
.mev-firms {
    display: grid;
    grid-template-columns: 1fr 64px 1fr;
    gap: 1.25rem;
    align-items: center;
}
.mev-firm-field {
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.4rem 1.6rem;
    transition: border-color 0.2s;
}
.mev-firm-field:focus-within { border-color: var(--border-accent); }
.mev-firm-tag {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 0.75rem;
}
.mev-firm-input {
    background: transparent;
    border: none;
    outline: none;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    width: 100%;
    resize: none;
    line-height: 1.55;
}
.mev-arrow-circle {
    width: 52px; height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(108,92,231,0.18), rgba(253,121,168,0.1));
    border: 1px solid var(--border-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    justify-self: center;
    color: var(--accent2);
    font-size: 18px;
    flex-shrink: 0;
}

/* ── DESCRIPTION ── */
.mev-desc-input {
    background: transparent;
    border: none;
    outline: none;
    font-family: var(--font-display);
    font-size: 17px;
    color: var(--text-secondary);
    width: 100%;
    resize: none;
    line-height: 2;
}

/* ── SCANNER HEADER ── */
.mev-scanner-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
    gap: 0.75rem;
}
.mev-scanner-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}
.mev-scanner-title {
    font-size: 22px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.03em;
}
.mev-count {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--accent2);
    background: rgba(108,92,231,0.12);
    border: 1px solid rgba(108,92,231,0.25);
    border-radius: 100px;
    padding: 0.4rem 1rem;
}
.mev-scan-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    border: 1px solid var(--border);
    color: var(--text-muted);
    background: rgba(255,255,255,0.02);
    transition: all 0.2s;
}
.mev-scan-chip.active {
    color: var(--accent2);
    border-color: var(--border-accent);
    background: rgba(108,92,231,0.1);
}
.mev-scan-pulse {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent);
    animation: pulse-dot 1.2s infinite;
}

/* ── SETTINGS TOGGLE ── */
.mev-settings-toggle {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.7rem 1.2rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.08em;
}
.mev-settings-toggle:hover, .mev-settings-toggle.active {
    border-color: var(--border-accent);
    color: var(--accent2);
    background: rgba(108,92,231,0.07);
}

/* ── SETTINGS PANEL ── */
.mev-settings-panel {
    background: rgba(108,92,231,0.04);
    border: 1px solid rgba(108,92,231,0.15);
    border-radius: var(--radius-md);
    padding: 1.6rem 1.8rem;
    margin-bottom: 1.5rem;
}
.mev-settings-title {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.2em;
    color: var(--accent);
    text-transform: uppercase;
    margin-bottom: 1.2rem;
}
.mev-settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.9rem;
}
.mev-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1rem 1.1rem;
    gap: 0.75rem;
}
.mev-toggle-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 3px;
}
.mev-toggle-desc {
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

/* ── SWITCH ── */
.mev-switch { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
.mev-switch input { opacity: 0; width: 0; height: 0; }
.mev-switch-track {
    position: absolute; inset: 0;
    border-radius: 100px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    cursor: pointer;
    transition: all 0.25s;
}
.mev-switch input:checked + .mev-switch-track {
    background: linear-gradient(135deg, var(--accent), #a29bfe);
    border-color: transparent;
    box-shadow: 0 2px 14px rgba(108,92,231,0.45);
}
.mev-switch-track::after {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: rgba(255,255,255,0.45);
    top: 3px; left: 3px;
    transition: all 0.25s;
}
.mev-switch input:checked + .mev-switch-track::after {
    left: 21px;
    background: #fff;
}

/* ── INLINE HINT ── */
.mev-inline-hint {
    margin-bottom: 1.2rem;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-muted);
}

/* ── WARNINGS / ERRORS ── */
.mev-dup-warning {
    display: flex; align-items: center; gap: 0.6rem;
    background: rgba(234,179,8,0.07);
    border: 1px solid rgba(234,179,8,0.22);
    border-radius: var(--radius-sm);
    padding: 0.85rem 1.1rem;
    font-family: var(--font-mono);
    font-size: 13px;
    color: #fbbf24;
    margin-bottom: 1.2rem;
}
.mev-parse-error {
    display: flex; align-items: flex-start; gap: 0.6rem;
    background: rgba(239,68,68,0.07);
    border: 1px solid rgba(239,68,68,0.22);
    border-radius: var(--radius-sm);
    padding: 0.85rem 1.1rem;
    font-family: var(--font-mono);
    font-size: 13px;
    color: #f87171;
    margin-bottom: 1.2rem;
}

/* ── MANUAL GRID ── */
.mev-manual-grid {
    display: grid;
    grid-template-columns: 190px 1fr auto;
    gap: 0.85rem;
    margin-bottom: 1.75rem;
}
.mev-manual-input {
    width: 100%;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.1rem 1.2rem;
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 500;
    outline: none;
    transition: border-color 0.2s;
}
.mev-manual-input:focus { border-color: var(--border-accent); }
.mev-manual-input::placeholder { color: var(--text-muted); }

/* ── ADD BUTTON ── */
.mev-add-btn {
    background: linear-gradient(135deg, var(--accent), #a29bfe);
    border: none;
    border-radius: var(--radius-md);
    padding: 0 1.75rem;
    color: #fff;
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.2s;
    white-space: nowrap;
    box-shadow: 0 4px 24px rgba(108,92,231,0.35);
    letter-spacing: 0.01em;
}
.mev-add-btn:hover { opacity: 0.9; box-shadow: 0 6px 30px rgba(108,92,231,0.5); }
.mev-add-btn:active { transform: scale(0.97); }

/* ── BARCODE AREA ── */
.mev-barcode-field {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    transition: border-color 0.2s, background 0.2s;
    overflow: hidden;
    position: relative;
}
.mev-barcode-field.scanning {
    border-color: var(--border-accent);
    background: rgba(108,92,231,0.05);
}
.mev-barcode-field.scanning::after {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 30%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(108,92,231,0.12), transparent);
    animation: scan-line 1.4s ease-in-out infinite;
}
.mev-barcode-icon { font-size: 22px; opacity: 0.35; flex-shrink: 0; }
.mev-scan-box-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 5px;
}
.mev-scan-box-sub {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text-muted);
    word-break: break-all;
    line-height: 1.5;
}

/* ── TABLE ── */
.mev-table-outer {
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--border);
}
.mev-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 15px;
}
.mev-table thead tr { background: rgba(255,255,255,0.02); }
.mev-table th {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 500;
    padding: 1.1rem 1.3rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
}
.mev-table td {
    padding: 1.1rem 1.3rem;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    vertical-align: middle;
    transition: background 0.15s;
}
.mev-table tbody tr:last-child td { border-bottom: none; }
.mev-table tbody tr:hover td { background: rgba(108,92,231,0.05); }
.mev-td-no { color: var(--text-muted); font-size: 13px; width: 64px; }
.mev-td-date { color: var(--text-secondary); font-size: 15px; }
.mev-td-code { color: var(--text-primary); font-weight: 500; letter-spacing: 0.04em; font-size: 15px; }

.mev-del-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.5rem 0.9rem;
    font-size: 12px;
    transition: all 0.15s;
    font-family: var(--font-display);
}
.mev-del-btn:hover {
    border-color: rgba(239,68,68,0.4);
    color: #f87171;
    background: rgba(239,68,68,0.07);
}

.mev-empty {
    text-align: center;
    padding: 5rem 1rem;
}
.mev-empty-icon {
    font-size: 3.5rem;
    display: block;
    margin-bottom: 1rem;
    filter: grayscale(1);
    opacity: 0.2;
}
.mev-empty-text {
    font-family: var(--font-mono);
    font-size: 14px;
    letter-spacing: 0.1em;
    color: var(--text-muted);
}

.mev-flash td { animation: flash-row 0.5s ease forwards; }

.mev-edit-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font: inherit;
    font-size: 15px;
    padding: 0;
}
.mev-edit-input::placeholder { color: var(--text-muted); }

/* ── ACTIONS ── */
.mev-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding-top: 0.75rem;
    flex-wrap: wrap;
}
.mev-btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1rem 1.8rem;
    color: var(--text-muted);
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
}
.mev-btn-ghost:hover {
    border-color: rgba(239,68,68,0.35);
    color: #f87171;
}
.mev-btn-print {
    display: flex; align-items: center; gap: 0.6rem;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: var(--radius-sm);
    padding: 1rem 2.2rem;
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.01em;
}
.mev-btn-print:hover {
    background: rgba(255,255,255,0.09);
    border-color: rgba(255,255,255,0.2);
}
.mev-btn-print:disabled { opacity: 0.55; cursor: not-allowed; }

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

    // ── Ana Sayfaya Dön: React Router varsa import et, yoksa window.location kullanılıyor
    const handleGoHome = (e) => {
        e.preventDefault();
        // React Router v6: import { useNavigate } from 'react-router-dom'; const navigate = useNavigate(); navigate('/');
        // React Router v5: import { useHistory } from 'react-router-dom'; const history = useHistory(); history.push('/');
        // Fallback (router yoksa):
        window.location.href = "/";
    };

    return (
        <>
            <style>{styles}</style>

            <div className="mev">
                <div className="mev-inner">

                    {/* ── TOP NAV BAR ── */}
                    <div className="mev-topbar">
                        <button className="mev-home-btn" onClick={handleGoHome}>
                            <span className="mev-home-btn-arrow">←</span>
                            Ana Sayfaya Dön
                        </button>
                        <div className="mev-date-chip">
                            <span className="mev-dot" />
                            TESLİM TARİHİ — {today()}
                        </div>
                    </div>

                    {/* ── HEADER ── */}
                    <div className="mev-header">
                        <div className="mev-eyebrow">Evrak Teslim Tutanağı</div>
                        <h1 className="mev-title">Müşteri <span>Evrakları</span></h1>
                        <p className="mev-subtitle">İrsaliye listesi oluştur &amp; PDF olarak indir</p>
                    </div>

                    <div className="mev-divider" />

                    {/* ── TARAFLAR ── */}
                    <div className="mev-glass">
                        <div className="mev-section-label">Taraflar</div>
                        <div className="mev-firms">
                            <div className="mev-firm-field">
                                <div className="mev-firm-tag">Teslim Eden</div>
                                <textarea className="mev-firm-input" rows={2} value={teslimEden} onChange={(e) => setTeslimEden(e.target.value)} />
                            </div>
                            <div className="mev-arrow-circle">→</div>
                            <div className="mev-firm-field">
                                <div className="mev-firm-tag">Teslim Alan</div>
                                <textarea className="mev-firm-input" rows={2} value={teslimAlan} onChange={(e) => setTeslimAlan(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* ── AÇIKLAMA ── */}
                    <div className="mev-glass">
                        <div className="mev-section-label">Açıklama</div>
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
                                ⚙ Barkod Ayarları
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
                                Manuel Ekle
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
                                            onClick={(e) => { e.stopPropagation(); stopScanMode(); }}
                                            style={{ fontSize: 14, padding: "0.6rem 1.1rem" }}
                                        >
                                            Kapat
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="mev-add-btn"
                                            onClick={(e) => { e.stopPropagation(); startScanMode(); }}
                                            style={{ height: 44, padding: "0 1.2rem", fontSize: 14 }}
                                        >
                                            Okutmayı Başlat
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
                                                    <button type="button" className="mev-del-btn" onClick={() => deleteRow(row.id)}>
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

                    {/* ── ACTIONS ── */}
                    <div className="mev-actions">
                        <button type="button" className="mev-btn-ghost" onClick={handleClear}>
                            Sıfırla
                        </button>
                        <button type="button" className="mev-btn-print" onClick={exportPDF} disabled={isExporting}>
                            <span>⎙</span> {isExporting ? "PDF Oluşturuluyor..." : "PDF İndir"}
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