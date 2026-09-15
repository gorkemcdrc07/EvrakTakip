# Ticket kullanıcı bildirimi düzeltmesi V2

Kök neden: ticket bildirim kaynağı `/ticket-yonetimi` (admin ekranı) ile yetki kontrolünden geçiriliyordu. Normal kullanıcı bu ekrana yetkili olmadığı için kendi ticket bildirimleri `fetchNotifications()` sonunda filtreleniyordu.

Düzeltmeler:
- Normal kullanıcı ticket bildirimlerinde yetki kontrolü `/ticketlerim` üzerinden yapılıyor.
- Görüldü, işleme alındı, çözüldü ve admin mesajı ayrı bildirim kayıtları olarak üretiliyor.
- Realtime'a ek güvence olarak bildirim sayacı 5 saniyede bir yenileniyor.
- Bildirim tıklaması `/ticketlerim` ekranına yönleniyor.
