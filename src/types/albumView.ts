// src/types/albumView.ts
import type {TrackView} from "@/types/views";

export type AlbumKind =
  | "fantia"
  | "tag"
  | "dir"
  | "albumArtist" // TODO
  | "artist"      // TODO
  | "misc";

export type AlbumTrackRow = { t: TrackView; index: number };

export type AlbumView = {
  key: string;          // "fantia:..." / "tag:..." / ...
  dirPath: string | null; // dirのときだけ使う。それ以外はnull
  kind: AlbumKind;      // 並び順・表示分岐に使う
  title: string;
  trackCount: number;
  coverUrl: string | null;
  tracks: AlbumTrackRow[];
};
