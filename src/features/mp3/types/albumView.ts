// src/types/albumView.ts
import type {TrackView} from "@/types/views";

export type AlbumKind =
  | "fantia"
  | "tag"
  | "dir"
  | "albumArtist" // TODO
  | "artist"      // TODO
  | "misc";

export type AlbumTrackRow = { t: TrackView; index: number };

/**
 * アルバムのビューモデルを表し、メタデータと関連するトラックを含みます。
 *
 * このタイプは、アルバムに関する情報を構造化し管理するために使用されます。
 * これには、キー、ディレクトリパス、タイプ、タイトル、トラック数、アートワークURL、およびトラックが含まれます。
 *
 * プロパティ:
 * - `key`: アルバムの一意の識別子。形式は「fantia:...」または「tag:...」のキーとなります。
 * - `dirPath`: 該当する場合、アルバムに関連付けられたディレクトリパス。該当しない場合はNull。
 * - `kind`: アルバムのカテゴリまたはタイプ。ソートや表示に使用されます。
 * - `title`: アルバムのタイトル。
 * - `trackCount`: アルバム内のトラック数。
 * - `artworkUrl`: アルバムのアートワークまたはカバー画像のURL。アートワークがない場合はNULL。
 * - `tracks`: アルバムに含まれるトラック行のリスト。
 */
export type AlbumView = {
  key: string;          // "fantia:..." / "tag:..." / ...
  dirPath: string | null; // dirのときだけ使う。それ以外はnull
  kind: AlbumKind;      // 並び順・表示分岐に使う
  title: string;
  trackCount: number;
  artworkUrl: string | null;
  tracks: AlbumTrackRow[];
};
