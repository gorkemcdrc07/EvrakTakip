# Evrak Takip Sistemi v19

Tüm Kargo Bilgileri ekranı performans ve analiz odaklı olarak yenilendi.

- Açılışta veri sorgulanmaz; kullanıcı gün/tarih aralığı seçer.
- Supabase sorgusu seçilen tarih aralığıyla sınırlandırılır.
- Tam genişlik modern ana sayfa teması.
- İrsaliye Adı, Kargo Firması ve Gönderen Firma filtreleri.
- Büyük/küçük harf, boşluk ve Türkçe karakter varyasyonları için akıllı benzer filtre önerisi.
- Kargo/gönderen/irsaliye dağılım analizleri.
- 100 satırlık istemci sayfalama.
- Modern ExcelJS raporu.
- Kayıt düzenleme/silme ve detay/kopyalama akışları korunmuştur.

## v20 - Akıllı Bağlı Kargo Filtreleri
- Tüm Kargo Bilgileri ekranındaki İrsaliye Adı, Kargo Firması ve Gönderen Firma filtreleri artık birbirine bağlıdır.
- Bir filtre seçildiğinde diğer filtre seçenekleri sadece mevcut seçimlerle eşleşen kayıtlardan üretilir.
- Bağlı filtre hesaplamasına genel arama ve İrsaliye No araması da dahil edilir.
- Her filtre seçeneğinin yanında mevcut filtre bağlamındaki kayıt sayısı gösterilir.
- Her filtre kendi seçeneklerini hesaplarken kendi seçimini dışarıda bırakır; böylece aynı alanda çoklu seçim (OR) yapılabilir.
