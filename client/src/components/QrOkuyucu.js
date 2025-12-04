import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef } from "react";

export default function QrOkuyucu({ onScan }) {
    const scannerRef = useRef(null);
    const runningRef = useRef(false); // ✅ scanner aktif mi takip eden flag
    const lastScanRef = useRef("");

    useEffect(() => {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        const config = { fps: 10, qrbox: 250 };

        const constraints1 = { video: { facingMode: { ideal: "environment" } } };
        const constraints2 = { video: true };

        const handleDecode = (decodedText) => {
            if (decodedText === lastScanRef.current) return;
            lastScanRef.current = decodedText;

            onScan(decodedText);

            setTimeout(() => {
                lastScanRef.current = "";
            }, 800);

            if (navigator.vibrate) navigator.vibrate(70);
        };

        const startCamera = async () => {
            try {
                // 🔥 İlk deneme: arka kamera
                await scanner.start(constraints1, config, handleDecode, () => { });
                runningRef.current = true;
            } catch (err1) {
                console.warn("Arka kamera açılamadı, fallback deneniyor");

                try {
                    // 🔥 İkinci deneme: herhangi kamera
                    await scanner.start(constraints2, config, handleDecode, () => { });
                    runningRef.current = true;
                } catch (err2) {
                    console.error("Kamera açılamadı:", err2);

                    const el = document.getElementById("qr-reader");
                    if (el) {
                        el.innerHTML = `
                            <div style="padding:10px;color:red;font-weight:bold;">
                                Kamera açılamadı!<br><br>
                                • Kamera izni vermeniz gerekiyor.<br>
                                • Ayarlardan izin verip sayfayı yenileyin.
                            </div>
                        `;
                    }
                }
            }
        };

        startCamera();

        return () => {
            // 🔥 stop() sadece gerçekten başlatılmışsa çalıştırılır
            if (runningRef.current && scannerRef.current) {
                scannerRef.current.stop()
                    .then(() => {
                        runningRef.current = false;
                    })
                    .catch(() => { })
                    .finally(() => {
                        scannerRef.current = null;
                    });
            }
        };
    }, []);

    return <div id="qr-reader" style={{ width: "100%", height: 250 }}></div>;
}
