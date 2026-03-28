import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import mammoth from "mammoth";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { FONT_OPTIONS } from "../lib/upp.js";
import { colorizeLineToParts, READING_LETTER_COLORS } from "../lib/readingText.js";
import { getUpp } from "../utils/storage.js";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

async function extractPdfPlainText(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const chunks = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const strings = tc.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean);
    chunks.push(strings.join(" "));
  }
  return chunks.join("\n\n").trim();
}

async function extractDocxPlainText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

function readingStylesFromUpp(upp) {
  const typo = upp?.typography ?? {};
  const bg = upp?.background?.color ?? "#FFFFFF";
  const fontId = upp?.fontPreference ?? "opendyslexic";
  const fontFamily =
    FONT_OPTIONS.find((f) => f.id === fontId)?.fontFamily ??
    '"OpenDyslexic", sans-serif';

  const letterSpacingEm =
    typeof typo.letterSpacingEm === "number" && !Number.isNaN(typo.letterSpacingEm)
      ? typo.letterSpacingEm
      : 0.06;
  const lineHeight =
    typeof typo.lineHeight === "number" && !Number.isNaN(typo.lineHeight)
      ? typo.lineHeight
      : 1.65;

  return { fontFamily, letterSpacing: `${letterSpacingEm}em`, lineHeight, backgroundColor: bg };
}

export default function ReadingPage() {
  const upp = getUpp();
  const pdfInputRef = useRef(null);
  const docxInputRef = useRef(null);
  const scrollRef = useRef(null);
  const lineRefs = useRef([]);

  const [sourceText, setSourceText] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState(0);
  const [loadKind, setLoadKind] = useState("");
  const [error, setError] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [activeLine, setActiveLine] = useState(0);

  const readStyle = useMemo(
    () => (upp && typeof upp === "object" ? readingStylesFromUpp(upp) : null),
    [upp]
  );

  const lines = useMemo(
    () => sourceText.split(/\r?\n/),
    [sourceText]
  );

  useEffect(() => {
    lineRefs.current = lineRefs.current.slice(0, lines.length);
  }, [lines.length]);

  useEffect(() => {
    setActiveLine((i) =>
      lines.length === 0 ? 0 : Math.min(Math.max(0, i), lines.length - 1)
    );
  }, [lines.length]);

  useEffect(() => {
    if (!focusMode || lines.length === 0) return;
    const root = scrollRef.current;
    if (!root) return;

    const obs = new IntersectionObserver(
      (entries) => {
        let bestEl = null;
        let best = 0;
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= best) {
            best = e.intersectionRatio;
            bestEl = e.target;
          }
        }
        if (bestEl) {
          const idx = Number(bestEl.getAttribute("data-line-index"));
          if (!Number.isNaN(idx)) setActiveLine(idx);
        }
      },
      {
        root,
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1],
      }
    );

    for (const el of lineRefs.current) {
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [focusMode, lines.length, sourceText]);

  const runLoad = useCallback(async (kind, file) => {
    setError(null);
    setLoadKind(kind);
    try {
      const text =
        kind === "pdf" ? await extractPdfPlainText(file) : await extractDocxPlainText(file);
      setSourceText(text);
      if (kind === "pdf") {
        setPdfFile(file);
      } else {
        setPdfFile(null);
        setPdfPages(0);
      }
    } catch (e) {
      console.error(e);
      setError(
        kind === "pdf"
          ? "PDF okunamadı. Dosya bozuk olabilir veya şifreliyse açılamaz."
          : "DOCX okunamadı. Dosyayı kontrol edin."
      );
      if (kind === "pdf") {
        setPdfFile(null);
        setPdfPages(0);
      }
    } finally {
      setLoadKind("");
    }
  }, []);

  const onPickPdf = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      runLoad("pdf", file);
    },
    [runLoad]
  );

  const onPickDocx = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      runLoad("docx", file);
    },
    [runLoad]
  );

  const onKeyDownPanel = useCallback(
    (e) => {
      if (!focusMode || lines.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveLine((i) => {
          const n = Math.min(lines.length - 1, i + 1);
          requestAnimationFrame(() =>
            lineRefs.current[n]?.scrollIntoView({ block: "nearest" })
          );
          return n;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveLine((i) => {
          const n = Math.max(0, i - 1);
          requestAnimationFrame(() =>
            lineRefs.current[n]?.scrollIntoView({ block: "nearest" })
          );
          return n;
        });
      }
    },
    [focusMode, lines.length]
  );

  if (!upp || typeof upp !== "object" || !readStyle) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-2xl font-semibold text-stone-900">Okuma modu</h1>
        <p className="mt-3 leading-relaxed text-stone-700">
          Okuma ayarları için önce profil oluşturmanız gerekir.
        </p>
        <Link
          to="/kalibrasyon"
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white"
        >
          Kalibrasyona git
        </Link>
        <Link
          to="/"
          className="mt-4 block text-emerald-900 underline decoration-2 underline-offset-4"
        >
          Ana sayfa
        </Link>
      </main>
    );
  }

  const busy = loadKind !== "";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-600">Okuma modu</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">
            Metnini Yükle ve Oku
          </h1>
        </div>
        <Link
          to="/profil"
          className="text-sm font-medium text-emerald-900 underline decoration-2 underline-offset-4"
        >
          Profil özetine dön
        </Link>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-sm font-medium text-stone-800">Odak modu</span>
          <button
            type="button"
            role="switch"
            aria-checked={focusMode}
            aria-label={focusMode ? "Odak modu açık" : "Odak modu kapalı"}
            onClick={() => setFocusMode((v) => !v)}
            className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${
              focusMode ? "bg-emerald-600" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-1 left-1 size-7 rounded-full bg-white shadow transition-transform ${
                focusMode ? "translate-x-7" : ""
              }`}
            />
          </button>
        </label>
        <p className="text-sm text-stone-600 md:text-right">
          Odak açıkken ortadaki satır vurgulanır; satıra tıklayın veya ok tuşlarını kullanın.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => pdfInputRef.current?.click()}
          className="rounded-xl border-2 border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 disabled:opacity-50"
        >
          PDF yükle
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => docxInputRef.current?.click()}
          className="rounded-xl border-2 border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 disabled:opacity-50"
        >
          DOCX yükle
        </button>
        {busy ? (
          <span className="self-center text-sm text-stone-600">Metin çıkarılıyor…</span>
        ) : null}
      </div>

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onPickPdf}
      />
      <input
        ref={docxInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={onPickDocx}
      />

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      <label className="mt-6 block">
        <span className="text-sm font-semibold text-stone-800">
          Metni buraya yapıştırın veya düzenleyin
        </span>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          rows={6}
          className="mt-2 w-full resize-y rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-inner outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
          placeholder="Metninizi yazın veya yapıştırın. PDF veya DOCX de yükleyebilirsiniz."
        />
      </label>

      {pdfFile ? (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-800">PDF önizleme</h2>
          <p className="mt-1 text-xs text-stone-600">
            react-pdf ile ilk sayfa (metin tüm sayfalardan çıkarıldı).
          </p>
          <div className="mt-3 overflow-auto rounded-xl bg-stone-100 p-2">
            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages }) => setPdfPages(numPages)}
              onLoadError={() => setError("PDF önizlemesi yüklenemedi.")}
              loading={
                <p className="p-4 text-sm text-stone-600">PDF yükleniyor…</p>
              }
            >
              <Page
                pageNumber={1}
                width={Math.min(320, typeof window !== "undefined" ? window.innerWidth - 80 : 320)}
                renderTextLayer
                renderAnnotationLayer
              />
            </Document>
          </div>
          {pdfPages > 0 ? (
            <p className="mt-2 text-xs text-stone-500">
              Toplam {pdfPages} sayfa — metin tüm sayfalar birleştirildi.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-stone-700">
        <span className="font-semibold">Renk anahtarı:</span>
        {(
          [
            ["b", "mavi"],
            ["d", "kırmızı"],
            ["p", "turuncu"],
            ["q", "mor"],
          ]
        ).map(([L, tr]) => (
          <span key={L} className="inline-flex items-center gap-1">
            <span
              className="font-bold"
              style={{ color: READING_LETTER_COLORS[L] }}
            >
              {L}
            </span>
            <span>= {tr}</span>
          </span>
        ))}
      </div>

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-stone-800">UPP ile biçimlendirilmiş metin</h2>
        <div
          ref={scrollRef}
          tabIndex={0}
          role="article"
          aria-label="Okuma alanı"
          onKeyDown={onKeyDownPanel}
          className="mt-2 max-h-[min(70vh,560px)] overflow-y-auto rounded-2xl border border-stone-200 px-5 py-4 shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          style={{
            ...readStyle,
            color: "#1c1917",
          }}
        >
          {sourceText.trim() === "" ? (
            <p className="text-stone-500">
              Metin eklediğinizde burada profil ayarlarınıza göre görünecek.
            </p>
          ) : (
            lines.map((line, i) => {
              const active = focusMode && i === activeLine;
              return (
                <p
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  data-line-index={i}
                  onClick={() => focusMode && setActiveLine(i)}
                  className={`my-1 rounded-r-md py-1 transition-colors ${
                    active
                      ? "bg-amber-200/90 border-l-4 border-amber-600 pl-3 -ml-1 shadow-sm"
                      : "border-l-4 border-transparent pl-3 -ml-1"
                  } ${focusMode ? "cursor-pointer" : ""}`}
                >
                  {colorizeLineToParts(line, i)}
                </p>
              );
            })
          )}
        </div>
      </section>

      <Link
        to="/"
        className="mt-8 inline-block text-sm text-emerald-900 underline decoration-2 underline-offset-4"
      >
        Ana sayfa
      </Link>
    </main>
  );
}
