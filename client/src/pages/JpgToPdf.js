// src/pages/JpgToPdf.jsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";

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

import { useTheme, alpha } from "@mui/material/styles";

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
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

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

    // Theme-aware UI tokens
    const glassBg = isDark
        ? alpha("#0f121c", 0.72)
        : alpha("#ffffff", 0.72);

    const borderCol = isDark
        ? alpha(theme.palette.common.white, 0.12)
        : alpha(theme.palette.common.black, 0.10);

    const softShadow = isDark
        ? "0 30px 90px rgba(0,0,0,0.55)"
        : "0 20px 60px rgba(0,0,0,0.10)";

    return (
        <Layout>
            <Box
                sx={{
                    maxWidth: 1120,
                    mx: "auto",
                    px: 2,
                    py: 3,
                    color: "text.primary",
                }}
            >
                <Stack spacing={2.2}>
                    {/* Modern Header */}
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
                                    <Typography variant="h4" fontWeight={950} sx={{ letterSpacing: "-0.02em" }}>
                                        JPG TO PDF
                                    </Typography>
                                    <Typography sx={{ opacity: 0.82, mt: 0.4, color: "text.secondary" }}>
                                        Görselleri sırala, tek tıkla PDF oluştur.
                                    </Typography>
                                    {estInfo && (
                                        <Chip
                                            sx={{
                                                mt: 1,
                                                border: `1px solid ${borderCol}`,
                                                background: isDark ? alpha("#ffffff", 0.06) : alpha("#111827", 0.04),
                                                fontWeight: 850,
                                            }}
                                            label={estInfo}
                                        />
                                    )}
                                </Box>

                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                                    <Button
                                        variant="outlined"
                                        startIcon={<UploadRoundedIcon />}
                                        onClick={onPick}
                                        disabled={busy}
                                        sx={{ borderRadius: 999, fontWeight: 900, borderColor: borderCol }}
                                    >
                                        Görsel Seç
                                    </Button>

                                    <Button
                                        variant="contained"
                                        startIcon={<PictureAsPdfRoundedIcon />}
                                        onClick={makePdf}
                                        disabled={busy || !items.length}
                                        sx={{
                                            borderRadius: 999,
                                            fontWeight: 950,
                                            boxShadow: isDark ? "0 18px 50px rgba(0,0,0,0.45)" : "0 16px 40px rgba(0,0,0,0.12)",
                                        }}
                                    >
                                        PDF Oluştur
                                    </Button>

                                    <Button
                                        variant="text"
                                        onClick={clearAll}
                                        disabled={!items.length || busy}
                                        sx={{ borderRadius: 999, fontWeight: 900 }}
                                    >
                                        Temizle
                                    </Button>
                                </Stack>
                            </Stack>

                            {busy && (
                                <Box sx={{ mt: 2 }}>
                                    <LinearProgress
                                        variant={progress ? "determinate" : "indeterminate"}
                                        value={progress}
                                        sx={{
                                            borderRadius: 999,
                                            height: 8,
                                            background: isDark ? alpha("#ffffff", 0.08) : alpha("#111827", 0.06),
                                        }}
                                    />
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dropzone */}
                    <Card
                        onDragEnter={() => setDragOver(true)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        sx={{
                            borderRadius: 4,
                            borderStyle: "dashed",
                            borderWidth: 2,
                            borderColor: dragOver ? alpha(theme.palette.primary.main, 0.55) : borderCol,
                            background: dragOver
                                ? isDark
                                    ? alpha(theme.palette.primary.main, 0.10)
                                    : alpha(theme.palette.primary.main, 0.08)
                                : glassBg,
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            boxShadow: isDark ? "0 22px 70px rgba(0,0,0,0.40)" : "0 16px 48px rgba(0,0,0,0.08)",
                        }}
                    >
                        <CardContent>
                            <Stack alignItems="center" spacing={1.1} sx={{ py: 2 }}>
                                <Box
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 3,
                                        display: "grid",
                                        placeItems: "center",
                                        border: `1px solid ${borderCol}`,
                                        background: isDark ? alpha("#ffffff", 0.06) : alpha("#111827", 0.04),
                                        boxShadow: isDark ? "0 18px 50px rgba(0,0,0,0.35)" : "0 16px 40px rgba(0,0,0,0.10)",
                                    }}
                                >
                                    <ImageRoundedIcon />
                                </Box>
                                <Typography fontWeight={950}>Sürükle & Bırak</Typography>
                                <Typography sx={{ color: "text.secondary", textAlign: "center" }}>
                                    JPG/PNG dosyalarını buraya bırak ya da “Görsel Seç” ile yükle.
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

                    {/* List */}
                    {items.length > 0 && (
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
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Typography fontWeight={950}>Sıralama</Typography>
                                    <Chip
                                        label={`${items.length} sayfa`}
                                        sx={{
                                            border: `1px solid ${borderCol}`,
                                            background: isDark ? alpha("#ffffff", 0.06) : alpha("#111827", 0.04),
                                            fontWeight: 900,
                                        }}
                                    />
                                </Stack>

                                <Divider sx={{ opacity: 0.12, mb: 1.5 }} />

                                <Stack spacing={1.1}>
                                    {items.map((it, idx) => (
                                        <Box
                                            key={it.id}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1.25,
                                                p: 1.2,
                                                borderRadius: 3,
                                                border: `1px solid ${borderCol}`,
                                                background: isDark ? alpha("#ffffff", 0.04) : alpha("#111827", 0.03),
                                                "&:hover": {
                                                    background: isDark ? alpha("#ffffff", 0.06) : alpha("#111827", 0.04),
                                                },
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={it.url}
                                                alt={it.name}
                                                sx={{
                                                    width: 82,
                                                    height: 58,
                                                    objectFit: "cover",
                                                    borderRadius: 2.5,
                                                    border: `1px solid ${borderCol}`,
                                                }}
                                            />

                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography fontWeight={950} noWrap>
                                                    {idx + 1}. {it.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                                    {it.w}×{it.h} • {(it.file.size / 1024).toFixed(0)} KB
                                                </Typography>
                                            </Box>

                                            <Stack direction="row" spacing={0.5}>
                                                <Tooltip title="Yukarı">
                                                    <span>
                                                        <IconButton
                                                            onClick={() => moveItem(idx, -1)}
                                                            disabled={idx === 0 || busy}
                                                            sx={{
                                                                borderRadius: 2,
                                                                border: `1px solid ${borderCol}`,
                                                                background: isDark ? alpha("#ffffff", 0.04) : alpha("#111827", 0.03),
                                                            }}
                                                        >
                                                            <ArrowUpwardRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>

                                                <Tooltip title="Aşağı">
                                                    <span>
                                                        <IconButton
                                                            onClick={() => moveItem(idx, +1)}
                                                            disabled={idx === items.length - 1 || busy}
                                                            sx={{
                                                                borderRadius: 2,
                                                                border: `1px solid ${borderCol}`,
                                                                background: isDark ? alpha("#ffffff", 0.04) : alpha("#111827", 0.03),
                                                            }}
                                                        >
                                                            <ArrowDownwardRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>

                                                <Tooltip title="Sil">
                                                    <span>
                                                        <IconButton
                                                            onClick={() => removeItem(it.id)}
                                                            disabled={busy}
                                                            sx={{
                                                                borderRadius: 2,
                                                                border: `1px solid ${borderCol}`,
                                                                background: isDark ? alpha("#ffffff", 0.04) : alpha("#111827", 0.03),
                                                            }}
                                                        >
                                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Stack>

                <Snackbar
                    open={toast.open}
                    autoHideDuration={2600}
                    onClose={() => setToast((p) => ({ ...p, open: false }))}
                >
                    <Alert
                        severity={toast.type}
                        variant="filled"
                        onClose={() => setToast((p) => ({ ...p, open: false }))}
                    >
                        {toast.msg}
                    </Alert>
                </Snackbar>
            </Box>
        </Layout>
    );
}