import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage.jsx";
import CalibrationPage from "./pages/CalibrationPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ReadingPage from "./pages/ReadingPage.jsx";
import WritingPage from "./pages/WritingPage.jsx";
import SharePage from "./pages/SharePage.jsx";
import AppLayout from "./components/AppLayout.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/kalibrasyon" element={<CalibrationPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="/okuma" element={<ReadingPage />} />
          <Route path="/yazma" element={<WritingPage />} />
          <Route path="/paylasim" element={<SharePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
