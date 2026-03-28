function ChevronLeftIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5 8.25 12l7.5-7.5"
      />
    </svg>
  );
}

/**
 * Sol üstte sabit geri düğmesi (profil ikonu ile aynı boyut/stil).
 * @param {{ onClick: () => void, 'aria-label'?: string }} props
 */
export default function FixedBackButton({ onClick, "aria-label": ariaLabel = "Geri" }) {
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-50 p-3 sm:p-4">
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border-2 border-stone-200 bg-white/95 text-stone-600 shadow-sm backdrop-blur-sm transition hover:border-emerald-600 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        aria-label={ariaLabel}
      >
        <ChevronLeftIcon className="size-6" />
      </button>
    </div>
  );
}
