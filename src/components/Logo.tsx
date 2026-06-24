import Link from "next/link";

export function Logo({
  href = "/",
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 group">
      <span
        className={`grid ${box} place-items-center rounded-xl bg-pine text-cream shadow-card transition-transform group-hover:-rotate-3`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 5h7a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2Z" />
          <path d="M14 7a2 2 0 0 1 2-2h3v14h-5" />
          <circle cx="10" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <path d="M10 13.4v1.6M10 15c-.8 0-1.2.4-1.2.4M10 15c.8 0 1.2.4 1.2.4" strokeWidth="1" />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-serif text-[17px] font-bold tracking-tight text-pine">
          Nihongo Diary
        </span>
      </span>
    </Link>
  );
}
