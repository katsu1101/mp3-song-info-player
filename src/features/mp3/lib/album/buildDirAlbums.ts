// src/lib/mp3/album/buildDirAlbums.ts
import {AlbumInfo}     from "@/features/mp3/types/albumInfo";
import type {Mp3Entry} from "@/features/mp3/types/mp3Entry";
import {getDirname}    from "@/lib/path";

export type BuildDirAlbumsArgs = {
  mp3List: readonly Mp3Entry[];
  dirArtworkUrlByDir: Record<string, string | null>;
};

/**
 * 指定されたMP3ファイルのリストとディレクトリアートワークのURLに基づいて、アルバム情報オブジェクトの配列を構築します。
 *
 * この関数は、MP3ファイルのパス一覧を処理し、それぞれのディレクトリごとにグループ化し、各ディレクトリ用のメタデータを生成します。
 * 各アルバム情報オブジェクトには、
 * 一意のキー、ディレクトリ識別子、ディレクトリ内のトラックパスのリスト、およびオプションのアートワークURLが含まれます。
 */
export const buildDirAlbums = (args: BuildDirAlbumsArgs): AlbumInfo[] => {
  const {mp3List, dirArtworkUrlByDir} = args;

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
    const dirArtworkUrl = dirArtworkUrlByDir[dirKey] ?? null;

    return {
      key: `dir:${dirKey}`,
      kind: "dir",
      dirKey,
      trackPaths,
      dirArtworkUrl: dirArtworkUrl,
    };
  });
};
