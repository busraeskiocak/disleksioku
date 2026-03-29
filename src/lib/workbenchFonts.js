/** WordLikeWorkbench / okuma görünümleri ile ortak (UPP fontPreference id) */

const STACKS = {
  opendyslexic: '"OpenDyslexic", "Segoe UI", sans-serif',
  arial: 'Arial, Helvetica, "Segoe UI", sans-serif',
  "comic-sans": '"Comic Sans MS", "Comic Sans", "Segoe UI", cursive',
  "times-new-roman": '"Times New Roman", Times, "Liberation Serif", serif',
  verdana: 'Verdana, Geneva, "Segoe UI", sans-serif',
};

/**
 * @param {string | undefined} fontId
 * @returns {string}
 */
export function getWorkbenchFontStack(fontId) {
  if (fontId && typeof fontId === "string" && STACKS[fontId]) {
    return STACKS[fontId];
  }
  return STACKS.opendyslexic;
}
