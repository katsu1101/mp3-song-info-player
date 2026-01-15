// src/types/albumView.ts
import type {TrackView} from "@/types/views";

export type AlbumTrackRow = { t: TrackView; index: number };

export type DirAlbumView = {
  key: string;
  dirPath: string;
  title: string;
  trackCount: number;
  coverUrl: string | null;
  tracks: AlbumTrackRow[];
};
