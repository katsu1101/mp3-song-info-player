// src/lib/mp3/workers/startMetaWorker.ts

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
      const meta = await readMp3Meta(file);

      const createdCoverUrl = createCoverUrl(track, meta.picture);

      if (runIdRef.current !== myRunId) return;

      // ✅ 既に登録済みなら上書きしない（Refなしで安全）
      if (createdCoverUrl) {
        setCoverUrlByPath((prev) => {
          if (prev[entry.path]) return prev;
          return {...prev, [entry.path]: createdCoverUrl};
        });
      }

      // ✅ metaByPathは互換維持（ただし既存coverがある場合はnullのままになりうる）
      // TODO(第四弾): metaByPathからcoverUrlを削除して、covers側だけを参照する設計に寄せる
      setMetaByPath((prev) => ({
        ...prev,
        [entry.path]: {
          title: meta.title ?? entry.fileHandle.name,
          artist: meta.artist ?? "",
          album: meta.album ?? "",
          trackNo: meta.trackNo ?? null,
          year: meta.year ?? null,
          coverUrl: createdCoverUrl ?? prev[entry.path]?.coverUrl ?? null,
        },
      }));
    } catch {
      // ignore
    }

    await yieldToBrowser();
  }
};