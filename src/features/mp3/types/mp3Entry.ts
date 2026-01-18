/**
 * MP3ファイルのエントリを表し、メタデータとファイルハンドル詳細を含みます。
 */
export type Mp3Entry = {
  id: number
  path: string;        // 表示用（サブフォルダ含む）
  name: string;
  lastModified: number | null;

  fileHandle: FileSystemFileHandle;

  lyricsTextHandle?: FileSystemFileHandle; // 歌詞ファイルへのハンドル

  infoHandle?: FileSystemFileHandle; // jsonファイルのハンドル
};
