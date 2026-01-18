// src/lib/mp3/album/buildAlbumViewsFantiaFirst.ts
import {UI_TEXT}                             from "@/const/text";
import {type AlbumTrackRow, sortAlbumTracks} from "@/features/mp3/lib/album/sortAlbumTracks";
import {AlbumView}                           from "@/features/mp3/types/albumView";
import {getDirname}                          from "@/lib/path";
import type {TrackView}                      from "@/types/views";

export type BuildAlbumViewsFantiaFirstArgs = {
  trackViews: readonly TrackView[];
  folderName: string;
  dirCoverUrlByDir: Record<string, string | null>;
};

type GroupKind = "fantia" | "dir" | "tag";
type GroupKey = string;

const groupOrder: Record<GroupKind, number> = {
  fantia: 0,
  tag: 1,
  dir: 2,
};

export const buildAlbumViewsFantiaFirst = (args: BuildAlbumViewsFantiaFirstArgs): AlbumView[] => {
  const {trackViews, folderName, dirCoverUrlByDir} = args;
  if (trackViews.length === 0) return [];

  // 1) trackViews -> AlbumTrackRow にしておく（indexは元リスト順）
  const rows: AlbumTrackRow[] = trackViews.map((t, index) => ({t, index}));

  // 2) Fantia(releaseYm) がある曲は Fantiaグループへ、それ以外はフォルダグループへ
  const groupRows = new Map<GroupKey, { kind: GroupKind; title: string; dirKey: string; rows: AlbumTrackRow[] }>();

  for (const row of rows) {
    // 2) mp3tag(albumTitle) がある曲は tagグループへ
    const albumTitle = row.t.albumTitle?.replace(/\u0000/g, "").replace(/\s+/g, " ").trim() ?? "";
    if (albumTitle.length > 0) {
      const key = `tag:${albumTitle.toLowerCase()}`;
      const hit = groupRows.get(key);
      if (hit) {
        hit.rows.push(row);
      } else {
        groupRows.set(key, {kind: "tag", title: albumTitle, dirKey: "", rows: [row]});
      }
      continue;
    }

    // 3) それ以外はフォルダグループへ
    const dirKey = getDirname(row.t.item.path); // "" は直下
    const title = dirKey.length > 0 ? dirKey : `${folderName}${UI_TEXT.ROOT_DIR_SUFFIX}`;
    const key = `dir:${dirKey}`;

    const hit = groupRows.get(key);
    if (hit) {
      hit.rows.push(row);
    } else {
      groupRows.set(key, {kind: "dir", title, dirKey, rows: [row]});
    }
  }

  // 3) DirAlbumView 化
  const views: AlbumView[] = [];

  for (const g of groupRows.values()) {
    const tracks = sortAlbumTracks(g.rows);
    const coverUrl =
      (g.kind === "dir" ? (dirCoverUrlByDir[g.dirKey] ?? null) : null)
      ?? tracks[0]?.t.coverUrl
      ?? null;

    views.push({
      key: `${g.kind}:${g.title}`,
      kind: g.kind,
      dirPath: g.dirKey,
      title: g.title,
      trackCount: tracks.length,
      coverUrl,
      tracks,
    });
  }

  // 4) 並び順：Fantia → フォルダ、同種内はタイトル昇順
  views.sort((a, b) => {
    const kindA: GroupKind =
      a.key.startsWith("fantia:") ? "fantia" : a.key.startsWith("tag:") ? "tag" : "dir";
    const kindB: GroupKind =
      b.key.startsWith("fantia:") ? "fantia" : b.key.startsWith("tag:") ? "tag" : "dir";

    const diff = groupOrder[kindA] - groupOrder[kindB];
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "ja");
  });

  return views;
};
