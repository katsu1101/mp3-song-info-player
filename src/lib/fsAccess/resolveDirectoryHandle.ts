// src/lib/fsAccess/resolveDirectoryHandle.ts
export const resolveDirectoryHandle = async (
  rootHandle: FileSystemDirectoryHandle,
  dirPath: string
): Promise<FileSystemDirectoryHandle> => {
  if (!dirPath) return rootHandle;

  const parts = dirPath.split("/").filter(Boolean);
  let current: FileSystemDirectoryHandle = rootHandle;

  for (const part of parts) {
    current = await current.getDirectoryHandle(part, {create: false});
  }
  return current;
};
