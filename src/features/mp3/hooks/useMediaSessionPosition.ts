"use client";

import React, {useEffect} from "react";

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

/**
 * メディアセッションの位置状態をオーディオ要素の現在の状態と同期します。
 * これにより、`MediaSession API`が関連するメディアの再生進行状況、再生時間、再生速度を正確に反映します。
 */
export function useMediaSessionPosition(audioRef: React.RefObject<HTMLAudioElement | null>): void {
  useEffect(() => {
    if (!canUseMediaSession()) return;

    const audio = audioRef.current;
    if (!audio) return;

    const sync = () => {
      // duration が取れない/無効な間は送らない（NaN対策）
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const position = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const playbackRate = Number.isFinite(audio.playbackRate) ? audio.playbackRate : 1;

      // duration 0 だと UI が変になる端末があるのでガード
      if (duration <= 0) return;

      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position: Math.min(position, duration),
      });
    };

    // 再生中に追従させる
    audio.addEventListener("timeupdate", sync);
    // 曲切替直後に duration が確定するタイミング
    audio.addEventListener("loadedmetadata", sync);
    audio.addEventListener("ratechange", sync);
    audio.addEventListener("seeked", sync);

    sync();

    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("loadedmetadata", sync);
      audio.removeEventListener("ratechange", sync);
      audio.removeEventListener("seeked", sync);
    };
  }, [audioRef]);
}
