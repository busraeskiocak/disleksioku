import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FLUENCY_PARAGRAPH,
  countWordsTurkish,
} from "../data/fluencyParagraph.js";
import {
  PHONOLOGICAL_TIME_SEC,
  pickPhonologicalSession,
} from "../data/phonologicalQuiz.js";
import { buildSyllableQuizSession } from "../data/syllableQuizBank.js";
import {
  WORD_RECOG_TIME_SEC,
  pickWordRecognitionSession,
} from "../data/wordRecognitionQuiz.js";
import {
  WM_DISPLAY_SEC,
  WORKING_MEMORY_ALPHABET,
  generateWorkingMemoryTrials,
} from "../data/workingMemorySequences.js";
import {
  AUDITORY_GROUPS,
  emptyCategoryState,
  VISUAL_GROUPS,
  VOWEL_GROUPS,
} from "../lib/dyslexiaGroups.js";
import {
  PARAGRAPH_POOL,
  pickRandomParagraphs,
} from "../lib/calibrationParagraphs.js";
import {
  BACKGROUND_PRESETS,
  FONT_OPTIONS,
  buildUpp,
} from "../lib/upp.js";
import { setUpp } from "../utils/storage.js";

const STEP_COUNT = 12;

/** @type {const} */
const PAIR_OPTION_VALUES = ["a", "b", "both", "none"];

const PAIR_OPTION_LABELS = {
  a: (letter) => `Daha çok “${letter}” harfine takılıyorum`,
  b: (letter) => `Daha çok “${letter}” harfine takılıyorum`,
  both: () => "İkisini birbirine karıştırıyorum",
  none: () => "Bu çiftte genelde sorun yaşamıyorum",
};

export default function CalibrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [visual, setVisual] = useState(() => emptyCategoryState(VISUAL_GROUPS));
  const [auditory, setAuditory] = useState(() =>
    emptyCategoryState(AUDITORY_GROUPS)
  );
  const [vowel, setVowel] = useState(() => emptyCategoryState(VOWEL_GROUPS));
  const [syllableQuiz, setSyllableQuiz] = useState(() => {
    const session = buildSyllableQuizSession(5);
    return { session, answers: session.map(() => null) };
  });

  const [phonological, setPhonological] = useState(() => ({
    session: pickPhonologicalSession(),
    index: 0,
    results: [],
  }));
  const [phonoTimeLeft, setPhonoTimeLeft] = useState(PHONOLOGICAL_TIME_SEC);
  const phonoQuestionStartedAt = useRef(0);

  const [wordRec, setWordRec] = useState(() => ({
    session: pickWordRecognitionSession(8),
    index: 0,
    results: [],
  }));
  const [wordRecTimeLeft, setWordRecTimeLeft] = useState(WORD_RECOG_TIME_SEC);
  const wordRecQuestionStartedAt = useRef(0);

  const fluencyWordCount = useMemo(
    () => countWordsTurkish(FLUENCY_PARAGRAPH.text),
    []
  );
  const [fluency, setFluency] = useState(() => ({
    phase: "intro",
    startedAt: null,
    endedAt: null,
  }));

  const [wm, setWm] = useState(() => ({
    trials: generateWorkingMemoryTrials(),
    trialIndex: 0,
    phase: /** @type {"ready" | "show" | "input"} */ ("ready"),
    results: [],
  }));
  const [wmInput, setWmInput] = useState("");

  const [fontId, setFontId] = useState(null);
  const [backgroundId, setBackgroundId] = useState(null);
  const [letterSpacingEm, setLetterSpacingEm] = useState(0.06);
  const [lineHeight, setLineHeight] = useState(1.65);
  const [readingParagraphs] = useState(() =>
    pickRandomParagraphs(PARAGRAPH_POOL, 5)
  );
  const [markedWordKeys, setMarkedWordKeys] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step]);

  const visualComplete = useMemo(
    () => VISUAL_GROUPS.every((g) => visual[g.key] != null),
    [visual]
  );
  const auditoryComplete = useMemo(
    () => AUDITORY_GROUPS.every((g) => auditory[g.key] != null),
    [auditory]
  );
  const vowelComplete = useMemo(
    () => VOWEL_GROUPS.every((g) => vowel[g.key] != null),
    [vowel]
  );
  const syllableComplete = useMemo(
    () => syllableQuiz.answers.every((a) => a !== null),
    [syllableQuiz.answers]
  );

  const phonologicalComplete = phonological.index >= phonological.session.length;
  const wordRecComplete = wordRec.index >= wordRec.session.length;
  const fluencyComplete = fluency.phase === "done";
  const wmComplete = wm.results.length >= wm.trials.length;

  const canGoNext = useMemo(() => {
    if (step === 0) return visualComplete;
    if (step === 1) return auditoryComplete;
    if (step === 2) return vowelComplete;
    if (step === 3) return syllableComplete;
    if (step === 4) return phonologicalComplete;
    if (step === 5) return wordRecComplete;
    if (step === 6) return fluencyComplete;
    if (step === 7) return wmComplete;
    if (step === 8) return fontId != null;
    if (step === 9) return backgroundId != null;
    return true;
  }, [
    step,
    visualComplete,
    auditoryComplete,
    vowelComplete,
    syllableComplete,
    phonologicalComplete,
    wordRecComplete,
    fluencyComplete,
    wmComplete,
    fontId,
    backgroundId,
  ]);

  const setVisualPair = useCallback((key, value) => {
    setVisual((prev) => ({ ...prev, [key]: value }));
  }, []);
  const setAuditoryPair = useCallback((key, value) => {
    setAuditory((prev) => ({ ...prev, [key]: value }));
  }, []);
  const setVowelPair = useCallback((key, value) => {
    setVowel((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setSyllableAnswer = useCallback((index, optionIdx) => {
    setSyllableQuiz((prev) => ({
      ...prev,
      answers: prev.answers.map((a, j) => (j === index ? optionIdx : a)),
    }));
  }, []);

  useEffect(() => {
    if (step !== 4) return;
    if (phonological.index >= phonological.session.length) return;
    const idxAtStart = phonological.index;
    setPhonoTimeLeft(PHONOLOGICAL_TIME_SEC);
    const start = Date.now();
    phonoQuestionStartedAt.current = start;
    const tick = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, PHONOLOGICAL_TIME_SEC - elapsedSec);
      setPhonoTimeLeft(left);
      if (elapsedSec >= PHONOLOGICAL_TIME_SEC) {
        clearInterval(tick);
        setPhonological((prev) => {
          if (prev.index !== idxAtStart) return prev;
          if (prev.index >= prev.session.length) return prev;
          const q = prev.session[prev.index];
          const responseTimeMs = Date.now() - phonoQuestionStartedAt.current;
          const row = buildPhonoRow(q, {
            timedOut: true,
            userAnswer: null,
            isCorrect: false,
            responseTimeMs,
          });
          return {
            ...prev,
            index: prev.index + 1,
            results: [...prev.results, row],
          };
        });
      }
    }, 250);
    return () => clearInterval(tick);
  }, [step, phonological.index, phonological.session.length]);

  const answerPhonoRhyme = useCallback((userSaysRhyme) => {
    setPhonological((prev) => {
      if (prev.index >= prev.session.length) return prev;
      const q = prev.session[prev.index];
      if (q.type !== "rhyme") return prev;
      const isCorrect = userSaysRhyme === q.rhymes;
      const responseTimeMs = Date.now() - phonoQuestionStartedAt.current;
      const row = buildPhonoRow(q, {
        timedOut: false,
        userAnswer: userSaysRhyme,
        isCorrect,
        responseTimeMs,
      });
      return {
        ...prev,
        index: prev.index + 1,
        results: [...prev.results, row],
      };
    });
  }, []);

  const answerPhonoLetter = useCallback((optionIdx) => {
    setPhonological((prev) => {
      if (prev.index >= prev.session.length) return prev;
      const q = prev.session[prev.index];
      if (q.type !== "letterRemove") return prev;
      const isCorrect = optionIdx === q.correctIndex;
      const responseTimeMs = Date.now() - phonoQuestionStartedAt.current;
      const row = buildPhonoRow(q, {
        timedOut: false,
        userAnswer: q.options[optionIdx],
        isCorrect,
        responseTimeMs,
      });
      return {
        ...prev,
        index: prev.index + 1,
        results: [...prev.results, row],
      };
    });
  }, []);

  useEffect(() => {
    if (step !== 5) return;
    if (wordRec.index >= wordRec.session.length) return;
    const idxAtStart = wordRec.index;
    setWordRecTimeLeft(WORD_RECOG_TIME_SEC);
    const start = Date.now();
    wordRecQuestionStartedAt.current = start;
    const tick = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, WORD_RECOG_TIME_SEC - elapsedSec);
      setWordRecTimeLeft(left);
      if (elapsedSec >= WORD_RECOG_TIME_SEC) {
        clearInterval(tick);
        setWordRec((prev) => {
          if (prev.index !== idxAtStart) return prev;
          if (prev.index >= prev.session.length) return prev;
          const q = prev.session[prev.index];
          const responseTimeMs = Date.now() - wordRecQuestionStartedAt.current;
          const row = {
            questionId: q.id,
            timedOut: true,
            userAnswer: null,
            correctIndex: q.correctIndex,
            correctWord: q.options[q.correctIndex],
            isCorrect: false,
            responseTimeMs,
          };
          return {
            ...prev,
            index: prev.index + 1,
            results: [...prev.results, row],
          };
        });
      }
    }, 250);
    return () => clearInterval(tick);
  }, [step, wordRec.index, wordRec.session.length]);

  const answerWordRec = useCallback((optionIdx) => {
    setWordRec((prev) => {
      if (prev.index >= prev.session.length) return prev;
      const q = prev.session[prev.index];
      const isCorrect = optionIdx === q.correctIndex;
      const responseTimeMs = Date.now() - wordRecQuestionStartedAt.current;
      const row = {
        questionId: q.id,
        timedOut: false,
        userAnswer: q.options[optionIdx],
        correctIndex: q.correctIndex,
        correctWord: q.options[q.correctIndex],
        isCorrect,
        responseTimeMs,
      };
      return {
        ...prev,
        index: prev.index + 1,
        results: [...prev.results, row],
      };
    });
  }, []);

  useEffect(() => {
    if (step !== 7) return;
    if (wm.trialIndex >= wm.trials.length) return;
    if (wm.phase !== "show") return;
    setWmInput("");
    const t = setTimeout(() => {
      setWm((prev) => ({ ...prev, phase: "input" }));
    }, WM_DISPLAY_SEC * 1000);
    return () => clearTimeout(t);
  }, [step, wm.trialIndex, wm.phase, wm.trials.length]);

  const submitWorkingMemory = useCallback(() => {
    setWm((prev) => {
      const trial = prev.trials[prev.trialIndex];
      if (!trial || prev.phase !== "input") return prev;
      const normUser = normalizeWMInput(wmInput);
      const isCorrect = normUser === trial.normalized;
      return {
        ...prev,
        results: [
          ...prev.results,
          {
            sequenceDisplayed: trial.display,
            sequenceTarget: trial.normalized,
            userInput: wmInput.trim(),
            userNormalized: normUser,
            isCorrect,
            length: trial.letters.length,
          },
        ],
        trialIndex: prev.trialIndex + 1,
        phase: "show",
      };
    });
    setWmInput("");
  }, [wmInput]);

  const finish = useCallback(() => {
    if (
      !visualComplete ||
      !auditoryComplete ||
      !vowelComplete ||
      !syllableComplete ||
      !phonologicalComplete ||
      !wordRecComplete ||
      !fluencyComplete ||
      !wmComplete ||
      fontId == null ||
      backgroundId == null ||
      fluency.startedAt == null ||
      fluency.endedAt == null
    ) {
      return;
    }

    const dyslexiaCalibration = {
      visual: normalizeCategoryMap(VISUAL_GROUPS, visual),
      auditory: normalizeCategoryMap(AUDITORY_GROUPS, auditory),
      vowel: normalizeCategoryMap(VOWEL_GROUPS, vowel),
      syllableQuiz: syllableQuiz.session.map((item, i) => ({
        word: item.word,
        correctHyphenation: item.correctHyphen,
        optionsShown: [...item.options],
        correctIndex: item.correctIndex,
        selectedIndex: /** @type {number} */ (syllableQuiz.answers[i]),
        isCorrect: syllableQuiz.answers[i] === item.correctIndex,
      })),
    };

    const difficultWords = difficultWordsFromMarkedKeys(
      readingParagraphs,
      markedWordKeys
    );

    const durationMs = fluency.endedAt - fluency.startedAt;
    const durationSec = durationMs / 1000;
    const wpm =
      durationSec > 0 ? (fluencyWordCount / durationSec) * 60 : 0;

    const phonoCorrect = phonological.results.filter((r) => r.isCorrect).length;
    const wrCorrect = wordRec.results.filter((r) => r.isCorrect).length;
    const wmCorrect = wm.results.filter((r) => r.isCorrect).length;

    const cognitiveProfile = {
      phonologicalAwareness: {
        timeLimitSec: PHONOLOGICAL_TIME_SEC,
        items: phonological.results,
        correctCount: phonoCorrect,
        totalCount: phonological.results.length,
      },
      wordRecognition: {
        timeLimitSec: WORD_RECOG_TIME_SEC,
        items: wordRec.results,
        correctCount: wrCorrect,
        totalCount: wordRec.results.length,
        accuracy:
          wordRec.results.length > 0 ? wrCorrect / wordRec.results.length : 0,
      },
      readingFluency: {
        paragraphId: FLUENCY_PARAGRAPH.id,
        wordCount: fluencyWordCount,
        durationSeconds: Math.round(durationSec * 100) / 100,
        wordsPerMinute: Math.round(wpm * 10) / 10,
      },
      workingMemory: {
        displayDurationSec: WM_DISPLAY_SEC,
        trials: wm.results,
        correctCount: wmCorrect,
        totalCount: wm.results.length,
        accuracy: wm.results.length > 0 ? wmCorrect / wm.results.length : 0,
      },
    };

    const upp = buildUpp({
      dyslexiaCalibration,
      cognitiveProfile,
      fontId,
      backgroundId,
      letterSpacingEm,
      lineHeight,
      difficultWords,
    });
    setUpp(upp);
    navigate("/profil", { replace: true });
  }, [
    visualComplete,
    auditoryComplete,
    vowelComplete,
    syllableComplete,
    phonologicalComplete,
    wordRecComplete,
    fluencyComplete,
    wmComplete,
    fontId,
    backgroundId,
    syllableQuiz,
    readingParagraphs,
    markedWordKeys,
    visual,
    auditory,
    vowel,
    letterSpacingEm,
    lineHeight,
    navigate,
    phonological.results,
    wordRec.results,
    wm.results,
    fluency,
    fluencyWordCount,
  ]);

  const toggleMarkedWord = useCallback((key) => {
    setMarkedWordKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-10 pb-24">
      <header className="mb-8">
        <p className="text-sm font-medium text-stone-600">Kalibrasyon</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">
          Okuma tercihleri
        </h1>
        <p className="mt-2 text-stone-700 leading-relaxed">
          Bu akış Türkçe okuma ve disleksi çalışmalarında sık öne çıkan harf
          karışıklıklarını, hece ayırma ve konfor ayarlarını bir araya getirir.
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
        <LetterGroupsSection
          sectionTitle="Görsel karışıklık"
          sectionBlurb="Bu harf çiftleri yazıda birbirine benzeyebilir. Yazıyı okurken biçimlerini ayırt etmekte zorlanıyor musunuz?"
          groups={VISUAL_GROUPS}
          values={visual}
          onChange={setVisualPair}
        />
      ) : null}

      {step === 1 ? (
        <LetterGroupsSection
          sectionTitle="İşitsel karışıklık (sert / yumuşak ünsüzler)"
          sectionBlurb="Sert ve yumuşak ünsüz çiftlerini (örneğin pe–be, te–de) ayırt etmekte veya hatırlamakta zorlanıyor musunuz?"
          groups={AUDITORY_GROUPS}
          values={auditory}
          onChange={setAuditoryPair}
        />
      ) : null}

      {step === 2 ? (
        <LetterGroupsSection
          sectionTitle="Sesli harf karışıklığı"
          sectionBlurb="Sesli harfleri okurken veya yazarken birbirine karıştırıyor musunuz?"
          groups={VOWEL_GROUPS}
          values={vowel}
          onChange={setVowelPair}
        />
      ) : null}

      {step === 3 ? (
        <section aria-labelledby="syllable-title" className="space-y-6 pb-4">
          <div>
            <h2
              id="syllable-title"
              className="text-lg font-semibold text-stone-900"
            >
              Hece sırası
            </h2>
            <p className="mt-1 text-sm text-stone-600 leading-relaxed">
              Her kelime için doğru heceleme sırasını (tire ile ayrılmış) seçin.
            </p>
          </div>
          {syllableQuiz.session.map((item, i) => (
            <div
              key={`${item.word}-${i}`}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-stone-500">Kelime</p>
              <p className="mt-1 text-2xl font-semibold tracking-wide text-stone-900">
                {item.word}
              </p>
              <p className="mt-4 text-sm font-medium text-stone-700">
                Doğru bölünüş hangisi?
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {item.options.map((opt, optIdx) => (
                  <label
                    key={opt}
                    htmlFor={`syl-${i}-${optIdx}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition ${
                      syllableQuiz.answers[i] === optIdx
                        ? "border-emerald-700 bg-emerald-50"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <input
                      id={`syl-${i}-${optIdx}`}
                      type="radio"
                      name={`syllable-${i}`}
                      className="size-4 accent-emerald-700"
                      checked={syllableQuiz.answers[i] === optIdx}
                      onChange={() => setSyllableAnswer(i, optIdx)}
                    />
                    <span className="font-mono text-base text-stone-900">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {step === 4 ? (
        <section aria-labelledby="phono-title" className="space-y-4 pb-4">
          <div>
            <h2
              id="phono-title"
              className="text-lg font-semibold text-stone-900"
            >
              Fonolojik farkındalık
            </h2>
            <p className="mt-1 text-sm text-stone-600 leading-relaxed">
              Kafiye ve harf çıkarma soruları. Her soru için {PHONOLOGICAL_TIME_SEC}{" "}
              saniyeniz var.
            </p>
          </div>
          {!phonologicalComplete ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm font-medium text-stone-800">
                <span>
                  Soru {phonological.index + 1} / {phonological.session.length}
                </span>
                <span
                  className={`tabular-nums ${phonoTimeLeft <= 3 ? "text-red-600" : "text-emerald-800"}`}
                >
                  Kalan: {phonoTimeLeft} sn
                </span>
              </div>
              {(() => {
                const q = phonological.session[phonological.index];
                if (!q) return null;
                if (q.type === "rhyme") {
                  return (
                    <div className="mt-6">
                      <p className="text-center text-3xl font-semibold tracking-wide text-stone-900">
                        {q.w1} <span className="text-stone-400">—</span> {q.w2}
                      </p>
                      <p className="mt-4 text-center text-base text-stone-800">
                        Bu iki kelime <strong>kafiyeli</strong> mi?
                      </p>
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                          type="button"
                          onClick={() => answerPhonoRhyme(true)}
                          className="rounded-xl bg-emerald-700 px-6 py-3 text-base font-semibold text-white"
                        >
                          Evet, kafiyeli
                        </button>
                        <button
                          type="button"
                          onClick={() => answerPhonoRhyme(false)}
                          className="rounded-xl border-2 border-stone-300 bg-white px-6 py-3 text-base font-semibold text-stone-800"
                        >
                          Hayır
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="mt-6">
                    <p className="text-center text-lg text-stone-800">
                      <span className="text-2xl font-bold text-stone-900">
                        {q.word}
                      </span>{" "}
                      kelimesinden{" "}
                      <span className="font-bold text-emerald-800">{q.remove}</span>{" "}
                      harfini çıkarınca ne kalır?
                    </p>
                    <div className="mt-6 flex flex-col gap-2">
                      {q.options.map((opt, i) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => answerPhonoLetter(i)}
                          className="rounded-xl border-2 border-stone-200 px-4 py-3 text-left text-lg font-medium text-stone-900 hover:border-emerald-600"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className="text-sm text-emerald-800">Bu modül tamamlandı.</p>
          )}
        </section>
      ) : null}

      {step === 5 ? (
        <section aria-labelledby="wordrec-title" className="space-y-4 pb-4">
          <div>
            <h2
              id="wordrec-title"
              className="text-lg font-semibold text-stone-900"
            >
              Kelime tanıma
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Gerçek Türkçe kelimeyi seçin. Her soru {WORD_RECOG_TIME_SEC} saniye.
            </p>
          </div>
          {!wordRecComplete ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>
                  Soru {wordRec.index + 1} / {wordRec.session.length}
                </span>
                <span
                  className={`tabular-nums ${wordRecTimeLeft <= 2 ? "text-red-600" : "text-emerald-800"}`}
                >
                  Kalan: {wordRecTimeLeft} sn
                </span>
              </div>
              <p className="mt-6 text-center text-base font-medium text-stone-800">
                Hangisi gerçek bir Türkçe kelime?
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {(() => {
                  const q = wordRec.session[wordRec.index];
                  if (!q) return null;
                  return q.options.map((w, i) => (
                    <button
                      key={`${q.id}-${w}`}
                      type="button"
                      onClick={() => answerWordRec(i)}
                      className="rounded-xl border-2 border-stone-200 px-4 py-3 text-lg font-medium text-stone-900 hover:border-emerald-600"
                    >
                      {w}
                    </button>
                  ));
                })()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-emerald-800">Bu modül tamamlandı.</p>
          )}
        </section>
      ) : null}

      {step === 6 ? (
        <section aria-labelledby="fluency-title" className="space-y-4 pb-4">
          <div>
            <h2
              id="fluency-title"
              className="text-lg font-semibold text-stone-900"
            >
              Hız ve akıcılık
            </h2>
            <p className="mt-1 text-sm text-stone-600 leading-relaxed">
              Paragrafı normal hızınızda sesli veya iç sesle okuyun. “Okumaya
              başla” ile süre başlar; bitirince “Bitirdim”e basın.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            {fluency.phase === "intro" ? (
              <>
                <p className="leading-relaxed text-lg text-stone-900">
                  {FLUENCY_PARAGRAPH.text}
                </p>
                <p className="mt-3 text-xs text-stone-500">
                  Tahmini kelime sayısı: {fluencyWordCount}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setFluency({
                      phase: "reading",
                      startedAt: performance.now(),
                      endedAt: null,
                    })
                  }
                  className="mt-6 w-full rounded-xl bg-emerald-700 py-3 text-base font-semibold text-white"
                >
                  Okumaya başla
                </button>
              </>
            ) : null}
            {fluency.phase === "reading" ? (
              <>
                <p className="leading-relaxed text-lg text-stone-900">
                  {FLUENCY_PARAGRAPH.text}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setFluency((prev) => ({
                      ...prev,
                      phase: "done",
                      endedAt: performance.now(),
                    }))
                  }
                  className="mt-6 w-full rounded-xl bg-emerald-700 py-3 text-base font-semibold text-white"
                >
                  Bitirdim
                </button>
              </>
            ) : null}
            {fluency.phase === "done" &&
            fluency.startedAt != null &&
            fluency.endedAt != null ? (
              <p className="text-sm text-emerald-900">
                Süre kaydedildi. Sonraki adıma geçebilirsiniz.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 7 ? (
        <section aria-labelledby="wm-title" className="space-y-4 pb-4">
          <div>
            <h2 id="wm-title" className="text-lg font-semibold text-stone-900">
              Çalışan bellek
            </h2>
            <p className="mt-1 text-sm text-stone-600 leading-relaxed">
              Harf dizisi {WM_DISPLAY_SEC} saniye görünür, sonra kaybolur. Gördüğünüz
              sırayla harfleri yazın (boşluksuz veya tire ile).
            </p>
          </div>
          {!wmComplete ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              {wm.phase === "ready" ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-stone-900">
                    Hazır mısın?
                  </h3>
                  <p className="text-sm leading-relaxed text-stone-700">
                    Sana birkaç harf göstereceğim. Harfleri sırayla hatırlamaya
                    çalış.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setWm((prev) =>
                        prev.phase === "ready"
                          ? { ...prev, phase: "show" }
                          : prev
                      )
                    }
                    className="w-full rounded-xl bg-emerald-700 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                  >
                    Başla
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-stone-600">
                    Deneme {wm.trialIndex + 1} / {wm.trials.length}
                  </p>
                  {wm.phase === "show" ? (
                    <div className="mt-8 flex min-h-[5rem] items-center justify-center rounded-xl bg-stone-100 py-8">
                      <p className="text-center text-3xl font-bold tracking-widest text-stone-900">
                        {wm.trials[wm.trialIndex]?.display}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-stone-800">
                        Harfleri sırayla yazın
                      </label>
                      <input
                        type="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        value={wmInput}
                        onChange={(e) => setWmInput(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
                      />
                      <button
                        type="button"
                        onClick={submitWorkingMemory}
                        className="mt-4 w-full rounded-xl bg-emerald-700 py-3 text-base font-semibold text-white"
                      >
                        Gönder
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-emerald-800">Bu modül tamamlandı.</p>
          )}
        </section>
      ) : null}

      {step === 8 ? (
        <section aria-labelledby="step-font-title">
          <h2
            id="step-font-title"
            className="text-lg font-semibold text-stone-900"
          >
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

      {step === 9 ? (
        <section aria-labelledby="step-bg-title">
          <h2
            id="step-bg-title"
            className="text-lg font-semibold text-stone-900"
          >
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

      {step === 10 ? (
        <section aria-labelledby="step-spacing-title" className="pb-4">
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

      {step === 11 ? (
        <section
          aria-labelledby="step-reading-mark-title"
          className="space-y-6 pb-4"
        >
          <div>
            <h2
              id="step-reading-mark-title"
              className="text-lg font-semibold text-stone-900"
            >
              Aşama 5 — okuma: zorlandığınız kelimeler
            </h2>
            <p className="mt-1 text-sm text-stone-600 leading-relaxed">
              Aşağıdaki paragraflar rastgele seçildi; önceki harf gruplarına
              benzer ses ve harfleri bol içerir. Takıldığınız kelimeye
              tıklayarak işaretleyin (tekrar tıklayınca kalkar). İşaretlenen
              kelimeler ve yukarıdaki harf yanıtları profil dosyanıza (UPP)
              kaydedilir.
            </p>
          </div>

          {readingParagraphs.map((para, pIdx) => (
            <article
              key={pIdx}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-stone-500">
                Paragraf {pIdx + 1}
              </p>
              <div className="mt-3 text-lg leading-relaxed text-stone-900">
                {splitParagraphForReading(para).map((segment, segIdx) => {
                  if (segment.type === "space") {
                    return (
                      <span key={`${pIdx}-s-${segIdx}`}>{segment.text}</span>
                    );
                  }
                  const wKey = wordKey(pIdx, segment.wordIndex);
                  const marked = markedWordKeys.includes(wKey);
                  return (
                    <button
                      key={`${pIdx}-w-${segment.wordIndex}-${segIdx}`}
                      type="button"
                      aria-pressed={marked}
                      onClick={() => toggleMarkedWord(wKey)}
                      className={`mx-0.5 inline rounded-md border-2 border-transparent px-0.5 align-baseline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                        marked
                          ? "border-amber-600 bg-amber-200/90 text-stone-900 shadow-sm"
                          : "hover:bg-stone-100"
                      }`}
                    >
                      {segment.text}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}

          {markedWordKeys.length > 0 ? (
            <p className="text-sm text-stone-600">
              {markedWordKeys.length} kelime işaretlendi.
            </p>
          ) : (
            <p className="text-sm text-stone-500">
              İsterseniz hiç işaretlemeden de devam edebilirsiniz.
            </p>
          )}
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
              className="max-w-[min(100%,20rem)] shrink rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold leading-snug text-white shadow-sm sm:max-w-none sm:px-5 sm:text-base disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
            >
              Zorlandığım kelimeleri işaretledim, devam et
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

function LetterGroupsSection({ sectionTitle, sectionBlurb, groups, values, onChange }) {
  return (
    <section className="space-y-8" aria-labelledby="letter-cat-title">
      <div>
        <h2
          id="letter-cat-title"
          className="text-lg font-semibold text-stone-900"
        >
          {sectionTitle}
        </h2>
        <p className="mt-1 text-sm text-stone-600 leading-relaxed">
          {sectionBlurb}
        </p>
      </div>
      {groups.map((group) => (
        <fieldset
          key={group.key}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <legend className="text-base font-semibold text-stone-900 px-1">
            {group.title}
          </legend>
          <p className="mt-2 text-sm font-medium text-stone-800">
            Bu harfleri okurken zorlanıyor musunuz?
          </p>
          <p className="mt-0.5 text-sm text-stone-600">
            Size en yakın seçeneği işaretleyin.
          </p>
          <div
            className="mt-4 flex flex-wrap items-center justify-center gap-1 text-5xl font-semibold tracking-wide text-stone-800 sm:text-6xl sm:gap-2"
            aria-hidden
          >
            {group.letters.map((L, i) => (
              <span key={`${group.key}-l-${i}`} className="flex items-center">
                {i > 0 ? (
                  <span className="mx-2 text-stone-300 sm:mx-3">·</span>
                ) : null}
                <span>{L}</span>
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {PAIR_OPTION_VALUES.map((val) => {
              const id = `${group.key}-${val}`;
              const checked = values[group.key] === val;
              const [first, second] = group.letters;
              let label = "";
              if (val === "a") label = PAIR_OPTION_LABELS.a(first);
              else if (val === "b") label = PAIR_OPTION_LABELS.b(second);
              else label = PAIR_OPTION_LABELS[val]();

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
                    name={group.key}
                    className="mt-1 size-4 shrink-0 accent-emerald-700"
                    checked={checked}
                    onChange={() => onChange(group.key, val)}
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
  );
}

function normalizeCategoryMap(groups, raw) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const g of groups) {
    out[g.key] = normalizePairLetters(g.letters, raw[g.key]);
  }
  return out;
}

/** @param {string[]} letters */
/** @param {string | null | undefined} choice — 'a' | 'b' | 'both' | 'none' */
function normalizePairLetters(letters, choice) {
  const [A, B] = letters;
  if (choice === "a") return A;
  if (choice === "b") return B;
  if (choice === "both" || choice === "none") return choice;
  return "none";
}

function wordKey(pIdx, wIdx) {
  return `p${pIdx}-w${wIdx}`;
}

/**
 * @param {string} text
 * @returns {{ type: 'space' | 'word', text: string, wordIndex?: number }[]}
 */
function splitParagraphForReading(text) {
  const parts = text.split(/(\s+)/).filter((p) => p !== "");
  /** @type {{ type: 'space' | 'word', text: string, wordIndex?: number }[]} */
  const out = [];
  let wordIndex = 0;
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      out.push({ type: "space", text: part });
    } else {
      out.push({ type: "word", text: part, wordIndex: wordIndex++ });
    }
  }
  return out;
}

function normalizeWordToken(raw) {
  const t = raw
    .replace(/^[\s"'“(«]+/u, "")
    .replace(/[\s"'”)».,;:!?]+$/u, "")
    .trim();
  return t || raw.trim();
}

/**
 * @param {string[]} paragraphs
 * @param {string[]} markedKeys
 */
function difficultWordsFromMarkedKeys(paragraphs, markedKeys) {
  const ordered = [];
  const seen = new Set();
  for (const key of markedKeys) {
    const { p, w } = parseWordKey(key);
    const para = paragraphs[p];
    if (para == null) continue;
    const raw = getNthWordInParagraph(para, w);
    if (raw == null) continue;
    const norm = normalizeWordToken(raw);
    if (seen.has(norm)) continue;
    seen.add(norm);
    ordered.push(norm);
  }
  return ordered;
}

function parseWordKey(key) {
  const m = /^p(\d+)-w(\d+)$/.exec(key);
  if (!m) return { p: 0, w: 0 };
  return { p: Number(m[1]), w: Number(m[2]) };
}

function getNthWordInParagraph(paragraph, n) {
  const parts = paragraph.split(/(\s+)/).filter((p) => p !== "");
  let wi = 0;
  for (const part of parts) {
    if (/^\s+$/.test(part)) continue;
    if (wi === n) return part;
    wi++;
  }
  return null;
}

/** @type {Set<string>} */
const WM_LETTER_SET = new Set(WORKING_MEMORY_ALPHABET.split(""));

/**
 * Kullanıcı girişini gösterilen dizi ile karşılaştırmak için normalize et (tr büyük harf, yalnızca izinli harfler).
 * @param {string} raw
 */
function normalizeWMInput(raw) {
  const upper = raw.toLocaleUpperCase("tr-TR");
  let out = "";
  for (const ch of upper) {
    if (WM_LETTER_SET.has(ch)) out += ch;
  }
  return out;
}

/**
 * @param {import("../data/phonologicalQuiz.js").RhymeItem | import("../data/phonologicalQuiz.js").LetterRemoveItem} q
 * @param {{ timedOut: boolean, userAnswer: boolean | string | null, isCorrect: boolean, responseTimeMs: number }} meta
 */
function buildPhonoRow(q, meta) {
  if (q.type === "rhyme") {
    return {
      questionId: q.id,
      type: "rhyme",
      w1: q.w1,
      w2: q.w2,
      correctAnswer: q.rhymes,
      ...meta,
    };
  }
  return {
    questionId: q.id,
    type: "letterRemove",
    word: q.word,
    remove: q.remove,
    options: [...q.options],
    correctIndex: q.correctIndex,
    correctAnswer: q.options[q.correctIndex],
    ...meta,
  };
}
