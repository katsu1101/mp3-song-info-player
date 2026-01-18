"use client";

import {ArtworkSquare}    from "@/features/mp3/components/Artwork/ArtworkSquare";
import {NowPlayingPulse}  from "@/features/mp3/components/NowPlayingPulse";
import styles             from "@/features/mp3/components/TrackList/TrackList.module.scss";
import type {AppCommands} from "@/hooks/useAppCommands";
import type {TrackView}   from "@/types/views";
import {Pause, Play}      from "lucide-react";
import React              from "react";

export type TrackRowVariant = "full" | "compact";

type TrackRowProps = {
  displayNo?: number; // ✅ 表示用番号（未指定なら index+1）
  trackView: TrackView;
  index: number;

  nowPlayingID: number;
  isPlaying: boolean;

  commands: AppCommands;

  /** 再生中の行だけ scrollIntoView したいので、TrackList側でrefを持つ */
  setNowItemAction?: (el: HTMLButtonElement | null) => void;

  variant?: TrackRowVariant; // TODO: 今回は未使用（TrackListはfull）
};

export function TrackRow(props: TrackRowProps): React.JSX.Element {
  const {
    displayNo,
    trackView: t,
    index,
    nowPlayingID,
    isPlaying,
    commands,
    setNowItemAction,
    variant = "full",
  } = props;

  const shownNo = displayNo ?? (index + 1);
  const isActive = nowPlayingID === t.item.id;

  return (
    <li
      key={t.item.id ?? index}
      className={styles.item}
      data-now-playing={isActive ? "1" : "0"}
    >
      <button
        ref={isActive ? (node) => setNowItemAction?.(node) : undefined}
        type="button"
        className={styles.rowButton}
        onClick={() => commands.playAtIndex(index)}
      >
        <span className={styles.colAction} aria-hidden>
          {isActive
            ? (isPlaying
              ? <NowPlayingPulse/>
              : <Pause size={20} strokeWidth={2.5} aria-hidden/>)
            : <Play size={20} strokeWidth={2.5} aria-hidden/>}
        </span>

        <span className={styles.colNo}>{shownNo}</span>

        <span className={styles.colArt} aria-hidden>
          <span className={styles.artBox} aria-hidden>
            <span className={styles.artInner}>
              <ArtworkSquare
                url={t.artworkUrl}
                fallbackText={t.displayTitle ?? ""}
                seed={t.displayTitle ?? ""}
              />
            </span>
          </span>
        </span>

        <span className={styles.colTitle} title={t.displayTitle ?? ""}>
          {t.displayTitle ?? "（無題）"}
        </span>

        {variant === "full" ? (
          <>
            <span className={styles.colYm}>{t.albumTitle}</span>
            <span className={styles.colOrig}>{t.originalArtist}</span>

            <span className={styles.colPath} title={t.item.path ?? ""}>
              {t.item.path ?? "なし"}
            </span>
          </>
        ) : null}
      </button>
    </li>
  );
}
