import { useEffect, useRef, useState } from "react";

const CONFIRM_DEFAULT =
  "Bu belgeyi silmek istediğinize emin misiniz?";

/**
 * Liste satırı ⋯ menüsü: Sil + onay.
 *
 * @param {{
 *   onDelete: () => void,
 *   confirmMessage?: string,
 *   menuId?: string,
 * }} props
 */
export default function DocumentKebabMenu({
  onDelete,
  confirmMessage = CONFIRM_DEFAULT,
  menuId,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleDelete = () => {
    setOpen(false);
    if (window.confirm(confirmMessage)) {
      onDelete();
    }
  };

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        id={menuId}
        aria-label="Belge seçenekleri"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex size-10 items-center justify-center rounded-xl text-xl leading-none text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        ⋯
      </button>
      {open ? (
        <ul
          role="menu"
          aria-labelledby={menuId}
          className="absolute right-0 top-full z-[60] mt-1 min-w-[8.5rem] rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm font-medium text-red-800 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              Sil
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
