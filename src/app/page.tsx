"use client";

import {useAudioPlayer}          from "@/hooks/useAudioPlayer";
import {useFantiaMapping}        from "@/hooks/useFantiaMapping";
import {useMp3Library}           from "@/hooks/useMp3Library";
import {extractPrefixIdFromPath} from "@/lib/mapping/extractPrefixId";
import type {Mp3Entry}           from "@/types";
import type {FantiaMappingEntry} from "@/types/mapping";
import Image                     from "next/image";
import {useMemo}                 from "react";

type SortKey = {
  hasMapping: boolean;
  releaseKey: number;        // YYYYMM（例: 202404）
  withinMonthIndex: number;  // 1,2...
  fallbackPath: string;      // 安定化用
};

const buildSortKey = (
  item: Mp3Entry,
  mappingByPrefixId: ReadonlyMap<string, FantiaMappingEntry>
): SortKey => {
  const prefixId = extractPrefixIdFromPath(item.path);
  const mapping = prefixId ? mappingByPrefixId.get(prefixId) : undefined;

  if (!mapping) {
    return {
      hasMapping: false,
      releaseKey: 999999, // 末尾へ
      withinMonthIndex: 9999,
      fallbackPath: item.path,
    };
  }

  // mapping.year, mapping.month, mapping.withinMonthIndex は parse 時に生成済み
  const releaseKey = mapping.year * 100 + mapping.month;

  return {
    hasMapping: true,
    releaseKey,
    withinMonthIndex: mapping.withinMonthIndex,
    fallbackPath: item.path,
  };
};

const compareSortKey = (a: SortKey, b: SortKey): number => {
  // 1) 対応表ありを先に
  if (a.hasMapping !== b.hasMapping) return a.hasMapping ? -1 : 1;

  // 2) 年月（昇順）
  if (a.releaseKey !== b.releaseKey) return a.releaseKey - b.releaseKey;

  // 3) 同月内の順（1,2...）
  if (a.withinMonthIndex !== b.withinMonthIndex) return a.withinMonthIndex - b.withinMonthIndex;

  // 4) 最後は path で安定化
  return a.fallbackPath.localeCompare(b.fallbackPath, "ja");
};

export default function Page() {
  const {
    needsReconnect,
    savedHandle,
    reconnect,
    forget,
    mp3List,
    folderName,
    errorMessage,
    totalSize,
    titleByPath,
    coverUrlByPath,
    pickFolderAndLoad,
  } = useMp3Library();

  const {audioRef, nowPlaying, playEntry, stop} = useAudioPlayer();

  const {mappingByPrefixId, error: mappingError, isLoading: mappingLoading} = useFantiaMapping();

  const getDisplayTitle = useMemo(() => {
    return (path: string, tagTitle: string | null): string | null => {
      const prefixId = extractPrefixIdFromPath(path);
      const mapped = prefixId ? mappingByPrefixId.get(prefixId) : undefined;
      // 対応表の曲名を最優先、なければタグ、どっちも無ければnull
      return mapped?.title ?? tagTitle;
    };
  }, [mappingByPrefixId]);

  const sortedMp3List = useMemo(() => {
    // 安定ソートのため index を付ける（同一キーで順序が揺れないように）
    const decorated = mp3List.map((item, index) => {
      const key = buildSortKey(item, mappingByPrefixId);
      return {item, key, index};
    });

    decorated.sort((a, b) => {
      const diff = compareSortKey(a.key, b.key);
      return diff !== 0 ? diff : a.index - b.index; // 完全同値は元順維持
    });

    return decorated.map((x) => x.item);
  }, [mp3List, mappingByPrefixId]);

  return (
    <main style={{padding: 16, maxWidth: 900, margin: "0 auto"}}>
      <h1 style={{fontSize: 22, fontWeight: 700}}>MP3曲情報エディター（テスト）</h1>

      <div style={{display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap"}}>
        <button onClick={pickFolderAndLoad} style={{padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc"}}>
          フォルダを選ぶ
        </button>

        {savedHandle && needsReconnect ? <button onClick={reconnect}>前回のフォルダに再接続</button> : null}
        {savedHandle ? <button onClick={forget}>記憶を消す</button> : null}
        {folderName ? <div>選択中: <b>{folderName}</b></div> : <div>未選択</div>}
      </div>

      {errorMessage ? <p style={{marginTop: 12, color: "crimson"}}>エラー: {errorMessage}</p> : null}
      {mappingError ? <p style={{marginTop: 12, color: "crimson"}}>対応表エラー: {mappingError}</p> : null}
      {mappingLoading ? <p style={{marginTop: 12, opacity: 0.7}}>対応表読み込み中…</p> : null}

      {/* プレイヤー */}
      <section style={{marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10}}>
        <div style={{display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap"}}>
          <div style={{fontWeight: 700}}>再生</div>
          {nowPlaying ? (
            <div style={{opacity: 0.9}}>
              <b>{nowPlaying.title ?? "（曲名なし）"}</b>{" "}
              <span style={{fontSize: 12, opacity: 0.8}}>{nowPlaying.path}</span>
            </div>
          ) : (
            <div style={{opacity: 0.7}}>未再生</div>
          )}
          <button onClick={stop} style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}>
            停止
          </button>
        </div>

        <div style={{marginTop: 10}}>
          <audio ref={audioRef} controls preload="none" style={{width: "100%"}}/>
        </div>
      </section>

      <div style={{marginTop: 16}}>
        <div style={{display: "flex", gap: 16}}>
          <div>MP3件数: <b>{mp3List.length}</b></div>
          <div>合計サイズ: <b>{(totalSize / (1024 * 1024)).toFixed(2)} MB</b></div>
        </div>

        <ul style={{marginTop: 12, paddingLeft: 0, listStyle: "none"}}>
          {sortedMp3List.map((item) => {
            const tagTitle = titleByPath[item.path] ?? null;
            const displayTitle = getDisplayTitle(item.path, tagTitle);
            const coverUrl = coverUrlByPath[item.path];

            return (
              <li key={item.path} style={{display: "flex", gap: 10, alignItems: "center", padding: "6px 0"}}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8, border: "1px solid #ddd",
                  overflow: "hidden", display: "grid", placeItems: "center",
                  background: "#fafafa", flex: "0 0 auto",
                }}>
                  {coverUrl ? (
                    // blob: のとき Next/Image の最適化が邪魔する環境があるので、問題が出たら unoptimized を付けるのが安定です
                    <Image src={coverUrl} alt="" width={44} height={44} unoptimized
                           style={{width: "100%", height: "100%", objectFit: "cover"}}/>
                  ) : (
                    <span style={{fontSize: 12, opacity: 0.6}}>No Art</span>
                  )}
                </div>

                <div style={{minWidth: 0, flex: "1 1 auto"}}>
                  <div style={{fontWeight: 700}}>{displayTitle ?? "（曲名なし）"}</div>
                  <div style={{fontSize: 12, opacity: 0.8, wordBreak: "break-all"}}>{item.path}</div>
                </div>

                <button
                  onClick={() => void playEntry(item, displayTitle)}
                  style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc", flex: "0 0 auto"}}
                >
                  ▶ 再生
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
