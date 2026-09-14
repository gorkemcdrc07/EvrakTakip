# Bildirim Tercihleri + Tahakkuk Takip v56

## SQL
v55 `OPERATIONS_HUB_SETUP.sql` dosyasını daha önce çalıştırdıysanız Supabase SQL Editor'da yalnızca:

`supabase/NOTIFICATION_PREFERENCES_V56.sql`

dosyasını çalıştırmanız yeterlidir.

Yeni kurulumlarda güncel `supabase/OPERATIONS_HUB_SETUP.sql` dosyası doğrudan tercih tablosunu da oluşturur.

## Bildirim davranışı
Bir bildirim gösterilmek için iki kontrolden geçer:

1. Kullanıcı ilgili kaynak ekranını görme yetkisine sahip olmalı.
2. Kullanıcının Bildirim Merkezi > Ayarlar alanında o kaynak açık olmalı.

Örnek:
- Kullanıcı sadece `/tahakkuk` ekranını görebiliyorsa Kargo, Hedef Kargo ve Evrak bildirimleri gelmez.
- Tahakkuk bildirimi ayrıca kullanıcı tarafından kapatılmışsa o da gelmez.
- Admin duyuruları ekran yetkisine bağlı değildir fakat kullanıcı tercihinden kapatılabilir.
- Başlık ve mesaj/açıklaması tamamen boş kayıtlar bildirim listesine alınmaz.

Tercihler `app_notification_preferences` tablosunda kullanıcı bazında saklanır.

## Tahakkuk Takip
`/tahakkuk` erişimi olan herkes otomatik olarak `/tahakkuk-takip` ekranını da görebilir.
Ayrı bir yetki vermek gerekmez.

Takip ekranı:
- geciken tahakkuklar
- bugün / yarın
- önümüzdeki 3 ve 7 gün
- aylık ödeme takvimi
- seçilen günün firmaları
- yaklaşan işlemler

gösterir. Başka modüllerin Kargo/Hedef Kargo verilerini göstermez.

## Ek veri güvenliği
Görev Merkezi ve Operasyon Takvimi de görev kaynaklarını kullanıcının ekran yetkisine göre filtreler.
