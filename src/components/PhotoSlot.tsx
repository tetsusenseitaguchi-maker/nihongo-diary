import { Obie } from "@/components/Obie";

/**
 * A wide image area meant to hold a real Obie photo. Pass `src` once you add
 * the photo to /public; until then it shows a friendly placeholder.
 */
export function PhotoSlot({
  src,
  className = "",
  rounded = "rounded-2xl",
}: {
  src?: string;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Obie"
        className={`h-full w-full object-cover ${rounded} ${className}`}
      />
    );
  }
  return (
    <div
      className={`relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br from-sage to-mint ${rounded} ${className}`}
    >
      <div className="genkou-soft absolute inset-0 opacity-50" aria-hidden />
      <div className="relative flex flex-col items-center gap-2">
        <Obie size={84} />
        <span className="rounded-full bg-paper/70 px-3 py-1 text-[11px] font-semibold text-pine">
          Obie photo
        </span>
      </div>
    </div>
  );
}
