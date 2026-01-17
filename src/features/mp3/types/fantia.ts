/**
 * Fantiaマッピングを管理するための状態を表します。
 *
 * この型は、Fantiaシステムにおけるマッピング処理に使用される構造体と、状態管理に関連するメタデータを定義します。
 */
export type FantiaMappingState = {
  mapping: FantiaMappingRow[];
  mappingByPrefixId: ReadonlyMap<string, FantiaMappingRow>;
  error: string;
  isLoading: boolean;
};

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

