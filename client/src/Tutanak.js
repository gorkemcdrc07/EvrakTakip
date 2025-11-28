import React, { useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import htmlDocx from 'html-docx-js/dist/html-docx';

const Tutanak = () => {
    const [aciklama, setAciklama] = useState('');
    const [sorumluluk, setSorumluluk] = useState('');
    const [firma, setFirma] = useState('');
    const contentRef = useRef();

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

        // 1. satır = Başlıklar
        const headers = lines[0].split(delimiter).map(h => h.trim());

        // 2. satır = Veriler
        const values = lines[1].split(delimiter).map(v => v.trim());

        // Başlık → Değer eşleşmesi
        const row = {};
        headers.forEach((h, i) => {
            row[h] = values[i] || "";
        });

        // Burada artık BAŞLIKLARA GÖRE çekiyorsun
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

    const handleWordExport = () => {
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
        saveAs(docxBlob, 'tutanak.docx');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Tutanak</title></head><body>${contentRef.current.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.print();
    };

    const handleExcelExport = () => {
        const ws = XLSX.utils.json_to_sheet([
            { Açıklama: aciklama },
            { Sorumluluk: sorumluluk }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tutanak');
        XLSX.writeFile(wb, 'tutanak.xlsx');
    };

    const handlePDFExport = async () => {
        const canvas = await html2canvas(contentRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('tutanak.pdf');
    };

    return (
        <div className="p-10 max-w-5xl mx-auto text-black bg-white rounded shadow">

            {/* EXCEL PASTE */}
            <textarea
                placeholder="Excel'den tek satır kopyalayın ve buraya yapıştırın"
                onChange={handlePaste}
                className="w-full p-4 border border-gray-300 rounded mb-6"
                rows={4}
            />

            {/* AÇIKLAMA DÜZENLEME TEXTAREA */}
            <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded mb-6"
                rows={6}
                placeholder="Açıklama metnini burada düzenleyebilirsiniz"
            />

            {/* SORUMLULUK DÜZENLEME TEXTAREA */}
            <textarea
                value={sorumluluk}
                onChange={(e) => setSorumluluk(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded mb-6"
                rows={5}
                placeholder="Sorumluluk metnini burada düzenleyebilirsiniz"
            />

            <div className="flex gap-4 mb-6 flex-wrap">
                <button onClick={handleWordExport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">📄 Word</button>
                <button onClick={handlePDFExport} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">📕 PDF</button>
                <button onClick={handleExcelExport} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded">📊 Excel</button>
                <button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">🖨️ Yazdır</button>
            </div>

            {/* GÖRÜNEN FORM (DEĞİŞMEYEN BÖLÜM) */}
            <div ref={contentRef} className="bg-white p-8 shadow print:shadow-none print:p-0 print:bg-white">

                <h1 className="text-xl font-bold text-center mb-6">NAKLİYE SEFERİ BİLGİLENDİRME FORMU</h1>

                <p><strong>İŞVEREN</strong>: ODAK TEDARİK ZİNCİRİ VE LOJİSTİK A.Ş.<br />
                    Vergi Dairesi: ALEMDAĞ<br />
                    Vergi No: 6340954050</p>

                <p className="mt-4"><strong>TAŞIYICI</strong>: {firma || '---'}</p>

                <h2 className="mt-6 font-semibold text-lg">AÇIKLAMALAR</h2>
                <p className="mt-2 whitespace-pre-wrap">{aciklama}</p>

                <p className="mt-6 whitespace-pre-wrap">
                    Karayolları Trafik Kanunu ve teamüller uyarınca; ‘’basiretli bir tacir olan taşıyan, verilen yük muhteviyatını, boşaltma/teslim adresine sağlam, eksiksiz ve sözleşmede belirlenen süre içerisinde teslim etmekle ve her bir sevkiyat için Taşıtan'ın irsaliye ofislerinden taşıma irsaliyesini almakla yükümlüdür. Yükleme tamamlandıktan sonra bu irsaliyenin bir nüshası kesilecek olan nakliye faturasına eklenir ve Taşıtan yetkililerine teslim edilir. Teslimat esnasında, Taşıtan'ın müşterisine ait “sevk irsaliyelerinin alt nüshaları yükün tam ve eksiksiz teslim alındığına dair kaşe ve imza yaptırılmak zorundadır. Kaşe imza eksik olan seferlerin, Taşıtanının müşterisine ait sevk irsaliyesi veya Taşıtan'a ait taşıma irsaliyesi eksik olan seferlerin bakiyesi ödenmez.’’

                    İşbu nedenle, tarafınızca taşıması yapılan yukarıda sefer bilgisi verilen taşımaya ilişkin teslim evraklarının tarafımıza teslim edilmemesi nedeni ile KDV ödemeleriniz yapılamamaktadır. Teslim evraklarının 3 (üç) gün içerisinde tarafımıza teslimi ya da evrakların temin edilememesi/kaybolması durumunda oluşabilecek zararlarla ilgili sorumluluğun kendinizde olduğuna ilişkin ekteki tutanağın imzalanarak tarafımıza teslimi durumunda KDV ödemeleri tarafımızca yapılacaktır.
                </p>

                <h2 className="mt-8 font-semibold text-lg">SORUMLULUK BEYANI</h2>
                <p className="mt-2 whitespace-pre-wrap">{sorumluluk}</p>

                <div className="mt-10 whitespace-pre-wrap" style={{ fontSize: '11pt', fontFamily: 'Times New Roman, serif' }}>
                    <p>
                        Tarih: {today}<br />
                        Beyan eden;<br />
                        {firma || '---'}<br /><br />
                        Kaşe / İmza
                    </p>
                </div>
            </div>

        </div>
    );
};

export default Tutanak;
