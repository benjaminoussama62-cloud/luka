"use client";

import { useEffect } from "react";
import { isMobileApp, markMobileAppSession } from "@/lib/mobile-app";
import { useAyeba } from "@/lib/store";

/** App store shell: lighter UI + priorité RDC au premier lancement. */
export function MobileAppBootstrap() {
  const { setSlider } = useAyeba();

  useEffect(() => {
    if (!isMobileApp()) return;
    document.body.classList.add("ayeba-app-shell");
    markMobileAppSession();
    // RDC-first launch — boost local results without hiding global web
    setSlider("locality", 65);
  }, [setSlider]);

  return null;
}
