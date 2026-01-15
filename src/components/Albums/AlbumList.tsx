"use client";

import {ArtworkSquare} from "@/components/Artwork/ArtworkSquare";
import {useSettings}   from "@/components/Settings/SettingsProvider";
import styles          from "@/components/TrackList.module.scss";
import {TrackRow}      from "@/components/TrackRow/TrackRow";
import {AppCommands}   from "@/hooks/useAppCommands";
import {TrackView}     from "@/types/views";
import React           from "react";

export type AlbumTrackRow = {
  t: TrackView;
  index: number; // ✅ trackViews全体での index（playAtIndex用）
};

export type DirAlbumView = {
  key: string;        // 例: dir:<dirKey>
  dirPath: string;
  title: string;      // 例: dirKey（相対パス）
  trackCount: number;
  coverUrl: string | null;
  tracks: AlbumTrackRow[]; // ✅ 追加
};

type AlbumListProps = {
  albums: DirAlbumView[];
  nowPlayingID: number;
  isPlaying: boolean;
  commands: AppCommands;
};

export function AlbumList(props: AlbumListProps): React.JSX.Element {
  const {albums, nowPlayingID, isPlaying, commands} = props;

  const {settings} = useSettings();

  if (albums.length === 0) {
    return (
      <section
        aria-label="アルバム"
        className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-5"
      >
        <div className="text-base font-extrabold opacity-90">アルバム</div>
        <div className="mt-2 text-sm opacity-70">フォルダを選ぶとアルバムが表示されます。</div>
      </section>
    );
  }

  // 手動切替（設定）
  const viewMode = settings.ui.trackListViewMode ?? "list"; // "details" | "tiles"
  return (
    <section aria-label="アルバム">
      <ul className="grid gap-4">
        {albums.map((album) => (
          <li key={album.key}
              className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-4"
          >
            {/* ヘッダー（ここを将来アコーディオンのsummaryにする） */}
            <div className="flex items-center gap-3 min-w-0">
              <ArtworkSquare url={album.coverUrl} size={64} radius={12}/>
              <div className="min-w-0">
                <div className="font-extrabold truncate">{album.title}</div>
                <div className="text-sm opacity-70">{album.trackCount} 曲</div>
              </div>
            </div>

            <section
              className={styles.trackList}
              data-view={viewMode}
              data-grid-size={settings.ui.trackGridSize ?? "md"}
              data-show-path="0"
              data-scroll="song-list"
            >
              {/* 曲リスト */}
              <ul className={styles.list} role="list">
                {album.tracks.map(({t, index}, inAlbumIndex) => (
                  <TrackRow
                    key={`${album.key}:${t.item.id ?? index}`}
                    trackView={t}
                    index={index}               // ✅ 再生用はグローバルindex
                    displayNo={inAlbumIndex + 1} // ✅ 表示はアルバム内番号
                    nowPlayingID={nowPlayingID}
                    isPlaying={isPlaying}
                    commands={commands}
                  />
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ul>
    </section>
  );
}
