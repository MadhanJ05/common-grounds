"use client";

import dynamic from "next/dynamic";
import type { Pin } from "@/components/CafeMap";

// Leaflet touches `window`, so it only renders in the browser.
const CafeMap = dynamic(() => import("@/components/CafeMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-2" />,
});

export function CafeMapLoader({ pins }: { pins: Pin[] }) {
  return <CafeMap pins={pins} />;
}
