import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage.jsx";
import CalibrationPage from "./pages/CalibrationPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ReadingPage from "./pages/ReadingPage.jsx";
import WritingPage from "./pages/WritingPage.jsx";
import SharePage from "./pages/SharePage.jsx";
import AppLayout from "./components/AppLayout.jsx";
import KelimeTarayici from "./components/KelimeTarayici.jsx";

function TopModeTabs() {
  const cls =
    "rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";
  return (
    <div className="mx-auto mt-2 flex w-full max-w-5xl items-center gap-2 px-4 sm:px-6">
      <NavLink
        to="/okuma"
        className={({ isActive }) =>
          `${cls} ${isActive ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`
        }
      >
        Okuma
      </NavLink>
      <NavLink
        to="/yazma"
        className={({ isActive }) =>
          `${cls} ${isActive ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`
        }
      >
        Yazma
      </NavLink>
      <NavLink
        to="/kelime-tarayici"
        className={({ isActive }) =>
          `${cls} ${isActive ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`
        }
      >
        🔍 Kelime Tarayıcı
      </NavLink>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/kalibrasyon" element={<CalibrationPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route
            path="/okuma"
            element={
              <>
                <TopModeTabs />
                <ReadingPage />
              </>
            }
          />
          <Route
            path="/yazma"
            element={
              <>
                <TopModeTabs />
                <WritingPage />
              </>
            }
          />
          <Route
            path="/kelime-tarayici"
            element={
              <>
                <TopModeTabs />
                <KelimeTarayici />
              </>
            }
          />
          <Route path="/paylasim" element={<SharePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
