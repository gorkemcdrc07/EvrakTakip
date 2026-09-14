// src/pages/JpgToPdf.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Layout from "../components/Layout";
import useDarkMode from "../hooks/useDarkMode";
// ✅ ekle (importlara)
import { useNavigate } from "react-router-dom";

import {
    Box,
    Stack,
    Typography,
    Card,
    CardContent,
    Button,
    IconButton,
    Chip,
    Divider,
    LinearProgress,
    Snackbar,
    Alert,
    Tooltip,
} from "@mui/material";


import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";

import { jsPDF } from "jspdf";

function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

export default function JpgToPdf() {
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

    const [items, setItems] = useState([]); // { id, file, name, url, w, h }
    const [dragOver, setDragOver] = useState(false);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

    const onPick = () => inputRef.current?.click();

    const addFiles = useCallback(async (files) => {
        const arr = Array.from(files || []).filter((f) =>
            /image\/(jpeg|jpg|png)/i.test(f.type)
        );

        if (!arr.length) {
            setToast({ open: true, type: "error", msg: "Lütfen JPG/PNG görsel seç." });
            return;
        }

        setBusy(true);
        setProgress(0);

        try {
            const mapped = [];
            for (let i = 0; i < arr.length; i++) {
                const f = arr[i];
                const url = await readAsDataURL(f);
                const img = await loadImage(url);

                mapped.push({
                    id: `${Date.now()}_${i}_${Math.random().toString(16).slice(2)}`,
                    file: f,
                    name: f.name,
                    url,
                    w: img.naturalWidth || img.width,
                    h: img.naturalHeight || img.height,
                });

                setProgress(Math.round(((i + 1) / arr.length) * 100));
            }

            setItems((prev) => [...prev, ...mapped]);
            setToast({ open: true, type: "success", msg: "Görseller eklendi." });
        } catch (e) {
            console.error(e);
            setToast({ open: true, type: "error", msg: "Görseller okunamadı." });
        } finally {
            setBusy(false);
            setTimeout(() => setProgress(0), 350);
        }
    }, []);

    const onInputChange = async (e) => {
        await addFiles(e.target.files);
        e.target.value = "";
    };

    const onDrop = async (e) => {
        e.preventDefault();
        setDragOver(false);
        await addFiles(e.dataTransfer.files);
    };

    const moveItem = (idx, dir) => {
        setItems((prev) => {
            const next = [...prev];
            const to = idx + dir;
            if (to < 0 || to >= next.length) return prev;
            const [it] = next.splice(idx, 1);
            next.splice(to, 0, it);
            return next;
        });
    };

    const removeItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
    const clearAll = () => setItems([]);

    const estInfo = useMemo(() => {
        if (!items.length) return null;
        const mb = items.reduce((s, it) => s + (it.file.size || 0), 0) / (1024 * 1024);
        return `${items.length} görsel • ~${mb.toFixed(1)} MB`;
    }, [items]);

    const makePdf = async () => {
        if (!items.length) {
            setToast({ open: true, type: "error", msg: "Önce görsel ekle." });
            return;
        }

        setBusy(true);
        setProgress(0);

        try {
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const img = await loadImage(it.url);

                const margin = 28;
                const maxW = pageW - margin * 2;
                const maxH = pageH - margin * 2;

                const ratio = Math.min(maxW / img.width, maxH / img.height);
                const w = img.width * ratio;
                const h = img.height * ratio;

                const x = (pageW - w) / 2;
                const y = (pageH - h) / 2;

                if (i > 0) pdf.addPage();
                const type = /png/i.test(it.file.type) ? "PNG" : "JPEG";
                pdf.addImage(it.url, type, x, y, w, h, undefined, "FAST");

                setProgress(Math.round(((i + 1) / items.length) * 100));
            }

            const fileName = `images_${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(fileName);

            setToast({ open: true, type: "success", msg: "PDF oluşturuldu ve indirildi." });
        } catch (e) {
            console.error(e);
            setToast({ open: true, type: "error", msg: "PDF oluşturulamadı." });
        } finally {
            setBusy(false);
            setTimeout(() => setProgress(0), 350);
        }
    };

    const totalMb = useMemo(
        () => items.reduce((sum, it) => sum + (it.file?.size || 0), 0) / (1024 * 1024),
        [items]
    );

    const pageLabel = items.length ? `${items.length} sayfa` : "Henüz görsel yok";

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
                <Box sx={{ width: "100%", maxWidth: 1880, mx: "auto" }}>
                    {/* Header */}
                    <Card
                        elevation={0}
                        sx={{
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: "24px",
                            border: `1px solid ${isDark ? "rgba(255,255,255,.08)" : "#e2e8f0"}`,
                            background: isDark ? "#111927" : "#fff",
                            boxShadow: isDark
                                ? "0 18px 48px rgba(0,0,0,.24)"
                                : "0 14px 44px rgba(15,23,42,.05)",
                        }}
                    >
                        <Box
                            sx={{
                                position: "absolute",
                                inset: "0 0 auto 0",
                                height: 4,
                                background: "linear-gradient(90deg,#0284c7,#22d3ee,#06b6d4)",
                            }}
                        />
                        <CardContent sx={{ p: { xs: 2.25, sm: 3 }, "&:last-child": { pb: { xs: 2.25, sm: 3 } } }}>
                            <Stack
                                direction={{ xs: "column", lg: "row" }}
                                spacing={2.5}
                                justifyContent="space-between"
                                alignItems={{ lg: "center" }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                    <Button
                                        onClick={() => navigate("/anasayfa")}
                                        disabled={busy}
                                        sx={{
                                            minWidth: 44,
                                            width: 44,
                                            height: 44,
                                            p: 0,
                                            borderRadius: "14px",
                                            border: `1px solid ${isDark ? "rgba(255,255,255,.10)" : "#e2e8f0"}`,
                                            color: isDark ? "#cbd5e1" : "#64748b",
                                            bgcolor: isDark ? "rgba(255,255,255,.035)" : "#fff",
                                            "&:hover": {
                                                bgcolor: isDark ? "rgba(14,165,233,.08)" : "#f0f9ff",
                                                borderColor: "#7dd3fc",
                                                color: "#0284c7",
                                                transform: "translateX(-2px)",
                                            },
                                            transition: ".18s ease",
                                        }}
                                    >
                                        ←
                                    </Button>

                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            flex: "0 0 auto",
                                            display: "grid",
                                            placeItems: "center",
                                            borderRadius: "16px",
                                            color: "#fff",
                                            background: "linear-gradient(135deg,#0284c7,#06b6d4)",
                                            boxShadow: "0 10px 24px rgba(14,165,233,.20)",
                                        }}
                                    >
                                        <PictureAsPdfRoundedIcon />
                                    </Box>

                                    <Box>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
                                            <Chip
                                                size="small"
                                                label="Dosya Dönüşüm Merkezi"
                                                sx={{
                                                    height: 25,
                                                    borderRadius: "999px",
                                                    fontSize: 10,
                                                    fontWeight: 900,
                                                    letterSpacing: ".07em",
                                                    textTransform: "uppercase",
                                                    color: isDark ? "#7dd3fc" : "#0369a1",
                                                    bgcolor: isDark ? "rgba(14,165,233,.10)" : "#f0f9ff",
                                                }}
                                            />
                                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: "text.secondary" }}>
                                                JPG • PNG → PDF
                                            </Typography>
                                        </Stack>

                                        <Typography
                                            variant="h4"
                                            sx={{
                                                mt: .7,
                                                fontWeight: 950,
                                                letterSpacing: "-.035em",
                                                fontSize: { xs: 26, sm: 31 },
                                            }}
                                        >
                                            JPG → PDF
                                        </Typography>
                                        <Typography sx={{ mt: .5, color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                                            Görsellerinizi yükleyin, sıralayın ve tek bir düzenli PDF dosyasına dönüştürün.
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button
                                        variant="outlined"
                                        startIcon={<UploadRoundedIcon />}
                                        onClick={onPick}
                                        disabled={busy}
                                        sx={{
                                            height: 40,
                                            px: 1.7,
                                            borderRadius: "12px",
                                            textTransform: "none",
                                            fontSize: 12,
                                            fontWeight: 900,
                                            borderColor: isDark ? "rgba(255,255,255,.10)" : "#e2e8f0",
                                            color: isDark ? "#e2e8f0" : "#475569",
                                            "&:hover": {
                                                borderColor: "#7dd3fc",
                                                bgcolor: isDark ? "rgba(14,165,233,.08)" : "#f0f9ff",
                                            },
                                        }}
                                    >
                                        Görsel Ekle
                                    </Button>

                                    <Button
                                        variant="contained"
                                        startIcon={<PictureAsPdfRoundedIcon />}
                                        onClick={makePdf}
                                        disabled={busy || !items.length}
                                        sx={{
                                            height: 40,
                                            px: 2,
                                            borderRadius: "12px",
                                            textTransform: "none",
                                            fontSize: 12,
                                            fontWeight: 950,
                                            background: "linear-gradient(90deg,#0284c7,#06b6d4)",
                                            boxShadow: "0 10px 24px rgba(14,165,233,.18)",
                                            "&:hover": {
                                                background: "linear-gradient(90deg,#0369a1,#0891b2)",
                                                transform: "translateY(-1px)",
                                                boxShadow: "0 13px 28px rgba(14,165,233,.24)",
                                            },
                                        }}
                                    >
                                        {busy ? "Hazırlanıyor…" : "PDF Oluştur"}
                                    </Button>

                                    <Button
                                        variant="text"
                                        onClick={clearAll}
                                        disabled={!items.length || busy}
                                        sx={{
                                            height: 40,
                                            px: 1.5,
                                            borderRadius: "12px",
                                            textTransform: "none",
                                            fontSize: 11,
                                            fontWeight: 900,
                                            color: "#e11d48",
                                            "&:hover": { bgcolor: isDark ? "rgba(225,29,72,.08)" : "#fff1f2" },
                                        }}
                                    >
                                        Tümünü Temizle
                                    </Button>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Workflow */}
                    <Box
                        sx={{
                            mt: 1.5,
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
                            gap: 1,
                            p: 1.2,
                            borderRadius: "18px",
                            border: `1px solid ${isDark ? "rgba(255,255,255,.08)" : "#e2e8f0"}`,
                            bgcolor: isDark ? "#111927" : "#fff",
                        }}
                    >
                        {[
                            { no: 1, title: "Görselleri Ekle", text: "JPG veya PNG yükleyin", done: !!items.length },
                            { no: 2, title: "Sıralamayı Kontrol Et", text: "Sayfa sırasını düzenleyin", done: items.length > 0 },
                            { no: 3, title: "PDF'yi Oluştur", text: "Tek dosya olarak indirin", done: false },
                        ].map((step) => (
                            <Box
                                key={step.no}
                                sx={{
                                    display: "flex",
                                    gap: 1.2,
                                    alignItems: "center",
                                    px: 1.4,
                                    py: 1.2,
                                    borderRadius: "14px",
                                    bgcolor: items.length ? (isDark ? "rgba(14,165,233,.045)" : "#f8fcff") : (isDark ? "rgba(255,255,255,.02)" : "#f8fafc"),
                                    border: `1px solid ${items.length ? (isDark ? "rgba(56,189,248,.10)" : "#e0f2fe") : "transparent"}`,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "10px",
                                        display: "grid",
                                        placeItems: "center",
                                        flex: "0 0 auto",
                                        bgcolor: step.done ? "#ecfdf5" : step.no === 1 && !items.length ? "#0284c7" : (isDark ? "rgba(255,255,255,.06)" : "#e2e8f0"),
                                        color: step.done ? "#047857" : step.no === 1 && !items.length ? "#fff" : "#64748b",
                                        fontWeight: 950,
                                        fontSize: 11,
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

                    {/* Loading */}
                    {busy && (
                        <Card
                            elevation={0}
                            sx={{
                                mt: 1.5,
                                overflow: "hidden",
                                borderRadius: "18px",
                                border: `1px solid ${isDark ? "rgba(56,189,248,.18)" : "#bae6fd"}`,
                                background: isDark
                                    ? "linear-gradient(90deg,rgba(14,165,233,.08),#111927)"
                                    : "linear-gradient(90deg,#f0f9ff,#fff)",
                            }}
                        >
                            <CardContent sx={{ py: 1.6, "&:last-child": { pb: 1.6 } }}>
                                <Stack direction="row" spacing={1.7} alignItems="center">
                                    <Box
                                        sx={{
                                            position: "relative",
                                            width: 46,
                                            height: 46,
                                            display: "grid",
                                            placeItems: "center",
                                            flex: "0 0 auto",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                inset: 0,
                                                borderRadius: "14px",
                                                bgcolor: "rgba(14,165,233,.10)",
                                                animation: "pulseJpgPdf 1.4s ease-in-out infinite",
                                                "@keyframes pulseJpgPdf": {
                                                    "0%,100%": { transform: "scale(.82)", opacity: .45 },
                                                    "50%": { transform: "scale(1.12)", opacity: 1 },
                                                },
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                position: "relative",
                                                width: 38,
                                                height: 38,
                                                display: "grid",
                                                placeItems: "center",
                                                borderRadius: "12px",
                                                color: "#fff",
                                                background: "linear-gradient(135deg,#0284c7,#06b6d4)",
                                            }}
                                        >
                                            <PictureAsPdfRoundedIcon fontSize="small" />
                                        </Box>
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                                            <Box>
                                                <Typography sx={{ fontSize: 12, fontWeight: 950 }}>
                                                    {items.length ? "PDF sayfaları hazırlanıyor" : "Görseller okunuyor"}
                                                </Typography>
                                                <Typography sx={{ mt: .25, fontSize: 10, fontWeight: 650, color: "text.secondary" }}>
                                                    {items.length
                                                        ? "Görseller A4 sayfalara yerleştiriliyor ve PDF dosyası oluşturuluyor."
                                                        : "Boyut ve çözünürlük bilgileri hazırlanıyor."}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 12, fontWeight: 950, color: "#0284c7" }}>
                                                {progress || 0}%
                                            </Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant={progress ? "determinate" : "indeterminate"}
                                            value={progress}
                                            sx={{
                                                mt: 1,
                                                height: 6,
                                                borderRadius: 999,
                                                bgcolor: isDark ? "rgba(255,255,255,.08)" : "#e2e8f0",
                                                "& .MuiLinearProgress-bar": {
                                                    borderRadius: 999,
                                                    background: "linear-gradient(90deg,#0284c7,#22d3ee)",
                                                },
                                            }}
                                        />
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {/* Dropzone */}
                    <Card
                        elevation={0}
                        onDragEnter={() => setDragOver(true)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => !busy && onPick()}
                        sx={{
                            mt: 1.5,
                            cursor: busy ? "default" : "pointer",
                            borderRadius: "22px",
                            border: `2px dashed ${dragOver ? "#38bdf8" : isDark ? "rgba(255,255,255,.10)" : "#cbd5e1"}`,
                            bgcolor: dragOver
                                ? isDark ? "rgba(14,165,233,.10)" : "#f0f9ff"
                                : isDark ? "#111927" : "#fff",
                            transition: ".2s ease",
                            "&:hover": !busy ? {
                                transform: "translateY(-1px)",
                                borderColor: "#7dd3fc",
                                boxShadow: isDark ? "0 14px 34px rgba(0,0,0,.20)" : "0 12px 30px rgba(14,165,233,.06)",
                            } : {},
                        }}
                    >
                        <CardContent sx={{ p: { xs: 3, sm: 4 }, "&:last-child": { pb: { xs: 3, sm: 4 } } }}>
                            <Stack alignItems="center" spacing={1.2}>
                                <Box
                                    sx={{
                                        width: 58,
                                        height: 58,
                                        borderRadius: "18px",
                                        display: "grid",
                                        placeItems: "center",
                                        color: dragOver ? "#fff" : "#0284c7",
                                        bgcolor: dragOver ? "#0284c7" : isDark ? "rgba(14,165,233,.10)" : "#e0f2fe",
                                        boxShadow: dragOver ? "0 10px 24px rgba(14,165,233,.22)" : "none",
                                        transition: ".2s",
                                    }}
                                >
                                    <UploadRoundedIcon />
                                </Box>
                                <Typography sx={{ fontSize: 15, fontWeight: 950 }}>
                                    {dragOver ? "Görselleri bırakın" : "JPG veya PNG dosyalarını buraya sürükleyin"}
                                </Typography>
                                <Typography sx={{ maxWidth: 620, textAlign: "center", color: "text.secondary", fontSize: 11, fontWeight: 600 }}>
                                    Birden fazla görsel seçebilirsiniz. Yükledikten sonra sayfa sırasını değiştirebilir ve istemediğiniz görselleri kaldırabilirsiniz.
                                </Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<ImageRoundedIcon />}
                                    disabled={busy}
                                    sx={{
                                        mt: .5,
                                        borderRadius: "11px",
                                        textTransform: "none",
                                        fontSize: 11,
                                        fontWeight: 900,
                                        borderColor: isDark ? "rgba(255,255,255,.10)" : "#e2e8f0",
                                        color: isDark ? "#e2e8f0" : "#475569",
                                    }}
                                    onClick={(e) => { e.stopPropagation(); onPick(); }}
                                >
                                    Dosyalardan Görsel Seç
                                </Button>
                                <Typography sx={{ fontSize: 9, fontWeight: 800, color: "text.disabled" }}>
                                    Desteklenen biçimler: JPG, JPEG, PNG
                                </Typography>
                            </Stack>

                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                multiple
                                hidden
                                onChange={onInputChange}
                            />
                        </CardContent>
                    </Card>

                    {/* Summary + list */}
                    {items.length > 0 ? (
                        <>
                            <Box
                                sx={{
                                    mt: 1.5,
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" },
                                    gap: 1.2,
                                }}
                            >
                                {[
                                    ["Toplam Sayfa", items.length, "PDF sayfa sayısı"],
                                    ["Dosya Boyutu", `${totalMb.toFixed(1)} MB`, "Yaklaşık kaynak boyutu"],
                                    ["İlk Görsel", items[0]?.name || "—", "PDF'in ilk sayfası"],
                                    ["Durum", "Hazır", "PDF oluşturulabilir"],
                                ].map(([label, value, note]) => (
                                    <Card
                                        key={label}
                                        elevation={0}
                                        sx={{
                                            borderRadius: "16px",
                                            border: `1px solid ${isDark ? "rgba(255,255,255,.08)" : "#e2e8f0"}`,
                                            bgcolor: isDark ? "#111927" : "#fff",
                                        }}
                                    >
                                        <CardContent sx={{ p: 1.7, "&:last-child": { pb: 1.7 } }}>
                                            <Typography sx={{ fontSize: 8.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".1em", color: "text.secondary" }}>
                                                {label}
                                            </Typography>
                                            <Typography noWrap sx={{ mt: .5, fontSize: 18, fontWeight: 950, letterSpacing: "-.02em" }}>
                                                {value}
                                            </Typography>
                                            <Typography noWrap sx={{ mt: .4, fontSize: 9, fontWeight: 650, color: "text.secondary" }}>
                                                {note}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>

                            <Card
                                elevation={0}
                                sx={{
                                    mt: 1.5,
                                    overflow: "hidden",
                                    borderRadius: "22px",
                                    border: `1px solid ${isDark ? "rgba(255,255,255,.08)" : "#e2e8f0"}`,
                                    bgcolor: isDark ? "#111927" : "#fff",
                                    boxShadow: isDark ? "0 16px 42px rgba(0,0,0,.20)" : "0 10px 30px rgba(15,23,42,.04)",
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: { xs: "column", sm: "row" },
                                        gap: 1,
                                        alignItems: { sm: "center" },
                                        justifyContent: "space-between",
                                        px: 2,
                                        py: 1.6,
                                        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,.07)" : "#e2e8f0"}`,
                                    }}
                                >
                                    <Box>
                                        <Typography sx={{ fontSize: 9, fontWeight: 950, color: "#0284c7", textTransform: "uppercase", letterSpacing: ".12em" }}>
                                            Sayfa Düzeni
                                        </Typography>
                                        <Typography sx={{ mt: .3, fontSize: 16, fontWeight: 950 }}>PDF sayfalarını sırala</Typography>
                                        <Typography sx={{ mt: .2, fontSize: 10, color: "text.secondary", fontWeight: 600 }}>
                                            Yukarı/aşağı okları ile sıralayın. Listedeki sıra PDF'e aynen uygulanır.
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={pageLabel}
                                        sx={{
                                            alignSelf: { xs: "flex-start", sm: "center" },
                                            height: 29,
                                            borderRadius: "9px",
                                            fontSize: 10,
                                            fontWeight: 900,
                                            color: isDark ? "#7dd3fc" : "#0369a1",
                                            bgcolor: isDark ? "rgba(14,165,233,.10)" : "#f0f9ff",
                                        }}
                                    />
                                </Box>

                                <Box
                                    sx={{
                                        p: 1.5,
                                        display: "grid",
                                        gridTemplateColumns: {
                                            xs: "1fr",
                                            sm: "repeat(2,minmax(0,1fr))",
                                            lg: "repeat(3,minmax(0,1fr))",
                                            xl: "repeat(4,minmax(0,1fr))",
                                        },
                                        gap: 1.2,
                                    }}
                                >
                                    {items.map((it, idx) => (
                                        <Box
                                            key={it.id}
                                            sx={{
                                                position: "relative",
                                                overflow: "hidden",
                                                borderRadius: "16px",
                                                border: `1px solid ${isDark ? "rgba(255,255,255,.08)" : "#e2e8f0"}`,
                                                bgcolor: isDark ? "#0d141f" : "#fff",
                                                transition: ".18s ease",
                                                "&:hover": {
                                                    transform: "translateY(-2px)",
                                                    borderColor: "#7dd3fc",
                                                    boxShadow: isDark
                                                        ? "0 12px 28px rgba(0,0,0,.24)"
                                                        : "0 12px 28px rgba(14,165,233,.08)",
                                                },
                                            }}
                                        >
                                            <Box sx={{ position: "relative", aspectRatio: "4 / 3", bgcolor: isDark ? "#0b1220" : "#f8fafc" }}>
                                                <Box
                                                    component="img"
                                                    src={it.url}
                                                    alt={it.name}
                                                    sx={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "contain",
                                                        display: "block",
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        top: 9,
                                                        left: 9,
                                                        minWidth: 30,
                                                        height: 30,
                                                        px: .8,
                                                        display: "grid",
                                                        placeItems: "center",
                                                        borderRadius: "10px",
                                                        color: "#fff",
                                                        bgcolor: "rgba(15,23,42,.86)",
                                                        backdropFilter: "blur(8px)",
                                                        fontSize: 10,
                                                        fontWeight: 950,
                                                    }}
                                                >
                                                    {idx + 1}
                                                </Box>
                                            </Box>

                                            <Box sx={{ p: 1.2 }}>
                                                <Typography noWrap sx={{ fontSize: 11, fontWeight: 950 }}>{it.name}</Typography>
                                                <Typography sx={{ mt: .3, fontSize: 9, color: "text.secondary", fontWeight: 650 }}>
                                                    {it.w}×{it.h} • {(it.file.size / 1024).toFixed(0)} KB
                                                </Typography>

                                                <Stack direction="row" spacing={.7} sx={{ mt: 1.1 }}>
                                                    <Tooltip title="Yukarı taşı">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => moveItem(idx, -1)}
                                                                disabled={idx === 0 || busy}
                                                                sx={{
                                                                    width: 33,
                                                                    height: 33,
                                                                    borderRadius: "10px",
                                                                    border: `1px solid ${isDark ? "rgba(255,255,255,.09)" : "#e2e8f0"}`,
                                                                    color: isDark ? "#cbd5e1" : "#64748b",
                                                                }}
                                                            >
                                                                <ArrowUpwardRoundedIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title="Aşağı taşı">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => moveItem(idx, 1)}
                                                                disabled={idx === items.length - 1 || busy}
                                                                sx={{
                                                                    width: 33,
                                                                    height: 33,
                                                                    borderRadius: "10px",
                                                                    border: `1px solid ${isDark ? "rgba(255,255,255,.09)" : "#e2e8f0"}`,
                                                                    color: isDark ? "#cbd5e1" : "#64748b",
                                                                }}
                                                            >
                                                                <ArrowDownwardRoundedIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>

                                                    <Box sx={{ flex: 1 }} />

                                                    <Tooltip title="Görseli kaldır">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => removeItem(it.id)}
                                                                disabled={busy}
                                                                sx={{
                                                                    width: 33,
                                                                    height: 33,
                                                                    borderRadius: "10px",
                                                                    border: `1px solid ${isDark ? "rgba(255,255,255,.09)" : "#fecdd3"}`,
                                                                    color: "#e11d48",
                                                                    bgcolor: isDark ? "rgba(225,29,72,.06)" : "#fff1f2",
                                                                }}
                                                            >
                                                                <DeleteOutlineRoundedIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>

                                <Box
                                    sx={{
                                        position: "sticky",
                                        bottom: 0,
                                        display: "flex",
                                        flexDirection: { xs: "column", sm: "row" },
                                        gap: 1,
                                        alignItems: { sm: "center" },
                                        justifyContent: "space-between",
                                        px: 2,
                                        py: 1.4,
                                        borderTop: `1px solid ${isDark ? "rgba(255,255,255,.07)" : "#e2e8f0"}`,
                                        bgcolor: isDark ? "rgba(17,25,39,.96)" : "rgba(255,255,255,.96)",
                                        backdropFilter: "blur(16px)",
                                    }}
                                >
                                    <Typography sx={{ fontSize: 10, color: "text.secondary", fontWeight: 700 }}>
                                        {items.length} görsel • yaklaşık {totalMb.toFixed(1)} MB • A4 PDF
                                    </Typography>

                                    <Button
                                        variant="contained"
                                        startIcon={<PictureAsPdfRoundedIcon />}
                                        onClick={makePdf}
                                        disabled={busy}
                                        sx={{
                                            height: 39,
                                            px: 2,
                                            borderRadius: "11px",
                                            textTransform: "none",
                                            fontSize: 11,
                                            fontWeight: 950,
                                            background: "linear-gradient(90deg,#0284c7,#06b6d4)",
                                            boxShadow: "0 9px 22px rgba(14,165,233,.18)",
                                        }}
                                    >
                                        PDF'yi Oluştur ve İndir
                                    </Button>
                                </Box>
                            </Card>
                        </>
                    ) : (
                        <Box
                            sx={{
                                mt: 1.5,
                                py: 5,
                                px: 2,
                                textAlign: "center",
                                borderRadius: "22px",
                                border: `1px dashed ${isDark ? "rgba(255,255,255,.10)" : "#cbd5e1"}`,
                                bgcolor: isDark ? "rgba(17,25,39,.75)" : "rgba(255,255,255,.7)",
                            }}
                        >
                            <Box
                                sx={{
                                    mx: "auto",
                                    width: 58,
                                    height: 58,
                                    display: "grid",
                                    placeItems: "center",
                                    borderRadius: "18px",
                                    bgcolor: isDark ? "rgba(255,255,255,.05)" : "#f1f5f9",
                                    color: "text.secondary",
                                }}
                            >
                                <ImageRoundedIcon />
                            </Box>
                            <Typography sx={{ mt: 1.5, fontSize: 14, fontWeight: 950 }}>Henüz PDF sayfası yok</Typography>
                            <Typography sx={{ mt: .5, fontSize: 10.5, color: "text.secondary", fontWeight: 600 }}>
                                Yukarıdaki alandan JPG veya PNG görselleri eklediğinizde sayfa önizlemeleri burada görünecek.
                            </Typography>
                        </Box>
                    )}

                    <Box
                        sx={{
                            mt: 2.5,
                            display: "flex",
                            justifyContent: "center",
                            gap: 1,
                            color: "text.disabled",
                            fontSize: 9,
                            fontWeight: 700,
                        }}
                    >
                        <span>© {new Date().getFullYear()} Odak Lojistik</span>
                        <span>•</span>
                        <span>JPG → PDF Dönüşüm Merkezi</span>
                    </Box>

                    <Snackbar
                        open={toast.open}
                        autoHideDuration={2600}
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