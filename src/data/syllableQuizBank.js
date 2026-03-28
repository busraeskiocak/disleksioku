/**
 * Hece sırası kalibrasyonu: doğru bölünüş birinci tanım; yanlışlar örnek yanıltıcılar.
 */

/** @typedef {{ word: string, parts: string[], wrong: string[][] }} SyllableBankEntry */

/** @type {SyllableBankEntry[]} */
export const SYLLABLE_BANK = [
  { word: "kitap", parts: ["ki", "tap"], wrong: [["kit", "ap"], ["k", "itap"]] },
  { word: "anne", parts: ["an", "ne"], wrong: [["ann", "e"], ["a", "nne"]] },
  {
    word: "öğretmen",
    parts: ["öğ", "ret", "men"],
    wrong: [
      ["öğret", "men"],
      ["ö", "ğretmen"],
    ],
  },
  {
    word: "bilgisayar",
    parts: ["bil", "gi", "say", "ar"],
    wrong: [
      ["bilgi", "sayar"],
      ["bil", "gisayar"],
    ],
  },
  {
    word: "arabalar",
    parts: ["a", "ra", "ba", "lar"],
    wrong: [
      ["ara", "balar"],
      ["arab", "alar"],
    ],
  },
  { word: "sınıf", parts: ["sın", "ıf"], wrong: [["sı", "nıf"], ["sin", "ıf"]] },
  { word: "masal", parts: ["ma", "sal"], wrong: [["mas", "al"], ["m", "asal"]] },
  { word: "çocuk", parts: ["ço", "cuk"], wrong: [["çoc", "uk"], ["ç", "ocuk"]] },
  { word: "dünya", parts: ["dün", "ya"], wrong: [["dü", "nya"], ["d", "ünya"]] },
  {
    word: "pervane",
    parts: ["per", "va", "ne"],
    wrong: [
      ["perva", "ne"],
      ["p", "ervane"],
    ],
  },
  {
    word: "kütüphane",
    parts: ["kü", "tüp", "ha", "ne"],
    wrong: [
      ["kütüp", "hane"],
      ["kü", "tüphane"],
    ],
  },
  {
    word: "öğrenci",
    parts: ["öğ", "ren", "ci"],
    wrong: [
      ["öğren", "ci"],
      ["ö", "ğrenci"],
    ],
  },
];

export function shuffleCopy(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {number} count
 */
export function buildSyllableQuizSession(count = 5) {
  const picked = shuffleCopy(SYLLABLE_BANK).slice(
    0,
    Math.min(count, SYLLABLE_BANK.length)
  );
  return picked.map((item) => {
    const correctHyphen = item.parts.join("-");
    const wrongHyps = item.wrong.map((w) => w.join("-"));
    const options = shuffleCopy([correctHyphen, ...wrongHyps]);
    const correctIndex = options.indexOf(correctHyphen);
    return {
      word: item.word,
      options,
      correctIndex,
      correctHyphen,
    };
  });
}
