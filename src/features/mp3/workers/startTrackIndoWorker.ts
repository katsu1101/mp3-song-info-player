// startTrackIndoWorker
import {decodeTextFileBytes}           from "@/features/mp3/lib/lyrics/lyricsText";
import type {Mp3Entry}                 from "@/features/mp3/types/mp3Entry";
import type {TrackMetaByPath}          from "@/features/mp3/types/trackMeta";
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

export const startTrackIndoWorker = async (args: Args): Promise<void> => {
  const {items, runIdRef, runId, setMetaByPath} = args;

  const concurrency = 2;
  let cursor = 0;

  const runOne = async (): Promise<void> => {
    while (cursor < items.length) {
      console.log("startTrackIndoWorker")
      if (runIdRef.current !== runId) return;

      const entry = items[cursor++]!;
      const handle = entry.infoHandle;

      if (!handle) {
        await yieldToBrowser();
        continue;
      }
      try {
        const file = await handle.getFile();
        const bytes = await file.arrayBuffer();
        const decoded = decodeTextFileBytes(bytes);
        console.log("decoded", decoded)
        // const tag: Mp3Tag;//normalizeMetadataJson(decoded);

        // if (!hasMeaningfulText(tag)) {
        //   await yieldToBrowser();
        //   continue;
        // }

        // ✅ 外部 .txt は「未設定なら補完」（タグと競合させない）
        setMetaByPath((prev) => {
          const current = prev[entry.path];
          if (!current) return prev;

          const nextMeta = {
            ...current,
            // TODO
            // title: tag.title?.trim() ? tag.title : (current.title ?? tag.title),
            // artist: tag.artist?.trim() ? tag.artist : (current.artist ?? tag.artist),
            // album: tag.album?.trim() ? tag.album : (current.album ?? tag.album),
            // year: tag.year ?? current.year,
            // trackNo: tag.trackNo ?? current.trackNo,
            //
            // // ✅ 歌詞はここでは「入ってなければ」くらいにしておく（txt優先は別worker）
            // lyrics: tag.lyrics?.trim() ? tag.lyrics : (current.lyrics ?? tag.lyrics),
            // lyricsLrc: tag.lyricsLrc?.trim() ? tag.lyricsLrc : (current.lyricsLrc ?? tag.lyricsLrc),
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