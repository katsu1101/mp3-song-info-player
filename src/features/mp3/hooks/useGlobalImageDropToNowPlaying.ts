"use client";

import {saveCoverImageForNowPlaying} from "@/features/mp3/lib/cover/saveCoverImageForNowPlaying";
import React                         from "react";

type Args = {
  isWindows: boolean;
  rootDirHandle: FileSystemDirectoryHandle | null;

  /**
   * 再生中のMP3パス（ルートからの相対想定）
   * 再生中でないなら null
   */
  nowPlayingPath: string | null;

  onSavedAction?: (savedPath: string) => void;
  onErrorAction?: (message: string) => void;
};

const isFileDrag = (dt: DataTransfer | null): boolean => {
  if (!dt) return false;
  return Array.from(dt.types).includes("Files");
};

export const useGlobalImageDropToNowPlaying = (args: Args) => {
  const {isWindows, rootDirHandle, nowPlayingPath, onSavedAction, onErrorAction} = args;

  const [isDragging, setIsDragging] = React.useState(false);
  const dragCounterRef = React.useRef(0);

  React.useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e.dataTransfer)) return;
      e.preventDefault();
      dragCounterRef.current += 1;
      setIsDragging(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e.dataTransfer)) return;
      e.preventDefault();
    };

    const onDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e.dataTransfer)) return;
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setIsDragging(false);
    };

    const onDrop = async (e: DragEvent) => {
      if (!isFileDrag(e.dataTransfer)) return;
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      // ✅ 再生中でないなら保存しない
      if (!nowPlayingPath) {
        onErrorAction?.("再生中の曲がないため保存しません。");
        return;
      }
      if (!rootDirHandle) {
        onErrorAction?.("フォルダが未接続です（権限/再接続が必要）。");
        return;
      }

      const dt = e.dataTransfer;
      if (!dt) return;

      const files = Array.from(dt.files);
      if (files.length !== 1) {
        onErrorAction?.("画像ファイルは1つだけドロップしてください。");
        return;
      }

      const imageFile = files[0] ?? null;

      try {
        const result = await saveCoverImageForNowPlaying({
          rootDirHandle,
          nowPlayingPath,
          imageFile,
          reloadAfterSave: true,
        });

        // reloadAfterSave=true だと通常ここに来る前にリロードするけど、
        // 念のため action は呼べるようにしておく
        onSavedAction?.(result.savedPath);
      } catch (err) {
        const message = err instanceof Error ? err.message : "保存に失敗しました。";
        onErrorAction?.(message);
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [rootDirHandle, nowPlayingPath, onSavedAction, onErrorAction]);

  if (!isWindows) return {isDragging: false};
  return {isDragging};
};
