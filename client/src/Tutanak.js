import React, { useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { useNavigate } from "react-router-dom";

const Tutanak = () => {
    const navigate = useNavigate();
    const [aciklama, setAciklama] = useState('');
    const [sorumluluk, setSorumluluk] = useState('');
    const [firma, setFirma] = useState('');
    const contentRef = useRef();

    const [processState, setProcessState] = useState({
        open: false,
        type: '',
        title: '',
        message: '',
        status: 'idle',
        progress: 0,
    });

    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };
    const today = formatDate(new Date());

    const handlePaste = (e) => {
        const raw = e.target.value.trim();
        const delimiter = raw.includes('\t') ? '\t' : ';';
        const lines = raw.split("\n");

        if (lines.length < 2) {
            alert("Lütfen başlık satırı + veri satırını birlikte yapıştırın.");
            return;
        }

        const headers = lines[0].split(delimiter).map(h => h.trim());
        const values = lines[1].split(delimiter).map(v => v.trim());

        const row = {};
        headers.forEach((h, i) => {
            row[h] = values[i] || "";
        });

        const firma_ = row["Tedarikçi Firma"];
        const aliciFirma = row["Teslim Alan Firma"];
        const tarih = row["Sefer Tarihi"];
        const irsaliye = row["İrsaliye No"];
        const seferNo = row["Sefer No"];
        const musteriAdi = row["Müşteri Adı"];
        const plaka1 = row["Plaka"];
        const plaka2 = row["Treyler"];
        const teslimIlce = row["Teslim Yeri"];
        const tckn = row["Sürücü TCKN"];
        const surucuAd = row["Sürücü Ad Soyad"];
        const yuklemeYeri = row["Yükleme Yeri"];

        const aciklamaMetni = `
Sayın Taşıyıcı Muhatap; ${firma_}, ${tarih} tarihinde ${seferNo} nolu sefer numaralı ${musteriAdi}, ${yuklemeYeri}’dan yükleyip ${aliciFirma}, ${teslimIlce}’ya ulaştırılması amacıyla ${plaka1}/${plaka2} Plakalı araç sürücüsü ${surucuAd} (TCKN: ${tckn}) Tedarikçi firma ${firma_}, ${irsaliye} nolu irsaliyeli fatura ile taşınan ürünlerin teslim edildiğini beyan edilmiştir. Ancak teslime ilişkin evraklar bugüne kadar tarafımıza ibraz edilmemiştir.
`.trim();

        const sorumlulukMetni = `
ODAK TEDARİK ZİNCİRİ VE LOJİSTİK A.Ş.’ne

Sayın Taşıyıcı Muhatap; ${firma_}, ${tarih} tarihinde ${seferNo} nolu sefer numaralı ${musteriAdi}, ${yuklemeYeri}’dan yükleyip ${aliciFirma}, ${teslimIlce}’ya ulaştırılması amacıyla ${plaka1}/${plaka2} Plakalı araç sürücüsü ${surucuAd} (TCKN: ${tckn}) Tedarikçi firma ${firma_}, ${irsaliye} irsaliyeli fatura ile teslim edilmiştir.
`.trim();

        setFirma(firma_);
        setAciklama(aciklamaMetni);
        setSorumluluk(sorumlulukMetni);
    };

    const openProcess = (type, title, message) => {
        setProcessState({
            open: true,
            type,
            title,
            message,
            status: 'loading',
            progress: 12,
        });
    };

    const updateProcess = (progress, title, message) => {
        setProcessState(prev => ({
            ...prev,
            progress,
            title: title || prev.title,
            message: message || prev.message,
        }));
    };

    const completeProcess = (title, message) => {
        setProcessState(prev => ({
            ...prev,
            status: 'success',
            progress: 100,
            title,
            message,
        }));

        setTimeout(() => {
            setProcessState({
                open: false,
                type: '',
                title: '',
                message: '',
                status: 'idle',
                progress: 0,
            });
        }, 1500);
    };

    const errorProcess = (title, message) => {
        setProcessState(prev => ({
            ...prev,
            status: 'error',
            title,
            message,
        }));

        setTimeout(() => {
            setProcessState({
                open: false,
                type: '',
                title: '',
                message: '',
                status: 'idle',
                progress: 0,
            });
        }, 1800);
    };

    const handleWordExport = async () => {
        try {
            openProcess('word', 'Word hazırlanıyor', 'Belge Word formatına dönüştürülüyor...');
            updateProcess(28, 'Word hazırlanıyor', 'İçerik düzenleniyor...');
            await new Promise(resolve => setTimeout(resolve, 300));

            const content = contentRef.current.cloneNode(true);
            content.style.fontFamily = 'Times New Roman, serif';

            const applyFontSize = (selector, size) => {
                const elements = content.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.fontSize = size;
                    el.style.fontFamily = 'Times New Roman, serif';
                });
            };

            applyFontSize('h1, h2', '11pt');
            applyFontSize('p', '11pt');

            const paragraphs = content.querySelectorAll('p');
            paragraphs.forEach((el, idx) => {
                const txt = el.textContent;

                if (txt.startsWith('Sayın Taşıyıcı Muhatap') && txt.includes('teslim edildiğini beyan edilmiştir')) {
                    el.style.fontSize = '10pt';
                }

                if (txt.includes('teslim edilmemesi nedeni') || txt.includes('KDV ödemeleri')) {
                    el.style.fontSize = '11pt';
                }

                if (txt === 'SORUMLULUK BEYANI') {
                    const next = paragraphs[idx + 1];
                    if (next && next.textContent.startsWith('ODAK TEDARİK')) {
                        next.style.fontSize = '10pt';
                    }
                }
            });

            updateProcess(65, 'Word oluşturuluyor', 'Dosya yapısı hazırlanıyor...');
            await new Promise(resolve => setTimeout(resolve, 350));

            const finalInnerHTML = content.innerHTML;

            const html = `
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Times New Roman', serif;">
${finalInnerHTML}
</body>
</html>
`;

            const docxBlob = htmlDocx.asBlob(html);
            updateProcess(88, 'Word indiriliyor', 'Word dosyası indirilmeye hazırlanıyor...');
            await new Promise(resolve => setTimeout(resolve, 250));

            saveAs(docxBlob, 'tutanak.docx');
            completeProcess('Word hazır', 'Word belgesi başarıyla oluşturuldu.');
        } catch (error) {
            errorProcess('Word hatası', 'Word dosyası oluşturulurken bir sorun oluştu.');
        }
    };

    const handlePrint = async () => {
        try {
            openProcess('print', 'Yazdırma hazırlanıyor', 'Yazdırma görünümü düzenleniyor...');
            updateProcess(35, 'Yazdırma hazırlanıyor', 'Belge yazdırma ekranına aktarılıyor...');
            await new Promise(resolve => setTimeout(resolve, 350));

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head><title>Tutanak</title></head>
                    <body>${contentRef.current.innerHTML}</body>
                </html>
            `);
            printWindow.document.close();

            updateProcess(80, 'Yazdırma açılıyor', 'Yazdırma penceresi kullanıcıya sunuluyor...');
            await new Promise(resolve => setTimeout(resolve, 400));

            printWindow.print();
            completeProcess('Yazdırma hazır', 'Yazdırma ekranı açıldı.');
        } catch (error) {
            errorProcess('Yazdırma hatası', 'Yazdırma ekranı açılırken bir sorun oluştu.');
        }
    };

    const handleExcelExport = async () => {
        try {
            openProcess('excel', 'Excel hazırlanıyor', 'Veriler tablo yapısına dönüştürülüyor...');
            updateProcess(32, 'Excel hazırlanıyor', 'Sayfa verileri işleniyor...');
            await new Promise(resolve => setTimeout(resolve, 300));

            const ws = XLSX.utils.json_to_sheet([
                { Açıklama: aciklama },
                { Sorumluluk: sorumluluk }
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Tutanak');

            updateProcess(78, 'Excel oluşturuluyor', 'Excel dosyası hazırlanıyor...');
            await new Promise(resolve => setTimeout(resolve, 350));

            XLSX.writeFile(wb, 'tutanak.xlsx');
            completeProcess('Excel hazır', 'Excel dosyası başarıyla oluşturuldu.');
        } catch (error) {
            errorProcess('Excel hatası', 'Excel dosyası oluşturulurken bir sorun oluştu.');
        }
    };

    const handlePDFExport = async () => {
        try {
            openProcess('pdf', 'PDF hazırlanıyor', 'Belge görsele dönüştürülüyor...');
            updateProcess(24, 'PDF hazırlanıyor', 'Sayfa yakalanıyor...');
            await new Promise(resolve => setTimeout(resolve, 280));

            const canvas = await html2canvas(contentRef.current, { scale: 2 });
            updateProcess(62, 'PDF oluşturuluyor', 'Sayfa PDF belgesine işleniyor...');
            await new Promise(resolve => setTimeout(resolve, 320));

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            updateProcess(88, 'PDF indiriliyor', 'PDF dosyası kullanıma hazır hale getiriliyor...');
            await new Promise(resolve => setTimeout(resolve, 260));

            pdf.save('tutanak.pdf');
            completeProcess('PDF hazır', 'PDF belgesi başarıyla oluşturuldu.');
        } catch (error) {
            errorProcess('PDF hatası', 'PDF oluşturulurken bir sorun oluştu.');
        }
    };

    const getButtonClass = (type) => {
        const base =
            "group relative overflow-hidden px-5 py-3 rounded-2xl font-medium text-white transition-all duration-300 shadow-lg hover:-translate-y-0.5 active:scale-[0.98]";
        switch (type) {
            case 'home':
                return `${base} bg-slate-700 hover:bg-slate-600 shadow-slate-900/30`;
            case 'word':
                return `${base} bg-gradient-to-r from-blue-600 to-cyan-500 shadow-blue-900/30`;
            case 'pdf':
                return `${base} bg-gradient-to-r from-rose-600 to-red-500 shadow-red-900/30`;
            case 'excel':
                return `${base} bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 shadow-yellow-900/20`;
            case 'print':
                return `${base} bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-900/30`;
            default:
                return base;
        }
    };

    const getPanelTheme = () => {
        if (processState.status === 'success') {
            return {
                glow: 'shadow-emerald-500/20',
                badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
                progress: 'from-emerald-400 to-green-300',
            };
        }
        if (processState.status === 'error') {
            return {
                glow: 'shadow-rose-500/20',
                badge: 'bg-rose-500/15 text-rose-300 border-rose-400/20',
                progress: 'from-rose-400 to-red-300',
            };
        }

        switch (processState.type) {
            case 'word':
                return {
                    glow: 'shadow-blue-500/20',
                    badge: 'bg-blue-500/15 text-blue-300 border-blue-400/20',
                    progress: 'from-blue-400 to-cyan-300',
                };
            case 'pdf':
                return {
                    glow: 'shadow-rose-500/20',
                    badge: 'bg-rose-500/15 text-rose-300 border-rose-400/20',
                    progress: 'from-rose-400 to-red-300',
                };
            case 'excel':
                return {
                    glow: 'shadow-yellow-500/20',
                    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/20',
                    progress: 'from-yellow-300 to-amber-200',
                };
            case 'print':
                return {
                    glow: 'shadow-emerald-500/20',
                    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
                    progress: 'from-emerald-400 to-teal-300',
                };
            default:
                return {
                    glow: 'shadow-slate-500/20',
                    badge: 'bg-slate-500/15 text-slate-300 border-slate-400/20',
                    progress: 'from-slate-300 to-white',
                };
        }
    };

    const renderAnimatedIcon = () => {
        if (processState.status === 'success') {
            return (
                <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-[28px] bg-emerald-400/15 blur-xl animate-pulse"></div>
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-emerald-300/20 bg-white/5 backdrop-blur-xl">
                        <div className="text-4xl animate-bounce">✅</div>
                    </div>
                </div>
            );
        }

        if (processState.status === 'error') {
            return (
                <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-[28px] bg-rose-400/15 blur-xl animate-pulse"></div>
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-rose-300/20 bg-white/5 backdrop-blur-xl">
                        <div className="text-4xl animate-pulse">⚠️</div>
                    </div>
                </div>
            );
        }

        if (processState.type === 'pdf') {
            return (
                <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-[28px] bg-rose-500/15 blur-xl animate-pulse"></div>
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl">
                        <div className="relative h-16 w-14 rounded-xl bg-white shadow-2xl">
                            <div className="absolute right-0 top-0 h-4 w-4 rounded-bl-lg bg-rose-200"></div>
                            <div className="absolute left-3 top-4 h-1.5 w-8 rounded bg-rose-500/80 animate-pulse"></div>
                            <div className="absolute left-3 top-8 h-1.5 w-6 rounded bg-slate-300 animate-[typing_1s_ease-in-out_infinite]"></div>
                            <div className="absolute left-3 top-12 h-1.5 w-7 rounded bg-slate-300 animate-[typing_1s_ease-in-out_0.2s_infinite]"></div>
                            <div className="absolute -right-4 bottom-1 text-xl animate-bounce">✍️</div>
                        </div>
                    </div>
                </div>
            );
        }

        if (processState.type === 'word') {
            return (
                <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-[28px] bg-blue-500/15 blur-xl animate-pulse"></div>
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl">
                        <div className="relative flex h-16 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-bold text-2xl shadow-xl animate-[floaty_2s_ease-in-out_infinite]">
                            W
                            <div className="absolute -bottom-3 left-1/2 h-2 w-10 -translate-x-1/2 rounded-full bg-blue-300/30 blur"></div>
                        </div>
                    </div>
                </div>
            );
        }

        if (processState.type === 'excel') {
            return (
                <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-[28px] bg-yellow-500/15 blur-xl animate-pulse"></div>
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl">
                        <div className="relative h-16 w-14 rounded-xl bg-gradient-to-br from-amber-300 to-yellow-200 shadow-xl overflow-hidden">
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-4">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="border border-slate-900/10"></div>
                                ))}
                            </div>
                            <div className="absolute left-2 top-2 text-slate-800 font-black text-xl animate-pulse">X</div>
                        </div>
                    </div>
                </div>
            );
        }

        if (processState.type === 'print') {
            return (
                <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-[28px] bg-emerald-500/15 blur-xl animate-pulse"></div>
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl">
                        <div className="relative">
                            <div className="mx-auto h-7 w-11 rounded-t-lg bg-slate-200 animate-[paperMove_1.5s_ease-in-out_infinite]"></div>
                            <div className="h-9 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-xl"></div>
                            <div className="mx-auto mt-1 h-3 w-10 rounded-b-md bg-white/90"></div>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    const theme = getPanelTheme();

    return (
        <>
            <style>
                {`
                    @keyframes typing {
                        0%, 100% { width: 24px; opacity: .5; }
                        50% { width: 34px; opacity: 1; }
                    }
                    @keyframes floaty {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-6px); }
                    }
                    @keyframes paperMove {
                        0%, 100% { transform: translateY(0px); opacity: .9; }
                        50% { transform: translateY(-6px); opacity: 1; }
                    }
                    @keyframes softPulse {
                        0%,100% { transform: scale(1); opacity: .7; }
                        50% { transform: scale(1.04); opacity: 1; }
                    }
                `}
            </style>

            <div className="min-h-screen bg-[radial-gradient(circle_at_top,#172554_0%,#0f172a_35%,#020617_100%)] px-4 py-10 text-slate-100">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                        <div className="mb-6 rounded-[28px] border border-white/10 bg-gradient-to-r from-white/10 to-white/5 p-5">
                            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                                Nakliye Seferi Bilgilendirme Formu
                            </h1>
                            <p className="mt-2 text-sm text-slate-300">
                                Aynı yapı korundu, görünüm ve işlem deneyimi güçlendirildi.
                            </p>
                        </div>

                        <textarea
                            placeholder="Excel'den tek satır kopyalayın ve buraya yapıştırın"
                            onChange={handlePaste}
                            className="mb-6 w-full rounded-[22px] border border-white/10 bg-slate-950/50 p-4 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10 resize-none"
                            rows={4}
                        />

                        <textarea
                            value={aciklama}
                            onChange={(e) => setAciklama(e.target.value)}
                            className="mb-6 w-full rounded-[22px] border border-white/10 bg-slate-950/50 p-4 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10 resize-none"
                            rows={6}
                            placeholder="Açıklama metnini burada düzenleyebilirsiniz"
                        />

                        <textarea
                            value={sorumluluk}
                            onChange={(e) => setSorumluluk(e.target.value)}
                            className="mb-6 w-full rounded-[22px] border border-white/10 bg-slate-950/50 p-4 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10 resize-none"
                            rows={5}
                            placeholder="Sorumluluk metnini burada düzenleyebilirsiniz"
                        />

                        <div className="mb-8 flex flex-wrap gap-4">
                            <button
                                onClick={() => navigate("/anasayfa")}
                                className={getButtonClass('home')}
                            >
                                <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100"></span>
                                <span className="relative z-10">⬅️ Anasayfa</span>
                            </button>

                            <button
                                onClick={handleWordExport}
                                className={getButtonClass('word')}
                            >
                                <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100"></span>
                                <span className="relative z-10">📄 Word</span>
                            </button>

                            <button
                                onClick={handlePDFExport}
                                className={getButtonClass('pdf')}
                            >
                                <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100"></span>
                                <span className="relative z-10">📕 PDF</span>
                            </button>

                            <button
                                onClick={handleExcelExport}
                                className={getButtonClass('excel')}
                            >
                                <span className="absolute inset-0 bg-white/20 opacity-0 transition group-hover:opacity-100"></span>
                                <span className="relative z-10">📊 Excel</span>
                            </button>

                            <button
                                onClick={handlePrint}
                                className={getButtonClass('print')}
                            >
                                <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100"></span>
                                <span className="relative z-10">🖨️ Yazdır</span>
                            </button>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_25px_80px_rgba(0,0,0,0.18)]">
                            <div ref={contentRef} className="bg-white text-black print:shadow-none print:p-0 print:bg-white">
                                <h1 className="text-xl font-bold text-center mb-6">
                                    NAKLİYE SEFERİ BİLGİLENDİRME FORMU
                                </h1>

                                <div className="flex items-start gap-4 mb-2">
                                    <div className="inline-block">
                                        <strong>İŞVEREN : </strong>
                                        <div className="border-b border-black w-full mt-[2px]"></div>
                                    </div>

                                    <p className="leading-tight">
                                        ODAK TEDARİK ZİNCİRİ VE LOJİSTİK A.Ş.<br />
                                        Vergi Dairesi: ALEMDAĞ<br />
                                        Vergi No: 6340954050
                                    </p>
                                </div>

                                <div className="mt-4 flex items-start gap-4">
                                    <div className="inline-block">
                                        <strong>TAŞIYICI</strong>
                                        <div className="border-b border-black w-full mt-[2px]"></div>
                                    </div>

                                    <div className="inline-block">
                                        <strong>{firma || '---'}</strong>
                                        <div className="border-b border-black w-full mt-[2px]"></div>
                                    </div>
                                </div>

                                <div className="mt-6 inline-block">
                                    <h2 className="font-semibold text-lg inline-block">AÇIKLAMALAR  :</h2>
                                    <div className="border-b border-black w-full mt-[2px]"></div>
                                </div>

                                <p className="mt-2 whitespace-pre-wrap">{aciklama}</p>

                                <p className="mt-6 whitespace-pre-wrap">
                                    Karayolları Trafik Kanunu ve teamüller uyarınca; ‘’basiretli bir tacir olan taşıyan,
                                    verilen yük muhteviyatını, boşaltma/teslim adresine sağlam, eksiksiz ve sözleşmede belirlenen
                                    süre içerisinde teslim etmekle ve her bir sevkiyat için Taşıtan'ın irsaliye ofislerinden
                                    taşıma irsaliyesini almakla yükümlüdür. Yükleme tamamlandıktan sonra bu irsaliyenin bir
                                    nüshası kesilecek olan nakliye faturasına eklenir ve Taşıtan yetkililerine teslim edilir.
                                    Teslimat esnasında, Taşıtan'ın müşterisine ait “sevk irsaliyelerinin alt nüshaları yükün tam
                                    ve eksiksiz teslim alındığına dair kaşe ve imza yaptırılmak zorundadır. Kaşe imza eksik olan
                                    seferlerin, Taşıtanının müşterisine ait sevk irsaliyesi veya Taşıtan'a ait taşıma irsaliyesi
                                    eksik olan seferlerin bakiyesi ödenmez.’’
                                    <br /><br />
                                    İşbu nedenle, tarafınızca taşıması yapılan yukarıda sefer bilgisi verilen taşımaya ilişkin
                                    teslim evraklarının tarafımıza teslim edilmemesi nedeni ile KDV ödemeleriniz yapılamamaktadır.
                                    Teslim evraklarının 3 (üç) gün içerisinde tarafımıza teslimi ya da evrakların
                                    temin edilememesi/kaybolması durumunda oluşabilecek zararlarla ilgili sorumluluğun kendinizde
                                    olduğuna ilişkin ekteki tutanağın imzalanarak tarafımıza teslimi durumunda KDV ödemeleri
                                    tarafımızca yapılacaktır.
                                </p>

                                <h2 className="mt-8 font-semibold text-lg">SORUMLULUK BEYANI</h2>
                                <p className="mt-2 whitespace-pre-wrap">{sorumluluk}</p>

                                <div
                                    className="mt-10 whitespace-pre-wrap"
                                    style={{ fontSize: '11pt', fontFamily: 'Times New Roman, serif' }}
                                >
                                    <p>
                                        Tarih: {today}<br />
                                        Beyan eden;<br />
                                        {firma || '---'}<br /><br />
                                        Kaşe / İmza
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {processState.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md px-4">
                        <div className={`w-full max-w-lg rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.96))] p-6 shadow-2xl ${theme.glow}`}>
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-5">
                                    {renderAnimatedIcon()}
                                </div>

                                <div className={`mb-4 rounded-full border px-4 py-1.5 text-xs font-medium tracking-[0.2em] uppercase ${theme.badge}`}>
                                    {processState.status === 'loading' ? 'İşlem sürüyor' : processState.status === 'success' ? 'Tamamlandı' : 'Hata'}
                                </div>

                                <h3 className="text-2xl font-semibold text-white">
                                    {processState.title}
                                </h3>

                                <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">
                                    {processState.message}
                                </p>

                                <div className="mt-6 w-full">
                                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                                        <span>İşlem durumu</span>
                                        <span>%{processState.progress}</span>
                                    </div>
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${theme.progress} transition-all duration-500`}
                                            style={{ width: `${processState.progress}%` }}
                                        />
                                    </div>
                                </div>

                                {processState.status !== 'loading' && (
                                    <button
                                        onClick={() =>
                                            setProcessState({
                                                open: false,
                                                type: '',
                                                title: '',
                                                message: '',
                                                status: 'idle',
                                                progress: 0,
                                            })
                                        }
                                        className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-5 py-2.5 text-sm text-white transition hover:bg-white/15"
                                    >
                                        Kapat
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Tutanak;