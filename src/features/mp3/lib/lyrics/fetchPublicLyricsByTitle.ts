// src/features/mp3/lib/lyrics/fetchPublicLyricsByTitle.ts
import {loadLyricsMap} from "@/features/mp3/lib/lyrics/publicLyricsMap";
import {toPublicUrl}   from "@/features/mp3/lib/publicAssets/toPublicUrl";

const normalize = (s: string): string =>
  s.normalize("NFKC").toLowerCase().trim();

const lyricsCache = new Map<string, string>(); // fileName -> lyrics

// TODO(推奨): 取得処理を共通化して、他の public fetch（json/tsv）にも使えるようにする

const inFlightLyricsByFileName = new Map<string, Promise<string | null>>();

export const fetchPublicLyricsByTitle = async (title: string): Promise<string | null> => {
  const map = await loadLyricsMap();
  const t = normalize(title);

  const rule = map.rules.find((r) => t.includes(normalize(r.keyword)));
  if (!rule) return null;

  const cached = lyricsCache.get(rule.fileName);
  if (cached) return cached;

  const inFlight = inFlightLyricsByFileName.get(rule.fileName);
  if (inFlight) return inFlight;

  const task = (async (): Promise<string | null> => {
    // ✅ basePath対応: "lyrics/日本語.txt" を相対で作り、URL化する
    const txtUrl = toPublicUrl(`lyrics/${encodeURIComponent(rule.fileName)}`);

    const response = await fetch(txtUrl, {cache: "force-cache"});
    if (!response.ok) return null;

    const text = (await response.text()).trim();
    if (!text) return null;

    lyricsCache.set(rule.fileName, text);
    return text;
  })();

  inFlightLyricsByFileName.set(rule.fileName, task);

  try {
    return await task;
  } finally {
    // 成功/失敗どちらでも in-flight は掃除（失敗時に次回リトライ可能）
    inFlightLyricsByFileName.delete(rule.fileName);
  }
};

