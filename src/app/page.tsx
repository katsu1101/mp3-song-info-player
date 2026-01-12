"use client";

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
    // priorityPaths, // ← hook側I/Fを `priorityPaths?: string[]` にしているならこれ
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

  return (
    <AppShell
      header={
        <TopBar
          title="MP3曲情報エディター"
          folderName={settingState.folderName}
        />
      }
      sidebar={
        <SidebarStub
          state={settingState}
          commands={commands}
        />
      }
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
