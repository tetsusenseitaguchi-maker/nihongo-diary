import type { FeedItem, FriendProgress, SuggestedUser } from "./types";

export const stats = {
  totalDiaries: 128,
  thisMonth: 18,
  thisMonthDelta: 4,
  currentStreak: 26,
  bestStreak: 42,
  following: 24,
  monthlyGoal: 20,
};

export const userName = "Emily Sato";
export const userInitials = "ES";

export const communityActivity: FeedItem[] = [
  { id: "c1", name: "Yuki Tanaka", initials: "YT", action: "wrote a new diary", time: "2h ago" },
  { id: "c2", name: "Hiroshi Nakamura", initials: "HN", action: "reached a 30-day streak 🔥", time: "6h ago" },
  { id: "c3", name: "Sakura K.", initials: "SK", action: "liked your diary", time: "1d ago" },
  { id: "c4", name: "Daichi Yamamoto", initials: "DY", action: "commented on your diary", time: "2d ago" },
];

export const friendsProgress: FriendProgress[] = [
  { name: "Yuki Tanaka", initials: "YT", streak: 36, days: bits("11111111111110") },
  { name: "Hiroshi Nakamura", initials: "HN", streak: 30, days: bits("11111111110111") },
  { name: "Sakura K.", initials: "SK", streak: 14, days: bits("11111110110100") },
  { name: "Daichi Yamamoto", initials: "DY", streak: 7, days: bits("11110100100000") },
];

export const learningFeed: FeedItem[] = [
  {
    id: "f1",
    name: "Yuki",
    initials: "YT",
    action: "wrote a diary today",
    time: "2 hours ago",
    body: "友だちとカフェに行って、楽しい時間を過ごしました。",
  },
  {
    id: "f2",
    name: "Matt",
    initials: "MA",
    action: "reached a 10-day streak 🔥",
    time: "5 hours ago",
    body: "Amazing consistency!",
    badge: "streak",
  },
  {
    id: "f3",
    name: "Natalie",
    initials: "NA",
    action: "completed 5 diaries this week",
    time: "Yesterday",
    body: "You're making great progress!",
  },
];

export const suggestedUsers: SuggestedUser[] = [
  { name: "Hiro", initials: "HI", level: "N4 Learner" },
  { name: "Sophie", initials: "SO", level: "N5 Learner" },
  { name: "Takeshi", initials: "TA", level: "N3 Learner" },
];

function bits(s: string): boolean[] {
  return s.split("").map((c) => c === "1");
}
