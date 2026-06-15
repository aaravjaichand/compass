"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

type Lang = "en" | "es";

export type MapPoint = {
  id: string;
  name: string;
  org: string;
  hours?: string;
  phone?: string;
  /** A full, geocodable address string for the Directions link. */
  address: string;
  lat: number;
  lng: number;
};

const LABELS: Record<Lang, { directions: string }> = {
  en: { directions: "Directions" },
  es: { directions: "Cómo llegar" },
};

/** Whether the app is currently in dark mode (root `data-theme="dark"`). */
function useDarkTheme(): boolean {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() =>
      setDark(el.getAttribute("data-theme") === "dark"),
    );
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Frame the map to the markers once it mounts. */
function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    } else if (points.length > 1) {
      map.fitBounds(
        points.map((p) => [p.lat, p.lng] as [number, number]),
        { padding: [40, 40], maxZoom: 14 },
      );
    }
  }, [map, points]);
  return null;
}

export function HelpMapInner({
  points,
  lang,
}: {
  points: MapPoint[];
  lang: Lang;
}) {
  const dark = useDarkTheme();
  const accent = dark ? "#5b7cfa" : "#2347d9";
  const tileUrl = dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const t = LABELS[lang];

  return (
    <div
      className="relative z-0 overflow-hidden rounded-lg border border-border"
      style={{ height: 360 }}
    >
      <MapContainer
        center={[40.73, -74.06]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FitToPoints points={points} />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={9}
            pathOptions={{
              color: accent,
              weight: 2,
              fillColor: accent,
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{p.name}</strong>
                <div style={{ color: "#666", marginTop: 2 }}>{p.org}</div>
                {p.hours ? <div style={{ marginTop: 6 }}>{p.hours}</div> : null}
                {p.phone ? <div style={{ marginTop: 2 }}>{p.phone}</div> : null}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    p.address,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    fontWeight: 600,
                    color: accent,
                  }}
                >
                  {t.directions} →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
