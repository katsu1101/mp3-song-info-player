// src/features/mp3/lib/cover/saveCoverImageForNowPlaying.ts
"use client";

import {saveImageAsNowPlayingSibling} from "@/features/mp3/lib/fs/saveImageAsNowPlayingSibling";

export type SaveCoverImageForNowPlayingArgs = {
  rootDirHandle: FileSystemDirectoryHandle | null;
  nowPlayingPath: string | null;
  imageFile: File | null;
  reloadAfterSave?: boolean;
};

export const saveCoverImageForNowPlaying = async (
  args: SaveCoverImageForNowPlayingArgs,
): Promise<{ savedPath: string }> => {
  const {rootDirHandle, nowPlayingPath, imageFile, reloadAfterSave = true} = args;

  if (!rootDirHandle) throw new Error("フォルダが未接続です（権限/再接続が必要）。");
  if (!nowPlayingPath) throw new Error("再生中の曲がないため保存しません。");
  if (!imageFile) throw new Error("画像ファイルが選択されていません。");

  const result = await saveImageAsNowPlayingSibling({
    rootDirHandle,
    nowPlayingPath,
    imageFile,
  });

  if (reloadAfterSave) {
    window.location.reload();
  }

  return result;
};
