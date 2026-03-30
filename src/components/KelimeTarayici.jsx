import { useEffect, useMemo, useRef, useState } from "react";
import mammoth from "mammoth";
import { getUpp, setUpp } from "../utils/storage.js";
import PdfReadingWorkbench from "./PdfReadingWorkbench.jsx";

const STORE_KEY = "lexilens_word_scanner_v1";
const WORD_SPLIT_RE = /[A-Za-zÇĞİIÖŞÜçğıöşü0-9]+/g;

export default function KelimeTarayici() {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [docKind, setDocKind] = useState(/** @type {"pdf" | "docx" | null} */ (null));
  const [docName, setDocName] = useState("");
  const [docxHtml, setDocxHtml] = useState("");
  const [pdfFile, setPdfFile] = useState(/** @type {Uint8Array | null} */ (null));
  const [wordRows, setWordRows] = useState(/** @type {{ word: string, readAs: string }[]} */ ([]));

  const [candidateWords, setCandidateWords] = useState(/** @type {string[]} */ ([]));
  const [pickedWord, setPickedWord] = useState("");
  const [readAs, setReadAs] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      setDocKind(s?.docKind === "pdf" || s?.docKind === "docx" ? s.docKind : null);
      setDocName(typeof s?.docName === "string" ? s.docName : "");
      setDocxHtml(typeof s?.docxHtml === "string" ? s.docxHtml : "");
      if (typeof s?.pdfBase64 === "string" && s.pdfBase64) {
        const bin = atob(s.pdfBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
        setPdfFile(bytes);
      }
      if (Array.isArray(s?.wordRows)) {
        setWordRows(
          s.wordRows
            .filter((r) => r && typeof r.word === "string")
            .map((r) => ({ word: r.word, readAs: typeof r.readAs === "string" ? r.readAs : "" }))
        );
      }
    } catch {
      // ignore broken cache
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let pdfBase64 = "";
    if (pdfFile?.length) {
      let s = "";
      for (const b of pdfFile) s += String.fromCharCode(b);
      pdfBase64 = btoa(s);
    }
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ docKind, docName, docxHtml, pdfBase64, wordRows })
    );
  }, [docKind, docName, docxHtml, pdfFile, wordRows]);

  const compareLeftMarkup = useMemo(
    () => (docxHtml?.trim() ? docxHtml : "<p><br></p>"),
    [docxHtml]
  );

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    setBusy(true);
    setErrorText("");
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".docx")) {
        const buffer = await file.arrayBuffer();
        const res = await mammoth.convertToHtml({ arrayBuffer: buffer });
        setDocKind("docx");
        setDocName(file.name);
        setDocxHtml(res.value ?? "");
        setPdfFile(null);
      } else if (lower.endsWith(".pdf")) {
        const buffer = await file.arrayBuffer();
        setDocKind("pdf");
        setDocName(file.name);
        setDocxHtml("");
        setPdfFile(new Uint8Array(buffer));
      } else {
        throw new Error("Yalnızca PDF veya DOCX yükleyebilirsiniz.");
      }
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Belge açılamadı.");
    } finally {
      setBusy(false);
    }
  }

  function onDocumentMouseUp() {
    if (typeof window === "undefined") return;
    const selected = window.getSelection()?.toString().trim() ?? "";
    if (!selected) return;
    const words = Array.from(new Set((selected.match(WORD_SPLIT_RE) ?? []).map((w) => w.trim())))
      .filter(Boolean);
    if (!words.length) return;
    setCandidateWords(words);
    setPickedWord(words[0]);
    setReadAs("");
    window.getSelection()?.removeAllRanges();
  }

  function addWord() {
    if (!pickedWord) return;
    setWordRows((prev) => [...prev, { word: pickedWord, readAs }]);
    setCandidateWords([]);
    setPickedWord("");
    setReadAs("");
  }

  function closePopup() {
    setCandidateWords([]);
    setPickedWord("");
    setReadAs("");
  }

  function saveProfile() {
    const upp = getUpp();
    if (!upp || typeof upp !== "object") return;
    const existing = Array.isArray(upp.difficultWords) ? upp.difficultWords : [];
    const merged = Array.from(new Set([...existing, ...wordRows.map((r) => r.word)]));
    setUpp({ ...upp, difficultWords: merged });
  }

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 pb-8 pt-4 sm:px-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={onPickFile}
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Kelime Tarayıcı</h1>
          <p className="text-sm text-stone-600">{docName || "Henüz belge yüklenmedi."}</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy ? "Yükleniyor..." : "Belge Yükle"}
        </button>
      </div>
      {errorText ? <p className="mb-3 text-sm text-red-700">{errorText}</p> : null}

      <div className="grid min-h-[72vh] grid-cols-10 gap-4">
        <section
          className="col-span-7 min-h-0 overflow-auto rounded-2xl border border-stone-200 bg-white p-4"
          onMouseUp={onDocumentMouseUp}
        >
          {docKind == null ? (
            <p className="text-sm text-stone-500">
              PDF veya DOCX yükleyin. Belge sol panelde orijinal görünümüyle açılır.
            </p>
          ) : docKind === "docx" ? (
            <div
              className="min-h-0 min-w-0 flex-1 overflow-x-auto bg-white"
              style={{
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div className="flex w-full shrink-0 flex-col items-center px-1 py-2 sm:px-2">
                <div className="compare-original-pane w-full max-w-full">
                  <div className="relative mx-auto w-full max-w-[920px] rounded-xl border border-stone-200 bg-white shadow-sm">
                    <div className="relative z-[5] p-4 sm:p-6">
                      <div
                        className="word-editor-surface word-editor-surface--rich relative z-[6] w-full max-w-full bg-transparent select-text text-stone-900 outline-none"
                        style={{
                          fontFamily: "Times New Roman, serif",
                          letterSpacing: "normal",
                          lineHeight: "normal",
                          backgroundColor: "white",
                          color: "black",
                        }}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: compareLeftMarkup }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : pdfFile ? (
            <div
              className="min-h-0 min-w-0 flex-1 overflow-x-auto bg-white"
              style={{
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div className="flex w-full shrink-0 flex-col items-center p-3">
                <PdfReadingWorkbench
                  fileBytes={pdfFile}
                  upp={{}}
                  immersiveReading={false}
                  variant="original"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-500">PDF verisi bulunamadı.</p>
          )}
        </section>

        <aside className="col-span-3 flex min-h-0 flex-col rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-stone-900">Kelime Listesi</h2>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-stone-200">
            <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
              <span>Kelime</span>
              <span>Nasıl Okudum</span>
            </div>
            {wordRows.length === 0 ? (
              <p className="px-3 py-3 text-sm text-stone-500">Henüz kelime eklenmedi.</p>
            ) : (
              wordRows.map((row, idx) => (
                <div
                  key={`word-row-${idx}`}
                  className="grid w-full grid-cols-2 gap-2 border-b border-stone-100 px-3 py-2 text-left text-sm"
                >
                  <span className="font-medium text-stone-900">{row.word}</span>
                  <span className="text-stone-700">{row.readAs || "—"}</span>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={saveProfile}
            className="mt-3 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Profile Kaydet
          </button>
        </aside>
      </div>

      {candidateWords.length > 0 ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Seçilen Kelimeler
            </h3>
            <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-stone-200 p-2">
              <div className="flex flex-wrap gap-2">
                {candidateWords.map((w) => (
                  <button
                    key={`candidate-${w}`}
                    type="button"
                    onClick={() => setPickedWord(w)}
                    className={`rounded-lg px-2.5 py-1 text-sm ${
                      pickedWord === w
                        ? "bg-emerald-700 text-white"
                        : "bg-stone-100 text-stone-800 hover:bg-stone-200"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-sm text-stone-700">
              Seçilen: <span className="font-semibold text-stone-900">{pickedWord || "—"}</span>
            </p>
            <label className="mt-3 block text-sm font-medium text-stone-800">
              Nasıl okudum?
              <input
                value={readAs}
                onChange={(e) => setReadAs(e.target.value)}
                placeholder="Boş bırakabilirsiniz"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePopup}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={addWord}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Listeye Ekle
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
