import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef } from "react";

export default function QrOkuyucu({ onScan, id = "qr-reader-modal" }) {
    const scannerRef = useRef(null);
    const runningRef = useRef(false);
    const lastScanRef = useRef("");

    useEffect(() => {
        let cancelled = false;

        const scanner = new Html5Qrcode(id);
        scannerRef.current = scanner;

        const config = {
            fps: 15,
            qrbox: { width: 300, height: 300 }, // 🔥 büyüttük
            aspectRatio: 1.0,
            disableFlip: false,
        };

        const camera = { facingMode: "environment" };

        const onSuccess = (decodedText) => {
            if (decodedText === lastScanRef.current) return;
            lastScanRef.current = decodedText;
            onScan(decodedText);
            setTimeout(() => (lastScanRef.current = ""), 800);
        };

        const onError = (err) => {
            // Sürekli gelebilir; istersen yorum satırı yap
            // console.debug("scan:", err);
        };

        (async () => {
            try {
                await new Promise((r) => setTimeout(r, 300));
                if (cancelled) return;
                await scanner.start(camera, config, onSuccess, onError);
                runningRef.current = true;
            } catch (e) {
                console.error("Html5Qrcode start error:", e);
            }
        })();

        return () => {
            cancelled = true;
            runningRef.current = false;
            scanner.stop().catch(() => { });
            scanner.clear?.();
        };
    }, [id, onScan]);

    return <div id={id} style={{ width: "100%", height: 360 }} />;
}
