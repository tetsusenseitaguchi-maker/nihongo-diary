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

export function DiaryPlaceMap({
  places,
  diaryEntryId,
  diaryDate,
  diaryTitle,
}: {
  places: Place[];
  diaryEntryId: string;
  diaryDate: string;
  diaryTitle: string | null;
}) {
  const pins: MapPin[] = places.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    name: p.place_name,
    diaryEntryId,
    diaryDate,
    diaryTitle,
  }));

  return <LeafletMap pins={pins} height={220} />;
}
