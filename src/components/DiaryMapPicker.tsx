"use client";
// Leaflet requires browser — this component is always loaded with ssr: false
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import type { DiaryPlace } from "@/lib/types";

// Custom green circle pin — avoids Leaflet's default marker icon path issues
const PIN_ICON = new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#2d6a4f;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35);"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function MapClickHandler({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 0.5 });
  }, [map, target]);
  return null;
}

interface Props {
  places: DiaryPlace[];
  onPlacesChange: (places: DiaryPlace[]) => void;
}

export function DiaryMapPicker({ places, onPlacesChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const DEFAULT_CENTER: [number, number] = [36.5, 138];

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja,en`,
        { headers: { "User-Agent": "NihongoDiary/1.0 (language learning app)" } }
      );
      const d = await res.json();
      return (
        d.address?.city ||
        d.address?.town ||
        d.address?.village ||
        d.address?.hamlet ||
        d.name ||
        d.display_name?.split(",")[0] ||
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      );
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  function handleQuery(q: string) {
    setQuery(q);
    clearTimeout(timerRef.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=ja,en`,
          { headers: { "User-Agent": "NihongoDiary/1.0 (language learning app)" } }
        );
        setResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function pickResult(r: NominatimResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const name = r.display_name.split(",")[0].trim();
    if (!places.some((p) => Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001)) {
      onPlacesChange([...places, { lat, lng, name }]);
    }
    setFlyTarget([lat, lng]);
    setQuery("");
    setResults([]);
  }

  async function handleMapClick(lat: number, lng: number) {
    const name = await reverseGeocode(lat, lng);
    onPlacesChange([...places, { lat, lng, name }]);
    setFlyTarget([lat, lng]);
  }

  function handleGPS() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("お使いのブラウザは位置情報をサポートしていません。");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const name = await reverseGeocode(lat, lng);
        onPlacesChange([...places, { lat, lng, name }]);
        setFlyTarget([lat, lng]);
      },
      () => {
        setGpsError("位置情報を取得できませんでした。設定で許可してください。");
      }
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + GPS */}
      <div className="relative flex items-center gap-2" style={{ zIndex: 20 }}>
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="場所名で検索 · Search a place"
            className="w-full rounded-full border border-line bg-paper pl-4 pr-3 py-2 text-sm text-ink placeholder:text-muted focus:border-moss focus:outline-none"
          />
          {(results.length > 0 || searching) && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-line bg-paper shadow-lift overflow-hidden"
              style={{ zIndex: 3000 }}
            >
              {searching && (
                <p className="px-4 py-2 text-sm text-muted">検索中…</p>
              )}
              {results.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  onClick={() => pickResult(r)}
                  className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-mint/40 transition-colors"
                >
                  <span className="mt-0.5 shrink-0 text-moss-600 text-base">📍</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-pine">
                      {r.display_name.split(",")[0]}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {r.display_name.split(",").slice(1, 3).join(",")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleGPS}
          title="現在地を使う"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold text-pine hover:border-moss hover:bg-mint/40 transition-colors whitespace-nowrap"
        >
          📍 現在地
        </button>
      </div>

      {gpsError && (
        <p className="text-xs text-apricot">{gpsError}</p>
      )}

      {/* Map */}
      <div style={{ height: 280 }} className="relative overflow-hidden rounded-2xl border border-line">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
            maxZoom={19}
          />
          <MapClickHandler onAdd={handleMapClick} />
          <FlyTo target={flyTarget} />
          {places.map((p, i) => (
            <Marker key={`${p.lat}-${p.lng}-${i}`} position={[p.lat, p.lng]} icon={PIN_ICON} />
          ))}
        </MapContainer>
      </div>
      <p className="text-xs text-muted">地図をタップしてピンを置けます · Tap map to drop a pin</p>
    </div>
  );
}
