import {isTypingTarget} from "@/lib/dom/isTypingTarget";

import {PlayActions}                                    from "@/types/actions";
import type {Mp3Entry}                                  from "@/types/mp3Entry";
import {Settings}                                       from "@/types/setting";
import {TrackView}                                      from "@/types/views";
import React, {useCallback, useEffect, useMemo, useRef} from "react";

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
        if (trackViews.length > 0) void playAtIndex(0);

        // ✅ currentSrc だけだと微妙な場合があるので src も見る
        const hasSource = Boolean(audio.currentSrc || audio.src);

        if (hasSource) {
          if (audio.ended) audio.currentTime = 0;

          // ✅ NotSupportedError 対策（srcが無い/解読不能など）
          void audio.play().catch(() => {
          });
          return;
        }

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
      } as PlayActions,
    }),
    [playAtIndex, playNext, playPrev]
  );
};
