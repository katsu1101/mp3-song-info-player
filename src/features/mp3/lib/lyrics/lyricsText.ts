// src/features/mp3/lib/lyrics/lyricsText.ts

export const normalizeLyricsText = (text: string): string => {
  // BOM除去 + 改行統一（trimはここではしない派でもOK）
  const withoutBom = text.replace(/^\uFEFF/, "");
  return withoutBom.replace(/\r\n?/g, "\n");
};

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
