"use client";

import React, {useEffect, useState} from "react";

export function useAudioPlaybackState(
  audioRef: React.RefObject<HTMLAudioElement | null>,
): { isPlaying: boolean } {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const sync = () => {
      setIsPlaying(!audio.paused && !audio.ended);
    };

    sync();
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    audio.addEventListener("ended", sync);

    return () => {
      audio.removeEventListener("play", sync);
      audio.removeEventListener("pause", sync);
      audio.removeEventListener("ended", sync);
    };
  }, [audioRef]);

  return {isPlaying};
}
