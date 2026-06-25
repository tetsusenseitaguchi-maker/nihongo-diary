import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PlacesMapView } from "@/components/PlacesMapView";
import type { MapPin } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("diary_places")
    .select("id, lat, lng, place_name, diary_entry_id, diary_entries(diary_date, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  type PlaceRow = {
    id: string;
    lat: number;
    lng: number;
    place_name: string | null;
    diary_entry_id: string;
    diary_entries: { diary_date: string; title: string | null } | { diary_date: string; title: string | null }[] | null;
  };

  const rows = (data ?? []) as PlaceRow[];

  const pins: MapPin[] = rows.map((p) => {
    const de = Array.isArray(p.diary_entries) ? p.diary_entries[0] : p.diary_entries;
    return {
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      name: p.place_name,
      diaryEntryId: p.diary_entry_id,
      diaryDate: de?.diary_date ?? "",
      diaryTitle: de?.title ?? null,
    };
  });

  const count = pins.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">My Journey</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">
            訪れた場所
          </h1>
          <p className="mt-1 text-ink/70">My Places Map</p>
        </div>
        <LinkButton href="/write">
          <Icon.pen className="h-4 w-4" /> 日記を書く
        </LinkButton>
      </div>

      {/* Stats banner */}
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-pine to-moss-600 px-6 py-5 text-cream shadow-lift">
        <Icon.mapPin className="h-10 w-10 shrink-0 opacity-80" />
        <div>
          <p className="font-serif text-4xl font-bold">{count}</p>
          <p className="text-sm opacity-80">
            {count === 0 ? "場所がまだありません" : `ヶ所を訪れました · ${count} place${count === 1 ? "" : "s"} visited`}
          </p>
        </div>
      </div>

      {count === 0 ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="text-5xl">🗺️</span>
          <p className="font-serif text-xl font-bold text-pine">
            地図がまだ空です
          </p>
          <p className="max-w-sm text-sm text-ink/70">
            日記を書くときに「場所を追加」から場所を記録すると、ここに地図として溜まっていきます。
          </p>
          <LinkButton href="/write" className="mt-1">
            <Icon.pen className="h-4 w-4" /> 最初の場所を記録する
          </LinkButton>
        </Card>
      ) : (
        <>
          <PlacesMapView pins={pins} height={500} />

          {/* Recent places list */}
          <div>
            <h2 className="mb-3 font-serif text-lg font-bold text-pine">最近の場所 · Recent places</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {pins.slice(0, 10).map((pin) => (
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
        </>
      )}
    </div>
  );
}
