// src/const/constants.ts
// TODO 数値・閾値・拡張子など“値”
/**
 * アプリケーションの定数を格納するために使用されるオブジェクト。
 *
 * @constant
 * @namespace
 * @property {string} APP_ID アプリケーションの一意の識別子。
 * @property {Object} IDB IndexedDB 使用のための定数を格納します。
 * @property {string} IDB.DB_NAME IndexedDB データベースの名前。
 * @property {string} IDB.STORE_HANDLES IndexedDBオブジェクトストアの名前。
 * @property {string} IDB.KEY_MUSIC_DIR 音楽ディレクトリハンドルを保存するために使用されるキー。
 * @property {number} IDB.VERSION IndexedDBデータベーススキーマのバージョン。
 */
export const STORAGE = {
  APP_ID: "mp3-song-info-player",

  IDB: {
    DB_NAME: "mp3-song-info-player",
    STORE_HANDLES: "handles",
    KEY_MUSIC_DIR: "musicDir",
    VERSION: 1,
  },
} as const;

/**
 * 一般的な画像ファイル拡張子を含むセット。
 *
 * この変数は画像形式に関連するファイル拡張子を保存および確認するために使用されます。
 * セットに保存されている拡張子は以下の通りです：
 * "jpg"、"jpeg"、"png"、"gif"。
 *
 * このセットは、ファイルタイプの検証や画像ファイルのフィルタリングを行う際に、画像拡張子を素早く参照できるようにします。
 */
export const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif"]);
export const SOUND_EXT = new Set(["mp3", "wav", "ogg"]);
export const VIDEO_EXT = new Set(["mp4", "m4v", "webm", "mov"]);

export const getLowerExt = (name: string): string => {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot + 1).toLowerCase();
};
