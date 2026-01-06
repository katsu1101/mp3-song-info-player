import {isTypingTarget}                                           from "@/lib/dom/isTypingTarget";
import type {Mp3Entry}                                            from "@/types";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";

type UsePlaylistPlayerArgs = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playEntry: (entry: Mp3Entry, title: string | null) => Promise<void>;
  stop: () => void;

  list: Mp3Entry[]; // 連続再生の並び順確定済み
  getTitle: (entry: Mp3Entry) => string | null;
  resetKey?: string; // フォルダ変更などでリセットしたい時に渡す
};

export const usePlaylistPlayer = (args: UsePlaylistPlayerArgs) => {
  const {audioRef, playEntry, stop, list, getTitle, resetKey} = args;

  const [isContinuous, setIsContinuous] = useState<boolean>(true);

  const currentIndexRef = useRef<number | null>(null);
  const isContinuousRef = useRef<boolean>(true);

  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  const playAtIndex = useCallback(
    async (index: number): Promise<void> => {
      if (index < 0 || index >= list.length) return;

      const entry = list[index];
      const title = getTitle(entry);

      currentIndexRef.current = index;
      await playEntry(entry, title);
    },
    [list, getTitle, playEntry]
  );

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

  const stopAndReset = useCallback((): void => {
    stop();
    // currentIndexRef.current = null;
  }, [stop]);

  // audio ended → 次へ（連続再生ON時）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (!isContinuousRef.current) return;

      const idx = currentIndexRef.current;
      if (idx === null) return;

      const next = idx + 1;
      if (next >= list.length) return;
      void playAtIndex(next);
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [audioRef, list.length, playAtIndex]);

  // resetKey（フォルダ変更など）でプレイリスト位置をリセット
  useEffect(() => {
    if (resetKey === undefined) return;
    currentIndexRef.current = null;
  }, [resetKey]);

  // キーボードショートカット
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.repeat) return;

      const audio = audioRef.current;
      if (!audio) return;

      if (event.code === "Space") {
        event.preventDefault();

        const hasSource = audio.currentSrc.length > 0;

        if (!audio.paused) {
          audio.pause(); // 位置保持
          return;
        }

        if (hasSource) {
          if (audio.ended) audio.currentTime = 0;
          void audio.play();
          return;
        }

        if (list.length > 0) void playAtIndex(0);
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        void playNext();
        return;
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        void playPrev();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown, {passive: false});
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audioRef, list.length, playAtIndex, playNext, playPrev]);

  const toggleContinuous = useCallback(() => {
    setIsContinuous((v) => !v);
  }, []);

  return useMemo(
    () => ({
      isContinuous,
      toggleContinuous,
      playAtIndex,
      playNext,
      playPrev,
      stopAndReset,
    }),
    [isContinuous, toggleContinuous, playAtIndex, playNext, playPrev, stopAndReset]
  );
};
