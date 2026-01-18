// src/types/artworks.ts

/**
 * UI用のカバーURL（objectURL）を管理する構造体
 * - MP3タグの埋め込み画像（picture）とは別物
 * @deprecated Artworks は廃止予定。artworkByPath を直接使う。
 */
export type Artworks = {
  artworkUrlByPath: Record<string, string | null>;
  /**
   * @deprecated フォルダ代表ジャケットは最終的に artworkUrlByPath に展開して保持する方針。
   * 移行完了後、この dirArtworkUrlByDir（state/props/型）は削除する。
   */
  dirArtworkUrlByDir: Record<string, string | null>;
};
