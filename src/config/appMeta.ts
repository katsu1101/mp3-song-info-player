// src/config/appMeta.ts

import {getBasePath}                            from "@/config/getBasePath";
import type {Metadata, MetadataRoute, Viewport} from "next";

const basePath = getBasePath();

/**
 * アプリ内での「正規化した」アイコン定義
 * - src/sizes/type/purpose を揃えて持つ（Manifest寄り）
 * - Next Metadataへは変換して使う（url に変換）
 */
type AppIcon = Readonly<{
  src: string;
  sizes: `${number}x${number}`;
  type: string;
  purpose?: "any" | "maskable" | "monochrome";
}>;

type AppMeta = Readonly<{
  name: string;
  shortName: string;
  title: string;
  description: string;
  url: string;

  themeColor: string;
  backgroundColor: string;

  startUrl: string;
  scope: string;
  swPath: string;

  icons: readonly AppIcon[];

  // Nextの icons 生成でよく使う補助（favicon, appleなど）
  faviconIcoPath: string;
  appleTouchIconPath: string;

  // OGP/Twitter用
  ogImagePath: string;
}>;

export const appMeta: AppMeta = {
  name: "とじょりん音楽プレイヤー",
  shortName: "とじょ音プレ",
  title: "とじょりん音楽プレイヤー",
  description: "とじょりん関連の音楽ファイル（mp3など）を再生するアプリ",
  url: "https://katsu1101.github.io/mp3-song-info-player",

  themeColor: "#ffd9d9",
  backgroundColor: "#ffffff",

  startUrl: `${basePath}/`,
  scope: `${basePath}/`,
  swPath: `${basePath}/sw.js`,

  // ✅ ここを “唯一の真実” にする（正規化）
  icons: [
    {src: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png"},
    {src: `${basePath}/icons/icon-512.png`, sizes: "512x512", type: "image/png"},
    {src: `${basePath}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable"},
  ] as const,

  faviconIcoPath: `${basePath}/favicon.ico`,
  // iOS定番は 180x180 が多いけど、まずは 192 を使う例
  appleTouchIconPath: `${basePath}/icons/icon-192.png`,

  // OGP画像は「絶対URL」で指定しがちなので、pathとして持っておく
  ogImagePath: "/og/og-image.png",
} as const;

/* ---------------------------
 * 変換関数
 * ------------------------- */

const toNextIcon = (icon: AppIcon) => ({
  url: icon.src,
  sizes: icon.sizes,
  type: icon.type,
});

const toManifestIcon = (icon: AppIcon) => ({
  src: icon.src,
  sizes: icon.sizes,
  type: icon.type,
  ...(icon.purpose ? {purpose: icon.purpose} : {}),
});

/* ---------------------------
 * Next.js (app/layout.tsx) 用
 * ------------------------- */

export const nextMetadata: Metadata = {
  applicationName: appMeta.name,
  title: appMeta.title,
  description: appMeta.description,
  metadataBase: new URL(appMeta.url),
  alternates: {
    canonical: "./",
  },
  icons: {
    icon: [
      {url: appMeta.faviconIcoPath},
      // Nextの icons.icon に maskable を入れるかは好みだけど、
      // ここでは通常アイコン(512)だけにしておく例
      ...appMeta.icons
        .filter((i) => i.purpose !== "maskable")
        .map(toNextIcon),
    ],
    apple: [
      {url: appMeta.appleTouchIconPath, sizes: "192x192", type: "image/png"},
    ],
  },

  openGraph: {
    title: appMeta.title,
    description: appMeta.description,
    url: appMeta.url,
    siteName: appMeta.name,
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: `${appMeta.url}${appMeta.ogImagePath}`,
        width: 1200,
        height: 630,
        alt: appMeta.name,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@katsu1101",
    creator: "@katsu1101",
    title: appMeta.name,
    description: appMeta.description,
    images: [`${appMeta.url}${appMeta.ogImagePath}`],
  },
};

export const nextViewport: Viewport = {
  themeColor: appMeta.themeColor,
};

/* ---------------------------
 * Next.js (app/manifest.ts) 用
 * ------------------------- */

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
    icons: appMeta.icons.map(toManifestIcon),
  };
}
