import { buildLetterHighlightMap } from "./uppLetterHighlights.js";

/**
 * @param {Text} textNode
 * @param {Map<string, { color: string, fontWeight: string }>} letterMap
 */
function replaceTextNodeWithHighlights(textNode, letterMap) {
  const text = textNode.nodeValue;
  if (text == null || text === "") return;

  const frag = document.createDocumentFragment();
  for (const ch of text) {
    const st = letterMap.get(ch);
    if (st) {
      const span = document.createElement("span");
      span.style.color = st.color;
      span.style.fontWeight = st.fontWeight;
      span.textContent = ch;
      frag.appendChild(span);
    } else {
      frag.appendChild(document.createTextNode(ch));
    }
  }
  textNode.parentNode?.replaceChild(frag, textNode);
}

/**
 * Mammoth HTML: yalnızca metin düğümlerinde UPP harf vurgusu; yapı ve stiller korunur.
 * @param {string} html
 * @param {unknown} upp
 */
export function applyUppHighlightsToHtmlString(html, upp) {
  const letterMap = buildLetterHighlightMap(upp);
  if (letterMap.size === 0) return html;

  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body><div id="lexi-mammoth-root">${html}</div></body></html>`,
    "text/html"
  );
  const wrap = doc.getElementById("lexi-mammoth-root");
  if (!wrap) return html;
  walkAndHighlight(wrap, letterMap);
  return wrap.innerHTML;
}

/**
 * @param {Node} node
 * @param {Map<string, { color: string, fontWeight: string }>} letterMap
 */
function walkAndHighlight(node, letterMap) {
  if (node.nodeType === Node.TEXT_NODE) {
    replaceTextNodeWithHighlights(/** @type {Text} */ (node), letterMap);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = /** @type {Element} */ (node);
  const tag = el.tagName.toLowerCase();
  if (tag === "script" || tag === "style") return;

  const children = Array.from(node.childNodes);
  for (const child of children) {
    walkAndHighlight(child, letterMap);
  }
}
