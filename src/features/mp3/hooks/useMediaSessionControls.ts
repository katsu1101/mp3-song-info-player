"use client";

import {fileHandleToObjectUrl} from "@/lib/fsAccess/fileHandleToUrl";
import {TrackView}             from "@/types/views";
import {useEffect}             from "react";
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

    let isCanceled = false;
    let objectUrlToRevoke: string | null = null;

    const run = async (): Promise<void> => {
      let src = "";

      if (track.item.fileHandle) {
        src = await fileHandleToObjectUrl(track.item.fileHandle);
        objectUrlToRevoke = src;
      }

      if (isCanceled) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.displayTitle,
        artist: track.originalArtist ?? "",
        album: track.albumTitle ?? "",
        artwork: src
          ? [{src, sizes: "512x512", type: "image/png"}] // TODO: 本当のmimeに合わせたい
          : undefined,
      });
    };

    void run();

    return () => {
      isCanceled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [trackViews, nowPlayingID]);
}
