"use client";

import React, {useEffect, useRef} from "react";

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

const canUsePositionState = (): boolean =>
  canUseMediaSession() && typeof navigator.mediaSession.setPositionState === "function";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

type Args = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  trackKey: string | number;
};

const isAndroidChrome = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return ua.includes("Android") && ua.includes("Chrome/");
};

export function useMediaSessionPosition(args: Args): void {
  const {audioRef, isPlaying, trackKey} = args;

  const lastSentMsRef = useRef<number>(0);
  const intervalIdRef = useRef<number | null>(null);

  // 再生状態を通知側に伝える（重要）
  useEffect(() => {
    if (!canUseMediaSession()) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!canUsePositionState()) return;

    const audio = audioRef.current;
    if (!audio) return;

    const sync = (force: boolean): void => {
      // pauseや曲切替では force=true で間引きしない
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

      const actualPlaybackRate = Number.isFinite(audio.playbackRate) ? audio.playbackRate : 1;

      // ✅ Android Chromeだけ、MediaSession側の推定を止める
      const mediaSessionPlaybackRate = isAndroidChrome() ? 1e-100 : actualPlaybackRate;

      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: mediaSessionPlaybackRate,
          position: clamp(position, 0, duration),
        });
      } catch {
        // 端末差で例外が出ることがあるので握りつぶし
      }
    };

    const startPollingIfNeeded = (): void => {
      if (!isPlaying) return;
      if (intervalIdRef.current !== null) return;

      // Android保険: timeupdateが止まっても進捗を更新
      intervalIdRef.current = window.setInterval(() => {
        sync(false);
      }, 500);
    };

    const stopPolling = (): void => {
      if (intervalIdRef.current === null) return;
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    };

    const onLoadedMetadata = (): void => sync(true);
    const onPlay = (): void => {
      startPollingIfNeeded();
      // 再生開始直後は1拍おいて同期（Androidで効くことがある）
      window.setTimeout(() => sync(true), 0);
    };
    const onPause = (): void => {
      // pause時は必ず確定値を送って“暴走推定”を止める
      sync(true);
      stopPolling();
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", () => sync(false));
    audio.addEventListener("seeking", () => sync(true));
    audio.addEventListener("seeked", () => sync(true));
    audio.addEventListener("ratechange", () => sync(true));
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    // 曲切替直後にも即同期
    sync(true);
    startPollingIfNeeded();

    return () => {
      stopPolling();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", () => sync(false)); // TODO: ここは無名関数を避けてハンドラ変数化（次ステップで直す）
      audio.removeEventListener("seeking", () => sync(true));     // TODO: 同上
      audio.removeEventListener("seeked", () => sync(true));      // TODO: 同上
      audio.removeEventListener("ratechange", () => sync(true));  // TODO: 同上
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioRef, isPlaying, trackKey]);
}
