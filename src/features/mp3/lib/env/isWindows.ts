// src/features/mp3/lib/env/isWindows.ts
"use client";

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

export const isWindows = (): boolean => {
  // Next.js の万が一の呼び出し事故対策（server側では false 扱い）
  if (typeof window === "undefined") return false;

  const nav = navigator as NavigatorWithUAData;

  // ✅ 優先: User-Agent Client Hints
  const platform = nav.userAgentData?.platform ?? "";
  if (platform.toLowerCase().includes("windows")) return true;

  // ✅ フォールバック: userAgent 文字列
  const ua = navigator.userAgent ?? "";
  return ua.toLowerCase().includes("windows");
};
