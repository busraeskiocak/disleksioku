/**
 * LexiLens localStorage yardımcıları (Görev 1)
 * UPP: Kullanıcı Okuma Profili (User Reading Profile) — sonraki görevlerde doldurulacak.
 */

export const STORAGE_KEYS = {
  UPP: "lexilens_upp",
};

function parseJSON(raw, fallback = null) {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** @template T */
export function getStorageJSON(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  return parseJSON(window.localStorage.getItem(key), fallback);
}

export function setStorageJSON(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageItem(key) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

/** @returns {boolean} */
export function hasStorageKey(key) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) != null;
}

/** Kayıtlı UPP var mı? */
export function hasUserProfile() {
  return hasStorageKey(STORAGE_KEYS.UPP);
}

export function getUpp() {
  return getStorageJSON(STORAGE_KEYS.UPP, null);
}

/** @param {unknown} upp */
export function setUpp(upp) {
  setStorageJSON(STORAGE_KEYS.UPP, upp);
}

export function clearUpp() {
  removeStorageItem(STORAGE_KEYS.UPP);
}
