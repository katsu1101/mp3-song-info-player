// src/lib/mp3/workers/startDirCoverWorker.ts

import {findFirstImageFileHandle} from "@/lib/fsAccess/findFirstImageFileHandle";
import {resolveDirectoryHandle}   from "@/lib/fsAccess/resolveDirectoryHandle";
import {getDirname}    from "@/lib/path/getDirname";
import type {Mp3Entry} from "@/features/mp3/types/mp3Entry";
import React           from "react";

type RunIdRef = { current: number };
type Args = {
  rootHandle: FileSystemDirectoryHandle;
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;

  track: (url: string) => void;
  setDirCoverUrlByDir: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

export const startDirCoverWorker = async (args: Args): Promise<void> => {
  const {rootHandle, items, runIdRef, track, setDirCoverUrlByDir} = args;

  const myRunId = ++runIdRef.current;

  // 対象フォルダを抽出（"" はルート扱い）
  const dirPaths = Array.from(new Set(items.map((x) => getDirname(x.path))));

  // 先に null で埋める（UI都合で undefined を避けたい場合）
  setDirCoverUrlByDir(() => {
    const next: Record<string, string | null> = {};
    for (const dirPath of dirPaths) next[dirPath] = null;
    return next;
  });

  // 軽くするため同時2本くらい
  const concurrency = 2;
  let cursor = 0;

  const runOne = async () => {
    while (cursor < dirPaths.length) {
      if (runIdRef.current !== myRunId) return;

      const dirPath = dirPaths[cursor++]!;
      try {
        const dirHandle = await resolveDirectoryHandle(rootHandle, dirPath);
        const imgHandle = await findFirstImageFileHandle(dirHandle);
        if (!imgHandle) {
          await yieldToBrowser();
          continue;
        }

        const file = await imgHandle.getFile();
        const url = URL.createObjectURL(file);
        track(url);

        setDirCoverUrlByDir((prev) => {
          if (prev[dirPath] === url) return prev;
          return {...prev, [dirPath]: url};
        });
      } catch {
        // フォルダが消えた/権限/読み取り失敗は無視
      }

      await yieldToBrowser();
    }
  };

  await Promise.all(Array.from({length: concurrency}, () => runOne()));
};
