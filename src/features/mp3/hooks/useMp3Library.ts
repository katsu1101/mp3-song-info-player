// src/hooks/useMp3Library.ts
"use client";

import {useMp3LibraryBoot}                                      from "@/features/mp3/hooks/useMp3LibraryBoot";
import {buildDirAlbums}                                         from "@/features/mp3/lib/album/buildDirAlbums"; // あとで作る/すでにある前提
import {buildMp3Library}                                        from "@/features/mp3/lib/library/buildMp3Library";
import {forgetAction, pickFolderAndLoadAction, reconnectAction} from "@/features/mp3/lib/library/mp3LibraryActions";
import type {AlbumInfo}                                         from "@/features/mp3/types/albumInfo";
import type {Covers}                                            from "@/features/mp3/types/covers";
import {FantiaMappingRow}                                       from "@/features/mp3/types/fantia";
import type {Mp3Entry}                                          from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}                                   from "@/features/mp3/types/trackMeta";
import {useObjectUrlPool}                                       from "@/hooks/useObjectUrlPool";
import {createMp3SettingState}                                  from "@/lib/settings/createMp3SettingState";
import {SettingActions, SettingState}                           from "@/types/setting";
import {useCallback, useEffect, useMemo, useRef, useState}      from "react";

// return 型（もし明示してるなら）に albums を足す
export type UseMp3LibraryResult = {
  mp3List: Mp3Entry[];
  covers: Covers;
  settingState: SettingState;
  settingActions: SettingActions;
  fantiaEntryByPath: Record<string, FantiaMappingRow | undefined>;

  albums: AlbumInfo[]; // ✅ 追加
};

/**
 * 暫定: mp3List だけ最優先で返す。
 * - meta/covers/dirCover は全て空（UIを壊さないためのダミー）
 */
export const useMp3Library = (): UseMp3LibraryResult => {

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

  // ===== lyrics (progressive) =====
  const lyricsRunIdRef = useRef(0);

  // ===== Fantia mapping (progressive) =====
  const [fantiaEntryByPath, setFantiaEntryByPath] =
    useState<Record<string, FantiaMappingRow | undefined>>({});

  // ===== internal utilities =====
  const resetView = useCallback(() => {
    dirCoverRunIdRef.current += 1;
    metaRunIdRef.current += 1;

    setErrorMessage("");
    setFolderName("");
    setNeedsReconnect(false);

    setMp3List([]);
    setMetaByPath({});
    setCoverUrlByPath({});
    setDirCoverUrlByDir({});
    setFantiaEntryByPath({});

    revokeAll();
  }, [revokeAll]);


  // ===== core build =====
  const buildList = useCallback(async (handle: FileSystemDirectoryHandle) => {
    await buildMp3Library({
      handle,
      track,

      dirCoverRunIdRef,
      metaRunIdRef,
      lyricsRunIdRef,

      setFolderName,
      setMp3List,
      setMetaByPath,
      setCoverUrlByPath,
      setDirCoverUrlByDir,
    });
  }, [track]);

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
      dirCoverUrlByDir: covers.dirCoverUrlByDir,
    });
  }, [mp3List, covers.dirCoverUrlByDir]);

  return {
    mp3List, covers, settingState, settingActions, fantiaEntryByPath,
    albums
  };
};