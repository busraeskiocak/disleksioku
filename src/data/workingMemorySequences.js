/** Çalışan bellek: 4–7 harfli diziler (Türkçe harf kümesi, büyük harf) */

export const WORKING_MEMORY_ALPHABET = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
const ALPHABET = WORKING_MEMORY_ALPHABET;

function rndChar() {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
}

function shuffleLengths() {
  const base = [4, 5, 5, 6, 7];
  const a = [...base];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 5 deneme, uzunluk 4–7 arası.
 * @returns {{ letters: string[], display: string, normalized: string }[]}
 */
export function generateWorkingMemoryTrials() {
  const lengths = shuffleLengths();
  return lengths.map((len) => {
    const letters = Array.from({ length: len }, () => rndChar());
    const display = letters.join(" — ");
    const normalized = letters.join("");
    return { letters, display, normalized };
  });
}

export const WM_DISPLAY_SEC = 2;
