// src/lib/mp3/workers/runMetaScanner.ts

import {readMp3Meta}          from "@/features/mp3/lib/readMp3Meta";
import type {Mp3Entry}        from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath} from "@/features/mp3/types/trackMeta";
import React                  from "react";

type Picture = { data: Uint8Array; format: string };
type RunIdRef = { current: number };
type Args = {
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;

  track: (url: string) => void;

  setMetaByPath: React.Dispatch<React.SetStateAction<TrackMetaByPath>>;
  setCoverUrlByPath: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;

  shouldDeferTag?: (entry: Mp3Entry) => boolean;
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

export const runMetaScanner = async (args: Args): Promise<void> => {
  const {items, runIdRef, track, setMetaByPath, setCoverUrlByPath, shouldDeferTag} = args;

  const myRunId = ++runIdRef.current;

  const doOne = async (entry: Mp3Entry): Promise<void> => {
    if (runIdRef.current !== myRunId) return;

    try {
      const file = await entry.fileHandle.getFile();
      const tag = await readMp3Meta(file);

      const createdCoverUrl = createCoverUrl(track, tag.picture ?? undefined);

      if (runIdRef.current !== myRunId) return;

      if (createdCoverUrl) {
        setCoverUrlByPath((prev) => {
          if (prev[entry.path]) return prev;
          return {...prev, [entry.path]: createdCoverUrl};
        });
      }

      setMetaByPath((prev) => {
        const current = prev[entry.path];
        if (!current) return prev;

        const nextMeta = {
          ...current,
          title: current.title?.trim() ? current.title : (tag.title ?? current.title),
          artist: current.artist?.trim() ? current.artist : (tag.artist ?? current.artist),
          album: current.album?.trim() ? current.album : (tag.album ?? current.album),
          year: current.year ?? tag.year,
          trackNo: current.trackNo ?? tag.trackNo,

          // ✅ 歌詞はここでは「入ってなければ」くらいにしておく（txt優先は別worker）
          lyrics: current.lyrics?.trim() ? current.lyrics : (tag.lyrics ?? current.lyrics),
          lyricsLrc: current.lyricsLrc?.trim() ? current.lyricsLrc : (tag.lyricsLrc ?? current.lyricsLrc),
        };

        return {...prev, [entry.path]: nextMeta};
      });
    } catch {
      // ignore
    }

    await yieldToBrowser();
  };

  const deferred: Mp3Entry[] = [];

  // 1st pass: 先に処理する（=後回しじゃないもの）
  for (const entry of items) {
    if (runIdRef.current !== myRunId) return;

    if (shouldDeferTag?.(entry)) {
      deferred.push(entry);
      continue;
    }

    await doOne(entry);
  }

  // 2nd pass: 後回し分（Fantiaなど）を最後に処理
  for (const entry of deferred) {
    if (runIdRef.current !== myRunId) return;
    await doOne(entry);
  }
};