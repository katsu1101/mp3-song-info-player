export type FantiaMappingRowInput = {
  /** ファイル名先頭の8桁hex（空もあり得る） */
  prefixId: string | null;
  /** "YYYY/MM" or "YYYY-MM" 想定 */
  releaseYm: string;
  /** 曲名 */
  title: string;
  /** 原曲アーティスト（任意。空ならnull） */
  originalArtist: string | null;
};

export type FantiaMappingEntry = FantiaMappingRowInput & {
  year: number;   // 例: 2024
  month: number;  // 1..12
  /** 同月に複数曲ある場合の連番（1..） */
  withinMonthIndex: number;
  /**
   * 並び安定用のトラック番号（おすすめルール）
   * track = month*10 + withinMonthIndex
   * 例: 9月1曲目=91, 9月2曲目=92
   */
  track: number;
};
