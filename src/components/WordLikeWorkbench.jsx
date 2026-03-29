import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  isProbablyHtml,
  plainTextToNeutralParagraphHtml,
  stripHtmlToPlainText,
} from "../lib/readingText.js";
import { decodeStoredContentToPdfBytes, isPdfStoredContent } from "../lib/readingPdfStorage.js";
import { plainTextToUppHighlightHtml } from "../lib/uppLetterHighlights.js";
import {
  updateReadingHistoryEntry,
} from "../utils/readingHistory.js";
import PdfReadingWorkbench from "./PdfReadingWorkbench.jsx";
import {
  applyTurkishSpellMarks,
  getCaretTextOffset,
  loadTurkishSpell,
  setCaretTextOffset,
  unwrapTurkishSpellMarks,
} from "../lib/turkishSpell.js";

const WRITING_STORAGE_KEY = "lexilens_writing_document";

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

/** ~A4 iç yüksekliği (px, 96dpi) — sayfa sayımı için */
const PAGE_SLICE_PX = 1008;
/** Çok sayfalı belgelerde sayfalar arası boşluk (px); kenar boşluğu sonrası içerik PAGE_SLICE ile hizalı */
const PAGE_VISUAL_GAP_PX = 8;
/** Sayfa sonu ile gri boşluk arası: kesilen satırları beyazla örter (px) */
const PAGE_BREAK_MARGIN_PX = 22;

const A4_MM_W = 210;
const A4_MM_H = 297;

function mm(n) {
  return `${n}mm`;
}

/** Metni sayfa aralığında gizler; sonsuz tekrar yok (son sayfada hayalet çizgi olmaz). */
function editorPageMaskImage(pageCount) {
  if (pageCount <= 1) return undefined;
  const L = PAGE_SLICE_PX;
  const G = PAGE_VISUAL_GAP_PX;
  const stops = ["#000 0px"];
  for (let p = 1; p < pageCount; p++) {
    const gapStart = p * L - G;
    const gapEnd = p * L;
    stops.push(
      `#000 ${gapStart}px`,
      `transparent ${gapStart}px`,
      `transparent ${gapEnd}px`,
      `#000 ${gapEnd}px`
    );
  }
  stops.push("#000 100%");
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
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
}) {
  const editorRef = useRef(null);
  /** Karşılaştırma layout'u editörü yeniden mount ettiğinde kişiselleştirilmiş HTML korunur */
  const personalizedHtmlRef = useRef("");
  const scrollAreaRef = useRef(null);
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
  const [compareSplit, setCompareSplit] = useState(false);
  /** Karşılaştır toggle'ında useLayoutEffect'in yalnızca gerçek geçişte çalışması için */
  const prevCompareSplitRef = useRef(compareSplit);
  const [pdfPageTotal, setPdfPageTotal] = useState(1);

  const isPdfReading = mode === "reading" && readingDocKind === "pdf";
  const pdfFileBytes = useMemo(() => {
    if (!isPdfReading) return null;
    return decodeStoredContentToPdfBytes(initialBody ?? "");
  }, [isPdfReading, initialBody]);

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
  }, [documentId, readingDocKind]);

  const uppBackgroundColor =
    upp?.background && typeof upp.background.color === "string"
      ? upp.background.color
      : "#FFF8E7";

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
    const rawPages = Math.ceil((Number.isFinite(contentH) ? contentH : 0) / PAGE_SLICE_PX);
    const pages = Math.min(500, Math.max(1, rawPages));
    setPageCount(pages);
    if (mode === "reading" && !isPdfReading) {
      personalizedHtmlRef.current = el.innerHTML;
    }
  }, [mode, isPdfReading]);

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

    const snap = personalizedHtmlRef.current;
    const snapOk = snap && stripHtmlToPlainText(snap).trim().length > 0;

    if (snapOk) {
      el.innerHTML = snap;
    } else if (colorizePlainOnLoad && mode === "reading") {
      el.innerHTML = plainTextToUppHighlightHtml(initialBody || "", upp);
      personalizedHtmlRef.current = el.innerHTML;
    } else if (isProbablyHtml(initialBody)) {
      el.innerHTML = initialBody || "<p><br></p>";
      personalizedHtmlRef.current = el.innerHTML;
    } else if (initialBody?.trim()) {
      el.innerHTML = plainTextToUppHighlightHtml(initialBody, upp);
      personalizedHtmlRef.current = el.innerHTML;
    } else {
      el.innerHTML = "<p><br></p>";
      personalizedHtmlRef.current = el.innerHTML;
    }

    applyUppTypography();
    applyToolbarDocumentStyles();
    syncStats();
    queueMicrotask(() => runTurkishSpell());
  }, [
    compareSplit,
    isPdfReading,
    mode,
    initialBody,
    colorizePlainOnLoad,
    upp,
    applyUppTypography,
    applyToolbarDocumentStyles,
    syncStats,
    runTurkishSpell,
  ]);

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
        localStorage.setItem(
          WRITING_STORAGE_KEY,
          JSON.stringify({
            title: initialTitle.trim() || "Adsız belge",
            html,
            savedAt: new Date().toISOString(),
          })
        );
        setSaveFlash(true);
        window.setTimeout(() => setSaveFlash(false), 1200);
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
  ]);

  const updateCurrentPageFromScroll = useCallback(() => {
    const sc = scrollAreaRef.current;
    if (!sc) return;
    const st = sc.scrollTop;
    const cp = Math.min(
      pageCount,
      Math.max(1, Math.floor(st / PAGE_SLICE_PX) + 1)
    );
    setCurrentPage(cp);
  }, [pageCount]);

  useEffect(() => {
    if (isPdfReading) return;
    const el = editorRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      syncStats();
      updateCurrentPageFromScroll();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [syncStats, updateCurrentPageFromScroll, isPdfReading]);

  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
  const editorMask = immersiveReading
    ? undefined
    : editorPageMaskImage(pageCount);

  return (
    <div
      className={
        immersiveReading
          ? "fixed inset-0 z-[120] flex min-h-0 flex-col"
          : "flex min-h-[calc(100dvh-3.5rem)] flex-col bg-stone-400"
      }
      style={
        immersiveReading ? { backgroundColor: uppBackgroundColor } : undefined
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
        className="fixed left-0 right-0 top-14 z-[60] flex w-full flex-wrap content-center items-center gap-x-2 gap-y-2 border-b border-stone-400 bg-stone-300 py-2 pl-[3.75rem] pr-[3.75rem] shadow-sm sm:gap-x-3 sm:pl-16 sm:pr-16"
        onPointerDownCapture={rememberSelectionInEditor}
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
      </header>
      ) : null}

      {mode === "reading" && compareSplit && !immersiveReading ? (
        <div className="flex min-h-0 flex-1 flex-row gap-2 overflow-hidden px-0.5 pt-40 pb-10 sm:pt-36 max-sm:min-h-0 max-sm:flex-col max-sm:overflow-y-auto">
          <section
            className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden rounded-xl border-2 border-stone-400 bg-stone-200 shadow-md max-sm:max-h-[48dvh] max-sm:flex-none"
            aria-label="Orijinal belge"
          >
            <h2 className="shrink-0 border-b border-stone-400 bg-stone-300 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-stone-800">
              Orijinal
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              {isPdfReading && pdfFileBytes ? (
                <div className="p-3">
                  <PdfReadingWorkbench
                    fileBytes={pdfFileBytes}
                    upp={upp}
                    immersiveReading={false}
                    variant="original"
                  />
                </div>
              ) : (
                <div className="p-3">
                  <div
                    className="word-editor-surface word-editor-surface--rich compare-original-pane select-text rounded-lg text-stone-900 outline-none"
                    style={{
                      fontFamily:
                        'Times New Roman, Times, "Liberation Serif", serif',
                      letterSpacing: 0,
                      background: "#ffffff",
                      color: "#1c1917",
                    }}
                    dangerouslySetInnerHTML={{ __html: compareLeftMarkup }}
                  />
                </div>
              )}
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
              ref={scrollAreaRef}
              className="min-h-0 flex-1 overflow-y-auto"
              style={{
                backgroundColor: isPdfReading ? uppBackgroundColor : undefined,
              }}
              onScroll={updateCurrentPageFromScroll}
            >
              <div
                className={
                  isPdfReading
                    ? "p-3"
                    : "mx-auto flex min-h-full w-full max-w-[calc(210mm+4rem)] justify-center px-2 py-4 sm:px-4"
                }
              >
                <div
                  className={
                    isPdfReading
                      ? "relative w-full max-w-full"
                      : "relative w-full max-w-full shrink-0 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.18)]"
                  }
                  style={
                    isPdfReading
                      ? undefined
                      : {
                          width: mm(A4_MM_W),
                          minHeight: mm(A4_MM_H),
                          maxWidth: "100%",
                          boxSizing: "border-box",
                          padding: `${mm(25)} ${mm(25)} ${mm(20)} ${mm(30)}`,
                          backgroundColor: uppBackgroundColor,
                        }
                  }
                >
                  {isPdfReading ? (
                    pdfFileBytes ? (
                      <PdfReadingWorkbench
                        fileBytes={pdfFileBytes}
                        upp={upp}
                        immersiveReading={false}
                        onDocumentLoad={setPdfPageTotal}
                        variant="personalized"
                      />
                    ) : (
                      <p className="text-sm text-red-800" role="alert">
                        PDF açılamadı veya kayıt bozuk.
                      </p>
                    )
                  ) : (
                    <>
                      {pageCount > 1
                        ? Array.from({ length: pageCount - 1 }, (_, i) => (
                            <div
                              key={`cmp-page-gap-${i}`}
                              aria-hidden
                              className="pointer-events-none absolute right-0 left-0 z-[1] bg-stone-400"
                              style={{
                                top: `calc(${mm(25)} + ${(i + 1) * PAGE_SLICE_PX - PAGE_VISUAL_GAP_PX}px)`,
                                height: PAGE_VISUAL_GAP_PX,
                              }}
                            />
                          ))
                        : null}
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
                        className={`word-editor-surface relative z-[2] w-full max-w-full bg-transparent text-stone-900 outline-none ${
                          isRichReadingHtml ? "word-editor-surface--rich " : ""
                        } min-h-[calc(297mm-45mm)]`}
                        style={{
                          ...(isRichReadingHtml ? {} : { color: "#1c1917" }),
                          ...(editorMask
                            ? {
                                WebkitMaskImage: editorMask,
                                WebkitMaskRepeat: "no-repeat",
                                WebkitMaskSize: `100% ${pageCount * PAGE_SLICE_PX}px`,
                                maskImage: editorMask,
                                maskRepeat: "no-repeat",
                                maskSize: `100% ${pageCount * PAGE_SLICE_PX}px`,
                              }
                            : {}),
                        }}
                      />
                      {pageCount > 1
                        ? Array.from({ length: pageCount - 1 }, (_, i) => (
                            <div
                              key={`cmp-tail-${i}`}
                              aria-hidden
                              className="pointer-events-none absolute right-0 left-0 z-[3] bg-white"
                              style={{
                                top: `calc(${mm(25)} + ${(i + 1) * PAGE_SLICE_PX - PAGE_VISUAL_GAP_PX - PAGE_BREAK_MARGIN_PX}px)`,
                                height: PAGE_BREAK_MARGIN_PX,
                              }}
                            />
                          ))
                        : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div
          ref={scrollAreaRef}
          className={
            immersiveReading
              ? "flex min-h-0 flex-1 overflow-y-auto px-5 pb-10 pt-16 sm:px-12 sm:pt-20 md:px-20 md:py-12 lg:px-28 lg:py-16"
              : "flex flex-1 overflow-y-auto pt-40 pb-10 sm:pt-36"
          }
          onScroll={updateCurrentPageFromScroll}
        >
          <div
            className={
              immersiveReading
                ? "mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col justify-start lg:max-w-4xl"
                : "mx-auto flex min-h-full w-full max-w-[calc(210mm+4rem)] justify-center gap-1 px-2 py-6 sm:gap-3 sm:px-6"
            }
          >
            {!immersiveReading && !isPdfReading ? (
              <aside
                className="flex w-7 shrink-0 flex-col items-end pt-2 text-xs font-medium text-stone-700 sm:w-9"
                aria-label="Sayfa numaraları"
              >
                {pageNumbers.map((n) => (
                  <div
                    key={n}
                    className="flex w-full items-start justify-end border-r border-transparent pr-1"
                    style={{ minHeight: PAGE_SLICE_PX, paddingTop: 6 }}
                  >
                    <span className="tabular-nums">{n}</span>
                  </div>
                ))}
              </aside>
            ) : null}

            <div
              className={
                immersiveReading
                  ? "relative w-full shrink-0 bg-transparent shadow-none"
                  : isPdfReading
                    ? "relative w-full max-w-full shrink-0 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
                    : "relative shrink-0 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.18)]"
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
                        minHeight: mm(A4_MM_H),
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        padding: `${mm(25)} ${mm(25)} ${mm(20)} ${mm(30)}`,
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
                  />
                ) : (
                  <p className="text-sm text-red-800" role="alert">
                    PDF açılamadı veya kayıt bozuk.
                  </p>
                )
              ) : (
                <>
                  {!immersiveReading && pageCount > 1
                    ? Array.from({ length: pageCount - 1 }, (_, i) => (
                        <div
                          key={`page-gap-${i}`}
                          aria-hidden
                          className="pointer-events-none absolute right-0 left-0 z-[1] bg-stone-400"
                          style={{
                            top: `calc(${mm(25)} + ${(i + 1) * PAGE_SLICE_PX - PAGE_VISUAL_GAP_PX}px)`,
                            height: PAGE_VISUAL_GAP_PX,
                          }}
                        />
                      ))
                    : null}
                  <div
                    ref={editorRef}
                    contentEditable={!immersiveReading}
                    suppressContentEditableWarning
                    role={immersiveReading ? "document" : "textbox"}
                    aria-multiline={!immersiveReading}
                    aria-readonly={immersiveReading}
                    aria-label={
                      immersiveReading
                        ? "Okuma metni (salt okunur)"
                        : "Belge metni"
                    }
                    lang="tr"
                    spellCheck={false}
                    onInput={
                      immersiveReading
                        ? undefined
                        : () => {
                            syncStats();
                            refreshFormatState();
                            scheduleTurkishSpell();
                          }
                    }
                    className={`word-editor-surface relative z-[2] w-full max-w-full bg-transparent text-stone-900 outline-none ${
                      isRichReadingHtml ? "word-editor-surface--rich " : ""
                    }${
                      immersiveReading
                        ? "min-h-[50vh] select-text"
                        : "min-h-[calc(297mm-45mm)]"
                    }`}
                    style={{
                      ...(isRichReadingHtml ? {} : { color: "#1c1917" }),
                      ...(editorMask
                        ? {
                            WebkitMaskImage: editorMask,
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskSize: `100% ${pageCount * PAGE_SLICE_PX}px`,
                            maskImage: editorMask,
                            maskRepeat: "no-repeat",
                            maskSize: `100% ${pageCount * PAGE_SLICE_PX}px`,
                          }
                        : {}),
                    }}
                  />
                  {!immersiveReading && pageCount > 1
                    ? Array.from({ length: pageCount - 1 }, (_, i) => (
                        <div
                          key={`page-tail-margin-${i}`}
                          aria-hidden
                          className="pointer-events-none absolute right-0 left-0 z-[3] bg-white"
                          style={{
                            top: `calc(${mm(25)} + ${(i + 1) * PAGE_SLICE_PX - PAGE_VISUAL_GAP_PX - PAGE_BREAK_MARGIN_PX}px)`,
                            height: PAGE_BREAK_MARGIN_PX,
                          }}
                        />
                      ))
                    : null}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!immersiveReading ? (
        <footer className="fixed bottom-0 left-0 right-0 z-[55] flex h-9 items-center justify-between gap-3 border-t border-stone-500 bg-stone-700 px-3 text-xs text-stone-100 sm:text-sm">
          <span className="tabular-nums">
            {isPdfReading
              ? `PDF · ${pdfPageTotal} sayfa`
              : `Kelime: ${wordCount} · Karakter: ${charCount}`}
          </span>
          <span className="tabular-nums">
            {isPdfReading ? "—" : `Sayfa ${currentPage} / ${pageCount}`}
          </span>
          <Link
            to="/"
            className="shrink-0 text-stone-200 underline decoration-1 underline-offset-2 hover:text-white"
          >
            Ana sayfa
          </Link>
        </footer>
      ) : null}
    </div>
  );
}

export function loadWritingDocumentFromStorage() {
  try {
    const raw = localStorage.getItem(WRITING_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.html !== "string") return null;
    return {
      title: typeof o.title === "string" ? o.title : "Adsız belge",
      html: o.html,
    };
  } catch {
    return null;
  }
}
