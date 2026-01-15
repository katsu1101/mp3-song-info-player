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


const parseReleaseYm = (ym: string | null | undefined): number | null => {
  if (!ym) return null;

  // 例: "2022-11", "2022/11", "2022/11/01", "2022/11 / 01" など
  const m = ym.match(/(\d{4})\D+(\d{1,2})/);

  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;

  return year * 100 + month; // 202211
};

const isFantiaTrack = (t: TrackView): boolean => {
  return Boolean(t.releaseYm);
};

/**
 * 混在時の優先順位:
 * ① Fantia（releaseYm）
 * ② mp3tag（discNoRaw → trackNoRaw）
 * ③ fileName
 */
const getSortRank = (t: TrackView): 0 | 1 | 2 => {
  if (isFantiaTrack(t)) return 0;

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
      const aYm = parseReleaseYm(a.t.releaseYm);
      const bYm = parseReleaseYm(b.t.releaseYm);

      // releaseYm無しは末尾
      if (aYm != null && bYm != null && aYm !== bYm) return aYm - bYm; // 新しい順なら bYm - aYm
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
