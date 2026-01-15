"use client";

import {ArtworkSquare}                 from "@/components/Artwork/ArtworkSquare";
import {EmptyStateFolderActions}       from "@/components/EmptyStateFolderActions";
import {useSettings}                   from "@/components/Settings/SettingsProvider";
import {TrackRow}                      from "@/components/TrackRow/TrackRow";
import {AppCommands}                   from "@/hooks/useAppCommands";
import {DirAlbumView}                  from "@/types/albumView";
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
  albums?: readonly DirAlbumView[];
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
        {shouldShowAlbums ? (
          albums!.map((album) => (
            <React.Fragment key={album.key}>
              {/* ✅ アルバム見出し（将来アコーディオン化しやすい） */}
              <div className="flex items-center gap-3 min-w-0">
                <ArtworkSquare url={album.coverUrl} size={64} radius={12}/>
                <div className="min-w-0">
                  <div className="font-extrabold truncate">{album.title}</div>
                  <div className="text-sm opacity-70">{album.trackCount} 曲</div>
                </div>
              </div>

              {/* ✅ アルバム内トラック（indexはグローバル index を使う） */}
              {album.tracks.map(({t, index}) => (
                <TrackRow
                  key={`${album.key}:${t.item.id ?? index}`}
                  trackView={t}
                  index={index}
                  nowPlayingID={nowPlayingID}
                  isPlaying={isPlaying}
                  commands={commands}
                  setNowItemRef={(node) => {
                    nowItemRef.current = node;
                  }}
                  variant="full"
                />
              ))}
            </React.Fragment>
          ))
        ) : (
          trackViews.map((t, index) => (
            <TrackRow
              key={t.item.id ?? index}
              trackView={t}
              index={index}
              nowPlayingID={nowPlayingID}
              isPlaying={isPlaying}
              commands={commands}
              setNowItemRef={(node) => {
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
