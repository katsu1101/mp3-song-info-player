// src/lib/mp3/album/buildDirAlbumViews.ts
import {UI_TEXT}                             from "@/const/uiText";
import {type AlbumTrackRow, sortAlbumTracks} from "@/lib/mp3/album/sortAlbumTracks";
import type {AlbumInfo}                      from "@/types/albumInfo";
import type {DirAlbumView}                   from "@/types/albumView";
import type {TrackView}                      from "@/types/views";

export type BuildDirAlbumViewsArgs = {
  albums: readonly AlbumInfo[] | null | undefined;
  trackViews: readonly TrackView[];
  folderName: string;
};

export const buildDirAlbumViews = (args: BuildDirAlbumViewsArgs): DirAlbumView[] => {
  const {albums, trackViews, folderName} = args;

  if (!albums || albums.length === 0) return [];

  // path -> {t,index}
  const rowByPath = new Map<string, AlbumTrackRow>();
  trackViews.forEach((t, index) => rowByPath.set(t.item.path, {t, index}));

  const views: DirAlbumView[] = albums.map((album) => {
    const rows = album.trackPaths
      .map((p) => rowByPath.get(p))
      .filter((v): v is AlbumTrackRow => Boolean(v));

    const tracks = sortAlbumTracks(rows);

    const title =
      album.dirKey.length > 0
        ? album.dirKey
        : `${folderName}${UI_TEXT.ROOT_DIR_SUFFIX}`;

    const coverUrl =
      tracks[0]?.t.coverUrl
      ?? album.dirCoverUrl
      ?? null;

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