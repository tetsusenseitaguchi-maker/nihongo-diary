export const REACTIONS: { type: string; label: string; emoji: string }[] = [
  { type: "nice", label: "Nice!", emoji: "👍" },
  { type: "keep_going", label: "Keep going!", emoji: "💪" },
  { type: "great_streak", label: "Great streak!", emoji: "🔥" },
  { type: "congrats", label: "Congrats!", emoji: "🎉" },
];

export interface ActivityRow {
  id: string;
  user_id: string;
  activity_type: string;
  diary_entry_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function activityMessage(a: ActivityRow): string {
  const m = a.metadata ?? {};
  switch (a.activity_type) {
    case "joined":
      return "joined Nihongo Diary 🌱";
    case "wrote_diary":
      return m.is_public ? "shared a diary" : "wrote a diary";
    case "shared_diary":
      return "shared a diary";
    case "reached_streak":
      return `reached a ${m.streak ?? ""}-day streak`;
    case "completed_weekly_goal":
      return `completed ${m.count ?? ""} diaries this week`;
    default:
      return "had some activity";
  }
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(iso).toLocaleDateString();
}
