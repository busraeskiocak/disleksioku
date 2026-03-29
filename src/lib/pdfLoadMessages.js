import { PasswordResponses } from "pdfjs-dist";

/**
 * @param {unknown} err
 * @returns {"password" | "invalid" | "empty" | "unknown"}
 */
export function classifyPdfJsError(err) {
  if (err == null) return "unknown";
  const name = /** @type {{ name?: string }} */ (err).name;
  const code = /** @type {{ code?: number }} */ (err).code;

  if (name === "PasswordException") {
    if (
      code === PasswordResponses.NEED_PASSWORD ||
      code === PasswordResponses.INCORRECT_PASSWORD
    ) {
      return "password";
    }
  }
  if (name === "InvalidPDFException") return "invalid";
  return "unknown";
}

/**
 * @param {"password" | "invalid" | "empty" | "unknown"} reason
 */
export function turkishPdfUserMessage(reason) {
  if (reason === "password") {
    return "Bu PDF şifreli, açmak için şifre gerekiyor";
  }
  if (reason === "empty") {
    return "PDF verisi okunamadı.";
  }
  return "PDF dosyası okunamadı, lütfen başka bir dosya deneyin";
}

/** @param {unknown} err */
export function logPdfError(context, err) {
  console.error(`[${context}] PDF hatası`, {
    name: /** @type {Error} */ (err)?.name,
    message: /** @type {Error} */ (err)?.message,
    code: /** @type {{ code?: number }} */ (err)?.code,
    stack: /** @type {Error} */ (err)?.stack,
    err,
  });
}
