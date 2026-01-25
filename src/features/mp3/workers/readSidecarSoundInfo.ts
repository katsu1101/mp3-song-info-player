// src/features/mp3/workers/readSidecarSoundInfo.ts
import {SoundInfoV1} from "@/types/soundInfo";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripBom = (text: string): string =>
  text.startsWith("\uFEFF") ? text.slice(1) : text;

const pickNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const pickFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== "number") return undefined;
  return Number.isFinite(value) ? value : undefined;
};

const pickArtworkFileName = (obj: UnknownRecord): string | undefined => {
  // 互換の受け口（強い→弱い）
  return (
    pickNonEmptyString(obj.artworkFileName) ??
    pickNonEmptyString(obj.coverFileName) ??
    pickNonEmptyString(obj.jacketFileName) ??
    pickNonEmptyString(obj.pictureFileName) ??
    pickNonEmptyString(obj.picture)
  );
};

const normalizeToV1 = (obj: UnknownRecord): SoundInfoV1 | null => {
  const schemaVersionRaw = obj.schemaVersion;
  const schemaVersion =
    schemaVersionRaw === 1 ? 1 : undefined;

  // schemaVersion が無い古いJSONも読むならここで 1 扱いにする手もあります。
  // 今回は「仕様を明確に」するため、無い場合でも読むならコメントを外して対応してください。
  const effectiveSchemaVersion = schemaVersion ?? 1;

  // ここでは v1 として正規化
  const albumTitle =
    pickNonEmptyString(obj.albumTitle) ??
    pickNonEmptyString(obj.album);

  const discNo =
    pickFiniteNumber(obj.discNo) ??
    pickFiniteNumber(obj.diskNo);

  const trackNo =
    pickFiniteNumber(obj.trackNo);

  const result: SoundInfoV1 = {
    schemaVersion: 1,
    title: pickNonEmptyString(obj.title),
    artist: pickNonEmptyString(obj.artist),
    albumTitle,
    albumArtist: pickNonEmptyString(obj.albumArtist),
    trackNo,
    discNo,
    artworkFileName: pickArtworkFileName(obj)
  };

  // 空フィールドは undefined のままなので、そのまま返してOK
  //（呼び出し側の merge で「空欄補完」がしやすい）
  return effectiveSchemaVersion === 1 ? result : null;
};

/**
 * 指定されたファイルハンドルを使用して、ファイルから音声情報を読み取り解析します。
 *
 * この関数は以下のことを試みます：
 * 1. 指定された `FileSystemFileHandle` に関連付けられたファイルを取得します。
 * 2. ファイルの内容をテキストとして読み込み、バイトオーダーマーク（BOM）と空白を削除します。
 * 3. ファイルの内容が空または無効な場合、`null`を返します。
 * 4. テキスト内容をJSONとして解析し、期待される条件を満たしているかを判定します。
 * 5. 解析されたデータが有効な場合、正規化して`SoundInfoV1`オブジェクトとして返します。それ以外の場合は`null`を返します。
 *
 * エラーが発生した場合（例：ファイルアクセス問題、無効なJSON、型不一致）、関数はエラーをキャッチし、`null`を返します。
 * これにより、アプリケーションのクラッシュなしに安全に実行できます。
 *
 * @param {FileSystemFileHandle} handle - サウンド情報を含むファイルへのハンドル。
 * @returns {Promise<SoundInfoV1 | null>} 成功した場合、正規化された `SoundInfoV1` オブジェクトを解決するプロミスを返します。
 * ファイルが空の場合、無効な場合、または処理中にエラーが発生した場合は `null` を返します。
 */
export const readSidecarSoundInfo = async (
  handle: FileSystemFileHandle
): Promise<SoundInfoV1 | null> => {
  try {
    const file = await handle.getFile();
    const rawText = await file.text();
    const text = stripBom(rawText).trim();
    if (text === "") return null;

    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)) return null;

    return normalizeToV1(parsed);
  } catch {
    // TODO: 開発時のみ warn したいなら呼び出し側でログ（runId等の文脈付きが良い）
    return null;
  }
};