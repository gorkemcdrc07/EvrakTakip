import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef } from "react";

export default function QrOkuyucu({ onScan }) {
    const scannerRef = useRef(null);
    const runningRef = useRef(false);
    const lastScanRef = useRef("");

    useEffect(() => {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        const config = { fps: 10, qrbox: 250 };
        const backCamera = { video: { facingMode: { ideal: "environment" } } };
        const anyCamera = { video: true };

        const decode = (text) => {
            if (text === lastScanRef.current) return;
            lastScanRef.current = text;
            onScan(text);
            setTimeout(() => (lastScanRef.current = ""), 800);
        };

        const start = async () => {
            try {
                await scanner.start(backCamera, config, decode);
                runningRef.current = true;
            } catch (_) {
                try {
                    await scanner.start(anyCamera, config, decode);
                    runningRef.current = true;
                } catch (e) {
                    const el = document.getElementById("qr-reader");
                    if (el) {
                        el.innerHTML = `
                            <div style="color:red;font-weight:bold;padding:10px;">
                                Kamera açılamadı. Lütfen kamera izni verip sayfayı yenileyin.
                            </div>
                        `;
                    }
                }
            }
        };

        start();

        return () => {
            if (runningRef.current && scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    return <div id="qr-reader" style={{ width: "100%", height: 250 }} />;
}
