import { Obie } from "@/components/Obie";

/**
 * A round Obie photo frame. Drop the real photo in /public/obie.jpg and pass
 * src="/obie.jpg" to use it; otherwise the placeholder avatar shows.
 */
export function ObiePhoto({
  size = 48,
  src = "/obie-avatar.png",
  className = "",
}: {
  size?: number;
  src?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-grid place-items-center overflow-hidden rounded-full bg-sage ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Obie"
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <Obie size={Math.round(size * 0.92)} />
      )}
    </span>
  );
}

/** Initials avatar used for learners in feed / community lists. */
export function Avatar({
  initials,
  size = 40,
  className = "",
}: {
  initials: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full bg-mint font-semibold text-pine ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}
