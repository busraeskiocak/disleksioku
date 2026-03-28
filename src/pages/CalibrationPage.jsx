import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BACKGROUND_PRESETS,
  FONT_OPTIONS,
  buildUpp,
} from "../lib/upp.js";
import { setUpp } from "../utils/storage.js";

const STEP_COUNT = 4;

const PAIRS = [
  { key: "bd", a: "b", b: "d", title: "b ve d" },
  { key: "pq", a: "p", b: "q", title: "p ve q" },
  { key: "mn", a: "m", b: "n", title: "m ve n" },
];

/** @type {const} */
const CONFUSION_VALUES = ["a", "b", "both", "none"];

const CONFUSION_LABELS = {
  a: (letter) => `Daha çok “${letter}” harfine takılıyorum`,
  b: (letter) => `Daha çok “${letter}” harfine takılıyorum`,
  both: () => "İkisini birbirine karıştırıyorum",
  none: () => "Bu çiftte genelde sorun yaşamıyorum",
};

function initialConfusion() {
  return { bd: null, pq: null, mn: null };
}

export default function CalibrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [letterConfusion, setLetterConfusion] = useState(initialConfusion);
  const [fontId, setFontId] = useState(null);
  const [backgroundId, setBackgroundId] = useState(null);
  const [letterSpacingEm, setLetterSpacingEm] = useState(0.06);
  const [lineHeight, setLineHeight] = useState(1.65);

  const step1Complete = useMemo(
    () =>
      letterConfusion.bd != null &&
      letterConfusion.pq != null &&
      letterConfusion.mn != null,
    [letterConfusion]
  );

  const canGoNext = useMemo(() => {
    if (step === 0) return step1Complete;
    if (step === 1) return fontId != null;
    if (step === 2) return backgroundId != null;
    return true;
  }, [step, step1Complete, fontId, backgroundId]);

  const setPair = useCallback((pairKey, value) => {
    setLetterConfusion((prev) => ({ ...prev, [pairKey]: value }));
  }, []);

  const finish = useCallback(() => {
    if (
      !step1Complete ||
      fontId == null ||
      backgroundId == null
    ) {
      return;
    }

    const confusion = {
      bd: normalizeConfusion("bd", letterConfusion.bd),
      pq: normalizeConfusion("pq", letterConfusion.pq),
      mn: normalizeConfusion("mn", letterConfusion.mn),
    };

    const upp = buildUpp({
      letterConfusion: confusion,
      fontId,
      backgroundId,
      letterSpacingEm,
      lineHeight,
    });
    setUpp(upp);
    navigate("/profil", { replace: true });
  }, [
    step1Complete,
    fontId,
    backgroundId,
    letterConfusion,
    letterSpacingEm,
    lineHeight,
    navigate,
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-10 pb-24">
      <header className="mb-8">
        <p className="text-sm font-medium text-stone-600">Kalibrasyon</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">
          Okuma tercihleri
        </h1>
        <p className="mt-2 text-stone-700 leading-relaxed">
          Bu test yaklaşık iki dakika sürer. Her adımda size en uygun seçeneği
          işaretleyin.
        </p>
        <div
          className="mt-5 h-2 overflow-hidden rounded-full bg-stone-200"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-label={`Aşama ${step + 1} / ${STEP_COUNT}`}
        >
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-300 ease-out"
            style={{
              width: `${((step + 1) / STEP_COUNT) * 100}%`,
            }}
          />
        </div>
        <p className="mt-2 text-sm text-stone-600">
          Aşama {step + 1} / {STEP_COUNT}
        </p>
      </header>

      {step === 0 ? (
        <section className="space-y-10" aria-labelledby="step-letter-title">
          <h2 id="step-letter-title" className="sr-only">
            Harf karışıklığı
          </h2>
          {PAIRS.map((pair) => (
            <fieldset
              key={pair.key}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <legend className="text-lg font-semibold text-stone-900 px-1">
                “{pair.title}” çifti
              </legend>
              <p className="mt-1 text-sm text-stone-600">
                Okurken hangi durum size daha yakın?
              </p>
              <div
                className="mt-4 flex justify-center gap-4 text-6xl font-semibold tracking-wide text-stone-800 sm:text-7xl"
                aria-hidden
              >
                <span>{pair.a}</span>
                <span className="text-stone-300">·</span>
                <span>{pair.b}</span>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                {CONFUSION_VALUES.map((val) => {
                  const id = `${pair.key}-${val}`;
                  const checked = letterConfusion[pair.key] === val;
                  let label = "";
                  if (val === "a")
                    label = CONFUSION_LABELS.a(pair.a);
                  else if (val === "b")
                    label = CONFUSION_LABELS.b(pair.b);
                  else label = CONFUSION_LABELS[val]();

                  return (
                    <label
                      key={val}
                      htmlFor={id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                        checked
                          ? "border-emerald-700 bg-emerald-50"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name={pair.key}
                        className="mt-1 size-4 shrink-0 accent-emerald-700"
                        checked={checked}
                        onChange={() => setPair(pair.key, val)}
                      />
                      <span className="text-base leading-snug text-stone-800">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </section>
      ) : null}

      {step === 1 ? (
        <section aria-labelledby="step-font-title">
          <h2 id="step-font-title" className="text-lg font-semibold text-stone-900">
            Font tercihi
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Aşağıdaki örnek cümleyi hangi yazı tipinde daha rahat okuyorsunuz?
          </p>
          <div className="mt-5 flex flex-col gap-4">
            {FONT_OPTIONS.map((f) => {
              const selected = fontId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFontId(f.id)}
                  className={`rounded-2xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                    selected
                      ? "border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700/30"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <span className="text-sm font-medium text-stone-600">
                    {f.label}
                  </span>
                  <p
                    className="mt-3 text-lg leading-relaxed text-stone-900"
                    style={{ fontFamily: f.fontFamily }}
                  >
                    Kitap kuşları uçuran sihirli kelimelerdir.
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="step-bg-title">
          <h2 id="step-bg-title" className="text-lg font-semibold text-stone-900">
            Arka plan rengi
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Uzun süre okurken gözünüze en rahat gelen arka plan hangisi?
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
            {Object.values(BACKGROUND_PRESETS).map((bg) => {
              const selected = backgroundId === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBackgroundId(bg.id)}
                  className={`flex flex-col overflow-hidden rounded-2xl border-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                    selected
                      ? "border-emerald-700 ring-1 ring-emerald-700/30"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <span
                    className="h-16 w-full border-b border-stone-200/80"
                    style={{ backgroundColor: bg.color }}
                  />
                  <span className="bg-white px-3 py-2 text-sm font-medium text-stone-800">
                    {bg.label}
                  </span>
                </button>
              );
            })}
          </div>
          {backgroundId ? (
            <div
              className="mt-6 rounded-2xl border border-stone-200 p-4"
              style={{
                backgroundColor: BACKGROUND_PRESETS[backgroundId].color,
              }}
            >
              <p className="text-base leading-relaxed text-stone-900">
                Önizleme: Bu metin seçtiğiniz renk üzerinde nasıl görünüyor?
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 3 ? (
        <section aria-labelledby="step-spacing-title">
          <h2
            id="step-spacing-title"
            className="text-lg font-semibold text-stone-900"
          >
            Harf ve satır aralığı
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Kaydırıcıları oynatarak size en uygun aralığı bulun.
          </p>
          <div className="mt-6 space-y-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div>
              <label
                htmlFor="letter-space"
                className="flex items-center justify-between text-sm font-medium text-stone-800"
              >
                Harf aralığı
                <span className="tabular-nums text-stone-600">
                  {(letterSpacingEm * 100).toFixed(0)}%
                </span>
              </label>
              <input
                id="letter-space"
                type="range"
                min={0}
                max={0.14}
                step={0.01}
                value={letterSpacingEm}
                onChange={(e) =>
                  setLetterSpacingEm(Number.parseFloat(e.target.value))
                }
                className="mt-3 w-full accent-emerald-700"
              />
              <div className="mt-1 flex justify-between text-xs text-stone-500">
                <span>Dar</span>
                <span>Geniş</span>
              </div>
            </div>
            <div>
              <label
                htmlFor="line-height"
                className="flex items-center justify-between text-sm font-medium text-stone-800"
              >
                Satır aralığı
                <span className="tabular-nums text-stone-600">
                  {lineHeight.toFixed(2)}
                </span>
              </label>
              <input
                id="line-height"
                type="range"
                min={1.35}
                max={2.1}
                step={0.05}
                value={lineHeight}
                onChange={(e) =>
                  setLineHeight(Number.parseFloat(e.target.value))
                }
                className="mt-3 w-full accent-emerald-700"
              />
              <div className="mt-1 flex justify-between text-xs text-stone-500">
                <span>Sıkı</span>
                <span>Aralıklı</span>
              </div>
            </div>
            <div
              className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-stone-900"
              style={{ letterSpacing: `${letterSpacingEm}em`, lineHeight }}
            >
              Örnek paragraf: Her kelime bir nefes gibi durur. Satırlar arasında
              nefes almak için yeterli boşluk, harfler arasında ise netlik
              ararız.
            </div>
          </div>
        </section>
      ) : null}

      <footer className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-stone-100/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base font-medium text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              Geri
            </button>
          ) : (
            <Link
              to="/"
              className="rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base font-medium text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              Vazgeç
            </Link>
          )}
          <div className="min-w-0 flex-1" />
          {step < STEP_COUNT - 1 ? (
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setStep((s) => Math.min(STEP_COUNT - 1, s + 1))}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
            >
              İleri
            </button>
          ) : (
            <button
              type="button"
              disabled={!canGoNext}
              onClick={finish}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
            >
              Bitir ve kaydet
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

/**
 * UPP içinde tutarlı harf anahtarları: bd → b|d, pq → p|q, mn → m|n
 * @param {'bd'|'pq'|'mn'} pairKey
 * @param {string|null} raw — 'a' | 'b' | 'both' | 'none'
 */
function normalizeConfusion(pairKey, raw) {
  const map = {
    bd: { a: "b", b: "d" },
    pq: { a: "p", b: "q" },
    mn: { a: "m", b: "n" },
  };
  const letters = map[pairKey];
  if (raw === "a") return letters.a;
  if (raw === "b") return letters.b;
  if (raw === "both" || raw === "none") return raw;
  return "none";
}
