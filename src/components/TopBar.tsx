import Link from "next/link";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ObiePhoto";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell } from "@/components/NotificationBell";

export function TopBar({
  name = "Learner",
  initials = "U",
  avatarUrl = "",
  userId = "",
}: {
  name?: string;
  initials?: string;
  avatarUrl?: string;
  userId?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex h-11 flex-1 items-center gap-2.5 rounded-full border border-line bg-paper px-4 text-sm text-muted">
        <Icon.search className="h-5 w-5 text-muted" />
        <input
          type="search"
          placeholder="Search diaries, words, topics…"
          className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
        />
      </label>

      {/* Compact language switcher */}
      <LanguageSwitcher compact />
      {userId && <NotificationBell userId={userId} />}

      <Link
        href="/profile"
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-paper pl-1.5 pr-3 hover:border-moss"
      >
        {avatarUrl ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          </span>
        ) : (
          <Avatar initials={initials} size={32} />
        )}
        <span className="hidden text-sm font-semibold text-ink sm:inline">{name}</span>
        <Icon.arrow className="hidden h-4 w-4 rotate-90 text-muted sm:inline" />
      </Link>
    </div>
  );
}
