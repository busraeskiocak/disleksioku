# LexiLens — Kullanıcı Akışı (user-flow.md)

## Genel Akış

Kullanıcı Uygulamayı Açar
        ↓
Karşılama Ekranı (E1)
        ↓
localStorage'da profil var mı?
   ↓ EVET              ↓ HAYIR
Okuma Modu (E4)    Kalibrasyon Testi (E2)
                        ↓
                   Profil Özeti (E3)
                        ↓
                   Okuma Modu (E4)
                        ↓
                   Paylaşım (E5) [İsteğe bağlı]

## Adım Adım Kullanıcı Yolculuğu

### Adım 1: Karşılama Ekranı
- Kullanıcı uygulamayı açar
- LexiLens logosu ve kısa açıklama görür
- İki seçenek: "Testi Başlat" veya "Profilime Git"
- "Testi Başlat" → Kalibrasyon ekranına geçer

### Adım 2: Kalibrasyon Testi
- Toplam süre: ~2 dakika
- Aşama 1: Harf karışıklığı testi (b-d, p-q, m-n)
- Aşama 2: Font tercihi seçimi
- Aşama 3: Arka plan rengi seçimi
- Aşama 4: Harf/satır aralığı ayarı
- Test biter → UPP JSON oluşturulur → localStorage'a kaydedilir

### Adım 3: Profil Özeti
- Kullanıcı kendi "okuma reçetesini" görür
- "OpenDyslexic fontu, krem arka plan, b=mavi d=kırmızı"
- "Okumaya Başla" butonuna tıklar

### Adım 4: Okuma Modu
- Metin yapıştırır VEYA PDF/DOCX yükler
- Metin otomatik olarak UPP'ye göre dönüşür
- Karışık harfler renklendirilir
- Odak modu açılabilir

### Adım 5: Paylaşım (İsteğe Bağlı)
- "Profili Paylaş" butonuna tıklar
- QR kod veya link oluşturulur
- Öğretmen veya veliye gönderir
