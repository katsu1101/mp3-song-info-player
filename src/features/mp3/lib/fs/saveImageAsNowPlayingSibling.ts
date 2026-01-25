// src/features/mp3/lib/fs/saveImageAsNowPlayingSibling.ts
"use client";

export type SaveImageAsNowPlayingSiblingArgs = {
  rootDirHandle: FileSystemDirectoryHandle;

  /** 例: "Album/track01.mp3"（ルートからの相対想定） */
  nowPlayingPath: string;

  /** ドロップされた画像（1つ） */
  imageFile: File;
};

const normalizePath = (path: string): string =>
  path.replaceAll("\\", "/").replace(/^\/+/, "");

const splitPath = (path: string): string[] =>
  normalizePath(path)
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const getBaseName = (path: string): string => {
  const parts = splitPath(path);
  const fileName = parts[parts.length - 1] ?? "";
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return fileName;
  return fileName.slice(0, dotIndex);
};

const getDirParts = (path: string): string[] => {
  const parts = splitPath(path);
  return parts.slice(0, Math.max(0, parts.length - 1));
};

const getExtensionWithFallback = (file: File): string => {
  const name = file.name ?? "";
  const dotIndex = name.lastIndexOf(".");
  const hasExt = dotIndex >= 0 && dotIndex < name.length - 1;
  if (hasExt) return name.slice(dotIndex); // ".png" など

  const mime = file.type ?? "";
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "text/plain") return ".txt";
  return "";
};

const ensureWritePermission = async (dir: FileSystemDirectoryHandle): Promise<boolean> => {
  const q = await dir.queryPermission({mode: "readwrite"});
  if (q === "granted") return true;
  const r = await dir.requestPermission({mode: "readwrite"});
  return r === "granted";
};

const getDirHandleByParts = async (
  root: FileSystemDirectoryHandle,
  dirParts: readonly string[],
): Promise<FileSystemDirectoryHandle> => {
  let current = root;
  for (const part of dirParts) {
    current = await current.getDirectoryHandle(part, {create: false});
  }
  return current;
};

export const saveImageAsNowPlayingSibling = async (
  args: SaveImageAsNowPlayingSiblingArgs,
): Promise<{ savedPath: string }> => {
  const {rootDirHandle, nowPlayingPath, imageFile} = args;

  const dirParts = getDirParts(nowPlayingPath);
  const targetDir = await getDirHandleByParts(rootDirHandle, dirParts);

  const ok = await ensureWritePermission(targetDir);
  if (!ok) throw new Error("フォルダへの書き込み権限がありません。");

  const baseName = getBaseName(nowPlayingPath);
  if (!baseName) throw new Error("再生中ファイル名の解決に失敗しました。");

  const ext = getExtensionWithFallback(imageFile);
  if (!ext) throw new Error("画像の拡張子が判定できません。");

  const outputName = `${baseName}${ext}`;

  // ✅ createWritable は既存ファイルを上書きします
  const fileHandle = await targetDir.getFileHandle(outputName, {create: true});
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(imageFile);
  } finally {
    await writable.close();
  }

  const savedPath = [...dirParts, outputName].join("/");
  return {savedPath};
};
