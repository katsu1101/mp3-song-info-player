"use client";

import {AppShell}                            from "@/components/AppShell/AppShell";
import {useSettings}                         from "@/components/Settings/SettingsProvider";
import {SidebarStub}                         from "@/components/Sidebar";
import {TopBar}                              from "@/components/TopBar";
import {NowPlayingPanel}                     from "@/features/mp3/components/NowPlayingPanel";
import {TrackList}                           from "@/features/mp3/components/TrackList/TrackList";
import {useAudioPlaybackState}               from "@/features/mp3/hooks/useAudioPlaybackState";
import {useAudioPlayer}                      from "@/features/mp3/hooks/useAudioPlayer";
import {useFantiaMapping}                    from "@/features/mp3/hooks/useFantiaMapping";
import {useMediaSessionControls}             from "@/features/mp3/hooks/useMediaSessionControls";
import {useMediaSessionPosition}             from "@/features/mp3/hooks/useMediaSessionPosition";
import {useMp3Library}                       from "@/features/mp3/hooks/useMp3Library"; // ← I/F変更後を想定
import {usePlaylistPlayer}                   from "@/features/mp3/hooks/usePlaylistPlayer"; // ← playlistInfo追加を想定
import {useTrackViews}                       from "@/features/mp3/hooks/useTrackViews";
import {buildAlbumViewsFantiaFirst}          from "@/features/mp3/lib/album/buildAlbumViewsFantiaFirst";
import {type AlbumTrackRow, sortAlbumTracks} from "@/features/mp3/lib/album/sortAlbumTracks";
import {useAppCommands}                      from "@/hooks/useAppCommands";
import React, {JSX}                          from "react";


export default function Page(): JSX.Element {
  const {settings} = useSettings();

  // ===== Player（audio + 再生状態）=====
  const {audioRef, nowPlayingID, playEntry, stopAndClear} = useAudioPlayer();
  useMediaSessionPosition(audioRef);
  const {isPlaying} = useAudioPlaybackState(audioRef);

  // ===== Mapping（Fantia対応表）=====
  const mapping = useFantiaMapping();
  const {mappingByPrefixId, error: mappingError, isLoading: mappingLoading} = mapping;

  const {mp3List, artworks, settingState, settingActions} = useMp3Library();

  // ===== 表示用（trackViews）=====
  // ✅ mp3List の順序を正本とする（メタ後追いで並べ替えしない）
  const trackViews = useTrackViews({
    mp3List,
    metaByPath: settingState.metaByPath,
    artworks: artworks,
    mappingByPrefixId,
  });

  const dirAlbums = React.useMemo(() => {
    return buildAlbumViewsFantiaFirst({
      trackViews,
      folderName: settingState.folderName,
      dirArtworkUrlByDir: artworks.dirArtworkUrlByDir,
    });
  }, [trackViews, settingState.folderName, artworks.dirArtworkUrlByDir]);

// ✅ 追加：ここで “アルバム内＆アルバム順” を確定させる（UIとプレイヤー共通）
  const sortedDirAlbums = React.useMemo(() => {
    const next = dirAlbums.map((album) => {
      const sortedTracks: AlbumTrackRow[] = sortAlbumTracks(album.tracks);
      return {
        ...album,
        tracks: sortedTracks,
        trackCount: sortedTracks.length,
      };
    });

    next.sort((a, b) => a.title.localeCompare(b.title, "ja"));
    return next;
  }, [dirAlbums]);

// ===== Playlist =====
  const playlist = usePlaylistPlayer({
    audioRef,
    playEntry,
    trackViews,
    resetKey: settingState.folderName,
    settings,
    albumViews: sortedDirAlbums, // ✅ こっちに
    stopAndClear,
  });

  // 例: playlist 作成の直後
  useMediaSessionControls({
    trackViews: trackViews,
    nowPlayingID: nowPlayingID,
    playAction: playlist.playActions.pause,
    pauseAction: playlist.playActions.pause,
    nextAction: playlist.playActions.playNext,
    prevAction: playlist.playActions.playPrev,
  });

  const commands = useAppCommands({
    audioRef,
    playActions: playlist.playActions,
    settingActions,
  });

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
          albumViews={sortedDirAlbums}
          audioRef={audioRef}
          commands={commands}
          isPlaying={isPlaying}
        />
      )}
    />
  );
}
