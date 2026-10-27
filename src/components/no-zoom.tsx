"use client";

import { useEffect } from "react";

/**
 * iOS Safari ignores `user-scalable=no` and `maximum-scale` for pinch zoom (an
 * accessibility decision on Apple's side) but still fires its proprietary
 * gesture events first, and cancelling them stops the zoom. Together with the
 * viewport settings and `touch-action` in globals.css, this makes the store
 * and the admin behave like an app: no pinch, no double-tap zoom.
 */
export function NoZoom() {
  useEffect(() => {
    const stop = (event: Event) => event.preventDefault();
    const events = ["gesturestart", "gesturechange", "gestureend"];

    for (const name of events) {
      document.addEventListener(name, stop, { passive: false });
    }
    return () => {
      for (const name of events) document.removeEventListener(name, stop);
    };
  }, []);

  return null;
}
