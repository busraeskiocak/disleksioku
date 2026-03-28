/** Fonolojik farkındalık soru havuzu */

/** @typedef {{ id: string, type: 'rhyme', w1: string, w2: string, rhymes: boolean }} RhymeItem */
/** @typedef {{ id: string, type: 'letterRemove', word: string, remove: string, options: string[], correctIndex: number }} LetterRemoveItem */

/** @type {(RhymeItem|LetterRemoveItem)[]} */
const BANK = [
  { id: "ph-r1", type: "rhyme", w1: "kaz", w2: "baz", rhymes: true },
  { id: "ph-r2", type: "rhyme", w1: "deniz", w2: "gelin", rhymes: true },
  { id: "ph-r3", type: "rhyme", w1: "kitap", w2: "masa", rhymes: false },
  { id: "ph-r4", type: "rhyme", w1: "anne", w2: "mayne", rhymes: true },
  { id: "ph-r5", type: "rhyme", w1: "top", w2: "kap", rhymes: true },
  { id: "ph-r6", type: "rhyme", w1: "elma", w2: "araba", rhymes: false },
  { id: "ph-r7", type: "rhyme", w1: "dal", w2: "kal", rhymes: true },
  { id: "ph-r8", type: "rhyme", w1: "su", w2: "kuş", rhymes: false },
  { id: "ph-l1", type: "letterRemove", word: "kitap", remove: "k", options: ["itap", "katap", "tikap"], correctIndex: 0 },
  { id: "ph-l2", type: "letterRemove", word: "masa", remove: "m", options: ["asa", "mas", "sama"], correctIndex: 0 },
  { id: "ph-l3", type: "letterRemove", word: "bardak", remove: "b", options: ["ardak", "barak", "brdak"], correctIndex: 0 },
  { id: "ph-l4", type: "letterRemove", word: "köpek", remove: "k", options: ["öpek", "köek", "kpek"], correctIndex: 0 },
  { id: "ph-l5", type: "letterRemove", word: "çiçek", remove: "ç", options: ["içek", "çiçk", "çiek"], correctIndex: 0 },
  { id: "ph-l6", type: "letterRemove", word: "salıncak", remove: "s", options: ["alıncak", "salınca", "alınca"], correctIndex: 0 },
];

export const PHONOLOGICAL_TIME_SEC = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 5 soru: 2 kafiye + 3 harf çıkarma (karıştırılmış) */
export function pickPhonologicalSession() {
  const rhymes = BANK.filter((x) => x.type === "rhyme");
  const letters = BANK.filter((x) => x.type === "letterRemove");
  const rPick = shuffle(rhymes).slice(0, 2);
  const lPick = shuffle(letters).slice(0, 3);
  return shuffle([...rPick, ...lPick]);
}
