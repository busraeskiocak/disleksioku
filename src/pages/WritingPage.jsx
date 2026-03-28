import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FONT_OPTIONS } from "../lib/upp.js";
import { getUpp } from "../utils/storage.js";

function writingStylesFromUpp(upp) {
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

const primaryBtn =
  "rounded-2xl bg-emerald-700 px-5 py-4 text-center text-lg font-semibold text-white shadow-md shadow-emerald-900/15 outline-none ring-emerald-800 ring-offset-2 ring-offset-stone-100 transition hover:bg-emerald-800 focus-visible:ring-2 active:scale-[0.99]";

export default function WritingPage() {
  const upp = getUpp();
  const writeStyle = useMemo(
    () => (upp && typeof upp === "object" ? writingStylesFromUpp(upp) : null),
    [upp]
  );
  const [text, setText] = useState("");

  if (!upp || typeof upp !== "object" || !writeStyle) {
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <header className="mb-6">
        <p className="text-sm font-medium text-stone-600">Yazma modu</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">
          Yazınızı buraya yazın
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Profilinizdeki yazı tipi, satır aralığı ve arka plan burada uygulanır.
        </p>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck
        className="min-h-[min(70vh,32rem)] w-full resize-y rounded-2xl border-2 border-stone-200 p-4 text-lg text-stone-900 shadow-inner outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
        style={{
          fontFamily: writeStyle.fontFamily,
          letterSpacing: writeStyle.letterSpacing,
          lineHeight: writeStyle.lineHeight,
          backgroundColor: writeStyle.backgroundColor,
        }}
        placeholder="Buraya yazmaya başlayın…"
        aria-label="Yazı alanı"
      />

      <p className="mt-3 text-sm text-stone-500">
        {text.length > 0 ? (
          <>
            <span className="font-medium text-stone-600">
              {text.trim()
                ? text.trim().split(/\s+/).filter(Boolean).length
                : 0}{" "}
              kelime
            </span>
            <span className="mt-1 block">
              Metin yalnızca bu oturumda kalır; sunucuya kaydedilmez.
            </span>
          </>
        ) : (
          "Metin yalnızca bu oturumda kalır; sunucuya kaydedilmez."
        )}
      </p>
    </main>
  );
}
