// src/features/mp3/lib/lyrics/fetchPublicLyricsByTitle.ts
import {lyrics, lyricsRules} from "@/features/mp3/const/lyrics";

const normalize = (s: string): string =>
  s.normalize("NFKC").toLowerCase().trim();

export const fetchPublicLyricsByTitle = async (title: string): Promise<string | null> => {
  const t = normalize(title);

  const rule = lyricsRules.find((r) => t.includes(normalize(r.keyword)));
  if (!rule) return null;

  const text = lyrics[rule.key]; // inFlightLyricsByFileName.get(rule.fileName);
  if (!text) return null;

  return text;
};

