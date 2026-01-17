// src/types/covers.ts

/**
 * UI用のカバーURL（objectURL）を管理する構造体
 * - MP3タグの埋め込み画像（picture）とは別物
 * @deprecated Covers は廃止予定。coverByPath を直接使う。
 */
export type Covers = {
  coverUrlByPath: Record<string, string | null>;
  /**
   * @deprecated フォルダ代表ジャケットは最終的に coverUrlByPath に展開して保持する方針。
   * 移行完了後、この dirCoverUrlByDir（state/props/型）は削除する。
   */
  dirCoverUrlByDir: Record<string, string | null>;
};
