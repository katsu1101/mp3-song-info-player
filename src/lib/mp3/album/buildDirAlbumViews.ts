// src/lib/mp3/album/buildDirAlbumViews.ts
import {sortAlbumTracks}   from "@/lib/mp3/album/sortAlbumTracks";
import type {AlbumInfo}    from "@/types/album";
import type {DirAlbumView} from "@/types/albumView";
import type {TrackView}    from "@/types/views";

export type BuildDirAlbumViewsArgs = {
  albums: readonly AlbumInfo[];
  trackViews: readonly TrackView[];
  folderName: string;
};

export const buildDirAlbumViews = (args: BuildDirAlbumViewsArgs): DirAlbumView[] => {
  const {albums, trackViews, folderName} = args;

  const trackViewByPath = new Map(trackViews.map((t, index) => [t.item.path, {t, index} as const]));

  const views: DirAlbumView[] = albums.map((album) => {
    const rows = album.trackPaths
      .map((path) => trackViewByPath.get(path))
      .filter((v): v is { t: TrackView; index: number } => Boolean(v));

    const tracks = sortAlbumTracks(rows);

    const title = album.dirKey.length > 0 ? album.dirKey : `${folderName}（直下）`; // TODO: 定数化
    const coverUrl = album.cover.url;

    return {
      key: album.key,
      dirPath: album.dirKey,
      title,
      trackCount: tracks.length,
      coverUrl,
      tracks,
    };
  });

  views.sort((a, b) => a.title.localeCompare(b.title, "ja"));
  return views;
};
