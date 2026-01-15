// src/types/albumView.ts
import type {TrackView} from "@/types/views";

export type AlbumTrackRow = {
  t: TrackView;
  index: number; // trackViews全体での index（playAtIndex用）
};

export type DirAlbumView = {
  key: string;        // 例: dir:<dirKey>
  dirPath: string;
  title: string;
  trackCount: number;
  coverUrl: string | null;
  tracks: readonly AlbumTrackRow[];
};
