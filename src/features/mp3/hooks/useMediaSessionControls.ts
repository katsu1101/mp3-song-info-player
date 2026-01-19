"use client";

import {TrackView} from "@/types/views";
import {useEffect} from "react";
// TODO: 可能なら dataUrl 版に切り替える（通知で blob: が出ない端末対策）

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

export function useMediaSessionControls(actions: {
  trackViews: TrackView[];
  nowPlayingID: number;
  playAction: () => void;
  pauseAction: () => void;
  nextAction: () => Promise<void>;
  prevAction: () => Promise<void>
}): void {
  const {trackViews, nowPlayingID, playAction, pauseAction, nextAction, prevAction} = actions;

  useEffect(() => {
    if (!canUseMediaSession()) return;

    navigator.mediaSession.setActionHandler("play", playAction);
    navigator.mediaSession.setActionHandler("pause", pauseAction);
    navigator.mediaSession.setActionHandler("nexttrack", nextAction);
    navigator.mediaSession.setActionHandler("previoustrack", prevAction);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [playAction, pauseAction, nextAction, prevAction]);

  useEffect(() => {
    if (!canUseMediaSession()) return;
    if (!nowPlayingID) return;

    const track = trackViews.find((t) => t.item.id === nowPlayingID);
    if (!track) return;
    const run = async (): Promise<void> => {
      const src = track.artworkUrl ?? "";
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.displayTitle ?? "",
        artist: track.originalArtist ?? "",
        album: track.albumTitle ?? "",
        artwork: src
          ? [{src, sizes: "512x512"}]
          : undefined,
      });
    };
    void run();
  }, [trackViews, nowPlayingID]);
}
