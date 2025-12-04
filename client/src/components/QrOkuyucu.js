import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef } from "react";

export default function QrOkuyucu({ onScan }) {
    const lastScanRef = useRef("");
    const scannerRef = useRef(null);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        const config = { fps: 10, qrbox: 250 };
        const constraints = { video: { facingMode: "environment" } };

        html5QrCode.start(
            constraints,
            config,
            decodedText => {
                // Aynı kod saniyede 20 kez okunmasın diye 
                if (decodedText === lastScanRef.current) return;
                lastScanRef.current = decodedText;

                onScan(decodedText);

                // 1 saniye bekle sonra aynı kod tekrar okunabilir hale gelsin
                setTimeout(() => { lastScanRef.current = ""; }, 1000);
            },
            err => console.warn(err)
        );

        return () => {
            html5QrCode.stop().catch(err => console.error("Kapatma hatası:", err));
        };
    }, []);

    return <div id="qr-reader" style={{ width: "100%" }}></div>;
}
