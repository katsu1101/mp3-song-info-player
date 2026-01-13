"use client";

import {EmptyStateFolderActions}       from "@/components/EmptyStateFolderActions";
import {NowPlayingPulse}               from "@/components/NowPlayingPulse";
import {useSettings}                   from "@/components/Settings/SettingsProvider";
import {AppCommands}                   from "@/hooks/useAppCommands";
import {SettingState}                  from "@/types/setting";
import {TrackView}                     from "@/types/views";
import Image                           from "next/image";
import React, {JSX, useEffect, useRef} from "react";
import styles                          from "./TrackList.module.scss";

type TrackListProps = {
  trackViews: readonly TrackView[];
  nowPlayingID: number;
  isPlaying: boolean;
  state: SettingState;
  commands: AppCommands;
};

export function TrackList(props: TrackListProps): JSX.Element {
  const {trackViews, nowPlayingID, isPlaying, state, commands} = props;

  const nowItemRef = useRef<HTMLButtonElement | null>(null);

  const getScrollBehavior = (): ScrollBehavior => {
    if (typeof window === "undefined") return "auto";
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
  };

  const {settings} = useSettings();

  // 手動切替（設定）
  const viewMode = settings.ui.trackListViewMode ?? "list"; // "details" | "tiles"
  // const viewMode = "list"
  const showFilePath = settings.ui.showFilePath;

  useEffect(() => {
    if (!nowPlayingID) return;
    const el = nowItemRef.current;
    if (!el) return;

    el.scrollIntoView({
      behavior: getScrollBehavior(),
      block: "nearest",
      inline: "nearest",
    });
  }, [nowPlayingID]);

  if (!state.folderName || state.needsReconnect) {
    return <EmptyStateFolderActions state={state} commands={commands}/>;
  }
  if (trackViews.length === 0) return <>読み込み中</>;

  return (
    <section
      className={styles.trackList}
      data-view={viewMode}
      data-grid-size={settings.ui.trackGridSize ?? "md"}
      data-show-path={showFilePath ? "1" : "0"}
      data-scroll="song-list"
    >
      {/* “ヘッダー行”も同じDOMで持てる（details時だけ見せる） */}
      <div className={styles.headerRow} aria-hidden>
        <div className={styles.colAction}/>
        <div className={styles.colNo}>#</div>
        <div className={styles.colArt}>🎨</div>
        <div className={styles.colTitle}>曲名</div>
        <div className={styles.colYm}>アルバム</div>
        <div className={styles.colOrig}>原曲</div>
        <div className={styles.colPath}>ファイル</div>
      </div>

      <ul className={styles.list} role="list">
        {trackViews.map((t, index) => {
          const isActive = nowPlayingID === t.item.id;

          return (
            <li
              key={t.item.id ?? index}
              className={styles.item}
              data-now-playing={isActive ? "1" : "0"}
            >
              <button
                ref={isActive ? (node) => {
                  nowItemRef.current = node;
                } : undefined}
                type="button"
                className={styles.rowButton}
                // aria-current={isActive ? "true" : undefined}
                onClick={() => commands.playAtIndex(index)}
              >
                <span className={styles.colAction} aria-hidden>
                  {isActive ? (isPlaying ? <NowPlayingPulse/> : "⏸") : "▶"}
                </span>

                <span className={styles.colNo}>{index + 1}</span>

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
                            objectPosition: "50% 0%", // ✅ 上を優先して切り取る
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

                <span className={styles.colYm}>{t.orderLabel}</span>
                <span className={styles.colOrig}>{t.originalArtist}</span>

                <span className={styles.colPath} title={t.item.path ?? ""}>
                  {t.item.path ?? "なし"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
