"use client";

import dynamic from "next/dynamic";

const  MapWrapper= dynamic(() => import("@/app/components/MapWrapper"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#081d2dff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(255,255,255,0.2)",
          borderTopColor: "#3B9FD4",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Memuat Peta...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

export default function Page() {
  return (
    <main>
      <MapWrapper />
    </main>
  );
}
