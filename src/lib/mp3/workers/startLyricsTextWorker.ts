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
          return {...prev, [entry.path]: {...current, lyrics}};
        });
      } catch {
        // ignore
      }

      await yieldToBrowser();
    }
  };

  await Promise.all(Array.from({length: concurrency}, () => runOne()));
};
