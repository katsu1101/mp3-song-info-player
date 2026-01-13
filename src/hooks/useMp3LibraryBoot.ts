// src/hooks/useMp3LibraryBoot.ts
import "client-only";

import {loadDirectoryHandle} from "@/lib/fsAccess/dirHandleStore";
import {canReadNow}          from "@/lib/fsAccess/permission";
import {useEffect}           from "react";

type Args = {
  buildList: (handle: FileSystemDirectoryHandle) => Promise<void>;

  setSavedHandle: (handle: FileSystemDirectoryHandle | null) => void;
  setFolderName: (name: string) => void;
  setNeedsReconnect: (value: boolean) => void;
  setErrorMessage: (message: string) => void;
};

export const useMp3LibraryBoot = (args: Args): void => {
  const {
    buildList,
    setSavedHandle,
    setFolderName,
    setNeedsReconnect,
    setErrorMessage,
  } = args;

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
  }, [buildList, setSavedHandle, setFolderName, setNeedsReconnect, setErrorMessage]);
};
