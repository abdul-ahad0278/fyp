"use client";

import { useEffect } from "react";

export default function PushServiceWorkerInitializer() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  }, []);

  return null;
}
