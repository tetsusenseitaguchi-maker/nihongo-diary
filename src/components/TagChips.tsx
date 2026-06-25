interface TagChipsProps {
  tags: string[];
  activeTag?: string | null;
  onTagClick?: (tag: string) => void;
}

export function TagChips({ tags, activeTag, onTagClick }: TagChipsProps) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => {
        const isActive = activeTag === t;
        return (
          <span
            key={t}
            onClick={onTagClick ? () => onTagClick(t) : undefined}
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              isActive
                ? "bg-pine text-cream"
                : "bg-mint text-pine"
            } ${onTagClick ? "cursor-pointer hover:bg-moss hover:text-cream" : ""}`}
          >
            #{t}
          </span>
        );
      })}
    </div>
  );
}
