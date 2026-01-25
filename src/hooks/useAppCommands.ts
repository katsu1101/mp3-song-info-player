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

  playRewind: () => Promise<void>;
  playForward: () => Promise<void>;
  playAtIndex: (index: number) => Promise<void>;

  // TODO: setShuffle / setRepeat などは次段で追加
};

type UseAppCommandsArgs = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playActions: PlayActions | null | undefined;
  settingActions: SettingActions;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const canUseDuration = (duration: number): boolean =>
  Number.isFinite(duration) && duration > 0;

const seekTo = (audio: HTMLAudioElement, nextTime: number): void => {
  const duration = audio.duration;

  const maxTime = canUseDuration(duration) ? duration : Number.POSITIVE_INFINITY;
  const safeTime = clamp(nextTime, 0, maxTime);

  // fastSeek があれば優先（対応ブラウザのみ）
  const maybeFastSeek = (audio as unknown as { fastSeek?: (t: number) => void }).fastSeek;
  if (typeof maybeFastSeek === "function") {
    maybeFastSeek(safeTime);
    return;
  }

  audio.currentTime = safeTime;
};

/**
 * メディア再生管理およびフォルダ設定操作のためのアプリケーションレベルコマンド群を提供するカスタムフック。
 *
 * @param {UseAppCommandsArgs} args - コマンド設定に必要な引数。オーディオ要素への参照、再生および設定用のアクションハンドラを含む。
 * @returns {AppCommands} 再生制御、設定構成、その他のアプリケーションレベル操作を管理するコマンド関数を含むオブジェクト。
 *
 * 返されるオブジェクトが提供する機能：
 * - `stopPlayback`: メディア再生を停止し、オーディオ要素をリセットします。
 * - `pickFolder`: フォルダ選択をトリガーし、その内容をロードします。再生中の場合は停止します。
 * - `reconnect`: 再生停止後、メディアソースへの再接続を試みます。
 * - `forget`: 保存された設定をクリアし、再生を停止します。
 * - `playPrev`: サポートされている場合、前のメディア項目を再生します。
 * - `playNext`: サポートされている場合、次のメディア項目を再生します。
 * - `playAtIndex`: サポートされている場合、指定したインデックスのメディア項目を再生します。
 */
export const useAppCommands = (args: UseAppCommandsArgs):AppCommands => {
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
  const SEEK_SECONDS = 10;

  const playRewind = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = audio.currentTime - SEEK_SECONDS;
    seekTo(audio, nextTime);
  }, [audioRef]);
  const playForward = React.useCallback(() => {

    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = audio.currentTime + SEEK_SECONDS;
    seekTo(audio, nextTime);
  }, [audioRef]);

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
    playRewind,
    playForward,
    playAtIndex: playActions?.playAtIndex ?? (async () => {
    }),
  } as AppCommands), [stopPlayback, pickFolder, reconnect, forget, playActions?.playPrev,
    playActions?.playNext, playActions?.playAtIndex, playRewind, playForward]);
};
