"use client";

import {AppShell}                            from "@/components/AppShell/AppShell";
import {useSettings}                         from "@/components/Settings/SettingsProvider";
import {SidebarStub}                         from "@/components/Sidebar";
import {TopBar}                              from "@/components/TopBar";
import {appMeta}                             from "@/config/appMeta";
import {NowPlayingPanel}                     from "@/features/mp3/components/NowPlayingPanel/NowPlayingPanel";
import {TrackList}                           from "@/features/mp3/components/TrackList/TrackList";
import * as hooks                            from "@/features/mp3/hooks";
import {useGlobalImageDropToNowPlaying}      from "@/features/mp3/hooks/useGlobalImageDropToNowPlaying";
import {buildAlbumViewsFantiaFirst}          from "@/features/mp3/lib/album/buildAlbumViewsFantiaFirst";
import {type AlbumTrackRow, sortAlbumTracks} from "@/features/mp3/lib/album/sortAlbumTracks";
import {isWindows}                           from "@/features/mp3/lib/env/isWindows";
import {useAppCommands}                      from "@/hooks/useAppCommands";
import React, {JSX}                          from "react";

/**
 * オーディオ再生、プレイリスト処理、MP3トラック・アルバム・現在再生中の情報の表示のためのUI
 * レンダリングを管理する各種フックと状態を統合したPageコンポーネントをレンダリングします。
 *
 * このコンポーネントは、以下のための適切な状態管理、メディアセッション制御、およびレンダリングロジックを設定します：
 * - `useAudioPlayer`、`useAudioPlaybackState`、および`useMediaSessionPosition`を使用したオーディオ再生と制御。
 * - `useMp3Library`と`useFantiaMapping`を使用してトラックのメタデータとアートワークを生成・マッピングする。
 * - トラックとアルバムを並べ替え機能付きで表示し、プレイリストと連携します。
 * - アプリコマンド、プレイヤー操作、サイドバーやトップバーなどのUI要素の処理。
 *
 * @return {JSX.Element} ヘッダー、サイドバー、トラックリスト、オーディオプレーヤーのUIを含むメインページのレイアウト。
 */
export default function Page(): JSX.Element {
  const {settings} = useSettings();

  // ===== Player（audio + 再生状態）=====
  const {audioRef, nowPlayingID, playEntry, stopAndClear} = hooks.useAudioPlayer();
  const {isPlaying} = hooks.useAudioPlaybackState(audioRef);
  const {syncPositionStateAction} =
    hooks.useMediaSessionPosition({audioRef, isPlaying, trackKey: nowPlayingID});

  // ===== Mapping（Fantia対応表）=====
  const mappingByPrefixId = hooks.useFantiaMapping();

  // ===== MP3 Library =====
  const {mp3List, artworkUrlByPath, settingState, settingActions} = hooks.useMp3Library();

  // ===== 表示用（trackViews）=====
  // mp3List の順序を正本とする（メタ後追いで並べ替えしない）
  const trackViews = hooks.useTrackViews({
    mp3List,
    metaByPath: settingState.metaByPath,
    artworkUrlByPath,
    mappingByPrefixId,
  });

  // ===== Album Views（Fantia優先）=====
  const dirAlbums = React.useMemo(() => {
    return buildAlbumViewsFantiaFirst({
      trackViews,
      folderName: settingState.folderName,
      dirArtworkUrlByDir: artworkUrlByPath,
    });
  }, [trackViews, settingState.folderName, artworkUrlByPath]);

  // ここで “アルバム内＆アルバム順” を確定させる（UIとプレイヤー共通）
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
  const playlist = hooks.usePlaylistPlayer({
    audioRef,
    playEntry,
    trackViews,
    resetKey: settingState.folderName,
    settings,
    albumViews: sortedDirAlbums, // ✅ こっちに
    stopAndClear,
  });

  // ===== Media Session Controls =====
  hooks.useMediaSessionControls({
    trackViews,
    nowPlayingID,
    playAction: playlist.playActions.play,
    pauseAction: playlist.playActions.pause,
    nextAction: playlist.playActions.playNext,
    prevAction: playlist.playActions.playPrev,
    audioRef,
    syncPositionStateAction,
  });

  // ===== App Commands =====
  const commands = useAppCommands({
    audioRef,
    playActions: playlist.playActions,
    settingActions,
  });

  const nowPlayingPath = React.useMemo(() => {
    if (!nowPlayingID) return null;

    // TODO: trackViews のキーが nowPlayingID と一致しない場合、ここを合わせる
    const hit = mp3List.find((t) => t.id === nowPlayingID);
    return hit?.path ?? null;
  }, [mp3List, nowPlayingID]);

  const {isDragging} = useGlobalImageDropToNowPlaying({
    isWindows: isWindows(),
    rootDirHandle: settingState.savedHandle ?? null, // ←実際のプロパティ名に差し替え
    nowPlayingPath,
    onSavedAction: (savedPath) => {
      console.log("saved:", savedPath);
      // TODO: ジャケット検出を即反映したいなら、artwork再読み込み/再スキャンをここで呼ぶ
      window.location.reload();
    },
    onErrorAction: (message) => {
      console.warn(message);
      // TODO: トーストなど通知UIに寄せる
    },
  });

  return (
    <>
      {isDragging ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 12,
            borderRadius: 20,
            outline: "2px dashed rgba(0,0,0,0.25)",
            background: "rgba(0,0,0,0.05)",
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 9999,
            fontSize: 14,
          }}
        >
          画像をドロップすると保存します
        </div>
      ) : null}
      <AppShell
        header={
          <TopBar
            title={appMeta.name}
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
            metaByPath={settingState.metaByPath}
          />
        )}
      />
    </>
  );
}
