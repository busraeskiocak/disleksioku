/** Okuma geçmişinde PDF ikili verisini saklamak için metin öne eki (base64) */

export const PDF_STORE_PREFIX = "lexilens:pdf64:";

/**
 * localStorage/JSON sonrası: UTF-8 string (önek + standart base64), binary ArrayBuffer değil.
 * pdfjs.getDocument({ data }) için veri her zaman Uint8Array olmalı; base64 ise önce atob ile çözülür.
 *
 * @param {string | null | undefined} content
 * @returns {string}
 */
export function normalizeStoredPdfContentString(content) {
  if (typeof content !== "string") return "";
  let s = content.trim();
  if (s.length > 0 && s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s;
}

/**
 * @param {string} b64
 */
function normalizePdfBase64Payload(b64) {
  let s = b64.replace(/\s+/g, "");
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (s.length % 4)) % 4;
  return s + "=".repeat(pad);
}

/**
 * @param {string | null | undefined} s
 */
export function isPdfStoredContent(s) {
  return typeof s === "string" && s.startsWith(PDF_STORE_PREFIX);
}

/**
 * @param {Blob} blob
 * @returns {Promise<ArrayBuffer>}
 */
export function readBlobAsArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) resolve(result);
      else {
        console.error("[readingPdfStorage] FileReader beklenmeyen sonuç türü", {
          resultType: typeof result,
        });
        reject(new Error("FileReader beklenmeyen sonuç"));
      }
    };
    reader.onerror = () => {
      const err = reader.error;
      console.error("[readingPdfStorage] FileReader hatası", { error: err });
      reject(err ?? new Error("FileReader hatası"));
    };
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * @param {ArrayBuffer | ArrayBufferView} input
 * @returns {Uint8Array | null}
 */
function normalizePdfInputToUint8(input) {
  if (input instanceof ArrayBuffer) {
    if (input.byteLength === 0) return null;
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    const view = input;
    const len = view.byteLength;
    if (len === 0) return null;
    return new Uint8Array(view.buffer, view.byteOffset, len);
  }
  return null;
}

/**
 * @param {Uint8Array} bytes
 */
function uint8ToBase64(bytes) {
  const chunk = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    bin += String.fromCharCode.apply(null, sub);
  }
  return btoa(bin);
}

/**
 * @param {ArrayBuffer | ArrayBufferView | null | undefined} input
 * @returns {string | null}
 */
export function encodePdfArrayBufferToStoredContent(input) {
  const bytes = normalizePdfInputToUint8(input);
  if (!bytes) {
    console.error("[readingPdfStorage] PDF arabelleği boş veya geçersiz", {
      hasValue: input != null,
      byteLength:
        input && typeof input.byteLength === "number"
          ? input.byteLength
          : undefined,
    });
    return null;
  }
  try {
    const b64 = uint8ToBase64(bytes);
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
  const normalized = normalizeStoredPdfContentString(content);
  if (!isPdfStoredContent(normalized)) return null;
  const b64Raw = normalized.slice(PDF_STORE_PREFIX.length);
  const b64 = normalizePdfBase64Payload(b64Raw);
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("[readingPdfStorage] Base64 çözümleme hatası", {
      payloadLen: b64Raw.length,
      err: e,
    });
    return null;
  }
}

/**
 * PdfReadingWorkbench için prop kararlılığı: aynı içerikte aynı parmak izi (useMemo bağımlılığı).
 * @param {string | Uint8Array | null | undefined} input
 */
export function fingerprintPdfFileBytesProp(input) {
  if (input == null) return "∅";
  if (typeof input === "string") {
    const t = normalizeStoredPdfContentString(input);
    const n = t.length;
    if (n === 0) return "s:0";
    let h = 2166136261 >>> 0;
    const lim = Math.min(n, 4096);
    for (let i = 0; i < lim; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
    h = Math.imul(h ^ n, 16777619);
    return `s:${n}:${h >>> 0}`;
  }
  if (input instanceof Uint8Array) {
    const n = input.length;
    if (n === 0) return "u:0";
    let h = 2166136261 >>> 0;
    const step = Math.max(1, Math.floor(n / 256));
    for (let i = 0; i < n; i += step) h = Math.imul(h ^ input[i], 16777619);
    h = Math.imul(h ^ n, 16777619);
    return `u:${n}:${h >>> 0}`;
  }
  return "?";
}

/**
 * Ham PDF baytlarını ref’te tutar; pdf.js worker’ı her yüklemede veriyi elinden alabileceği için
 * getDocument’a yalnızca her seferinde yeni bir Uint8Array dilimi verilir (ana tampon saklı kalır).
 * @returns {(rawContent: string) => Uint8Array | null}
 */
export function createPdfStoredContentSliceReader() {
  let cachedRaw = "";
  /** @type {Uint8Array | null} */
  let cachedBase = null;
  return (rawContent) => {
    const normalized = normalizeStoredPdfContentString(rawContent);
    if (cachedRaw !== normalized) {
      cachedRaw = normalized;
      cachedBase = decodeStoredContentToPdfBytes(normalized);
    }
    if (!cachedBase || cachedBase.byteLength === 0) {
      cachedBase = decodeStoredContentToPdfBytes(normalized);
    }
    if (!cachedBase || cachedBase.byteLength === 0) return null;
    return cachedBase.slice(0);
  };
}
