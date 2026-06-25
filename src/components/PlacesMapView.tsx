"use client";
import dynamicLoad from "next/dynamic";
import type { MapPin } from "@/lib/types";

const LeafletMap = dynamicLoad(
  () => import("@/components/LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] animate-pulse rounded-2xl bg-mint/30 border border-line" />
    ),
  }
);

export function PlacesMapView({ pins, height }: { pins: MapPin[]; height?: number }) {
  return <LeafletMap pins={pins} height={height ?? 500} />;
}
