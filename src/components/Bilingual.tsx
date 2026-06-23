import { Furigana } from "@/components/Furigana";

/**
 * Shows a Japanese line (with furigana) and a small English line under it.
 * Use for learner-facing UI text so beginners can read AND understand it.
 */
export function Bilingual({
  jp,
  en,
  className = "",
  jpClassName = "",
  enClassName = "",
}: {
  jp: string;
  en?: string;
  className?: string;
  jpClassName?: string;
  enClassName?: string;
}) {
  return (
    <span className={`block ${className}`}>
      <Furigana text={jp} className={`font-jp ${jpClassName}`} />
      {en && <span className={`mt-0.5 block text-xs text-muted ${enClassName}`}>{en}</span>}
    </span>
  );
}
