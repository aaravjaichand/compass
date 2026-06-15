"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./HelpMapInner";

// Leaflet touches `window` on import, so the real map is loaded client-only.
const Inner = dynamic(
  () => import("./HelpMapInner").then((m) => m.HelpMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] animate-pulse rounded-lg border border-border bg-surface-2" />
    ),
  },
);

export type { MapPoint };

export function HelpMap({
  points,
  lang,
}: {
  points: MapPoint[];
  lang: "en" | "es";
}) {
  return <Inner points={points} lang={lang} />;
}
