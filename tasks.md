# LexiLens — Görev Listesi (tasks.md)

## Görev 1: Proje İskeleti Oluştur
- React + Tailwind CSS projesi kur
- OpenDyslexic fontunu projeye ekle
- 5 ekran için temel sayfa yapısını oluştur
- localStorage yardımcı fonksiyonlarını yaz

## Görev 2: Karşılama Ekranı (Welcome Screen)
- LexiLens logo ve başlık göster
- "Testi Başlat" butonu ekle
- localStorage'da profil varsa "Profilime Git" butonu göster
- Disleksi dostu sade animasyon ekle

## Görev 3: Kalibrasyon Testi Ekranı
- Harf karışıklığı testi: b-d, p-q, m-n harf çiftlerini göster
- Kullanıcının hangisini karıştırdığını tespit et
- Font tercihi testi: OpenDyslexic, Arial, Comic Sans seçenekleri göster
- Arka plan rengi testi: Krem, açık mavi, gri, beyaz seçenekleri göster
- Harf ve satır aralığı tercihi testi
- Test sonuçlarından UPP JSON oluştur
- UPP'yi localStorage'a kaydet

## Görev 4: Profil Özeti Ekranı
- UPP verilerini oku ve görsel kart olarak göster
- "En rahat fontun: OpenDyslexic" gibi sade özetler göster
- "Okumaya Başla" butonu ekle
- "Profili Paylaş" butonu ekle

## Görev 5: Okuma Modu Ekranı
- Metin yapıştırma kutusu ekle
- PDF yükleme butonu ekle (react-pdf kullan)
- DOCX yükleme butonu ekle (mammoth.js kullan)
- Yüklenen metni UPP'ye göre dönüştür:
  - Karışık harfleri renklendir (b=mavi, d=kırmızı)
  - UPP fontunu uygula
  - Satır ve harf aralığını ayarla
  - Arka plan rengini uygula
- Odak modu: aktif satırı vurgula

## Görev 6: Paylaşım Ekranı
- UPP verisinden benzersiz URL oluştur
- QR kod üret (qrcode.react kullan)
- "Kopyala" ve "İndir" butonları ekle

## Görev 7: Genel Tasarım ve Polish
- Tüm ekranlar mobil uyumlu olsun
- Renk kontrastları disleksi dostu olsun
- Yükleniyor animasyonları ekle
- Hata mesajları ekle
