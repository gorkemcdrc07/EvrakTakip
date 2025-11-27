// ==========================
// 📌 IMPORTLAR
// ==========================
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import ReactToPrint from "react-to-print";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
    Trash2,
    Eye,
    EyeOff,
    GripVertical,
    Download,
    Upload,
    Loader2,
    FileText
} from "lucide-react";

// WORD EXPORT
import {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    WidthType,
    TextRun
} from "docx";
import { saveAs } from "file-saver";


// ==========================
// 📄 PRINT (PDF) İÇERİĞİ
// ==========================
const PrintLayout = React.forwardRef(({ columns, rows }, ref) => {
    const visible = columns.filter((c) => c.visible);

    const preparedRows = rows.map((row) =>
        visible.map((c) => row[parseInt(c.id.split("-")[1])] || "—")
    );

    return (
        <div
            ref={ref}
            style={{
                padding: "20px",
                background: "white",
                color: "black",
                minHeight: "100vh",
                fontSize: "10px"
            }}
        >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        {visible.map((c) => (
                            <th
                                key={c.id}
                                style={{
                                    border: "1px solid #000",
                                    padding: "3px",
                                    textAlign: "left"
                                }}
                            >
                                {c.name}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {preparedRows.map((row, r) => (
                        <tr key={r}>
                            {row.map((cell, c) => (
                                <td
                                    key={c}
                                    style={{
                                        border: "1px solid #000",
                                        padding: "3px",
                                        fontSize: "9px"
                                    }}
                                >
                                    {String(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});


// ==========================
// 🌑 SÜTUN COMPONENT
// ==========================
function SortableColumn({ col, toggleColumn, removeColumn }) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: col.id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className="p-4 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-between"
        >
            <div className="flex items-center space-x-4">
                <button {...attributes} {...listeners} className="cursor-grab text-gray-400">
                    <GripVertical size={20} />
                </button>
                <span className="text-gray-200">{col.name}</span>
            </div>

            <div className="flex space-x-3">
                <button
                    onClick={() => toggleColumn(col.id)}
                    className="p-2 rounded-lg bg-gray-900 text-gray-300 border border-gray-700"
                >
                    {col.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>

                <button
                    onClick={() => removeColumn(col.id)}
                    className="p-2 rounded-lg bg-gray-900 text-gray-300 border border-gray-700 hover:bg-red-700"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}



// ==========================
// 💻 ANA COMPONENT
// ==========================
export default function ExcelDonusum() {

    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [fileName, setFileName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const printRef = useRef();

    // ==========================
    // 📌 EXCEL'DEN YAPIŞTIRMA (CTRL + V)
    // ==========================
    React.useEffect(() => {
        const handlePaste = (e) => {
            let text = e.clipboardData.getData("text/plain");
            if (!text) return;

            // Excel satır-sütun ayrımı (TSV)
            const parsed = text
                .trim()
                .split("\n")
                .map((row) => row.split("\t"));

            if (parsed.length === 0) return;

            // İlk satır → başlık
            const headerRow = parsed[0];

            const newCols = headerRow.map((h, i) => ({
                id: `col-${i}`,
                name: h || `Sütun ${i + 1}`,
                visible: true,
            }));

            // Diğer satırlar → data
            const rowData = parsed.slice(1);

            setColumns(newCols);
            setRows(rowData);

            alert("Excel'den veriler başarıyla yapıştırıldı.");
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [setColumns, setRows]);


    // ==========================
    // 📌 EXCEL YÜKLE
    // ==========================
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, { type: "binary" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const headerRow = data[0];
            if (!headerRow) return;

            const newCols = headerRow.map((h, i) => ({
                id: `col-${i}`,
                name: h || `Sütun ${i + 1}`,
                visible: true,
            }));

            setColumns(newCols);
            setRows(data.slice(1));
            setIsLoading(false);
        };

        reader.readAsBinaryString(file);
    };


    // ==========================
    // 📌 DRAG-DROP
    // ==========================
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;

        setColumns((cols) => {
            const oldIndex = cols.findIndex((c) => c.id === active.id);
            const newIndex = cols.findIndex((c) => c.id === over.id);
            return arrayMove(cols, oldIndex, newIndex);
        });
    };




    // ==========================
    // 📌 SÜTUN GÖSTER / GİZLE
    // ==========================
    const toggleColumn = (id) =>
        setColumns((cols) =>
            cols.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
        );


    // ==========================
    // 📌 SÜTUN SİL
    // ==========================
    const removeColumn = (id) =>
        setColumns((cols) => cols.filter((c) => c.id !== id));



    // ==========================
    // 📌 EXCEL EXPORT
    // ==========================
    const handleDownloadExcel = () => {
        const visible = columns.filter((c) => c.visible);
        const header = visible.map((c) => c.name);

        const data = [header];
        rows.forEach((row) =>
            data.push(visible.map((c) => row[parseInt(c.id.split("-")[1])] || "—"))
        );

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Veri");
        XLSX.writeFile(wb, `duzenlenmis_${fileName}`);
    };



    // ==========================
    // 📌 WORD EXPORT (DÜZELTİLMİŞ)
    // ==========================
    const handleDownloadWord = async () => {
        const visible = columns.filter((c) => c.visible);

        const headerCells = visible.map((col) =>
            new TableCell({
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: col.name, bold: true, size: 18 })],
                    }),
                ],
                width: { size: 100 / visible.length, type: WidthType.PERCENTAGE }
            })
        );

        const bodyRows = rows.map((row) =>
            new TableRow({
                children: visible.map((col) =>
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: String(row[parseInt(col.id.split("-")[1])] || "—"),
                                        size: 18
                                    })
                                ]
                            })
                        ],
                        width: { size: 100 / visible.length, type: WidthType.PERCENTAGE }
                    })
                )
            })
        );

        const table = new Table({
            rows: [
                new TableRow({ children: headerCells }),
                ...bodyRows
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
        });

        const doc = new Document({
            sections: [
                {
                    properties: {
                        page: {
                            size: {
                                orientation: "landscape" // ← 📌 YATAY SAYFA
                            }
                        }
                    },
                    children: [table]
                }
            ]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `duzenlenmis_${fileName.replace(".xlsx", "")}.docx`);
    };



    // ==========================
    // 📌 RENDER
    // ==========================
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-10">

            {/* ---- UPLOAD ---- */}
            <section className="mb-10 p-6 bg-gray-800 rounded-xl border border-gray-700">
                <h2 className="text-xl font-bold text-indigo-400 flex items-center mb-4">
                    <Upload size={22} className="mr-2" /> Dosya Yükleme
                </h2>

                <label className="cursor-pointer block">
                    <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />

                    <div className="p-10 text-center border border-dashed border-gray-600 rounded-xl">
                        {isLoading ? (
                            <div className="flex items-center justify-center space-x-3 text-indigo-400">
                                <Loader2 size={20} className="animate-spin" />
                                <span>Yükleniyor...</span>
                            </div>
                        ) : (
                            <span className="text-gray-300">
                                {fileName || "Yüklemek için tıklayın"}
                            </span>
                        )}
                    </div>
                </label>
            </section>


            {/* ---- SÜTUN YÖNETİMİ ---- */}
            {columns.length > 0 && (
                <>
                    <section className="mb-10 p-6 bg-gray-800 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-bold text-indigo-400 mb-4 flex items-center">
                            <GripVertical size={22} className="mr-2" /> Sütun Yönetimi
                        </h2>

                        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {columns.map((col) => (
                                        <SortableColumn
                                            key={col.id}
                                            col={col}
                                            toggleColumn={toggleColumn}
                                            removeColumn={removeColumn}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </section>


                    {/* ---- ÖNİZLEME + ÇIKTI ---- */}
                    <section className="p-6 bg-gray-800 rounded-xl border border-gray-700">

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-indigo-400">
                                Önizleme & Çıktı
                            </h2>

                            <div className="flex space-x-3">
                                <ReactToPrint
                                    trigger={() => (
                                        <button className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-full text-white font-bold flex items-center">
                                            <FileText size={18} className="mr-2" /> Yazdır / PDF
                                        </button>
                                    )}
                                    content={() => printRef.current}
                                />

                                <button
                                    onClick={handleDownloadExcel}
                                    className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-full text-white font-bold flex items-center"
                                >
                                    <Download size={18} className="mr-2" /> Excel İndir
                                </button>

                                <button
                                    onClick={handleDownloadWord}
                                    className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-full text-white font-bold flex items-center"
                                >
                                    <FileText size={18} className="mr-2" /> Word İndir
                                </button>
                            </div>
                        </div>

                        <div className="overflow-auto border border-gray-700 rounded-xl">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700">
                                    <tr>
                                        {columns.filter((c) => c.visible).map((c) => (
                                            <th
                                                key={c.id}
                                                className="px-4 py-3 text-left text-indigo-300 text-sm border-r border-gray-600"
                                            >
                                                {c.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-700">
                                    {rows.slice(0, 10).map((r, ri) => (
                                        <tr key={ri}>
                                            {columns.filter((c) => c.visible).map((c, ci) => (
                                                <td
                                                    key={ci}
                                                    className="px-4 py-3 text-sm text-gray-300 border-r border-gray-700"
                                                >
                                                    {String(r[parseInt(c.id.split("-")[1])] || "—")}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </section>
                </>
            )}

            {/* ---- PRINT DOM ---- */}
            <div style={{ display: "none" }}>
                <PrintLayout
                    ref={printRef}
                    columns={columns}
                    rows={rows}
                />
            </div>
        </div>
    );
}
