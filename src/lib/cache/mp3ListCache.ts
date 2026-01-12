// src/lib/cache/mp3ListCache.ts

import {getDb, type Mp3ListItem} from "@/lib/cache/db";

export const saveMp3ListCache = async (dirKey: string, items: Mp3ListItem[]): Promise<void> => {
  const db = await getDb();
  await db.put("mp3Lists", {dirKey, updatedAt: Date.now(), items}, dirKey);
};

export const loadMp3ListCache = async (dirKey: string): Promise<Mp3ListItem[] | null> => {
  const db = await getDb();
  const data = await db.get("mp3Lists", dirKey);
  return data?.items ?? null;
};
