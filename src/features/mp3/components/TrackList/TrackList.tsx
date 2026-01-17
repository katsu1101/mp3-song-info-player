// src/components/TrackList/TrackList.tsx
"use client";

import {ArtworkSquare}    from "@/features/mp3/components/Artwork/ArtworkSquare";
import {FolderEmptyState} from "@/components/FolderEmptyState";
import {useSettings}      from "@/components/Settings/SettingsProvider";
import {TrackRow}                      from "@/features/mp3/components/TrackRow/TrackRow";
import {AppCommands}                   from "@/hooks/useAppCommands";
import {AlbumView}                     from "@/features/mp3/types/albumView";
import {SettingState}                  from "@/types/setting";
import {TrackView}                     from "@/types/views";
import React, {JSX, useEffect, useRef} from "react";
import styles                          from "./TrackList.module.scss";

type TrackListProps = {
  trackViews: readonly TrackView[];
  nowPlayingID: number;
  isPlaying: boolean;
  state: SettingState;
  commands: AppCommands;
  albums?: readonly AlbumView[]; // ✅ ここを types/albumView の DirAlbumView に
};

export function TrackList(props: TrackListProps): JSX.Element {
  const {trackViews, nowPlayingID, isPlaying, state, commands, albums} = props;

  const nowItemRef = useRef<HTMLButtonElement | null>(null);

  const getScrollBehavior = (): ScrollBehavior => {
    if (typeof window === "undefined") return "auto";
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
  };

  const {settings} = useSettings();

  // ✅ albums表示ONかつalbumsがあるときだけアルバム表示
  const shouldShowAlbums = Boolean(settings.ui.showAlbums && albums && albums.length > 0);

  // ✅ アルバム表示中は一旦 list 固定（gridは後で対応）
  const viewMode = shouldShowAlbums ? "list" : (settings.ui.trackListViewMode ?? "list");
  const showFilePath = settings.ui.showFilePath;

  useEffect(() => {
    if (nowPlayingID == null) return; // 0を許す
    const el = nowItemRef.current;
    if (!el) return;

    el.scrollIntoView({
      behavior: getScrollBehavior(),
      block: "nearest",
      inline: "nearest",
    });
  }, [nowPlayingID]);

  if (!state.folderName || state.needsReconnect) {
    return <FolderEmptyState state={state} commands={commands}/>;
  }
  if (!shouldShowAlbums && trackViews.length === 0) return <>読み込み中</>;

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
        <div className={styles.colYm}>アルバム/年月</div>
        <div className={styles.colOrig}>アーティスト/原曲</div>
        <div className={styles.colPath}>ファイル</div>
      </div>

      <ul className={styles.list} role="list">
        {shouldShowAlbums ? (
          albums!.map((album) => (
            <li key={album.key} className={styles.albumSection}>
              {/* TODO ✅ アルバム見出し（将来ここを button にしてアコーディオン化） */}
              <div className={styles.albumHeader}>
                <ArtworkSquare
                  url={album.coverUrl} size={56} radius={12}
                  fallbackText={album.title} seed={album.title}
                />
                <div className={styles.albumHeaderText}>
                  <div className={styles.albumTitle} title={album.title}>{album.title}</div>
                  <div className={styles.albumMeta}>{album.trackCount} 曲</div>
                </div>
              </div>

              {/* ✅ アルバム内トラック（TrackRowは<li>を返す想定） */}
              <ul className={styles.albumTracks} role="list">
                {album.tracks.map(({t, index}, albumPos) => (
                  <TrackRow
                    key={`${album.key}:${t.item.path}`}
                    trackView={t}
                    displayNo={albumPos + 1}
                    index={index}
                    nowPlayingID={nowPlayingID}
                    isPlaying={isPlaying}
                    commands={commands}
                    setNowItemAction={(node) => {
                      nowItemRef.current = node;
                    }}
                    variant="full"
                  />
                ))}
              </ul>
            </li>
          ))
        ) : (
          trackViews.map((t, index) => (
            <TrackRow
              key={t.item.path}
              trackView={t}
              index={index}
              nowPlayingID={nowPlayingID}
              isPlaying={isPlaying}
              commands={commands}
              setNowItemAction={(node) => {
                nowItemRef.current = node;
              }}
              variant="full"
            />
          ))
        )}
      </ul>
    </section>
  );
}
