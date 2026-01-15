// src/lib/mp3/album/buildDirAlbums.ts
import {getDirname}     from "@/lib/path/getDirname";
import type {AlbumInfo} from "@/types/album";
import type {Mp3Entry}  from "@/types/mp3Entry";

export type BuildDirAlbumsArgs = {
  mp3List: readonly Mp3Entry[] | null | undefined;
  dirCoverUrlByDir: Readonly<Record<string, string | null>>;
};

export const buildDirAlbums = (args: BuildDirAlbumsArgs): AlbumInfo[] => {
  const list = Array.isArray(args.mp3List) ? args.mp3List : [];

  const pathsByDir = new Map<string, string[]>();
  for (const entry of list) {
    const dirKey = getDirname(entry.path);
    const paths = pathsByDir.get(dirKey) ?? [];
    paths.push(entry.path);
    pathsByDir.set(dirKey, paths);
  }

  const albums: AlbumInfo[] = Array.from(pathsByDir.entries()).map(([dirKey, trackPaths]) => {
    const coverUrl = args.dirCoverUrlByDir[dirKey] ?? null;

    return {
      key: `dir:${dirKey}`,
      kind: "dir",
      albumTitle: null,
      albumArtist: null,
      dirKey,
      trackPaths,
      cover: coverUrl ? {type: "dir", url: coverUrl} : {type: "none", url: null},
    };
  });

  albums.sort((a, b) => a.dirKey.localeCompare(b.dirKey, "ja"));
  return albums;
};
