/** .docx (ZIP) ilk baytları PK… */

export function looksLikeZipDocx(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 4) return false;
  const u = new Uint8Array(arrayBuffer.slice(0, 4));
  return u[0] === 0x50 && u[1] === 0x4b;
}

/** Eski Microsoft Word .doc (OLE bileşik dosya) imzası */

export function looksLikeOleLegacyDoc(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 4) return false;
  const u = new Uint8Array(arrayBuffer.slice(0, 4));
  return u[0] === 0xd0 && u[1] === 0xcf && u[2] === 0x11 && u[3] === 0xe0;
}
