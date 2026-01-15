// src/lib/ui/labels.ts
export const UI_TEXT = {
  albums: {rootDirTitle: "未分類"},
} as const;

export const getDirAlbumTitle = (dirPath: string): string => {
  const isRoot = dirPath.length === 0 || dirPath === ".";
  return isRoot ? UI_TEXT.albums.rootDirTitle : dirPath;
};
