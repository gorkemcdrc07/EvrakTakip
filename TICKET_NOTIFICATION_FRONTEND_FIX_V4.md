# Ticket kullanıcı bildirimi FIX V4

Bu sürümde kullanıcı bildirimi Supabase Realtime/WebSocket'e bağlı değildir.

- `app_notifications` tablosu doğrudan `target_username = aktif kullanıcı` ile REST üzerinden okunur.
- Ticket sahibine atanmış bildirimler ekran yetkisi veya bildirim tercihi filtresinde düşürülmez.
- Navbar 5 saniyede bir tüm bildirimleri yeniler.
- Normal kullanıcı için son ticket bildirimi ayrıca 3 saniyede bir kontrol edilir; yeni kayıt varsa toast gösterilir.
- Realtime bağlantısı başarısız olsa bile bildirim paneli ve sayaç çalışır.

Test: ozge oturumunu açık bırakın; admin yeni mesaj atsın veya durumu değiştirsin. En geç yaklaşık 3-5 saniye içinde zil sayacı/panel güncellenmelidir.
