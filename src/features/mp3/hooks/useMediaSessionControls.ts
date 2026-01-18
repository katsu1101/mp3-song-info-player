// src/features/mp3/hooks/useMediaSessionControls.ts

"use client";

import {useEffect} from "react";

type MediaSessionPlayActions = {
  playAction: () => void;
  pauseAction: () => void;
  nextAction: () => void;
  prevAction: () => void;
};

const canUseMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

export function useMediaSessionControls(actions: MediaSessionPlayActions): void {
  const {playAction, pauseAction, nextAction, prevAction} = actions;

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
}