import React, { useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";

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

import { useTheme, alpha } from "@mui/material/styles";

import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import CompressRoundedIcon from "@mui/icons-material/CompressRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

function humanMB(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfSikistirma() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const inputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [quality, setQuality] = useState(70); // 10..95
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
    const [progress, setProgress] = useState(0);

    const [resultBytes, setResultBytes] = useState(null);

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
        setFile(f);
        setResultBytes(null);
    };

    const onChange = (e) => {
        onFile(e.target.files?.[0]);
        e.target.value = "";
    };

    const clear = () => {
        setFile(null);
        setResultBytes(null);
        setQuality(70);
        setProgress(0);
    };

    // ✅ REAL compress: backend Ghostscript
    const compress = async () => {
        if (!file) {
            setToast({ open: true, type: "error", msg: "Önce PDF yükle." });
            return;
        }

        setBusy(true);
        setProgress(15);

        try {
            const form = new FormData();
            form.append("file", file);
            form.append("quality", String(quality));

            setProgress(35);

            const resp = await fetch("http://localhost:5000/api/pdf/compress", {
                method: "POST",
                body: form,
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => null);
                throw new Error(err?.message || "Sıkıştırma başarısız.");
            }

            setProgress(70);

            const blob = await resp.blob();
            setResultBytes(blob.size);

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `compressed_${quality}_${file.name}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            setProgress(100);

            const diff = file.size - blob.size;
            const msg =
                diff > 0
                    ? `Sıkıştırıldı: ${humanMB(file.size)} → ${humanMB(blob.size)}`
                    : `Küçülme olmadı: ${humanMB(blob.size)} (bazı PDF'ler küçülmeyebilir)`;

            setToast({ open: true, type: diff > 0 ? "success" : "info", msg });
        } catch (e) {
            console.error(e);
            setToast({ open: true, type: "error", msg: e?.message || "Sıkıştırma işlemi başarısız oldu." });
        } finally {
            setBusy(false);
            setTimeout(() => setProgress(0), 450);
        }
    };

    // Theme tokens
    const borderCol = isDark ? alpha(theme.palette.common.white, 0.12) : alpha(theme.palette.common.black, 0.1);
    const glassBg = isDark ? alpha("#0f121c", 0.72) : alpha("#ffffff", 0.72);
    const softShadow = isDark ? "0 30px 90px rgba(0,0,0,0.55)" : "0 20px 60px rgba(0,0,0,0.10)";
    const pillProgressSx = {
        borderRadius: 999,
        height: 8,
        background: isDark ? alpha("#ffffff", 0.08) : alpha("#111827", 0.06),
    };

    const presets = [
        { label: "Güçlü", value: 40 },
        { label: "Orta", value: 70 },
        { label: "Hafif", value: 90 },
    ];

    return (
        <Layout>
            <Box sx={{ maxWidth: 1120, mx: "auto", px: 2, py: 3, color: "text.primary" }}>
                <Stack spacing={2.2}>
                    <Card
                        sx={{
                            borderRadius: 4,
                            overflow: "hidden",
                            border: `1px solid ${borderCol}`,
                            background: glassBg,
                            backdropFilter: "blur(14px)",
                            WebkitBackdropFilter: "blur(14px)",
                            boxShadow: softShadow,
                            position: "relative",
                        }}
                    >
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                pointerEvents: "none",
                                background: isDark
                                    ? "radial-gradient(900px circle at 15% 0%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(700px circle at 85% 35%, rgba(255,255,255,0.06), transparent 55%)"
                                    : "radial-gradient(900px circle at 15% 0%, rgba(17,24,39,0.10), transparent 55%), radial-gradient(700px circle at 85% 35%, rgba(107,114,128,0.10), transparent 55%)",
                                opacity: 0.9,
                            }}
                        />
                        <CardContent sx={{ position: "relative" }}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                                <Box sx={{ flex: 1 }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="h4" fontWeight={950} sx={{ letterSpacing: "-0.02em" }}>
                                            PDF SIKIŞTIRMA
                                        </Typography>
                                        <Tooltip title="Bu sayfa server-side Ghostscript ile gerçek sıkıştırma yapar.">
                                            <InfoOutlinedIcon sx={{ opacity: 0.75 }} fontSize="small" />
                                        </Tooltip>
                                    </Stack>

                                    <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                                        PDF’i Ghostscript ile sıkıştırır. Sonuç PDF içeriğine göre değişir.
                                    </Typography>

                                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.2 }}>
                                        {meta && (
                                            <Chip
                                                icon={<PictureAsPdfRoundedIcon />}
                                                label={meta}
                                                sx={{
                                                    border: `1px solid ${borderCol}`,
                                                    background: isDark ? alpha("#ffffff", 0.06) : alpha("#111827", 0.04),
                                                    fontWeight: 850,
                                                }}
                                            />
                                        )}

                                        {file && resultBytes != null && (
                                            <Chip
                                                label={`Yeni: ${humanMB(resultBytes)}`}
                                                sx={{
                                                    border: `1px solid ${borderCol}`,
                                                    background: isDark ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.success.main, 0.1),
                                                    fontWeight: 900,
                                                }}
                                            />
                                        )}

                                        {file && savingInfo && (
                                            <Chip
                                                label={
                                                    savingInfo.diff > 0
                                                        ? `Kazanç: ${humanMB(savingInfo.diff)} (%${savingInfo.pct})`
                                                        : "Kazanç yok (bazı PDF’ler küçülmez)"
                                                }
                                                sx={{
                                                    border: `1px solid ${borderCol}`,
                                                    background:
                                                        savingInfo.diff > 0
                                                            ? isDark
                                                                ? alpha(theme.palette.success.main, 0.16)
                                                                : alpha(theme.palette.success.main, 0.12)
                                                            : isDark
                                                                ? alpha("#ffffff", 0.06)
                                                                : alpha("#111827", 0.04),
                                                    fontWeight: 900,
                                                }}
                                            />
                                        )}
                                    </Stack>
                                </Box>

                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                                    <Button
                                        variant="outlined"
                                        startIcon={<UploadRoundedIcon />}
                                        onClick={pick}
                                        disabled={busy}
                                        sx={{ borderRadius: 999, fontWeight: 900, borderColor: borderCol }}
                                    >
                                        PDF Seç
                                    </Button>

                                    <Button
                                        variant="contained"
                                        startIcon={<CompressRoundedIcon />}
                                        onClick={compress}
                                        disabled={busy || !file}
                                        sx={{
                                            borderRadius: 999,
                                            fontWeight: 950,
                                            boxShadow: isDark ? "0 18px 50px rgba(0,0,0,0.45)" : "0 16px 40px rgba(0,0,0,0.12)",
                                        }}
                                    >
                                        Sıkıştır
                                    </Button>

                                    <Button
                                        variant="text"
                                        onClick={clear}
                                        disabled={busy && !!file}
                                        startIcon={<DeleteOutlineRoundedIcon />}
                                        sx={{ borderRadius: 999, fontWeight: 900 }}
                                    >
                                        Temizle
                                    </Button>
                                </Stack>
                            </Stack>

                            {busy && (
                                <Box sx={{ mt: 2 }}>
                                    <LinearProgress variant={progress ? "determinate" : "indeterminate"} value={progress} sx={pillProgressSx} />
                                </Box>
                            )}

                            <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={onChange} />
                        </CardContent>
                    </Card>

                    <Card
                        sx={{
                            borderRadius: 4,
                            border: `1px solid ${borderCol}`,
                            background: glassBg,
                            backdropFilter: "blur(14px)",
                            WebkitBackdropFilter: "blur(14px)",
                            boxShadow: softShadow,
                        }}
                    >
                        <CardContent>
                            <Stack spacing={1.2}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                    <Typography fontWeight={950} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        Kalite / Hedef (Preset)
                                        <Chip
                                            size="small"
                                            label={`${quality}`}
                                            sx={{
                                                height: 22,
                                                fontWeight: 950,
                                                border: `1px solid ${borderCol}`,
                                                background: isDark ? alpha("#ffffff", 0.06) : alpha("#111827", 0.04),
                                            }}
                                        />
                                    </Typography>

                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {presets.map((p) => (
                                            <Button
                                                key={p.label}
                                                size="small"
                                                variant={quality === p.value ? "contained" : "outlined"}
                                                onClick={() => setQuality(p.value)}
                                                disabled={busy}
                                                sx={{ borderRadius: 999, fontWeight: 900, borderColor: borderCol }}
                                            >
                                                {p.label}
                                            </Button>
                                        ))}
                                    </Stack>
                                </Stack>

                                <Slider value={quality} min={10} max={95} step={5} onChange={(_, v) => setQuality(v)} valueLabelDisplay="auto" disabled={busy} />

                                <Divider sx={{ opacity: 0.12, my: 0.5 }} />

                                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                    <b>Not:</b> Güçlü=çok küçültür (daha düşük DPI), Hafif=kaliteyi daha çok korur.
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>

                    {!file && (
                        <Card sx={{ borderRadius: 4, border: `1px dashed ${borderCol}`, background: isDark ? alpha("#ffffff", 0.03) : alpha("#111827", 0.02) }}>
                            <CardContent>
                                <Stack alignItems="center" spacing={1}>
                                    <Box
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 3,
                                            display: "grid",
                                            placeItems: "center",
                                            border: `1px solid ${borderCol}`,
                                            background: isDark ? alpha("#ffffff", 0.06) : alpha("#111827", 0.04),
                                        }}
                                    >
                                        <PictureAsPdfRoundedIcon />
                                    </Box>
                                    <Typography fontWeight={950}>PDF yükle</Typography>
                                    <Typography sx={{ color: "text.secondary", textAlign: "center" }}>
                                        “PDF Seç” ile dosyanı yükle, sonra “Sıkıştır”.
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Stack>

                <Snackbar open={toast.open} autoHideDuration={3200} onClose={() => setToast((p) => ({ ...p, open: false }))}>
                    <Alert severity={toast.type} variant="filled" onClose={() => setToast((p) => ({ ...p, open: false }))}>
                        {toast.msg}
                    </Alert>
                </Snackbar>
            </Box>
        </Layout>
    );
}