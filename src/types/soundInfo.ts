// src/types/soundInfo.ts

/**
 * バージョン1のスキーマに従った音声ファイルのメタデータ情報を表します。
 *
 * プロパティ:
 * - `schemaVersion`: スキーマのバージョンを指定します（固定値 1）。
 * - `title`: トラックのタイトル（オプション）。
 * - `artist`: トラックを演奏したアーティスト名（オプション）。
 * - `albumTitle`: トラックを含むアルバムのタイトル（オプション）。
 * - `albumArtist`: アルバムに関連するアーティスト名（任意）。
 * - `discNo`: トラックが収録されているディスク番号（任意）。
 * - `trackNo`: アルバムまたはディスク内のトラック番号（任意）。
 * - `artworkFileName`: 音声ファイルと同じフォルダにあるアートワーク画像のファイル名（任意）。
 */
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