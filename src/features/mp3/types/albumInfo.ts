// src/types/albumInfo.ts

export type AlbumKind = "dir";

export type AlbumInfo = {
  key: string;              // "dir:<dirKey>"
  kind: AlbumKind;          // "dir"
  dirKey: string;           // getDirname(path) の結果
  trackPaths: string[];     // そのアルバムに属する path 一覧
  dirArtworkUrl: string | null; // フォルダ代表画像（暫定表示）
};

export type AlbumTrackRef = {
  path: string;        // 安定キー: ファイルパス
  index: number;       // 再生用: mp3List / trackViews のグローバルindex
};
