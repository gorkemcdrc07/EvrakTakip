const express = require('express');
const axios = require('axios');
const router = express.Router();

const TOKEN = process.env.TMS_API_TOKEN;

router.post('/tmsdespatches/getall', async (req, res) => {
    try {
        const response = await axios.post(
            'https://api.odaklojistik.com.tr/api/tmsdespatches/getall',
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Proxy error:', error?.response?.data || error.message);
        res.status(500).json({ message: 'Proxy API hatası' });
    }
});

module.exports = router;
