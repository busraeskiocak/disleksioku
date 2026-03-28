/** Kelime tanıma: bir gerçek, üç sahte */

/** @typedef {{ id: string, real: string, fakes: [string, string, string] }} WordRecSeed */

/** @type {WordRecSeed[]} */
const BANK = [
  { id: "wr-1", real: "elma", fakes: ["talme", "asam", "lema"] },
  { id: "wr-2", real: "masa", fakes: ["asam", "sama", "misa"] },
  { id: "wr-3", real: "kitap", fakes: ["tikap", "katap", "pitak"] },
  { id: "wr-4", real: "okul", fakes: ["tukol", "ukalo", "loku"] },
  { id: "wr-5", real: "bardak", fakes: ["bradak", "dakbar", "rabdak"] },
  { id: "wr-6", real: "anne", fakes: ["enna", "anee", "nnae"] },
  { id: "wr-7", real: "deniz", fakes: ["dinez", "nezid", "edinz"] },
  { id: "wr-8", real: "kuş", fakes: ["küş", "suş", "şuk"] },
  { id: "wr-9", real: "balık", fakes: ["balik", "lıkab", "balkı"] },
  { id: "wr-10", real: "çiçek", fakes: ["çücek", "içtek", "çeçik"] },
];

export const WORD_RECOG_TIME_SEC = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @returns {{ id: string, options: string[], correctIndex: number }[]}
 */
export function pickWordRecognitionSession(count = 8) {
  return shuffle(BANK)
    .slice(0, Math.min(count, BANK.length))
    .map((seed) => {
      const options = shuffle([seed.real, ...seed.fakes]);
      const correctIndex = options.indexOf(seed.real);
      return { id: seed.id, options, correctIndex };
    });
}
