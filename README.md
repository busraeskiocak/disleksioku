# LexiLens

Disleksili öğrenciler için AI destekli kişiselleştirilmiş okuma aracı.

## 🌐 Canlı Demo
https://lexilens-six.vercel.app

## 📹 Demo Video
https://www.loom.com/share/f327c3500bf24c0e813bc6ecb421ebda

## 💡 Problem
Mevcut disleksi araçları herkese aynı çözümü sunuyor. LexiLens, kullanıcının okuma paternini analiz ederek kişisel bir profil oluşturuyor ve belgeleri o profile göre kişiselleştiriyor.

## ✨ Özellikler

### 🧪 Kalibrasyon Testi
- 8 aşamalı Türkçe disleksi testi
- Görsel karışıklık (b-d, p-b, m-n)
- İşitsel karışıklık (p-b, t-d, c-g)
- Sesli harf karışıklığı
- Hece sırası testi
- Font, arka plan rengi, harf/satır aralığı tercihi
- Okuma hızı ve çalışma belleği testi

### 📖 Okuma Modu
- DOCX yükleme ve kişiselleştirilmiş okuma
- Karşılaştırma modu (orijinal vs kişiselleştirilmiş)
- Kelimeye tıklayınca hece ayırma ve renkli heceler
- Okuma cetveli
- Zoom slider ile belge boyutu ayarlama

### ✏️ Yazma Modu
- Word benzeri editör (kalın, italik, altı çizili, hizalama)
- Kişisel sözlükten yanlış kelime tespiti ve düzeltme önerisi
- Otomatik sayfa yapısı

### 🔍 Kelime Tarayıcı
- Okuma geçmişindeki DOCX belgelerini tara
- Zorlandığın kelimeleri seç ve kişisel sözlüğe ekle
- Karıştırılan kelime şeklini de kaydet (örn: çorap → çorba)

### 👤 Profil ve Analiz
- Kullanıcı Kişisel Profili (UPP) otomatik oluşturulur
- Kişisel sözlük (zorlanılan kelimeler ve karıştırma şekilleri)
- Analiz grafikleri (en çok karıştırılan kelimeler, haftalık trend)

## 🛠️ Kullanılan Teknolojiler
- React.js + Vite
- Tailwind CSS
- localStorage (UPP profil kaydı)
- mammoth.js (DOCX okuma)
- react-pdf + pdfjs-dist (PDF okuma)
- recharts (analiz grafikleri)

## 🚀 Nasıl Çalıştırılır?
```bash
npm install
npm run dev
```

## 🎯 Hedef Kitle
Disleksili öğrenciler
