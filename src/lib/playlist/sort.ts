import {extractPrefixIdFromPath} from "@/lib/mapping/extractPrefixId";
import type {Mp3Entry}           from "@/types";
import type {FantiaMappingEntry} from "@/types/mapping";

export type SortKey = {
  hasMapping: boolean;
  releaseKey: number;        // YYYYMM
  withinMonthIndex: number;  // 1,2...
  fallbackPath: string;
};

export const buildSortKey = (
  item: Mp3Entry,
  mappingByPrefixId: ReadonlyMap<string, FantiaMappingEntry>
): SortKey => {
  const prefixId = extractPrefixIdFromPath(item.path);
  const mapping = prefixId ? mappingByPrefixId.get(prefixId) : undefined;

  if (!mapping) {
    return {
      hasMapping: false,
      releaseKey: 999999,
      withinMonthIndex: 9999,
      fallbackPath: item.path,
    };
  }

  const releaseKey = mapping.year * 100 + mapping.month;

  return {
    hasMapping: true,
    releaseKey,
    withinMonthIndex: mapping.withinMonthIndex,
    fallbackPath: item.path,
  };
};

export const compareSortKey = (a: SortKey, b: SortKey): number => {
  if (a.hasMapping !== b.hasMapping) return a.hasMapping ? -1 : 1;
  if (a.releaseKey !== b.releaseKey) return a.releaseKey - b.releaseKey;
  if (a.withinMonthIndex !== b.withinMonthIndex) return a.withinMonthIndex - b.withinMonthIndex;
  return a.fallbackPath.localeCompare(b.fallbackPath, "ja");
};
