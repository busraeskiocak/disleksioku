import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FixedBackButton from "../components/FixedBackButton.jsx";
import DocumentKebabMenu from "../components/DocumentKebabMenu.jsx";
import WordLikeWorkbench from "../components/WordLikeWorkbench.jsx";
import { stripHtmlToPlainText } from "../lib/readingText.js";
import { canBrowserGoBack } from "../utils/historyNav.js";
import { getUpp } from "../utils/storage.js";
import {
  getWritingDocuments,
  removeWritingDocument,
} from "../utils/writingHistory.js";

const primaryBtn =
  "rounded-2xl bg-emerald-700 px-5 py-4 text-center text-lg font-semibold text-white shadow-md shadow-emerald-900/15 outline-none ring-emerald-800 ring-offset-2 ring-offset-stone-100 transition hover:bg-emerald-800 focus-visible:ring-2 active:scale-[0.99]";

function formatDocDate(iso) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** @param {string} html */
function previewWritingHtml(html, maxLen = 120) {
  const plain = stripHtmlToPlainText(html).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  const chars = [...plain];
  return chars.slice(0, maxLen).join("") + (chars.length > maxLen ? "…" : "");
}

export default function WritingPage() {
  const navigate = useNavigate();
  const upp = getUpp();

  const goBackOrHome = useCallback(() => {
    if (canBrowserGoBack()) navigate(-1);
    else navigate("/");
  }, [navigate]);

  const [screen, setScreen] = useState(/** @type {"list" | "editor"} */ ("list"));
  const [documents, setDocuments] = useState(() => getWritingDocuments());
  const [activeWritingId, setActiveWritingId] = useState(
    /** @type {string | null} */ (null)
  );

  const refreshDocuments = useCallback(() => {
    setDocuments(getWritingDocuments());
  }, []);

  useEffect(() => {
    if (screen === "list") refreshDocuments();
  }, [screen, refreshDocuments]);

  const activeDoc = useMemo(
    () =>
      activeWritingId
        ? documents.find((d) => d.id === activeWritingId) ?? null
        : null,
    [documents, activeWritingId]
  );

  const openNew = useCallback(() => {
    setActiveWritingId(null);
    setScreen("editor");
  }, []);

  const openDoc = useCallback((doc) => {
    setActiveWritingId(doc.id);
    setScreen("editor");
  }, []);

  const handleWritingCommitted = useCallback(
    (id) => {
      setActiveWritingId(id);
      refreshDocuments();
    },
    [refreshDocuments]
  );

  const handleDeleteWritingDoc = useCallback(
    (id) => {
      removeWritingDocument(id);
      refreshDocuments();
      if (activeWritingId === id) {
        setActiveWritingId(null);
        setScreen("list");
      }
    },
    [activeWritingId, refreshDocuments]
  );

  const backToList = useCallback(() => {
    setScreen("list");
    setActiveWritingId(null);
  }, []);

  if (!upp || typeof upp !== "object") {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-2xl font-semibold text-stone-900">Yazma modu</h1>
        <p className="mt-3 leading-relaxed text-stone-700">
          Yazma alanını profil ayarlarınızla göstermek için önce kalibrasyonu
          tamamlayın.
        </p>
        <Link to="/kalibrasyon" className={`mt-6 inline-flex ${primaryBtn}`}>
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

  if (screen === "editor") {
    return (
      <>
        <FixedBackButton onClick={backToList} aria-label="Kayıtlı belgelere dön" />
        <WordLikeWorkbench
          key={activeWritingId ?? "writing-new"}
          upp={upp}
          mode="writing"
          initialTitle={activeDoc?.title ?? "Adsız belge"}
          initialBody={activeDoc?.html ?? ""}
          colorizePlainOnLoad={false}
          writingDocumentId={activeWritingId}
          onWritingDocumentCommitted={handleWritingCommitted}
        />
      </>
    );
  }

  return (
    <>
      <FixedBackButton onClick={goBackOrHome} aria-label="Geri" />
      <main className="relative mx-auto min-h-screen max-w-lg px-4 pb-28 pt-6">
        <header className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-stone-600">Yazma modu</p>
            <h1 className="mt-1 text-2xl font-semibold text-stone-900">
              Kayıtlı Belgeler
            </h1>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="shrink-0 rounded-xl border border-emerald-700 bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800"
          >
            Yeni belge
          </button>
        </header>

        {documents.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-stone-50/90 px-6 py-12 text-center">
            <p className="text-base font-medium text-stone-700">
              Henüz kayıtlı belge yok
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Yeni belge oluşturup kaydettiğinizde burada listelenir.
            </p>
            <button
              type="button"
              onClick={openNew}
              className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Yeni belge
            </button>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {documents.map((doc) => (
              <li key={doc.id}>
                <div className="flex items-stretch gap-1 rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-emerald-400 hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => openDoc(doc)}
                    className="min-w-0 flex-1 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    <h2 className="line-clamp-2 text-base font-semibold text-stone-900">
                      {doc.title}
                    </h2>
                    <p className="mt-1.5 text-xs tabular-nums text-stone-500">
                      {formatDocDate(doc.savedAt)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone-600">
                      {previewWritingHtml(doc.html) || "—"}
                    </p>
                  </button>
                  <DocumentKebabMenu
                    menuId={`writing-doc-menu-${doc.id}`}
                    onDelete={() => handleDeleteWritingDoc(doc.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/"
          className="mt-8 inline-block text-sm text-emerald-900 underline decoration-2 underline-offset-4"
        >
          Ana sayfa
        </Link>
      </main>
    </>
  );
}
