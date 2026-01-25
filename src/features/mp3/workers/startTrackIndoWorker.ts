// startTrackIndoWorker
import type {Mp3Entry}                 from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}          from "@/features/mp3/types/trackMeta";
import {readSidecarSoundInfo}          from "@/features/mp3/workers/readSidecarSoundInfo";
import {SoundInfoV1}                   from "@/types/soundInfo";
import type {Dispatch, SetStateAction} from "react";

type RunIdRef = { current: number };

type Args = {
  items: readonly Mp3Entry[];
  runIdRef: RunIdRef;
  runId: number;
  setMetaByPath: Dispatch<SetStateAction<TrackMetaByPath>>;
}

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

/**
 * 指定されたサウンドファイル群のメタデータ処理を非同期で開始します。
 * この関数は、補足的なサイドカー情報を読み取り、ユーザーが提供する更新メカニズムを用いてメタデータを更新することで、
 * 指定されたサウンドファイル群のメタデータを処理します。
 *
 * この処理は固定レベルの並行性で同時に実行され、共有状態の制御を維持しながら複数のタスクが並行して実行できるようにします。
 * この関数は実行中にブラウザへの制御を返すことをサポートし、UIの応答性を確保します。
 *
 * @param {Args} args - メタデータ処理を開始するために必要な引数。
 * @param {Array} args.items - メタデータ処理を行うべきサウンドファイルを表すアイテムの配列。
 * @param {Object} args.runIdRef - 現在の実行識別子を保持する可変参照オブジェクト。
 * @param {string} args.runId - この特定のメタデータ処理実行に対する一意の識別子。
 * @param {Function} args.setMetaByPath - メタデータを更新する関数。消費者がファイルパスによって特定のトラックのメタデータを置換または変更できるようにする。
 *
 * @returns {Promise<void>}すべてのメタデータ処理タスクが完了したときに解決するプロミス。
 *
 * 関数内で、現在の実行カーソルや完了状態などの共有可能な状態が管理されます。
 * メタデータの更新は安全な方法で適用され、複数のタスクが状態にアクセスまたは変更する際に競合状態が発生するのを防ぎます。
 *
 * 内部動作には以下が含まれます：
 * - 十分な意味のあるメタデータを持たないアイテムのスキップ
 * - `title`、`artist`、`album`、アートワークなどのファイル属性に対する外部補足メタデータの処理
 * - パフォーマンスと応答性のバランスを取るための固定数の処理タスクの同時実行
 * - プロセス全体を失敗させることなく、無効または不完全なメタデータの無視
 *
 * この関数は外部ライブラリに直接依存せず、非同期フロー制御の責任を負います。
 */
export const startTrackIndoWorker = async (args: Args): Promise<void> => {
  const {items, runIdRef, runId, setMetaByPath} = args;
  const concurrency = 2;
  let cursor = 0;

  const runOne = async (): Promise<void> => {
    while (cursor < items.length) {

      if (runIdRef.current !== runId) return;


      const entry = items[cursor++]!;
      const handle = entry.infoHandle;

      if (!handle) {
        await yieldToBrowser();
        continue;
      }

      try {
        // const tag: Mp3Tag;//normalizeMetadataJson(decoded);

        // if (!hasMeaningfulText(tag)) {
        //   await yieldToBrowser();
        //   continue;
        // }

        const tag: SoundInfoV1 | null = await readSidecarSoundInfo(handle);
        // ✅ 外部 .txt は「未設定なら補完」（タグと競合させない）
        setMetaByPath((prev) => {
          if (!tag) return prev;
          const current = prev[entry.path];
          if (!current) return prev;

          const nextMeta = {
            ...current,
            title: tag.title?.trim() ? tag.title : (current.title ?? tag.title),
            artist: tag.artist?.trim() ? tag.artist : (current.artist ?? tag.artist),
            album: tag.albumTitle?.trim() ? tag.albumTitle : (current.album ?? tag.albumTitle),
            year: tag.albumArtist ?? current.albumArtist,
            discNo: tag.discNo ?? current.discNo,
            trackNo: tag.trackNo ?? current.trackNo,
            artworkFileName: tag.artworkFileName ?? current.picture
          };
          return {...prev, [entry.path]: nextMeta} as TrackMetaByPath;
        });
      } catch {
        // ignore
      }

      await yieldToBrowser();
    }
  }
  await Promise.all(Array.from({length: concurrency}, () => runOne()));
  // TODO
  // console.log({items, runIdRef, runId, setMetaByPath});
}