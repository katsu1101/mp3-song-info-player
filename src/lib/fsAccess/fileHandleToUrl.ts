// src/lib/fsAccess/fileHandleToUrl.ts
export async function fileHandleToObjectUrl(
  handle: FileSystemFileHandle,
): Promise<string> {
  const file = await handle.getFile();
  return URL.createObjectURL(file);
}

// TODO: 使い終わったら必ず URL.revokeObjectURL(url) する（プール管理推奨）
