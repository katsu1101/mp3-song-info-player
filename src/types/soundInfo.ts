// src/types/soundInfo.ts
export type SoundInfoV1 = {
  schemaVersion: 1;

  title?: string;
  artist?: string;

  albumTitle?: string;
  albumArtist?: string;

  discNo?: number;
  trackNo?: number;

  artworkFileName?: string; // 同フォルダ画像ファイル名
}