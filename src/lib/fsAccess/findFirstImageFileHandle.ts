// src/lib/fsAccess/findFirstImageFileHandle.ts
import {getLowerExt, IMAGE_EXTS} from "@/const/constants";

export const findFirstImageFileHandle = async (
  directoryHandle: FileSystemDirectoryHandle
): Promise<FileSystemFileHandle | null> => {
  const iterable = (directoryHandle as unknown as {
    entries: () => AsyncIterable<[string, FileSystemHandle]>;
  }).entries();

  for await (const [name, entry] of iterable) {
    if (entry.kind !== "file") continue;
    if (!IMAGE_EXTS.has(getLowerExt(name))) continue;
    return entry as FileSystemFileHandle;
  }
  return null;
};
