/** Okuma geçmişinde PDF ikili verisini saklamak için metin öne eki (base64) */

export const PDF_STORE_PREFIX = "lexilens:pdf64:";

/**
 * @param {string | null | undefined} s
 */
export function isPdfStoredContent(s) {
  return typeof s === "string" && s.startsWith(PDF_STORE_PREFIX);
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string | null}
 */
export function encodePdfArrayBufferToStoredContent(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    console.error("[readingPdfStorage] PDF arabelleği boş");
    return null;
  }
  try {
    const bytes = new Uint8Array(arrayBuffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    return PDF_STORE_PREFIX + b64;
  } catch (e) {
    console.error("[readingPdfStorage] Base64 kodlama hatası", e);
    return null;
  }
}

/**
 * @param {string} content
 * @returns {Uint8Array | null}
 */
export function decodeStoredContentToPdfBytes(content) {
  if (!isPdfStoredContent(content)) return null;
  const b64 = content.slice(PDF_STORE_PREFIX.length);
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}
