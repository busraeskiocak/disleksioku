import { stripHtmlToPlainText } from "../lib/readingText.js";
import {
  getStorageJSON,
  removeStorageItem,
  setStorageJSON,
  STORAGE_KEYS,
} from "./storage.js";

const KEY = STORAGE_KEYS.WRITING_DOCUMENTS;
/** Eski tek-belge anahtarı (writingHistory çoklu listeye taşır) */
const LEGACY_SINGLE_KEY = "lexilens_writing_document";
const MAX_ITEMS = 60;

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `wd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * İlk açılışta eski `lexilens_writing_document` kaydını listeye aktarır.
 */
function migrateLegacyIfNeeded() {
  if (typeof window === "undefined") return;
  const existing = getStorageJSON(KEY, []);
  if (Array.isArray(existing) && existing.length > 0) return;

  const legacyRaw = window.localStorage.getItem(LEGACY_SINGLE_KEY);
  if (!legacyRaw) return;
  try {
    const o = JSON.parse(legacyRaw);
    if (!o || typeof o.html !== "string") return;
    const item = {
      id: newId(),
      title:
        typeof o.title === "string" && o.title.trim()
          ? o.title.trim()
          : "Adsız belge",
      html: o.html,
      savedAt:
        typeof o.savedAt === "string" ? o.savedAt : new Date().toISOString(),
    };
    setStorageJSON(KEY, [item]);
  } catch {
    /* yok say */
  }
  removeStorageItem(LEGACY_SINGLE_KEY);
}

/**
 * @typedef {{ id: string, title: string, html: string, savedAt: string }} WritingDocument
 */

/** @returns {WritingDocument[]} */
export function getWritingDocuments() {
  migrateLegacyIfNeeded();
  const raw = getStorageJSON(KEY, []);
  if (!Array.isArray(raw)) return [];
  /** @type {WritingDocument[]} */
  const out = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    if (
      typeof x.id !== "string" ||
      typeof x.title !== "string" ||
      typeof x.html !== "string"
    ) {
      continue;
    }
    const savedAt =
      typeof x.savedAt === "string" ? x.savedAt : new Date().toISOString();
    out.push({ id: x.id, title: x.title, html: x.html, savedAt });
  }
  return out;
}

/** @param {string} id */
export function getWritingDocument(id) {
  return getWritingDocuments().find((x) => x.id === id) ?? null;
}

/** @param {string} html */
function hasMeaningfulHtml(html) {
  return stripHtmlToPlainText(html).trim().length > 0;
}

/**
 * @param {{ title: string, html: string }} entry
 * @returns {string | null} yeni belge id veya içerik boşsa null
 */
export function appendWritingDocument(entry) {
  const title = entry.title.trim() || "Adsız belge";
  const html = entry.html;
  if (!hasMeaningfulHtml(html)) return null;
  const id = newId();
  const savedAt = new Date().toISOString();
  const prev = getWritingDocuments();
  /** @type {WritingDocument} */
  const item = { id, title, html, savedAt };
  const next = [item, ...prev.filter((p) => p.id !== id)].slice(0, MAX_ITEMS);
  setStorageJSON(KEY, next);
  return id;
}

/**
 * @param {string} id
 * @param {{ title?: string, html?: string }} patch
 * @returns {boolean}
 */
export function updateWritingDocument(id, patch) {
  const list = getWritingDocuments();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  const cur = list[idx];
  const nextHtml = patch.html != null ? patch.html : cur.html;
  if (patch.html != null && !hasMeaningfulHtml(nextHtml)) return false;
  /** @type {WritingDocument} */
  const nextItem = {
    ...cur,
    title:
      patch.title != null && patch.title.trim()
        ? patch.title.trim()
        : cur.title,
    html: nextHtml,
    savedAt: new Date().toISOString(),
  };
  const rest = list.filter((x) => x.id !== id);
  setStorageJSON(KEY, [nextItem, ...rest]);
  return true;
}

/** @param {string} id */
export function removeWritingDocument(id) {
  const next = getWritingDocuments().filter((x) => x.id !== id);
  setStorageJSON(KEY, next);
}
