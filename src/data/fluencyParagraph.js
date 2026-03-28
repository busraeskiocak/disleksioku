/** Akıcılık testi için sabit paragraf (kelime sayısı önceden bilinir) */

export const FLUENCY_PARAGRAPH = {
  id: "fluency-main-1",
  text: "Güneşli bir pazartesi sabahında kuşlar bahçede cıvıldıyordu. Çocuklar kitaplarını çantalarına koyup okula doğru yürüdü. Öğretmen sınıfta herkese günaydın dedi ve yeni bir masal okumaya başladı. Hikâye bitince herkes alkışladı.",
};

export function countWordsTurkish(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
