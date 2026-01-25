"use client";

import React, {useCallback, useEffect, useRef} from "react";

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

const canUsePositionState = (): boolean =>
  canUseMediaSession() && typeof navigator.mediaSession.setPositionState === "function";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export type UseMediaSessionPositionArgs = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  trackKey: string | number;
};

export type SyncPositionStateAction = (force: boolean) => void;

/**
 * メディアセッションの位置状態をオーディオ要素の現在の状態と同期します。
 * 戻り値として、任意タイミングで同期できる関数(syncPositionStateAction)を返します。
 */
export function useMediaSessionPosition(args: UseMediaSessionPositionArgs): {
  syncPositionStateAction: SyncPositionStateAction;
} {
  const {audioRef, isPlaying, trackKey} = args;

  const lastSentMsRef = useRef<number>(0);

  // ✅ 外から叩ける同期関数（force=true なら間引きしない）
  const syncPositionStateAction = useCallback<SyncPositionStateAction>((force) => {
    if (!canUsePositionState()) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (!force) {
      const nowMs = Date.now();
      if (nowMs - lastSentMsRef.current < 250) return;
      lastSentMsRef.current = nowMs;
    } else {
      lastSentMsRef.current = 0;
    }

    const duration = audio.duration;
    const position = audio.currentTime;
    const playbackRate = audio.playbackRate;

    if (!Number.isFinite(duration) || duration <= 0) return;
    if (!Number.isFinite(position) || position < 0) return;
    if (!Number.isFinite(playbackRate) || playbackRate <= 0) return;

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position: clamp(position, 0, duration),
      });
    } catch {
      // 端末差で例外が出ることがあるので握りつぶします
    }
  }, [audioRef]);

  // ✅ 再生状態（通知UIの整合性アップ）
  useEffect(() => {
    if (!canUseMediaSession()) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ✅ 曲切替やイベントに追従
  useEffect(() => {
    if (!canUsePositionState()) return;

    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => syncPositionStateAction(true);
    const onTimeUpdate = () => syncPositionStateAction(false);
    const onSeek = () => syncPositionStateAction(true);
    const onRate = () => syncPositionStateAction(true);
    const onPlay = () => syncPositionStateAction(true);
    const onPause = () => syncPositionStateAction(true);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("seeking", onSeek);
    audio.addEventListener("seeked", onSeek);
    audio.addEventListener("ratechange", onRate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    // 曲切替直後に即同期
    syncPositionStateAction(true);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("seeking", onSeek);
      audio.removeEventListener("seeked", onSeek);
      audio.removeEventListener("ratechange", onRate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioRef, trackKey, syncPositionStateAction]);

  return {syncPositionStateAction};
}
