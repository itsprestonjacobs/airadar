"use client";

import dynamic from "next/dynamic";

const RadarMap = dynamic(() => import("./RadarMap"), { ssr: false });

export default function RadarMapLoader(props: { lat?: number; lon?: number; zoom?: number }) {
  return <RadarMap {...props} />;
}
