/**
 * Tek seferlik pdfjs worker yolu (react-pdf / pdfjs-dist ortak).
 * main.jsx en üstte içe aktarmalı.
 */
import { GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
