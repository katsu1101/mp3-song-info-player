// src/config/appMeta.ts

import {getBasePath}                            from "@/config/getBasePath";
import type {Metadata, MetadataRoute, Viewport} from "next";

const basePath = getBasePath();

export const appMeta = {
  name: "とじょりんMP3プレイヤー",
  shortName: "とじょプレ",
  title: "とじょりんMP3プレイヤー",
  description: "とじょりん関連のMP3ファイルの曲を再生するアプリ",

  themeColor: "#ffd9d9",
  backgroundColor: "#ffffff",

  startUrl: `${basePath}/`,
  scope: `${basePath}/`,


  icons: [
    {src: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png"},
    {src: `${basePath}/icons/icon-512.png`, sizes: "512x512", type: "image/png"},
  ] as const,

  // TODO(推奨): GitHub Pages等の basePath 配信に対応する（startUrl/scope/registerパスも揃える）
  // TODO(推奨): maskable icons を追加（Androidの見栄え改善）
  // TODO(推奨): OGP / screenshots / shortcuts
} as const;

// Next.js (app/layout.tsx) 用
export const nextMetadata: Metadata = {
  applicationName: appMeta.name,
  title: appMeta.title,
  description: appMeta.description,
};

export const nextViewport: Viewport = {
  themeColor: appMeta.themeColor,
};

// Next.js (app/manifest.ts) 用
export function buildManifest(): MetadataRoute.Manifest {
  return {
    name: appMeta.name,
    short_name: appMeta.shortName,
    description: appMeta.description,
    start_url: appMeta.startUrl,
    scope: appMeta.scope,
    display: "standalone",
    background_color: appMeta.backgroundColor,
    theme_color: appMeta.themeColor,
    icons: [...appMeta.icons],
  };
}
