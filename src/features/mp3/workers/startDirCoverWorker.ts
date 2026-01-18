// src/lib/mp3/workers/startDirCoverWorker.ts

import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {ScanMediaTreeResult} from "@/lib/fsAccess/scanMediaTree";
import {getDirname}               from "@/lib/path";
import React                      from "react";

type RunIdRef = { current: number };

type Args = {
  scanResult: ScanMediaTreeResult; // ✅ 名前を修正
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;
  runId: number;

  track: (url: string) => void;
  setDirCoverUrlByDir: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

export const startDirCoverWorker = async (args: Args): Promise<void> => {
  const {scanResult, items, runIdRef, runId, track, setDirCoverUrlByDir} = args;

  // 対象フォルダ（"" はルート扱い）
  const dirPaths = Array.from(new Set(items.map((x) => getDirname(x.path))));

  // 先に null で埋める（UI都合で undefined を避ける）
  setDirCoverUrlByDir(() => {
    const next: Record<string, string | null> = {};
    for (const dirPath of dirPaths) next[dirPath] = null;
    return next;
  });

  // 軽量に逐次（必要なら concurrency 2 でもOK）
  for (const dirPath of dirPaths) {
    if (runIdRef.current !== runId) return;

    const imgHandle = scanResult.dirBestImageByDir.get(dirPath);

    if (!imgHandle) {
      await yieldToBrowser();
      continue;
    }

    try {
      const file = await imgHandle.getFile();
      const url = URL.createObjectURL(file);
      track(url);
      setDirCoverUrlByDir((prev) => {
        if (prev[dirPath] === url) return prev;
        return {...prev, [dirPath]: url};
      });
    } catch {
      // ignore（権限/削除/読み取り失敗など）
    }

    await yieldToBrowser();
  }
};
