import React, { useEffect, useState } from 'react';

function AracEvrakTakip() {
    const [veri, setVeri] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchVeriler = async () => {
        setLoading(true);
        setError(null);

        const payload = {
            startDate: '2025-04-01T00:00:00',
            endDate: '2025-04-10T00:00:00',
            userId: 1,
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 49223653afa4b7e22c3659762c835dcdef9725a401e928fd46f697be8ea2597273bf4479cf9d0f7e5b8b03907c2a0b4d58625692c3e30629ac01fc477774de75'
        };

        try {
            const [evrakResp, aracResp] = await Promise.all([
                fetch('/api/tmsdespatchdocuments/getall', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                }),
                fetch('/api/tmsdespatches/getalltmsvehicletracking', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                }),
            ]);

            const evrakJson = await evrakResp.json();
            const aracJson = await aracResp.json();

            const evrakData = evrakJson.Data || [];
            const aracMap = new Map();

            (aracJson.Data || []).forEach(item => {
                if (item.DocumentNo) {
                    aracMap.set(item.DocumentNo, item);
                }
            });

            const sonuc = evrakData.map(evrak => {
                const arac = aracMap.get(evrak.DocumentNo);
                return {
                    DocumentNo: evrak.DocumentNo,
                    TMSDespatchDocumentStatu: evrak.TMSDespatchDocumentStatu,
                    SupplierCurrentAccountFullTitle: evrak.SupplierCurrentAccountFullTitle || '-',
                    CompletedBy: arac?.CompletedBy || 'SHÖ girilmemiş olabilir kontrol ediniz',
                    CompletedDate: arac?.CompletedDate
                        ? new Date(arac.CompletedDate).toLocaleString('tr-TR')
                        : '-'
                };
            });

            setVeri(sonuc);
        } catch (err) {
            console.error('API Hatası:', err);
            setError("Veriler alınırken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVeriler();
    }, []);

    return (
        <div className="p-6 bg-gray-100 min-h-screen text-black">
            <h1 className="text-2xl font-bold mb-4 text-pink-600">📄 Araç ve Evrak Takip</h1>

            {loading && <p>Yükleniyor...</p>}
            {error && <p className="text-red-600">{error}</p>}

            {!loading && !error && (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-pink-200">
                            <tr>
                                <th className="px-4 py-2">Document No</th>
                                <th className="px-4 py-2">Statu</th>
                                <th className="px-4 py-2">Tedarikçi</th>
                                <th className="px-4 py-2">Tamamlayan</th>
                                <th className="px-4 py-2">Tamamlanma Tarihi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {veri.map((item, i) => (
                                <tr key={i} className="border-t border-gray-300">
                                    <td className="px-4 py-2">{item.DocumentNo}</td>
                                    <td className="px-4 py-2">{item.TMSDespatchDocumentStatu}</td>
                                    <td className="px-4 py-2">{item.SupplierCurrentAccountFullTitle}</td>
                                    <td className="px-4 py-2">{item.CompletedBy}</td>
                                    <td className="px-4 py-2">{item.CompletedDate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AracEvrakTakip;
