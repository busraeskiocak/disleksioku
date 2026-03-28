/**
 * UPP'yi URL güvenli base64url parametresine çevirir (paylaşım bağlantısı).
 * @param {unknown} upp
 */
export function encodeUppToParam(upp) {
  const json = JSON.stringify(upp);
  const utf8 = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * ?d= parametresinden UPP geri yükler.
 * @param {string|null|undefined} param
 */
export function decodeUppFromParam(param) {
  if (param == null || param === "") return null;
  try {
    let b64 = param.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** @param {unknown} obj */
export function looksLikeUpp(obj) {
  if (obj == null || typeof obj !== "object") return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  if (
    typeof o.fontPreference !== "string" ||
    o.background == null ||
    typeof o.background !== "object"
  ) {
    return false;
  }
  if (typeof o.version === "number" && o.version >= 2) {
    return (
      o.dyslexiaCalibration != null && typeof o.dyslexiaCalibration === "object"
    );
  }
  return o.letterConfusion != null && typeof o.letterConfusion === "object";
}

/**
 * @param {string} dataToken — encodeUppToParam çıktısı
 */
export function buildPaylasimShareUrl(dataToken) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const path = base ? `${base}/paylasim` : "/paylasim";
  const url = new URL(path, origin);
  url.searchParams.set("d", dataToken);
  return url.toString();
}
