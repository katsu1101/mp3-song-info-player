import {Mp3Entry} from "@/types";

export const readMp3FromDirectory = async (
  directoryHandle: FileSystemDirectoryHandle,
  basePath: string
): Promise<Mp3Entry[]> => {

  const entries: Mp3Entry[] = [];

  // ✅ entries() ではなく、AsyncIterableとして反復する
  for await (const [name, handle] of directoryHandle as unknown as AsyncIterable<
    [string, FileSystemHandle]
  >) {
    const currentPath = basePath ? `${basePath}/${name}` : name;

    if (handle.kind === "file") {
      if (!name.toLowerCase().endsWith(".mp3")) continue;

      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      entries.push({
        id: 0,
        path: currentPath,
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        fileHandle,
      });
      continue;
    }

    if (handle.kind === "directory") {
      const child = await readMp3FromDirectory(
          handle as FileSystemDirectoryHandle, currentPath);
      entries.push(...child);
    }
  }

  // ✅ 返却順に連番を確定
  return entries.map((entry, index) => ({ ...entry, id: index + 1 }));
};
