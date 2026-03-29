import { useCallback, useEffect, useMemo, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { getWorkbenchFontStack } from "../lib/workbenchFonts.js";
import {
  buildLetterHighlightMap,
  highlightPlainStringToInnerHtml,
} from "../lib/uppLetterHighlights.js";
import {
  classifyPdfJsError,
  logPdfError,
  turkishPdfUserMessage,
} from "../lib/pdfLoadMessages.js";

const PDF_DOC_FALLBACK_ERR =
  "PDF dosyası okunamadı, lütfen başka bir dosya deneyin";

/**
 * @param {{
 *   fileBytes: Uint8Array | null,
 *   upp: object,
 *   immersiveReading: boolean,
 *   onDocumentLoad?: (numPages: number) => void,
 *   variant?: "personalized" | "original",
 * }} props
 */
export default function PdfReadingWorkbench({
  fileBytes,
  upp,
  immersiveReading,
  onDocumentLoad,
  variant = "personalized",
}) {
  const [numPages, setNumPages] = useState(0);
  const [docErrorText, setDocErrorText] = useState(/** @type {string | null} */ (null));

  const isOriginal = variant === "original";

  const letterMap = useMemo(
    () => (isOriginal ? new Map() : buildLetterHighlightMap(upp)),
    [isOriginal, upp]
  );

  const fontStack = useMemo(
    () =>
      isOriginal
        ? 'Times New Roman, Times, "Liberation Serif", serif'
        : getWorkbenchFontStack(upp?.fontPreference),
    [isOriginal, upp?.fontPreference]
  );

  const customTextRenderer = useCallback(
    (item) => highlightPlainStringToInnerHtml(item.str ?? "", letterMap),
    [letterMap]
  );

  const scale = immersiveReading ? 1.28 : 1.06;

  const onLoadSuccess = useCallback(
    (doc) => {
      setDocErrorText(null);
      const n = doc?.numPages ?? 0;
      setNumPages(n);
      if (n > 0) onDocumentLoad?.(n);
    },
    [onDocumentLoad]
  );

  const onLoadError = useCallback((pdfError) => {
    logPdfError("PdfReadingWorkbench.Document", pdfError);
    const reason = classifyPdfJsError(pdfError);
    setDocErrorText(turkishPdfUserMessage(reason));
    setNumPages(0);
  }, []);

  useEffect(() => {
    setDocErrorText(null);
    setNumPages(0);
  }, [fileBytes]);

  if (!fileBytes || fileBytes.length === 0) {
    console.error("[PdfReadingWorkbench] fileBytes boş");
    return (
      <p className="text-sm text-red-800" role="alert">
        {turkishPdfUserMessage("empty")}
      </p>
    );
  }

  const rootClass = isOriginal
    ? "pdf-reading-root pdf-reading-root--original w-full max-w-full space-y-4"
    : "pdf-reading-root w-full max-w-full space-y-4";

  return (
    <div className={rootClass} style={{ fontFamily: fontStack }}>
      <Document
        file={{ data: fileBytes }}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={
          <LoadingSpinner label="PDF sayfaları yükleniyor…" className="py-6" />
        }
        error={docErrorText ?? PDF_DOC_FALLBACK_ERR}
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div
            key={`pdf-page-wrap-${i + 1}`}
            className="mb-6 flex justify-center rounded-lg border border-stone-200 bg-stone-50 p-2 shadow-sm last:mb-0"
          >
            <Page
              pageNumber={i + 1}
              scale={scale}
              renderTextLayer
              renderAnnotationLayer={false}
              customTextRenderer={isOriginal ? undefined : customTextRenderer}
              className="shadow-md"
              loading={
                <LoadingSpinner
                  label={`Sayfa ${i + 1} çiziliyor…`}
                  className="min-h-[120px] justify-center py-8"
                />
              }
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
