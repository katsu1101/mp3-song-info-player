// src/lib/playlist/priority.ts

import {TrackView} from "@/types/views";

export type PlaylistInfoLike = { upcomingPaths: string[] };

export const getNowPlayingPath = (
  trackViews: readonly TrackView[],
  nowPlayingID: number | null
): string | null => {
  if (!nowPlayingID) return null;
  const found = trackViews.find((t) => t.item.id === nowPlayingID);
  return found?.item.path ?? null;
};

const rotateFrom = (paths: readonly string[], startPath: string): string[] => {
  const index = paths.indexOf(startPath);
  if (index < 0) return [...paths];
  return [...paths.slice(index), ...paths.slice(0, index)];
};

/**
 * 優先取得順を決める。
 * 1) playlistInfo.upcomingPaths があればそれを優先（nowPlayingPathを先頭に寄せる）
 * 2) 無ければ、表示順 paths を nowPlayingPath から回す
 * 3) nowPlayingPath も無ければ表示順のまま
 */
export const buildPriorityPaths = (
  orderedPaths: readonly string[],
  nowPlayingPath: string | null,
  playlistInfo?: PlaylistInfoLike | null
): string[] => {
  // playlistInfo があれば優先
  const upcoming = playlistInfo?.upcomingPaths ?? [];
  if (upcoming.length > 0) {
    const head = nowPlayingPath ? [nowPlayingPath] : [];
    const tail = upcoming.filter((p) => p !== nowPlayingPath);
    return [...head, ...tail];
  }

  // フォールバック: 表示順を nowPlaying から回す
  if (nowPlayingPath) return rotateFrom(orderedPaths, nowPlayingPath);

  // それも無ければ表示順
  return [...orderedPaths];
};
