// src/features/mp3/workers/startTrackArtworkWorker.ts
import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {ScanMediaTreeResult} from "@/lib/fsAccess/scanMediaTree";
import {getDirname}               from "@/lib/path";
import React                      from "react";

type RunIdRef = { current: number };

type Args = {
  scanResult: ScanMediaTreeResult;
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;
  runId: number;

  track: (url: string) => void;
  setArtworkUrlByPath: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

const getBaseNameWithoutExt = (pathLike: string): string => {
  const slash = Math.max(pathLike.lastIndexOf("/"), pathLike.lastIndexOf("\\"));
  const fileName = slash >= 0 ? pathLike.slice(slash + 1) : pathLike;

  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return fileName;
  return fileName.slice(0, dot);
};

const getBundleKey = (dirPath: string, baseName: string): string =>
  dirPath ? `${dirPath}/${baseName}` : baseName;

/**
 * トラックアイテムのリストを非同期で処理し、各トラックのアートワーク（画像）URLを抽出・設定します。
 * この関数は、同時実行可能なワーカー数を制限して並行処理を行います。
 *
 * @param {Args} args - ワーカーの実行に必要な引数。
 * @param {Object} args.scanResult - メディアスキャン処理の結果。トラックおよび関連メタデータに関する情報を含む。
 * @param {Array} args.items - 処理対象のトラックアイテムの配列。
 * @param {React.MutableRefObject<number>} args.runIdRef - 現在の処理実行識別子への参照。特定の実行のキャンセルや追跡を可能にします。
 * @param {number} args.runId - 現在のワーカー実行インスタンスの一意の識別子。
 * @param {Function} args.track - 特定のトラックの処理済みアートワークURLを扱うコールバック関数。
 * @param {Function} args.setArtworkUrlByPath - ファイルパスとアートワークURLのマッピングを更新する関数。埋め込みトラック画像との競合を防止します。
 * @returns {Promise<void>} リスト内の全アイテムの処理完了、またはワーカーが中断された時点で解決するプロミス。
 *
 * このプロセスは、ワーカー数2（`concurrency = 2`）の並列処理制限で動作します。
 * 各ワーカーはアイテムのリストを反復処理し、利用可能な場合はアートワークURLを取得します。
 * 取得したURLは`track`コールバックに渡され、`setArtworkUrlByPath`を使用して保存されます。
 *
 * 実行中に`runIdRef`が変更された場合（新しい実行が開始されたことを示す）、重複処理や無効な処理を防ぐため、プロセスは直ちに停止します。
 *
 * この関数はまた、処理が定期的にブラウザに制御を戻すことを保証し、UIのブロックを防止します。
 */
export const startTrackArtworkWorker = async (args: Args): Promise<void> => {
  const {scanResult, items, runIdRef, runId, track, setArtworkUrlByPath} = args;

  const concurrency = 2;
  let cursor = 0;

  const runOne = async (): Promise<void> => {
    while (cursor < items.length) {
      if (runIdRef.current !== runId) return;

      const entry = items[cursor++]!;
      const dirPath = getDirname(entry.path);
      const baseName = getBaseNameWithoutExt(entry.path);
      const key = getBundleKey(dirPath, baseName);

      const bundle = scanResult.bundleByKey.get(key);
      const imgHandle = bundle?.trackImage?.handle;

      if (!imgHandle) {
        await yieldToBrowser();
        continue;
      }

      try {
        const file = await imgHandle.getFile();
        const url = URL.createObjectURL(file);
        track(url);
        // ✅ 外部画像は「未設定なら補完」(埋め込みジャケットと競合させない)
        setArtworkUrlByPath((prev) => {
          const current = prev[entry.path];
          if (current != null) return prev;
          return {...prev, [entry.path]: url};
        });
      } catch {
        // ignore
      }

      await yieldToBrowser();
    }
  };

  await Promise.all(Array.from({length: concurrency}, () => runOne()));
};
