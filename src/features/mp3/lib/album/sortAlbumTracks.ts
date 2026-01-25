// src/lib/mp3/album/sortAlbumTracks.ts
import {getBasename}    from "@/lib/path/getBasename";
import type {TrackView} from "@/types/views";

export type AlbumTrackRow = { t: TrackView; index: number };

/**
 * 入力文字列を解析し、「index/total」形式の文字列から数値インデックスを抽出します。
 *
 * この関数は、文字列の最初の部分を「index/total」形式（例: 「3/10」→ 3）で正規化して抽出しようと試みます。
 * 解析に失敗した場合、または入力が無効な場合、`null`が返されます。
 *
 * 動作:
 * - 入力が `null` または `undefined` の場合、`null` を返します。
 * - 入力が数値の場合、検証を行い有限値であればその数値を返す。それ以外の場合は`null`を返す。
 * - 入力が文字列または数値でない場合、`null`を返す。
 * - 入力が文字列の場合、空白をトリムし「/」で分割し、最初の数値部分を解析して返す。
 *   無効または非数値の文字列は`null`を返す。
 */
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

/**
 * 特定の基準に基づいて`AlbumTrackRow`オブジェクトの配列をソートします。
 *
 * ソートロジックには複数のレベルのソートルールが含まれます：
 * 1. **ソースによる分離**：トラックはソース順にグループ化されソートされます：
 *    Fantia → mp3tag → ファイル名。
 * 2. **Fantiaソート**: Fantiaトラックはリリース年と月（`releaseYm`）でソートされます：
 *    - `releaseYm`がないトラックは末尾に配置されます。
 *    - `releaseYm`が等しい場合、安定性のため元の順序（`index`）が保持されます。
 * 3. **mp3tagソート**：
 *    - `disc`（指定なし時はデフォルト1）でソート後、`track`（トラック番号なしは末尾配置）でソート。
 *    - 同一値時は安定性のため元の順序（`index`）を保持。
 * 4. **ファイル名によるソート**: トラックはファイル名の大文字小文字を区別しない順でソートされます。
 *    - 同一順位のトラックについては、安定性を確保するため元の順序（`index`）が保持されます。
 *
 * @param {readonly AlbumTrackRow[]} rows - ソート対象の`AlbumTrackRow`オブジェクトの配列。この入力配列は変更されません。
 * @returns {AlbumTrackRow[]} 指定された基準に従ってソートされた新しい`AlbumTrackRow`オブジェクトの配列。
 */
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

