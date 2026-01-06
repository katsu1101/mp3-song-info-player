"use client";

import {useAudioPlayer}                                    from "@/hooks/useAudioPlayer";
import {useFantiaMapping}                                  from "@/hooks/useFantiaMapping";
import {useMp3Library}                                     from "@/hooks/useMp3Library";
import {extractPrefixIdFromPath}                           from "@/lib/mapping/extractPrefixId";
import type {Mp3Entry}                                     from "@/types";
import type {FantiaMappingEntry}                           from "@/types/mapping";
import Image                                               from "next/image";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";


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
const formatYm = (releaseYm: string): string => {
  // "2022-04" -> "2022/04"
  return releaseYm.replace("-", "/");
};

const formatOrder2 = (n: number): string => String(n).padStart(2, "0");

const buildReleaseOrderLabel = (mapping: FantiaMappingEntry | undefined): string | null => {
  if (!mapping) return null;
  const ym = formatYm(mapping.releaseYm); // "YYYY/MM"
  const order = formatOrder2(mapping.withinMonthIndex); // "01", "02"...
  return `${ym} / ${order}`;
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

  const [showFilePath, setShowFilePath] = useState<boolean>(false);
  const {audioRef, nowPlaying, playEntry, stop} = useAudioPlayer();

  const {mappingByPrefixId, error: mappingError, isLoading: mappingLoading} = useFantiaMapping();
  const [isContinuous, setIsContinuous] = useState<boolean>(true);

// endedハンドラが古い state を参照しないように ref を使う
  const currentIndexRef = useRef<number | null>(null);
  const isContinuousRef = useRef<boolean>(true);

  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

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

  const displayTitleByPath = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const item of sortedMp3List) {
      const tagTitle = titleByPath[item.path] ?? null;

      const prefixId = extractPrefixIdFromPath(item.path);
      const mapping = prefixId ? mappingByPrefixId.get(prefixId) : undefined;

      const displayTitle = mapping?.title ?? tagTitle;
      map.set(item.path, displayTitle);
    }
    return map;
  }, [sortedMp3List, titleByPath, mappingByPrefixId]);

  const playAtIndex = useCallback(
    async (index: number): Promise<void> => {
      if (index < 0 || index >= sortedMp3List.length) return;

      const item = sortedMp3List[index];
      const title = displayTitleByPath.get(item.path) ?? null;

      currentIndexRef.current = index;
      await playEntry(item, title);
    },
    [sortedMp3List, displayTitleByPath, playEntry]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (!isContinuousRef.current) return;

      const idx = currentIndexRef.current;
      if (idx === null) return;

      const next = idx + 1;
      if (next >= sortedMp3List.length) return; // 最後まで行ったら止める（必要ならリピート可）
      void playAtIndex(next);
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [audioRef, sortedMp3List.length, playAtIndex]);

  const playNext = useCallback(async (): Promise<void> => {
    const idx = currentIndexRef.current;
    if (idx === null) return;
    await playAtIndex(idx + 1);
  }, [playAtIndex]);

  const playPrev = useCallback(async (): Promise<void> => {
    const idx = currentIndexRef.current;
    if (idx === null) return;
    await playAtIndex(idx - 1);
  }, [playAtIndex]);

  const stopAndReset = useCallback(() => {
    stop();
    currentIndexRef.current = null;
  }, [stop]);

  useEffect(() => {
    currentIndexRef.current = null;
  }, [folderName]);

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
        <div style={{marginTop: 8}}>
          <button
            onClick={() => setShowFilePath((v) => !v)}
            className="text-xs"
            style={{padding: "3px 5px", borderRadius: 4, border: "1px solid #ccc"}}
          >
            {showFilePath ? "file名を隠す" : "file名表示"}
          </button>
        </div>

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
          <button onClick={stopAndReset} style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}>
            停止
          </button>
          <button
            onClick={() => setIsContinuous((v) => !v)}
            style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}
          >
            連続再生: {isContinuous ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => void playPrev()}
            style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}
          >
            ◀ 前へ
          </button>

          <button
            onClick={() => void playNext()}
            style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}
          >
            次へ ▶
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
          {sortedMp3List.map((item, index) => {
            const tagTitle = titleByPath[item.path] ?? null;

            const prefixId = extractPrefixIdFromPath(item.path);
            const mapping = prefixId ? mappingByPrefixId.get(prefixId) : undefined;

            const displayTitle = mapping?.title ?? tagTitle ?? "（曲名なし）";
            const releaseOrder = buildReleaseOrderLabel(mapping) ?? "年月不明";

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
                  {/* 1行目: 曲名 */}
                  <div style={{fontWeight: 800, fontSize: 18, lineHeight: 1.2}}>
                    {displayTitle}
                  </div>

                  {/* 2行目: 年月＋曲順（追加） */}
                  <div style={{fontSize: 13, opacity: 0.85, marginTop: 4}}>
                    {releaseOrder}
                    {mapping?.originalArtist ? (
                      <span style={{opacity: 0.75}}> / 原曲: {mapping.originalArtist}</span>
                    ) : null}
                  </div>

                  {/* 3行目: ファイル名（小さく or 非表示） */}
                  {showFilePath ? (
                    <div style={{fontSize: 11, opacity: 0.6, marginTop: 4, wordBreak: "break-all"}}>
                      {item.path}
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={() => void playAtIndex(index)}
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
