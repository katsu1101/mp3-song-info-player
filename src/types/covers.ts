// src/types/covers.ts

/**
 * UI用のカバーURL（objectURL）を管理する構造体
 * - MP3タグの埋め込み画像（picture）とは別物
 */
export type Covers = {
  coverUrlByPath: Record<string, string | null>;
  dirCoverUrlByDir: Record<string, string | null>;
};
