import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.7,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icon = {
  home: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  ),
  pen: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M15.5 5.5 18.5 8.5" />
      <path d="M4 20l1-4L16 5a2 2 0 0 1 3 3L8 19l-4 1Z" />
    </svg>
  ),
  calendar: (p: IconProps) => (
    <svg {...base} {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  ),
  history: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 5v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  template: (p: IconProps) => (
    <svg {...base} {...p}>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M3.5 9h17M9 9v11" />
    </svg>
  ),
  support: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M12 4.5c2.5-2.2 6.5-1 6.5 2.4 0 3-3.4 5.3-6.5 7.6-3.1-2.3-6.5-4.6-6.5-7.6C5.5 3.5 9.5 2.3 12 4.5Z" />
    </svg>
  ),
  feed: (p: IconProps) => (
    <svg {...base} {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.5a3 3 0 0 1 0 5M17.5 19a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  ),
  profile: (p: IconProps) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </svg>
  ),
  flame: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M12 3c1 2.5-.5 3.8-1.5 5C9 9.7 8 11 8 13a4 4 0 0 0 8 0c0-1.6-.7-3-1.7-4.2-.3 1-1 1.7-1.8 2 .6-2.5-.2-5-.5-7.8Z" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  ),
  arrow: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  plus: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  menu: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  close: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  sparkle: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.6 10.4 12.2 5 10.6 10.4 9 12 3.5Z" />
      <path d="M18.5 4.5v3M20 6h-3" />
    </svg>
  ),
  book: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M5 4.5h9a2.5 2.5 0 0 1 2.5 2.5V20H7.5A2.5 2.5 0 0 1 5 17.5Z" />
      <path d="M16.5 7H19v13h-2.5" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  ),
  star: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M12 4l2.3 4.7 5.2.8-3.75 3.65.9 5.15L12 15.9l-4.65 2.45.9-5.15L4.5 9.5l5.2-.8L12 4Z"
        fill="currentColor"
      />
    </svg>
  ),
  starLine: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M12 4l2.3 4.7 5.2.8-3.75 3.65.9 5.15L12 15.9l-4.65 2.45.9-5.15L4.5 9.5l5.2-.8L12 4Z" />
    </svg>
  ),
  sun: (p: IconProps) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
    </svg>
  ),
  cloud: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 18Z" />
    </svg>
  ),
  rain: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 15Z" />
      <path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" />
    </svg>
  ),
  camera: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  ),
  mic: (p: IconProps) => (
    <svg {...base} {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </svg>
  ),
  stop: (p: IconProps) => (
    <svg {...base} {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  play: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M8 5.5v13l11-6.5Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  trash: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" />
    </svg>
  ),
  mapPin: (p: IconProps) => (
    <svg {...base} {...p}>
      <path d="M12 2.5c-3.3 0-6 2.7-6 6 0 4.8 6 13 6 13s6-8.2 6-13c0-3.3-2.7-6-6-6z" />
      <circle cx="12" cy="8.5" r="2.2" />
    </svg>
  ),
};

export const weatherIcon = { sunny: "sun", cloudy: "cloud", rainy: "rain" } as const;

export type IconName = keyof typeof Icon;

export function renderIcon(name: string, className?: string) {
  const C = Icon[name as IconName] ?? Icon.book;
  return <C className={className} />;
}
