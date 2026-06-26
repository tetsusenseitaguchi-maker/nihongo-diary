import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PlacesMapView } from "@/components/PlacesMapView";
import { getServerT } from "@/lib/i18n-server";
import { blurCoord } from "@/lib/geo";
import type { MapPin } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch own places, own profile, and follow list in parallel.
  const [{ data: ownData }, { data: profile }, { data: following }, t] =
    await Promise.all([
      supabase
        .from("diary_places")
        .select("id, lat, lng, place_name, diary_entry_id, diary_entries(diary_date, title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .single(),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      getServerT(),
    ]);

  type ProfileRow = {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };

  type PlaceRow = {
    id: string;
    lat: number;
    lng: number;
    place_name: string | null;
    diary_entry_id: string;
    user_id?: string;
    diary_entries:
      | { diary_date: string; title: string | null }
      | { diary_date: string; title: string | null }[]
      | null;
  };

  const p = profile as ProfileRow | null;
  const ownAuthorName = p?.display_name || p?.username || null;
  const ownAuthorAvatar = p?.avatar_url || null;

  const ownPins: MapPin[] = ((ownData ?? []) as PlaceRow[]).map((p) => {
    const de = Array.isArray(p.diary_entries) ? p.diary_entries[0] : p.diary_entries;
    return {
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      name: p.place_name,
      diaryEntryId: p.diary_entry_id,
      diaryDate: de?.diary_date ?? "",
      diaryTitle: de?.title ?? null,
      isOwner: true,
      authorName: ownAuthorName,
      authorAvatar: ownAuthorAvatar,
    };
  });

  // Fetch friends' places (public diaries only, via RLS).
  const followingIds = (following ?? []).map((f) => f.following_id);
  let friendPins: MapPin[] = [];

  if (followingIds.length > 0) {
    const { data: friendData } = await supabase
      .from("diary_places")
      .select(
        "id, lat, lng, place_name, diary_entry_id, user_id, diary_entries(diary_date, title)"
      )
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = (friendData ?? []) as (PlaceRow & { user_id: string })[];

    if (rows.length > 0) {
      const authorIds = [...new Set(rows.map((p) => p.user_id))];
      const { data: authors } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", authorIds);

      type AuthorProfile = {
        id: string;
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      };
      const authorMap: Record<string, AuthorProfile> = Object.fromEntries(
        ((authors ?? []) as AuthorProfile[]).map((a) => [a.id, a])
      );

      friendPins = rows.map((p) => {
        const de = Array.isArray(p.diary_entries) ? p.diary_entries[0] : p.diary_entries;
        const a = authorMap[p.user_id];
        return {
          id: p.id,
          // Blur to 0.2-degree precision (≈ 22 km) before sending to client.
          lat: blurCoord(p.lat),
          lng: blurCoord(p.lng),
          name: p.place_name,
          diaryEntryId: p.diary_entry_id,
          diaryDate: de?.diary_date ?? "",
          diaryTitle: de?.title ?? null,
          isOwner: false,
          authorName: a?.display_name || a?.username || null,
          authorAvatar: a?.avatar_url || null,
        };
      });
    }
  }

  const allPins = [...ownPins, ...friendPins];
  const ownCount = ownPins.length;
  const friendCount = friendPins.length;
  const isEmpty = allPins.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{t("places.journey")}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">
            訪れた場所
          </h1>
          <p className="mt-1 text-ink/70">{t("places.mapTitle")}</p>
        </div>
        <LinkButton href="/write">
          <Icon.pen className="h-4 w-4" /> 日記を書く
        </LinkButton>
      </div>

      {/* Stats banner */}
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-pine to-moss-600 px-6 py-5 text-cream shadow-lift">
        <Icon.mapPin className="h-10 w-10 shrink-0 opacity-80" />
        <div>
          <p className="font-serif text-4xl font-bold">{ownCount}</p>
          <p className="text-sm opacity-80">
            {ownCount === 0 ? "場所がまだありません" : t("places.visited", { count: ownCount })}
          </p>
          {friendCount > 0 && (
            <p className="mt-0.5 text-xs opacity-60">
              + 友達の場所 {friendCount} 件
            </p>
          )}
        </div>
      </div>

      {isEmpty ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="text-5xl">🗺️</span>
          <p className="font-serif text-xl font-bold text-pine">地図がまだ空です</p>
          <p className="max-w-sm text-sm text-ink/70">
            日記を書くときに「場所を追加」から場所を記録すると、ここに地図として溜まっていきます。
          </p>
          <LinkButton href="/write" className="mt-1">
            <Icon.pen className="h-4 w-4" /> 最初の場所を記録する
          </LinkButton>
        </Card>
      ) : (
        <>
          <PlacesMapView pins={allPins} height={500} />

          {/* Legend */}
          <div className="flex flex-wrap items-start gap-x-5 gap-y-1 rounded-xl bg-mint/30 px-4 py-3 text-xs text-ink/70">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-pine opacity-100" />
              自分の場所（正確な位置）
            </span>
            {friendCount > 0 && (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-moss-400 opacity-80" />
                  友達の場所（市レベルの概算位置）
                </span>
                <p className="w-full text-xs text-muted">
                  🔒 友達の場所はプライバシー保護のため約22km単位でぼかして表示しています。
                </p>
              </>
            )}
          </div>

          {/* Recent own places list */}
          {ownCount > 0 && (
            <div>
              <h2 className="mb-3 font-serif text-lg font-bold text-pine">
                {t("places.recentPlaces")}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {ownPins.slice(0, 10).map((pin) => (
                  <a
                    key={pin.id}
                    href={`/diary/${pin.diaryEntryId}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3 transition-shadow hover:shadow-lift"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-pine">
                      <Icon.mapPin className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-pine">
                        {pin.name || "場所"}
                      </p>
                      <p className="text-xs text-muted">
                        {pin.diaryDate
                          ? new Date(pin.diaryDate + "T00:00:00").toLocaleDateString("ja-JP", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </p>
                    </div>
                    <Icon.arrow className="h-4 w-4 shrink-0 text-moss-600" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
