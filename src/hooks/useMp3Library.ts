"use client";

import {useObjectUrlStore} from "@/hooks/useObjectUrlStore";

import {runWithConcurrency}                                             from "@/lib/async/runWithConcurrency";
import {clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle} from "@/lib/fsAccess/dirHandleStore";
import {readMp3FromDirectory}                                           from "@/lib/fsAccess/scanMp3";
import {readMp3Meta}                                                    from "@/lib/mp3/readMp3Meta";
import type {Mp3Entry}                                                  from "@/types";
import {useEffect, useMemo, useState}                                   from "react";

const canReadNow = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  if (!handle.queryPermission) return true; // 実装差があるので「行ける前提」に倒す
  const state = await handle.queryPermission({mode: "read"});
  return state === "granted";
};

const requestRead = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  if (!handle.requestPermission) return false; // 無ければ再接続はできない
  const state = await handle.requestPermission({mode: "read"});
  return state === "granted";
};


export const useMp3Library = () => {
  const [mp3List, setMp3List] = useState<Mp3Entry[]>([]);
  const [folderName, setFolderName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  const [titleByPath, setTitleByPath] = useState<Record<string, string | null>>({});
  const covers = useObjectUrlStore();

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
  };

  const buildList = async (handle: FileSystemDirectoryHandle) => {
    setFolderName(handle.name);

    const items = await readMp3FromDirectory(handle, {recursion: true});
    setMp3List(items);

    // メタは後追い
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

      await saveDirectoryHandle(handle); // ←これが無いと覚えません
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

    savedHandle,
    needsReconnect,

    pickFolderAndLoad,
    reconnect,
    forget,
  };
};
