/**
 * Mammoth HTML sonrası: tab ile ayrılmış içindekiler satırlarına lider noktalar,
 * tablolara sınıf (kenarlık), güvenli metin kaçışı.
 * @param {string} html
 * @returns {string}
 */
export function enhanceMammothHtmlFragment(html) {
  const trimmed = html.trim();
  if (!trimmed) return trimmed;

  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body><div id="lexi-mammoth-enhance">${trimmed}</div></body></html>`,
    "text/html"
  );
  const root = doc.getElementById("lexi-mammoth-enhance");
  if (!root) return trimmed;

  root.querySelectorAll("table").forEach((t) => {
    t.classList.add("lexi-docx-table");
  });

  root.querySelectorAll("p").forEach((p) => {
    enhanceTocLikeParagraph(p);
  });

  return root.innerHTML;
}

/**
 * @param {string} s
 */
function escapeText(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {HTMLParagraphElement} p
 */
function enhanceTocLikeParagraph(p) {
  if (p.classList.contains("lexi-toc-line")) return;

  const text = p.textContent ?? "";
  if (!text.includes("\t")) return;

  const parts = text
    .split(/\t+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 2) return;

  const last = parts[parts.length - 1];
  if (!/^\d+$/.test(last)) return;

  const title = parts.slice(0, -1).join(" ");
  if (!title) return;

  p.classList.add("lexi-toc-line");
  p.innerHTML = `<span class="lexi-toc-title">${escapeText(title)}</span><span class="lexi-toc-leader" aria-hidden="true"></span><span class="lexi-toc-page">${escapeText(last)}</span>`;
}
