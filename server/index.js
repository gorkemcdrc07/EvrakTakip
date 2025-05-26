const express = require('express');
const app = express();
const PORT = 5000;

app.use(express.json());

// Sağlık kontrolü için basit bir GET
app.get('/', (req, res) => {
    res.send('✅ Sunucu çalışıyor!');
});

// 🔧 Eksik olan bu kısım ↓
app.post('/api/evrak-ekle', (req, res) => {
    const { tarih, lokasyon_id, proje_id, seferler } = req.body;

    console.log('📥 Gelen veri:', req.body);

    // Normalde burada veritabanına kayıt yapılır
    // Örnek cevap gönderiyoruz:
    res.status(200).json({
        message: 'Evrak ve seferler başarıyla alındı.',
        data: { tarih, lokasyon_id, proje_id, seferler }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
