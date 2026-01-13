// src/lib/mp3/workers/startMetaWorker.ts

import {readMp3Meta}          from "@/lib/mp3/readMp3Meta";
import type {Mp3Entry}        from "@/types/mp3Entry";
import type {TrackMetaByPath} from "@/types/trackMeta";
import React                  from "react";

type Picture = { data: Uint8Array; format: string };
type RunIdRef = { current: number };
type CoverUrlByPathRef = { current: Record<string, string | null> };
type Args = {
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;

  track: (url: string) => void;

  setMetaByPath: React.Dispatch<React.SetStateAction<TrackMetaByPath>>;
  setCoverUrlByPath: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;

  // 既存挙動維持用（第二弾では消さない）
  coverUrlByPathRef: CoverUrlByPathRef;
};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

const createCoverObjectUrlFromPicture = (track: (url: string) => void, picture?: Picture): string | null => {
  if (!picture) return null;

  const copied = new Uint8Array(picture.data);
  const blob = new Blob([copied], {type: picture.format});
  const url = URL.createObjectURL(blob);
  track(url);
  return url;
};

export const startMetaWorker = async (args: Args): Promise<void> => {
  const {items, runIdRef, track, setMetaByPath, setCoverUrlByPath, coverUrlByPathRef} = args;

  const myRunId = ++runIdRef.current;

  for (const entry of items) {
    if (runIdRef.current !== myRunId) return;

    try {
      const file = await entry.fileHandle.getFile();
      const meta = await readMp3Meta(file);

      const alreadyCover = coverUrlByPathRef.current[entry.path];
      const coverUrl = alreadyCover ?? createCoverObjectUrlFromPicture(track, meta.picture);

      if (coverUrl && !alreadyCover) {
        setCoverUrlByPath((prev) => ({...prev, [entry.path]: coverUrl}));
      }

      if (runIdRef.current !== myRunId) return;

      setMetaByPath((prev) => ({
        ...prev,
        [entry.path]: {
          title: meta.title ?? entry.fileHandle.name,
          artist: meta.artist ?? "",
          album: meta.album ?? "",
          trackNo: meta.trackNo ?? null,
          year: meta.year ?? null,
          coverUrl: coverUrl ?? null,
        },
      }));
    } catch {
      // 失敗時はダミーのまま
    }

    await yieldToBrowser();
  }
};
