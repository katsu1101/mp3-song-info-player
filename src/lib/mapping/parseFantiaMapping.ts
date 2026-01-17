import {FantiaMappingRow} from "@/features/mp3/types/fantia";

/**
 * セルの値をトリムされた文字列であることを保証してクリーンアップします。
 *
 * 指定された値が `undefined` の場合、デフォルトで空の文字列になります。
 * 値が文字列の場合、先頭と末尾の空白は削除されます。
 *
 * @param {string | undefined} value - クリーンアップ対象の入力値。
 * 文字列または `undefined` のいずれかです。
 * @returns {string} - トリミングされた文字列、または入力が `undefined` の場合は空文字列を返します。
 */
const cleanCell = (value: string | undefined): string => (value ?? "").trim();

const cleanCellN = (value: string | undefined): number => {
  if (!value) return 0;
  return Number(cleanCell(value));
}
/**
 * 単一行のテキストを、入力データの行を表す構造化オブジェクトに解析します。
 *
 * 行には特定のフィールドに対応する区切り付き列が含まれている必要があります。
 * 空行、コメント記号（`#`）で始まる行、または検証に失敗した行は無視され、`null`が返されます。
 *
 * @param {string} line - 解析対象のテキスト行。
 * @param {"\t" | ","} delimiter - 行を列に分割する区切り文字。タブ（`\t`）またはコンマ（`,`）のいずれか。
 * @returns {FantiaMappingRow | null} 解析されたフィールド（`prefixId`、`releaseYm`、`title`、`originalArtist`）を含む構造化オブジェクト。
 * 行が無効またはスキップすべき場合は`null`を返す。
 */
const parseLineToRow = (line: string, delimiter: "\t" | ","): FantiaMappingRow | null => {
  const raw = line.trim();
  if (!raw) return null;
  if (raw.startsWith("#")) return null;

  const cols = raw.split(delimiter);
  // 想定: prefixId, releaseYm, title, originalArtist
  const prefixIdRaw = cleanCell(cols[0]);
  const albumTitle = cleanCell(cols[1]);
  const track = cleanCellN(cols[2]);
  const title = cleanCell(cols[3]);
  const originalArtistRaw = cleanCell(cols[4]);

  if (!albumTitle || !title) return null;

  const prefixId = prefixIdRaw ? prefixIdRaw : null;
  const originalArtist = originalArtistRaw ? originalArtistRaw : null;

  return {prefixId, albumTitle: albumTitle, track, title, originalArtist};
};

/**
 * 指定されたテキストをFantiaMappingEntryオブジェクトの配列に解析します。
 * この関数は、入力テキストがタブ区切り(TSV)またはカンマ区切り(CSV)のデータテーブルとして構造化されていることを前提とし、
 * 最初の空でない行に基づいて区切り文字を自動的に判定します。
 *
 * 1. テキスト内の各行（「#」で始まるコメント行を除く）は、関連するデータフィールドを抽出するために解析されます。
 * 2. 形式が不正な行は無視されます。
 * 3. 同一リリース月の行については、時系列順に基づいて月内インデックスとトラック番号が自動割り当てされます。
 *
 * @param {string} text - マッピングデータを含む入力テキスト。
 * @returns {FantiaMappingRow[]} 処理済みマッピングエントリの配列。
 *                                 各エントリは正規化されたデータと割り当てられたインデックスを含む。
 */
export const parseFantiaMappingText = (text: string): FantiaMappingRow[] => {
  const lines = text.split(/\r?\n/);

  // デリミタ自動判定（最初の非空行にタブが多ければTSV）
  const firstDataLine = lines.find((l) => l.trim() && !l.trim().startsWith("#")) ?? "";
  const delimiter: "\t" | "," = firstDataLine.includes("\t") ? "\t" : ",";

  const rows: FantiaMappingRow[] = [];
  for (const line of lines) {
    const row = parseLineToRow(line, delimiter);
    if (row) rows.push(row);
  }

  return rows;
};
