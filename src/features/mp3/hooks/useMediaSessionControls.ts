"use client";

import type {TrackView}   from "@/types/views";
import React, {useEffect} from "react";

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

type SeekOffsetDetails = {seekOffset?: number};
type SeekToDetails = {seekTime?: number; fastSeek?: boolean};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getFiniteNumberOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

export type UseMediaSessionControlsArgs = {
  trackViews: TrackView[];
  nowPlayingID: number;

  playAction: () => void;
  pauseAction: () => void;
  nextAction: () => Promise<void>;
  prevAction: () => Promise<void>;

  // ✅ 追加: 10秒シークに必要
  audioRef: React.RefObject<HTMLAudioElement | null>;
  syncPositionStateAction: (force: boolean) => void;
};

export function useMediaSessionControls(args: UseMediaSessionControlsArgs): void {
  const {
    trackViews,
    nowPlayingID,
    playAction,
    pauseAction,
    nextAction,
    prevAction,
    audioRef,
    syncPositionStateAction,
  } = args;

  // ===== Action Handlers =====
  useEffect(() => {
    if (!canUseMediaSession()) return;

    // 既存
    navigator.mediaSession.setActionHandler("play", playAction);
    navigator.mediaSession.setActionHandler("pause", pauseAction);
    navigator.mediaSession.setActionHandler("nexttrack", nextAction);
    navigator.mediaSession.setActionHandler("previoustrack", prevAction);

    // ✅ 10秒（OSがseekOffsetを渡してくる場合はそれを優先）
    const defaultSeekSeconds = 10;

    const seekRelative = (deltaSeconds: number): void => {
      const audio = audioRef.current;
      if (!audio) return;

      const duration = getFiniteNumberOr(audio.duration, 0);
      const current = getFiniteNumberOr(audio.currentTime, 0);

      audio.currentTime = duration > 0
        ? clamp(current + deltaSeconds, 0, duration)
        : Math.max(current + deltaSeconds, 0);

      // 通知の位置を即同期（Androidの表示ブレ対策）
      syncPositionStateAction(true);
    };

    const onSeekBackward = (details?: SeekOffsetDetails): void => {
      const offset = details?.seekOffset ?? defaultSeekSeconds;
      seekRelative(-offset);
    };

    const onSeekForward = (details?: SeekOffsetDetails): void => {
      const offset = details?.seekOffset ?? defaultSeekSeconds;
      seekRelative(offset);
    };

    // ✅ シークバー操作がある端末向け（あると体験が一段上がる）
    const onSeekTo = (details?: SeekToDetails): void => {
      const audio = audioRef.current;
      if (!audio) return;

      const seekTime = details?.seekTime;
      if (typeof seekTime !== "number" || !Number.isFinite(seekTime) || seekTime < 0) return;

      const duration = getFiniteNumberOr(audio.duration, 0);

      const next = duration > 0 ? clamp(seekTime, 0, duration) : seekTime;

      // fastSeek が使える環境なら使う（無ければ currentTime 代入）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyAudio = audio as any;
      if (details?.fastSeek && typeof anyAudio.fastSeek === "function") {
        anyAudio.fastSeek(next);
      } else {
        audio.currentTime = next;
      }

      syncPositionStateAction(true);
    };

    navigator.mediaSession.setActionHandler("seekbackward", onSeekBackward);
    navigator.mediaSession.setActionHandler("seekforward", onSeekForward);
    navigator.mediaSession.setActionHandler("seekto", onSeekTo);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekto", null);
    };
  }, [
    playAction,
    pauseAction,
    nextAction,
    prevAction,
    audioRef,
    syncPositionStateAction,
  ]);

  // ===== Metadata =====
  useEffect(() => {
    if (!canUseMediaSession()) return;

    // nowPlayingID が 0 の可能性があるなら弾かない（0始まり対策）
    if (nowPlayingID == null) return;

    const track = trackViews.find((t) => t.item.id === nowPlayingID);
    if (!track) return;

    const src = track.artworkUrl ?? "";
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.displayTitle ?? "",
      artist: track.originalArtist ?? "",
      album: track.albumTitle ?? "",
      artwork: src
        ? [
          {src, sizes: "512x512"},
          {src, sizes: "256x256"},
          {src, sizes: "96x96"},
        ]
        : undefined,
    });
  }, [trackViews, nowPlayingID]);
}
