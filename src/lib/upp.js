/** LexiLens UPP (User Reading Profile) — kalibrasyon çıktısı */

export const UPP_VERSION = 3;

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

/**
 * @param {{
 *   dyslexiaCalibration: {
 *     visual: Record<string, string>,
 *     auditory: Record<string, string>,
 *     vowel: Record<string, string>,
 *     syllableQuiz: Array<{
 *       word: string,
 *       correctHyphenation: string,
 *       optionsShown: string[],
 *       correctIndex: number,
 *       selectedIndex: number,
 *       isCorrect: boolean,
 *     }>,
 *   },
 *   fontId: string,
 *   backgroundId: string,
 *   letterSpacingEm: number,
 *   lineHeight: number,
 *   difficultWords?: string[],
 *   cognitiveProfile?: unknown,
 * }} params
 */
export function buildUpp({
  dyslexiaCalibration,
  cognitiveProfile,
  fontId,
  backgroundId,
  letterSpacingEm,
  lineHeight,
  difficultWords = [],
}) {
  const bg = BACKGROUND_PRESETS[backgroundId];
  if (!bg) throw new Error(`Geçersiz arka plan: ${backgroundId}`);

  return {
    version: UPP_VERSION,
    createdAt: new Date().toISOString(),
    dyslexiaCalibration,
    cognitiveProfile: cognitiveProfile ?? null,
    fontPreference: fontId,
    background: { id: bg.id, color: bg.color },
    typography: {
      letterSpacingEm,
      lineHeight,
    },
    difficultWords: [...difficultWords],
  };
}
