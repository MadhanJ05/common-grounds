"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";

export type Pin = {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  acceptsPaypal: boolean;
  daysLeft: number | null;
};

function icon(p: Pin) {
  const bg = !p.acceptsPaypal ? "#9a8f86" : p.daysLeft !== null ? "#2f6b4a" : "#b5562a";
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="width:34px;height:34px;border-radius:999px;background:${bg};display:flex;align-items:center;justify-content:center;color:white;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.25);border:2px solid white">☕</div>`,
  });
}

/** Zoom so every café is on screen. */
function FitToPins({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [28, 28] });
  }, [map, pins]);
  return null;
}

export default function CafeMap({ pins }: { pins: Pin[] }) {
  const center: [number, number] = [
    pins.reduce((s, p) => s + p.lat, 0) / Math.max(1, pins.length),
    pins.reduce((s, p) => s + p.lng, 0) / Math.max(1, pins.length),
  ];
  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      {/* OpenStreetMap tiles, muted with CSS (see globals.css) so the café pins carry the colour. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitToPins pins={pins} />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p)}>
          <Popup>
            <div style={{ minWidth: 160 }}>
              <strong>{p.name}</strong>
              <div style={{ color: "#6f5d50" }}>{p.neighborhood}</div>
              <div style={{ marginTop: 6 }}>
                {!p.acceptsPaypal
                  ? "Doesn't take PayPal, so no circle"
                  : p.daysLeft !== null
                    ? `You're in this circle · ${p.daysLeft}d left`
                    : "Buy a coffee here with PayPal to meet a new circle"}
              </div>
              {p.acceptsPaypal && (
                <a href={`/cafes/${p.id}`} style={{ display: "inline-block", marginTop: 6 }}>
                  Open →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
