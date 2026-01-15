// src/hooks/useMp3Library.ts
"use client";

import {useMp3LibraryBoot}                                      from "@/hooks/useMp3LibraryBoot";
import {useObjectUrlPool}                                       from "@/hooks/useObjectUrlPool";
import {buildDirAlbums}                                         from "@/lib/mp3/album/buildDirAlbums"; // あとで作る/すでにある前提
import {buildMp3Library}                                        from "@/lib/mp3/library/buildMp3Library";
import {forgetAction, pickFolderAndLoadAction, reconnectAction} from "@/lib/mp3/library/mp3LibraryActions";
import {createMp3SettingState}                                  from "@/lib/settings/createMp3SettingState";
import type {AlbumInfo}                                         from "@/types/albumInfo";
import type {Covers}                                            from "@/types/covers";
import type {FantiaMappingEntry}                                from "@/types/fantia";
import type {Mp3Entry}                                          from "@/types/mp3Entry";
import {SettingActions, SettingState}                           from "@/types/setting";
import type {TrackMetaByPath}                                   from "@/types/trackMeta";
import {useCallback, useEffect, useMemo, useRef, useState}      from "react";

type UseMp3LibraryOptions = {
  shuffle: boolean;
};

// return 型（もし明示してるなら）に albums を足す
export type UseMp3LibraryResult = {
  mp3List: Mp3Entry[];
  covers: Covers;
  settingState: SettingState;
  settingActions: SettingActions;
  fantiaEntryByPath: Record<string, FantiaMappingEntry | undefined>;

  albums: AlbumInfo[]; // ✅ 追加
};

/**
 * 暫定: mp3List だけ最優先で返す。
 * - meta/covers/dirCover は全て空（UIを壊さないためのダミー）
 */
export const useMp3Library = (options: UseMp3LibraryOptions): UseMp3LibraryResult => {

  const {shuffle} = options;
  // ===== external hooks =====
  const {track, revokeAll} = useObjectUrlPool();

  // ===== UI state =====
  const [errorMessage, setErrorMessage] = useState("");
  const [folderName, setFolderName] = useState("");

  // ===== permission / persistence state =====
  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  // ===== library list =====
  const [mp3List, setMp3List] = useState<Mp3Entry[]>([]);

  // ===== per-track meta (progressive) =====
  const [metaByPath, setMetaByPath] = useState<TrackMetaByPath>({});
  const metaRunIdRef = useRef(0);

  // ===== covers (progressive) =====
  const [coverUrlByPath, setCoverUrlByPath] = useState<Record<string, string | null>>({});
  const [dirCoverUrlByDir, setDirCoverUrlByDir] = useState<Record<string, string | null>>({});
  const dirCoverRunIdRef = useRef(0);

  // ===== Fantia mapping (progressive) =====
  const [fantiaEntryByPath, setFantiaEntryByPath] =
    useState<Record<string, FantiaMappingEntry | undefined>>({});

  // ===== internal utilities =====
  const resetView = useCallback(() => {
    // cancel progressive workers
    dirCoverRunIdRef.current += 1;
    metaRunIdRef.current += 1;

    // reset UI + data
    setErrorMessage("");
    setFolderName("");
    setNeedsReconnect(false); // ※必要ならここで（今は各action側でもOK）
    setSavedHandle(null);     // ※forget以外では入れないなら外す

    setMp3List([]);
    setMetaByPath({});
    setCoverUrlByPath({});
    setDirCoverUrlByDir({});
    setFantiaEntryByPath({});

    // revoke object URLs
    revokeAll();
  }, [revokeAll]);

  // ===== core build =====
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
      setCoverUrlByPath,
      setDirCoverUrlByDir,
    });
  }, [shuffle, track]);

  // ===== boot (restore) =====
  useMp3LibraryBoot({
    buildList,
    setSavedHandle,
    setFolderName,
    setNeedsReconnect,
    setErrorMessage,
  });

  // ===== unmount cleanup =====
  useEffect(() => {
    return () => {
      dirCoverRunIdRef.current += 1;
      metaRunIdRef.current += 1;
      revokeAll();
    };
  }, [revokeAll]);

  // ===== derived values =====
  const covers: Covers = useMemo(() => ({
    coverUrlByPath,
    dirCoverUrlByDir,
  }), [coverUrlByPath, dirCoverUrlByDir]);

  // ===== public actions =====
  const pickFolderAndLoad = useCallback(async () => {
    await pickFolderAndLoadAction({
      resetView,
      buildList,
      setNeedsReconnect,
      setSavedHandle,
      setErrorMessage,
    });
  }, [resetView, buildList]);

  const reconnect = useCallback(async () => {
    await reconnectAction({
      savedHandle,
      resetView,
      buildList,
      setNeedsReconnect,
      setErrorMessage,
    });
  }, [savedHandle, resetView, buildList]);

  const forget = useCallback(async () => {
    await forgetAction({
      resetView,
      setSavedHandle,
      setNeedsReconnect,
    });
  }, [resetView]);

  const settingState = useMemo(() => createMp3SettingState({
    folderName,
    errorMessage,
    metaByPath,
    savedHandle,
    needsReconnect,
  }), [folderName, errorMessage, metaByPath, savedHandle, needsReconnect]);

  const settingActions: SettingActions = {
    pickFolderAndLoad,
    reconnect,
    forget,
  };

  const albums: AlbumInfo[] = useMemo(() => {
    // mp3List が未確定の瞬間があると落ちるのでガード
    if (!Array.isArray(mp3List) || mp3List.length === 0) return [];

    return buildDirAlbums({
      mp3List,
      folderName,
      dirCoverUrlByDir: covers.dirCoverUrlByDir,
    });
  }, [mp3List, folderName, covers.dirCoverUrlByDir]);


  return {
    mp3List, covers, settingState, settingActions, fantiaEntryByPath,
    albums
  };
};