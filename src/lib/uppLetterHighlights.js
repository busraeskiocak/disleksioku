import {
  AUDITORY_GROUPS,
  VISUAL_GROUPS,
  VOWEL_GROUPS,
} from "./dyslexiaGroups.js";

const COLOR_POOL = [
  "#1d4ed8",
  "#dc2626",
  "#ea580c",
  "#7c3aed",
  "#0d9488",
  "#db2777",
  "#ca8a04",
  "#4f46e5",
  "#15803d",
  "#0e7490",
  "#be185d",
  "#0891b2",
];

/**
 * @param {string} ch
 * @param {Map<string, { color: string, fontWeight: string }>} map
 * @param {{ color: string, fontWeight: string }} style
 */
function addLetterVariant(ch, map, style) {
  if (!ch || ch.length === 0) return;
  map.set(ch, style);
  const u = ch.toLocaleUpperCase("tr-TR");
  const l = ch.toLocaleLowerCase("tr-TR");
  if (u !== ch) map.set(u, style);
  if (l !== ch) map.set(l, style);
}

/**
 * @param {string[]} letters
 * @param {string | undefined} stored — tek harf, "both" veya "none"
 * @param {Map<string, { color: string, fontWeight: string }>} map
 * @param {() => string} nextColor
 */
function applyPairHighlight(letters, stored, map, nextColor) {
  if (!letters || letters.length < 2) return;
  const [A, B] = letters;
  if (stored === "none" || stored == null || stored === "") return;
  if (stored === "both") {
    const c1 = nextColor();
    const c2 = nextColor();
    addLetterVariant(
      A,
      map,
      { color: c1, fontWeight: "600" }
    );
    addLetterVariant(
      B,
      map,
      { color: c2, fontWeight: "600" }
    );
    return;
  }
  if (stored === A || stored === B) {
    addLetterVariant(stored, map, {
      color: nextColor(),
      fontWeight: "600",
    });
  }
}

/**
 * @param {Record<string, string>} buckets — görsel / işitsel / ünlü haritası
 * @param {typeof VISUAL_GROUPS} groups
 * @param {Map<string, { color: string, fontWeight: string }>} map
 * @param {() => string} nextColor
 */
function applyBucket(buckets, groups, map, nextColor) {
  if (!buckets || typeof buckets !== "object") return;
  for (const g of groups) {
    applyPairHighlight(g.letters, buckets[g.key], map, nextColor);
  }
}

/**
 * UPP kalibrasyonundaki karışık harflere vurgu rengi (profildeki çiftlere göre).
 * @param {unknown} upp
 * @returns {Map<string, { color: string, fontWeight: string }>}
 */
export function buildLetterHighlightMap(upp) {
  /** @type {Map<string, { color: string, fontWeight: string }>} */
  const map = new Map();
  let i = 0;
  const nextColor = () => COLOR_POOL[i++ % COLOR_POOL.length];

  if (!upp || typeof upp !== "object") return map;

  const dc = /** @type {Record<string, unknown>} */ (upp).dyslexiaCalibration;
  if (dc && typeof dc === "object") {
    const o = /** @type {Record<string, Record<string, string>>} */ (dc);
    applyBucket(o.visual ?? {}, VISUAL_GROUPS, map, nextColor);
    applyBucket(o.auditory ?? {}, AUDITORY_GROUPS, map, nextColor);
    applyBucket(o.vowel ?? {}, VOWEL_GROUPS, map, nextColor);
  }

  return map;
}

/** @param {string} ch */
function escapeHtmlAttrSafe(ch) {
  return ch
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * PDF metin öğesi veya düz metin parçası — customTextRenderer / HTML için.
 * @param {string} str
 * @param {Map<string, { color: string, fontWeight: string }>} letterMap
 */
export function highlightPlainStringToInnerHtml(str, letterMap) {
  if (!str) return "";
  let out = "";
  for (const ch of str) {
    const st = letterMap.get(ch);
    if (st) {
      out += `<span style="color:${st.color};font-weight:${st.fontWeight}">${escapeHtmlAttrSafe(ch)}</span>`;
    } else {
      out += escapeHtmlAttrSafe(ch);
    }
  }
  return out;
}

/**
 * Düz metin → paragraflı HTML; yalnızca UPP’de işaretli karışık harfler renklenir (diğerleri varsayılan).
 * @param {string} text
 * @param {unknown} upp
 */
export function plainTextToUppHighlightHtml(text, upp) {
  const map = buildLetterHighlightMap(upp);
  const lines = (text ?? "").split(/\r?\n/);
  return lines
    .map((line) => {
      if (line === "") return "<p><br></p>";
      let html = "";
      for (const ch of line) {
        const st = map.get(ch);
        if (st) {
          html += `<span style="color:${st.color};font-weight:${st.fontWeight}">${escapeHtmlAttrSafe(ch)}</span>`;
        } else {
          html += escapeHtmlAttrSafe(ch);
        }
      }
      return `<p>${html}</p>`;
    })
    .join("");
}
