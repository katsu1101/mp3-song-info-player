import {extractPrefixIdFromPath} from "@/lib/mapping/extractPrefixId";
import {getDirname}              from "@/lib/path/getDirname";
import {buildReleaseOrderLabel}  from "@/lib/playlist/label";
import {Covers}                  from "@/types";
import type {FantiaMappingEntry} from "@/types/fantia";
import type {Mp3Entry}           from "@/types/mp3Entry";
import {TrackMetaByPath}         from "@/types/trackMeta";
import {TrackView}               from "@/types/views";
import React                     from "react";

/**
 * `useTrackViews` 機能に必要な引数を表します。
 *
 * このタイプは、MP3エントリ、メタデータ集約、カバー情報、およびプレフィックス識別子によるマッピングに関連するデータをカプセル化します。
 * トラックビューおよびメタデータ処理を扱う操作に必要な入力を提供します。
 *
 * プロパティ:
 * - `mp3List`: トラックビューの主要な構成要素であるMP3エントリのコレクション。
 * - `metaByPath`: トラックに関連付けられたメタデータの集約。パスによって識別される。
 * - `covers`: カバーデータの表現。構造体はトラックとフォルダ代表に関する情報を保持する。
 * - `mappingByPrefixId`: プレフィックスIDとFantiaマッピングエントリとの読み取り専用マッピング。
 */
type UseTrackViewsArgs = {
  mp3List: Mp3Entry[];

  // ✅ TrackMeta の集約を受け取る
  metaByPath: TrackMetaByPath;

  // ✅ cover（曲 > フォルダ代表）はこのまま
  covers: Covers;

  mappingByPrefixId: ReadonlyMap<string, FantiaMappingEntry>;
};

/**
 * 数値を2桁の文字列表現に変換します。
 * 数値が1桁の場合、先頭に0を付加します。
 *
 * @param {number} n - 2桁の文字列に変換する数値。
 * @returns {string} 指定された数値の2桁の文字列表現。
 */
const toTwoDigits = (n: number): string => String(n).padStart(2, "0");

/**
 * 入力値を正規化し、文字列から周囲の空白をトリミングします。
 * 入力が文字列でない場合、またはトリミング結果が空文字列の場合、nullを返します。
 * それ以外の場合は、トリミングされた文字列を返します。
 *
 * @param {unknown} value - 正規化する入力値。
 * @returns {string | null} - 正規化された文字列。入力が有効な文字列でない場合は null。
 */
const normalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * MP3ファイルのリストを処理し、追加のメタデータを含むトラックビューの配列を生成する関数。
 *
 * @param {UseTrackViewsArgs} args - 以下のプロパティを含むオブジェクト：
 *   - `mp3List` (配列): MP3ファイルオブジェクトのリスト。
 *   - `metaByPath` (オブジェクト): ファイルパスとメタデータ（タイトル、アルバム、アーティストなどの詳細を含む）のマッピング。
 *   - `covers` (オブジェクト): ファイルパスおよびディレクトリごとのカバー画像URLのマッピングを含むオブジェクト。
 *   - `mappingByPrefixId` (マップ): プレフィックスIDとマッピングオブジェクトのマップ。通常、トラックに関連する追加情報（例: タイトル、オリジナルアーティスト）を含む。
 * @returns {TrackView[]} トラックビューの配列。各トラックビューには、処理済みメタデータ、順序ラベル、およびMP3ファイルに関連するその他の属性が含まれます。
 *
 * 返されるトラックビューには以下が含まれます：
 * - `displayTitle`: メタデータ、マッピング、またはデフォルト値から決定される、ユーザーフレンドリーなトラックタイトル。
 * - `orderLabel`: アルバムまたはリリース日に基づくトラックの順序を説明する文字列。
 * - `originalArtist`: メタデータまたはマッピングから正規化された、トラックに関連付けられたアーティスト。
 * - `coverUrl`: ファイル固有またはディレクトリ固有のカバーマッピングから導出された、トラックのカバー画像のURL。
 * - `index` や生の `item` データを含む、追加の技術的詳細。
 */
export const useTrackViews = (args: UseTrackViewsArgs): TrackView[] => {
  const {mp3List, metaByPath, covers, mappingByPrefixId} = args;

  return React.useMemo(() => {
    return mp3List.map((item, index) => {
      const meta = metaByPath[item.path];

      const prefixId = extractPrefixIdFromPath(item.path);
      const fantiaEntry = prefixId ? (mappingByPrefixId.get(prefixId) ?? null) : null;

      const displayTitle =
        fantiaEntry?.title?.trim()
        || meta?.title?.trim()
        || item.fileHandle.name;

      const displayArtist =
        fantiaEntry?.originalArtist?.trim()
        || meta?.artist?.trim()
        || "";

      const displayAlbumTitle =
        fantiaEntry?.releaseYm?.trim()
        || pickText(meta?.album); // Fantia releaseYm を album に混ぜない

      // 任意: 表示用の補助情報（欲しくなったらUIに出す用）
      const displaySub =
        pickText(
          fantiaEntry?.releaseYm ? `Fantia ${fantiaEntry.releaseYm}` : null,
          fantiaEntry?.originalArtist ? `原曲: ${fantiaEntry.originalArtist}` : null,
        );

      const mapping = prefixId ? mappingByPrefixId.get(prefixId) : undefined;


      const albumName = meta?.album ?? null;
      const trackNo = meta?.trackNo ?? null;

      const albumOrderLabel =
        albumName ? (trackNo ? `${albumName} / ${toTwoDigits(trackNo)}` : albumName) : null;

      const releaseOrderLabel = buildReleaseOrderLabel(mapping) ?? "";
      const orderLabel = albumOrderLabel ?? releaseOrderLabel;

      const tagArtist = normalizeText(meta?.artist);
      const mappingOriginal = normalizeText(mapping?.originalArtist);
      const originalArtist = tagArtist ?? mappingOriginal;

      const dirPath = getDirname(item.path);
      const coverUrl = covers.coverUrlByPath[item.path] ?? covers.dirCoverUrlByDir[dirPath] ?? null;

      return {
        item,
        index,
        display: {
          title: displayTitle,
          artist: displayArtist,
          albumTitle: displayAlbumTitle,
          sub: displaySub, // TODO: UIに出したくなったら
        },
        displayTitle,
        orderLabel,
        originalArtist,
        coverUrl,
        trackNoRaw: meta?.trackNo ?? null,
        discNoRaw: null, // TODO
        releaseYm: mapping?.releaseYm
      } as TrackView;
    });
  }, [mp3List, metaByPath, mappingByPrefixId, covers.coverUrlByPath, covers.dirCoverUrlByDir]);
};

const pickText = (...candidates: Array<string | null | undefined>): string | null => {
  for (const c of candidates) {
    const v = typeof c === "string" ? c.trim() : "";
    if (v.length > 0) return v;
  }
  return null;
};
