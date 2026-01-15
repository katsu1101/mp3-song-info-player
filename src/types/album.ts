// src/types/album.ts

export type AlbumKey = string;

export type AlbumKind =
  | "tag"
  | "dir"
  | "artist-unclassified"
  | "none";

export type AlbumCoverType =
  | "embedded"
  | "dir"
  | "none";

export type AlbumCover = {
  type: AlbumCoverType;
  url: string | null; // objectURL / blobURL / dataURL など（現状の運用に合わせる）
};

export type AlbumInfo = {
  key: AlbumKey;

  kind: AlbumKind;

  // ✅ UI向けに保持（未確定なら null）
  albumTitle: string | null;
  albumArtist: string | null;

  // ✅ 仮想アルバム由来なら埋まる（dirKey=相対パスなど）
  dirKey: string | null;

  // ✅ 代表画像（暫定含む）
  cover: AlbumCover;

  // ✅ トラック所属（表示順は別途 sort で決める）
  trackPaths: string[];

  // 任意: 作成理由やデバッグのヒント
  // reason?: string;
};
