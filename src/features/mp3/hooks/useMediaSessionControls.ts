// src/features/mp3/hooks/useMediaSessionControls.ts

"use client";

import {TrackView} from "@/types/views";
import {useEffect} from "react";

type MediaSessionPlayActions = {
  trackViews: TrackView[],
  nowPlayingID: number,
  playAction: () => void;
  pauseAction: () => void;
  nextAction: () => void;
  prevAction: () => void;
};

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

export function useMediaSessionControls(actions: MediaSessionPlayActions): void {
  const {trackViews, nowPlayingID, playAction, pauseAction, nextAction, prevAction} = actions;
  const track = trackViews.find((t) => t.item.id === nowPlayingID);

  useEffect(() => {
    if (!canUseMediaSession()) return;
    const src = track?.item.fileHandle as unknown as string ?? "";
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track?.displayTitle || "",
      artist: track?.originalArtist || "",
      album: track?.albumTitle || "",
      artwork: [
        {src, sizes: "512x512", type: "image/png"},
      ],
    });
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
  }, [playAction, pauseAction, nextAction, prevAction, track?.item.fileHandle, track?.displayTitle, track?.originalArtist, track?.albumTitle]);
}