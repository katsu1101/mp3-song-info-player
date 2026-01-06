"use client";

import {NowPlayingPanel}   from "@/components/NowPlayingPanel";
import {TopBar}            from "@/components/TopBar";
import {TrackList}         from "@/components/TrackList";
import {useAudioPlayer}    from "@/hooks/useAudioPlayer";
import {useFantiaMapping}  from "@/hooks/useFantiaMapping";
import {useMp3Library}     from "@/hooks/useMp3Library";
import {usePlaylistPlayer} from "@/hooks/usePlaylistPlayer";

import {useTrackViews} from "@/hooks/useTrackViews";
import {useState}      from "react";

export default function Page() {
  const {
    needsReconnect,
    savedHandle,
    reconnect,
    forget,
    mp3List,
    folderName,
    errorMessage,
    totalSize,
    titleByPath,
    coverUrlByPath,
    pickFolderAndLoad,
  } = useMp3Library();

  const {mappingByPrefixId, error: mappingError, isLoading: mappingLoading} = useFantiaMapping();

  const [showFilePath, setShowFilePath] = useState<boolean>(false);

  const {audioRef, nowPlaying, playEntry, stop} = useAudioPlayer();

  const trackViews = useTrackViews({
    mp3List,
    titleByPath,
    coverUrlByPath,
    mappingByPrefixId,
  });

  const list = trackViews.map((t) => t.item);
  const getTitle = (entry: (typeof list)[number]) => {
    const found = trackViews.find((t) => t.item.path === entry.path);
    return found ? found.displayTitle : null;
  };

  const {
    isContinuous,
    toggleContinuous,
    playAtIndex,
    playNext,
    playPrev,
    stopAndReset,
  } = usePlaylistPlayer({
    audioRef,
    playEntry,
    stop,
    list,
    getTitle,
    resetKey: folderName, // フォルダ切替でindexリセット
  });

  return (
    <main style={{padding: 16, maxWidth: 900, margin: "0 auto"}}>
      {/* ✅ TopBar */}
      <TopBar
        title="MP3曲情報エディター"
        folderName={folderName}
        savedHandle={savedHandle}
        needsReconnect={needsReconnect}
        pickFolderAndLoadAction={pickFolderAndLoad}
        reconnectAction={reconnect}
        forgetAction={forget}
        showFilePath={showFilePath}
        setShowFilePathAction={setShowFilePath}
      />

      {errorMessage ? <p style={{marginTop: 12, color: "crimson"}}>エラー: {errorMessage}</p> : null}
      {mappingError ? <p style={{marginTop: 12, color: "crimson"}}>対応表エラー: {mappingError}</p> : null}
      {mappingLoading ? <p style={{marginTop: 12, opacity: 0.7}}>対応表読み込み中…</p> : null}

      {/* プレイヤー */}
      <NowPlayingPanel
        nowPlaying={nowPlaying}
        trackViews={trackViews}
        audioRef={audioRef}
        isContinuous={isContinuous}
        toggleContinuousAction={toggleContinuous}
        playPrevAction={playPrev}
        playNextAction={playNext}
        stopAndResetAction={stopAndReset}
      />

      {/* 再生中 */}
      <TrackList
        trackViews={trackViews}
        showFilePath={showFilePath}
        mp3Count={mp3List.length}
        totalSizeBytes={totalSize}
        onPlayAtIndexAction={playAtIndex}
      />

      {/* トラック一覧 */}
      <TrackList
        trackViews={trackViews}
        showFilePath={showFilePath}
        mp3Count={mp3List.length}
        totalSizeBytes={totalSize}
        onPlayAtIndexAction={playAtIndex}
      />
    </main>
  );
}
