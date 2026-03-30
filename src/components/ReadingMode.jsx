/**
 * PDF geçmiş içeriği: localStorage’da `readingPdfStorage` ile uyumlu tek metin
 * (`lexilens:pdf64:` + base64). İkili veri react-pdf/pdfjs’e orada Uint8Array olarak verilir.
 */
import { GlobalWorkerOptions } from "pdfjs-dist";
import { StrictMode, useEffect, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import WordLikeWorkbench from "./WordLikeWorkbench.jsx";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
const READING_PDF_WORKER_SRC = GlobalWorkerOptions.workerSrc;

/** @typedef {{ id: string, message: string, fileName: string }} ReadingFileLoadErrorItem */

let readingFileLoadErrors = /** @type {ReadingFileLoadErrorItem[]} */ ([]);
const readingFileLoadErrorListeners = new Set();

function subscribeReadingFileLoadErrors(cb) {
  readingFileLoadErrorListeners.add(cb);
  return () => readingFileLoadErrorListeners.delete(cb);
}

function getReadingFileLoadErrorsSnapshot() {
  return readingFileLoadErrors;
}

function emitReadingFileLoadErrors() {
  readingFileLoadErrorListeners.forEach((l) => l());
}

/**
 * Dosya yükleme hatası (PDF, DOCX, vb.): sağ altta üst üste toast.
 * @param {string} message
 * @param {string} [fileName]
 */
export function pushReadingFileLoadError(message, fileName) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `file-err-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fn =
    typeof fileName === "string" && fileName.trim() ? fileName.trim() : "—";
  readingFileLoadErrors = [
    ...readingFileLoadErrors,
    { id, message, fileName: fn },
  ];
  emitReadingFileLoadErrors();
}

/** @param {string} id */
export function dismissReadingFileLoadError(id) {
  readingFileLoadErrors = readingFileLoadErrors.filter((e) => e.id !== id);
  emitReadingFileLoadErrors();
}

/** @deprecated pushReadingFileLoadError kullanın */
export const pushReadingPdfLoadError = pushReadingFileLoadError;

/** @deprecated dismissReadingFileLoadError kullanın */
export const dismissReadingPdfLoadError = dismissReadingFileLoadError;

export function ReadingFileLoadErrorToastHost() {
  const items = useSyncExternalStore(
    subscribeReadingFileLoadErrors,
    getReadingFileLoadErrorsSnapshot,
    getReadingFileLoadErrorsSnapshot
  );
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="alert"
          className="pointer-events-auto relative rounded-xl border border-red-200 bg-red-50 py-3 pl-3 pr-10 text-sm text-red-900 shadow-lg"
        >
          <button
            type="button"
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg text-base font-light leading-none text-red-800 hover:bg-red-100"
            aria-label="Uyarıyı kapat"
            onClick={() => dismissReadingFileLoadError(item.id)}
          >
            ×
          </button>
          <p className="pr-1 font-medium leading-snug">{item.message}</p>
          <p className="mt-1.5 break-all text-xs text-red-800/90">
            {item.fileName}
          </p>
        </div>
      ))}
    </div>
  );
}

/** @deprecated ReadingFileLoadErrorToastHost kullanın */
export const ReadingPdfErrorToastHost = ReadingFileLoadErrorToastHost;

const READING_FILE_TOAST_HOST_ID = "lexi-reading-file-load-toasts";

function mountReadingFileLoadErrorToastHost() {
  if (typeof document === "undefined") return;
  if (document.getElementById(READING_FILE_TOAST_HOST_ID)) return;
  const el = document.createElement("div");
  el.id = READING_FILE_TOAST_HOST_ID;
  document.body.appendChild(el);
  createRoot(el).render(
    <StrictMode>
      <ReadingFileLoadErrorToastHost />
    </StrictMode>
  );
}

mountReadingFileLoadErrorToastHost();

/**
 * Okuma belgesi: WordLikeWorkbench + belge listesine dönüş çubuğu entegrasyonu.
 * Araç çubuğu yerleşimi ve üst boşluk WordLikeWorkbench içinde (fixed top: 0).
 */
export default function ReadingMode({ onBackToDocuments, ...props }) {
  useEffect(() => {
    GlobalWorkerOptions.workerSrc = READING_PDF_WORKER_SRC;
  }, []);

  return (
    <>
      <style>
        {`
          .pdf-reading-root:not(.pdf-reading-root--original) .react-pdf__Page__textContent.textLayer [role="presentation"] {
            opacity: 0 !important;
          }
        `}
      </style>
      <WordLikeWorkbench
        {...props}
        onNavigateBack={onBackToDocuments}
        navigateBackAriaLabel="Belgeler listesine dön"
      />
    </>
  );
}
