"use client";

import {appMeta}          from "@/config/appMeta";
import React, {useEffect} from "react";

export function RegisterServiceWorker(): React.JSX.Element | null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = async (): Promise<void> => {
      try {
        await navigator.serviceWorker.register(appMeta.swPath, {
          scope: appMeta.scope,
        });
      } catch (error) {
        console.error("ServiceWorker registration failed:", error);
      }
    };
    void register();
  }, []);

  return null;
}
