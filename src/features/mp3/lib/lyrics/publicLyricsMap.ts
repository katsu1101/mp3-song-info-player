// src/features/mp3/lib/lyrics/publicLyricsMap.ts
import {PUBLIC_ASSET_PATHS} from "@/features/mp3/const/publicAssets";
import {toPublicUrl}        from "@/features/mp3/lib/publicAssets/toPublicUrl";

export type LyricsMapRule = {
  keyword: string;
  fileName: string; // 日本語OK
};

export type LyricsMapJson = {
  version: number;
  updatedAt: string;
  rules: readonly LyricsMapRule[];
};

let cachedMap: LyricsMapJson | null = null;

export const loadLyricsMap = async (): Promise<LyricsMapJson> => {
  if (cachedMap) return cachedMap;

  const url = toPublicUrl(PUBLIC_ASSET_PATHS.lyricsMapV1);
  const response = await fetch(url, {cache: "force-cache"});
  if (!response.ok) {
    throw new Error(`lyrics-map fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as LyricsMapJson;

  // 最低限のランタイム防御（Zod入れるならここを置換）
  if (!json || !Array.isArray(json.rules)) {
    throw new Error("lyrics-map json is invalid");
  }

  cachedMap = json;
  return json;
};
