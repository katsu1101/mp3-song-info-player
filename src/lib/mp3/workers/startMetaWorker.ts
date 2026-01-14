// src/lib/mp3/workers/startMetaWorker.ts

import {normalizeMp3Tag}      from "@/lib/mp3/normalizeMp3Tag";
import {readMp3Meta}          from "@/lib/mp3/readMp3Meta";
import type {Mp3Entry}        from "@/types/mp3Entry";
import type {TrackMetaByPath} from "@/types/trackMeta";
import React                  from "react";

type Picture = { data: Uint8Array; format: string };
type RunIdRef = { current: number };
type Args = {
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;

  track: (url: string) => void;

  setMetaByPath: React.Dispatch<React.SetStateAction<TrackMetaByPath>>;
  setCoverUrlByPath: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;

};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

const createCoverUrl = (track: (url: string) => void, picture?: Picture): string | null => {
  if (!picture) return null;
  const copied = new Uint8Array(picture.data);
  const blob = new Blob([copied], {type: picture.format});
  const url = URL.createObjectURL(blob);
  track(url);
  return url;
};

export const startMetaWorker = async (args: Args): Promise<void> => {
  const {items, runIdRef, track, setMetaByPath, setCoverUrlByPath} = args;

  const myRunId = ++runIdRef.current;

  for (const entry of items) {
    if (runIdRef.current !== myRunId) return;

    try {
      const file = await entry.fileHandle.getFile();
      const rawMeta = await readMp3Meta(file);
      const tag = normalizeMp3Tag(rawMeta);

      const createdCoverUrl = createCoverUrl(track, rawMeta.picture);

      if (runIdRef.current !== myRunId) return;

      // ✅ 既に登録済みなら上書きしない（Refなしで安全）
      if (createdCoverUrl) {
        setCoverUrlByPath((prev) => {
          if (prev[entry.path]) return prev;
          return {...prev, [entry.path]: createdCoverUrl};
        });
      }

      // ここは既存のまま setMetaByPath を使ってOK（型だけMp3Tagになっている）
      setMetaByPath((previous) => ({
        ...previous,
        [entry.path]: tag,
      }));
    } catch {
      // ignore
    }

    await yieldToBrowser();
  }
};