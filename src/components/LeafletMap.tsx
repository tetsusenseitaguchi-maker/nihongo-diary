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

function makePinIcon(pin: MapPin): L.DivIcon {
  const own = pin.isOwner !== false;
  const size = own ? 36 : 30;
  const half = size / 2;
  const border = own ? "#2d6a4f" : "#8ab4a0";
  const bg = own ? "#2d6a4f" : "#8ab4a0";
  const opacity = own ? "1" : "0.82";
  const label = pin.authorName || "?";
  const initial = label.charAt(0).toUpperCase();
  const fsize = Math.round(size * 0.4);

  const inner = pin.authorAvatar
    ? `<img src="${pin.authorAvatar}" width="${size}" height="${size}" style="object-fit:cover;border-radius:50%;display:block;" />`
    : `<span style="font-size:${fsize}px;font-weight:700;color:#fff;line-height:1;">${initial}</span>`;

  return new L.DivIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid ${border};background:${bg};display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.35);opacity:${opacity};">${inner}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 4)],
  });
}

function jpDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("ja-JP", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function ownPopup(pin: MapPin): string {
  return `<div style="font-family:sans-serif;min-width:150px;line-height:1.6;">
    <strong style="font-size:13px;color:#1a3d2b;">${pin.name || "📍 場所"}</strong>
    ${pin.diaryTitle ? `<p style="margin:3px 0 0;font-size:12px;color:#444;">${pin.diaryTitle}</p>` : ""}
    ${pin.diaryDate ? `<p style="margin:2px 0 6px;font-size:11px;color:#888;">${jpDate(pin.diaryDate)}</p>` : ""}
    <a href="/diary/${pin.diaryEntryId}" style="color:#2d6a4f;font-weight:700;text-decoration:none;font-size:13px;">日記を読む →</a>
  </div>`;
}

function friendPopup(pin: MapPin): string {
  const who = pin.authorName ? `${pin.authorName}さん` : "友達";
  return `<div style="font-family:sans-serif;min-width:160px;line-height:1.6;">
    <p style="margin:0 0 2px;font-size:12px;color:#555;">${who}がこのあたりを訪れました</p>
    <strong style="font-size:13px;color:#1a3d2b;">${pin.name || "📍 場所"}</strong>
    ${pin.diaryDate ? `<p style="margin:2px 0 6px;font-size:11px;color:#888;">${jpDate(pin.diaryDate)}</p>` : ""}
    <a href="/diary/${pin.diaryEntryId}" style="color:#2d6a4f;font-weight:700;text-decoration:none;font-size:12px;">日記を読む →</a>
    <p style="margin:5px 0 0;font-size:10px;color:#aaa;">📍 市レベルの概算位置</p>
  </div>`;
}

export function LeafletMap({ pins, height = 400 }: { pins: MapPin[]; height?: number }) {
  const latlngs = useMemo<Array<[number, number]>>(
    () => pins.map((p) => [p.lat, p.lng]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const icons = useMemo(() => pins.map((p) => makePinIcon(p)), [pins]);

  const center: [number, number] = pins.length > 0 ? [pins[0].lat, pins[0].lng] : [36.5, 138];

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
              <div dangerouslySetInnerHTML={{ __html: pin.isOwner !== false ? ownPopup(pin) : friendPopup(pin) }} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
