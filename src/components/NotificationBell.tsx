"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { ObiePhoto, Avatar } from "@/components/ObiePhoto";
import { useT } from "@/contexts/locale";

interface NotifActor {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface NotifItem {
  id: string;
  type: string;
  actor_id: string | null;
  diary_entry_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  actor?: NotifActor | null;
}

function notifHref(n: NotifItem): string {
  switch (n.type) {
    case "follow":
      return n.actor?.username ? `/profile/${n.actor.username}` : "/feed";
    case "new_diary":
      return n.diary_entry_id ? `/diary/${n.diary_entry_id}` : "/feed";
    case "reaction":
    case "comment":
      return n.diary_entry_id ? `/diary/${n.diary_entry_id}` : "/history";
    case "reply":
      return n.diary_entry_id ? `/diary/${n.diary_entry_id}` : "/feed";
    case "obie_write":
      return "/write";
    default:
      return "/dashboard";
  }
}

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.is_read).length;

  async function load() {
    try {
      const r = await fetch("/api/notifications");
      if (r.ok) setItems((await r.json()).notifications ?? []);
    } catch {
      // ignore network errors silently
    }
  }

  useEffect(() => {
    if (!userId) return;
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Optimistically mark all read in UI
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      fetch("/api/notifications/mark-read", { method: "POST" }).catch(() => {});
    }
  }

  function rel(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60_000);
    const hr = Math.floor(ms / 3_600_000);
    const d = Math.floor(ms / 86_400_000);
    if (min < 1) return t("notification.justNow");
    if (min < 60) return t("notification.minutesAgo", { n: String(min) });
    if (hr < 24) return t("notification.hoursAgo", { n: String(hr) });
    return t("notification.daysAgo", { n: String(d) });
  }

  function notifText(n: NotifItem): string {
    const name =
      n.actor?.display_name || n.actor?.username || t("notification.someone");
    switch (n.type) {
      case "follow":
        return t("notification.follow", { name });
      case "new_diary":
        return t("notification.newDiary", { name });
      case "reaction":
        return t("notification.reaction", { name });
      case "comment":
        return t("notification.comment", { name });
      case "reply":
        return t("notification.reply", { name });
      case "obie_write":
        return t("notification.obieWrite");
      case "obie_streak":
        return t("notification.obieStreak", {
          days: String(n.metadata?.streak ?? ""),
        });
      case "obie_welcome_back":
        return t("notification.obieWelcomeBack");
      default:
        return "";
    }
  }

  function ActorAvatar({ n }: { n: NotifItem }) {
    if (n.type.startsWith("obie_")) return <ObiePhoto size={36} />;
    if (n.actor?.avatar_url)
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.actor.avatar_url}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
      );
    return (
      <Avatar
        initials={(
          n.actor?.display_name ||
          n.actor?.username ||
          "?"
        )
          .slice(0, 2)
          .toUpperCase()}
        size={36}
      />
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={toggle}
        aria-label={t("notification.title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-moss"
      >
        <Icon.bell className="h-5 w-5 text-ink/70" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-apricot px-0.5 text-[10px] font-bold leading-none text-cream">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-line bg-paper shadow-lift">
          <p className="border-b border-line px-4 py-3 text-sm font-bold text-pine">
            {t("notification.title")}
          </p>

          <ul className="max-h-[28rem] divide-y divide-line/40 overflow-y-auto">
            {items.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted">
                {t("notification.empty")}
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={notifHref(n)}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-mint/40 ${
                      !n.is_read ? "bg-mint/20" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <span className="mt-0.5 shrink-0">
                      <ActorAvatar n={n} />
                    </span>

                    {/* Text */}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-ink">
                        {notifText(n)}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {rel(n.created_at)}
                      </span>
                    </span>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-moss" />
                    )}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
