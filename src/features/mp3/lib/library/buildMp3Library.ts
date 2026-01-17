// src/lib/mp3/library/buildMp3Library.ts

import {readMp3FromDirectory}     from "@/lib/fsAccess/scanMp3";
import {extractPrefixIdFromPath} from "@/lib/mapping/extractPrefixId";
import {startDirCoverWorker}     from "@/features/mp3/workers/startDirCoverWorker";
import {startMetaWorker}          from "@/features/mp3/workers/startMetaWorker";
import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}     from "@/features/mp3/types/trackMeta";
import {Dispatch, SetStateAction} from "react";


type RunIdRef = { current: number };

type BuildMp3LibraryArgs = {
  handle: FileSystemDirectoryHandle;

  /**
   * NOTE:
   * shuffle は「再生キュー」で扱う（ライブラリの items は安定させる）
   */
  shuffle: boolean;

  // objectURL 管理
  track: (url: string) => void;

  // 後追いキャンセル
  dirCoverRunIdRef: RunIdRef;
  metaRunIdRef: RunIdRef;

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
    // shuffle, // ✅ ここでは使わない（再生キュー側へ）
    track,
    dirCoverRunIdRef,
    metaRunIdRef,
    setFolderName,
    setMp3List,
    setMetaByPath,
    setDirCoverUrlByDir,
    setCoverUrlByPath,
  } = args;

  setFolderName(handle.name);

  const items = await readMp3FromDirectory(handle, "");

  // ✅ id は読み込み順で固定（shuffleで書き換えない）
  for (let i = 0; i < items.length; i += 1) {
    items[i]!.id = i + 1;
  }

  setMp3List(items);

  // ✅ まずダミーで一括初期化（即表示）
  setMetaByPath(() => buildInitialMetaByPath(items));

  // ✅ フォルダ代表画像だけ後追い開始
  void startDirCoverWorker({
    rootHandle: handle,
    items,
    runIdRef: dirCoverRunIdRef,
    track,
    setDirCoverUrlByDir,
  });

  // ✅ metaも後追い（1曲ずつ）
  void startMetaWorker({
    items,
    runIdRef: metaRunIdRef,
    track,
    setMetaByPath,
    setCoverUrlByPath,
    shouldDeferTag: (entry) => !!extractPrefixIdFromPath(entry.path),
  });
};
