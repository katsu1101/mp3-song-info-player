"use client";

import {FANTIA_MAPPING}         from "@/features/mp3/const/fantia-mapping";
import {FantiaMappingRow}       from "@/features/mp3/types/fantia";
import {parseFantiaMappingText} from "@/lib/mapping/parseFantiaMapping";

/**
 * Fantiaのマッピングデータを処理するための状態と機能を提供するカスタムフック。
 *
 * このフックは、Fantiaのマッピングエントリとその関連状態の読み込み、管理、およびアクセス提供を担当します。
 * マッピングデータを非同期で取得し、プロセス中のエラーを処理し、迅速な検索のためのプレフィックスIDによるマッピングを公開します。
 *
 * @returns {ReadonlyMap<string, FantiaMappingRow>} Fantia マッピングエントリの配列。
 */
export const useFantiaMapping = (): ReadonlyMap<string, FantiaMappingRow> => {
  const map = new Map<string, FantiaMappingRow>();
  for (const entry of parseFantiaMappingText(FANTIA_MAPPING)) {
    if (!entry.prefixId) continue;
    map.set(entry.prefixId.toLowerCase(), entry);
  }
  return map;
};
