require('dotenv').config(); // .env dosyasını okuyabilmek için en üstte olmalı
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());


const pdfUploadDir = path.join(os.tmpdir(), 'odak-pdf-compress');
fs.mkdirSync(pdfUploadDir, { recursive: true });

const pdfUpload = multer({
    dest: pdfUploadDir,
    limits: { fileSize: 80 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
        cb(isPdf ? null : new Error('Sadece PDF dosyaları kabul edilir.'), isPdf);
    },
});

let ghostscriptExecutableCache = null;

async function resolveGhostscriptExecutable() {
    if (ghostscriptExecutableCache) return ghostscriptExecutableCache;

    const configured = process.env.GHOSTSCRIPT_PATH;
    const candidates = [
        configured,
        'gswin64c.exe',
        'gswin32c.exe',
        'gs',
        'ghostscript',
        'C:\\Program Files\\gs\\gs10.05.1\\bin\\gswin64c.exe',
        'C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe',
        'C:\\Program Files\\gs\\gs10.03.1\\bin\\gswin64c.exe',
        'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe',
    ].filter(Boolean);

    for (const candidate of candidates) {
        try {
            await execFileAsync(candidate, ['-version'], { windowsHide: true, timeout: 6000 });
            ghostscriptExecutableCache = candidate;
            return candidate;
        } catch (_) {}
    }

    // Program Files altında kurulu sürümü dinamik olarak ara.
    if (process.platform === 'win32') {
        const roots = [
            process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'gs') : null,
            process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'gs') : null,
        ].filter(Boolean);

        for (const root of roots) {
            try {
                if (!fs.existsSync(root)) continue;
                const versions = fs.readdirSync(root).sort().reverse();
                for (const version of versions) {
                    const candidate = path.join(root, version, 'bin', 'gswin64c.exe');
                    if (fs.existsSync(candidate)) {
                        await execFileAsync(candidate, ['-version'], { windowsHide: true, timeout: 6000 });
                        ghostscriptExecutableCache = candidate;
                        return candidate;
                    }
                }
            } catch (_) {}
        }
    }

    return null;
}

function pdfCompressionProfile(quality) {
    const q = Math.max(10, Math.min(95, Number(quality) || 65));

    if (q <= 40) {
        return { preset: '/screen', dpi: 92, jpegQ: 48, label: 'Güçlü' };
    }
    if (q <= 72) {
        return { preset: '/ebook', dpi: 128, jpegQ: 68, label: 'Dengeli' };
    }
    return { preset: '/printer', dpi: 168, jpegQ: 82, label: 'Kalite Öncelikli' };
}

async function runGhostscriptCompression(gs, inputPath, outputPath, profile) {
    const args = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        '-dSAFER',
        `-dPDFSETTINGS=${profile.preset}`,
        '-dDetectDuplicateImages=true',
        '-dCompressFonts=true',
        '-dSubsetFonts=true',
        '-dDownsampleColorImages=true',
        '-dDownsampleGrayImages=true',
        '-dDownsampleMonoImages=true',
        '-dColorImageDownsampleType=/Bicubic',
        '-dGrayImageDownsampleType=/Bicubic',
        `-dColorImageResolution=${profile.dpi}`,
        `-dGrayImageResolution=${profile.dpi}`,
        '-dMonoImageResolution=300',
        `-dJPEGQ=${profile.jpegQ}`,
        `-sOutputFile=${outputPath}`,
        inputPath,
    ];

    await execFileAsync(gs, args, {
        windowsHide: true,
        timeout: 180000,
        maxBuffer: 4 * 1024 * 1024,
    });
}

app.get('/api/pdf/compress/health', async (req, res) => {
    const gs = await resolveGhostscriptExecutable();
    if (!gs) {
        return res.status(503).json({
            ok: false,
            message: 'Ghostscript bulunamadı.',
            hint: 'Windows için Ghostscript kurun veya GHOSTSCRIPT_PATH ortam değişkenini gswin64c.exe yoluna ayarlayın.',
        });
    }
    res.json({ ok: true, engine: 'Ghostscript', executable: path.basename(gs) });
});

app.post('/api/pdf/compress', pdfUpload.single('file'), async (req, res) => {
    let inputPath = req.file?.path;
    let outputPath = null;

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'PDF dosyası gönderilmedi.' });
        }

        const gs = await resolveGhostscriptExecutable();
        if (!gs) {
            return res.status(503).json({
                message: 'PDF sıkıştırma motoru bulunamadı. Sunucuda Ghostscript kurulu olmalı.',
                code: 'GHOSTSCRIPT_NOT_FOUND',
                hint: 'Windows: Ghostscript 64-bit kurun. Gerekirse .env içine GHOSTSCRIPT_PATH=C:\\\\Program Files\\\\gs\\\\<surum>\\\\bin\\\\gswin64c.exe ekleyin.',
            });
        }

        const requestedQuality = Number(req.body?.quality) || 65;
        const profile = pdfCompressionProfile(requestedQuality);
        const safeName = String(req.file.originalname || 'document.pdf')
            .replace(/[^\w.\-() ÇĞİÖŞÜçğıöşü]/g, '_');

        outputPath = path.join(pdfUploadDir, `${Date.now()}_${Math.random().toString(16).slice(2)}_compressed.pdf`);

        await runGhostscriptCompression(gs, inputPath, outputPath, profile);

        if (!fs.existsSync(outputPath)) {
            throw new Error('Ghostscript çıktı dosyası oluşturamadı.');
        }

        const originalSize = fs.statSync(inputPath).size;
        let outputSize = fs.statSync(outputPath).size;

        // Kullanıcının amacı küçültmek olduğu için seçilen profil sonuç vermediyse
        // bir kez daha daha güçlü ayarla dene.
        if (outputSize >= originalSize && profile.preset !== '/screen') {
            try {
                fs.unlinkSync(outputPath);
            } catch (_) {}

            const stronger = { preset: '/screen', dpi: 82, jpegQ: 42, label: 'Ekstra Güçlü' };
            await runGhostscriptCompression(gs, inputPath, outputPath, stronger);
            outputSize = fs.statSync(outputPath).size;
        }

        const encodedName = encodeURIComponent(`compressed_${safeName}`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
        res.setHeader('X-Original-Size', String(originalSize));
        res.setHeader('X-Compressed-Size', String(outputSize));
        res.setHeader('X-Compression-Percent', originalSize > 0 ? String(Math.max(0, Math.round((1 - outputSize / originalSize) * 100))) : '0');
        res.setHeader('Access-Control-Expose-Headers', 'X-Original-Size,X-Compressed-Size,X-Compression-Percent,Content-Disposition');

        const stream = fs.createReadStream(outputPath);
        stream.on('close', () => {
            try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (_) {}
            try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
        });
        stream.pipe(res);
    } catch (err) {
        console.error('PDF sıkıştırma hatası:', err);

        try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (_) {}
        try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}

        if (!res.headersSent) {
            res.status(500).json({
                message: 'PDF sıkıştırılamadı.',
                detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
            });
        }
    }
});

app.post('/api/tmsdespatches/getall', async (req, res) => {
    try {
        const response = await axios.post(
            'https://api.odaklojistik.com.tr/api/tmsdespatches/getall',
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${process.env.API_TOKEN}`, // 🔧 Burada düzeltme yaptık
                    'Content-Type': 'application/json',
                },
            }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error('❌ Proxy Hatası:', err.message);
        res.status(500).json({ message: 'Proxy üzerinden API isteği başarısız oldu.' });
    }
});

// PDF_UPLOAD_ERROR_HANDLER
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            message: err.code === 'LIMIT_FILE_SIZE'
                ? 'PDF dosyası 80 MB sınırını aşıyor.'
                : `Dosya yükleme hatası: ${err.message}`,
        });
    }
    if (err?.message === 'Sadece PDF dosyaları kabul edilir.') {
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

app.get('/', (req, res) => {
    res.send('✅ Sunucu çalışıyor');
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
