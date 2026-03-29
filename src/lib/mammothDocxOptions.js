/**
 * Mammoth ek styleMap: Türkçe/İngilizce Word stilleri, içindekiler, alıntı, başlık.
 * Önce kullanıcı haritası, sonra gömülü, sonra mammoth varsayılanı uygulanır.
 */
export const MAMMOTH_EXTRA_STYLE_MAP = [
  // —— Başlıklar (Türkçe Word) ——
  "p[style-name='Başlık 1'] => h1:fresh",
  "p[style-name='Başlık 2'] => h2:fresh",
  "p[style-name='Başlık 3'] => h3:fresh",
  "p[style-name='Başlık 4'] => h4:fresh",
  "p[style-name='Başlık 5'] => h5:fresh",
  "p[style-name='Başlık 6'] => h6:fresh",
  "p[style-name='Başlık 7'] => h6.docx-heading-alt:fresh",
  "p[style-name='Başlık 8'] => h6.docx-heading-alt:fresh",
  "p[style-name='Başlık 9'] => h6.docx-heading-alt:fresh",
  "p[style-name='başlık 1'] => h1:fresh",
  "p[style-name='başlık 2'] => h2:fresh",
  "p[style-name='başlık 3'] => h3:fresh",
  // —— Özet / içindekiler paragrafları ——
  "p[style-name='TOC Heading'] => h2.docx-toc-heading:fresh",
  "p[style-name='TOC 1'] => p.lexi-toc-line.lexi-toc-1:fresh",
  "p[style-name='TOC 2'] => p.lexi-toc-line.lexi-toc-2:fresh",
  "p[style-name='TOC 3'] => p.lexi-toc-line.lexi-toc-3:fresh",
  "p[style-name='TOC 4'] => p.lexi-toc-line.lexi-toc-4:fresh",
  "p[style-name='TOC 5'] => p.lexi-toc-line.lexi-toc-5:fresh",
  "p[style-name='TOC 6'] => p.lexi-toc-line.lexi-toc-6:fresh",
  "p[style-name='TOC 7'] => p.lexi-toc-line.lexi-toc-7:fresh",
  "p[style-name='TOC 8'] => p.lexi-toc-line.lexi-toc-8:fresh",
  "p[style-name='TOC 9'] => p.lexi-toc-line.lexi-toc-9:fresh",
  "p[style-name='İçindekiler Başlığı'] => h2.docx-toc-heading:fresh",
  "p[style-name='İçindekiler 1'] => p.lexi-toc-line.lexi-toc-1:fresh",
  "p[style-name='İçindekiler 2'] => p.lexi-toc-line.lexi-toc-2:fresh",
  "p[style-name='İçindekiler 3'] => p.lexi-toc-line.lexi-toc-3:fresh",
  "p[style-name='İçindekiler 4'] => p.lexi-toc-line.lexi-toc-4:fresh",
  "p[style-name='İçindekiler 5'] => p.lexi-toc-line.lexi-toc-5:fresh",
  "p[style-name='İçindekiler 6'] => p.lexi-toc-line.lexi-toc-6:fresh",
  "p[style-name='İçindekiler 7'] => p.lexi-toc-line.lexi-toc-7:fresh",
  "p[style-name='İçindekiler 8'] => p.lexi-toc-line.lexi-toc-8:fresh",
  "p[style-name='İçindekiler 9'] => p.lexi-toc-line.lexi-toc-9:fresh",
  "p[style-name='İçindekilerHeading'] => h2.docx-toc-heading:fresh",
  // —— Başlık / alt başlık ——
  "p[style-name='Title'] => p.docx-title:fresh",
  "p[style-name='Subtitle'] => p.docx-subtitle:fresh",
  "p[style-name='Konu Başlığı'] => p.docx-subtitle:fresh",
  "p[style-name='Alt Konu Başlığı'] => p.docx-subtitle:fresh",
  // —— Listeler ——
  "p[style-name='List Paragraph'] => p.docx-list-paragraph:fresh",
  "p[style-name='Liste Paragrafı'] => p.docx-list-paragraph:fresh",
  "p[style-name='Maddesi'] => p.docx-list-paragraph:fresh",
  // —— Alıntı ——
  "p[style-name='Quote'] => blockquote.docx-quote > p:fresh",
  "p[style-name='Alıntı'] => blockquote.docx-quote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote.docx-quote.docx-quote-intense > p:fresh",
  "p[style-name='Güçlü Alıntı'] => blockquote.docx-quote.docx-quote-intense > p:fresh",
  // —— Tablo başlığı / özet (yapı korunsun) ——
  "p[style-name='Caption'] => p.docx-caption:fresh",
  "p[style-name='Başlık (Şekil ve Tablo)'] => p.docx-caption:fresh",
  // —— Vurgu karakter stilleri (Word tema adları) ——
  "r[style-name='Emphasis'] => em",
  "r[style-name='Vurgu'] => em",
  "r[style-name='Yeşil vurgu'] => mark",
  "r[style-name='Sarı vurgu'] => mark",
  "r[style-name='Parlak yeşil vurgu'] => mark",
  "r[style-name='Annotation Reference'] =>",
  // —— Ek başlık eşlemeleri (LibreOffice / Google) ——
  "p[style-name='Heading'] => h1:fresh",
];

/** Mammoth convertToHtml ikinci argümanı */
export function getMammothConvertOptions() {
  return {
    includeDefaultStyleMap: true,
    includeEmbeddedStyleMap: true,
    ignoreEmptyParagraphs: false,
    styleMap: MAMMOTH_EXTRA_STYLE_MAP,
  };
}
