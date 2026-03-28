/**
 * Son aşama metinleri: görsel / işitsel / sesli harf çiftleri ve heceye uygun bol örnek.
 */

export const PARAGRAPH_POOL = [
  "Papyonlu papağan, pembemsi balonları patlattı; ben minik bir kaptan gibi nefeste kaldım. Bambu masada bıldırcın resmi vardı.",
  "Depodaki düğme ve badem şekeri paketleri, tırtıllı bir bidonun dibinde duruyordu. Tıbbi etiket okumak zordu: düdük sesi de bastı.",
  "Köprünün dibinde mırıldanan martılar, mercan ve yosun kokan pürüzsüz taşlara kondu. Denge bozuldu mu denize düşersin dedi Nebi.",
  "Mısır sapı pazarda üst üste; komşum Pembe, mavi bir bezle bağladı. Sızısız domates sosu masanın ucunda, fısıltı gibiydi.",
  "Topbaşı toplantıda müdür düpedüz netti: önce pilot bölüm, sonra paydaşlarla görüş. Vekil not tuttu; Wi‑Fi kesildi mi diye sordu.",
  "Mihrap önündeki camdan pınar ve bağ görünüyordu. Mimari merdiven dar ama çıkmaya değdi; mum ışığında harfler üst üste üstü üste kaydı.",
  "Çocuk, çömlekçinin cıngıldayan çanını dinledi. Gerçek bir örnek: gece ile geğirmek gibi sesler bazen iç içe geçer.",
  "Fısfıs sesi fandan geldi; voleybolda ve filede vız vız vızladı. W harfiyle v’yi villa tabelasında karıştıran veliler vardı.",
  "Zikzak çizen zıp zip zıplar, sarı sıra taşların üstünde şak şak şak gitti. Şeftali çekirdeğini jiletle açmak tehlikeli dedi öğretmen.",
  "Otel odasında örtü ve oje kokusu; öğleden sonra özenti bile olsa okunaklı olmalı. Ağaç altında ekmek ve elma yedik; eş sesli e-lere dikkat.",
  "Ispanaklı ıspanağı ılık çorbada içtik; ıslak ilikli dilim telaffuzu zorlayabilir. Işıl ile Işık isimlerini yazarken noktasız i’ye dikkat.",
  "Hınçlı Nihat, hunharca horozu kovaladı; humus kasesi hâlâ handanın köşesinde. Hemencecik hemencecik hem de huşu ile durdu.",
  "Ünlü uçurtmacı Umut, ufka uçurtmayı uçurdu. Unutkan uşak nunu telaffuzda ünsüzden sonra ünlü arar.",
  "Kütüphanede küfür etmek yok: küçük öğrenci külotlu çorapla kütüğe bindi. Kuskus pilavı kusursuz olunca kuşku kalmadı.",
  "Sınıfta sızlanan süzme yoğurt, sızır sızır taştı. Susamış sıra arkadaşım zımba ile zarfı zıplattı.",
];

export function pickRandomParagraphs(items, n) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}
