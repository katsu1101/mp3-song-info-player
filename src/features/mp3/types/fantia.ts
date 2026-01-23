/**
 * Fantiaマッピング行の入力構造を表します。
 */
export type FantiaMappingRow = {
  /** ファイル名先頭の8桁hex（空もあり得る） */
  prefixId: string | null;
  /** アルバム名 */
  albumTitle: string;
  /** トラックNo. */
  track: number; // 10, 40, 111 など
  /** 曲名 */
  title: string;
  /** 原曲アーティスト（任意。空ならnull） */
  originalArtist: string | null;
};

