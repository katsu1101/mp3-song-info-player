import type {Mp3Entry} from "@/features/mp3/types/mp3Entry";

/**
 * ユーザーインターフェースに表示されるトラックとその関連メタデータを表示するためのビューモデルを表します。
 *
 * このタイプは、楽曲に関するデータをカプセル化するために使用され、そのタイトル、アーティスト、アートワーク、歌詞、アルバム情報、
 * トラック/ディスク番号の詳細を含みます。
 *
 * プロパティ:
 * @property {Mp3Entry} item - トラックファイルとそのメタデータを表すMP3エントリオブジェクト。
 * @property {string} displayTitle - 表示されるトラックのタイトル。
 * @property {string | null} originalArtist - オリジナルアーティスト名（利用可能な場合）。それ以外の場合はnull。
 * @property {string | null} artworkUrl - トラックに関連付けられたアートワークのURL。
 * @property {string | null} trackNoRaw - 生のトラック番号文字列（例: "1/12"）。
 * @property {string | null} discNoRaw - 生のディスク番号文字列（例: "1/2"）。
 * @property {string | null} [lyrics] - トラックの非同期歌詞（USLT）。利用可能な場合。
 * @property {string | null} [lyricsLrc] - トラックの同期歌詞（SYLT）。利用可能な場合（LRC相当）。
 * @property {string | null} albumTitle - トラックが属するアルバムのタイトル（利用可能な場合）。
 */
export type TrackView = {
  item: Mp3Entry;
  displayTitle: string;

  originalArtist: string | null; // ✅ アーティスト優先、無ければ原曲

  artworkUrl: string | null;

  trackNoRaw: string | null; // "1/12"
  discNoRaw: string | null;  // "1/2"

  lyrics?: string | null;     // USLT（非同期歌詞）
  lyricsLrc?: string | null;  // SYLT（同期/LRC相当が取れた場合）

  albumTitle: string | null;
};
