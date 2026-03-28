import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
  buildPaylasimShareUrl,
  decodeUppFromParam,
  encodeUppToParam,
  looksLikeUpp,
} from "../lib/uppShareCodec.js";
import { getUpp, setUpp } from "../utils/storage.js";

export default function SharePage() {
  const [searchParams] = useSearchParams();
  const qrRef = useRef(null);
  const [copyState, setCopyState] = useState("idle");
  const [saveState, setSaveState] = useState("idle");

  const linkUpp = useMemo(
    () => decodeUppFromParam(searchParams.get("d")),
    [searchParams]
  );

  const storedUpp = getUpp();
  const uppForShare =
    storedUpp && looksLikeUpp(storedUpp)
      ? storedUpp
      : linkUpp && looksLikeUpp(linkUpp)
        ? linkUpp
        : null;

  const shareUrl = (() => {
    if (!uppForShare) return "";
    try {
      return buildPaylasimShareUrl(encodeUppToParam(uppForShare));
    } catch {
      return "";
    }
  })();

  const showImport =
    Boolean(linkUpp && looksLikeUpp(linkUpp)) &&
    (!storedUpp ||
      !looksLikeUpp(storedUpp) ||
      JSON.stringify(storedUpp) !== JSON.stringify(linkUpp));

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

  if (!uppForShare) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-2xl font-semibold text-stone-900">Profil paylaşımı</h1>
        <p className="mt-3 leading-relaxed text-stone-700">
          Paylaşılacak bir okuma profili yok. Önce kalibrasyonu tamamlayın veya
          geçerli bir paylaşım bağlantısı kullanın.
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
          {shareUrl ? (
            <QRCodeCanvas
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
    </main>
  );
}
