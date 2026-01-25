// src/features/mp3/lib/lyrics/lyricsText.ts

/**
 * 提供された歌詞テキストを正規化します。具体的には、バイト順マーク（BOM）を削除し、改行文字をUNIX形式の改行（`\n`）に統一します。
 *
 * @param {string} text - 正規化する入力歌詞テキスト。
 * @returns {string} BOMが除去され、改行コードが統一された正規化済み歌詞テキスト。
 */
export const normalizeLyricsText = (text: string): string => {
  // BOM除去 + 改行統一（trimはここではしない派でもOK）
  const withoutBom = text.replace(/^\uFEFF/, "");
  return withoutBom.replace(/\r\n?/g, "\n");
};

/**
 * 指定された文字列が意味のあるテキストを含むかどうかを判定します。
 * 文字列が意味のあるテキストを含むとみなされるのは、null、undefinedでない場合、または空白文字のみで構成されていない場合です。
 *
 * @param {string | null | undefined} value - チェック対象の入力値。
 * @returns {boolean} 入力に意味のあるテキストが含まれる場合 true、それ以外の場合 false。
 */
export const hasMeaningfulText = (value: string | null | undefined): boolean => {
  if (value == null) return false;
  return value.trim().length > 0;
};

// 外部テキスト用：UTF-8優先、ダメなら Shift_JIS
export const decodeTextFileBytes = (bytes: ArrayBuffer): string => {
  const u8 = new Uint8Array(bytes);

  // UTF-8をfatalで試す（失敗したら例外）
  try {
    return new TextDecoder("utf-8", {fatal: true}).decode(u8);
  } catch {
    // ignore
  }

  // ブラウザによっては shift_jis が使える（多くはOK）
  try {
    return new TextDecoder("shift_jis", {fatal: false}).decode(u8);
  } catch {
    // 最後の保険：fatal=false UTF-8
    return new TextDecoder("utf-8", {fatal: false}).decode(u8);
  }
};
