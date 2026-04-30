"use client";

import { useEffect, useRef } from "react";

// Leaflet is loaded dynamically to avoid SSR issues (it uses window)
export default function RadarMap({
  lat = 37.5,
  lon = -95.5,
  zoom = 4,
}: {
  lat?: number;
  lon?: number;
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;

      // Fix default marker icon paths broken by webpack
      // @ts-expect-error leaflet internals
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [lat, lon],
        zoom,
        zoomControl: true,
        attributionControl: true,
      });

      mapRef.current = map;

      // Dark base map
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://carto.com/">CARTO</a> | Weather: <a href="https://mesonet.agron.iastate.edu/">IEM</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // NEXRAD radar overlay from IEM
      const radarLayer = L.tileLayer.wms(
        "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi",
        {
          layers: "nexrad-n0r",
          format: "image/png",
          transparent: true,
          attribution: "NEXRAD via IEM",
          opacity: 0.7,
        }
      );
      radarLayer.addTo(map);

      // Auto-refresh radar every 5 minutes
      const refreshInterval = setInterval(() => {
        // Force tile reload by removing and re-adding the layer
        radarLayer.remove();
        radarLayer.addTo(map);
      }, 5 * 60 * 1000);

      cleanup = () => {
        clearInterval(refreshInterval);
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => cleanup?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden"
        style={{ height: "420px", background: "var(--bg-card)" }}
      />
    </>
  );
}
