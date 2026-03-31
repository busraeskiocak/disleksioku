import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
} from "recharts";
import {
  decodeUppFromParam,
  looksLikeUpp,
} from "../lib/uppShareCodec.js";
import { getUpp, setUpp } from "../utils/storage.js";

export default function SharePage() {
  const [searchParams] = useSearchParams();
  const qrRef = useRef(null);
  const [copyState, setCopyState] = useState("idle");
  const [saveState, setSaveState] = useState("idle");
  const [pdfState, setPdfState] = useState("idle");
  const chartBarRef = useRef(null);
  const chartPieRef = useRef(null);
  const chartLineRef = useRef(null);

  const linkUpp = useMemo(() => {
    try {
      return decodeUppFromParam(searchParams.get("d"));
    } catch (err) {
      console.log("[SharePage] decodeUppFromParam hatasi:", err);
      return null;
    }
  }, [searchParams]);

  const storedUpp = getUpp();
  const uppForShare =
    storedUpp && looksLikeUpp(storedUpp)
      ? storedUpp
      : linkUpp && looksLikeUpp(linkUpp)
        ? linkUpp
        : null;
  const [shareId, setShareId] = useState("");

  useEffect(() => {
    if (!uppForShare || typeof uppForShare !== "object") {
      setShareId("");
      return;
    }
    const existingId =
      typeof uppForShare.id === "string" && uppForShare.id.trim()
        ? uppForShare.id.trim()
        : "";
    if (existingId) {
      setShareId(existingId);
      return;
    }
    const generatedId = String(Date.now());
    setShareId(generatedId);
    setUpp({ ...uppForShare, id: generatedId });
  }, [uppForShare]);

  const shareUrl = (() => {
    if (!shareId) {
      console.log("[SharePage] shareId boş, kısa URL üretilemedi.");
      return "";
    }
    try {
      const baseUrl =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "";
      const url = `${baseUrl}/paylasim?id=${encodeURIComponent(shareId)}`;
      console.log("[SharePage] QR için üretilecek URL:", url);
      return url;
    } catch (err) {
      console.log("[SharePage] Kısa URL üretim hatası:", err);
      return "";
    }
  })();
  console.log("[SharePage] qrcode.react import kontrolü QRCodeSVG:", Boolean(QRCodeSVG));
  console.log("[SharePage] QRCode value kontrolü shareUrl:", shareUrl);

  const showImport =
    Boolean(linkUpp && looksLikeUpp(linkUpp)) &&
    (!storedUpp ||
      !looksLikeUpp(storedUpp) ||
      JSON.stringify(storedUpp) !== JSON.stringify(linkUpp));
  const wordDictionary = Array.isArray(uppForShare?.wordDictionary)
    ? uppForShare.wordDictionary
        .filter((row) => row && typeof row === "object" && typeof row.kelime === "string")
        .map((row) => ({
          kelime: row.kelime,
          nasılOkudum: typeof row.nasılOkudum === "string" ? row.nasılOkudum : "",
          sayi:
            typeof row.sayi === "number" && Number.isFinite(row.sayi) && row.sayi > 0
              ? Math.floor(row.sayi)
              : 1,
          eklendigiTarih:
            typeof row.eklendigiTarih === "string" ? row.eklendigiTarih : "",
        }))
    : [];
  const barData = [...wordDictionary]
    .sort((a, b) => (b.sayi || 1) - (a.sayi || 1))
    .slice(0, 10)
    .map((r) => ({ kelime: r.kelime, sayi: r.sayi || 1 }));
  const pieData = [
    {
      name: "Bilinen karıştırma",
      value: wordDictionary.filter((r) => Boolean(r.nasılOkudum?.trim())).length,
    },
    {
      name: "Sadece zorlandım",
      value: wordDictionary.filter((r) => !r.nasılOkudum?.trim()).length,
    },
  ];
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lineData = Array.from({ length: 4 }, (_, i) => {
    const newest = new Date(startToday);
    newest.setDate(startToday.getDate() - i * 7);
    const oldest = new Date(startToday);
    oldest.setDate(startToday.getDate() - (i * 7 + 6));
    const count = wordDictionary.reduce((sum, row) => {
      const dt = row.eklendigiTarih ? new Date(row.eklendigiTarih) : new Date();
      if (Number.isNaN(dt.getTime())) return sum;
      const dtStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const diffDays = Math.floor((startToday.getTime() - dtStart.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays >= i * 7 && diffDays <= i * 7 + 6) return sum + (row.sayi || 1);
      return sum;
    }, 0);
    return { hafta: `${i + 1}. hafta`, sayi: count };
  }).reverse();
  const visualData = uppForShare?.dyslexiaCalibration?.visual ?? {};
  const auditoryData = uppForShare?.dyslexiaCalibration?.auditory ?? {};
  const vowelData = uppForShare?.dyslexiaCalibration?.vowel ?? {};
  const readingSpeedLevel =
    uppForShare?.readingSpeedLevel ||
    uppForShare?.readingSpeed ||
    uppForShare?.typography?.readingSpeed ||
    "Belirtilmedi";
  const fontPref = uppForShare?.fontPreference || "Belirtilmedi";
  const backgroundPref = uppForShare?.background?.color || "Belirtilmedi";
  const letterSpacingPref =
    typeof uppForShare?.typography?.letterSpacingEm === "number"
      ? `${uppForShare.typography.letterSpacingEm}em`
      : "Belirtilmedi";

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyState("ok");
        setTimeout(() => setCopyState("idle"), 2000);
      } catch {
        setCopyState("fail");
        setTimeout(() => setCopyState("idle"), 2500);
      }
    }
  }, [shareUrl]);

  const downloadQr = useCallback(() => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "lexilens-profil-qr.png";
    a.click();
  }, []);

  const saveImported = useCallback(() => {
    if (!linkUpp || !looksLikeUpp(linkUpp)) return;
    setUpp(linkUpp);
    setSaveState("ok");
    setTimeout(() => setSaveState("idle"), 2000);
  }, [linkUpp]);

  const addChartImageToPdf = async (pdf, el, y, title) => {
    if (!el) return y;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(title, 14, y);
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const img = canvas.toDataURL("image/png");
    const imgW = 180;
    const imgH = (canvas.height * imgW) / canvas.width;
    let nextY = y + 4;
    if (nextY + imgH > 280) {
      pdf.addPage();
      nextY = 20;
    }
    pdf.addImage(img, "PNG", 14, nextY, imgW, imgH);
    return nextY + imgH + 8;
  };

  const downloadProfilePdf = useCallback(async () => {
    if (!uppForShare) return;
    try {
      setPdfState("loading");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("LexiLens Okuma Profili", 14, 18);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 14, 26);

      let y = 35;
      pdf.setFont("helvetica", "bold");
      pdf.text("Harf karisikliklari", 14, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.text(`Visual: ${JSON.stringify(visualData)}`, 14, y);
      y += 6;
      pdf.text(`Auditory: ${JSON.stringify(auditoryData)}`, 14, y);
      y += 6;
      pdf.text(`Vowel: ${JSON.stringify(vowelData)}`, 14, y);

      y += 10;
      pdf.setFont("helvetica", "bold");
      pdf.text("Okuma tercihleri", 14, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.text(`Font: ${String(fontPref)}`, 14, y);
      y += 6;
      pdf.text(`Arka plan: ${String(backgroundPref)}`, 14, y);
      y += 6;
      pdf.text(`Harf araligi: ${String(letterSpacingPref)}`, 14, y);
      y += 6;
      pdf.text(`Okuma hizi seviyesi: ${String(readingSpeedLevel)}`, 14, y);

      y += 10;
      pdf.setFont("helvetica", "bold");
      pdf.text("Kisisel sozluk", 14, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      if (!wordDictionary.length) {
        pdf.text("Sozlukte kayit yok.", 14, y);
        y += 6;
      } else {
        for (const row of wordDictionary) {
          const line = `${row.kelime} -> ${row.nasılOkudum || "-"} (${row.sayi || 1}x)`;
          if (y > 280) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, 14, y);
          y += 6;
        }
      }

      y += 4;
      y = await addChartImageToPdf(pdf, chartBarRef.current, y, "En cok karistirilan kelimeler");
      y = await addChartImageToPdf(pdf, chartPieRef.current, y, "Karistirma orani");
      y = await addChartImageToPdf(pdf, chartLineRef.current, y, "Haftalik kelime trendi");

      if (y > 285) {
        pdf.addPage();
        y = 20;
      }
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(10);
      pdf.text("Bu belge LexiLens tarafindan olusturulmustur.", 14, y + 6);
      pdf.save("lexilens-okuma-profili.pdf");
      setPdfState("ok");
      setTimeout(() => setPdfState("idle"), 1500);
    } catch (err) {
      console.log("[SharePage] PDF olusturma hatasi:", err);
      setPdfState("fail");
      setTimeout(() => setPdfState("idle"), 2000);
    }
  }, [
    uppForShare,
    visualData,
    auditoryData,
    vowelData,
    fontPref,
    backgroundPref,
    letterSpacingPref,
    readingSpeedLevel,
    wordDictionary,
  ]);

  if (!uppForShare) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-2xl font-semibold text-stone-900">Profil paylaşımı</h1>
        <p className="mt-3 leading-relaxed text-stone-700">
          Paylaşılacak profil bulunamadı. Boş profil ile devam edebilirsiniz.
        </p>
        <Link
          to="/kalibrasyon"
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white"
        >
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
    <main className="mx-auto max-w-lg px-5 py-10 pb-16">
      <header className="mb-8">
        <p className="text-sm font-medium text-stone-600">LexiLens</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">
          Profil paylaşımı
        </h1>
        <p className="mt-2 leading-relaxed text-stone-700">
          Bağlantıyı kopyalayın veya QR kodu indirerek öğretmeniniz veya ailenizle
          paylaşın. Bağlantı profilinizi içerir.
        </p>
      </header>

      {showImport ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">
            Bu sayfa paylaşılan bir bağlantıyla açıldı.
          </p>
          <button
            type="button"
            onClick={saveImported}
            className="mt-3 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Profili bu cihaza kaydet
          </button>
          {saveState === "ok" ? (
            <p className="mt-2 text-sm text-emerald-800">Profil kaydedildi.</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-800">Bağlantı</h2>
        <p className="mt-2 break-all rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 sm:text-sm">
          {shareUrl}
        </p>
        <button
          type="button"
          onClick={copyLink}
          disabled={!shareUrl}
          className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white shadow-sm disabled:bg-stone-300"
        >
          {copyState === "ok"
            ? "Kopyalandı!"
            : copyState === "fail"
              ? "Kopyalanamadı — tekrar deneyin"
              : "Bağlantıyı kopyala"}
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-sm">
        <h2 className="text-sm font-semibold text-stone-800">QR kod</h2>
        <p className="mt-1 text-xs text-stone-600">
          Telefonla taratarak aynı bağlantıya gidebilirsiniz.
        </p>
        <div className="mt-4 inline-block rounded-xl border border-stone-200 bg-white p-3">
          {shareUrl?.trim() ? (
            <QRCodeSVG
              ref={qrRef}
              value={shareUrl}
              size={220}
              level="M"
              includeMargin
              bgColor="#ffffff"
              fgColor="#14532d"
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={downloadQr}
          disabled={!shareUrl}
          className="mt-4 w-full rounded-xl border-2 border-emerald-800/40 bg-white px-4 py-3 text-base font-semibold text-emerald-900 disabled:border-stone-200 disabled:text-stone-400"
        >
          QR kodu indir
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-2 text-sm text-stone-600">
        <Link
          to="/profil"
          className="font-medium text-emerald-900 underline decoration-2 underline-offset-4"
        >
          Profil özetine dön
        </Link>
        <Link
          to="/"
          className="text-emerald-900 underline decoration-2 underline-offset-4"
        >
          Ana sayfa
        </Link>
      </div>

      <div className="pointer-events-none fixed -left-[9999px] top-0 w-[900px] bg-white p-6">
        <div ref={chartBarRef} className="h-[280px] w-[840px] bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="kelime" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="sayi" fill="#86efac" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div ref={chartPieRef} className="mt-6 h-[280px] w-[840px] bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                <Cell fill="#bfdbfe" />
                <Cell fill="#a7f3d0" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div ref={chartLineRef} className="mt-6 h-[280px] w-[840px] bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <XAxis dataKey="hafta" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="sayi" stroke="#93c5fd" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
