import { BACKGROUND_PRESETS, FONT_OPTIONS } from "./upp.js";

/** @param {string|undefined} fontId */
export function getFontLabel(fontId) {
  const f = FONT_OPTIONS.find((x) => x.id === fontId);
  return f?.label ?? fontId ?? "—";
}

/** @param {{ id?: string }|undefined} background */
export function getBackgroundLabel(background) {
  const id = background?.id;
  if (id && BACKGROUND_PRESETS[id]) return BACKGROUND_PRESETS[id].label;
  return "—";
}

/**
 * Harf grubu özeti (başlık + kaydedilmiş değer).
 * @param {string} groupTitle — örn. "p ve b (pe–be)"
 * @param {string|undefined} value — harf | both | none
 */
export function describeConfusionValue(groupTitle, value) {
  const title = groupTitle || "";
  if (!value) return `${title}: kayıt yok`;

  if (value === "both")
    return `${title}: ikisini birbirine karıştırıyorsun`;
  if (value === "none")
    return `${title}: bu çiftte genelde sorun yaşamıyorsun`;

  return `${title}: “${value}” harfine daha çok takılıyorsun`;
}

/** @param {number|undefined} em */
export function letterSpacingSummary(em) {
  if (em == null || Number.isNaN(em)) return { label: "—", detail: "" };
  if (em < 0.05) return { label: "Dar", detail: `${(em * 100).toFixed(0)}%` };
  if (em < 0.1) return { label: "Orta", detail: `${(em * 100).toFixed(0)}%` };
  return { label: "Geniş", detail: `${(em * 100).toFixed(0)}%` };
}

/** @param {number|undefined} lh */
export function lineHeightSummary(lh) {
  if (lh == null || Number.isNaN(lh)) return { label: "—", detail: "" };
  if (lh < 1.52) return { label: "Sıkı", detail: lh.toFixed(2) };
  if (lh < 1.9) return { label: "Orta", detail: lh.toFixed(2) };
  return { label: "Aralıklı", detail: lh.toFixed(2) };
}
