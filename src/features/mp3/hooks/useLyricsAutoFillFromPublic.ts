// src/features/mp3/hooks/useLyricsAutoFillFromPublic.ts
"use client";

import {fetchPublicLyricsByTitle} from "@/features/mp3/lib/lyrics/fetchPublicLyricsByTitle";
import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}                               from "@/features/mp3/types/trackMeta";
import React, {Dispatch, SetStateAction, useEffect, useRef} from "react";

type Args = {
  mp3List: readonly Mp3Entry[];
  metaByPath: TrackMetaByPath;
  lyricsRunIdRef: { current: number };
  setMetaByPathAction:  Dispatch<SetStateAction<TrackMetaByPath>>;
};

// 既に試したpathを覚える（無限fetch防止）
const useTriedPathSet = (): React.RefObject<Set<string>> => {
  return useRef<Set<string>>(new Set());
};

export function useLyricsAutoFillFromPublic(args: Args): void {
  const {mp3List, metaByPath, lyricsRunIdRef, setMetaByPathAction} = args;
  const triedPathSetRef = useTriedPathSet();

  useEffect(() => {
    if (!Array.isArray(mp3List) || mp3List.length === 0) return;

    const runId = ++lyricsRunIdRef.current;
    let isCanceled = false;

    const run = async (): Promise<void> => {
      for (const entry of mp3List) {
        if (isCanceled) return;
        if (lyricsRunIdRef.current !== runId) return;

        const path = entry.path;
        if (!path) continue;

        // 既に試したならスキップ（メタ更新のたびに回らないように）
        if (triedPathSetRef.current.has(path)) continue;

        const currentMeta = metaByPath[path];
        if (!currentMeta) continue;

        // ✅ 既に歌詞があるなら上書きしない
        if (typeof currentMeta.lyrics === "string" && currentMeta.lyrics.trim()) {
          triedPathSetRef.current.add(path);
          continue;
        }

        // 判定対象タイトル（あなたのTrackMetaの実体に合わせて候補を用意）
        const titleCandidate = currentMeta.title + path;

        if (!titleCandidate) continue;

        // 4曲以外なら null が返る想定（内部で keyword 判定）
        const lyrics = await fetchPublicLyricsByTitle(titleCandidate);
        triedPathSetRef.current.add(path); // ✅ 成否に関わらず「このpathは試した」扱い

        if (isCanceled) return;
        if (lyricsRunIdRef.current !== runId) return;
        if (!lyrics) continue;

        setMetaByPathAction((prev) => {
          const now = prev[path];
          if (!now) return prev;

          // ✅ 競合して後から埋まってたら上書きしない
          if (typeof now.lyrics === "string" && now.lyrics.trim()) return prev;

          return {
            ...prev,
            [path]: {
              ...now,
              lyrics,
            },
          };
        });
      }
    };

    void run();

    return () => {
      isCanceled = true;
    };
  }, [mp3List, metaByPath, lyricsRunIdRef, setMetaByPathAction, triedPathSetRef]);
}
