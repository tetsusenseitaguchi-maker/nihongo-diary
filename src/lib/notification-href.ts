/**
 * Where a notification points.
 *
 * Shared, not copied, because the bell and a push notification are two doors
 * onto the same event. Two copies of this drift the moment one type gains a
 * destination — and the failure is silent: the bell opens the diary while the
 * push opens the dashboard, and nothing tells anyone the two disagree.
 *
 * A pure function of three fields, so it imports nothing and runs on either
 * side — NotificationBell is a client component, /api/push/send is a webhook
 * handler on the server.
 *
 * The paths are relative on purpose. The service worker rewrites anything
 * that does not resolve to this origin into /dashboard (see safeUrl in
 * public/sw.js), so an absolute URL built from the wrong host would silently
 * lose the destination rather than fail loudly.
 */

export type NotificationTarget = {
  type: string;
  diaryEntryId?: string | null;
  /** Username of whoever caused the notification, when there is one. */
  actorUsername?: string | null;
};

export function notificationHref(n: NotificationTarget): string {
  switch (n.type) {
    case "follow":
      return n.actorUsername ? `/profile/${n.actorUsername}` : "/feed";
    case "new_diary":
      return n.diaryEntryId ? `/diary/${n.diaryEntryId}` : "/feed";
    case "reaction":
    case "comment":
      return n.diaryEntryId ? `/diary/${n.diaryEntryId}` : "/history";
    case "reply":
      return n.diaryEntryId ? `/diary/${n.diaryEntryId}` : "/feed";
    case "obie_write":
      return "/write";
    default:
      return "/dashboard";
  }
}
