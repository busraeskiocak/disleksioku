import { Link } from "react-router-dom";
import { FONT_OPTIONS } from "../lib/upp.js";
import {
  describeConfusionPair,
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

  const lc = upp.letterConfusion ?? {};
  const typo = upp.typography ?? {};
  const ls = letterSpacingSummary(typo.letterSpacingEm);
  const lh = lineHeightSummary(typo.lineHeight);

  const bgColor = upp.background?.color ?? "#FFFFFF";

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
      </header>

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

        <SummaryCard accentColor="#b45309">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Harf çiftleri
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-stone-800">
            <li className="rounded-xl bg-amber-50/80 px-3 py-2 leading-snug">
              {describeConfusionPair("bd", lc.bd)}
            </li>
            <li className="rounded-xl bg-amber-50/80 px-3 py-2 leading-snug">
              {describeConfusionPair("pq", lc.pq)}
            </li>
            <li className="rounded-xl bg-amber-50/80 px-3 py-2 leading-snug">
              {describeConfusionPair("mn", lc.mn)}
            </li>
          </ul>
        </SummaryCard>

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
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/okuma"
          className="inline-flex flex-1 justify-center rounded-2xl bg-emerald-700 px-5 py-4 text-center text-lg font-semibold text-white shadow-md shadow-emerald-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
        >
          Okumaya Başla
        </Link>
        <Link
          to="/paylasim"
          className="inline-flex flex-1 justify-center rounded-2xl border-2 border-emerald-800/40 bg-white px-5 py-4 text-center text-lg font-semibold text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
        >
          Profili Paylaş
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
