// src/types/mp3.ts
export type EmbeddedPicture = { data: Uint8Array; format: string };

/**
 * MP3ファイルのメタデータタグを表します。
 *
 * このタイプは、トラックのタイトル、アーティスト、アルバム詳細、トラックおよびディスク情報、埋め込み画像や歌詞などの追加メタデータなど、
 * MP3ファイルに一般的に関連付けられる様々な属性を定義するために使用されます。
 *
 * 対応するメタデータが利用できない場合、プロパティはnullに設定されることがあります。
 *
 * プロパティ:
 * - title: トラックのタイトル。
 * - artist: アーティスト名。
 * - album: アルバムのタイトル。
 * - albumArtist: アルバムのアーティスト名。
 * - trackNo: トラック番号（指定されている場合）。
 * - year: トラックのリリース年。
 * - picture: MP3に関連付けられた埋め込み画像（例：アルバムアート）。
 * - discNo: ディスク番号（文字列）。通常、複数枚組アルバムで使用されます。
 * - diskNo: ディスク番号の別表記（文字列）。
 * - lyrics: トラックの歌詞全文。
 * - lyricsLrc: LRC（Lyric Consumer）形式の歌詞。カラオケなどでの使用を想定し、タイムスタンプと同期されていることが多い。
 */
export type Mp3Tag = {
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArtist: string | null;
  trackNo: number | null;
  year: number | null;
  picture: EmbeddedPicture | null;
  discNo: string | null;
  diskNo: string | null;
  lyrics: string | null;
  lyricsLrc: string | null;
};
