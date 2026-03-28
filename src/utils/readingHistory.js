import { getStorageJSON, setStorageJSON, STORAGE_KEYS } from "./storage.js";

const KEY = STORAGE_KEYS.READING_HISTORY;
const MAX_ITEMS = 60;

/**
 * @typedef {'pdf' | 'docx' | 'text'} ReadingHistoryKind
 * @typedef {{ id: string, kind: ReadingHistoryKind, title: string, content: string, createdAt: string }} ReadingHistoryItem
 */

/** Eski kayıtlar için */
const VALID_KINDS = new Set(["pdf", "docx", "text", "paste"]);

/**
 * @param {unknown} x
 * @returns {ReadingHistoryItem | null}
 */
function normalizeStoredItem(x) {
  if (
    !x ||
    typeof x !== "object" ||
    typeof x.id !== "string" ||
    typeof x.title !== "string" ||
    typeof x.content !== "string" ||
    typeof x.createdAt !== "string"
  ) {
    return null;
  }
  const k = /** @type {string} */ (x.kind);
  if (!VALID_KINDS.has(k)) return null;
  /** @type {ReadingHistoryKind} */
  const kind = k === "paste" ? "text" : /** @type {ReadingHistoryKind} */ (k);
  return {
    id: x.id,
    kind,
    title: x.title,
    content: x.content,
    createdAt: x.createdAt,
  };
}

/** @returns {ReadingHistoryItem[]} */
export function getReadingHistory() {
  const raw = getStorageJSON(KEY, []);
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const x of raw) {
    const n = normalizeStoredItem(x);
    if (n) out.push(n);
  }
  return out;
}

/** @param {Omit<ReadingHistoryItem, 'id' | 'createdAt'> & Partial<Pick<ReadingHistoryItem, 'id' | 'createdAt'>>} entry */
/** @returns {string | null} */
export function appendReadingHistoryEntry(entry) {
  const content = entry.content.trim();
  if (!content) return null;

  const id =
    entry.id ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `rh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const createdAt = entry.createdAt ?? new Date().toISOString();

  /** @type {ReadingHistoryItem} */
  const item = {
    id,
    kind: entry.kind,
    title: entry.title.trim() || "Adsız",
    content,
    createdAt,
  };

  const prev = getReadingHistory();
  const next = [item, ...prev.filter((p) => p.id !== id)].slice(0, MAX_ITEMS);
  setStorageJSON(KEY, next);
  return id;
}

/** Başlık: metnin ilk 30 grapheme’i */
export function titleFromTextSnippet(plain) {
  const t = plain.replace(/\s+/g, " ").trim();
  if (!t) return "Metin";
  const chars = [...t];
  const head = chars.slice(0, 30).join("");
  const suffix = chars.length > 30 ? "…" : "";
  return head + suffix;
}

/** Kart önizlemesi */
export function previewFromContent(content, maxLen = 100) {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  const chars = [...oneLine];
  return chars.slice(0, maxLen).join("") + (chars.length > maxLen ? "…" : "");
}
