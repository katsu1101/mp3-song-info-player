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

export const startTrackIndoWorker = async (args: Args): Promise<void> => {
  const {items, runIdRef, runId, setMetaByPath} = args;
  const concurrency = 2;
  let cursor = 0;

  const runOne = async (): Promise<void> => {
    while (cursor < items.length) {

      if (runIdRef.current !== runId) return;


      const entry = items[cursor++]!;
      const handle = entry.infoHandle;
      console.log("handle", handle)

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