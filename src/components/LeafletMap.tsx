"use client";
// Leaflet requires browser — this component is always loaded with ssr: false
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { MapPin } from "@/lib/types";

const PIN_ICON = new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#2d6a4f;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4);"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

// Recalculates tile grid after the container settles — fixes blurry tiles
// when the map is revealed inside a collapsible/animated container.
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function FitBounds({ latlngs }: { latlngs: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (latlngs.length === 0) return;
    if (latlngs.length === 1) {
      map.setView(latlngs[0], 12);
    } else {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 13 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fit only on mount
  return null;
}

export function LeafletMap({ pins, height = 400 }: { pins: MapPin[]; height?: number }) {
  const latlngs = useMemo<Array<[number, number]>>(
    () => pins.map((p) => [p.lat, p.lng]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const center: [number, number] = pins.length > 0 ? [pins[0].lat, pins[0].lng] : [36.5, 138];

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-2xl border border-line">
      <MapContainer
        center={center}
        zoom={pins.length === 1 ? 12 : 5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        {/* CARTO Voyager — supports {r} retina placeholder, free, no API key */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
          maxZoom={19}
          detectRetina={true}
        />
        <InvalidateSize />
        {pins.length > 0 && <FitBounds latlngs={latlngs} />}
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={PIN_ICON}>
            <Popup>
              <div style={{ fontFamily: "sans-serif", minWidth: 150, lineHeight: 1.5 }}>
                <strong style={{ fontSize: 13, color: "#1a3d2b" }}>
                  {pin.name || "📍 場所"}
                </strong>
                {pin.diaryTitle && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#444" }}>{pin.diaryTitle}</p>
                )}
                {pin.diaryDate && (
                  <p style={{ margin: "2px 0 6px", fontSize: 11, color: "#888" }}>
                    {new Date(pin.diaryDate + "T00:00:00").toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
                <a
                  href={`/diary/${pin.diaryEntryId}`}
                  style={{ color: "#2d6a4f", fontWeight: 700, textDecoration: "none", fontSize: 13 }}
                >
                  日記を読む →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
