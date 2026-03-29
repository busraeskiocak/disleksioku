import { stripHtmlToPlainText } from "../lib/readingText.js";
import { isPdfStoredContent } from "../lib/readingPdfStorage.js";
import { getStorageJSON, setStorageJSON, STORAGE_KEYS } from "./storage.js";

const KEY = STORAGE_KEYS.READING_HISTORY;
const MAX_ITEMS = 60;

/**
 * @typedef {'pdf' | 'docx' | 'text'} ReadingHistoryKind
 * @typedef {{ id: string, kind: ReadingHistoryKind, title: string, content: string, createdAt: string, originalContent?: string }} ReadingHistoryItem
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
  /** @type {ReadingHistoryItem} */
  const item = {
    id: x.id,
    kind,
    title: x.title,
    content: x.content,
    createdAt: x.createdAt,
  };
  if (typeof x.originalContent === "string") {
    const o = x.originalContent.trim();
    if (o) item.originalContent = o;
  }
  return item;
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

/** @param {string} raw */
function hasTextContent(raw) {
  if (isPdfStoredContent(raw)) return raw.length > 64;
  return stripHtmlToPlainText(raw).trim().length > 0;
}

/** @param {Omit<ReadingHistoryItem, 'id' | 'createdAt'> & Partial<Pick<ReadingHistoryItem, 'id' | 'createdAt'>>} entry */
/** @returns {string | null} */
export function appendReadingHistoryEntry(entry) {
  const content = entry.content.trim();
  if (!content || !hasTextContent(content)) return null;

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
  if (typeof entry.originalContent === "string") {
    const o = entry.originalContent.trim();
    if (o) item.originalContent = o;
  }

  const prev = getReadingHistory();
  const next = [item, ...prev.filter((p) => p.id !== id)].slice(0, MAX_ITEMS);
  setStorageJSON(KEY, next);
  return id;
}

/**
 * @param {string} id
 * @param {{ title?: string, content?: string }} patch
 * @returns {boolean}
 */
export function updateReadingHistoryEntry(id, patch) {
  const list = getReadingHistory();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  const cur = list[idx];
  /** @type {ReadingHistoryItem} */
  const nextItem = { ...cur };
  if (patch.title != null) {
    const t = patch.title.trim();
    if (t) nextItem.title = t;
  }
  if (patch.content != null) {
    const c = patch.content.trim();
    if (!hasTextContent(c)) return false;
    nextItem.content = c;
  }
  const rest = list.filter((x) => x.id !== id);
  setStorageJSON(KEY, [nextItem, ...rest]);
  return true;
}

/** @param {string} id */
export function removeReadingHistoryEntry(id) {
  const next = getReadingHistory().filter((x) => x.id !== id);
  setStorageJSON(KEY, next);
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
  if (isPdfStoredContent(content)) {
    return "PDF — sayfa görüntüsü olarak açılır";
  }
  const plain = stripHtmlToPlainText(content).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  const chars = [...plain];
  return chars.slice(0, maxLen).join("") + (chars.length > maxLen ? "…" : "");
}
