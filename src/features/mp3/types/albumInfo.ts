// src/types/albumInfo.ts

export type AlbumKind = "dir";

/**
 * アルバムに関する情報を表します。
 *
 * このタイプは、特定のアルバムのメタデータを保存および処理するために使用されます。
 * アルバムは、そのディレクトリおよび関連情報によって識別されます。
 *
 * - key: ディレクトリキーで構成されるアルバムの一意の識別子。
 * - kind: アルバムのタイプを指定し、ディレクトリ（「dir」）であることが想定される。
 * - dirKey: `getDirname`関数を使用してパスから導出されたディレクトリ名。
 * - trackPaths: アルバムに属するファイルパスの配列。
 * - dirArtworkUrl: 一時的な表示目的で使用されるフォルダ代表画像のURL。
 */
export type AlbumInfo = {
  key: string;              // "dir:<dirKey>"
  kind: AlbumKind;          // "dir"
  dirKey: string;           // getDirname(path) の結果
  trackPaths: string[];     // そのアルバムに属する path 一覧
  dirArtworkUrl: string | null; // フォルダ代表画像（暫定表示）
};
