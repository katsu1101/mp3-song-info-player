// src/hooks/useAppCommands.ts
"use client";

import type {PlayActions}    from "@/types/actions";
import type {SettingActions} from "@/types/setting";
import * as React            from "react";

export type AppCommands = {
  stopPlayback: () => void;
  pickFolder: () => Promise<void>;
  reconnect: () => Promise<void>;
  forget: () => Promise<void>;

  playPrev: () => Promise<void>;
  playNext: () => Promise<void>;

  playAtIndex: (index: number) => Promise<void>;

  // TODO: setShuffle / setRepeat などは次段で追加
};

type UseAppCommandsArgs = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playActions: PlayActions | null | undefined;
  settingActions: SettingActions;
};

export const useAppCommands = (args: UseAppCommandsArgs): AppCommands => {
  const {audioRef, playActions, settingActions} = args;

  const stopPlayback = React.useCallback(() => {
    // 可能なら playActions を正本として使う
    if (playActions?.stop) {
      playActions.stop();
      return;
    }

    // フォールバック: audio要素を直に止める
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;

    audio.src = "";
  }, [playActions, audioRef]);

  const pickFolder = React.useCallback(async () => {
    stopPlayback();
    await settingActions.pickFolderAndLoad();
  }, [stopPlayback, settingActions]);

  const reconnect = React.useCallback(async () => {
    stopPlayback();
    await settingActions.reconnect();
  }, [stopPlayback, settingActions]);

  const forget = React.useCallback(async () => {
    stopPlayback();
    await settingActions.forget();
  }, [stopPlayback, settingActions]);

  return React.useMemo(() => ({
    stopPlayback,
    pickFolder,
    reconnect,
    forget,
    playPrev: playActions?.playPrev ?? (async () => {
    }),
    playNext: playActions?.playNext ?? (async () => {
    }),
    playAtIndex: playActions?.playAtIndex ?? (async () => {
    }),
  }), [
    stopPlayback, pickFolder, reconnect,
    forget, playActions?.playPrev, playActions?.playNext, playActions?.playAtIndex
  ]);
};
