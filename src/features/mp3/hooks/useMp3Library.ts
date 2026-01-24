// src/hooks/useMp3Library.ts
"use client";

import {useLyricsAutoFill}  from "@/features/mp3/hooks/useLyricsAutoFill";
import {useMp3LibraryBoot}  from "@/features/mp3/hooks/useMp3LibraryBoot";
import {buildDirAlbums}     from "@/features/mp3/lib/album/buildDirAlbums"; // あとで作る/すでにある前提
import {buildMp3Library}    from "@/features/mp3/lib/library/buildMp3Library";
import * as LibraryActions  from "@/features/mp3/lib/library/libraryActions";
import type * as Mp3Types   from "@/features/mp3/types";
import {useObjectUrlPool}   from "@/hooks/useObjectUrlPool";
import {createSettingState} from "@/lib/settings/createSettingState";
import * as setting         from "@/types/setting";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";

// return 型（もし明示してるなら）に albums を足す
export type UseMp3LibraryResult = {
  mp3List: Mp3Types.Mp3Entry[];
  artworkUrlByPath: Mp3Types.ArtworkUrlByPath;
  settingState: setting.SettingState;
  settingActions: setting.SettingActions;
  fantiaEntryByPath: Record<string, Mp3Types.FantiaMappingRow | undefined>;

  albums: Mp3Types.AlbumInfo[]; // ✅ 追加
};

/**
 * 暫定: mp3List だけ最優先で返す。
 * - meta/artworks/dirArtwork は全て空（UIを壊さないためのダミー）
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
  const [mp3List, setMp3List] = useState<Mp3Types.Mp3Entry[]>([]);

  const infoRunIdRef = useRef(0);
  // ===== per-track meta (progressive) =====
  const [metaByPath, setMetaByPath] = useState<Mp3Types.TrackMetaByPath>({});
  const metaRunIdRef = useRef(0);

  // ===== artwork (progressive) =====
  const [artworkUrlByPath, setArtworkUrlByPath] = useState<Record<string, string | null>>({});
  const dirArtworkRunIdRef = useRef(0);

  // ===== lyrics (progressive) =====
  const lyricsRunIdRef = useRef(0);

  // ===== Fantia mapping (progressive) =====
  const [fantiaEntryByPath, setFantiaEntryByPath] =
    useState<Record<string, Mp3Types.FantiaMappingRow | undefined>>({});

  // ===== internal utilities =====
  const resetView = useCallback(() => {
    dirArtworkRunIdRef.current += 1;
    metaRunIdRef.current += 1;

    setErrorMessage("");
    setFolderName("");
    setNeedsReconnect(false);

    setMp3List([]);
    setMetaByPath({});
    setArtworkUrlByPath({});
    setFantiaEntryByPath({});

    revokeAll();
  }, [revokeAll]);


  // ===== core build =====
  const buildList = useCallback(async (handle: FileSystemDirectoryHandle) => {
    await buildMp3Library({
      handle,
      track,

      infoRunIdRef,
      dirArtworkRunIdRef: dirArtworkRunIdRef,
      metaRunIdRef,
      lyricsRunIdRef,

      setFolderName,
      setMp3List,
      setMetaByPath,
      setArtworkUrlByPath: setArtworkUrlByPath,
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
      dirArtworkRunIdRef.current += 1;
      metaRunIdRef.current += 1;
      revokeAll();
    };
  }, [revokeAll]);

  useLyricsAutoFill({
    mp3List,
    metaByPath,
    lyricsRunIdRef,
    setMetaByPathAction: setMetaByPath,
  });

  // ===== public actions =====
  const pickFolderAndLoad = useCallback(async () => {
    await LibraryActions.pickFolderAndLoadAction({
      resetView,
      buildList,
      setNeedsReconnect,
      setSavedHandle,
      setErrorMessage,
    });
  }, [resetView, buildList]);

  const reconnect = useCallback(async () => {
    await LibraryActions.reconnectAction({
      savedHandle,
      resetView,
      buildList,
      setNeedsReconnect,
      setErrorMessage,
    });
  }, [savedHandle, resetView, buildList]);

  const forget = useCallback(async () => {
    await LibraryActions.forgetAction({
      resetView,
      setSavedHandle,
      setNeedsReconnect,
    });
  }, [resetView]);

  const settingState = useMemo(() => createSettingState({
    folderName,
    errorMessage,
    metaByPath,
    savedHandle,
    needsReconnect,
  }), [folderName, errorMessage, metaByPath, savedHandle, needsReconnect]);

  const settingActions: setting.SettingActions = {
    pickFolderAndLoad,
    reconnect,
    forget,
  };

  const albums: Mp3Types.AlbumInfo[] = useMemo(() => {
    // mp3List が未確定の瞬間があると落ちるのでガード
    if (!Array.isArray(mp3List) || mp3List.length === 0) return [];

    return buildDirAlbums({
      mp3List,
      dirArtworkUrlByDir: artworkUrlByPath,
    });
  }, [mp3List, artworkUrlByPath]);

  return {
    mp3List, artworkUrlByPath, settingState, settingActions, fantiaEntryByPath,
    albums
  };
};