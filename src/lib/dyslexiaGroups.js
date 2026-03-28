/**
 * Türkçe disleksi / okuma güçlüğü çalışmalarına uyumlu harf grupları.
 * Görsel: benzer biçim; işitsel: sert–yumuşak ünsüz; sesli: ünlü karışıklığı.
 */

const DOTLESS_I = "\u0131";

/**
 * @typedef {{ key: string, title: string, letters: string[] }} DyslexiaPairGroup
 */

/** Görsel karışıklık (biçim benzerliği) */
/** @type {DyslexiaPairGroup[]} */
export const VISUAL_GROUPS = [
  { key: "bd", title: "b ve d", letters: ["b", "d"] },
  { key: "pb", title: "p ve b", letters: ["p", "b"] },
  { key: "mn", title: "m ve n", letters: ["m", "n"] },
  { key: "ii", title: "ı ve i", letters: [DOTLESS_I, "i"] },
  { key: "oo", title: "o ve ö", letters: ["o", "ö"] },
];

/** İşitsel karışıklık (sert / yumuşak ünsüz çiftleri) */
/** @type {DyslexiaPairGroup[]} */
export const AUDITORY_GROUPS = [
  { key: "pb", title: "p ve b (pe–be)", letters: ["p", "b"] },
  { key: "td", title: "t ve d (te–de)", letters: ["t", "d"] },
  { key: "cg", title: "c ve g (ce–ge)", letters: ["c", "g"] },
  { key: "fv", title: "f ve v (fe–ve)", letters: ["f", "v"] },
  { key: "sz", title: "s ve z (se–ze)", letters: ["s", "z"] },
  { key: "sj", title: "ş ve j (şe–je)", letters: ["ş", "j"] },
];

/** Sesli harf karışıklığı */
/** @type {DyslexiaPairGroup[]} */
export const VOWEL_GROUPS = [
  { key: "oa", title: "o ve a", letters: ["o", "a"] },
  { key: "ae", title: "a ve e", letters: ["a", "e"] },
  { key: "oo", title: "o ve ö", letters: ["o", "ö"] },
  { key: "ii", title: "ı ve i", letters: [DOTLESS_I, "i"] },
];

/** @returns {Record<string, null>} */
export function emptyCategoryState(groups) {
  return Object.fromEntries(groups.map((g) => [g.key, null]));
}
