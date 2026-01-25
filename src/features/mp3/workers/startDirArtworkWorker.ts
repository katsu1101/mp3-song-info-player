// src/features/mp3/workers/startDirArtworkWorker.ts

import type {Mp3Entry}            from "@/features/mp3/types/mp3Entry";
import type {ScanMediaTreeResult} from "@/lib/fsAccess/scanMediaTree";
import {getDirname}               from "@/lib/path";
import React                      from "react";

type RunIdRef = { current: number };

type Args = {
  scanResult: ScanMediaTreeResult; // ✅ 名前を修正
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;
  runId: number;

  track: (url: string) => void;
  setArtworkUrlByPath: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

/**
 * アイテムのパスに基づいてディレクトリ用のアートワークを非同期で処理し、そのアートワークURLを設定します。
 *
 * この関数は指定された項目からディレクトリをスキャンし、各ディレクトリに最適な画像を判定し、
 * 各ディレクトリパスにアートワークURLを関連付けます。処理中にブラウザに制御を譲ることでレスポンシブ性を確保し、
 * 外部からの実行IDによるキャンセルを尊重します。
 *
 * @param {Args} args - アートワークワーカーへの入力引数。
 * @param {Object} args.scanResult - ディレクトリと最適な画像のマッピングを含む、事前スキャン結果。
 * @param {Array} args.items - 処理対象のパスを含むアイテムの配列。
 * @param {Object} args.runIdRef - 現在の実行IDを保持する参照オブジェクト。キャンセル処理に使用されます。
 * @param {string} args.runId - ワーカーの現在の実行を一意に識別するID。
 * @param {Function} args.track - アートワークURLを追跡するためのコールバック関数。
 * @param {Function} args.setArtworkUrlByPath - ディレクトリのアートワークURLを状態に更新するセッター関数。
  *
 * @returns {Promise<void>} ディレクトリ内のすべてのアートワーク処理が完了したときに解決します。
 *
 * @throws This この関数は明示的にエラーをスローせず、特定の課題（権限エラー、ファイル削除、読み取り失敗など）を黙って処理します。
 */
export const startDirArtworkWorker = async (args: Args): Promise<void> => {
  const {scanResult, items, runIdRef, runId, track, setArtworkUrlByPath} = args;

  // 対象フォルダ（"" はルート扱い）
  const dirPaths = Array.from(new Set(items.map((x) => getDirname(x.path))));

  // 先に null で埋める（UI都合で undefined を避ける）
  setArtworkUrlByPath(() => {
    const next: Record<string, string | null> = {};
    for (const dirPath of dirPaths) next[dirPath] = null;
    return next;
  });

  // 軽量に逐次（必要なら concurrency 2 でもOK）
  for (const dirPath of dirPaths) {
    if (runIdRef.current !== runId) return;

    const imgHandle = scanResult.dirBestImageByDir.get(dirPath);

    if (!imgHandle) {
      await yieldToBrowser();
      continue;
    }

    try {
      const file = await imgHandle.getFile();
      const url = URL.createObjectURL(file);
      track(url);
      setArtworkUrlByPath((prev) => {
        if (prev[dirPath] === url) return prev;
        return {...prev, [dirPath]: url};
      });
    } catch {
      // ignore（権限/削除/読み取り失敗など）
    }

    await yieldToBrowser();
  }
};
