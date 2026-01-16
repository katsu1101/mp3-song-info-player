import {Mp3Tag}                     from "@/types";
import {IAudioMetadata, ILyricsTag} from "music-metadata";

const looksLikeSjisMojibake = (text: string): boolean => {
  // 0x80-0xFFが多いのに日本語がほぼ無い → Shift-JISバイト列が文字化けしてる疑い
  const hasHigh = /[\u0080-\u00FF]/.test(text);
  const hasJapanese = /[\u3040-\u30FF\u3400-\u9FFF]/.test(text);
  return hasHigh && !hasJapanese;
};

const decodeFromLatin1Bytes = (text: string, encoding: "shift_jis" | "utf-8"): string => {
  const bytes = new Uint8Array([...text].map((ch) => ch.charCodeAt(0) & 0xff));
  return new TextDecoder(encoding, {fatal: false}).decode(bytes);
};

const repairSjisIfNeeded = (text: string): string => {
  const trimmed = text.replace(/\u0000/g, "").trim();
  if (trimmed.length === 0) return trimmed;
  if (!looksLikeSjisMojibake(trimmed)) return trimmed;

  // まず shift_jis を試す。ダメなら utf-8 も一応試す（保険）
  try {
    const sjis = decodeFromLatin1Bytes(trimmed, "shift_jis").trim();
    if (sjis) return sjis;
  } catch {
    // ignore
  }
  try {
    const utf8 = decodeFromLatin1Bytes(trimmed, "utf-8").trim();
    if (utf8) return utf8;
  } catch {
    // ignore
  }
  return trimmed;
};

type LyricsLike =
  | string
  | ILyricsTag
  | Array<string | ILyricsTag>
  | undefined;

const toLyricsText = (value: LyricsLike): string | undefined => {
  if (!value) return undefined;

  // 配列なら先頭から有効なものを拾う
  if (Array.isArray(value)) {
    for (const v of value) {
      const text = toLyricsText(v);
      if (text) return text;
    }
    return undefined;
  }

  // 文字列ならそのまま
  if (typeof value === "string") return value;

  // ILyricsTag（想定）: text を優先
  // TODO: ILyricsTag の実型に合わせてフィールド名を追加（lyrics / value / data など）
  const maybeText = value.text;
  if (typeof maybeText === "string" && maybeText.trim().length > 0) return maybeText;

  return undefined;
};
const normalizeLyrics = (value: string | undefined): string | null => {
  if (!value) return null;

  const normalized = value
    .replace(/\r\n?/g, "\n")
    .trim();

  return normalized.length > 0 ? normalized : null;
};

const pickNativeText = (ids: string[], metadata: IAudioMetadata): string | null => {
  const native = (metadata as IAudioMetadata).native as
    | Record<string, Array<{ id: string; value: unknown }>>
    | undefined;
  if (!native) return null;

  const tagTypePriority = ["ID3v2.3", "ID3v2.4", "ID3v2.2", "ID3v1"];

  for (const tagType of tagTypePriority) {
    const tags = native[tagType];
    if (!tags) continue;

    for (const id of ids) {
      const found = tags.find((t) => t.id === id);
      if (!found) continue;

      const value = found.value;

      if (typeof value === "string") {
        const fixed = repairSjisIfNeeded(value);
        if (fixed) return fixed;
      }

      if (Array.isArray(value)) {
        const first = value.find((v) => typeof v === "string" && v.trim());
        if (typeof first === "string") {
          const fixed = repairSjisIfNeeded(first);
          if (fixed) return fixed;
        }
      }
    }
  }
  return null;
};

export const readMp3Meta = async (file: File): Promise<Mp3Tag> => {
  // ブラウザ側でだけ読み込ませる（SSRの巻き込みを避ける）
  const {parseBlob} = await import("music-metadata");

  const metadata = await parseBlob(file, {duration: false});
  const common = metadata.common;

  const firstPicture = common.picture?.[0];

  // ✅ common.lyrics は string[] だったりするので最初を拾う
  const commonLyrics = Array.isArray(common.lyrics) ? common.lyrics[0] : undefined;

  const lyricsRaw =
    pickNativeText(["USLT", "ULT"], metadata)
    ?? commonLyrics
    ?? undefined;

  const lyricsLrcRaw =
    pickNativeText(["SYLT", "SLT"], metadata)
    ?? undefined;

  return {
    title: pickNativeText(["TIT2", "TT2"], metadata) ?? common.title ?? null,
    artist: pickNativeText(["TPE1", "TP1"], metadata) ?? (common.artist ?? common.artists?.join(", ") ?? null),
    album: pickNativeText(["TALB", "TAL"], metadata) ?? common.album ?? null,
    trackNo: common.track?.no ?? null,
    year: common.year ?? null,
    picture: firstPicture
      ? {data: firstPicture.data, format: firstPicture.format}
      : null,
    lyrics: normalizeLyrics(toLyricsText(lyricsRaw)),
    lyricsLrc: normalizeLyrics(toLyricsText(lyricsLrcRaw)),
    albumArtist: null,
    discNo: null,
    diskNo: null,
  };
};
