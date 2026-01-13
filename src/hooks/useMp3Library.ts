// src/hooks/useMp3Library.ts
"use client";

import {useMp3LibraryBoot}                                 from "@/hooks/useMp3LibraryBoot";
import {useObjectUrlPool}                                  from "@/hooks/useObjectUrlPool";
import {clearDirectoryHandle, saveDirectoryHandle}         from "@/lib/fsAccess/dirHandleStore";
import {ensureDirectoryPicker, requestRead}                from "@/lib/fsAccess/permission";
import {buildMp3Library}                                   from "@/lib/mp3/library/buildMp3Library";
import type {Covers}                                       from "@/types/mp3";
import type {Mp3Entry}                                     from "@/types/mp3Entry";
import {SettingActions, SettingState}                      from "@/types/setting";
import type {TrackMetaByPath}                              from "@/types/trackMeta";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

type UseMp3LibraryOptions = {
  shuffle: boolean;
};

/**
 * 暫定: mp3List だけ最優先で返す。
 * - meta/covers/dirCover は全て空（UIを壊さないためのダミー）
 */
export const useMp3Library = (options: UseMp3LibraryOptions) => {
  const {shuffle} = options;

  const {track, revokeAll} = useObjectUrlPool();

  const [mp3List, setMp3List] = useState<Mp3Entry[]>([]);
  const [folderName, setFolderName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

// ✅ metaByPath を後追いで埋める
  const [metaByPath, setMetaByPath] = useState<TrackMetaByPath>({});
  const metaRunIdRef = useRef(0);

  // ✅ dirCover だけ動かす
  const [dirCoverUrlByDir, setDirCoverUrlByDir] = useState<Record<string, string | null>>({});
  const [coverUrlByPath, setCoverUrlByPath] = useState<Record<string, string | null>>({});


  // ✅ 後追いキャンセル用（フォルダ切替で止める）
  const dirCoverRunIdRef = useRef(0);

  const resetView = useCallback(() => {
    dirCoverRunIdRef.current += 1;
    metaRunIdRef.current += 1;
    setErrorMessage("");
    setMp3List([]);
    setFolderName("");
    setDirCoverUrlByDir({});
    setCoverUrlByPath({});
    setMetaByPath({});
    revokeAll();
  }, [revokeAll]);

  const buildList = useCallback(async (handle: FileSystemDirectoryHandle) => {
    await buildMp3Library({
      handle,
      shuffle,
      track,

      dirCoverRunIdRef,
      metaRunIdRef,

      setFolderName,
      setMp3List,
      setMetaByPath,
      setDirCoverUrlByDir,
      setCoverUrlByPath,
    });
  }, [shuffle, track]);

  // 起動時に復元
  useMp3LibraryBoot({
    buildList,
    setSavedHandle,
    setFolderName,
    setNeedsReconnect,
    setErrorMessage,
  });


  const pickFolderAndLoad = useCallback(async () => {
    const error = ensureDirectoryPicker();
    if (error) {
      setErrorMessage(error);
      return;
    }

    resetView();
    setNeedsReconnect(false);

    try {
      const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({mode: "read"});
      await saveDirectoryHandle(handle);
      setSavedHandle(handle);
      await buildList(handle);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
    }
  }, [resetView, buildList]);

  const reconnect = useCallback(async () => {
    setErrorMessage("");
    if (!savedHandle) return;

    const ok = await requestRead(savedHandle);
    if (!ok) {
      setNeedsReconnect(true);
      setErrorMessage("フォルダへの読み取り権限が付与されませんでした。");
      return;
    }

    resetView();
    await buildList(savedHandle);
    setNeedsReconnect(false);
  }, [buildList, savedHandle, resetView]);

  const forget = useCallback(async () => {
    await clearDirectoryHandle();
    setSavedHandle(null);
    setNeedsReconnect(false);
    resetView();
  }, [resetView]);

  // unmount掃除
  useEffect(() => {
    return () => {
      dirCoverRunIdRef.current += 1;
      metaRunIdRef.current += 1;
      revokeAll();
    };
  }, [revokeAll]);

  const covers: Covers = useMemo(() => ({
    coverUrlByPath,
    dirCoverUrlByDir,
  }), [coverUrlByPath, dirCoverUrlByDir]);

  return {
    mp3List,
    covers,
    settingState: {
      folderName,
      errorMessage,
      metaByPath,
      savedHandle,
      needsReconnect,
    } as SettingState,
    settingActions: {
      pickFolderAndLoad,
      reconnect,
      forget,
    } as SettingActions,
  };
};