# Operasyon Merkezi v55 – Kurulum

Bu sürüm Akıllı Bildirim Merkezi, İş/Görev Merkezi, Global Arama, Audit Log, Admin Duyuruları, Kullanıcı Aktivitesi, Operasyon Takvimi ve Otomatik Rapor Merkezi ekler.

## 1) Supabase SQL
Supabase Dashboard > SQL Editor > New Query:
`supabase/OPERATIONS_HUB_SETUP.sql` dosyasının tamamını çalıştırın.

Daha önce çalıştırılmadıysa mevcut iki kurulum da gereklidir:
- `supabase/TICKET_SYSTEM_SETUP.sql`
- `supabase/ADMIN_PANEL_SETUP.sql`

## 2) Yeni ekran yetkileri
Yönetim Paneli'nden kullanıcılara gerektiği şekilde şu ekranları açın:
- `/gorev-merkezi`
- `/operasyon-takvimi`

Şu ekranlar yönetim grubundadır ve admin için tasarlanmıştır:
- `/audit-log`
- `/rapor-merkezi`

Admin tüm ekranları otomatik görür.

## 3) Otomatik rapor e-postaları
Backend/Render ortam değişkenleri:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (sadece backend; frontend'e ASLA koymayın)
- `SMTP_HOST=smtp.office365.com`
- `SMTP_PORT=587`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (opsiyonel)

`server/package.json` içine `node-cron` ve `nodemailer` eklendi. Render backend yeniden deploy edilmelidir.
Zamanlayıcı Europe/Istanbul saatine göre her dakika planları kontrol eder; günlük/haftalık zamanı gelen rapor özetini e-posta ile yollar.

## 4) Otomatik görev kuralları
Uygulama açıldığında/bildirim merkezi yenilendiğinde:
- Hedef Kargo: teslim tarihi boş ve kayıt tarihi 7+ gün eski → kontrol görevi
- Tahakkuk: ödeme tarihi yarın ve ödenmemiş → ödeme kontrol görevi
- Kargo: irsaliye numarası boş → eksik evrak görevi
`task_key` unique olduğu için aynı iş tekrar tekrar oluşturulmaz.

## 5) Bildirimler
Bildirim Merkezi; otomatik görevleri, admin duyurularını ve admin için yeni ticketları birleştirir.
Okundu bilgisi `app_read_items` tablosunda kullanıcı bazında saklanır.

## 6) Güvenlik notu
Mevcut uygulama hâlâ Supabase Auth/JWT yerine özel `login` tablosu + localStorage kullanıyor. Bu nedenle SQL politikaları mevcut uygulamanın çalışabilmesi için permissive'dir. UI yetkileri çalışır ancak gerçek veritabanı seviyesinde kullanıcı izolasyonu için Supabase Auth/JWT + RLS geçişi yapılmalıdır.
