// src/features/mp3/lib/lyrics/fetchPublicLyricsByTitle.ts
import {toPublicUrl} from "@/features/mp3/lib/publicAssets/toPublicUrl";
import {loadLyricsMap} from "@/features/mp3/lib/lyrics/publicLyricsMap";

const normalize = (s: string): string =>
  s.normalize("NFKC").toLowerCase().trim();

const lyricsCache = new Map<string, string>(); // fileName -> lyrics

export const fetchPublicLyricsByTitle = async (title: string): Promise<string | null> => {

  const map = await loadLyricsMap();
  const t = normalize(title);

  const rule = map.rules.find((r) => t.includes(normalize(r.keyword)));
  if (!rule) return null;

  const cached = lyricsCache.get(rule.fileName);
  if (cached) return cached;

  // ✅ basePath対応: "lyrics/日本語.txt" を相対で作り、URL化する
  const txtUrl = toPublicUrl(`lyrics/${encodeURIComponent(rule.fileName)}`);

  const response = await fetch(txtUrl, {cache: "force-cache"});
  if (!response.ok) return null;

  const text = (await response.text()).trim();
  if (!text) return null;

  lyricsCache.set(rule.fileName, text);
  return text;
};
