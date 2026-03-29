/**
 * @param {{ label: string, className?: string }} props
 */
export default function LoadingSpinner({ label, className = "" }) {
  return (
    <div
      className={`flex items-center gap-3 text-stone-700 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block size-8 shrink-0 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-600"
        aria-hidden
      />
      <span className="text-sm font-medium leading-snug">{label}</span>
    </div>
  );
}
