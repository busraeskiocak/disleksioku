import { Link } from "react-router-dom";
import LexiLensLogo from "../components/LexiLensLogo.jsx";
import { hasUserProfile } from "../utils/storage.js";

const STAGGER = {
  logo: "0ms",
  title: "90ms",
  text: "180ms",
  actions: "260ms",
};

export default function WelcomePage() {
  const hasProfile = hasUserProfile();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <div
          className="welcome-animate-in"
          style={{ animationDelay: STAGGER.logo }}
        >
          <div className="welcome-logo-float inline-flex">
            <LexiLensLogo className="h-24 w-24 shrink-0" />
          </div>
        </div>

        <h1
          className="welcome-animate-in mt-6 text-3xl font-semibold tracking-tight text-stone-900"
          style={{ animationDelay: STAGGER.title }}
        >
          LexiLens
        </h1>

        <p
          className="welcome-animate-in mt-4 max-w-sm text-lg leading-relaxed text-stone-700"
          style={{ animationDelay: STAGGER.text }}
        >
          Okuma alışkanlığınıza uygun, sade bir okuma deneyimi için birkaç kısa
          ayar yapalım.
        </p>
      </div>

      <div
        className="welcome-animate-in flex flex-col gap-3"
        style={{ animationDelay: STAGGER.actions }}
      >
        <Link
          to="/kalibrasyon"
          className="rounded-2xl bg-emerald-700 px-5 py-4 text-center text-lg font-semibold text-white shadow-md shadow-emerald-900/15 outline-none ring-emerald-800 ring-offset-2 ring-offset-stone-100 transition hover:bg-emerald-800 focus-visible:ring-2 active:scale-[0.99]"
        >
          Testi Başlat
        </Link>

        {hasProfile ? (
          <Link
            to="/profil"
            className="rounded-2xl border-2 border-emerald-800/40 bg-white px-5 py-4 text-center text-lg font-semibold text-emerald-900 outline-none ring-emerald-800 ring-offset-2 ring-offset-stone-100 transition hover:border-emerald-700 hover:bg-emerald-50 focus-visible:ring-2 active:scale-[0.99]"
          >
            Profilime Git
          </Link>
        ) : null}
      </div>
    </main>
  );
}
