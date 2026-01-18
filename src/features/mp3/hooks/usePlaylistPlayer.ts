// src/hooks/usePlaylistPlayer.ts
import type {AlbumView} from "@/features/mp3/types/albumView"; // ✅ 追加
import type {Mp3Entry}  from "@/features/mp3/types/mp3Entry";
import {isTypingTarget} from "@/lib/dom/isTypingTarget";

import {PlayActions}                                    from "@/types/actions";
import {Settings}                                       from "@/types/setting";
import {TrackView}                                      from "@/types/views";
import React, {useCallback, useEffect, useMemo, useRef} from "react";

// ✅ 追加: Fisher–Yates（副作用なし）
const shuffleArray = <T, >(list: readonly T[]): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const canSeek = (audio: HTMLAudioElement): boolean => Number.isFinite(audio.currentTime);

const seekBySeconds = (audio: HTMLAudioElement, deltaSeconds: number): void => {
  if (!canSeek(audio)) return;

  const next = audio.currentTime + deltaSeconds;
  const hasDuration = Number.isFinite(audio.duration) && audio.duration > 0;
  const max = hasDuration ? audio.duration : Number.POSITIVE_INFINITY;

  audio.currentTime = clamp(next, 0, max);
};

type UsePlaylistPlayerArgs = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playEntry: (entry: Mp3Entry, title: string | null) => Promise<void>;

  trackViews: TrackView[];
  resetKey?: string;
  settings: Settings;

  // ✅ 追加: アルバム表示（TrackView依存）
  albumViews?: readonly AlbumView[];

  stopAndClear?: () => void;
};

export const usePlaylistPlayer = (args: UsePlaylistPlayerArgs) => {
  const {audioRef, playEntry, trackViews, resetKey, settings, stopAndClear, albumViews} = args;

  const currentIndexRef = useRef<number | null>(null);

  const isContinuousRef = useRef<boolean>(true);
  const isShuffleRef = useRef<boolean>(false);

  useEffect(() => {
    isContinuousRef.current = settings.playback.continuous;
    isShuffleRef.current = settings.playback.shuffle;
  }, [settings.playback.continuous, settings.playback.shuffle]);

  // ✅ アルバムキューを使う条件（「アルバムの場合」）
  const shouldUseAlbumQueue = Boolean(settings.ui.showAlbums && albumViews && albumViews.length > 0);

  // ✅ 追加: 次/前で参照する “再生キュー（index配列）”
  const queueIndices = useMemo((): readonly number[] => {
    if (shouldUseAlbumQueue && albumViews) {
      const baseAlbums = [...albumViews];
      const albumsOrdered = settings.playback.shuffle ? shuffleArray(baseAlbums) : baseAlbums;

      // アルバム内は固定（albumViews側で sortAlbumTracks 済みの順序を前提）
      return albumsOrdered.flatMap(album => album.tracks.map(x => x.index));
    }

    // 非アルバム時: まずは従来の順番（必要ならここで trackViews の index を shuffle）
    const indices = trackViews.map((_, idx) => idx);
    return settings.playback.shuffle ? shuffleArray(indices) : indices;
  }, [shouldUseAlbumQueue, albumViews, settings.playback.shuffle, trackViews]);

  const playAtIndex = useCallback(
    async (index: number): Promise<void> => {
      if (index < 0 || index >= trackViews.length) return;

      const entry = trackViews[index];
      const title = entry.item.name;

      currentIndexRef.current = index;
      await playEntry(entry.item, title);
    },
    [trackViews, playEntry]
  );

  // ✅ 変更: queueIndices 基準で「次」
  const playNext = useCallback(async (): Promise<void> => {
    const currentIndex = currentIndexRef.current;

    if (currentIndex === null) {
      const first = queueIndices[0];
      if (first !== undefined) await playAtIndex(first);
      return;
    }

    const pos = queueIndices.indexOf(currentIndex);
    const nextIndex = pos >= 0 ? queueIndices[pos + 1] : queueIndices[0];
    if (nextIndex !== undefined) await playAtIndex(nextIndex);
  }, [playAtIndex, queueIndices]);

  // ✅ 変更: queueIndices 基準で「前」
  const playPrev = useCallback(async (): Promise<void> => {
    const currentIndex = currentIndexRef.current;

    if (currentIndex === null) {
      const last = queueIndices[queueIndices.length - 1];
      if (last !== undefined) await playAtIndex(last);
      return;
    }

    const pos = queueIndices.indexOf(currentIndex);
    const prevIndex = pos > 0 ? queueIndices[pos - 1] : queueIndices[queueIndices.length - 1];
    if (prevIndex !== undefined) await playAtIndex(prevIndex);
  }, [playAtIndex, queueIndices]);

  const stop = useCallback(async (): Promise<void> => {
    stopAndClear?.();
  }, [stopAndClear]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (!isContinuousRef.current) return;
      void playNext();
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [audioRef, playNext]);

  useEffect(() => {
    if (resetKey === undefined) return;
    currentIndexRef.current = null;
    stopAndClear?.();
  }, [resetKey, stopAndClear]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.repeat) return;

      const audio = audioRef.current;
      if (!audio) return;

      if (event.code === "Space") {
        event.preventDefault();

        if (!audio.paused) {
          audio.pause();
          return;
        }

        if (!audio.src) {
          void playAtIndex(0);
          audio.load();
        }
        void audio.play().catch(() => {
        });
        return;
      }

      if (event.code === "ArrowDown") {
        event.preventDefault();
        void playNext();
        return;
      }

      if (event.code === "ArrowUp") {
        event.preventDefault();
        void playPrev();
        return;
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        seekBySeconds(audio, -10);
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        seekBySeconds(audio, +10);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown, {passive: false});
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audioRef, trackViews.length, playAtIndex, playNext, playPrev]);

  return useMemo(
    () => ({
      playActions: {
        playAtIndex,
        playNext,
        playPrev,
        stop,
      } as PlayActions,
    }),
    [playAtIndex, playNext, playPrev, stop]
  );
};
