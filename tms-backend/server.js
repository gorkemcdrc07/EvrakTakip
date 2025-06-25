const express = require('express');
const cors = require('cors');
require('dotenv').config();

const tmsProxy = require('./api/tmsProxy');

const app = express();

// CORS'u frontend adresine göre özelleştir
app.use(cors({
    origin: 'http://localhost:3000',  // frontend'in çalıştığı adres ve port (örn: 3000 veya 3001)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json());

app.use('/api', tmsProxy);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Proxy sunucu ${PORT} portunda çalışıyor.`);
});
