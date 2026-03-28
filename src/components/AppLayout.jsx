import { Outlet, useLocation, useNavigate } from "react-router-dom";
import FixedBackButton from "./FixedBackButton.jsx";
import { canBrowserGoBack } from "../utils/historyNav.js";

function UserProfileIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const onProfile = location.pathname === "/profil";

  const showFixedBack =
    location.pathname !== "/" && location.pathname !== "/okuma";

  const handleFixedBack = () => {
    if (canBrowserGoBack()) navigate(-1);
    else navigate("/");
  };

  const handleProfileIconClick = () => {
    if (onProfile) {
      if (canBrowserGoBack()) {
        navigate(-1);
      } else {
        navigate("/");
      }
    } else {
      navigate("/profil");
    }
  };

  const reserveTopChrome = location.pathname !== "/";

  return (
    <div
      className={`font-sans min-h-screen ${reserveTopChrome ? "pt-14" : ""}`}
    >
      {showFixedBack ? (
        <FixedBackButton onClick={handleFixedBack} aria-label="Geri" />
      ) : null}
      <div className="pointer-events-none fixed right-0 top-0 z-50 flex justify-end p-3 sm:p-4">
        <button
          type="button"
          onClick={handleProfileIconClick}
          className="pointer-events-auto flex size-11 items-center justify-center rounded-full border-2 border-stone-200 bg-white/95 text-stone-600 shadow-sm backdrop-blur-sm transition hover:border-emerald-600 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          aria-label={
            onProfile ? "Önceki sayfaya dön" : "Profil sayfasına git"
          }
        >
          <UserProfileIcon className="size-6" />
        </button>
      </div>
      <Outlet />
    </div>
  );
}
