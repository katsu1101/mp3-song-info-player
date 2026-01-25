// src/features/mp3/workers/startLyricsTextWorker.ts
import {decodeTextFileBytes, hasMeaningfulText, normalizeLyricsText} from "@/features/mp3/lib/lyrics/lyricsText";
import type {Mp3Entry}                                               from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}                                        from "@/features/mp3/types/trackMeta";
import type {Dispatch, SetStateAction}                               from "react";

type RunIdRef = { current: number };

type Args = {
  items: readonly Mp3Entry[];
  runIdRef: RunIdRef;
  runId: number;
  setMetaByPath: Dispatch<SetStateAction<TrackMetaByPath>>;
};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

/**
 * アイテムのリストから歌詞テキストを並列処理し正規化する。
 *
 * この非同期関数は、指定された並列度で複数の項目に対して動作し、テキストファイルハンドルから歌詞テキストを抽出して正規化します。
 * 正規化されたデータは、メタデータ更新関数を使用して条件付きで保存されます。
 *
 * @param {Object} args - 処理用の入力引数。
 * @param {Array<Object>} args.items - アイテムの配列。各アイテムは歌詞処理用のメタデータとファイルハンドルを含む。
 * @param {Object} args.runIdRef - キャンセルに使用される現在の実行識別子への可変参照。
 * @param {number} args.runId - キャンセル検証に使用される現在の実行のID。
 * @param {Function} args.setMetaByPath - アイテムパスごとにメタデータを更新する関数。
 * @returns {Promise<void>} 全てのアイテムが処理完了した際に解決するプロミス。
 *
 * この関数は以下の処理を行います：
 * - 指定された並列度レベルで項目を並列処理します。
 * - 歌詞処理用の有効なテキストファイルハンドルをチェックします。
 * - ファイルからテキストデータを読み取り、デコードし、正規化します。
 * - メタデータに意味のあるテキストが既に存在しない場合にのみ、メタデータを更新します。
 * - `runIdRef`を現在の`runId`と照合することで、キャンセルに対する安全対策を行います。
 * - `yieldToBrowser`を使用して定期的にブラウザスレッドの実行を委譲します。
 */
export const startLyricsTextWorker = async (args: Args): Promise<void> => {
  const {items, runIdRef, runId, setMetaByPath} = args;

  const concurrency = 2;
  let cursor = 0;

  const runOne = async (): Promise<void> => {
    while (cursor < items.length) {
      if (runIdRef.current !== runId) return;

      const entry = items[cursor++]!;
      const handle = entry.lyricsTextHandle;

      if (!handle) {
        await yieldToBrowser();
        continue;
      }

      try {
        const file = await handle.getFile();
        const bytes = await file.arrayBuffer();
        const decoded = decodeTextFileBytes(bytes);
        const lyrics = normalizeLyricsText(decoded);

        if (!hasMeaningfulText(lyrics)) {
          await yieldToBrowser();
          continue;
        }

        // ✅ 外部 .txt は「未設定なら補完」（タグと競合させない）
        setMetaByPath((prev) => {
          const current = prev[entry.path];
          if (!current) return prev;

          if (hasMeaningfulText(current.lyrics)) return prev;
          return {...prev, [entry.path]: {...current, lyrics}} as TrackMetaByPath;
        });
      } catch {
        // ignore
      }

      await yieldToBrowser();
    }
  };

  await Promise.all(Array.from({length: concurrency}, () => runOne()));
};
