"use client";
import dynamicLoad from "next/dynamic";
import type { MapPin } from "@/lib/types";

const LeafletMap = dynamicLoad(
  () => import("@/components/LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 animate-pulse rounded-2xl bg-mint/30 border border-line" />
    ),
  }
);

interface Place {
  id: string;
  lat: number;
  lng: number;
  place_name: string | null;
}

/**
 * `isOwner` is required, not optional. MapPin.isOwner defaults to true when
 * absent — sensible for /places, where own pins came first — and this
 * component never set it, so a stranger's diary rendered with the "your exact
 * location" pin and popup. A required prop makes the caller state which it is.
 */
export function DiaryPlaceMap({
  places,
  isOwner,
  diaryEntryId,
  diaryDate,
  diaryTitle,
}: {
  places: Place[];
  isOwner: boolean;
  diaryEntryId: string;
  diaryDate: string;
  diaryTitle: string | null;
}) {
  const pins: MapPin[] = places.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    name: p.place_name,
    isOwner,
    diaryEntryId,
    diaryDate,
    diaryTitle,
  }));

  return <LeafletMap pins={pins} height={220} />;
}
