import React, { useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Layout from "../components/Layout";
import useDarkMode from "../hooks/useDarkMode";
import { useNavigate } from "react-router-dom";

import {
    Box,
    Stack,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    LinearProgress,
    Slider,
    Snackbar,
    Alert,
    Divider,
    Tooltip,
} from "@mui/material";


import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import CompressRoundedIcon from "@mui/icons-material/CompressRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

function humanMB(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfSikistirma() {
    const navigate = useNavigate();
    useDarkMode();

    const [isDark, setIsDark] = useState(() =>
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")
    );

    useEffect(() => {
        if (typeof document === "undefined") return undefined;

        const root = document.documentElement;
        const syncTheme = () => setIsDark(root.classList.contains("dark"));
        syncTheme();

        const observer = new MutationObserver(syncTheme);
        observer.observe(root, { attributes: true, attributeFilter: ["class"] });

        return () => observer.disconnect();
    }, []);

    const pageMuiTheme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: isDark ? "dark" : "light",
                    primary: { main: "#0284c7" },
                    success: { main: "#059669" },
                    error: { main: "#e11d48" },
                    background: {
                        default: isDark ? "#0b1220" : "#f6f8fb",
                        paper: isDark ? "#111927" : "#ffffff",
                    },
                    text: {
                        primary: isDark ? "#f8fafc" : "#0f172a",
                        secondary: isDark ? "#94a3b8" : "#64748b",
                        disabled: isDark ? "#64748b" : "#94a3b8",
                    },
                    divider: isDark ? "rgba(255,255,255,.08)" : "#e2e8f0",
                },
                typography: {
                    fontFamily: "inherit",
                },
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                fontFamily: "inherit",
                            },
                        },
                    },
                    MuiChip: {
                        styleOverrides: {
                            root: {
                                fontFamily: "inherit",
                            },
                        },
                    },
                },
            }),
        [isDark]
    );

    const inputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [quality, setQuality] = useState(60); // 10..95
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
    const [progress, setProgress] = useState(0);

    const [resultBytes, setResultBytes] = useState(null);
    const [resultBlob, setResultBlob] = useState(null);
    const [resultUrl, setResultUrl] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [engineStatus, setEngineStatus] = useState("unknown");

    const meta = useMemo(() => {
        if (!file) return null;
        return `${file.name} • ${humanMB(file.size)}`;
    }, [file]);

    const savingInfo = useMemo(() => {
        if (!file || resultBytes == null) return null;
        const diff = file.size - resultBytes;
        const pct = file.size > 0 ? Math.round((diff / file.size) * 100) : 0;
        return { diff, pct };
    }, [file, resultBytes]);

    const pick = () => inputRef.current?.click();

    const onFile = (f) => {
        if (!f) return;
        if (f.type !== "application/pdf") {
            setToast({ open: true, type: "error", msg: "Lütfen PDF dosyası seç." });
            return;
        }
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setFile(f);
        setResultBytes(null);
        setResultBlob(null);
        setResultUrl("");
        setProgress(0);
    };

    const onChange = (e) => {
        onFile(e.target.files?.[0]);
        e.target.value = "";
    };

    const clear = () => {
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setFile(null);
        setResultBytes(null);
        setResultBlob(null);
        setResultUrl("");
        setQuality(60);
        setProgress(0);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (busy) return;
        onFile(e.dataTransfer.files?.[0]);
    };

    const downloadResult = () => {
        if (!resultBlob) return;
        const url = resultUrl || URL.createObjectURL(resultBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `compressed_${file?.name || "document.pdf"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    // Gerçek sıkıştırma: backend Ghostscript
    const compress = async () => {
        if (!file) {
            setToast({ open: true, type: "error", msg: "Önce bir PDF dosyası yükleyin." });
            return;
        }

        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultBlob(null);
        setResultBytes(null);
        setResultUrl("");
        setBusy(true);
        setProgress(8);

        try {
            const form = new FormData();
            form.append("file", file);
            form.append("quality", String(quality));

            setProgress(22);

            const configuredPdfApi = process.env.REACT_APP_PDF_API_URL?.replace(/\/$/, "");
            const configuredMainApi = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, "");
            const apiBase = configuredPdfApi
                ? (configuredPdfApi.endsWith("/api") ? configuredPdfApi : `${configuredPdfApi}/api`)
                : configuredMainApi
                    ? configuredMainApi
                    : window.location.hostname === "localhost"
                        ? "http://localhost:5000/api"
                        : `${window.location.origin}/api`;

            const resp = await fetch(`${apiBase}/pdf/compress`, {
                method: "POST",
                body: form,
            });

            setProgress(58);

            if (!resp.ok) {
                const err = await resp.json().catch(() => null);
                if (err?.code === "GHOSTSCRIPT_NOT_FOUND") setEngineStatus("missing");
                throw new Error(err?.message || `Sıkıştırma servisi hata verdi (${resp.status}).`);
            }

            setEngineStatus("ready");
            const blob = await resp.blob();
            setProgress(86);

            const url = URL.createObjectURL(blob);
            setResultBlob(blob);
            setResultUrl(url);
            setResultBytes(blob.size);

            setProgress(100);

            const diff = file.size - blob.size;
            const pct = file.size > 0 ? Math.round((diff / file.size) * 100) : 0;

            setToast({
                open: true,
                type: diff > 0 ? "success" : "info",
                msg: diff > 0
                    ? `PDF küçültüldü: ${humanMB(file.size)} → ${humanMB(blob.size)} • %${pct} kazanç`
                    : "Bu PDF zaten sıkıştırılmış görünüyor; daha küçük bir çıktı üretilemedi.",
            });
        } catch (e) {
            console.error(e);
            const offline =
                /Failed to fetch|NetworkError|Load failed/i.test(String(e?.message || ""));
            setToast({
                open: true,
                type: "error",
                msg: offline
                    ? "PDF sıkıştırma API’sine ulaşılamadı. Canlı ortamda REACT_APP_API_BASE_URL, local ortamda backend servisini kontrol edin."
                    : (e?.message || "Sıkıştırma işlemi başarısız oldu."),
            });
        } finally {
            setBusy(false);
        }
    };

    const borderCol = isDark ? "rgba(255,255,255,.08)" : "#e2e8f0";

    const presets = [
        { label: "Maksimum Küçült", value: 35, note: "Dosya boyutu öncelikli", dpi: "≈ 92 DPI" },
        { label: "Dengeli", value: 60, note: "Önerilen ayar", dpi: "≈ 128 DPI" },
        { label: "Kalite Öncelikli", value: 85, note: "Görüntü kalitesini daha çok korur", dpi: "≈ 168 DPI" },
    ];

    const activePreset =
        quality <= 42 ? presets[0] :
        quality <= 72 ? presets[1] :
        presets[2];

    const reductionPct = savingInfo && savingInfo.diff > 0 ? savingInfo.pct : 0;

    return (
        <ThemeProvider theme={pageMuiTheme}>
        <Layout>
            <Box
                sx={{
                    minHeight: "100vh",
                    bgcolor: isDark ? "#0b1220" : "#f6f8fb",
                    color: "text.primary",
                    px: { xs: 1.5, sm: 2.5, lg: 3.5 },
                    py: { xs: 2, sm: 2.5 },
                }}
            >
                <Box sx={{ width: "100%", maxWidth: 1780, mx: "auto" }}>
                    {/* HEADER */}
                    <Card
                        elevation={0}
                        sx={{
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: "24px",
                            border: `1px solid ${borderCol}`,
                            bgcolor: isDark ? "#111927" : "#fff",
                            boxShadow: isDark
                                ? "0 18px 48px rgba(0,0,0,.24)"
                                : "0 14px 44px rgba(15,23,42,.05)",
                        }}
                    >
                        <Box sx={{ position: "absolute", inset: "0 0 auto 0", height: 4, background: "linear-gradient(90deg,#0284c7,#22d3ee,#06b6d4)" }} />

                        <CardContent sx={{ p: { xs: 2.2, sm: 3 }, "&:last-child": { pb: { xs: 2.2, sm: 3 } } }}>
                            <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems={{ lg: "center" }} justifyContent="space-between">
                                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                    <Button
                                        onClick={() => navigate("/anasayfa")}
                                        disabled={busy}
                                        sx={{
                                            minWidth: 44, width: 44, height: 44, p: 0, borderRadius: "14px",
                                            border: `1px solid ${isDark ? "rgba(255,255,255,.10)" : "#e2e8f0"}`,
                                            color: isDark ? "#cbd5e1" : "#64748b",
                                            bgcolor: isDark ? "rgba(255,255,255,.035)" : "#fff",
                                            "&:hover": { borderColor: "#7dd3fc", color: "#0284c7", bgcolor: isDark ? "rgba(14,165,233,.08)" : "#f0f9ff", transform: "translateX(-2px)" },
                                        }}
                                    >
                                        <ArrowBackRoundedIcon fontSize="small" />
                                    </Button>

                                    <Box
                                        sx={{
                                            width: 48, height: 48, flex: "0 0 auto", display: "grid", placeItems: "center",
                                            borderRadius: "16px", color: "#fff",
                                            background: "linear-gradient(135deg,#0284c7,#06b6d4)",
                                            boxShadow: "0 10px 24px rgba(14,165,233,.20)",
                                        }}
                                    >
                                        <CompressRoundedIcon />
                                    </Box>

                                    <Box>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
                                            <Chip
                                                size="small"
                                                label="Dosya Optimizasyon Merkezi"
                                                sx={{
                                                    height: 25, borderRadius: 999, fontSize: 9.5, fontWeight: 900,
                                                    letterSpacing: ".08em", textTransform: "uppercase",
                                                    color: isDark ? "#7dd3fc" : "#0369a1",
                                                    bgcolor: isDark ? "rgba(14,165,233,.10)" : "#f0f9ff",
                                                }}
                                            />
                                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: "text.secondary" }}>
                                                Ghostscript tabanlı gerçek sıkıştırma
                                            </Typography>
                                        </Stack>

                                        <Typography variant="h4" sx={{ mt: .7, fontWeight: 950, letterSpacing: "-.035em", fontSize: { xs: 26, sm: 31 } }}>
                                            PDF Sıkıştırma
                                        </Typography>
                                        <Typography sx={{ mt: .5, maxWidth: 760, color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                                            Büyük PDF dosyalarını daha düşük boyuta indirin. Kalite seviyesini seçin, sonucu karşılaştırın ve hazır dosyayı indirin.
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button
                                        variant="outlined"
                                        startIcon={<UploadRoundedIcon />}
                                        onClick={pick}
                                        disabled={busy}
                                        sx={{
                                            height: 40, px: 1.7, borderRadius: "12px", textTransform: "none", fontSize: 12, fontWeight: 900,
                                            borderColor: isDark ? "rgba(255,255,255,.10)" : "#e2e8f0",
                                            color: isDark ? "#e2e8f0" : "#475569",
                                        }}
                                    >
                                        PDF Seç
                                    </Button>

                                    <Button
                                        variant="contained"
                                        startIcon={<CompressRoundedIcon />}
                                        onClick={compress}
                                        disabled={busy || !file}
                                        sx={{
                                            height: 40, px: 2, borderRadius: "12px", textTransform: "none", fontSize: 12, fontWeight: 950,
                                            background: "linear-gradient(90deg,#0284c7,#06b6d4)",
                                            boxShadow: "0 10px 24px rgba(14,165,233,.18)",
                                            "&:hover": { background: "linear-gradient(90deg,#0369a1,#0891b2)", transform: "translateY(-1px)" },
                                        }}
                                    >
                                        {busy ? "Sıkıştırılıyor…" : "Dosyayı Küçült"}
                                    </Button>

                                    {resultBlob && (
                                        <Button
                                            variant="outlined"
                                            startIcon={<DownloadRoundedIcon />}
                                            onClick={downloadResult}
                                            sx={{
                                                height: 40, px: 1.7, borderRadius: "12px", textTransform: "none", fontSize: 12, fontWeight: 900,
                                                borderColor: "#a7f3d0", color: "#047857", bgcolor: isDark ? "rgba(16,185,129,.08)" : "#ecfdf5",
                                            }}
                                        >
                                            Tekrar İndir
                                        </Button>
                                    )}

                                    <Button
                                        variant="text"
                                        onClick={clear}
                                        disabled={busy || (!file && !resultBlob)}
                                        startIcon={<DeleteOutlineRoundedIcon />}
                                        sx={{ height: 40, borderRadius: "12px", textTransform: "none", fontSize: 11, fontWeight: 900, color: "#e11d48" }}
                                    >
                                        Temizle
                                    </Button>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* WORKFLOW */}
                    <Box
                        sx={{
                            mt: 1.5,
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
                            gap: 1,
                            p: 1.2,
                            borderRadius: "18px",
                            border: `1px solid ${borderCol}`,
                            bgcolor: isDark ? "#111927" : "#fff",
                        }}
                    >
                        {[
                            { no: 1, title: "PDF'yi Yükle", text: "Dosyayı seç veya sürükleyip bırak", done: !!file },
                            { no: 2, title: "Sıkıştırma Seviyesi", text: activePreset.label, done: !!file },
                            { no: 3, title: "Küçült & İndir", text: resultBlob ? "Sıkıştırılmış dosya hazır" : "Sonucu karşılaştır", done: !!resultBlob },
                        ].map((step) => (
                            <Box
                                key={step.no}
                                sx={{
                                    display: "flex", gap: 1.2, alignItems: "center", px: 1.4, py: 1.2,
                                    borderRadius: "14px",
                                    bgcolor: step.done ? (isDark ? "rgba(16,185,129,.05)" : "#f8fffc") : (isDark ? "rgba(255,255,255,.02)" : "#f8fafc"),
                                    border: `1px solid ${step.done ? (isDark ? "rgba(52,211,153,.10)" : "#d1fae5") : "transparent"}`,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 32, height: 32, borderRadius: "10px", display: "grid", placeItems: "center", flex: "0 0 auto",
                                        bgcolor: step.done ? "#ecfdf5" : "#e2e8f0",
                                        color: step.done ? "#047857" : "#64748b",
                                        fontWeight: 950, fontSize: 11,
                                    }}
                                >
                                    {step.done ? "✓" : step.no}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 950 }}>{step.title}</Typography>
                                    <Typography sx={{ mt: .2, fontSize: 9.5, fontWeight: 650, color: "text.secondary" }}>{step.text}</Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>

                    {/* BUSY */}
                    {busy && (
                        <Card
                            elevation={0}
                            sx={{
                                mt: 1.5, overflow: "hidden", borderRadius: "18px",
                                border: `1px solid ${isDark ? "rgba(56,189,248,.18)" : "#bae6fd"}`,
                                background: isDark ? "linear-gradient(90deg,rgba(14,165,233,.08),#111927)" : "linear-gradient(90deg,#f0f9ff,#fff)",
                            }}
                        >
                            <CardContent sx={{ py: 1.6, "&:last-child": { pb: 1.6 } }}>
                                <Stack direction="row" spacing={1.6} alignItems="center">
                                    <Box sx={{ position: "relative", width: 46, height: 46, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                                        <Box
                                            sx={{
                                                position: "absolute", inset: 0, borderRadius: "14px", bgcolor: "rgba(14,165,233,.10)",
                                                animation: "pdfPulse 1.3s ease-in-out infinite",
                                                "@keyframes pdfPulse": {
                                                    "0%,100%": { transform: "scale(.82)", opacity: .4 },
                                                    "50%": { transform: "scale(1.15)", opacity: 1 },
                                                },
                                            }}
                                        />
                                        <Box sx={{ position: "relative", width: 38, height: 38, borderRadius: "12px", display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(135deg,#0284c7,#06b6d4)" }}>
                                            <CompressRoundedIcon fontSize="small" />
                                        </Box>
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                                            <Box>
                                                <Typography sx={{ fontSize: 12, fontWeight: 950 }}>
                                                    PDF optimize ediliyor
                                                </Typography>
                                                <Typography sx={{ mt: .25, fontSize: 10, fontWeight: 650, color: "text.secondary" }}>
                                                    Görseller küçültülüyor, tekrar eden kaynaklar ayıklanıyor ve PDF yeniden paketleniyor.
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 12, fontWeight: 950, color: "#0284c7" }}>{progress}%</Typography>
                                        </Stack>

                                        <LinearProgress
                                            variant="determinate"
                                            value={progress}
                                            sx={{
                                                mt: 1, height: 6, borderRadius: 999,
                                                bgcolor: isDark ? "rgba(255,255,255,.08)" : "#e2e8f0",
                                                "& .MuiLinearProgress-bar": { borderRadius: 999, background: "linear-gradient(90deg,#0284c7,#22d3ee)" },
                                            }}
                                        />
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {/* MAIN GRID */}
                    <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1.1fr) minmax(360px,.7fr)" }, gap: 1.5 }}>
                        {/* FILE */}
                        <Card
                            elevation={0}
                            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragOver={(e) => e.preventDefault()}
                            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                            onDrop={onDrop}
                            onClick={() => !busy && !file && pick()}
                            sx={{
                                borderRadius: "22px",
                                border: `${file ? 1 : 2}px ${file ? "solid" : "dashed"} ${dragOver ? "#38bdf8" : borderCol}`,
                                bgcolor: dragOver ? (isDark ? "rgba(14,165,233,.10)" : "#f0f9ff") : isDark ? "#111927" : "#fff",
                                minHeight: 310,
                                cursor: !file && !busy ? "pointer" : "default",
                                transition: ".2s ease",
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, height: "100%" }}>
                                {!file ? (
                                    <Stack alignItems="center" justifyContent="center" spacing={1.2} sx={{ minHeight: 260, textAlign: "center" }}>
                                        <Box sx={{ width: 62, height: 62, display: "grid", placeItems: "center", borderRadius: "19px", bgcolor: isDark ? "rgba(14,165,233,.10)" : "#e0f2fe", color: "#0284c7" }}>
                                            <PictureAsPdfRoundedIcon sx={{ fontSize: 30 }} />
                                        </Box>
                                        <Typography sx={{ fontSize: 15, fontWeight: 950 }}>
                                            PDF dosyanızı buraya sürükleyin
                                        </Typography>
                                        <Typography sx={{ maxWidth: 480, fontSize: 10.5, fontWeight: 600, color: "text.secondary" }}>
                                            veya bilgisayarınızdan seçin. En fazla 80 MB PDF dosyaları desteklenir.
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            startIcon={<UploadRoundedIcon />}
                                            onClick={(e) => { e.stopPropagation(); pick(); }}
                                            sx={{ mt: .5, borderRadius: "11px", textTransform: "none", fontSize: 11, fontWeight: 900, borderColor: borderCol }}
                                        >
                                            PDF Dosyası Seç
                                        </Button>
                                    </Stack>
                                ) : (
                                    <Box>
                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".12em", color: "#0284c7" }}>
                                                    Kaynak PDF
                                                </Typography>
                                                <Typography noWrap sx={{ mt: .4, fontSize: 16, fontWeight: 950 }}>{file.name}</Typography>
                                                <Typography sx={{ mt: .4, fontSize: 10, fontWeight: 650, color: "text.secondary" }}>
                                                    {humanMB(file.size)}
                                                </Typography>
                                            </Box>

                                            <Button
                                                variant="outlined"
                                                startIcon={<UploadRoundedIcon />}
                                                onClick={pick}
                                                disabled={busy}
                                                sx={{ alignSelf: { xs: "flex-start", sm: "center" }, borderRadius: "10px", textTransform: "none", fontSize: 10, fontWeight: 900, borderColor: borderCol }}
                                            >
                                                Dosyayı Değiştir
                                            </Button>
                                        </Stack>

                                        <Box
                                            sx={{
                                                mt: 2,
                                                p: 2,
                                                borderRadius: "18px",
                                                bgcolor: isDark ? "#0d141f" : "#f8fafc",
                                                border: `1px solid ${borderCol}`,
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.4} alignItems="center">
                                                <Box sx={{ width: 52, height: 64, borderRadius: "12px", display: "grid", placeItems: "center", bgcolor: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3" }}>
                                                    <PictureAsPdfRoundedIcon />
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: "text.secondary" }}>Orijinal boyut</Typography>
                                                    <Typography sx={{ mt: .2, fontSize: 25, fontWeight: 950, letterSpacing: "-.03em" }}>{humanMB(file.size)}</Typography>
                                                    <Typography sx={{ mt: .25, fontSize: 9.5, fontWeight: 650, color: "text.secondary" }}>
                                                        Sıkıştırma profili: {activePreset.label} • {activePreset.dpi}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Box>

                                        {resultBlob && (
                                            <Box
                                                sx={{
                                                    mt: 1.2, p: 2, borderRadius: "18px",
                                                    bgcolor: isDark ? "rgba(16,185,129,.07)" : "#f0fdf4",
                                                    border: `1px solid ${isDark ? "rgba(52,211,153,.18)" : "#bbf7d0"}`,
                                                }}
                                            >
                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
                                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                                        <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: "13px", bgcolor: "#d1fae5", color: "#047857" }}>
                                                            <CheckCircleRoundedIcon />
                                                        </Box>
                                                        <Box>
                                                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: "text.secondary" }}>Sıkıştırılmış PDF</Typography>
                                                            <Typography sx={{ mt: .15, fontSize: 21, fontWeight: 950 }}>{humanMB(resultBytes)}</Typography>
                                                        </Box>
                                                    </Stack>
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<DownloadRoundedIcon />}
                                                        onClick={downloadResult}
                                                        sx={{ borderRadius: "11px", textTransform: "none", fontSize: 11, fontWeight: 950, bgcolor: "#059669", "&:hover": { bgcolor: "#047857" } }}
                                                    >
                                                        Sıkıştırılmış PDF'yi İndir
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        )}
                                    </Box>
                                )}

                                <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={onChange} />
                            </CardContent>
                        </Card>

                        {/* QUALITY */}
                        <Card elevation={0} sx={{ borderRadius: "22px", border: `1px solid ${borderCol}`, bgcolor: isDark ? "#111927" : "#fff" }}>
                            <CardContent sx={{ p: 2.2 }}>
                                <Typography sx={{ fontSize: 9, fontWeight: 950, color: "#0284c7", textTransform: "uppercase", letterSpacing: ".12em" }}>
                                    Sıkıştırma Ayarları
                                </Typography>
                                <Typography sx={{ mt: .4, fontSize: 17, fontWeight: 950 }}>Kalite seviyesini seçin</Typography>
                                <Typography sx={{ mt: .5, fontSize: 10, fontWeight: 600, color: "text.secondary" }}>
                                    Daha güçlü sıkıştırma daha küçük dosya üretir; görüntü kalitesi bir miktar düşebilir.
                                </Typography>

                                <Stack spacing={1} sx={{ mt: 1.7 }}>
                                    {presets.map((preset) => {
                                        const active =
                                            (preset.value === 35 && quality <= 42) ||
                                            (preset.value === 60 && quality > 42 && quality <= 72) ||
                                            (preset.value === 85 && quality > 72);

                                        return (
                                            <Button
                                                key={preset.label}
                                                fullWidth
                                                disabled={busy}
                                                onClick={() => setQuality(preset.value)}
                                                sx={{
                                                    justifyContent: "flex-start",
                                                    textAlign: "left",
                                                    px: 1.4,
                                                    py: 1.25,
                                                    borderRadius: "14px",
                                                    textTransform: "none",
                                                    border: `1px solid ${active ? "#38bdf8" : borderCol}`,
                                                    bgcolor: active ? (isDark ? "rgba(14,165,233,.10)" : "#f0f9ff") : "transparent",
                                                    color: "text.primary",
                                                    "&:hover": { bgcolor: isDark ? "rgba(14,165,233,.07)" : "#f8fcff" },
                                                }}
                                            >
                                                <Box sx={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "10px", bgcolor: active ? "#0284c7" : isDark ? "rgba(255,255,255,.06)" : "#f1f5f9", color: active ? "#fff" : "#64748b", mr: 1.2, flex: "0 0 auto", fontSize: 10, fontWeight: 950 }}>
                                                    {active ? "✓" : "•"}
                                                </Box>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                                                        <Typography sx={{ fontSize: 11, fontWeight: 950 }}>{preset.label}</Typography>
                                                        <Typography sx={{ fontSize: 9, fontWeight: 800, color: "text.secondary" }}>{preset.dpi}</Typography>
                                                    </Stack>
                                                    <Typography sx={{ mt: .25, fontSize: 9.5, fontWeight: 650, color: "text.secondary" }}>{preset.note}</Typography>
                                                </Box>
                                            </Button>
                                        );
                                    })}
                                </Stack>

                                <Divider sx={{ my: 1.8, opacity: .1 }} />

                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography sx={{ fontSize: 10, fontWeight: 900 }}>İnce ayar</Typography>
                                    <Chip size="small" label={`${quality}/95`} sx={{ height: 23, fontSize: 9, fontWeight: 950, bgcolor: isDark ? "rgba(255,255,255,.05)" : "#f1f5f9" }} />
                                </Stack>
                                <Slider
                                    value={quality}
                                    min={10}
                                    max={95}
                                    step={5}
                                    disabled={busy}
                                    onChange={(_, v) => setQuality(v)}
                                    sx={{ mt: .6, color: "#0284c7" }}
                                />

                                <Box sx={{ mt: 1.1, p: 1.3, borderRadius: "13px", bgcolor: isDark ? "rgba(255,255,255,.025)" : "#f8fafc", border: `1px solid ${borderCol}` }}>
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                        <InfoOutlinedIcon sx={{ mt: .1, fontSize: 16, color: "#0284c7" }} />
                                        <Typography sx={{ fontSize: 9.5, lineHeight: 1.55, fontWeight: 650, color: "text.secondary" }}>
                                            Metin ağırlıklı veya zaten optimize edilmiş PDF'lerde küçülme az olabilir. Tarama ve görsel ağırlıklı PDF'lerde kazanç genellikle daha yüksektir.
                                        </Typography>
                                    </Stack>
                                </Box>

                                {engineStatus === "missing" && (
                                    <Alert severity="warning" sx={{ mt: 1.3, borderRadius: "12px", fontSize: 10 }}>
                                        Ghostscript sunucuda bulunamadı. Sıkıştırmanın çalışması için Ghostscript kurulumu gerekiyor.
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </Box>

                    {/* RESULT METRICS */}
                    {file && resultBytes != null && (
                        <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" }, gap: 1.2 }}>
                            {[
                                ["Orijinal", humanMB(file.size), "Kaynak dosya"],
                                ["Yeni Boyut", humanMB(resultBytes), resultBytes < file.size ? "Sıkıştırılmış PDF" : "Boyut küçülmedi"],
                                ["Kazanç", resultBytes < file.size ? `%${reductionPct}` : "%0", savingInfo?.diff > 0 ? `${humanMB(savingInfo.diff)} daha küçük` : "PDF zaten optimize olabilir"],
                            ].map(([label, value, note], index) => (
                                <Card key={label} elevation={0} sx={{ borderRadius: "17px", border: `1px solid ${borderCol}`, bgcolor: isDark ? "#111927" : "#fff" }}>
                                    <CardContent sx={{ p: 1.7, "&:last-child": { pb: 1.7 } }}>
                                        <Typography sx={{ fontSize: 8.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".1em", color: "text.secondary" }}>{label}</Typography>
                                        <Typography sx={{ mt: .45, fontSize: 23, fontWeight: 950, letterSpacing: "-.03em", color: index === 2 && reductionPct > 0 ? "#059669" : "text.primary" }}>{value}</Typography>
                                        <Typography sx={{ mt: .3, fontSize: 9.5, fontWeight: 650, color: "text.secondary" }}>{note}</Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}

                    <Box sx={{ mt: 2.5, display: "flex", justifyContent: "center", gap: 1, color: "text.disabled", fontSize: 9, fontWeight: 700 }}>
                        <span>© {new Date().getFullYear()} Odak Lojistik</span>
                        <span>•</span>
                        <span>PDF Sıkıştırma Merkezi</span>
                    </Box>

                    <Snackbar
                        open={toast.open}
                        autoHideDuration={4200}
                        onClose={() => setToast((p) => ({ ...p, open: false }))}
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                    >
                        <Alert
                            severity={toast.type}
                            variant="filled"
                            onClose={() => setToast((p) => ({ ...p, open: false }))}
                            sx={{ borderRadius: "12px", fontWeight: 800 }}
                        >
                            {toast.msg}
                        </Alert>
                    </Snackbar>
                </Box>
            </Box>
        </Layout>
        </ThemeProvider>
    );
}