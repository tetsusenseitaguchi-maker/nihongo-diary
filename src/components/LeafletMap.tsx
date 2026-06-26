"use client";
// Leaflet requires browser — this component is always loaded with ssr: false
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { MapPin } from "@/lib/types";

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
  }, []);
  return null;
}

// Material Design "person" path — renders as a white silhouette on the bg circle.
const PERSON_PATH =
  "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";

/**
 * Build a Leaflet DivIcon that looks like an avatar bubble.
 *
 * Own pin  — 40 px, dark-green border + double-ring shadow, full opacity.
 * Friend pin — 32 px, lighter border, 85 % opacity.
 *
 * Inside the bubble:
 *  • avatar image (if authorAvatar is set)
 *  • person silhouette SVG (fallback)
 */
function makePinIcon(pin: MapPin): L.DivIcon {
  const own = pin.isOwner !== false; // default true for backward compat
  const sz = own ? 40 : 32;
  const half = sz / 2;

  // Colours
  const green = own ? "#2d6a4f" : "#5a9176";
  const ring = own
    ? `border:3px solid ${green};box-shadow:0 0 0 2px white,0 0 0 4px ${green},0 3px 10px rgba(0,0,0,.45)`
    : `border:2.5px solid ${green};box-shadow:0 2px 6px rgba(0,0,0,.30)`;
  const opacity = own ? "1" : "0.87";

  // Inner content — avatar image OR person SVG
  let inner: string;
  if (pin.authorAvatar) {
    // Full-bleed avatar photo clipped to circle by outer overflow:hidden
    inner = `<img
      src="${pin.authorAvatar}"
      width="${sz}"
      height="${sz}"
      style="display:block;width:${sz}px;height:${sz}px;object-fit:cover;"
    />`;
  } else {
    // Person silhouette centred on green background
    const svgSz = Math.round(sz * 0.68); // icon occupies ~68 % of the bubble
    inner = `<div style="
        position:absolute;top:0;left:0;right:0;bottom:0;
        background:${green};
        display:flex;align-items:center;justify-content:center;
      ">
      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 24 24"
           width="${svgSz}" height="${svgSz}"
           fill="rgba(255,255,255,0.93)">
        <path d="${PERSON_PATH}"/>
      </svg>
    </div>`;
  }

  const html = `<div style="
      position:relative;
      width:${sz}px;height:${sz}px;
      border-radius:50%;
      overflow:hidden;
      ${ring};
      opacity:${opacity};
    ">${inner}</div>`;

  return new L.DivIcon({
    html,
    className: "",        // clear Leaflet's default white-box .leaflet-div-icon style
    iconSize: [sz, sz],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 6)],
  });
}

function jpDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ownPopupHtml(pin: MapPin): string {
  return `<div style="font-family:sans-serif;min-width:150px;line-height:1.6;">
    <strong style="font-size:13px;color:#1a3d2b;">${pin.name || "📍 場所"}</strong>
    ${pin.diaryTitle ? `<p style="margin:3px 0 0;font-size:12px;color:#444;">${pin.diaryTitle}</p>` : ""}
    ${pin.diaryDate ? `<p style="margin:2px 0 6px;font-size:11px;color:#888;">${jpDate(pin.diaryDate)}</p>` : ""}
    <a href="/diary/${pin.diaryEntryId}"
       style="color:#2d6a4f;font-weight:700;text-decoration:none;font-size:13px;">日記を読む →</a>
  </div>`;
}

function friendPopupHtml(pin: MapPin): string {
  const who = pin.authorName ? `${pin.authorName}さん` : "友達";
  return `<div style="font-family:sans-serif;min-width:160px;line-height:1.6;">
    <p style="margin:0 0 2px;font-size:12px;color:#555;">${who}がこのあたりを訪れました</p>
    <strong style="font-size:13px;color:#1a3d2b;">${pin.name || "📍 場所"}</strong>
    ${pin.diaryDate ? `<p style="margin:2px 0 6px;font-size:11px;color:#888;">${jpDate(pin.diaryDate)}</p>` : ""}
    <a href="/diary/${pin.diaryEntryId}"
       style="color:#2d6a4f;font-weight:700;text-decoration:none;font-size:12px;">日記を読む →</a>
    <p style="margin:5px 0 0;font-size:10px;color:#aaa;">📍 市レベルの概算位置</p>
  </div>`;
}

export function LeafletMap({ pins, height = 400 }: { pins: MapPin[]; height?: number }) {
  const latlngs = useMemo<Array<[number, number]>>(
    () => pins.map((p) => [p.lat, p.lng]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Re-create icons whenever pins change (e.g. friend pins added later).
  const icons = useMemo(() => pins.map((p) => makePinIcon(p)), [pins]);

  const center: [number, number] =
    pins.length > 0 ? [pins[0].lat, pins[0].lng] : [36.5, 138];

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-2xl border border-line">
      <MapContainer
        center={center}
        zoom={pins.length === 1 ? 12 : 5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
          maxZoom={19}
          detectRetina={true}
        />
        <InvalidateSize />
        {pins.length > 0 && <FitBounds latlngs={latlngs} />}
        {pins.map((pin, i) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={icons[i]}>
            <Popup>
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    pin.isOwner !== false ? ownPopupHtml(pin) : friendPopupHtml(pin),
                }}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
