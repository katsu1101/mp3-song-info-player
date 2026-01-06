"use client";

import {getDirname}        from "@/hooks/src/lib/path/getDirname";
import {useObjectUrlStore} from "@/hooks/useObjectUrlStore";

import {runWithConcurrency}                                             from "@/lib/async/runWithConcurrency";
import {clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle} from "@/lib/fsAccess/dirHandleStore";
import {readMp3FromDirectory}                                           from "@/lib/fsAccess/scanMp3";
import {readMp3Meta}                                                    from "@/lib/mp3/readMp3Meta";
import type {Mp3Entry}                                                  from "@/types";
import {useEffect, useMemo, useState}                                   from "react";

const canReadNow = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  if (!handle.queryPermission) return true;
  const state = await handle.queryPermission({mode: "read"});
  return state === "granted";
};

const requestRead = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  if (!handle.requestPermission) return false;
  const state = await handle.requestPermission({mode: "read"});
  return state === "granted";
};

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif"]);

const getLowerExt = (name: string): string => {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return name.slice(dotIndex + 1).toLowerCase();
};

const resolveDirectoryHandle = async (
  rootHandle: FileSystemDirectoryHandle,
  dirPath: string
): Promise<FileSystemDirectoryHandle> => {
  if (!dirPath) return rootHandle;

  const parts = dirPath.split("/").filter(Boolean);
  let currentHandle: FileSystemDirectoryHandle = rootHandle;

  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part, {create: false});
  }
  return currentHandle;
};

type ImageCandidate = { name: string; handle: FileSystemFileHandle };

const findFirstImageFileHandle = async (
  directoryHandle: FileSystemDirectoryHandle
): Promise<FileSystemFileHandle | null> => {
  const candidates: ImageCandidate[] = [];

  // TSのlib定義差を吸収（環境によって entries() の型が薄い）
  const iterable = (directoryHandle as unknown as {
    entries: () => AsyncIterable<[string, FileSystemHandle]>
  }).entries();

  for await (const [name, entry] of iterable) {
    if (entry.kind !== "file") continue;

    const ext = getLowerExt(name);
    if (!IMAGE_EXTS.has(ext)) continue;

    candidates.push({name, handle: entry as FileSystemFileHandle});
  }

  // ✅ 再現性のためファイル名でソート（「列挙順そのまま」が良ければ、このsortを消してOK）
  candidates.sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return candidates[0]?.handle ?? null;
};

export const useMp3Library = () => {
  const [mp3List, setMp3List] = useState<Mp3Entry[]>([]);
  const [folderName, setFolderName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  const [titleByPath, setTitleByPath] = useState<Record<string, string | null>>({});

  // ✅ MP3埋め込みジャケット（曲ごと）
  const covers = useObjectUrlStore();

  // ✅ フォルダ代表ジャケット（フォルダごと）
  const dirCovers = useObjectUrlStore();

  const totalSize = useMemo(
    () => mp3List.reduce((sum, item) => sum + item.size, 0),
    [mp3List]
  );

  const resetView = () => {
    setErrorMessage("");
    setMp3List([]);
    setFolderName("");
    setTitleByPath({});
    covers.clearAll();
    dirCovers.clearAll();
  };

  const buildList = async (handle: FileSystemDirectoryHandle) => {
    setFolderName(handle.name);

    const items = await readMp3FromDirectory(handle, {recursion: true});
    setMp3List(items);

    // ✅ フォルダ代表画像（先に作っておく：表示フォールバック用）
    void (async () => {
      const dirPaths = Array.from(new Set(items.map((x) => getDirname(x.path))));
      void runWithConcurrency(dirPaths, 2, async (dirPath) => {
        try {
          const dirHandle = await resolveDirectoryHandle(handle, dirPath);
          const imgHandle = await findFirstImageFileHandle(dirHandle);
          if (!imgHandle) return;

          const file = await imgHandle.getFile();
          const url = URL.createObjectURL(file);
          dirCovers.setUrl(dirPath, url);
        } catch {
          // フォルダが消えた/権限等は無視（フォールバック無しになるだけ）
        }
      });
    })();

    // ✅ MP3メタは後追い（タイトル/埋め込みジャケット）
    void runWithConcurrency(items, 2, async (entry) => {
      const file = await entry.fileHandle.getFile();
      const meta = await readMp3Meta(file);
      setTitleByPath((prev) => ({...prev, [entry.path]: meta.title}));
      covers.setUrl(entry.path, meta.coverUrl);
    });
  };

  // ✅ 起動時に復元
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ フォルダ選択（ここで保存）
  const pickFolderAndLoad = async () => {
    resetView();
    setNeedsReconnect(false);

    try {
      if (!("showDirectoryPicker" in window)) {
        setErrorMessage("このブラウザはフォルダ選択に対応していません。Chrome/Edgeでお試しください。");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({mode: "read"});

      await saveDirectoryHandle(handle);
      setSavedHandle(handle);

      await buildList(handle);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
    }
  };

  // ✅ 再接続（ユーザー操作で権限要求）
  const reconnect = async () => {
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
  };

  const forget = async () => {
    await clearDirectoryHandle();
    setSavedHandle(null);
    setNeedsReconnect(false);
    resetView();
  };

  return {
    mp3List,
    folderName,
    errorMessage,
    totalSize,
    titleByPath,

    coverUrlByPath: covers.urlByKey,
    dirCoverUrlByDir: dirCovers.urlByKey, // ✅ 追加

    savedHandle,
    needsReconnect,

    pickFolderAndLoad,
    reconnect,
    forget,
  };
};
