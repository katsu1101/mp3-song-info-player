// src/types/album.ts

export type AlbumKey = string;

export type AlbumKind =
  | "dir"               // フォルダ仮想アルバム
// TODO | "tag"               // タグ由来アルバム（後で）
// TODO | "artist-unclassified"
// TODO | "none";

export type AlbumCover =
  | { type: "dir"; url: string | null }
  // TODO | { type: "embedded"; url: string | null }
  | { type: "none"; url: null };


export type AlbumCoverType =
  | "embedded"
  | "dir"
  | "none";

export type AlbumInfo = {
  key: AlbumKey;

  kind: AlbumKind;

  // tag由来（将来用）
  albumTitle: string | null;
  albumArtist: string | null;

  // dir由来（将来用）
  dirKey: string;          // ✅ フォルダ仮想アルバムのキー;

  // ✅ 代表画像（暫定含む）
  cover: AlbumCover;

  // ✅ 依存を減らすため TrackView ではなく path だけ
  trackPaths: string[];    // ✅ TrackView依存を避けるため path で持つ
};
