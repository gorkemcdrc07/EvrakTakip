# Hedef Kargo filtre düzeltmesi

- Durum/Teslim Tarihi boş olan kayıtlar artık tarih aralığı sorgusunda kaybolmaz; Bekleyen havuzuna alınır.
- Bekleyen kartına basınca `teslim_tarihi` boş olan kayıtlar filtrelenir.
- Bugün Eklenen kartı yerel tarihe göre `tarih` alanını kullanır ve bugünkü kayıtlar durum tarihinden bağımsız ayrıca yüklenir.
- Aynı kayıt birden fazla gruptan geldiyse id bazında tekilleştirilir.
- Durum Tarihi başlangıç/bitiş filtresi teslim edilmiş kayıtlar için çalışmaya devam eder.
