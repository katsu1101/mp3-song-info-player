"use client";


import {getBasePath}      from "@/config/getBasePath";
import React, {useEffect} from "react";

export function RegisterServiceWorker(): React.JSX.Element | null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const basePath = getBasePath();
    const swUrl = `${basePath}/sw.js`;
    void navigator.serviceWorker.register(swUrl).catch(() => {
      // TODO(推奨): 開発時だけ console.error(error)
    });
  }, []);

  return null;
}
