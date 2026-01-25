// src/features/mp3/components/PickCoverImageButton/PickCoverImageButton.tsx
"use client";

import {saveCoverImageForNowPlaying} from "@/features/mp3/lib/cover/saveCoverImageForNowPlaying";
import React                         from "react";

export type PickCoverImageButtonProps = {
  rootDirHandle: FileSystemDirectoryHandle | null;
  nowPlayingPath: string | null;

  /** 見た目だけ変えたいとき用（任意） */
  label?: string;
};

const toMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return "保存に失敗しました。";
};

export function PickCoverImageButton(props: PickCoverImageButtonProps): React.JSX.Element {
  const {rootDirHandle, nowPlayingPath, label = "画像を選んでジャケット保存"} = props;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canRun = Boolean(rootDirHandle) && Boolean(nowPlayingPath);

  const openPickerAction = React.useCallback(() => {
    setErrorMessage(null);
    if (!canRun) {
      setErrorMessage("再生中の曲とフォルダ接続が必要です。");
      return;
    }
    inputRef.current?.click();
  }, [canRun]);

  const onPickAction = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    // 同じファイルを連続で選択できるようにクリア
    e.target.value = "";

    setErrorMessage(null);

    if (!file) return;

    setIsSaving(true);
    try {
      await saveCoverImageForNowPlaying({
        rootDirHandle,
        nowPlayingPath,
        imageFile: file,
        reloadAfterSave: true, // あなたの方針
      });
    } catch (err) {
      setErrorMessage(toMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [rootDirHandle, nowPlayingPath]);

  return (
    <div style={{display: "grid", gap: 6}}>
      <button
        type="button"
        onClick={openPickerAction}
        disabled={isSaving}
        aria-disabled={!canRun || isSaving}
        title={!canRun ? "再生中の曲とフォルダ接続が必要です" : undefined}
      >
        {isSaving ? "保存中…" : label}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={false}
        hidden
        onChange={onPickAction}
      />

      {errorMessage ? (
        <p style={{color: "crimson", margin: 0}}>エラー: {errorMessage}</p>
      ) : null}
    </div>
  );
}
