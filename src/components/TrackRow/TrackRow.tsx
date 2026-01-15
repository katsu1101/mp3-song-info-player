"use client";

import {NowPlayingPulse}  from "@/components/NowPlayingPulse";
import styles             from "@/components/TrackList.module.scss";
import type {AppCommands} from "@/hooks/useAppCommands";
import type {TrackView}   from "@/types/views";
import Image              from "next/image";
import React              from "react";

export type TrackRowVariant = "full" | "compact"; // TODO: album側はcompactを使う想定

type TrackRowProps = {
  displayNo?: number; // ✅ 表示用番号（未指定なら index+1）
  trackView: TrackView;
  index: number;

  nowPlayingID: number;
  isPlaying: boolean;

  commands: AppCommands;

  /** 再生中の行だけ scrollIntoView したいので、TrackList側でrefを持つ */
  setNowItemRef?: (el: HTMLButtonElement | null) => void;

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
    setNowItemRef,
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
        ref={isActive ? (node) => setNowItemRef?.(node) : undefined}
        type="button"
        className={styles.rowButton}
        onClick={() => commands.playAtIndex(index)}
      >
        <span className={styles.colAction} aria-hidden>
          {isActive ? (isPlaying ? <NowPlayingPulse/> : "⏸") : "▶"}
        </span>

        <span className={styles.colNo}>{shownNo}</span>

        <span className={styles.colArt} aria-hidden>
          <span className={styles.artBox} aria-hidden>
            <span className={styles.artInner}>
              {t.coverUrl ? (
                <Image
                  src={t.coverUrl}
                  alt=""
                  fill
                  unoptimized
                  style={{
                    objectFit: "cover",
                    objectPosition: "50% 0%",
                  }}
                />
              ) : (
                <span className={styles.noArt} aria-label="ジャケットなし" title="ジャケットなし">
                  {t.orderLabel === "" ? t.originalArtist ?? t.displayTitle ?? "No" : t.orderLabel}
                </span>
              )}
            </span>
          </span>
        </span>

        <span className={styles.colTitle} title={t.displayTitle ?? ""}>
          {t.displayTitle ?? "（無題）"}
        </span>

        {variant === "full" ? (
          <>
            <span className={styles.colYm}>{t.orderLabel}</span>
            <span className={styles.colOrig}>{t.originalArtist}</span>

            <span className={styles.colPath} title={t.item.path ?? ""}>
              {t.item.path ?? "なし"}
            </span>
          </>
        ) : null /* TODO: compactはアルバム表示用 */}
      </button>
    </li>
  );
}
