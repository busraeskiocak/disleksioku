import { createElement } from "react";

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
