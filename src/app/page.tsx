"use client";

import {useAudioPlayer}    from "@/hooks/useAudioPlayer";
import {useFantiaMapping}  from "@/hooks/useFantiaMapping";
import {useMp3Library}     from "@/hooks/useMp3Library";
import {usePlaylistPlayer} from "@/hooks/usePlaylistPlayer";

import {useTrackViews} from "@/hooks/useTrackViews";
import Image           from "next/image";
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
      <h1 style={{fontSize: 22, fontWeight: 700}}>MP3曲情報エディター（テスト）</h1>

      <div style={{display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap"}}>
        <button onClick={pickFolderAndLoad} style={{padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc"}}>
          フォルダを選ぶ
        </button>

        {savedHandle && needsReconnect ? <button onClick={reconnect}>前回のフォルダに再接続</button> : null}
        {savedHandle ? <button onClick={forget}>記憶を消す</button> : null}
        {folderName ? <div>選択中: <b>{folderName}</b></div> : <div>未選択</div>}

        <div style={{marginTop: 8}}>
          <button
            onClick={() => setShowFilePath((v) => !v)}
            style={{padding: "3px 5px", borderRadius: 4, border: "1px solid #ccc"}}
          >
            {showFilePath ? "file名を隠す" : "file名表示"}
          </button>
        </div>
      </div>

      {errorMessage ? <p style={{marginTop: 12, color: "crimson"}}>エラー: {errorMessage}</p> : null}
      {mappingError ? <p style={{marginTop: 12, color: "crimson"}}>対応表エラー: {mappingError}</p> : null}
      {mappingLoading ? <p style={{marginTop: 12, opacity: 0.7}}>対応表読み込み中…</p> : null}

      {/* プレイヤー */}
      <section style={{marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10}}>
        <div style={{display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap"}}>
          <div style={{fontWeight: 700}}>再生</div>
          {nowPlaying ? (
            <div style={{opacity: 0.9}}>
              <b>{nowPlaying.title ?? "（曲名なし）"}</b>{" "}
              <span style={{fontSize: 12, opacity: 0.8}}>{nowPlaying.path}</span>
            </div>
          ) : (
            <div style={{opacity: 0.7}}>未再生</div>
          )}

          <button onClick={stopAndReset} style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}>
            停止
          </button>

          <button onClick={toggleContinuous} style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}>
            連続再生: {isContinuous ? "ON" : "OFF"}
          </button>

          <button onClick={() => void playPrev()}
                  style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}>
            ◀ 前へ
          </button>

          <button onClick={() => void playNext()}
                  style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc"}}>
            次へ ▶
          </button>
        </div>

        <div style={{marginTop: 10}}>
          <audio ref={audioRef} controls preload="none" style={{width: "100%"}}/>
        </div>
      </section>

      <div style={{marginTop: 16}}>
        <div style={{display: "flex", gap: 16}}>
          <div>MP3件数: <b>{mp3List.length}</b></div>
          <div>合計サイズ: <b>{(totalSize / (1024 * 1024)).toFixed(2)} MB</b></div>
        </div>

        <ul style={{marginTop: 12, paddingLeft: 0, listStyle: "none"}}>
          {trackViews.map((t) => (
            <li key={t.item.path} style={{display: "flex", gap: 10, alignItems: "center", padding: "6px 0"}}>
              <div style={{
                width: 44, height: 44, borderRadius: 8, border: "1px solid #ddd",
                overflow: "hidden", display: "grid", placeItems: "center",
                background: "#fafafa", flex: "0 0 auto",
              }}>
                {t.coverUrl ? (
                  <Image src={t.coverUrl} alt="" width={44} height={44} unoptimized
                         style={{width: "100%", height: "100%", objectFit: "cover"}}/>
                ) : (
                  <span style={{fontSize: 12, opacity: 0.6}}>No Art</span>
                )}
              </div>

              <div style={{minWidth: 0, flex: "1 1 auto"}}>
                <div style={{fontWeight: 800, fontSize: 18, lineHeight: 1.2}}>
                  {t.displayTitle}
                </div>

                <div style={{fontSize: 13, opacity: 0.85, marginTop: 4}}>
                  {t.releaseOrder}
                  {t.originalArtist ? <span style={{opacity: 0.75}}> / 原曲: {t.originalArtist}</span> : null}
                </div>

                {showFilePath ? (
                  <div style={{fontSize: 11, opacity: 0.6, marginTop: 4, wordBreak: "break-all"}}>
                    {t.item.path}
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => void playAtIndex(t.index)}
                style={{padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc", flex: "0 0 auto"}}
              >
                ▶ 再生
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
