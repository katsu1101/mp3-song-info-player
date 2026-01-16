import type {Mp3Entry} from "@/types/mp3Entry";

/**
 * トラックとその関連メタデータを表示するためのビューモデルを表します。
 */
export type TrackView = {
  item: Mp3Entry;
  displayTitle: string;

  orderLabel: string;            // ✅ アルバム/順 or 年月/順（最終表示）
  originalArtist: string | null; // ✅ アーティスト優先、無ければ原曲

  coverUrl: string | null;

  trackNoRaw: string | null; // "1/12"
  discNoRaw: string | null;  // "1/2"
  releaseYm: string | null;

  lyrics?: string | null;     // USLT（非同期歌詞）
  lyricsLrc?: string | null;  // SYLT（同期/LRC相当が取れた場合）
};
