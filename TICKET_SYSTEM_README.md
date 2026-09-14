# Ticket Sistemi Kurulum

1. Supabase Dashboard > SQL Editor açın.
2. `supabase/TICKET_SYSTEM_SETUP.sql` dosyasını çalıştırın.
3. Uygulamayı yeniden deploy edin.
4. `username` değeri tam olarak `admin` olan kullanıcı navbar'da bildirim rozeti ve **Ticket Yönetimi** menüsünü görür.

## Akış
- Kullanıcı navbar > Ticket üzerinden gerçek kayıt gönderir.
- PNG/JPG/WEBP ekran görüntüsü ekleyebilir; Ctrl+V ile panodan ekran görüntüsü yapıştırabilir.
- Görseller `ticket-attachments` bucket'ına gider.
- Ticket `support_tickets` tablosuna kaydolur.
- Admin navbar rozetinde yeni ticket sayısı görünür.
- Realtime etkinse anında, ayrıca 20 saniyede bir yedek kontrol yapılır.
- Admin Ticket Yönetimi ekranında ticket'ı açınca `Yeni` ticket otomatik `İnceleniyor` olur.
- Admin durum değiştirebilir ve kullanıcıya görünen admin notu yazabilir.

## Güvenlik notu
Mevcut proje Supabase Auth yerine `login` tablosu + localStorage kullanıyor. Bu nedenle frontend'deki `admin` kontrolü kullanıcı arayüzü yetkilendirmesidir; veritabanında güvenilir kullanıcı kimliği üretmez. SQL politikaları mevcut mimarinin çalışması için anon istemci erişimine izin verir. DB seviyesinde kesin admin güvenliği için oturum yapısının Supabase Auth veya backend session/JWT yapısına taşınması gerekir.
