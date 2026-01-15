"use client";

import {DirAlbumView} from "@/components/Albums/AlbumList";

import {AppShell}              from "@/components/AppShell/AppShell";
import {NowPlayingPanel}       from "@/components/NowPlayingPanel";
import {useSettings}           from "@/components/Settings/SettingsProvider";
import {SidebarStub}           from "@/components/Sidebar";
import {TopBar}                from "@/components/TopBar";
import {TrackList}             from "@/components/TrackList";
import {useAppCommands}        from "@/hooks/useAppCommands";
import {useAudioPlaybackState} from "@/hooks/useAudioPlaybackState";
import {useAudioPlayer}        from "@/hooks/useAudioPlayer";
import {useFantiaMapping}      from "@/hooks/useFantiaMapping";
import {useMp3Library}         from "@/hooks/useMp3Library"; // ← I/F変更後を想定
import {usePlaylistPlayer}     from "@/hooks/usePlaylistPlayer"; // ← playlistInfo追加を想定
import {useTrackViews}         from "@/hooks/useTrackViews";
import {sortAlbumTracks}       from "@/lib/mp3/album/sortAlbumTracks";
import {getDirname}            from "@/lib/path/getDirname";
import {TrackView}             from "@/types/views";
import React, {JSX}            from "react";

export default function Page(): JSX.Element {
  const {settings} = useSettings();

  // ===== Player（audio + 再生状態）=====
  const {audioRef, nowPlayingID, playEntry, stopAndClear} = useAudioPlayer();

  const {isPlaying} = useAudioPlaybackState(audioRef);

  // ===== Mapping（Fantia対応表）=====
  const mapping = useFantiaMapping();
  const {mappingByPrefixId, error: mappingError, isLoading: mappingLoading} = mapping;

  const {mp3List, covers, settingState, settingActions} = useMp3Library({
    shuffle: settings.playback.shuffle,
  });

  // ===== 表示用（trackViews）=====
  // ✅ mp3List の順序を正本とする（メタ後追いで並べ替えしない）
  const trackViews = useTrackViews({
    mp3List,
    metaByPath: settingState.metaByPath,
    covers,
    mappingByPrefixId,
  });

  // ===== Playlist（連続再生アクション）=====
  const playlist = usePlaylistPlayer({
    audioRef,
    playEntry,
    trackViews,
    resetKey: settingState.folderName, // フォルダ切替でindexリセット
    settings,
    stopAndClear
  });

  const commands = useAppCommands({
    audioRef,
    playActions: playlist.playActions,
    settingActions,
  });

  // TODO あとで外に出す
  const dirAlbums = React.useMemo<DirAlbumView[]>(() => {
    // dirPath -> AlbumTrackRow[]
    const rowsByDir = new Map<string, { t: TrackView; index: number }[]>();

    trackViews.forEach((t, index) => {
      const dirPath = getDirname(t.item.path);
      const rows = rowsByDir.get(dirPath) ?? [];
      rows.push({t, index});
      rowsByDir.set(dirPath, rows);
    });

    const albums: DirAlbumView[] = Array.from(rowsByDir.entries()).map(([dirPath, rows]) => {
      const tracks = sortAlbumTracks(rows); // ✅ ここが反映ポイント

      const title = dirPath.length > 0 ? dirPath : `${settingState.folderName}（直下）`; // ここは後で定数化OK
      const coverUrl =
        tracks[0]?.t.coverUrl ??
        null;

      return {
        key: `dir:${dirPath}`,
        dirPath,
        title,
        trackCount: tracks.length,
        coverUrl,
        tracks,
      };
    });

    // 好みでアルバム自体もソート（例：タイトル）
    albums.sort((a, b) => a.title.localeCompare(b.title, "ja"));

    return albums;
  }, [trackViews, settingState.folderName]);


  return (
    <AppShell
      header={
        <TopBar
          title="MP3曲情報エディター"
          folderName={settingState.folderName}
        />
      }
      sidebar={({closeSidebar}) => (
        <SidebarStub
          state={settingState}
          commands={commands}
          closeSidebar={closeSidebar}
        />
      )}
      main={
        <>
          {settingState.errorMessage ? (
            <p style={{color: "crimson"}}>エラー: {settingState.errorMessage}</p>
          ) : null}

          {settingState.needsReconnect ? (
            <p style={{opacity: 0.7}}>フォルダへの再接続が必要です（権限）。</p>
          ) : null}

          {mappingError ? <p style={{color: "crimson"}}>対応表エラー: {mappingError}</p> : null}
          {mappingLoading ? <p style={{opacity: 0.7}}>対応表読み込み中…</p> : null}

          <TrackList
            albums={dirAlbums}
            trackViews={trackViews}
            nowPlayingID={nowPlayingID}
            isPlaying={isPlaying}
            state={settingState}
            commands={commands}
          />
        </>
      }
      renderPlayer={(variant) => (
        <NowPlayingPanel
          variant={variant}
          nowPlayingID={nowPlayingID}
          trackViews={trackViews}
          audioRef={audioRef}
          commands={commands}
          isPlaying={isPlaying}
        />
      )}
    />
  );
}
