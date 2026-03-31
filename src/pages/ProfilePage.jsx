import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  AUDITORY_GROUPS,
  VISUAL_GROUPS,
  VOWEL_GROUPS,
} from "../lib/dyslexiaGroups.js";
import { FONT_OPTIONS } from "../lib/upp.js";
import {
  describeConfusionValue,
  getBackgroundLabel,
  getFontLabel,
  letterSpacingSummary,
  lineHeightSummary,
} from "../lib/uppFormat.js";
import { getUpp } from "../utils/storage.js";

function SummaryCard({ children, accentColor }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: accentColor ?? "#047857" }}
        aria-hidden
      />
      <div className="p-5">{children}</div>
    </article>
  );
}

export default function ProfilePage() {
  const upp = getUpp();
  const [activeTab, setActiveTab] = useState("ozet");

  if (!upp || typeof upp !== "object") {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-2xl font-semibold text-stone-900">
          Profil bulunamadı
        </h1>
        <p className="mt-3 leading-relaxed text-stone-700">
          Henüz kayıtlı bir okuma profilin yok. Önce kısa kalibrasyon testini
          tamamlayarak profil oluşturabilirsin.
        </p>
        <Link
          to="/kalibrasyon"
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
        >
          Kalibrasyona git
        </Link>
        <Link
          to="/"
          className="mt-4 block text-emerald-900 underline decoration-2 underline-offset-4"
        >
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  const fontId = upp.fontPreference;
  const fontFamily =
    FONT_OPTIONS.find((f) => f.id === fontId)?.fontFamily ??
    '"OpenDyslexic", sans-serif';

  const typo = upp.typography ?? {};
  const ls = letterSpacingSummary(typo.letterSpacingEm);
  const lh = lineHeightSummary(typo.lineHeight);

  const bgColor = upp.background?.color ?? "#FFFFFF";
  const wordDictionary = Array.isArray(upp.wordDictionary)
    ? upp.wordDictionary
        .filter((row) => row && typeof row === "object" && typeof row.kelime === "string")
        .map((row) => ({
          kelime: row.kelime,
          nasılOkudum: typeof row.nasılOkudum === "string" ? row.nasılOkudum : "",
          sayi:
            typeof row.sayi === "number" && Number.isFinite(row.sayi) && row.sayi > 0
              ? Math.floor(row.sayi)
              : 1,
        }))
    : [];
  const topConfusedWords = [...wordDictionary]
    .sort((a, b) => (b.sayi || 1) - (a.sayi || 1))
    .slice(0, 3);
  const thisMonthTotal = wordDictionary.length;
  const groupedConfusions = wordDictionary.reduce(
    (acc, row) => {
      const wrong = row.nasılOkudum.trim().toLocaleLowerCase("tr-TR");
      const correct = row.kelime.trim().toLocaleLowerCase("tr-TR");
      let group = "Diğer";
      if (!wrong) {
        group = "Belirtilmedi";
      } else if (
        wrong.length === correct.length &&
        [...wrong].sort().join("") === [...correct].sort().join("")
      ) {
        group = "Harf sırası";
      } else if (wrong[0] && correct[0] && wrong[0] === correct[0]) {
        group = "Ses benzerliği";
      }
      if (!acc[group]) acc[group] = [];
      acc[group].push(row);
      return acc;
    },
    /** @type {Record<string, {kelime:string, nasılOkudum:string, sayi:number}[]>} */ ({})
  );
  const barData = [...wordDictionary]
    .sort((a, b) => (b.sayi || 1) - (a.sayi || 1))
    .slice(0, 10)
    .map((r) => ({ kelime: r.kelime, sayi: r.sayi || 1 }));
  const pieData = [
    {
      name: "Karıştırma şekli bilinen",
      value: wordDictionary.filter((r) => Boolean(r.nasılOkudum?.trim())).length,
    },
    {
      name: "Sadece zorlandım",
      value: wordDictionary.filter((r) => !r.nasılOkudum?.trim()).length,
    },
  ];
  const PIE_COLORS = ["#A7F3D0", "#BFDBFE"];
  const BAR_COLORS = [
    "#34D399",
    "#6EE7B7",
    "#10B981",
    "#86EFAC",
    "#2DD4BF",
    "#99F6E4",
    "#4ADE80",
    "#5EEAD4",
    "#22C55E",
    "#7DD3FC",
  ];
  const TR_MONTHS = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const formatDayMonth = (d) => `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
  const lineData = Array.from({ length: 4 }, (_, i) => {
    const newest = new Date(todayStart);
    newest.setDate(todayStart.getDate() - i * 7);
    const oldest = new Date(todayStart);
    oldest.setDate(todayStart.getDate() - (i * 7 + 6));
    const count = wordDictionary.reduce((sum, row) => {
      const dt = row.eklendigiTarih
        ? new Date(row.eklendigiTarih)
        : row.addedAt
        ? new Date(row.addedAt)
        : new Date();
      if (Number.isNaN(dt.getTime())) return sum;
      const dtStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const diffDays = Math.floor((todayStart.getTime() - dtStart.getTime()) / msPerDay);
      if (diffDays >= i * 7 && diffDays <= i * 7 + 6) return sum + (row.sayi || 1);
      return sum;
    }, 0);
    return {
      hafta: `${formatDayMonth(oldest)} - ${formatDayMonth(newest)}`,
      sayi: count,
    };
  });
  const thisWeekCount = lineData[0]?.sayi ?? 0;
  const prevWeekCount = lineData[1]?.sayi ?? 0;
  const totalLearnedWords = wordDictionary.reduce((sum, row) => sum + (row.sayi || 1), 0);
  const progressMessage =
    thisWeekCount > prevWeekCount
      ? "📈 Bu hafta daha cok calistin!"
      : thisWeekCount < prevWeekCount
      ? "📉 Gecen haftadan az kelime ekledin"
      : "Bu hafta gecen haftayla ayni tempodaydin";

  const isV2 =
    typeof upp.version === "number" &&
    upp.version >= 2 &&
    upp.dyslexiaCalibration != null &&
    typeof upp.dyslexiaCalibration === "object";

  const dc = isV2 ? upp.dyslexiaCalibration : null;
  const legacyLc = !isV2 ? upp.letterConfusion ?? {} : {};

  return (
    <main className="mx-auto max-w-lg px-5 py-10 pb-28">
      <header className="mb-8">
        <p className="text-sm font-medium text-stone-600">Profil özeti</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">
          Okuma profilin
        </h1>
        <p className="mt-2 leading-relaxed text-stone-700">
          Ayarların kartlar halinde özetlendi. Okuma ekranında bu tercihler
          kullanılacak.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("ozet")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              activeTab === "ozet"
                ? "bg-emerald-700 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            Profil Özeti
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sozluk")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              activeTab === "sozluk"
                ? "bg-emerald-700 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            Kişisel Sözlüğüm
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analiz")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              activeTab === "analiz"
                ? "bg-emerald-700 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            Analiz
          </button>
        </div>
      </header>

      {activeTab === "ozet" ? (
      <div className="flex flex-col gap-4">
        <SummaryCard accentColor="#047857">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Yazı tipi
          </h2>
          <p
            className="mt-2 text-xl font-semibold text-stone-900"
            style={{ fontFamily }}
          >
            Senin fontun: {getFontLabel(fontId)}
          </p>
        </SummaryCard>

        <SummaryCard accentColor="#0d9488">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Arka plan
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="h-12 w-12 shrink-0 rounded-xl border border-stone-200 shadow-inner"
              style={{ backgroundColor: bgColor }}
              aria-hidden
            />
            <p className="text-lg font-semibold text-stone-900">
              Arka plan rengin: {getBackgroundLabel(upp.background)}
            </p>
          </div>
          <p className="mt-2 text-sm text-stone-600">{bgColor}</p>
        </SummaryCard>

        {dc ? (
          <>
            <SummaryCard accentColor="#b45309">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Görsel karışıklık
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-stone-800">
                {VISUAL_GROUPS.map((g) => (
                  <li
                    key={g.key}
                    className="rounded-xl bg-amber-50/80 px-3 py-2 leading-snug"
                  >
                    {describeConfusionValue(g.title, dc.visual[g.key])}
                  </li>
                ))}
              </ul>
            </SummaryCard>
            <SummaryCard accentColor="#c2410c">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                İşitsel karışıklık
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-stone-800">
                {AUDITORY_GROUPS.map((g) => (
                  <li
                    key={`aud-${g.key}`}
                    className="rounded-xl bg-orange-50/90 px-3 py-2 leading-snug"
                  >
                    {describeConfusionValue(g.title, dc.auditory[g.key])}
                  </li>
                ))}
              </ul>
            </SummaryCard>
            <SummaryCard accentColor="#7c3aed">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Sesli harf karışıklığı
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-stone-800">
                {VOWEL_GROUPS.map((g) => (
                  <li
                    key={`vow-${g.key}`}
                    className="rounded-xl bg-violet-50/90 px-3 py-2 leading-snug"
                  >
                    {describeConfusionValue(g.title, dc.vowel[g.key])}
                  </li>
                ))}
              </ul>
            </SummaryCard>
            <SummaryCard accentColor="#0f766e">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Hece sırası (kalibrasyon)
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-stone-800">
                {Array.isArray(dc.syllableQuiz)
                  ? dc.syllableQuiz.map((row, i) => (
                      <li
                        key={`${row.word}-${i}`}
                        className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                      >
                        <span className="font-semibold">{row.word}</span>
                        {" — "}
                        {row.isCorrect ? (
                          <span className="text-emerald-800">Doğru seçim</span>
                        ) : (
                          <span className="text-amber-900">
                            Seçilen:{" "}
                            {row.optionsShown?.[row.selectedIndex] ?? "—"} ·
                            Doğru: {row.correctHyphenation}
                          </span>
                        )}
                      </li>
                    ))
                  : null}
              </ul>
            </SummaryCard>
          </>
        ) : Object.keys(legacyLc).length > 0 ? (
          <SummaryCard accentColor="#b45309">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Harf grupları (eski profil)
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-stone-800">
              {Object.entries(legacyLc).map(([k, v]) => (
                <li
                  key={k}
                  className="rounded-xl bg-amber-50/80 px-3 py-2 leading-snug"
                >
                  {describeConfusionValue(k, v)}
                </li>
              ))}
            </ul>
          </SummaryCard>
        ) : null}

        <SummaryCard accentColor="#4338ca">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Boşluklar
          </h2>
          <p className="mt-3 text-lg font-semibold text-stone-900">
            Harf aralığın: {ls.label}
            {ls.detail ? (
              <span className="font-normal text-stone-600"> ({ls.detail})</span>
            ) : null}
          </p>
          <p className="mt-2 text-lg font-semibold text-stone-900">
            Satır aralığın: {lh.label}
            {lh.detail ? (
              <span className="font-normal text-stone-600"> ({lh.detail})</span>
            ) : null}
          </p>
        </SummaryCard>

        {Array.isArray(upp.difficultWords) && upp.difficultWords.length > 0 ? (
          <SummaryCard accentColor="#15803d">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Zorlandığın kelimeler
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Okuma aşamasında işaretlediğin kelimeler:
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {upp.difficultWords.map((w) => (
                <li
                  key={w}
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-950"
                >
                  {w}
                </li>
              ))}
            </ul>
          </SummaryCard>
        ) : null}
      </div>
      ) : activeTab === "sozluk" ? (
        <SummaryCard accentColor="#15803d">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Kişisel Sözlüğüm
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-stone-200">
            <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
              <span>Kelime</span>
              <span>Karıştırılan Kelime</span>
            </div>
            {wordDictionary.length === 0 ? (
              <p className="px-3 py-3 text-sm text-stone-500">
                Sözlüğünde henüz kelime yok.
              </p>
            ) : (
              wordDictionary.map((row, i) => (
                <div
                  key={`${row.kelime}-${i}`}
                  className="grid w-full grid-cols-2 gap-2 border-b border-stone-100 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-stone-900">
                    {row.kelime} ({row.sayi || 1}x)
                  </span>
                  <span className="text-stone-700">{row.nasılOkudum || "—"}</span>
                </div>
              ))
            )}
          </div>
        </SummaryCard>
      ) : (
        <div className="flex flex-col gap-4">
          <SummaryCard accentColor="#0f766e">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Analiz
            </h2>
            <p className="mt-2 text-sm text-stone-700">
              Bu ay {thisMonthTotal} kelimede zorlandın.
            </p>
            <h3 className="mt-4 text-sm font-semibold text-stone-800">
              En çok karıştırılan 3 kelime
            </h3>
            {topConfusedWords.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">Henüz veri yok.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {topConfusedWords.map((row, i) => (
                  <li
                    key={`top-${row.kelime}-${i}`}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-stone-900">{row.kelime}</span>
                    <span className="text-stone-700"> ({row.sayi || 1}x)</span>
                    <span className="text-stone-500"> · {row.nasılOkudum || "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </SummaryCard>
          <SummaryCard accentColor="#16a34a">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              En çok karıştırılan 10 kelime
            </h2>
            <div className="mt-3 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="kelime" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sayi" name="Karıştırılma sayısı" radius={[6, 6, 0, 0]}>
                    {barData.map((_, idx) => (
                      <Cell key={`bar-cell-${idx}`} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SummaryCard>

          <SummaryCard accentColor="#0284c7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Karıştırma türü oranı
            </h2>
            <div className="mt-3 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={`pie-cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SummaryCard>

          <SummaryCard accentColor="#7c3aed">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Bu Haftaki Kelime Ilerlemen
            </h2>
            <div className="mt-3 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...lineData].reverse()}>
                  <XAxis dataKey="hafta" interval={0} tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={55} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sayi"
                    name="Eklenen kelime"
                    stroke="#A78BFA"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#C4B5FD" }}
                    activeDot={{ r: 6 }}
                    label={{ position: "top", fill: "#6D28D9", fontSize: 11 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm font-medium text-stone-800">{progressMessage}</p>
            <p className="mt-1 text-sm text-stone-700">Toplam {totalLearnedWords} kelime ogrenildi</p>
          </SummaryCard>

          <SummaryCard accentColor="#7c3aed">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Karıştırma Türleri
            </h2>
            {Object.keys(groupedConfusions).length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">Henüz kategori verisi yok.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {Object.entries(groupedConfusions).map(([group, rows]) => (
                  <div key={`grp-${group}`} className="rounded-xl border border-stone-200 p-3">
                    <p className="text-sm font-semibold text-stone-900">{group}</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {rows.map((row, i) => (
                        <li
                          key={`grp-row-${group}-${row.kelime}-${i}`}
                          className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs text-violet-900"
                        >
                          {row.kelime} ({row.sayi || 1}x)
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </SummaryCard>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/okuma"
          className="inline-flex flex-1 justify-center rounded-2xl bg-emerald-700 px-5 py-4 text-center text-lg font-semibold text-white shadow-md shadow-emerald-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
        >
          Okumaya Başla
        </Link>
      </div>

      <Link
        to="/"
        className="mt-6 inline-block text-sm text-emerald-900 underline decoration-2 underline-offset-4"
      >
        Ana sayfaya dön
      </Link>
    </main>
  );
}
