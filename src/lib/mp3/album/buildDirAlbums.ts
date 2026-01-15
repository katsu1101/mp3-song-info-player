// src/lib/mp3/album/buildDirAlbums.ts
import {sortAlbumTracks}   from "@/lib/mp3/album/sortAlbumTracks";
import {getDirname}        from "@/lib/path/getDirname";
import type {DirAlbumView} from "@/types/albumView";
import type {TrackView}    from "@/types/views";

// Page内の { t, index } 型と一致させる
type AlbumTrackRow = { t: TrackView; index: number };

export const buildDirAlbums = (args: {
  trackViews: readonly TrackView[];
  folderName: string;
}): DirAlbumView[] => {
  const {trackViews, folderName} = args;

  const rowsByDir = new Map<string, AlbumTrackRow[]>();

  trackViews.forEach((t, index) => {
    const dirPath = getDirname(t.item.path);
    const rows = rowsByDir.get(dirPath) ?? [];
    rows.push({t, index});
    rowsByDir.set(dirPath, rows);
  });

  const albums: DirAlbumView[] = Array.from(rowsByDir.entries()).map(([dirPath, rows]) => {
    const tracks = sortAlbumTracks(rows);

    // TODO: 表示文言の定数化（後で）
    const title = dirPath.length > 0 ? dirPath : `${folderName}（直下）`;
    const coverUrl = tracks[0]?.t.coverUrl ?? null;

    return {
      key: `dir:${dirPath}`,
      dirPath,
      title,
      trackCount: tracks.length,
      coverUrl,
      tracks,
    };
  });

  albums.sort((a, b) => a.title.localeCompare(b.title, "ja"));
  return albums;
};
