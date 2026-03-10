"use client";

import { useEffect, useState } from "react";

// Small responsive hook that translates a media query into React state.
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  // Subscribe to viewport changes so components react instantly when screen size crosses breakpoint.
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    // Keep one callback so we can add/remove the exact same listener reference.
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
