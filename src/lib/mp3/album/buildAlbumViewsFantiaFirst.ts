import {UI_TEXT}                             from "@/const/uiText";
import {type AlbumTrackRow, sortAlbumTracks} from "@/lib/mp3/album/sortAlbumTracks";
import {getDirname}                          from "@/lib/path/getDirname";
import {AlbumView}                           from "@/types/albumView";
import type {TrackView}                      from "@/types/views";

export type BuildAlbumViewsFantiaFirstArgs = {
  trackViews: readonly TrackView[];
  folderName: string;
  dirCoverUrlByDir: Record<string, string | null>;
};

type GroupKind = "fantia" | "dir";
type GroupKey = string;

const groupOrder: Record<GroupKind, number> = {
  fantia: 0,
  dir: 1,
};

export const buildAlbumViewsFantiaFirst = (args: BuildAlbumViewsFantiaFirstArgs): AlbumView[] => {
  const {trackViews, folderName, dirCoverUrlByDir} = args;
  if (trackViews.length === 0) return [];

  // 1) trackViews -> AlbumTrackRow にしておく（indexは元リスト順）
  const rows: AlbumTrackRow[] = trackViews.map((t, index) => ({t, index}));

  // 2) Fantia(releaseYm) がある曲は Fantiaグループへ、それ以外はフォルダグループへ
  const groupRows = new Map<GroupKey, { kind: GroupKind; title: string; dirKey: string; rows: AlbumTrackRow[] }>();

  for (const row of rows) {

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
      tracks[0]?.t.coverUrl
      ?? (g.kind === "dir" ? (dirCoverUrlByDir[g.dirKey] ?? null) : null)
      ?? null;

    views.push({
      key: `${g.kind}:${g.title}`,
      kind: "dir",
      dirPath: g.dirKey,
      title: g.title,
      trackCount: tracks.length,
      coverUrl,
      tracks,
    });
  }

  // 4) 並び順：Fantia → フォルダ、同種内はタイトル昇順
  views.sort((a, b) => {
    const kindA: GroupKind = a.key.startsWith("fantia:") ? "fantia" : "dir";
    const kindB: GroupKind = b.key.startsWith("fantia:") ? "fantia" : "dir";
    const diff = groupOrder[kindA] - groupOrder[kindB];
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "ja");
  });

  return views;
};
