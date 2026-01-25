// src/lib/mp3/library/buildMp3Library.ts

import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}     from "@/features/mp3/types/trackMeta";
import * as workers               from "@/features/mp3/workers";
import {scanMediaTree}            from "@/lib/fsAccess/scanMediaTree";
import {extractPrefixIdFromPath}  from "@/lib/mapping/extractPrefixId";
import {Dispatch, SetStateAction} from "react";


type RunIdRef = { current: number };

type BuildMp3LibraryArgs = {
  handle: FileSystemDirectoryHandle;

  // objectURL 管理
  track: (url: string) => void;

  // 後追いキャンセル
  infoRunIdRef: RunIdRef
  dirArtworkRunIdRef: RunIdRef;
  metaRunIdRef: RunIdRef;
  lyricsRunIdRef: RunIdRef;

  // state setters
  setFolderName: Dispatch<SetStateAction<string>>;
  setMp3List: Dispatch<SetStateAction<Mp3Entry[]>>;
  setMetaByPath: Dispatch<SetStateAction<TrackMetaByPath>>;
  setArtworkUrlByPath: Dispatch<SetStateAction<Record<string, string | null>>>;
};

const buildInitialMetaByPath = (items: readonly Mp3Entry[]): TrackMetaByPath => {
  const next: TrackMetaByPath = {};
  for (const e of items) {
    next[e.path] = {
      discNo: null, diskNo: null,
      albumArtist: null,
      picture: null,
      title: "", // e.fileHandle.name,
      artist: "",
      album: "",
      trackNo: null,
      year: null,
      lyrics: null,
      lyricsLrc: null,
    };
  }
  return next;
};

/**
 * 指定されたディレクトリハンドルから、メタデータ、アートワーク、その他の関連情報を読み取り、非同期的にMP3ライブラリを構築します。
 *
 * @param {BuildMp3LibraryArgs} args - MP3ライブラリをスキャンおよび処理するために必要なすべてのパラメータと参照を含むオブジェクト。
 * @returns {Promise<void>} MP3ライブラリの構築が正常に完了し、すべての処理ワーカーが初期化された時点で解決するプロミス。
 *
 * この関数は以下の手順を実行します：
 * 1. 指定されたディレクトリハンドルを使用してフォルダ名を更新します。
 * 2. 指定されたディレクトリハンドルからMP3ライブラリを読み取りスキャンし、アイテムリストとスキャン結果を取得します。
 * 3. 取得したMP3ファイルの初期メタデータを設定します。
 * 4. 各トラックの詳細なメタデータを取得・更新するワーカーを開始します。
 * 5. アートワーク関連のワーカー用に一意の`runId`を共有し：
 *    - 外部画像に基づいて個々のトラックのアートワークURLを更新します。
 *    - 個々のトラックのアートワーク処理後にフォルダレベルのアートワークを更新します。
 * 6. 各トラックのメタデータを処理するメタデータスキャナーワーカーを開始します（遅延タグスキャンを含む）。
 * 7. トラックの外部`.txt`歌詞ファイルスキャンを完了させる歌詞ワーカーを開始します。
 */
export const buildMp3Library = async (args: BuildMp3LibraryArgs): Promise<void> => {
  const {
    handle,
    track,
    infoRunIdRef,
    dirArtworkRunIdRef,
    metaRunIdRef,
    lyricsRunIdRef,
    setFolderName,
    setMp3List,
    setMetaByPath,
    setArtworkUrlByPath,
  } = args;

  setFolderName(handle.name);

  // ✅ scanResult を取る
  const {scanResult, items} = await readLibraryFromDirectory(handle, "");

  setMp3List(items);
  setMetaByPath(() => buildInitialMetaByPath(items));

  const infoRunId = ++infoRunIdRef.current;
  void workers.startTrackIndoWorker({
    items,
    runIdRef: infoRunIdRef,
    runId: infoRunId,
    setMetaByPath,
  });

// ✅ artwork系は同じ runId を共有（ここで1回だけ増やす）
  const artworkRunId = ++dirArtworkRunIdRef.current;

// ✅ 曲の外部画像（同名）を先に補完
  void workers.startTrackArtworkWorker({
    scanResult,
    items,
    runIdRef: dirArtworkRunIdRef,
    runId: artworkRunId,
    track,
    setArtworkUrlByPath: setArtworkUrlByPath,
  });

  // ✅ フォルダ代表画像だけ後追い開始
  void workers.startDirArtworkWorker({
    scanResult,
    items,
    runIdRef: dirArtworkRunIdRef,
    runId: artworkRunId, // ✅ 同じ値
    track,
    setArtworkUrlByPath: setArtworkUrlByPath,
  });

  // ✅ metaも後追い（1曲ずつ）
  void workers.startMetaScannerWorker({
    items,
    runIdRef: metaRunIdRef,
    track,
    setMetaByPath,
    setArtworkUrlByPath: setArtworkUrlByPath,
    shouldDeferTag: (entry) => !!extractPrefixIdFromPath(entry.path),
  });

  // ✅ 外部 .txt 歌詞も後追い（補完のみ）
  const lyricsRunId = ++lyricsRunIdRef.current;
  void workers.startLyricsTextWorker({
    items,
    runIdRef: lyricsRunIdRef,
    runId: lyricsRunId,
    setMetaByPath,
  });
};

export type ReadLibraryResult = {
  scanResult: Awaited<ReturnType<typeof scanMediaTree>>;
  items: Mp3Entry[];
};

/**
 * 指定されたディレクトリからメディアファイルのライブラリを読み込み、構造化された結果に整理します。
 *
 * @param {FileSystemDirectoryHandle} directoryHandle - メディアファイルをスキャンするディレクトリのハンドル。
 * @param {string} basePath - 相対ファイルパスの参照元として使用されるベースパス。
 * @returns {Promise<ReadLibraryResult>} スキャン結果と整理されたメディア項目のリストを含むオブジェクトに解決するプロミス。
 *
 * この関数はディレクトリ内のオーディオファイルと関連メタデータをスキャンし、それらをエントリの一覧に整理します。
 * ファイルパスを一貫性のために正規化し、ロケールに依存する比較関数に基づいて結果をソートします。
 * ライブラリ内の各オーディオ項目には、パス、名前、ファイルハンドルが含まれ、オプションで関連する歌詞やトラック情報のハンドルも扱います。
 */
export const readLibraryFromDirectory = async (
  directoryHandle: FileSystemDirectoryHandle,
  basePath: string
): Promise<ReadLibraryResult> => {
  const scanResult = await scanMediaTree(directoryHandle, basePath);

  const collator = new Intl.Collator("ja", {
    numeric: true,
    sensitivity: "base",
  });

  const normalizeRelPath = (p: string): string =>
    p.replaceAll("\\", "/"); // 念のため

  const splitSegs = (p: string): string[] =>
    normalizeRelPath(p).split("/").filter(Boolean);

  const compareRelPath = (a: string, b: string): number => {
    const aSegs = splitSegs(a);
    const bSegs = splitSegs(b);

    const minLen = Math.min(aSegs.length, bSegs.length);
    for (let i = 0; i < minLen; i += 1) {
      const diff = collator.compare(aSegs[i]!, bSegs[i]!);
      if (diff !== 0) return diff;
    }
    return aSegs.length - bSegs.length;
  };

  const audioBundles = scanResult.bundles
    .filter((b) => b.audio != null)
    .sort((a, b) => compareRelPath(a.audio!.path, b.audio!.path));

  const items: Mp3Entry[] = audioBundles.map((bundle, index) => {
    const audio = bundle.audio!;
    const lyrics = bundle.lyricsTxt?.handle;
    const info = bundle.trackInfo?.handle;
    return {
      id: index + 1,
      path: audio.path,
      name: audio.handle.name,
      lastModified: null,
      fileHandle: audio.handle,
      lyricsTextHandle: lyrics,
      infoHandle: info,
    };
  });

  return {scanResult, items};
};
