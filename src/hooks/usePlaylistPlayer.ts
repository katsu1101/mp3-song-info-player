import {isTypingTarget} from "@/lib/dom/isTypingTarget";

import {PlayActions}                                    from "@/types/actions";
import type {Mp3Entry}                                  from "@/types/mp3Entry";
import {Settings}                                       from "@/types/setting";
import {TrackView}                                      from "@/types/views";
import React, {useCallback, useEffect, useMemo, useRef} from "react";

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const canSeek = (audio: HTMLAudioElement): boolean => {
  // duration が無い/不正な場合は「とりあえず 0 以上にする」だけにする
  // （読み込み直後やストリーム系で起きうる）
  return Number.isFinite(audio.currentTime);
};

const seekBySeconds = (audio: HTMLAudioElement, deltaSeconds: number): void => {
  if (!canSeek(audio)) return;

  const next = audio.currentTime + deltaSeconds;

  // duration が取れない場合は上限を設けず 0 だけ守る
  const hasDuration = Number.isFinite(audio.duration) && audio.duration > 0;
  const max = hasDuration ? audio.duration : Number.POSITIVE_INFINITY;

  audio.currentTime = clamp(next, 0, max);
};

/**
 * プレイリストプレイヤーフックの引数。
 *
 * プレイリストプレイヤーの初期化と動作制御に必要なパラメータを表します。
 */
type UsePlaylistPlayerArgs = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playEntry: (entry: Mp3Entry, title: string | null) => Promise<void>;

  trackViews: TrackView[];
  resetKey?: string;
  settings: Settings;

  // ✅ 追加: フォルダ変更/シャッフル切替などで「曲を外す」完全停止
  stopAndClear?: () => void;
};

/**
 * プレイリスト再生機能を管理するカスタムフック。以下の機能を実現します：
 * ・トラックの順番再生
 * ・連続再生
 * ・シャッフルオプション
 * ・再生制御用のキーボードショートカット対応
 *
 * @param {UsePlaylistPlayerArgs} args - プレイリストプレイヤーの設定と管理に必要な引数を含むオブジェクト。
 * @param {React.RefObject<HTMLAudioElement>} args.audioRef - 再生に使用されるオーディオ要素への参照。
 * @param {function} args.playEntry - 指定されたトラック項目を処理して再生する関数。
 * @param {Array} args.trackViews - プレイリスト内のトラックを表す配列。再生用メタデータを含む。
 * @param {any} args.resetKey - プレイリスト位置変更時にリセットする値。
 * @param {object} args.settings - 連続再生やシャッフルモードなどのオプションを含む再生設定。
 *
 * @returns 再生制御メソッドを提供するインターフェース `playActions` を含むオブジェクト：
 *                   - `playAtIndex(index: number): Promise<void>`: 指定したインデックスのトラックを再生します。
 *                   - `playNext(): Promise<void>`: プレイリストの次のトラックを再生します。
 *                   - `playPrev(): Promise<void>`: プレイリストの前のトラックを再生します。
 */
export const usePlaylistPlayer = (args: UsePlaylistPlayerArgs) => {
  const {audioRef, playEntry, trackViews, resetKey, settings, stopAndClear} = args;

  const currentIndexRef = useRef<number | null>(null);

  const isContinuousRef = useRef<boolean>(true);
  const isShuffleRef = useRef<boolean>(false);

  useEffect(() => {
    isContinuousRef.current = settings.playback.continuous;
    isShuffleRef.current = settings.playback.shuffle;
  }, [settings.playback.continuous, settings.playback.shuffle]);

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

  const playNext = useCallback(async (): Promise<void> => {
    const index = currentIndexRef.current;

    // ✅ 未選択なら先頭から
    if (index === null) {
      if (trackViews.length > 0) await playAtIndex(0);
      return;
    }

    await playAtIndex(index + 1);
  }, [playAtIndex, trackViews.length]);

  const playPrev = useCallback(async (): Promise<void> => {
    const index = currentIndexRef.current;

    // ✅ 未選択なら末尾（好みで0でもOK）
    if (index === null) {
      if (trackViews.length > 0) await playAtIndex(trackViews.length - 1);
      return;
    }

    await playAtIndex(index - 1);
  }, [playAtIndex, trackViews.length]);

  const stop = useCallback(async (): Promise<void> => {
    if (stopAndClear) stopAndClear()
  }, [stopAndClear]);

  // audio ended → 次へ（連続再生ON時）
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

  // ✅ resetKey（フォルダ変更など）でプレイリスト位置 + audio を完全停止
  useEffect(() => {
    if (resetKey === undefined) return;
    currentIndexRef.current = null;
    stopAndClear?.(); // ← これが重要（srcを外す/nowPlayingリセットをここで保証）
  }, [resetKey, stopAndClear]);

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

        if (!audio.paused) {
          audio.pause();
          return;
        }

        // ✅ ソース無しなら「先頭を再生」(= 新フォルダ切替直後の自然動作)
        if (!audio.src) {
          void playAtIndex(0);
          audio.load()
        }
        // if (audio.ended) audio.currentTime = 0;
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
        stop
      } as PlayActions
    }),
    [playAtIndex, playNext, playPrev, stop]
  );
};
