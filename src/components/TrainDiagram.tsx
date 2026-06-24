const cars = [
  {
    label: "Topic",
    sub: "what we talk about first",
    jp: "わたしは",
    en: "As for me",
    color: "#5b8a6f",
    bg: "#eaf2ec",
  },
  {
    label: "Details",
    sub: "extra info in the middle",
    jp: "きのう",
    en: "yesterday",
    color: "#4f7aa8",
    bg: "#eef1f6",
  },
  {
    label: "Important ending",
    sub: "the key point at the end",
    jp: "見ました",
    en: "watched (the key point)",
    color: "#c2724b",
    bg: "#f8edee",
  },
];

export function TrainDiagram() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-6">
      <div className="text-center">
        <p className="font-serif text-lg font-bold text-pine">
          Japanese sentence order
        </p>
        <p className="mt-1 text-sm text-muted">
          The important part comes at the end.
        </p>
      </div>

      {/* Cars */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        {cars.map((c) => (
          <div key={c.label} className="text-center">
            <div
              className="rounded-2xl border-2 px-2 py-3"
              style={{ borderColor: c.color, backgroundColor: c.bg }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: c.color }}
              >
                {c.label}
              </p>
              <p className="mt-1 hidden text-[10px] leading-tight text-muted sm:block">
                {c.sub}
              </p>
            </div>
            {/* wheels */}
            <div className="mt-1 flex justify-center gap-3">
              <span className="h-2 w-2 rounded-full bg-ink/30" />
              <span className="h-2 w-2 rounded-full bg-ink/30" />
            </div>
          </div>
        ))}
      </div>

      {/* Rail */}
      <div className="mt-1 h-0.5 w-full rounded bg-ink/20" />

      {/* Example sentence under the cars */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {cars.map((c) => (
          <div key={c.label} className="text-center">
            <p className="font-jp text-base font-semibold text-ink">{c.jp}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted">{c.en}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-xl bg-mint/60 px-4 py-3 text-center text-sm text-ink/80">
        Why? Because Japanese builds up to the point that matters most.
      </p>
    </div>
  );
}
