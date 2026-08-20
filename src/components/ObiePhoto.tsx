import { Obie } from "@/components/Obie";

/**
 * A round Obie face, at 28-56px, in eleven places across the app.
 *
 * The source is cut from obie-sitting — the same hand as the twenty-three
 * illustrations — rather than being the separate older drawing it used to be.
 * It is a FACE and not one of those figures on purpose: an avatar is read by
 * the face, and a whole dog in a 44px circle puts the head at about 16px,
 * which is legible as a dog and useless as an identifier. scripts/obie-face.mjs
 * cuts it, and explains how it finds the head.
 *
 * Every caller takes this default; none passes src. The prop stays because
 * changing the signature for eleven call sites that all want the same thing is
 * churn, and because a caller that one day wants a different face can have one.
 */
export function ObiePhoto({
  size = 48,
  src = "/obie/obie-face-sitting.webp",
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
