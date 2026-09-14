# PDF sıkıştırma servisi

## Local

1. Ghostscript kurun. Windows'ta `gswin64c.exe` PATH içinde olmalı.
2. `cd server`
3. `npm install`
4. `npm start`
5. Test: `http://localhost:5000/api/pdf/compress/health`

## Render

PDF sıkıştırma Ghostscript gerektirdiği için servis Docker olarak deploy edilmelidir.
Repo kökündeki `render.yaml` ve `server/Dockerfile` bu amaçla eklendi.

Frontend `REACT_APP_API_BASE_URL` değerini kullanır. Mevcut değer `https://evrak-takip-api.onrender.com/api` ise endpoint otomatik olarak `/pdf/compress` olur.
