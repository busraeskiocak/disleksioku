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
import {
  decodeStoredContentToPdfBytes,
  fingerprintPdfFileBytesProp,
} from "../lib/readingPdfStorage.js";

const PDF_DOC_FALLBACK_ERR =
  "PDF dosyası okunamadı, lütfen başka bir dosya deneyin";

/**
 * @param {unknown} item
 * @returns {item is { str: string, transform: number[] }}
 */
function isPdfTextRenderItem(item) {
  return (
    !!item &&
    typeof item === "object" &&
    "str" in item &&
    typeof /** @type {{ str?: unknown }} */ (item).str === "string" &&
    Array.isArray(/** @type {{ transform?: unknown }} */ (item).transform) &&
    /** @type {{ transform: number[] }} */ (item).transform.length >= 6
  );
}

/**
 * @param {{
 *   fileBytes: Uint8Array | string | null | undefined,
 *   upp: object,
 *   immersiveReading: boolean,
 *   onDocumentLoad?: (numPages: number) => void,
 *   variant?: "personalized" | "original",
 *   scale?: number,
 *   devicePixelRatio?: number,
 * }} props
 */
export default function PdfReadingWorkbench({
  fileBytes,
  upp,
  immersiveReading,
  onDocumentLoad,
  variant = "personalized",
  scale: scaleProp,
  devicePixelRatio: dprProp,
}) {
  const [numPages, setNumPages] = useState(0);
  const [docErrorText, setDocErrorText] = useState(/** @type {string | null} */ (null));
  /** @type {Record<number, import("pdfjs-dist").TextContent["items"]>} */
  const [textItemsByPage, setTextItemsByPage] = useState({});

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

  const uppOverlayTypography = useMemo(() => {
    if (isOriginal) return null;
    const typo = upp?.typography ?? {};
    const lsEm = typeof typo.letterSpacingEm === "number" ? typo.letterSpacingEm : 0.06;
    const lh = typeof typo.lineHeight === "number" ? typo.lineHeight : 1.65;
    const bg =
      upp?.background && typeof upp.background.color === "string"
        ? upp.background.color
        : "transparent";
    return { letterSpacingEm: lsEm, lineHeight: lh, backgroundColor: bg };
  }, [isOriginal, upp]);

  const fallbackScale = immersiveReading ? 1.28 : 1.06;
  const scale =
    typeof scaleProp === "number" && Number.isFinite(scaleProp) && scaleProp > 0
      ? scaleProp
      : fallbackScale;

  const devicePixelRatio = useMemo(() => {
    if (typeof dprProp === "number" && Number.isFinite(dprProp) && dprProp > 0) {
      return Math.min(2.5, Math.max(0.5, dprProp));
    }
    if (typeof window !== "undefined" && window.devicePixelRatio) {
      return Math.min(2, Math.max(1, window.devicePixelRatio));
    }
    return 1;
  }, [dprProp]);

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

  const fileBytesFingerprint = fingerprintPdfFileBytesProp(fileBytes);

  const documentFile = useMemo(() => {
    if (fileBytes == null) return null;
    /** @type {Uint8Array | null} */
    let src = null;
    if (typeof fileBytes === "string") {
      src = decodeStoredContentToPdfBytes(fileBytes);
    } else if (fileBytes instanceof Uint8Array && fileBytes.length > 0) {
      src = fileBytes;
    }
    if (!src?.length) return null;
    return new Uint8Array(src);
  }, [fileBytesFingerprint]);

  useEffect(() => {
    setDocErrorText(null);
    setNumPages(0);
    setTextItemsByPage({});
  }, [fileBytesFingerprint]);

  const pdfFileForDocument = useMemo(() => {
    if (!documentFile?.length) return null;
    return { data: documentFile };
  }, [documentFile]);

  if (!pdfFileForDocument) {
    return (
      <LoadingSpinner
        label="PDF verisi hazırlanıyor…"
        className="min-h-[140px] justify-center py-10"
      />
    );
  }

  const rootClass = isOriginal
    ? "pdf-reading-root pdf-reading-root--original w-full max-w-full space-y-4"
    : "pdf-reading-root w-full max-w-full space-y-4";

  return (
    <div className={rootClass} style={{ fontFamily: fontStack }}>
      <Document
        file={pdfFileForDocument}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={
          <LoadingSpinner label="PDF sayfaları yükleniyor…" className="py-6" />
        }
        error={docErrorText ?? PDF_DOC_FALLBACK_ERR}
      >
        {Array.from({ length: numPages }, (_, i) => {
          const pageNo = i + 1;
          const items = textItemsByPage[pageNo];
          return (
            <div
              key={`pdf-page-wrap-${pageNo}`}
              className="react-pdf__Page__outer mb-6 flex justify-center rounded-lg border border-stone-200 bg-stone-50 p-2 shadow-sm last:mb-0"
            >
              <div className="relative inline-block max-w-full">
                <Page
                  pageNumber={pageNo}
                  scale={scale}
                  devicePixelRatio={devicePixelRatio}
                  renderTextLayer
                  renderAnnotationLayer={false}
                  onGetTextSuccess={(tc) => {
                    if (!isOriginal) {
                      setTextItemsByPage((prev) => ({ ...prev, [pageNo]: tc.items }));
                    }
                  }}
                  className="shadow-md"
                  loading={
                    <LoadingSpinner
                      label={`Sayfa ${pageNo} çiziliyor…`}
                      className="min-h-[120px] justify-center py-8"
                    />
                  }
                />
                {!isOriginal && uppOverlayTypography && items?.length ? (
                  <div
                    className="pdf-reading-upp-text-overlay pointer-events-none"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      zIndex: 4,
                      fontFamily: fontStack,
                      letterSpacing: `${uppOverlayTypography.letterSpacingEm}em`,
                      lineHeight: uppOverlayTypography.lineHeight,
                      color: "#1c1917",
                      backgroundColor:
                        uppOverlayTypography.backgroundColor === "transparent"
                          ? "transparent"
                          : uppOverlayTypography.backgroundColor,
                    }}
                  >
                    {items.map((item, idx) => {
                      if (!isPdfTextRenderItem(item)) return null;
                      const [a, b, c, d, e, f] = item.transform;
                      const fontPx = Math.hypot(a, b) || 12;
                      return (
                        <span
                          key={`pdf-ov-${pageNo}-${idx}`}
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            transformOrigin: "0 0",
                            transform: `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
                            whiteSpace: "pre",
                            fontSize: `${fontPx}px`,
                            letterSpacing: "inherit",
                            lineHeight: uppOverlayTypography.lineHeight,
                          }}
                          // eslint-disable-next-line react/no-danger -- highlightPlainStringToInnerHtml kaçışlı çıktı üretir
                          dangerouslySetInnerHTML={{
                            __html: highlightPlainStringToInnerHtml(item.str, letterMap),
                          }}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </Document>
    </div>
  );
}
