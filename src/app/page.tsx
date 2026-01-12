"use client";

import {AppShell}                              from "@/components/AppShell/AppShell";
import {NowPlayingPanel}                       from "@/components/NowPlayingPanel";
import {useSettings}                           from "@/components/Settings/SettingsProvider";
import {SidebarStub}                           from "@/components/Sidebar";
import {TopBar}                                from "@/components/TopBar";
import {TrackList}                             from "@/components/TrackList";
import {useAudioPlaybackState}                 from "@/hooks/useAudioPlaybackState";
import {useAudioPlayer}                        from "@/hooks/useAudioPlayer";
import {useFantiaMapping}                      from "@/hooks/useFantiaMapping";
import {useMp3Library}                         from "@/hooks/useMp3Library"; // ← I/F変更後を想定
import {usePlaylistPlayer}                     from "@/hooks/usePlaylistPlayer"; // ← playlistInfo追加を想定
import {useTrackViews}                         from "@/hooks/useTrackViews";
import {buildPriorityPaths, getNowPlayingPath} from "@/lib/playlist/priority";
import {PlayActions}                           from "@/types/actions";
import React, {JSX}                            from "react";

export default function Page(): JSX.Element {
  const {settings} = useSettings();

  // ===== Player（audio + 再生状態）=====
  const {audioRef, nowPlayingID, playEntry} = useAudioPlayer();

  const {isPlaying} = useAudioPlaybackState(audioRef);

  // ===== Mapping（Fantia対応表）=====
  const mapping = useFantiaMapping();
  const {mappingByPrefixId, error: mappingError, isLoading: mappingLoading} = mapping;

  // ===== Library（フォルダ/一覧/メタ/カバー）=====
  // ✅ I/F変更前提:
  // - onBeforeReload: フォルダ開き直し前に停止したい（AbortErrorや継続再生事故を減らす）
  // - getPriorityPaths: 後追いメタ/カバー取得の優先順（再生順に寄せる）
  //
  // 注意: ここで使う priorityPaths は trackViews/playlistInfo 依存なので、
  // 初回レンダーでは空でもOK。hook側で「優先順が変わったらキューを組み替える」設計にします。
  const [priorityPaths, setPriorityPaths] = React.useState<string[]>([]);

  const {mp3List, covers, settingAction} = useMp3Library({
    shuffle: settings.playback.shuffle,
    onBeforeReload: () => {
      // ✅ フォルダ切替時は再生停止
      // playActions.stop は後で作られるので、ここは audioRef を直に止めるか、
      // useAudioPlayer に stop() を生やすのが一番きれい。
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    },
    getPriorityPaths: () => priorityPaths,
  });

  // ===== 表示用（trackViews）=====
  // ✅ mp3List の順序を正本とする（メタ後追いで並べ替えしない）
  const trackViews = useTrackViews({
    mp3List,
    metaByPath: settingAction.metaByPath,
    covers,
    mappingByPrefixId,
  });


  // ===== Playlist（連続再生アクション）=====
  const playlist = usePlaylistPlayer({
    audioRef,
    playEntry,
    trackViews,
    resetKey: settingAction.folderName, // フォルダ切替でindexリセット
    settings,
  });

  // ✅ I/F変更前提: playlistInfo（次に鳴る順のpath列）
  const {playActions, playlistInfo} = playlist as unknown as {
    playActions: PlayActions;
    playlistInfo?: { upcomingPaths: string[] } | null;
  };

  // ===== priorityPaths を更新（再生順にメタ/カバーを寄せる）=====
  React.useEffect(() => {
    const orderedPaths = trackViews.map((t) => t.item.path).filter(Boolean);
    const nowPlayingPath = getNowPlayingPath(trackViews, nowPlayingID);

    const nextPriority = buildPriorityPaths(orderedPaths, nowPlayingPath, playlistInfo ?? null);

    setPriorityPaths((prev) => {
      if (prev.length === nextPriority.length && prev.every((p, i) => p === nextPriority[i])) return prev;
      return nextPriority;
    });
  }, [trackViews, nowPlayingID, playlistInfo]);

  // ===== UI用のハンドラ（サイドメニュー閉じなど）=====
  const onPickFolder = React.useCallback(async () => {
    // ✅ 先に止める（フォルダ切替で鳴り続け問題を回避）
    if (playActions?.stop) playActions.stop();

    // ✅ PC表示以外でサイドメニューを閉じる
    // AppShell/Sidebarの実装に依存するので、ここは TODO にしておくのが安全
    // TODO: settingAction.closeSidebar?.()

    await settingAction.pickFolderAndLoad();
  }, [playActions, settingAction]);

  const uiSettingAction = React.useMemo(() => {
    // TopBar/SidebarStub/TrackList が settingAction を期待している前提で、
    // pickFolderAndLoad だけ差し替える（pageだけ修正で“全部盛り”を成立させる）
    return {
      ...settingAction,
      pickFolderAndLoad: onPickFolder,
    };
  }, [settingAction, onPickFolder]);

  return (
    <AppShell
      header={
        <TopBar
          title="MP3曲情報エディター"
          settingAction={uiSettingAction}
        />
      }
      sidebar={<SidebarStub settingAction={uiSettingAction}/>}
      main={
        <>
          {uiSettingAction.errorMessage ? (
            <p style={{color: "crimson"}}>エラー: {uiSettingAction.errorMessage}</p>
          ) : null}

          {uiSettingAction.needsReconnect ? (
            <p style={{opacity: 0.7}}>フォルダへの再接続が必要です（権限）。</p>
          ) : null}

          {mappingError ? <p style={{color: "crimson"}}>対応表エラー: {mappingError}</p> : null}
          {mappingLoading ? <p style={{opacity: 0.7}}>対応表読み込み中…</p> : null}

          <TrackList
            trackViews={trackViews}
            playActions={playActions}
            nowPlayingID={nowPlayingID}
            isPlaying={isPlaying}
            settingAction={uiSettingAction}
          />
        </>
      }
      renderPlayer={(variant) => (
        <NowPlayingPanel
          variant={variant}
          nowPlayingID={nowPlayingID}
          trackViews={trackViews}
          audioRef={audioRef}
          playActions={playActions}
          isPlaying={isPlaying}
        />
      )}
    />
  );
}
