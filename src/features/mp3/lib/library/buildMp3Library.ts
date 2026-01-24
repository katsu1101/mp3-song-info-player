// src/lib/mp3/library/buildMp3Library.ts

import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}     from "@/features/mp3/types/trackMeta";
import {startDirArtworkWorker}    from "@/features/mp3/workers/startDirArtworkWorker";
import {startLyricsTextWorker}    from "@/features/mp3/workers/startLyricsTextWorker";
import {startMetaScannerWorker}   from "@/features/mp3/workers/startMetaScannerWorker";
import {startTrackArtworkWorker}  from "@/features/mp3/workers/startTrackArtworkWorker";
import {startTrackIndoWorker}     from "@/features/mp3/workers/startTrackIndoWorker";
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
  void startTrackIndoWorker({
    items,
    runIdRef: infoRunIdRef,
    runId: infoRunId,
    setMetaByPath,
  });

// ✅ artwork系は同じ runId を共有（ここで1回だけ増やす）
  const artworkRunId = ++dirArtworkRunIdRef.current;

// ✅ 曲の外部画像（同名）を先に補完
  void startTrackArtworkWorker({
    scanResult,
    items,
    runIdRef: dirArtworkRunIdRef,
    runId: artworkRunId,
    track,
    setArtworkUrlByPath: setArtworkUrlByPath,
  });

  // ✅ フォルダ代表画像だけ後追い開始
  void startDirArtworkWorker({
    scanResult,
    items,
    runIdRef: dirArtworkRunIdRef,
    runId: artworkRunId, // ✅ 同じ値
    track,
    setArtworkUrlByPath: setArtworkUrlByPath,
  });

  // ✅ metaも後追い（1曲ずつ）
  void startMetaScannerWorker({
    items,
    runIdRef: metaRunIdRef,
    track,
    setMetaByPath,
    setArtworkUrlByPath: setArtworkUrlByPath,
    shouldDeferTag: (entry) => !!extractPrefixIdFromPath(entry.path),
  });

  // ✅ 外部 .txt 歌詞も後追い（補完のみ）
  const lyricsRunId = ++lyricsRunIdRef.current;
  void startLyricsTextWorker({
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
