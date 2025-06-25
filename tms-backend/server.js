const express = require('express');
const cors = require('cors');
require('dotenv').config();

const tmsProxy = require('./api/tmsProxy');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', tmsProxy);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Proxy sunucu ${PORT} portunda çalışıyor.`);
});
