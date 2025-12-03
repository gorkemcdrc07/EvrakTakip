import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";

export default function QrOkuyucu({ onScanSuccess }) {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 10,
                qrbox: 250,
                videoConstraints: {
                    facingMode: "environment" // 📌 ARKA KAMERA
                }
            },
            false
        );

        scanner.render(
            (decodedText) => onScanSuccess(decodedText),
            (err) => console.warn(err)
        );

        return () => {
            scanner.clear().catch((err) => console.error("Temizleme hatası:", err));
        };
    }, []);

    return <div id="qr-reader" style={{ width: "100%" }}></div>;
}
