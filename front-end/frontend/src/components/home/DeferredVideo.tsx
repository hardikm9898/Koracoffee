"use client";

import { useState, useEffect } from "react";

export default function DeferredVideo({ src, poster }: { src: string, poster: string }) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    // Defer heavy video loading to prioritize LCP
    const timer = setTimeout(() => setShowVideo(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!showVideo) return null;

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      poster={poster}
      preload="auto"
      className="absolute inset-0 w-full h-full object-cover opacity-60"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
