import { getDocument } from "pdfjs-dist";
import { classifyPdfJsError, logPdfError } from "./pdfLoadMessages.js";

/**
 * PDF’yi açılabilir mi diye worker ile doğrular (şifre / bozuk yakalama).
 * @param {ArrayBuffer} arrayBuffer
 */
export async function probePdfBuffer(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    console.error("[probePdfBuffer] Boş veya geçersiz arabellek", {
      byteLength: arrayBuffer?.byteLength,
    });
    return { ok: false, reason: /** @type {const} */ ("empty") };
  }

  const task = getDocument({ data: arrayBuffer });
  try {
    const pdf = await task.promise;
    const numPages = pdf.numPages;
    await pdf.destroy();
    return { ok: true, numPages };
  } catch (err) {
    logPdfError("probePdfBuffer", err);
    const reason = classifyPdfJsError(err);
    return { ok: false, reason };
  }
}
