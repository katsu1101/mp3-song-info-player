// src/hooks/useMp3Library.ts
"use client";

import {useObjectUrlPool}                                               from "@/hooks/useObjectUrlPool";
import {clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle} from "@/lib/fsAccess/dirHandleStore";
import {findFirstImageFileHandle}                                       from "@/lib/fsAccess/findFirstImageFileHandle";
import {canReadNow, ensureDirectoryPicker, requestRead}                 from "@/lib/fsAccess/permission";
import {resolveDirectoryHandle}                                         from "@/lib/fsAccess/resolveDirectoryHandle";
import {readMp3FromDirectory}                                           from "@/lib/fsAccess/scanMp3";
import {readMp3Meta}                                                    from "@/lib/mp3/readMp3Meta";
import {getDirname}                                                     from "@/lib/path/getDirname";
import {shuffleArray}                                                   from "@/lib/shuffle";
import type {Covers}                                                    from "@/types/mp3";
import type {Mp3Entry}                                                  from "@/types/mp3Entry";
import {SettingActions, SettingState}                                   from "@/types/setting";
import type {TrackMetaByPath}                                           from "@/types/trackMeta";
import {useCallback, useEffect, useMemo, useRef, useState}              from "react";

type UseMp3LibraryOptions = {
  shuffle: boolean;
  priorityPaths?: string[]; // getPriorityPaths の代替（必要なら）
};

/**
 * 暫定: mp3List だけ最優先で返す。
 * - meta/covers/dirCover は全て空（UIを壊さないためのダミー）
 *
 * TODO: metaByPath を後追いで埋める（1曲ずつ）
 * TODO: dirCoverUrlByDir を後追いで埋める
 */
export const useMp3Library = (options: UseMp3LibraryOptions) => {
  const {shuffle, priorityPaths} = options;
  // TODO: priorityPaths を後追い処理に使うならここで参照

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
  const coverUrlByPathRef = useRef<Record<string, string | null>>({});
  useEffect(() => {
    coverUrlByPathRef.current = coverUrlByPath;
  }, [coverUrlByPath]);


  // ✅ 後追いキャンセル用（フォルダ切替で止める）
  const dirCoverRunIdRef = useRef(0);

  const resetView = useCallback(() => {
    dirCoverRunIdRef.current += 1;
    metaRunIdRef.current += 1; // ✅ 追加：meta後追い停止
    setErrorMessage("");
    setMp3List([]);
    setFolderName("");
    setDirCoverUrlByDir({});
    setCoverUrlByPath({}); // ✅ 追加
    setMetaByPath({}); // ✅ 追加
    revokeAll(); // ✅ ここに集約
  }, [revokeAll]);

  // TODO(整理A-1): coverUrlByPathRef を削るなら、このuseEffectごと消す
  // useEffect(() => { coverUrlByPathRef.current = coverUrlByPath; }, [coverUrlByPath]);

  // ✅ startDirCoverWorker 内の二重 set を1回にする
  const startDirCoverWorker = useCallback(async (
    rootHandle: FileSystemDirectoryHandle,
    items: readonly Mp3Entry[]
  ) => {
    const myRunId = ++dirCoverRunIdRef.current;

    // 対象フォルダを抽出（"" はルート扱い）
    const dirPaths = Array.from(new Set(items.map((x) => getDirname(x.path))));

    // 先に null で埋める（UI都合で undefined を避けたい場合）
    setDirCoverUrlByDir(() => {
      const next: Record<string, string | null> = {};
      for (const dirPath of dirPaths) next[dirPath] = null;
      return next;
    });

    // 軽くするため同時2本くらい
    const concurrency = 2;
    let cursor = 0;

    const runOne = async () => {
      while (cursor < dirPaths.length) {
        if (dirCoverRunIdRef.current !== myRunId) return;

        const dirPath = dirPaths[cursor++]!;
        try {
          const dirHandle = await resolveDirectoryHandle(rootHandle, dirPath);
          const imgHandle = await findFirstImageFileHandle(dirHandle);
          if (!imgHandle) continue;

          const file = await imgHandle.getFile();
          const url = URL.createObjectURL(file);
          track(url);

          setDirCoverUrlByDir((prev) => {
            if (prev[dirPath] === url) return prev;
            return {...prev, [dirPath]: url};
          });
        } catch {
          // フォルダが消えた/権限/読み取り失敗は無視（フォールバック無しになるだけ）
        }

        // UIが固まりにくいように息継ぎ
        await new Promise<void>((r) => setTimeout(r, 0));
      }
    };

    await Promise.all(Array.from({length: concurrency}, () => runOne()));
  }, [track]);

  const startMetaWorker = useCallback(async (items: readonly Mp3Entry[]) => {
    const createCoverObjectUrlFromPicture = (
      picture?: { data: Uint8Array; format: string }
    ): string | null => {
      if (!picture) return null;

      const copied = new Uint8Array(picture.data);
      const blob = new Blob([copied], {type: picture.format});
      const url = URL.createObjectURL(blob);
      track(url);
      return url;
    };
    const myRunId = ++metaRunIdRef.current;

    for (const entry of items) {
      if (metaRunIdRef.current !== myRunId) return;

      try {
        const file = await entry.fileHandle.getFile();

        // ✅ 文字化け修復込み（native優先 + SJIS修復）
        const meta = await readMp3Meta(file);

        // ✅ すでに cover があるなら二重生成しない（objectURLを無駄に作らない）
        const alreadyCover = coverUrlByPathRef.current[entry.path];
        const coverUrl = alreadyCover ?? createCoverObjectUrlFromPicture(meta.picture);

        // ✅ coverUrlByPath を更新（coverUrl が null なら入れない）
        if (coverUrl && !alreadyCover) {
          setCoverUrlByPath((prev) => ({...prev, [entry.path]: coverUrl}));
        }

        if (metaRunIdRef.current !== myRunId) return;

        setMetaByPath((prev) => ({
          ...prev,
          [entry.path]: {
            title: meta.title ?? entry.fileHandle.name,
            artist: meta.artist ?? "",
            album: meta.album ?? "",
            trackNo: meta.trackNo ?? null,
            year: meta.year ?? null,
            coverUrl: coverUrl ?? null, // ✅ ここはどっちでもOK（tracks側がどこを参照するか次第）
          },
        }));
      } catch {
        // 失敗時はダミーのまま（OK）
      }

      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }, [track]);


  const buildList = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setFolderName(handle.name);

    let items = await readMp3FromDirectory(handle, "");

    if (shuffle) {
      items = shuffleArray(items);
      for (let i = 0; i < items.length; i++) items[i]!.id = i + 1;
    }

    setMp3List(items);

    // ✅ まずダミーで一括初期化（即表示）
    setMetaByPath(() => {
      const next: TrackMetaByPath = {};
      for (const e of items) {
        next[e.path] = {
          title: e.fileHandle.name,
          artist: "",
          album: "",
          trackNo: null,
          year: null,
          coverUrl: null,
        };
      }
      return next;
    });

    // ✅ フォルダ代表画像だけ後追い開始
    void startDirCoverWorker(handle, items);

    // ✅ metaも後追い（1曲ずつ）
    void startMetaWorker(items);
  }, [shuffle, startDirCoverWorker, startMetaWorker]);

  // 起動時に復元
  useEffect(() => {
    const boot = async () => {
      try {
        const handle = await loadDirectoryHandle();
        if (!handle) return;

        setSavedHandle(handle);
        setFolderName(handle.name);

        const ok = await canReadNow(handle);
        if (ok) {
          await buildList(handle);
          setNeedsReconnect(false);
        } else {
          setNeedsReconnect(true);
        }
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : String(e));
      }
    };
    void boot();
  }, [buildList]);

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

    await buildList(savedHandle);
    setNeedsReconnect(false);
  }, [buildList, savedHandle]);

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