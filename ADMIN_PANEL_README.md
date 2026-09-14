# Yönetim Paneli v49

## Kurulum
Supabase Dashboard > SQL Editor içinde `supabase/ADMIN_PANEL_SETUP.sql` dosyasını bir kez çalıştırın.

Sonra uygulamayı yeniden deploy edin. `admin` kullanıcısı sidebar'da **Yönetim > Yönetim Paneli** ekranını görür.

## Neler yönetiliyor?
- `login` tablosundan kullanıcı ekleme / düzenleme / silme
- Kullanıcı adı, ad soyad ve mevcut mimariye uygun düz şifre
- Aktif / pasif kullanıcı
- Rol etiketi
- Ekran görünürlükleri
- Ekran bazlı işlem izinleri: Yeni/Ekle, Kaydet, Düzenle, Sil, Durum, Toplu, Dosya Yükle, Excel/PDF/İndir
- Sidebar görünürlüğü
- URL ile doğrudan ekran açma kontrolü
- Ekrandaki yaygın aksiyon butonlarına merkezi izin kontrolü
- Yetki değişikliğinin açık oturuma Realtime ile düşmesi

## Önemli güvenlik notu
Mevcut proje oturum açmada Supabase Auth/JWT kullanmıyor. `login` tablosunda düz şifre sorgulanıyor ve kullanıcı bilgisi localStorage'a yazılıyor. Bu yüzden v49'daki yetki sistemi **uygulama/UI düzeyinde işlevsel kontrol** sağlar; geliştirici araçlarıyla veya doğrudan Supabase isteğiyle aşılmasını veritabanı seviyesinde kesin olarak engelleyemez.

Gerçek sunucu/veritabanı seviyesinde güvenlik için sonraki aşamada kullanıcıları Supabase Auth'a geçirmek ve RLS politikalarını `auth.uid()` / JWT rollerine bağlamak gerekir. Bu geçiş yapılana kadar mevcut login davranışı korunmuştur.
