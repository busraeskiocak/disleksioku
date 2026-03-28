/** LexiLens UPP (User Reading Profile) — kalibrasyon çıktısı */

export const UPP_VERSION = 1;

export const BACKGROUND_PRESETS = {
  cream: { id: "cream", label: "Krem", color: "#FFF8E7" },
  "light-blue": { id: "light-blue", label: "Açık mavi", color: "#E3F2FD" },
  gray: { id: "gray", label: "Gri", color: "#E8E8E8" },
  white: { id: "white", label: "Beyaz", color: "#FFFFFF" },
};

export const FONT_OPTIONS = [
  {
    id: "opendyslexic",
    label: "OpenDyslexic",
    fontFamily: '"OpenDyslexic", "Segoe UI", sans-serif',
  },
  {
    id: "arial",
    label: "Arial",
    fontFamily: 'Arial, Helvetica, "Segoe UI", sans-serif',
  },
  {
    id: "comic-sans",
    label: "Comic Sans",
    fontFamily: '"Comic Sans MS", "Comic Sans", "Segoe UI", cursive',
  },
];

/** @typedef {{ bd?: string, pq?: string, mn?: string }} LetterConfusion */

/**
 * @param {{
 *   letterConfusion: LetterConfusion,
 *   fontId: string,
 *   backgroundId: string,
 *   letterSpacingEm: number,
 *   lineHeight: number,
 * }} params
 */
export function buildUpp({
  letterConfusion,
  fontId,
  backgroundId,
  letterSpacingEm,
  lineHeight,
}) {
  const bg = BACKGROUND_PRESETS[backgroundId];
  if (!bg) throw new Error(`Geçersiz arka plan: ${backgroundId}`);

  return {
    version: UPP_VERSION,
    createdAt: new Date().toISOString(),
    letterConfusion: {
      bd: letterConfusion.bd,
      pq: letterConfusion.pq,
      mn: letterConfusion.mn,
    },
    fontPreference: fontId,
    background: { id: bg.id, color: bg.color },
    typography: {
      letterSpacingEm,
      lineHeight,
    },
  };
}
