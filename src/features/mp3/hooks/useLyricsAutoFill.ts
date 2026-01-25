// src/features/mp3/hooks/useLyricsAutoFillFromPublic.ts
"use client";

import {fetchPublicLyricsByTitle} from "@/features/mp3/lib/lyrics/fetchPublicLyricsByTitle";
import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}     from "@/features/mp3/types/trackMeta";

import React, {Dispatch, SetStateAction, useEffect, useRef} from "react";

type Args = {
  /**
   * 読み取り専用配列で、MP3エントリのリストを含みます。
   * 配列の各エントリは、特定のMP3ファイルに関するメタデータまたは情報を表します。
   *
   * この配列は不変であり、初期化後にその構造や要素を変更することはできません。
   */
  mp3List: readonly Mp3Entry[];

  /**
   * ファイルパスと対応するメタデータを関連付けるマッピング。
   * ファイルパスはキーとして機能し、メタデータにはアプリケーションの文脈に応じて、
   * ファイルタイプ、再生時間、アーティスト、アルバム、その他の関連属性などの情報が含まれる場合があります。
   *
   * @type {TrackMetaByPath}
   */
  metaByPath: TrackMetaByPath;

  /**
   * 歌詞処理の実行における現在の識別子を保持する参照オブジェクト。
   * これは通常、アクティブな実行IDを可変状態に追跡するために使用されます。
   *
   * @type {{ current: number }}
   */
  lyricsRunIdRef: { current: number };

  /**
   * 特定のパスに関連付けられたメタデータを更新するために使用されるディスパッチ関数。
   * これにより、`TrackMetaByPath` の状態を動的に更新することが可能になります。
   *
   * @param {Function} setMetaByPathAction - Reactの`Dispatch`関数で、`TrackMetaByPath`状態を変更するための`SetStateAction`を受け取ります。
   */
  setMetaByPathAction: Dispatch<SetStateAction<TrackMetaByPath>>;
};

/**
 * カスタムフックで、文字列の`Set`を含むReact refオブジェクトを提供します。
 * この`Set`は、一意のパス文字列のコレクションを保存・管理するために使用できます。
 * 既に試したpathを覚える（無限fetch防止）
 */
const useTriedPathSet = (): React.RefObject<Set<string>> => {
  return useRef<Set<string>>(new Set());
};

export function useLyricsAutoFill(args: Args): void {
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

        // 4曲以外なら null が返る想定（内部で keyword 判定）
        const lyrics = await fetchPublicLyricsByTitle(titleCandidate);

        if (!lyrics) continue;
        triedPathSetRef.current.add(path); // ✅ 成否に関わらず「このpathは試した」扱い

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
