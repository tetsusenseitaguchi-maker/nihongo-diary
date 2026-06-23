interface ObieProps {
  size?: number;
  className?: string;
}

/**
 * Placeholder Obie avatar — a friendly red toy-poodle face.
 * Swap this out for the real Obie illustration later.
 */
export function Obie({ size = 48, className }: ObieProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Obie, the Nihongo Diary guide"
    >
      <circle cx="32" cy="32" r="32" fill="#f6ead9" />
      {/* ears */}
      <ellipse cx="15" cy="30" rx="9" ry="12" fill="#c2724b" />
      <ellipse cx="49" cy="30" rx="9" ry="12" fill="#c2724b" />
      {/* head fluff */}
      <circle cx="32" cy="22" r="12" fill="#d98a5e" />
      {/* face */}
      <ellipse cx="32" cy="35" rx="15" ry="14" fill="#e3a072" />
      <ellipse cx="32" cy="40" rx="9" ry="8" fill="#f3d9c2" />
      {/* eyes */}
      <circle cx="26" cy="33" r="2.4" fill="#3a2a22" />
      <circle cx="38" cy="33" r="2.4" fill="#3a2a22" />
      <circle cx="26.8" cy="32.2" r="0.8" fill="#fff" />
      <circle cx="38.8" cy="32.2" r="0.8" fill="#fff" />
      {/* nose + mouth */}
      <ellipse cx="32" cy="39" rx="2.6" ry="2" fill="#3a2a22" />
      <path
        d="M32 41v2.5M32 43.5c-2 0-3 1-3 1M32 43.5c2 0 3 1 3 1"
        stroke="#3a2a22"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* cheeks */}
      <circle cx="22" cy="39" r="2.2" fill="#e7b59a" opacity="0.7" />
      <circle cx="42" cy="39" r="2.2" fill="#e7b59a" opacity="0.7" />
    </svg>
  );
}
