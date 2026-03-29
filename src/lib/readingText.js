import { createElement } from "react";

/** @param {string} s */
export function isProbablyHtml(s) {
  return typeof s === "string" && /<\/?[a-z][\s\S]*>/i.test(s) && s.includes("<");
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * UPP renklendirmesi olmadan düz metin → <p> HTML (karşılaştırma sol paneli).
 * @param {string} text
 */
export function plainTextToNeutralParagraphHtml(text) {
  const lines = (text ?? "").split(/\r?\n/);
  return lines
    .map((line) => {
      if (line === "") return "<p><br></p>";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
}

/** b=mavi, d=kırmızı, p=turuncu, q=mor (Görev 5) */
export const READING_LETTER_COLORS = {
  b: "#1d4ed8",
  d: "#dc2626",
  p: "#ea580c",
  q: "#7c3aed",
};

/**
 * Satırı renkli harflerle React düğümleri dizisine çevirir (b,d,p,q büyük/küçük).
 * @param {string} line
 * @param {number} lineIndex
 * @returns {import('react').ReactNode[]}
 */
export function colorizeLineToParts(line, lineIndex) {
  if (line === "") return ["\u00a0"];

  /** @type {import('react').ReactNode[]} */
  const nodes = [];
  let buf = "";
  let seg = 0;

  const flush = () => {
    if (!buf) return;
    nodes.push(
      createElement("span", { key: `${lineIndex}-t-${seg++}` }, buf)
    );
    buf = "";
  };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const lower = ch.toLowerCase();
    const color = READING_LETTER_COLORS[lower];
    if (color) {
      flush();
      nodes.push(
        createElement(
          "span",
          {
            key: `${lineIndex}-c-${seg++}`,
            style: { color, fontWeight: 600 },
          },
          ch
        )
      );
    } else {
      buf += ch;
    }
  }
  flush();
  return nodes.length ? nodes : ["\u00a0"];
}

/**
 * Düz metni satır başına <p> ve b/d/p/q harf renkleriyle HTML’e çevirir (contenteditable için).
 * @param {string} text
 */
export function plainTextToColorizedHtml(text) {
  const lines = text.split(/\r?\n/);
  return lines
    .map((line) => {
      if (line === "") return "<p><br></p>";
      let html = "";
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const lower = ch.toLowerCase();
        const color = READING_LETTER_COLORS[lower];
        if (color) {
          html += `<span style="color:${color};font-weight:600">${escapeHtml(ch)}</span>`;
        } else {
          html += escapeHtml(ch);
        }
      }
      return `<p>${html}</p>`;
    })
    .join("");
}

/**
 * @param {string} html
 */
export function stripHtmlToPlainText(html) {
  if (!html || typeof html !== "string") return "";
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent ?? "";
  }
  return html.replace(/<[^>]+>/g, " ");
}
