// src/lib/mp3/library/libraryActions.ts
import {clearDirectoryHandle, saveDirectoryHandle} from "@/lib/fsAccess/dirHandleStore";
import {ensureDirectoryPicker, requestRead}        from "@/lib/fsAccess/permission";

const toMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const pickFolderAndLoadAction = async (args: {
  resetView: () => void;
  buildList: (handle: FileSystemDirectoryHandle) => Promise<void>;
  setNeedsReconnect: (v: boolean) => void;
  setSavedHandle: (h: FileSystemDirectoryHandle | null) => void;
  setErrorMessage: (m: string) => void;
}): Promise<void> => {
  const {resetView, buildList, setNeedsReconnect, setSavedHandle, setErrorMessage} = args;

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
    setErrorMessage(toMessage(e));
  }
};

export const reconnectAction = async (args: {
  savedHandle: FileSystemDirectoryHandle | null;
  resetView: () => void;
  buildList: (handle: FileSystemDirectoryHandle) => Promise<void>;
  setNeedsReconnect: (v: boolean) => void;
  setErrorMessage: (m: string) => void;
}): Promise<void> => {
  const {savedHandle, resetView, buildList, setNeedsReconnect, setErrorMessage} = args;

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
};

export const forgetAction = async (args: {
  resetView: () => void;
  setSavedHandle: (h: FileSystemDirectoryHandle | null) => void;
  setNeedsReconnect: (v: boolean) => void;
}): Promise<void> => {
  const {resetView, setSavedHandle, setNeedsReconnect} = args;

  await clearDirectoryHandle();
  setSavedHandle(null);
  setNeedsReconnect(false);
  resetView();
};
