require('dotenv').config(); // .env dosyasını okuyabilmek için en üstte olmalı
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/tmsdespatches/getall', async (req, res) => {
    try {
        const response = await axios.post(
            'https://api.odaklojistik.com.tr/api/tmsdespatches/getall',
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${process.env.API_TOKEN}`, // 🔧 Burada düzeltme yaptık
                    'Content-Type': 'application/json',
                },
            }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error('❌ Proxy Hatası:', err.message);
        res.status(500).json({ message: 'Proxy üzerinden API isteği başarısız oldu.' });
    }
});

app.get('/', (req, res) => {
    res.send('✅ Sunucu çalışıyor');
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
