// src/features/mp3/workers/runMetaScanner.ts

import {readMp3Meta}          from "@/features/mp3/lib/readMp3Meta";
import type {Mp3Entry}        from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath} from "@/features/mp3/types/trackMeta";
import React                  from "react";

type Picture = { data: Uint8Array; format: string };
type RunIdRef = { current: number };
type Args = {
  items: readonly Mp3Entry[];

  runIdRef: RunIdRef;

  track: (url: string) => void;

  setMetaByPath: React.Dispatch<React.SetStateAction<TrackMetaByPath>>;
  setArtworkUrlByPath: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;

  shouldDeferTag?: (entry: Mp3Entry) => boolean;
};

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>((r) => setTimeout(r, 0));
};

const createArtworkUrl = (track: (url: string) => void, picture?: Picture): string | null => {
  if (!picture) return null;
  const copied = new Uint8Array(picture.data);
  const blob = new Blob([copied], {type: picture.format});
  const url = URL.createObjectURL(blob);
  track(url);
  return url;
};

/**
 * メタスキャナーワーカーを起動し、MP3エントリのリストからメタデータを処理・抽出します。
 *
 * この関数は、指定されたMP3ファイルのリストを処理し、定義されたワークフローを使用してメタデータを抽出し、提供された状態管理関数内の関連するメタデータとアートワークURLを更新します。
 * 各呼び出しごとに一意の実行識別子を比較することでタスクのキャンセル安全性を確保し、最新のタスク実行のみが共有状態を操作することを保証します。
 *
 * この操作は2つのパスに分かれます：
 *  - 最初のパスは遅延処理されていない項目を処理します。
 *  - 2番目のパスは、遅延関数が提供されている場合に遅延項目を処理します。
 *
 * @param {Args} args - 処理に必要な引数。
 * @param {Mp3Entry[]} args.items - 処理対象のMP3エントリのリスト。
 * @param {React.MutableRefObject<number>} args.runIdRef - タスクキャンセル時の安全性を確保するための可変実行IDへの参照。
 * @param {(url: string) => void;} args.track - アートワークURL生成に使用する現在のトラックコンテキスト。
 * @param {Function} args.setMetaByPath - ファイルパスでメタデータを更新する関数。引数として更新関数を期待する。
 * @param {Function} args.setArtworkUrlByPath - ファイルパスでアートワークURLを更新する関数。引数として更新関数を期待します。
 * @param {Function} [args.shouldDeferTag] - 特定のMP3エントリを後処理のために遅延処理すべきかを決定するオプションの関数。
 *
 * @returns {Promise<void>}すべてのメタデータ処理が完了したときに解決するプロミス。
 */
export const startMetaScannerWorker = async (args: Args): Promise<void> => {
  const {items, runIdRef, track, setMetaByPath, setArtworkUrlByPath, shouldDeferTag} = args;

  const myRunId = ++runIdRef.current;

  const doOne = async (entry: Mp3Entry): Promise<void> => {
    if (runIdRef.current !== myRunId) return;

    try {
      const file = await entry.fileHandle.getFile();
      const tag = await readMp3Meta(file);

      const createdArtworkUrl = createArtworkUrl(track, tag.picture ?? undefined);

      if (runIdRef.current !== myRunId) return;

      if (createdArtworkUrl) {
        setArtworkUrlByPath((prev) => {
          if (prev[entry.path]) return prev;
          return {...prev, [entry.path]: createdArtworkUrl};
        });
      }

      setMetaByPath((prev) => {
        const current = prev[entry.path];
        if (!current) return prev;

        const nextMeta = {
          ...current,
          title: current.title?.trim() ? current.title : (tag.title ?? current.title),
          artist: current.artist?.trim() ? current.artist : (tag.artist ?? current.artist),
          album: current.album?.trim() ? current.album : (tag.album ?? current.album),
          year: current.year ?? tag.year,
          trackNo: current.trackNo ?? tag.trackNo,

          // ✅ 歌詞はここでは「入ってなければ」くらいにしておく（txt優先は別worker）
          lyrics: current.lyrics?.trim() ? current.lyrics : (tag.lyrics ?? current.lyrics),
          lyricsLrc: current.lyricsLrc?.trim() ? current.lyricsLrc : (tag.lyricsLrc ?? current.lyricsLrc),
        };

        return {...prev, [entry.path]: nextMeta};
      });
    } catch {
      // ignore
    }

    await yieldToBrowser();
  };

  const deferred: Mp3Entry[] = [];

  // 1st pass: 先に処理する（=後回しじゃないもの）
  for (const entry of items) {
    if (runIdRef.current !== myRunId) return;

    if (shouldDeferTag?.(entry)) {
      deferred.push(entry);
      continue;
    }

    await doOne(entry);
  }

  // 2nd pass: 後回し分（Fantiaなど）を最後に処理
  for (const entry of deferred) {
    if (runIdRef.current !== myRunId) return;
    await doOne(entry);
  }
};