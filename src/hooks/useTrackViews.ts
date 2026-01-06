import {extractPrefixIdFromPath}      from "@/lib/mapping/extractPrefixId";
import {buildReleaseOrderLabel}       from "@/lib/playlist/label";
import {buildSortKey, compareSortKey} from "@/lib/playlist/sort";
import type {Mp3Entry}                from "@/types";
import type {FantiaMappingEntry}      from "@/types/mapping";
import {useMemo}                      from "react";

export type TrackView = {
  item: Mp3Entry;
  index: number;                 // ソート後のindex
  displayTitle: string;          // mapping優先、なければタグ、なければ(曲名なし)
  releaseOrder: string;          // "YYYY/MM / 01" or "年月不明"
  originalArtist: string | null; // mapping由来
  coverUrl: string | null;
};

type UseTrackViewsArgs = {
  mp3List: Mp3Entry[];
  titleByPath: Record<string, string | null | undefined>;
  coverUrlByPath: Record<string, string | null | undefined>;
  mappingByPrefixId: ReadonlyMap<string, FantiaMappingEntry>;
};

export const useTrackViews = (args: UseTrackViewsArgs): TrackView[] => {
  const {mp3List, titleByPath, coverUrlByPath, mappingByPrefixId} = args;

  return useMemo(() => {
    const decorated = mp3List.map((item, originalIndex) => {
      const key = buildSortKey(item, mappingByPrefixId);
      return {item, key, originalIndex};
    });

    decorated.sort((a, b) => {
      const diff = compareSortKey(a.key, b.key);
      return diff !== 0 ? diff : a.originalIndex - b.originalIndex;
    });

    return decorated.map(({item}, index) => {
      const tagTitle = titleByPath[item.path] ?? null;

      const prefixId = extractPrefixIdFromPath(item.path);
      const mapping = prefixId ? mappingByPrefixId.get(prefixId) : undefined;

      const displayTitle = mapping?.title ?? tagTitle ?? "（曲名なし）";
      const releaseOrder = buildReleaseOrderLabel(mapping) ?? "年月不明";

      const coverUrl = coverUrlByPath[item.path] ?? null;

      return {
        item,
        index,
        displayTitle,
        releaseOrder,
        originalArtist: mapping?.originalArtist ?? null,
        coverUrl,
      };
    });
  }, [mp3List, titleByPath, coverUrlByPath, mappingByPrefixId]);
};
