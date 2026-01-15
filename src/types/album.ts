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
  key: string;              // 例: "dir:<dirKey>"
  kind: AlbumKind;          // 今は "dir" 固定（後で "tag" 等を追加）
  dirKey: string;           // getDirname(path) の結果（直下は ""）
  trackPaths: string[];     // ✅ TrackViewを避けるため path だけ
  dirCoverUrl: string | null; // フォルダ代表（速い暫定）
};