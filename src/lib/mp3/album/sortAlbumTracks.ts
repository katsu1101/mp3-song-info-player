// src/lib/mp3/album/sortAlbumTracks.ts
import {getBasename}    from "@/lib/path/getBasename";
import type {TrackView} from "@/types/views";

export type AlbumTrackRow = { t: TrackView; index: number };

const parseIndexOfTotal = (raw: unknown): number | null => {
  if (raw == null) return null;

  // ✅ number が来たらそのまま使う（1, 2, 3...）
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  // ✅ string 以外は捨てる
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // "1/12" の "1" を取る
  const first = trimmed.split("/")[0]?.trim() ?? "";
  if (!/^\d+$/.test(first)) return null;

  const n = Number(first);
  return Number.isFinite(n) ? n : null;
};


/**
 * 混在時の優先順位:
 * ① Fantia（releaseYm）
 * ② mp3tag（discNoRaw → trackNoRaw）
 * ③ fileName
 */
const getSortRank = (t: TrackView): 0 | 1 | 2 => {

  const discNo = parseIndexOfTotal(t.discNoRaw);
  const trackNo = parseIndexOfTotal(t.trackNoRaw);

  if (discNo != null || trackNo != null) return 1;
  return 2;
};

export const sortAlbumTracks = (rows: readonly AlbumTrackRow[]): AlbumTrackRow[] => {
  return [...rows].sort((a, b) => {

    const aRank = getSortRank(a.t);
    const bRank = getSortRank(b.t);

    // ✅ 混在時は必ず分離: Fantia → mp3tag → fileName
    if (aRank !== bRank) return aRank - bRank;

    // --- ① Fantia: releaseYm ---
    if (aRank === 0) {
      const aYm = getSortRank(a.t);
      const bYm = getSortRank(b.t);

      // releaseYm無しは末尾
      if (aYm != null && bYm != null && aYm !== bYm) return aYm - bYm;
      if ((aYm != null) !== (bYm != null)) return aYm != null ? -1 : 1;

      return a.index - b.index; // 安定化（元順）
    }

    // --- ② mp3tag: disc → track ---
    if (aRank === 1) {
      // disc は未設定なら 1 扱い（一般的）
      const aDisc = parseIndexOfTotal(a.t.discNoRaw) ?? 1;
      const bDisc = parseIndexOfTotal(b.t.discNoRaw) ?? 1;
      if (aDisc !== bDisc) return aDisc - bDisc;

      // track は無ければ末尾
      const aNo = parseIndexOfTotal(a.t.trackNoRaw);
      const bNo = parseIndexOfTotal(b.t.trackNoRaw);

      if (aNo != null && bNo != null && aNo !== bNo) return aNo - bNo;
      if ((aNo != null) !== (bNo != null)) return aNo != null ? -1 : 1;

      return a.index - b.index; // 安定化
    }

    // --- ③ fileName ---
    const aName = getBasename(a.t.item.path).toLowerCase();
    const bName = getBasename(b.t.item.path).toLowerCase();

    const byName = aName.localeCompare(bName, "ja");
    if (byName !== 0) return byName;

    return a.index - b.index; // 安定化
  });
};

