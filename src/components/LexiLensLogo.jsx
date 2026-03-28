export default function LexiLensLogo({ className = "", ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="LexiLens logosu"
      {...props}
    >
      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="28"
        className="fill-emerald-700/15 stroke-emerald-800/40"
        strokeWidth="2"
      />
      <circle cx="60" cy="60" r="34" className="stroke-emerald-800" strokeWidth="3" />
      <circle cx="60" cy="60" r="22" className="fill-emerald-600/25" />
      <circle cx="52" cy="54" r="6" className="fill-emerald-500/80" />
    </svg>
  );
}
