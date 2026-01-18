// src/lib/mp3/library/buildMp3Library.ts

import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}     from "@/features/mp3/types/trackMeta";
import {runMetaScanner}           from "@/features/mp3/workers/runMetaScanner";
import {startDirCoverWorker}      from "@/features/mp3/workers/startDirCoverWorker";
import {scanMediaTree}            from "@/lib/fsAccess/scanMediaTree";
import {extractPrefixIdFromPath}  from "@/lib/mapping/extractPrefixId";
import {startLyricsTextWorker}    from "@/lib/mp3/workers/startLyricsTextWorker";
import {startTrackCoverWorker}    from "@/lib/mp3/workers/startTrackCoverWorker";
import {Dispatch, SetStateAction} from "react";


type RunIdRef = { current: number };

type BuildMp3LibraryArgs = {
  handle: FileSystemDirectoryHandle;

  // objectURL 管理
  track: (url: string) => void;

  // 後追いキャンセル
  dirCoverRunIdRef: RunIdRef;
  metaRunIdRef: RunIdRef;
  lyricsRunIdRef: RunIdRef;

  // state setters
  setFolderName: Dispatch<SetStateAction<string>>;
  setMp3List: Dispatch<SetStateAction<Mp3Entry[]>>;
  setMetaByPath: Dispatch<SetStateAction<TrackMetaByPath>>;
  setDirCoverUrlByDir: Dispatch<SetStateAction<Record<string, string | null>>>;
  setCoverUrlByPath: Dispatch<SetStateAction<Record<string, string | null>>>;
};

const buildInitialMetaByPath = (items: readonly Mp3Entry[]): TrackMetaByPath => {
  const next: TrackMetaByPath = {};
  for (const e of items) {
    next[e.path] = {
      discNo: null, diskNo: null,
      albumArtist: null,
      picture: null,
      title: e.fileHandle.name,
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
    dirCoverRunIdRef,
    metaRunIdRef,
    lyricsRunIdRef,
    setFolderName,
    setMp3List,
    setMetaByPath,
    setDirCoverUrlByDir,
    setCoverUrlByPath,
  } = args;

  setFolderName(handle.name);

  // ✅ scanResult を取る
  const {scanResult, items} = await readLibraryFromDirectory(handle, "");

  setMp3List(items);
  setMetaByPath(() => buildInitialMetaByPath(items));

// ✅ cover系は同じ runId を共有（ここで1回だけ増やす）
  const coverRunId = ++dirCoverRunIdRef.current;

// ✅ 曲の外部画像（同名）を先に補完
  void startTrackCoverWorker({
    scanResult,
    items,
    runIdRef: dirCoverRunIdRef,
    runId: coverRunId,
    track,
    setCoverUrlByPath,
  });

  // ✅ フォルダ代表画像だけ後追い開始
  void startDirCoverWorker({
    scanResult,
    items,
    runIdRef: dirCoverRunIdRef,
    runId: coverRunId, // ✅ 同じ値
    track,
    setDirCoverUrlByDir,
  });

  // ✅ metaも後追い（1曲ずつ）
  void runMetaScanner({
    items,
    runIdRef: metaRunIdRef,
    track,
    setMetaByPath,
    setCoverUrlByPath,
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
    return {
      id: index + 1,
      path: audio.path,
      name: audio.handle.name,
      lastModified: null,
      fileHandle: audio.handle,
      lyricsTextHandle: lyrics
    };
  });

  return {scanResult, items};
};
