"use client";

import {TrackView}        from "@/types/views";
import React, {useEffect} from "react";

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

type MediaSessionSeekEvent = { seekOffset?: number };

export function useMediaSessionControls(actions: {
  trackViews: TrackView[];
  nowPlayingID: number;
  playAction: () => void;
  pauseAction: () => void;
  nextAction: () => Promise<void>;
  prevAction: () => Promise<void>;

  // ✅ 追加: シークに使う
  audioRef: React.RefObject<HTMLAudioElement | null>;

  // ✅ 追加: positionState更新（あなたの useMediaSessionPosition の sync 相当を外から呼べる形に）
  // TODO: まだ無ければ後で用意
  syncPositionStateAction?: (force: boolean) => void;
}): void {
  const {
    trackViews, nowPlayingID, playAction, pauseAction, nextAction, prevAction,
    audioRef, syncPositionStateAction
  } = actions;

  useEffect(() => {
    if (!canUseMediaSession()) return;

    navigator.mediaSession.setActionHandler("play", playAction);
    navigator.mediaSession.setActionHandler("pause", pauseAction);
    navigator.mediaSession.setActionHandler("nexttrack", nextAction);
    navigator.mediaSession.setActionHandler("previoustrack", prevAction);

    // ✅ 10秒戻る/進む（表示されるかはOS/端末次第）
    const defaultSkipSeconds = 10;

    navigator.mediaSession.setActionHandler("seekbackward", (event?: MediaSessionSeekEvent) => {
      const audio = audioRef.current;
      if (!audio) return;

      const offset = event?.seekOffset ?? defaultSkipSeconds;
      audio.currentTime = Math.max((audio.currentTime || 0) - offset, 0);

      // 通知の位置を即同期（あれば）
      syncPositionStateAction?.(true);
    });

    navigator.mediaSession.setActionHandler("seekforward", (event?: MediaSessionSeekEvent) => {
      const audio = audioRef.current;
      if (!audio) return;

      const offset = event?.seekOffset ?? defaultSkipSeconds;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      audio.currentTime = duration > 0
        ? Math.min((audio.currentTime || 0) + offset, duration)
        : (audio.currentTime || 0) + offset;

      syncPositionStateAction?.(true);
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, [playAction, pauseAction, nextAction, prevAction, audioRef, syncPositionStateAction]);

  // （metadata更新の effect は今のままでOK）
  useEffect(() => {
    if (!canUseMediaSession()) return;
    if (!nowPlayingID) return;

    const track = trackViews.find((t) => t.item.id === nowPlayingID);
    if (!track) return;

    const src = track.artworkUrl ?? "";
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.displayTitle ?? "",
      artist: track.originalArtist ?? "",
      album: track.albumTitle ?? "",
      artwork: src
        ? [{src, sizes: "512x512"}, {src, sizes: "256x256"}, {src, sizes: "96x96"}]
        : undefined,
    });
  }, [trackViews, nowPlayingID]);
}
