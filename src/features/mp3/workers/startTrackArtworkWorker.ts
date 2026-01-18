// src/features/mp3/workers/startTrackArtworkWorker.ts
import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {ScanMediaTreeResult} from "@/lib/fsAccess/scanMediaTree";
import {getDirname}               from "@/lib/path";
import React                      from "react";

type RunIdRef = { current: number };

type Args = {
  scanResult: ScanMediaTreeResult;
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;
  runId: number;

  track: (url: string) => void;
  setArtworkUrlByPath: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

const getBaseNameWithoutExt = (pathLike: string): string => {
  const slash = Math.max(pathLike.lastIndexOf("/"), pathLike.lastIndexOf("\\"));
  const fileName = slash >= 0 ? pathLike.slice(slash + 1) : pathLike;

  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return fileName;
  return fileName.slice(0, dot);
};

const getBundleKey = (dirPath: string, baseName: string): string =>
  dirPath ? `${dirPath}/${baseName}` : baseName;

export const startTrackArtworkWorker = async (args: Args): Promise<void> => {
  const {scanResult, items, runIdRef, runId, track, setArtworkUrlByPath} = args;

  const concurrency = 2;
  let cursor = 0;

  const runOne = async (): Promise<void> => {
    while (cursor < items.length) {
      if (runIdRef.current !== runId) return;

      const entry = items[cursor++]!;
      const dirPath = getDirname(entry.path);
      const baseName = getBaseNameWithoutExt(entry.path);
      const key = getBundleKey(dirPath, baseName);

      const bundle = scanResult.bundleByKey.get(key);
      const imgHandle = bundle?.trackImage?.handle;

      if (!imgHandle) {
        await yieldToBrowser();
        continue;
      }

      try {
        const file = await imgHandle.getFile();
        const url = URL.createObjectURL(file);
        track(url);
        // ✅ 外部画像は「未設定なら補完」(埋め込みジャケットと競合させない)
        setArtworkUrlByPath((prev) => {
          const current = prev[entry.path];
          if (current != null) return prev;
          return {...prev, [entry.path]: url};
        });
      } catch {
        // ignore
      }

      await yieldToBrowser();
    }
  };

  await Promise.all(Array.from({length: concurrency}, () => runOne()));
};
