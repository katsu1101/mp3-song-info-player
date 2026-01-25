"use client";

import React, {useEffect, useRef} from "react";

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

const canUsePositionState = (): boolean =>
  canUseMediaSession() && typeof navigator.mediaSession.setPositionState === "function";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * メディアセッションの位置状態をオーディオ要素の現在の状態と同期します。
 */
export function useMediaSessionPosition(
  audioRef: React.RefObject<HTMLAudioElement | null>,
): void {
  const lastSentMsRef = useRef<number>(0);

  useEffect(() => {
    if (!canUsePositionState()) return;

    const audio = audioRef.current;
    if (!audio) return;

    const sync = (): void => {
      // 4Hzくらいに間引き（通知UIが安定しやすい）
      const nowMs = Date.now();
      if (nowMs - lastSentMsRef.current < 250) return;
      lastSentMsRef.current = nowMs;

      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const position = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const playbackRate = Number.isFinite(audio.playbackRate) ? audio.playbackRate : 1;

      // duration 0 / NaN の間は送らない（UI崩れ対策）
      if (duration <= 0) return;

      const safePosition = clamp(position, 0, duration);

      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate,
          position: safePosition,
        });
      } catch {
        // 端末差・一時的な不整合で例外になることがあるので握りつぶす
      }
    };

    const onLoadedMetadata = (): void => {
      // 曲切替直後は間引きリセットして即反映
      lastSentMsRef.current = 0;
      sync();
    };

    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ratechange", sync);
    audio.addEventListener("seeking", sync);
    audio.addEventListener("seeked", sync);
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);

    onLoadedMetadata();

    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ratechange", sync);
      audio.removeEventListener("seeking", sync);
      audio.removeEventListener("seeked", sync);
      audio.removeEventListener("play", sync);
      audio.removeEventListener("pause", sync);
    };
  }, [audioRef]);
}
