import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { canBrowserGoBack } from "../utils/historyNav.js";
import {
  isProbablyHtml,
  plainTextToNeutralParagraphHtml,
  stripHtmlToPlainText,
} from "../lib/readingText.js";
import {
  createPdfStoredContentSliceReader,
  isPdfStoredContent,
} from "../lib/readingPdfStorage.js";
import { plainTextToUppHighlightHtml } from "../lib/uppLetterHighlights.js";
import {
  updateReadingHistoryEntry,
} from "../utils/readingHistory.js";
import {
  appendWritingDocument,
  updateWritingDocument,
} from "../utils/writingHistory.js";
import PdfReadingWorkbench from "./PdfReadingWorkbench.jsx";
import {
  applyTurkishSpellMarks,
  getCaretTextOffset,
  loadTurkishSpell,
  setCaretTextOffset,
  unwrapTurkishSpellMarks,
} from "../lib/turkishSpell.js";

const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32];

/** Araç çubuğu fontları (UPP id’leri ile uyumlu: opendyslexic, arial, comic-sans) */
const WORKBENCH_FONT_OPTIONS = [
  {
    id: "opendyslexic",
    label: "OpenDyslexic",
    fontFamily: '"OpenDyslexic", "Segoe UI", sans-serif',
  },
  {
    id: "arial",
    label: "Arial",
    fontFamily: 'Arial, Helvetica, "Segoe UI", sans-serif',
  },
  {
    id: "comic-sans",
    label: "Comic Sans",
    fontFamily: '"Comic Sans MS", "Comic Sans", "Segoe UI", cursive',
  },
  {
    id: "times-new-roman",
    label: "Times New Roman",
    fontFamily: '"Times New Roman", Times, "Liberation Serif", serif',
  },
  {
    id: "verdana",
    label: "Verdana",
    fontFamily: 'Verdana, Geneva, "Segoe UI", sans-serif',
  },
];

function IconAlignLeft({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 5h16v2H4V5zm0 4h10v2H4V9zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" />
    </svg>
  );
}

function IconAlignCenter({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 5h16v2H4V5zm3 4h10v2H7V9zm-3 4h16v2H4v-2zm3 4h10v2H7v-2z" />
    </svg>
  );
}

function IconAlignRight({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 5h16v2H4V5zm6 4h10v2H10V9zm-6 4h16v2H4v-2zm6 4h10v2H10v-2z" />
    </svg>
  );
}

function IconAlignJustify({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 5h16v2H4V5zm0 4h16v2H4V9zm0 4h16v2H4v-2zm0 4h16v2H4v-2z" />
    </svg>
  );
}

const A4_MM_W = 210;
const A4_MM_H = 297;
/** Word benzeri: üst/alt 20mm, sol/sağ 25mm */
const PAGE_MARGIN_TOP_MM = 20;
const PAGE_MARGIN_BOTTOM_MM = 20;
const PAGE_MARGIN_LR_MM = 25;
/** Sayfalar arası gri boşluk (px), en az 20 */
const PAGE_GAP_PX = 24;

function mm(n) {
  return `${n}mm`;
}

/** mm → px (96dpi) */
function mmToPx(mmVal) {
  return (mmVal / 25.4) * 96;
}

/** Bir A4 sayfasının dikey boyutu (px) */
const PAGE_SHEET_H_PX = mmToPx(A4_MM_H);
/** Yazı alanı yüksekliği: 297 − 40 mm */
const PAGE_INNER_H_PX = Math.round(
  mmToPx(A4_MM_H - PAGE_MARGIN_TOP_MM - PAGE_MARGIN_BOTTOM_MM)
);
/** Üstte sayfa üstü + altta sayfa altı + Gri aralık (maske/transisyon bölgesi) */
const PAGE_INTER_BREAK_PX = Math.round(
  PAGE_SHEET_H_PX + PAGE_GAP_PX - PAGE_INNER_H_PX
);
/** Bir sonraki sayfanın üst kenarına kadar (sayfa + gri boşluk) */
const PAGE_STACK_STRIDE_PX = PAGE_SHEET_H_PX + PAGE_GAP_PX;

/** İçerik kutusu genişliği: 210 − 50 mm (px) */
const PAGE_INNER_W_PX = mmToPx(A4_MM_W - 2 * PAGE_MARGIN_LR_MM);

/** Belge yakınlaştırma: %50–%200, varsayılan %100 */
const DOC_ZOOM_MIN = 0.5;
const DOC_ZOOM_MAX = 2;
const DOC_ZOOM_DEFAULT = 1;
const DOC_ZOOM_STEP = 0.05;

/**
 * Okuma yakınlaştırması (HTML karşılaştırma): sayfa kağıdı ve iç alan px cinsinden; font/transform yok.
 * @param {number} zoom
 */
function readingPageLayoutPx(zoom) {
  const z = Math.min(
    DOC_ZOOM_MAX,
    Math.max(DOC_ZOOM_MIN, Number.isFinite(zoom) ? zoom : DOC_ZOOM_DEFAULT)
  );
  const sheetW = mmToPx(A4_MM_W) * z;
  const sheetH = PAGE_SHEET_H_PX * z;
  const gapPx = PAGE_GAP_PX * z;
  const innerW = PAGE_INNER_W_PX * z;
  const innerH = PAGE_INNER_H_PX * z;
  const padTop = mmToPx(PAGE_MARGIN_TOP_MM) * z;
  const padLR = mmToPx(PAGE_MARGIN_LR_MM) * z;
  const stackStride = sheetH + gapPx;
  const interBreak = sheetH + gapPx - innerH;
  return {
    z,
    sheetW,
    sheetH,
    gapPx,
    innerW,
    innerH,
    padTop,
    padLR,
    stackStride,
    interBreak,
  };
}

/**
 * Karşılaştırma HTML: yalnızca sayfa/kutu genişliği zoom ile çarpılır.
 * Dikey ölçüler ve mm tabanlı iç boşluklar sabit kalır (yazı boyutu zoom’dan etkilenmez).
 * @param {number} zoom
 */
function readingComparePanelLayoutPx(zoom) {
  const z = Math.min(
    DOC_ZOOM_MAX,
    Math.max(DOC_ZOOM_MIN, Number.isFinite(zoom) ? zoom : DOC_ZOOM_DEFAULT)
  );
  const sheetW = mmToPx(A4_MM_W) * z;
  const innerW = PAGE_INNER_W_PX * z;
  const sheetH = PAGE_SHEET_H_PX;
  const gapPx = PAGE_GAP_PX;
  const innerH = PAGE_INNER_H_PX;
  const padTop = mmToPx(PAGE_MARGIN_TOP_MM);
  const padLR = mmToPx(PAGE_MARGIN_LR_MM);
  const stackStride = sheetH + gapPx;
  const interBreak = sheetH + gapPx - innerH;
  return {
    z,
    sheetW,
    sheetH,
    gapPx,
    innerW,
    innerH,
    padTop,
    padLR,
    stackStride,
    interBreak,
  };
}

/** Karşılaştırma HTML: iki sütun için aynı sayfa kutusu / padding hesabı */
function readingComparePageChrome(layout) {
  const w = `${layout.sheetW}px`;
  return {
    sheetOuter: { width: w },
    pageRoot: { width: w },
    contentPad: { padding: `${layout.padTop}px ${layout.padLR}px` },
  };
}

/**
 * @param {ReturnType<typeof readingPageLayoutPx>} layout
 * @param {Record<string, string | number>} extraStyle
 */
function readingCompareEditorSurfaceStyles(layout, _pageCount, extraStyle) {
  return {
    ...extraStyle,
    maxWidth: `${layout.innerW}px`,
    marginLeft: "auto",
    marginRight: "auto",
  };
}

/** Karşılaştırma sol paneli — referans tipografi */
const COMPARE_REF_FONT_FAMILY =
  'Times New Roman, Times, "Liberation Serif", serif';

/** Kişiselleştirilmiş sütun kök fontu: orijinal ~16px tabanın bu oranı (yakınlaştırma fontu değiştirmez) */
const COMPARE_PERSONALIZED_FONT_TO_ORIGINAL = 0.85;

/** Alt çubuk sayfa göstergesi — kaydırma %'si ile */
function pageIndexFromScrollRatio(scrollEl, totalPages) {
  if (!scrollEl || totalPages < 1) return 1;
  const max = scrollEl.scrollHeight - scrollEl.clientHeight;
  if (max <= 0) return 1;
  const r = Math.min(1, Math.max(0, scrollEl.scrollTop / max));
  return Math.min(totalPages, Math.max(1, 1 + Math.floor(r * (totalPages - 1))));
}

function clearLexiPageNudgeMarks(root) {
  if (!root) return;
  root.querySelectorAll("[data-lexi-page-nudge]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.marginTop = "";
    node.style.removeProperty("margin-top");
    delete node.dataset.lexiPageNudge;
  });
}

/**
 * Düğmelerde odak kaybını önlemek için; select/option üzerinde çağrılmamalı —
 * preventDefault açılır listeyi ve seçimi bozar.
 * @param {import('react').MouseEvent} e
 */
function keepEditorSelection(e) {
  const t = e.target;
  if (t instanceof Element) {
    if (t.closest("select")) return;
  }
  e.preventDefault();
}

/** @param {{ zoom: number, children: import("react").ReactNode, className?: string }} p */
function ReadingZoomWrap({ zoom, children, className = "" }) {
  const z = Math.min(
    DOC_ZOOM_MAX,
    Math.max(DOC_ZOOM_MIN, Number.isFinite(zoom) ? zoom : DOC_ZOOM_DEFAULT)
  );
  return (
    <div
      className={`lexi-reading-zoom-outer ${className}`.trim()}
      style={{ "--lexi-read-zoom": String(z) }}
    >
      <div className="lexi-reading-zoom-inner">{children}</div>
    </div>
  );
}

/** @param {{ label: string, value: number, onChange: (n: number) => void, id: string, variant?: "panel" | "footer" }} p */
function ReadingZoomSlider({ label, value, onChange, id, variant = "panel" }) {
  const v = Math.min(
    DOC_ZOOM_MAX,
    Math.max(DOC_ZOOM_MIN, Number.isFinite(value) ? value : DOC_ZOOM_DEFAULT)
  );
  const footer = variant === "footer";
  const pct = `%${Math.round(v * 100)}`;
  return (
    <label
      htmlFor={id}
      className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${
        footer ? "max-w-[10.5rem] sm:max-w-[13rem] md:max-w-[14rem]" : "flex-1"
      }`}
    >
      <span
        className={`shrink-0 text-[10px] font-semibold sm:text-xs ${
          footer ? "text-stone-300" : "text-stone-700"
        }`}
      >
        {label}
      </span>
      <input
        id={id}
        type="range"
        min={DOC_ZOOM_MIN}
        max={DOC_ZOOM_MAX}
        step={DOC_ZOOM_STEP}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-2 min-w-[52px] shrink ${
          footer ? "flex-1 accent-emerald-400" : "min-w-0 flex-1 accent-emerald-700"
        }`}
        aria-valuemin={DOC_ZOOM_MIN}
        aria-valuemax={DOC_ZOOM_MAX}
        aria-valuenow={v}
      />
      <span
        className={`w-9 shrink-0 text-right text-[10px] tabular-nums sm:w-10 sm:text-xs ${
          footer ? "text-stone-100" : "text-stone-800"
        }`}
      >
        {pct}
      </span>
    </label>
  );
}

function UndoIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
      />
    </svg>
  );
}

function IconBookOpen({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 3-2.292A8.967 8.967 0 0 1 18 3.75v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292"
      />
    </svg>
  );
}

const LEXI_EMBED_TOP_CHROME = "lexi-embed-top-chrome";

function UserProfileIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

function IconArrowLeft({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
      />
    </svg>
  );
}

/** DOM: el.contains(el) false döner; seçim kökü editörün kendisi olabiliyor. */
function rangeAnchorsInsideEditor(editor, range) {
  if (!editor || !range) return false;
  const n = range.commonAncestorContainer;
  return n === editor || editor.contains(n);
}

/**
 * Seçili metne veya imlece inline stil uygular (execCommand yerine).
 * @param {HTMLElement | null} editor
 * @param {Record<string, string>} style
 */
function applyInlineStyleInEditor(editor, style) {
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!rangeAnchorsInsideEditor(editor, range)) return;

  if (range.collapsed) {
    const span = document.createElement("span");
    Object.assign(span.style, style);
    const z = document.createTextNode("\u200b");
    span.appendChild(z);
    range.insertNode(span);
    const nr = document.createRange();
    nr.setStart(z, 1);
    nr.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nr);
    return;
  }

  const span = document.createElement("span");
  Object.assign(span.style, style);
  try {
    range.surroundContents(span);
  } catch {
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    } catch {
      return;
    }
  }
  sel.removeAllRanges();
  const nr = document.createRange();
  nr.selectNodeContents(span);
  nr.collapse(false);
  sel.addRange(nr);
}

/**
 * @param {{
 *   upp: object,
 *   mode: 'reading' | 'writing',
 *   initialTitle: string,
 *   initialBody: string,
 *   colorizePlainOnLoad: boolean,
 *   readingDocKind?: 'pdf',
 *   compareOriginalBody?: string | null,
 *   documentId?: string | null,
 *   onReadingSaved?: () => void,
 *   writingDocumentId?: string | null,
 *   onWritingDocumentCommitted?: (id: string) => void,
 *   onNavigateBack?: () => void,
 *   navigateBackAriaLabel?: string,
 * }} props
 */
export default function WordLikeWorkbench({
  upp,
  mode,
  initialTitle,
  initialBody,
  colorizePlainOnLoad,
  readingDocKind = undefined,
  compareOriginalBody = null,
  documentId = null,
  onReadingSaved,
  writingDocumentId = null,
  onWritingDocumentCommitted,
  onNavigateBack,
  navigateBackAriaLabel = "Geri",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const onProfilePath = location.pathname === "/profil";

  const handleToolbarProfileClick = useCallback(() => {
    if (onProfilePath) {
      if (canBrowserGoBack()) navigate(-1);
      else navigate("/");
    } else {
      navigate("/profil");
    }
  }, [navigate, onProfilePath]);

  const editorRef = useRef(null);
  /** Karşılaştırma layout'u editörü yeniden mount ettiğinde kişiselleştirilmiş HTML korunur */
  const personalizedHtmlRef = useRef("");
  const scrollAreaRef = useRef(null);
  /** Karşılaştırma sol metin kökü (yükseklik / sayfa sayımı) */
  const compareOriginalContentRef = useRef(null);
  /** Karşılaştırma: sol panel dikey/yatay kaydırma */
  const compareOriginalScrollRef = useRef(null);
  /** Sabit araç çubuğu yüksekliği → kök paddingTop */
  const toolbarRef = useRef(null);
  /** Araç çubuğuna tıklanınca kaybolan seçimi geri yüklemek için */
  const savedRangeRef = useRef(null);
  const spellRef = useRef(null);
  const spellDebounceRef = useRef(0);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [saveFlash, setSaveFlash] = useState(false);
  const [fmtBold, setFmtBold] = useState(false);
  const [fmtItalic, setFmtItalic] = useState(false);
  const [fmtUnderline, setFmtUnderline] = useState(false);

  const [toolbarFontId, setToolbarFontId] = useState("opendyslexic");
  const [fontSizePx, setFontSizePx] = useState(16);
  const [letterSpacingPx, setLetterSpacingPx] = useState(0);
  const [paragraphGapPx, setParagraphGapPx] = useState(6);
  const [textAlign, setTextAlign] = useState(
    /** @type {"left" | "center" | "right" | "justify"} */ ("left")
  );
  const [immersiveReading, setImmersiveReading] = useState(false);
  const [toolbarInsetPx, setToolbarInsetPx] = useState(56);
  const [compareSplit, setCompareSplit] = useState(false);
  /** Karşılaştır toggle'ında useLayoutEffect'in yalnızca gerçek geçişte çalışması için */
  const prevCompareSplitRef = useRef(compareSplit);
  const [pdfPageTotal, setPdfPageTotal] = useState(1);
  const [readingZoomSingle, setReadingZoomSingle] = useState(DOC_ZOOM_DEFAULT);
  const [readingZoomCompareLeft, setReadingZoomCompareLeft] =
    useState(DOC_ZOOM_DEFAULT);
  const [readingZoomCompareRight, setReadingZoomCompareRight] =
    useState(DOC_ZOOM_DEFAULT);
  const [writingZoom, setWritingZoom] = useState(DOC_ZOOM_DEFAULT);
  const [compareOriginalPageCount, setCompareOriginalPageCount] = useState(1);
  const [currentPageCompareLeft, setCurrentPageCompareLeft] = useState(1);
  const [footerHxSingle, setFooterHxSingle] = useState({ x: 0, max: 0 });
  const [footerHxCmpLeft, setFooterHxCmpLeft] = useState({ x: 0, max: 0 });
  const [footerHxCmpRight, setFooterHxCmpRight] = useState({ x: 0, max: 0 });
  const [cmpVxLeft, setCmpVxLeft] = useState({ top: 0, max: 0 });
  const [cmpVxRight, setCmpVxRight] = useState({ top: 0, max: 0 });

  const isPdfReading = mode === "reading" && readingDocKind === "pdf";
  const readPdfSliceForDocument = useRef(
    createPdfStoredContentSliceReader()
  ).current;
  const pdfFileBytes = !isPdfReading
    ? null
    : readPdfSliceForDocument(initialBody ?? "");

  /** DOCX/mammoth HTML: kök font-size uygulanmaz, yapı korunur */
  const isRichReadingHtml = useMemo(
    () =>
      mode === "reading" &&
      typeof initialBody === "string" &&
      !isPdfStoredContent(initialBody) &&
      isProbablyHtml(initialBody),
    [mode, initialBody]
  );

  const compareOriginalSource = useMemo(() => {
    const trimmed = compareOriginalBody?.trim();
    if (trimmed) return trimmed;
    if (
      mode !== "reading" ||
      isPdfReading ||
      !initialBody?.trim() ||
      isPdfStoredContent(initialBody)
    ) {
      return null;
    }
    if (!isProbablyHtml(initialBody)) return initialBody.trim();
    return null;
  }, [compareOriginalBody, mode, isPdfReading, initialBody]);

  const effectiveOriginal = useMemo(() => {
    if (!compareOriginalSource) return null;
    if (isProbablyHtml(compareOriginalSource)) {
      return { kind: /** @type {const} */ ("html"), html: compareOriginalSource };
    }
    return {
      kind: /** @type {const} */ ("plain"),
      text: compareOriginalSource,
    };
  }, [compareOriginalSource]);

  const compareLeftMarkup = useMemo(() => {
    if (!effectiveOriginal) return "<p><br></p>";
    if (effectiveOriginal.kind === "html") return effectiveOriginal.html;
    return plainTextToNeutralParagraphHtml(effectiveOriginal.text);
  }, [effectiveOriginal]);

  const canCompare =
    mode === "reading" &&
    !immersiveReading &&
    (isPdfReading || Boolean(effectiveOriginal));

  useEffect(() => {
    setPdfPageTotal(1);
  }, [readingDocKind, initialBody, documentId]);

  useEffect(() => {
    personalizedHtmlRef.current = "";
    prevCompareSplitRef.current = false;
    setCompareSplit(false);
    setReadingZoomSingle(DOC_ZOOM_DEFAULT);
    setReadingZoomCompareLeft(DOC_ZOOM_DEFAULT);
    setReadingZoomCompareRight(DOC_ZOOM_DEFAULT);
    setCurrentPageCompareLeft(1);
  }, [documentId, readingDocKind]);

  const pdfScaleSingle = readingZoomSingle;

  useEffect(() => {
    if (typeof onNavigateBack !== "function") return undefined;
    window.dispatchEvent(
      new CustomEvent(LEXI_EMBED_TOP_CHROME, { detail: { embedded: true } })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent(LEXI_EMBED_TOP_CHROME, { detail: { embedded: false } })
      );
    };
  }, [onNavigateBack]);

  useLayoutEffect(() => {
    if (immersiveReading) return undefined;
    const el = toolbarRef.current;
    if (!el) return undefined;
    const measure = () =>
      setToolbarInsetPx(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [immersiveReading, onNavigateBack]);

  const uppBackgroundColor =
    upp?.background && typeof upp.background.color === "string"
      ? upp.background.color
      : "#FFF8E7";

  const htmlCompareLayoutLeft = useMemo(
    () => readingComparePanelLayoutPx(DOC_ZOOM_DEFAULT),
    []
  );
  const htmlCompareLayoutRight = useMemo(
    () => readingComparePanelLayoutPx(DOC_ZOOM_DEFAULT),
    []
  );

  const applyUppTypography = useCallback(() => {
    const el = editorRef.current;
    if (!el || !upp) return;
    if (isRichReadingHtml) {
      el.style.removeProperty("line-height");
      return;
    }
    const typo = upp.typography ?? {};
    el.style.lineHeight = String(
      typeof typo.lineHeight === "number" ? typo.lineHeight : 1.65
    );
  }, [upp, isRichReadingHtml]);

  useEffect(() => {
    if (!upp) return;
    const pref = upp.fontPreference ?? "opendyslexic";
    const known = WORKBENCH_FONT_OPTIONS.some((f) => f.id === pref);
    setToolbarFontId(known ? pref : "opendyslexic");
    const em = upp.typography?.letterSpacingEm;
    const px =
      typeof em === "number"
        ? Math.min(10, Math.max(0, Math.round(em * 16)))
        : 0;
    setLetterSpacingPx(px);
  }, [upp]);

  const applyToolbarDocumentStyles = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const font =
      WORKBENCH_FONT_OPTIONS.find((f) => f.id === toolbarFontId) ??
      WORKBENCH_FONT_OPTIONS[0];
    el.style.fontFamily = font.fontFamily;
    el.style.letterSpacing = `${letterSpacingPx}px`;
    el.style.setProperty("--lexi-para-gap", `${paragraphGapPx}px`);

    if (isRichReadingHtml) {
      el.style.removeProperty("font-size");
      el.style.removeProperty("text-align");
    } else {
      el.style.fontSize = `${fontSizePx}px`;
      el.style.textAlign = textAlign;
    }
  }, [
    toolbarFontId,
    fontSizePx,
    letterSpacingPx,
    textAlign,
    paragraphGapPx,
    isRichReadingHtml,
  ]);

  const syncStats = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const plain = stripHtmlToPlainText(el.innerHTML);
    const words = plain.trim()
      ? plain.trim().split(/\s+/).filter(Boolean).length
      : 0;
    setWordCount(words);
    setCharCount(plain.length);
    const contentH = el.scrollHeight;
    const innerHUnit = PAGE_INNER_H_PX;
    const rawPages = Math.ceil(
      (Number.isFinite(contentH) ? contentH : 0) / innerHUnit
    );
    const pages = Math.min(500, Math.max(1, rawPages));
    setPageCount(pages);
    if (mode === "reading" && !isPdfReading) {
      personalizedHtmlRef.current = el.innerHTML;
    }
  }, [mode, isPdfReading, compareSplit]);

  const runTurkishSpell = useCallback(() => {
    const ed = editorRef.current;
    const sp = spellRef.current;
    if (!ed || !sp) return;
    try {
      const pos = getCaretTextOffset(ed);
      applyTurkishSpellMarks(ed, sp);
      if (pos !== null) {
        ed.focus({ preventScroll: true });
        setCaretTextOffset(ed, pos);
      }
    } catch {
      /* DOM / sözlük */
    }
    syncStats();
  }, [syncStats]);

  const scheduleTurkishSpell = useCallback(() => {
    window.clearTimeout(spellDebounceRef.current);
    spellDebounceRef.current = window.setTimeout(runTurkishSpell, 400);
  }, [runTurkishSpell]);

  useEffect(() => {
    if (immersiveReading) return;
    applyToolbarDocumentStyles();
    syncStats();
    scheduleTurkishSpell();
  }, [
    immersiveReading,
    applyToolbarDocumentStyles,
    syncStats,
    scheduleTurkishSpell,
  ]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || !upp) return;
    if (!immersiveReading) {
      applyToolbarDocumentStyles();
      queueMicrotask(() => runTurkishSpell());
      return;
    }
    unwrapTurkishSpellMarks(el);
    const typo = upp.typography ?? {};
    const pref = upp.fontPreference ?? "opendyslexic";
    const fontOpt =
      WORKBENCH_FONT_OPTIONS.find((f) => f.id === pref) ??
      WORKBENCH_FONT_OPTIONS[0];
    el.style.fontFamily = fontOpt.fontFamily;
    el.style.letterSpacing = `${typeof typo.letterSpacingEm === "number" ? typo.letterSpacingEm : 0.06}em`;
    el.style.setProperty(
      "--lexi-para-gap",
      `${Math.min(28, Math.round(10 + (typo.lineHeight ?? 1.65) * 10))}px`
    );
    if (isRichReadingHtml) {
      el.style.removeProperty("font-size");
      el.style.removeProperty("line-height");
      el.style.removeProperty("text-align");
      el.style.removeProperty("color");
    } else {
      el.style.fontSize = "clamp(1.125rem, 2.75vw, 1.875rem)";
      el.style.lineHeight = String(
        typeof typo.lineHeight === "number" ? typo.lineHeight : 1.65
      );
      el.style.textAlign = "left";
      el.style.color = "#1c1917";
    }
    syncStats();
  }, [
    immersiveReading,
    upp,
    applyToolbarDocumentStyles,
    runTurkishSpell,
    syncStats,
    isRichReadingHtml,
  ]);

  const refreshFormatState = useCallback(() => {
    const ed = editorRef.current;
    if (typeof document === "undefined" || !document.queryCommandState || !ed) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    try {
      const r = sel.getRangeAt(0);
      if (!rangeAnchorsInsideEditor(ed, r)) return;
      setFmtBold(document.queryCommandState("bold"));
      setFmtItalic(document.queryCommandState("italic"));
      setFmtUnderline(document.queryCommandState("underline"));
    } catch {
      /* ignore */
    }
  }, []);

  const rememberSelectionInEditor = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    try {
      const r = sel.getRangeAt(0);
      if (rangeAnchorsInsideEditor(ed, r)) {
        savedRangeRef.current = r.cloneRange();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const restoreEditorSelection = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (document.activeElement instanceof HTMLSelectElement) {
      document.activeElement.blur();
    }
    ed.focus({ preventScroll: true });
    const saved = savedRangeRef.current;
    if (saved) {
      try {
        const clone = saved.cloneRange();
        if (
          rangeAnchorsInsideEditor(ed, clone) &&
          document.contains(clone.startContainer) &&
          document.contains(clone.endContainer)
        ) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(clone);
          return;
        }
      } catch {
        /* yedek */
      }
    }
    try {
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(ed);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isPdfReading) return;
    const el = editorRef.current;
    if (!el) return;
    if (colorizePlainOnLoad && mode === "reading") {
      el.innerHTML = plainTextToUppHighlightHtml(initialBody || "", upp);
    } else if (isProbablyHtml(initialBody)) {
      el.innerHTML = initialBody || "<p><br></p>";
    } else if (initialBody?.trim()) {
      el.innerHTML = plainTextToUppHighlightHtml(initialBody, upp);
    } else {
      el.innerHTML = "<p><br></p>";
    }
    personalizedHtmlRef.current = el.innerHTML;
    applyUppTypography();
    syncStats();
    queueMicrotask(() => runTurkishSpell());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca belge gövdesi
  }, [
    initialBody,
    colorizePlainOnLoad,
    mode,
    isPdfReading,
    runTurkishSpell,
    upp,
  ]);

  useLayoutEffect(() => {
    if (isPdfReading || mode !== "reading") {
      prevCompareSplitRef.current = compareSplit;
      return;
    }
    if (prevCompareSplitRef.current === compareSplit) return;
    prevCompareSplitRef.current = compareSplit;

    const el = editorRef.current;
    if (!el || !upp) return;

    /**
     * Karşılaştırma layout'una geçince editorRef yeni bir düğüme bağlanır; innerHTML boş
     * olur. İçeriği her zaman ref / initialBody üzerinden yeniden kur.
     */
    if (compareSplit) {
      if (isProbablyHtml(initialBody)) {
        const snap = personalizedHtmlRef.current;
        const snapOk =
          typeof snap === "string" &&
          stripHtmlToPlainText(snap).trim().length > 0;
        el.innerHTML = snapOk ? snap : initialBody || "<p><br></p>";
      } else {
        const plainFromEl = stripHtmlToPlainText(el.innerHTML).trim();
        const plainFromSnap = stripHtmlToPlainText(
          personalizedHtmlRef.current || ""
        ).trim();
        const plainFromInitial = stripHtmlToPlainText(
          initialBody || ""
        ).trim();
        const plain = plainFromEl || plainFromSnap || plainFromInitial;
        el.innerHTML = plain
          ? plainTextToUppHighlightHtml(plain, upp)
          : "<p><br></p>";
      }
      personalizedHtmlRef.current = el.innerHTML;
    } else {
      if (!isProbablyHtml(initialBody)) {
        const plain = stripHtmlToPlainText(el.innerHTML);
        el.innerHTML = plain.trim()
          ? plainTextToUppHighlightHtml(plain, upp)
          : "<p><br></p>";
      }
      personalizedHtmlRef.current = el.innerHTML;
    }

    applyUppTypography();
    applyToolbarDocumentStyles();
    syncStats();
    queueMicrotask(() => runTurkishSpell());
    queueMicrotask(() => {
      if (!compareSplit) return;
      if (isPdfReading) {
        const o = compareOriginalScrollRef.current;
        const p = scrollAreaRef.current;
        if (o) o.scrollTop = 0;
        if (p) p.scrollTop = 0;
      } else {
        const o = compareOriginalScrollRef.current;
        const p = scrollAreaRef.current;
        if (o) o.scrollTop = 0;
        if (p) p.scrollTop = 0;
      }
      setCurrentPageCompareLeft(1);
      setCurrentPage(1);
    });
  }, [
    compareSplit,
    isPdfReading,
    mode,
    initialBody,
    upp,
    applyUppTypography,
    applyToolbarDocumentStyles,
    syncStats,
    runTurkishSpell,
  ]);

  useLayoutEffect(() => {
    if (!compareSplit || isPdfReading || mode !== "reading") {
      setCompareOriginalPageCount(1);
      return;
    }
    const el = compareOriginalContentRef.current;
    if (!el) return;
    const h = el.scrollHeight;
    const pages = Math.min(
      500,
      Math.max(1, Math.ceil(h / PAGE_INNER_H_PX))
    );
    setCompareOriginalPageCount(pages);
  }, [compareSplit, compareLeftMarkup, isPdfReading, mode]);

  useEffect(() => {
    let cancelled = false;
    loadTurkishSpell()
      .then((s) => {
        if (cancelled) return;
        spellRef.current = s;
        runTurkishSpell();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [runTurkishSpell]);

  useEffect(
    () => () => window.clearTimeout(spellDebounceRef.current),
    []
  );

  useEffect(() => {
    const onSel = () => {
      rememberSelectionInEditor();
      refreshFormatState();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [rememberSelectionInEditor, refreshFormatState]);

  const exec = useCallback((cmd, val = false) => {
    editorRef.current?.focus();
    try {
      document.execCommand(cmd, false, val);
    } catch {
      /* ignore */
    }
    refreshFormatState();
    syncStats();
    scheduleTurkishSpell();
  }, [refreshFormatState, syncStats, scheduleTurkishSpell]);

  const handleUndo = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    try {
      document.execCommand("undo", false);
    } catch {
      /* ignore */
    }
    rememberSelectionInEditor();
    refreshFormatState();
    syncStats();
    scheduleTurkishSpell();
  }, [rememberSelectionInEditor, refreshFormatState, syncStats, scheduleTurkishSpell]);

  const handleSave = useCallback(() => {
    if (mode === "reading" && readingDocKind === "pdf") {
      if (!documentId) return;
      const ok = updateReadingHistoryEntry(documentId, {
        title: initialTitle.trim() || "Adsız belge",
      });
      if (ok) {
        onReadingSaved?.();
        setSaveFlash(true);
        window.setTimeout(() => setSaveFlash(false), 1200);
      }
      return;
    }

    const el = editorRef.current;
    if (!el) return;
    if (!stripHtmlToPlainText(el.innerHTML).trim()) return;
    unwrapTurkishSpellMarks(el);
    clearLexiPageNudgeMarks(el);
    const html = el.innerHTML;

    if (mode === "reading" && documentId) {
      const ok = updateReadingHistoryEntry(documentId, {
        title: initialTitle.trim() || "Adsız belge",
        content: html,
      });
      if (ok) {
        onReadingSaved?.();
        setSaveFlash(true);
        window.setTimeout(() => setSaveFlash(false), 1200);
      }
    } else if (mode === "writing") {
      try {
        const title = initialTitle.trim() || "Adsız belge";
        if (writingDocumentId) {
          const ok = updateWritingDocument(writingDocumentId, { title, html });
          if (ok) {
            setSaveFlash(true);
            window.setTimeout(() => setSaveFlash(false), 1200);
          }
        } else {
          const id = appendWritingDocument({ title, html });
          if (id) {
            onWritingDocumentCommitted?.(id);
            setSaveFlash(true);
            window.setTimeout(() => setSaveFlash(false), 1200);
          }
        }
      } catch {
        /* quota */
      }
    }
    queueMicrotask(() => runTurkishSpell());
  }, [
    mode,
    documentId,
    initialTitle,
    onReadingSaved,
    runTurkishSpell,
    readingDocKind,
    writingDocumentId,
    onWritingDocumentCommitted,
  ]);

  const updateCurrentPageFromScroll = useCallback(() => {
    const sc = scrollAreaRef.current;
    if (!sc) return;
    setCurrentPage(pageIndexFromScrollRatio(sc, pageCount));
  }, [pageCount]);

  const updateCompareOriginalPageFromScroll = useCallback(() => {
    const o = compareOriginalScrollRef.current;
    if (!o) return;
    setCurrentPageCompareLeft(
      pageIndexFromScrollRatio(o, compareOriginalPageCount)
    );
  }, [compareOriginalPageCount]);

  const updatePersonalizedPageFromScroll = useCallback(() => {
    const p = scrollAreaRef.current;
    if (!p) return;
    setCurrentPage(pageIndexFromScrollRatio(p, pageCount));
  }, [pageCount]);

  const refreshComparePageIndicators = useCallback(() => {
    if (mode !== "reading" || !compareSplit) return;
    updateCompareOriginalPageFromScroll();
    updatePersonalizedPageFromScroll();
  }, [mode, compareSplit, updateCompareOriginalPageFromScroll, updatePersonalizedPageFromScroll]);

  const syncComparePanelHxLeft = useCallback(() => {
    const o = compareOriginalScrollRef.current;
    if (o) {
      const maxO = Math.max(0, o.scrollWidth - o.clientWidth);
      setFooterHxCmpLeft({ x: o.scrollLeft, max: maxO });
    } else {
      setFooterHxCmpLeft({ x: 0, max: 0 });
    }
  }, []);

  const syncComparePanelHxRight = useCallback(() => {
    const p = scrollAreaRef.current;
    if (p) {
      const maxP = Math.max(0, p.scrollWidth - p.clientWidth);
      setFooterHxCmpRight({ x: p.scrollLeft, max: maxP });
    } else {
      setFooterHxCmpRight({ x: 0, max: 0 });
    }
  }, []);

  const syncComparePanelVertLeft = useCallback(() => {
    const o = compareOriginalScrollRef.current;
    if (o) {
      const maxO = Math.max(0, o.scrollHeight - o.clientHeight);
      setCmpVxLeft({ top: o.scrollTop, max: maxO });
    } else {
      setCmpVxLeft({ top: 0, max: 0 });
    }
  }, []);

  const syncComparePanelVertRight = useCallback(() => {
    const p = scrollAreaRef.current;
    if (p) {
      const maxP = Math.max(0, p.scrollHeight - p.clientHeight);
      setCmpVxRight({ top: p.scrollTop, max: maxP });
    } else {
      setCmpVxRight({ top: 0, max: 0 });
    }
  }, []);

  const measureFooterHorizontalScroll = useCallback(() => {
    if (immersiveReading) return;
    if (mode === "reading" && compareSplit) {
      syncComparePanelHxLeft();
      syncComparePanelHxRight();
      syncComparePanelVertLeft();
      syncComparePanelVertRight();
      return;
    }
    if (mode === "reading" || mode === "writing") {
      const el = scrollAreaRef.current;
      if (el) {
        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        setFooterHxSingle({ x: el.scrollLeft, max });
      } else {
        setFooterHxSingle({ x: 0, max: 0 });
      }
    }
  }, [
    immersiveReading,
    mode,
    compareSplit,
    syncComparePanelHxLeft,
    syncComparePanelHxRight,
    syncComparePanelVertLeft,
    syncComparePanelVertRight,
  ]);

  const handleCompareOriginalScroll = useCallback(() => {
    updateCompareOriginalPageFromScroll();
    syncComparePanelHxLeft();
    syncComparePanelVertLeft();
  }, [
    updateCompareOriginalPageFromScroll,
    syncComparePanelHxLeft,
    syncComparePanelVertLeft,
  ]);

  const handleComparePersonalizedScroll = useCallback(() => {
    updatePersonalizedPageFromScroll();
    syncComparePanelHxRight();
    syncComparePanelVertRight();
  }, [
    updatePersonalizedPageFromScroll,
    syncComparePanelHxRight,
    syncComparePanelVertRight,
  ]);

  const handleScrollAreaScroll = useCallback(() => {
    updateCurrentPageFromScroll();
    measureFooterHorizontalScroll();
  }, [updateCurrentPageFromScroll, measureFooterHorizontalScroll]);

  useEffect(() => {
    if (immersiveReading) return;

    const tick = () => measureFooterHorizontalScroll();

    if (mode === "reading" && compareSplit) {
      tick();
      const t0 = window.setTimeout(tick, 0);
      const t1 = window.setTimeout(tick, 80);
      const t2 = window.setTimeout(tick, 250);
      const o = compareOriginalScrollRef.current;
      const p = scrollAreaRef.current;
      o?.addEventListener("scroll", tick, { passive: true });
      p?.addEventListener("scroll", tick, { passive: true });
      window.addEventListener("resize", tick);
      const ro = new ResizeObserver(tick);
      if (o) ro.observe(o);
      if (p) ro.observe(p);
      return () => {
        window.clearTimeout(t0);
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        o?.removeEventListener("scroll", tick);
        p?.removeEventListener("scroll", tick);
        window.removeEventListener("resize", tick);
        ro.disconnect();
      };
    }

    if (mode === "reading" || mode === "writing") {
      tick();
      const t0 = window.setTimeout(tick, 0);
      const t1 = window.setTimeout(tick, 80);
      const t2 = window.setTimeout(tick, 250);
      const el = scrollAreaRef.current;
      if (el) {
        el.addEventListener("scroll", tick, { passive: true });
        window.addEventListener("resize", tick);
        const ro = new ResizeObserver(tick);
        ro.observe(el);
        return () => {
          window.clearTimeout(t0);
          window.clearTimeout(t1);
          window.clearTimeout(t2);
          el.removeEventListener("scroll", tick);
          window.removeEventListener("resize", tick);
          ro.disconnect();
        };
      }
      return () => {
        window.clearTimeout(t0);
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    return undefined;
  }, [
    mode,
    compareSplit,
    immersiveReading,
    measureFooterHorizontalScroll,
    pageCount,
    compareOriginalPageCount,
    readingZoomCompareLeft,
    readingZoomCompareRight,
    readingZoomSingle,
    writingZoom,
    isPdfReading,
  ]);

  useEffect(() => {
    if (isPdfReading) return;
    const el = editorRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      syncStats();
      if (mode === "reading" && compareSplit) {
        refreshComparePageIndicators();
      } else {
        updateCurrentPageFromScroll();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [
    syncStats,
    updateCurrentPageFromScroll,
    refreshComparePageIndicators,
    mode,
    compareSplit,
    isPdfReading,
  ]);

  const cmpChromeLeft = readingComparePageChrome(htmlCompareLayoutLeft);
  const cmpChromeRight = readingComparePageChrome(htmlCompareLayoutRight);
  const cmpOrigEditorStyle = readingCompareEditorSurfaceStyles(
    htmlCompareLayoutLeft,
    compareOriginalPageCount,
    {
      fontFamily: COMPARE_REF_FONT_FAMILY,
      letterSpacing: 0,
      color: "#1c1917",
    }
  );
  const cmpPersEditorStyle = readingCompareEditorSurfaceStyles(
    htmlCompareLayoutRight,
    pageCount,
    isRichReadingHtml ? {} : { color: "#1c1917" }
  );

  const showDocRouteChrome = typeof onNavigateBack === "function";

  return (
    <div
      className={
        immersiveReading
          ? "fixed inset-0 z-[120] flex min-h-0 min-w-0 flex-col"
          : "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-clip bg-stone-400"
      }
      style={
        immersiveReading
          ? { backgroundColor: uppBackgroundColor }
          : { paddingTop: toolbarInsetPx }
      }
    >
      {immersiveReading ? (
        <button
          type="button"
          className="fixed left-3 top-3 z-[130] flex size-11 items-center justify-center rounded-full border border-stone-400/90 bg-white/95 text-stone-800 shadow-md backdrop-blur-sm transition hover:bg-white"
          onClick={() => setImmersiveReading(false)}
          aria-label="Okuma modundan çık"
        >
          <IconArrowLeft className="size-6" />
        </button>
      ) : null}

      {!immersiveReading ? (
      <header
        ref={toolbarRef}
        className={
          showDocRouteChrome
            ? "flex w-full flex-wrap content-center items-center gap-x-2 gap-y-2 border-b border-stone-400 bg-stone-300 py-2 pl-2 pr-2 shadow-sm sm:gap-x-3 sm:pl-3 sm:pr-3"
            : "flex w-full flex-wrap content-center items-center gap-x-2 gap-y-2 border-b border-stone-400 bg-stone-300 py-2 pl-[3.75rem] pr-[3.75rem] shadow-sm sm:gap-x-3 sm:pl-16 sm:pr-16"
        }
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
        onPointerDownCapture={rememberSelectionInEditor}
      >
        {showDocRouteChrome ? (
          <button
            type="button"
            onClick={onNavigateBack}
            className="order-first shrink-0 flex size-11 items-center justify-center rounded-full border-2 border-stone-200 bg-white/95 text-stone-600 shadow-sm backdrop-blur-sm transition hover:border-emerald-600 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            aria-label={navigateBackAriaLabel}
          >
            <IconArrowLeft className="size-6" />
          </button>
        ) : null}
        <div
          className={
            showDocRouteChrome
              ? "flex min-w-0 flex-1 flex-wrap content-center items-center justify-center gap-x-2 gap-y-2"
              : "contents"
          }
        >
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <button
            type="button"
            title="Kaydet"
            aria-label="Kaydet"
            onMouseDown={keepEditorSelection}
            onClick={handleSave}
            className="rounded-lg border border-stone-400 bg-white px-2 py-1.5 text-sm hover:bg-stone-50"
          >
            💾
          </button>
          <button
            type="button"
            title="Son değişikliği geri al (Ctrl+Z)"
            aria-label="Geri al"
            onMouseDown={keepEditorSelection}
            onClick={handleUndo}
            className="rounded-lg border border-stone-400 bg-white px-2 py-1.5 text-stone-700 hover:bg-stone-50"
          >
            <UndoIcon className="size-5" />
          </button>
          <button
            type="button"
            title="Kalın"
            aria-label="Kalın"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("bold")}
            className={`rounded-lg border px-2 py-1.5 text-sm font-bold ${
              fmtBold
                ? "border-emerald-600 bg-emerald-100"
                : "border-stone-400 bg-white"
            }`}
          >
            B
          </button>
          <button
            type="button"
            title="İtalik"
            aria-label="İtalik"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("italic")}
            className={`rounded-lg border px-2 py-1.5 text-sm italic ${
              fmtItalic
                ? "border-emerald-600 bg-emerald-100"
                : "border-stone-400 bg-white"
            }`}
          >
            I
          </button>
          <button
            type="button"
            title="Altı çizili"
            aria-label="Altı çizili"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("underline")}
            className={`rounded-lg border px-2 py-1.5 text-sm underline ${
              fmtUnderline
                ? "border-emerald-600 bg-emerald-100"
                : "border-stone-400 bg-white"
            }`}
          >
            U
          </button>
        </div>

        <div
          className="flex shrink-0 items-center gap-0.5 rounded-lg border border-stone-400 bg-white p-0.5"
          role="group"
          aria-label="Metin hizalama"
        >
          {(
            [
              ["left", "Sola hizala", IconAlignLeft],
              ["center", "Ortala", IconAlignCenter],
              ["right", "Sağa hizala", IconAlignRight],
              ["justify", "İki yana yasla", IconAlignJustify],
            ]
          ).map(([align, label, Icon]) => (
            <button
              key={align}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={textAlign === align}
              onMouseDown={keepEditorSelection}
              onClick={() =>
                setTextAlign(
                  /** @type {"left" | "center" | "right" | "justify"} */ (
                    align
                  )
                )
              }
              className={`rounded p-1.5 text-stone-800 ${
                textAlign === align
                  ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-600"
                  : "hover:bg-stone-100"
              }`}
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>

        <select
          aria-label="Punto (px)"
          value={fontSizePx}
          onMouseDown={keepEditorSelection}
          onChange={(e) => setFontSizePx(Number(e.target.value))}
          className="max-w-[5.5rem] shrink-0 rounded-lg border border-stone-400 bg-white px-1.5 py-1.5 text-sm"
        >
          {FONT_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>

        <select
          aria-label="Yazı tipi"
          value={toolbarFontId}
          onMouseDown={keepEditorSelection}
          onChange={(e) => setToolbarFontId(e.target.value)}
          className="max-w-[10rem] shrink-0 rounded-lg border border-stone-400 bg-white px-1.5 py-1.5 text-xs sm:max-w-[12rem] sm:text-sm"
        >
          {WORKBENCH_FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>

        <label className="flex min-w-[min(100%,220px)] max-w-full shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
          <span className="w-full text-[11px] font-medium text-stone-700 sm:w-auto sm:shrink-0 sm:text-xs">
            Harf aralığı
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={letterSpacingPx}
            onChange={(e) => setLetterSpacingPx(Number(e.target.value))}
            className="h-2 min-w-[72px] flex-1 accent-emerald-700 sm:max-w-[120px]"
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={letterSpacingPx}
          />
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-stone-800">
            {letterSpacingPx}px
          </span>
        </label>

        <label className="flex min-w-[min(100%,240px)] max-w-full shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
          <span className="w-full text-[11px] font-medium text-stone-700 sm:w-auto sm:shrink-0 sm:text-xs">
            Paragraflar arası
          </span>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={paragraphGapPx}
            onChange={(e) => setParagraphGapPx(Number(e.target.value))}
            className="h-2 min-w-[72px] flex-1 accent-emerald-700 sm:max-w-[120px]"
            aria-valuemin={0}
            aria-valuemax={40}
            aria-valuenow={paragraphGapPx}
          />
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-stone-800">
            {paragraphGapPx}px
          </span>
        </label>

        {mode === "reading" ? (
          <button
            type="button"
            title={
              compareSplit
                ? "Tek sütun görünümüne dön"
                : "Orijinal belge ile profil görünümünü yan yana karşılaştır"
            }
            aria-label={compareSplit ? "Karşılaştırmayı kapat" : "Karşılaştır"}
            aria-pressed={compareSplit}
            disabled={!canCompare}
            onMouseDown={keepEditorSelection}
            onClick={() => {
              if (immersiveReading) setImmersiveReading(false);
              setCompareSplit((v) => !v);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold sm:text-sm ${
              compareSplit
                ? "border-amber-700 bg-amber-100 text-amber-950 hover:bg-amber-200"
                : "border-stone-500 bg-white text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"
            }`}
          >
            {compareSplit ? "Tek görünüm" : "Karşılaştır"}
          </button>
        ) : null}

        <button
          type="button"
          title="Okuma modu — tam ekran, salt okunur"
          aria-label="Okuma modunu aç"
          onMouseDown={keepEditorSelection}
          onClick={() => {
            setCompareSplit(false);
            setImmersiveReading(true);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-600/70 bg-white px-2 py-1.5 text-stone-800 hover:bg-emerald-50"
        >
          <IconBookOpen className="size-5 shrink-0 text-emerald-800" />
          <span className="hidden text-xs font-semibold text-emerald-900 sm:inline">
            Okuma modu
          </span>
        </button>

        {saveFlash ? (
          <span className="shrink-0 text-xs font-medium text-emerald-800">
            Kaydedildi
          </span>
        ) : null}
        </div>
        {showDocRouteChrome ? (
          <button
            type="button"
            onClick={handleToolbarProfileClick}
            className="order-last shrink-0 flex size-11 items-center justify-center rounded-full border-2 border-stone-200 bg-white/95 text-stone-600 shadow-sm backdrop-blur-sm transition hover:border-emerald-600 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            aria-label={
              onProfilePath ? "Önceki sayfaya dön" : "Profil sayfasına git"
            }
          >
            <UserProfileIcon className="size-6" />
          </button>
        ) : null}
      </header>
      ) : null}

      {mode === "reading" && compareSplit && !immersiveReading ? (
        isPdfReading ? (
        <div
          className="flex min-h-0 flex-1 flex-row gap-2 overflow-hidden px-0.5 pt-2 max-sm:min-h-0 max-sm:flex-col max-sm:overflow-y-auto"
          style={{
            maxHeight:
              "calc(100svh - 3.5rem - 4.5rem - env(safe-area-inset-bottom, 0px))",
            paddingBottom:
              "max(3.5rem, calc(env(safe-area-inset-bottom, 0px) + 2.75rem))",
            boxSizing: "border-box",
          }}
        >
          <section
            className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden rounded-xl border-2 border-stone-400 bg-white shadow-md max-sm:max-h-[48dvh] max-sm:flex-none"
            aria-label="Orijinal belge"
          >
            <h2 className="shrink-0 border-b border-stone-400 bg-stone-300 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-stone-800">
              Orijinal
            </h2>
            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col"
              style={{ position: "relative" }}
              onWheel={(e) => {
                e.stopPropagation();
                e.preventDefault();
                compareOriginalScrollRef.current.scrollTop += e.deltaY;
              }}
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-row items-stretch gap-1">
                <div
                  ref={compareOriginalScrollRef}
                  className="min-h-0 min-w-0 flex-1 overflow-x-auto bg-white"
                  style={{
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                  onScroll={handleCompareOriginalScroll}
                >
                  <div className="flex w-full shrink-0 flex-col items-center p-3">
                    {pdfFileBytes ? (
                      <div
                        style={{
                          transform: `scale(${readingZoomCompareLeft})`,
                          transformOrigin: "top center",
                        }}
                      >
                        <PdfReadingWorkbench
                          fileBytes={pdfFileBytes}
                          upp={upp}
                          immersiveReading={false}
                          onDocumentLoad={setPdfPageTotal}
                          variant="original"
                          scale={DOC_ZOOM_DEFAULT}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-red-800" role="alert">
                        PDF açılamadı veya kayıt bozuk.
                      </p>
                    )}
                  </div>
                </div>
                {cmpVxLeft.max > 0 ? (
                  <input
                    type="range"
                    min={0}
                    max={cmpVxLeft.max}
                    value={Math.min(cmpVxLeft.top, cmpVxLeft.max)}
                    step={1}
                    onChange={(e) => {
                      const el = compareOriginalScrollRef.current;
                      if (!el) return;
                      const v = Number(e.target.value);
                      el.scrollTop = v;
                      updateCompareOriginalPageFromScroll();
                      syncComparePanelHxLeft();
                      syncComparePanelVertLeft();
                    }}
                    onInput={(e) => {
                      const el = compareOriginalScrollRef.current;
                      if (!el) return;
                      const v = Number(e.currentTarget.value);
                      el.scrollTop = v;
                      updateCompareOriginalPageFromScroll();
                      syncComparePanelHxLeft();
                      syncComparePanelVertLeft();
                    }}
                    className="min-h-0 w-4 shrink-0 cursor-pointer accent-stone-600"
                    style={{
                      writingMode: "vertical-lr",
                      direction: "rtl",
                    }}
                    aria-label="Orijinal dikey kaydırma"
                  />
                ) : null}
              </div>
              {footerHxCmpLeft.max > 0 ? (
                <div
                  className="border-t border-stone-300 bg-stone-200/90 px-2 py-1.5"
                  style={{
                    position: "sticky",
                    bottom: 0,
                    left: 0,
                    right: 0,
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={footerHxCmpLeft.max}
                    value={Math.min(footerHxCmpLeft.x, footerHxCmpLeft.max)}
                    onChange={(e) => {
                      const el = compareOriginalScrollRef.current;
                      if (!el) return;
                      const v = Number(e.target.value);
                      el.scrollLeft = v;
                      const max = Math.max(0, el.scrollWidth - el.clientWidth);
                      setFooterHxCmpLeft({ x: v, max });
                    }}
                    onInput={(e) => {
                      const el = compareOriginalScrollRef.current;
                      if (!el) return;
                      const v = Number(e.currentTarget.value);
                      el.scrollLeft = v;
                      const max = Math.max(0, el.scrollWidth - el.clientWidth);
                      setFooterHxCmpLeft({ x: v, max });
                    }}
                    className="h-2 w-full min-w-0 cursor-pointer accent-stone-600"
                    aria-label="Orijinal yatay kaydırma"
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section
            className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden rounded-xl border-2 border-emerald-700/50 bg-emerald-100/40 shadow-md max-sm:min-h-[48dvh] max-sm:flex-none"
            aria-label="Kişiselleştirilmiş belge"
          >
            <h2 className="shrink-0 border-b border-emerald-600/40 bg-emerald-200/80 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-emerald-950">
              Profilinize göre
            </h2>
            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col"
              style={{ position: "relative" }}
              onWheel={(e) => {
                e.stopPropagation();
                e.preventDefault();
                scrollAreaRef.current.scrollTop += e.deltaY;
              }}
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-row items-stretch gap-1">
                <div
                  ref={scrollAreaRef}
                  className="min-h-0 min-w-0 flex-1 overflow-x-auto"
                  style={{
                    overflowY: "auto",
                    backgroundColor: uppBackgroundColor,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                  onScroll={handleComparePersonalizedScroll}
                >
                  <div className="flex w-full shrink-0 flex-col items-center p-3">
                    {pdfFileBytes ? (
                      <div
                        style={{
                          transform: `scale(${readingZoomCompareRight})`,
                          transformOrigin: "top center",
                        }}
                      >
                        <PdfReadingWorkbench
                          fileBytes={pdfFileBytes}
                          upp={upp}
                          immersiveReading={false}
                          onDocumentLoad={setPdfPageTotal}
                          variant="personalized"
                          scale={DOC_ZOOM_DEFAULT}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-red-800" role="alert">
                        PDF açılamadı veya kayıt bozuk.
                      </p>
                    )}
                  </div>
                </div>
                {cmpVxRight.max > 0 ? (
                  <input
                    type="range"
                    min={0}
                    max={cmpVxRight.max}
                    value={Math.min(cmpVxRight.top, cmpVxRight.max)}
                    step={1}
                    onChange={(e) => {
                      const el = scrollAreaRef.current;
                      if (!el) return;
                      const v = Number(e.target.value);
                      el.scrollTop = v;
                      updatePersonalizedPageFromScroll();
                      syncComparePanelHxRight();
                      syncComparePanelVertRight();
                    }}
                    onInput={(e) => {
                      const el = scrollAreaRef.current;
                      if (!el) return;
                      const v = Number(e.currentTarget.value);
                      el.scrollTop = v;
                      updatePersonalizedPageFromScroll();
                      syncComparePanelHxRight();
                      syncComparePanelVertRight();
                    }}
                    className="min-h-0 w-4 shrink-0 cursor-pointer accent-emerald-600"
                    style={{
                      writingMode: "vertical-lr",
                      direction: "rtl",
                    }}
                    aria-label="Kişiselleştirilmiş dikey kaydırma"
                  />
                ) : null}
              </div>
              {footerHxCmpRight.max > 0 ? (
                <div
                  className="border-t border-emerald-600/30 px-2 py-1.5"
                  style={{
                    position: "sticky",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: uppBackgroundColor,
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={footerHxCmpRight.max}
                    value={Math.min(footerHxCmpRight.x, footerHxCmpRight.max)}
                    onChange={(e) => {
                      const el = scrollAreaRef.current;
                      if (!el) return;
                      const v = Number(e.target.value);
                      el.scrollLeft = v;
                      const max = Math.max(0, el.scrollWidth - el.clientWidth);
                      setFooterHxCmpRight({ x: v, max });
                    }}
                    onInput={(e) => {
                      const el = scrollAreaRef.current;
                      if (!el) return;
                      const v = Number(e.currentTarget.value);
                      el.scrollLeft = v;
                      const max = Math.max(0, el.scrollWidth - el.clientWidth);
                      setFooterHxCmpRight({ x: v, max });
                    }}
                    className="h-2 w-full min-w-0 cursor-pointer accent-emerald-600"
                    aria-label="Kişiselleştirilmiş yatay kaydırma"
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>
        ) : (
        <div
          className="pt-2"
          style={{
            display: "flex",
            flexDirection: "row",
            flex: 1,
            minHeight: 0,
            gap: 8,
            paddingLeft: 4,
            paddingRight: 4,
            paddingBottom:
              "max(3.5rem, calc(env(safe-area-inset-bottom, 0px) + 2.75rem))",
            overflow: "visible",
            maxHeight:
              "calc(100svh - 3.5rem - 4.5rem - env(safe-area-inset-bottom, 0px))",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
            }}
            onWheel={(e) => {
              e.stopPropagation();
              e.preventDefault();
              compareOriginalScrollRef.current.scrollTop += e.deltaY;
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: 4,
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                overflow: "visible",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  overflowY: "scroll",
                  overflowX: "auto",
                  background: "white",
                }}
                ref={compareOriginalScrollRef}
                onScroll={handleCompareOriginalScroll}
              >
                <div className="flex w-full shrink-0 flex-col items-center px-1 py-2 sm:px-2">
                  <div
                    style={{
                      transform: `scale(${readingZoomCompareLeft})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <div
                      className="relative shrink-0"
                      style={cmpChromeLeft.sheetOuter}
                    >
                      <div className="compare-original-pane w-full max-w-full">
                        <div
                          className="relative mx-auto"
                          style={cmpChromeLeft.pageRoot}
                        >
                          <div
                            className="relative z-[5]"
                            style={cmpChromeLeft.contentPad}
                          >
                            <div
                              ref={compareOriginalContentRef}
                              className="word-editor-surface word-editor-surface--rich relative z-[6] w-full max-w-full bg-transparent select-text text-stone-900 outline-none"
                              style={cmpOrigEditorStyle}
                              dangerouslySetInnerHTML={{
                                __html: compareLeftMarkup,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {cmpVxLeft.max > 0 ? (
                <input
                  type="range"
                  min={0}
                  max={cmpVxLeft.max}
                  value={Math.min(cmpVxLeft.top, cmpVxLeft.max)}
                  step={1}
                  onChange={(e) => {
                    const el = compareOriginalScrollRef.current;
                    if (!el) return;
                    const v = Number(e.target.value);
                    el.scrollTop = v;
                    updateCompareOriginalPageFromScroll();
                    syncComparePanelHxLeft();
                    syncComparePanelVertLeft();
                  }}
                  onInput={(e) => {
                    const el = compareOriginalScrollRef.current;
                    if (!el) return;
                    const v = Number(e.currentTarget.value);
                    el.scrollTop = v;
                    updateCompareOriginalPageFromScroll();
                    syncComparePanelHxLeft();
                    syncComparePanelVertLeft();
                  }}
                  className="min-h-0 w-4 shrink-0 cursor-pointer accent-stone-600"
                  style={{
                    writingMode: "vertical-lr",
                    direction: "rtl",
                  }}
                  aria-label="Orijinal dikey kaydırma"
                />
              ) : null}
            </div>
            {footerHxCmpLeft.max > 0 ? (
              <div
                className="border-t border-stone-300 bg-stone-200/90 px-2 py-1.5"
                style={{
                  position: "sticky",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                }}
              >
                <input
                  type="range"
                  min={0}
                  max={footerHxCmpLeft.max}
                  value={Math.min(footerHxCmpLeft.x, footerHxCmpLeft.max)}
                  onChange={(e) => {
                    const el = compareOriginalScrollRef.current;
                    if (!el) return;
                    const v = Number(e.target.value);
                    el.scrollLeft = v;
                    const max = Math.max(0, el.scrollWidth - el.clientWidth);
                    setFooterHxCmpLeft({ x: v, max });
                  }}
                  onInput={(e) => {
                    const el = compareOriginalScrollRef.current;
                    if (!el) return;
                    const v = Number(e.currentTarget.value);
                    el.scrollLeft = v;
                    const max = Math.max(0, el.scrollWidth - el.clientWidth);
                    setFooterHxCmpLeft({ x: v, max });
                  }}
                  className="h-2 w-full min-w-0 cursor-pointer accent-stone-600"
                  aria-label="Orijinal yatay kaydırma"
                />
              </div>
            ) : null}
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
            }}
            onWheel={(e) => {
              e.stopPropagation();
              e.preventDefault();
              scrollAreaRef.current.scrollTop += e.deltaY;
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: 4,
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                overflow: "visible",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  overflowY: "scroll",
                  overflowX: "auto",
                  backgroundColor: uppBackgroundColor,
                }}
                ref={scrollAreaRef}
                onScroll={handleComparePersonalizedScroll}
              >
                <div className="flex w-full shrink-0 flex-col items-center px-1 py-2 sm:px-2">
                  <div
                    style={{
                      transform: `scale(${readingZoomCompareRight})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <div
                      className="relative shrink-0"
                      style={cmpChromeRight.sheetOuter}
                    >
                      <div className="w-full max-w-full">
                        <div
                          className="relative mx-auto"
                          style={cmpChromeRight.pageRoot}
                        >
                          <div
                            className="relative z-[5]"
                            style={cmpChromeRight.contentPad}
                          >
                            <div
                              className="min-w-0"
                              style={{
                                fontSize: `${16 * COMPARE_PERSONALIZED_FONT_TO_ORIGINAL}px`,
                              }}
                            >
                              <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                role="textbox"
                                aria-multiline
                                aria-label="Kişiselleştirilmiş belge metni"
                                lang="tr"
                                spellCheck={false}
                                onInput={() => {
                                  syncStats();
                                  refreshFormatState();
                                  scheduleTurkishSpell();
                                }}
                                className={`word-editor-surface relative z-[6] w-full max-w-full bg-transparent text-stone-900 outline-none ${
                                  isRichReadingHtml ||
                                  (mode === "reading" &&
                                    compareSplit &&
                                    !isPdfReading)
                                    ? "word-editor-surface--rich word-editor-surface--rich-inherit "
                                    : ""
                                }`}
                                style={cmpPersEditorStyle}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {cmpVxRight.max > 0 ? (
                <input
                  type="range"
                  min={0}
                  max={cmpVxRight.max}
                  value={Math.min(cmpVxRight.top, cmpVxRight.max)}
                  step={1}
                  onChange={(e) => {
                    const el = scrollAreaRef.current;
                    if (!el) return;
                    const v = Number(e.target.value);
                    el.scrollTop = v;
                    updatePersonalizedPageFromScroll();
                    syncComparePanelHxRight();
                    syncComparePanelVertRight();
                  }}
                  onInput={(e) => {
                    const el = scrollAreaRef.current;
                    if (!el) return;
                    const v = Number(e.currentTarget.value);
                    el.scrollTop = v;
                    updatePersonalizedPageFromScroll();
                    syncComparePanelHxRight();
                    syncComparePanelVertRight();
                  }}
                  className="min-h-0 w-4 shrink-0 cursor-pointer accent-emerald-600"
                  style={{
                    writingMode: "vertical-lr",
                    direction: "rtl",
                  }}
                  aria-label="Kişiselleştirilmiş dikey kaydırma"
                />
              ) : null}
            </div>
            {footerHxCmpRight.max > 0 ? (
              <div
                className="border-t border-emerald-600/30 px-2 py-1.5"
                style={{
                  position: "sticky",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  backgroundColor: uppBackgroundColor,
                }}
              >
                <input
                  type="range"
                  min={0}
                  max={footerHxCmpRight.max}
                  value={Math.min(footerHxCmpRight.x, footerHxCmpRight.max)}
                  onChange={(e) => {
                    const el = scrollAreaRef.current;
                    if (!el) return;
                    const v = Number(e.target.value);
                    el.scrollLeft = v;
                    const max = Math.max(0, el.scrollWidth - el.clientWidth);
                    setFooterHxCmpRight({ x: v, max });
                  }}
                  onInput={(e) => {
                    const el = scrollAreaRef.current;
                    if (!el) return;
                    const v = Number(e.currentTarget.value);
                    el.scrollLeft = v;
                    const max = Math.max(0, el.scrollWidth - el.clientWidth);
                    setFooterHxCmpRight({ x: v, max });
                  }}
                  className="h-2 w-full min-w-0 cursor-pointer accent-emerald-600"
                  aria-label="Kişiselleştirilmiş yatay kaydırma"
                />
              </div>
            ) : null}
          </div>
        </div>
        )
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-14">
          <div
            ref={scrollAreaRef}
            className={
              immersiveReading
                ? "min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-16 sm:px-12 sm:pt-20 md:px-20 md:py-12 lg:px-28 lg:py-16"
                : isPdfReading
                  ? "min-h-0 flex-1 overflow-y-auto overflow-x-auto"
                  : "min-h-0 flex-1 overflow-y-auto overflow-x-auto"
            }
            style={
              !immersiveReading && !isPdfReading
                ? { backgroundColor: uppBackgroundColor }
                : undefined
            }
            onScroll={handleScrollAreaScroll}
          >
            <div
              className={
                immersiveReading
                  ? "mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col justify-start pb-2 lg:max-w-4xl"
                  : "mx-auto flex min-h-full w-full max-w-[calc(210mm+2rem)] justify-center gap-1 px-1 py-2 pb-3 sm:gap-2 sm:px-3"
              }
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <div
                  className={
                    immersiveReading
                      ? "relative w-full shrink-0 bg-transparent shadow-none"
                      : isPdfReading
                        ? "relative w-full max-w-full shrink-0 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
                        : "relative shrink-0"
                  }
                  style={
                    immersiveReading
                      ? {
                          boxSizing: "border-box",
                          minHeight: "min-content",
                          padding: isPdfReading ? "0.25rem 0" : "0.5rem 0",
                        }
                      : isPdfReading
                        ? {
                            width: "100%",
                            maxWidth: "100%",
                            boxSizing: "border-box",
                            padding: `${mm(12)} ${mm(14)} ${mm(16)}`,
                          }
                        : {
                            width: mm(A4_MM_W),
                            maxWidth: "100%",
                            boxSizing: "border-box",
                          }
                  }
                >
                {isPdfReading ? (
                  pdfFileBytes ? (
                  <PdfReadingWorkbench
                    fileBytes={pdfFileBytes}
                    upp={upp}
                    immersiveReading={immersiveReading}
                    onDocumentLoad={setPdfPageTotal}
                    variant="personalized"
                    scale={pdfScaleSingle}
                  />
                  ) : (
                    <p className="text-sm text-red-800" role="alert">
                      PDF açılamadı veya kayıt bozuk.
                    </p>
                  )
                ) : (
                <ReadingZoomWrap
                  zoom={
                    mode === "writing" ? writingZoom : readingZoomSingle
                  }
                >
                  <div
                    className={
                      immersiveReading
                        ? "relative w-full"
                        : "relative mx-auto"
                    }
                    style={
                      immersiveReading
                        ? undefined
                        : { width: mm(A4_MM_W) }
                    }
                  >
                    <div
                      className="relative z-[5]"
                      style={
                        immersiveReading
                          ? undefined
                          : {
                              padding: `${mm(PAGE_MARGIN_TOP_MM)} ${mm(PAGE_MARGIN_LR_MM)}`,
                            }
                      }
                    >
                    <div
                      ref={editorRef}
                      contentEditable={
                        mode === "writing" || !immersiveReading
                      }
                      suppressContentEditableWarning
                      role={
                        immersiveReading && mode === "reading"
                          ? "document"
                          : "textbox"
                      }
                      aria-multiline={
                        !(immersiveReading && mode === "reading")
                      }
                      aria-readonly={
                        immersiveReading && mode === "reading"
                      }
                      aria-label={
                        immersiveReading && mode === "reading"
                          ? "Okuma metni (salt okunur)"
                          : "Belge metni"
                      }
                      lang="tr"
                      spellCheck={false}
                      onInput={
                        mode === "writing" || !immersiveReading
                          ? () => {
                              syncStats();
                              refreshFormatState();
                              scheduleTurkishSpell();
                            }
                          : undefined
                      }
                      className={`word-editor-surface relative z-[6] w-full max-w-full bg-transparent text-stone-900 outline-none ${
                        isRichReadingHtml ? "word-editor-surface--rich " : ""
                      }${
                        immersiveReading
                          ? "min-h-[50vh] select-text"
                          : ""
                      }`}
                      style={{
                        ...(isRichReadingHtml ? {} : { color: "#1c1917" }),
                        ...(!immersiveReading
                          ? {
                              maxWidth: `${PAGE_INNER_W_PX}px`,
                              marginLeft: "auto",
                              marginRight: "auto",
                            }
                          : {}),
                      }}
                    />
                    </div>
                  </div>
                </ReadingZoomWrap>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {!immersiveReading ? (
        <footer
          className="fixed bottom-0 left-0 right-0 z-[60] grid min-h-10 w-full grid-cols-1 items-center gap-y-1 border-t border-stone-500 bg-stone-700 px-2 py-1 text-xs text-stone-100 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-2 sm:px-3 sm:text-sm"
          style={{
            paddingBottom: "max(0.125rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <span className="hidden min-w-0 truncate tabular-nums sm:block">
            {isPdfReading
              ? `PDF · ${pdfPageTotal} sayfa`
              : `Kelime: ${wordCount} · Karakter: ${charCount}`}
          </span>
          <div
            role="region"
            aria-label="Yakınlaştırma"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 justify-self-center sm:px-1"
          >
            {mode === "reading" && compareSplit ? (
              <>
                <div className="flex flex-nowrap items-center justify-center gap-x-2">
                  <ReadingZoomSlider
                    variant="footer"
                    label="Orijinal"
                    value={readingZoomCompareLeft}
                    onChange={setReadingZoomCompareLeft}
                    id="lexi-zoom-cmp-left"
                  />
                </div>
                <div className="flex flex-nowrap items-center justify-center gap-x-2">
                  <ReadingZoomSlider
                    variant="footer"
                    label="Kişiselleştirilmiş"
                    value={readingZoomCompareRight}
                    onChange={setReadingZoomCompareRight}
                    id="lexi-zoom-cmp-right"
                  />
                </div>
              </>
            ) : mode === "reading" || mode === "writing" ? (
              <div className="flex flex-nowrap items-center justify-center gap-x-3">
                <ReadingZoomSlider
                  variant="footer"
                  label="Yakınlaştır"
                  value={mode === "writing" ? writingZoom : readingZoomSingle}
                  onChange={
                    mode === "writing" ? setWritingZoom : setReadingZoomSingle
                  }
                  id={
                    mode === "writing"
                      ? "lexi-zoom-writing"
                      : "lexi-zoom-single"
                  }
                />
                {footerHxSingle.max > 0 ? (
                  <input
                    type="range"
                    min={0}
                    max={footerHxSingle.max}
                    value={Math.min(footerHxSingle.x, footerHxSingle.max)}
                    onChange={(e) => {
                      const el = scrollAreaRef.current;
                      if (!el) return;
                      const v = Number(e.target.value);
                      el.scrollLeft = v;
                      const max = Math.max(0, el.scrollWidth - el.clientWidth);
                      setFooterHxSingle({ x: v, max });
                    }}
                    className="h-2 w-28 shrink-0 cursor-pointer accent-emerald-300"
                    aria-label="Yatay kaydırma"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 sm:justify-end">
            <span className="tabular-nums sm:hidden">
              {isPdfReading
                ? `PDF · ${pdfPageTotal} sayfa`
                : `Kelime: ${wordCount} · Karakter: ${charCount}`}
            </span>
            <span className="tabular-nums">
              {isPdfReading ? (
                "—"
              ) : mode === "reading" && compareSplit && !isPdfReading ? (
                <>
                  <span className="hidden sm:inline">
                    Orijinal {currentPageCompareLeft}/{compareOriginalPageCount} ·
                    Kişisel {currentPage}/{pageCount}
                  </span>
                  <span className="sm:hidden">
                    O: {currentPageCompareLeft}/{compareOriginalPageCount} · K:{" "}
                    {currentPage}/{pageCount}
                  </span>
                </>
              ) : (
                `Sayfa ${currentPage} / ${pageCount}`
              )}
            </span>
            <Link
              to="/"
              className="shrink-0 text-stone-200 underline decoration-1 underline-offset-2 hover:text-white"
            >
              Ana sayfa
            </Link>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
