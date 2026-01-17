// src/lib/mp3/album/buildDirAlbums.ts
import {getDirname}    from "@/lib/path/getDirname";
import {AlbumInfo}     from "@/features/mp3/types/albumInfo";
import type {Mp3Entry} from "@/features/mp3/types/mp3Entry";

export type BuildDirAlbumsArgs = {
  mp3List: readonly Mp3Entry[];
  dirCoverUrlByDir: Record<string, string | null>;
};

export const buildDirAlbums = (args: BuildDirAlbumsArgs): AlbumInfo[] => {
  const {mp3List, dirCoverUrlByDir} = args;

  // ✅ Runtime防御: "mp3List is not iterable" を潰す
  if (!Array.isArray(mp3List) || mp3List.length === 0) return [];

  const pathsByDir = new Map<string, string[]>();

  for (const entry of mp3List) {
    const dirKey = getDirname(entry.path);
    const paths = pathsByDir.get(dirKey) ?? [];
    paths.push(entry.path);
    pathsByDir.set(dirKey, paths);
  }

  return Array.from(pathsByDir.entries()).map(([dirKey, trackPaths]) => {
    const dirCoverUrl = dirCoverUrlByDir[dirKey] ?? null;

    return {
      key: `dir:${dirKey}`,
      kind: "dir",
      dirKey,
      trackPaths,
      dirCoverUrl,
    };
  });
};
