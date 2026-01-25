"use client";

import {PlayerVariant}                                                      from "@/components/AppShell/AppShell";
import {
  ArtworkSquare
}                                                                           from "@/features/mp3/components/Artwork/ArtworkSquare";
import {
  saveCoverImageForNowPlaying
}                                                                           from "@/features/mp3/lib/cover/saveCoverImageForNowPlaying";
import {isWindows}                                                          from "@/features/mp3/lib/env/isWindows";
import type {AlbumView}                                                     from "@/features/mp3/types/albumView";
import {TrackMetaByPath}                                                    from "@/features/mp3/types/trackMeta";
import {AppCommands}                                                        from "@/hooks/useAppCommands";
import {useProgressScroll}                                                  from "@/hooks/useProgressScroll";
import {getDirname}                                                         from "@/lib/path";
import {getBasename}                                                        from "@/lib/path/getBasename";
import {TrackView}                                                          from "@/types/views";
import {FastForward, ImagePlus, Pause, Play, Rewind, SkipBack, SkipForward} from "lucide-react";
import React, {JSX, useMemo, useRef}                                        from "react";
import styles                                                               from "./NowPlayingPanel.module.scss";

/**
 * NowPlayingPanel コンポーネントに必要なプロパティを表します。
 */
type NowPlayingPanelProps = {
  variant: PlayerVariant;
  nowPlayingID: number;
  trackViews: readonly TrackView[];
  albumViews: AlbumView[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  commands: AppCommands;
  isPlaying: boolean;
  metaByPath: TrackMetaByPath;
  rootDirHandle: FileSystemDirectoryHandle | null;
};

/**
 * 現在再生中のトラック情報を表示し、再生、一時停止、スキップ、前のトラックボタンなどの再生コントロールを提供する
 * 「再生中」パネルとして機能するReactコンポーネント。
 *
 * @param {Object} props - このコンポーネントに必要なプロパティ。
 * @param {string} props.nowPlayingID - 現在再生中のトラックのID。
 * @param {Array} props.trackViews - 各トラックの詳細を含むトラックビューオブジェクトのリスト。
 * @param {Object} props.audioRef - オーディオ再生に使用される HTMLAudioElement を指す React ref オブジェクト。
 * @param {Object} props.playActions - 再生コントロール用のアクション（例: playPrev, playNext）を含むオブジェクト。
 * @return {JSX.Element} 「再生中」パネルをレンダリングする JSX Element。
 */
export function NowPlayingPanel(props: NowPlayingPanelProps): JSX.Element {
  const {
    nowPlayingID,
    trackViews,
    albumViews,
    audioRef,
    commands,
    isPlaying,
    metaByPath,
    rootDirHandle,
  } = props;

  const lyricsBoxRef = useRef<HTMLDivElement | null>(null);

  const nowTrackView = useMemo(() => {
    if (!nowPlayingID) return null;
    return trackViews.find((t) => t.item.id === nowPlayingID) ?? null;
  }, [nowPlayingID, trackViews]);

  const isWin = isWindows()
  const title = nowTrackView?.displayTitle ?? "";

  const filePath = nowTrackView?.item.path;
  const fileName = filePath ? getBasename(filePath) : "—";
  const dirName = filePath ? getDirname(filePath) : "";

  const canControl = Boolean(nowTrackView?.item);

  const togglePlayPauseLikeSpace = async () => {
    if (!canControl) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Space と同じ：止める＝pause、再開＝play（currentTime は触らない）
    if (audio.paused || audio.ended) {
      try {
        await audio.play();
      } catch {
        // 自動再生制限など。クリック操作なら通常OKだが念のため握りつぶし
      }
      return;
    }

    audio.pause();
  };

  const currentTrack = useMemo(() => {
    // id が 1..n で入ってる前提の設計に見えるので id で引く
    return trackViews.find(t => t.item.id === nowPlayingID) ?? null;
  }, [trackViews, nowPlayingID]);

  const albumByTrackId = useMemo(() => {
    const map = new Map<number, AlbumView>();
    for (const album of albumViews ?? []) {
      for (const row of album.tracks) {
        const id = row.t.item.id;
        map.set(id, album);
      }
    }
    return map;
  }, [albumViews]);

  const currentAlbum = useMemo(() => {
    if (!currentTrack) return null;
    const id = currentTrack.item.id;
    return albumByTrackId.get(id) ?? null;
  }, [currentTrack, albumByTrackId]);

  const albumPosition = useMemo(() => {
    if (!currentAlbum || !currentTrack) return null;
    const id = currentTrack.item.id;

    const pos = currentAlbum.tracks.findIndex(r => r.t.item.id === id);
    if (pos < 0) return null;

    return {
      indexInAlbum: pos + 1,
      totalInAlbum: currentAlbum.tracks.length,
    };
  }, [currentAlbum, currentTrack]);

  const currentPath = currentTrack?.item.path ?? "";

  const lyricsText =
    nowTrackView?.lyrics
    ?? (currentPath ? (metaByPath[currentPath]?.lyrics ?? "") : "")
    ?? "";

  const hasLyrics = lyricsText.trim().length > 0;

  useProgressScroll({
    audioRef,
    scrollRef: lyricsBoxRef,
    enabled: hasLyrics,          // とりあえず歌詞がある時だけ
    pauseMs: 2500,
    useAnimationFrame: false,    // 必要なら true
  });

  // ✅ 保存に使う nowPlayingPath（再生中でないなら null 扱いに）
  const nowPlayingPath = filePath ?? null;

  const canSaveCover = Boolean(rootDirHandle) && Boolean(nowPlayingPath) && canControl;

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [isSavingCover, setIsSavingCover] = React.useState(false);

  const openCoverPickerAction = () => {
    if (!canSaveCover) return;
    coverInputRef.current?.click();
  };

  const onPickCoverFileAction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = e.target.files?.[0] ?? null;

    // 同じファイルを連続で選べるようにクリア
    e.target.value = "";

    if (!imageFile) return;

    setIsSavingCover(true);
    try {
      await saveCoverImageForNowPlaying({
        rootDirHandle,
        nowPlayingPath,
        imageFile,
        reloadAfterSave: true, // ✅ あなたの方針：全画面リロードで即反映
      });
    } finally {
      setIsSavingCover(false);
    }
  };

  const variant = props.variant ?? "full";
  const hasArtwork = Boolean(nowTrackView?.artworkUrl);
  const showOverlayLyrics = hasLyrics && hasArtwork;
  if (variant === "mini") {
    // まずは暫定: ここを「ミニUI」に差し替えていく
    // return <MiniNowPlayingBar ... />;

    const onRewind: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      e.stopPropagation();
      void commands.playRewind()
    };

    const onForward: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      e.stopPropagation();
      void commands.playForward()
    };

    const onPrev: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      e.stopPropagation();
      void commands.playPrev();
    };
    const onToggle: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      e.stopPropagation();
      void togglePlayPauseLikeSpace();
    };

    const onNext: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      e.stopPropagation();
      void commands.playNext();
    };

    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "stretch",
          minWidth: 0,
        }}
      >
        {/* 左：ジャケット（高さいっぱい・正方形） */}
        <div
          style={{
            height: "100%",
            aspectRatio: "1 / 1",
            borderRight: "1px solid var(--panel-border)",
            background: "var(--panel)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <ArtworkSquare
            url={nowTrackView?.artworkUrl}
            fallbackText={nowTrackView?.displayTitle ?? ""}
            seed={nowTrackView?.displayTitle ?? ""}
          />
        </div>

        {/* 右：上=タイトル / 下=ボタン */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "10px 12px",
            gap: 8,
          }}
        >
          {/* 上：タイトル */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--foreground)",
            }}
            title={title}
          >
            {title}
          </div>

          {/* 下：ボタン */}
          <div style={{display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end"}}>
            <button
              type="button"
              onClick={onPrev}
              disabled={!canControl}
              style={miniBarButtonStyle(!canControl)}
              title="前へ"
            >
              <SkipBack size={20} strokeWidth={2.5} aria-hidden/>
            </button>

            <button
              type="button"
              onClick={onRewind}
              disabled={!canControl}
              style={miniBarButtonStyle(!canControl)}
              title="巻き戻し"
            >
              <Rewind/>
            </button>

            <button
              type="button"
              onClick={onToggle}
              disabled={!canControl}
              style={miniBarButtonStyle(!canControl)}
              title={isPlaying ? "一時停止" : "再生"}
            >
              {isPlaying
                ? <Pause size={20} strokeWidth={2.5} aria-hidden/>
                : <Play size={20} strokeWidth={2.5} aria-hidden/>}
            </button>

            <button
              type="button"
              onClick={onForward}
              disabled={!canControl}
              style={miniBarButtonStyle(!canControl)}
              title="先送り"
            >
              <FastForward/>
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={!canControl}
              style={miniBarButtonStyle(!canControl)}
              title="次へ"
            >
              <SkipForward size={20} strokeWidth={2.5} aria-hidden/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== full ======
  const COVER_MAX = 280;

  return (
    <section className={styles.panelRoot}>
      <div className={styles.panelGrid}>
        {currentAlbum ? (
          <div style={{display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 10, alignItems: "center"}}>
            <ArtworkSquare
              url={currentAlbum.artworkUrl}
              radius={12}
              fallbackText={currentAlbum.title}
              seed={currentAlbum.title}
            />
            <div style={{minWidth: 0}}>
              <div style={{fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                {currentAlbum.title}
              </div>
              <div style={{opacity: 0.7, fontSize: 13}}>
                {albumPosition ? `${albumPosition.indexInAlbum} / ${albumPosition.totalInAlbum}` : `${currentAlbum.trackCount} 曲`}
              </div>
            </div>
          </div>
        ) : null}
        <div
          className={styles.artworkFrame}
          data-has-lyrics={hasLyrics ? "1" : "0"}
          style={{maxWidth: COVER_MAX}} // 既存の制約があるなら残す
        >
          {hasArtwork ? (
            <>
              <ArtworkSquare
                url={nowTrackView?.artworkUrl}
                fallbackText={nowTrackView?.displayTitle ?? ""}
                seed={nowTrackView?.displayTitle ?? ""}
              />
              {showOverlayLyrics ? (
                <div className={styles.overlay}>
                  <div className={styles.lyricsBox} ref={lyricsBoxRef} aria-label="歌詞">
                    <div className={styles.lyricsText}>{lyricsText}</div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            // ✅ 画像なし時：同じ枠の中に歌詞を表示（下に増やさない）
            hasLyrics ? (
              <div className={styles.lyricsStandaloneInFrame} ref={lyricsBoxRef} aria-label="歌詞">
                <div className={styles.lyricsText}>{lyricsText}</div>
              </div>
            ) : (
              // 歌詞も無い場合は従来のフォールバック（任意）
              <ArtworkSquare
                url={null}
                fallbackText={nowTrackView?.displayTitle ?? ""}
                seed={nowTrackView?.displayTitle ?? ""}
              />
            )
          )}
        </div>
      </div>
      <div
        style={{
          marginTop: 10, display: "flex", gap: 10, minWidth: 0,
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "10px 12px",
        }}
      >
        <div
          style={{
            minWidth: 0,
            fontSize: 16,
            fontWeight: 900,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={title}
        >
          {title}
        </div>

        <div style={{marginLeft: "auto", display: "flex", alignItems: "center", gap: 10}}>
          {isWin ? <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCoverPickerAction();
            }}
            disabled={!canSaveCover || isSavingCover}
            style={miniBarButtonStyle(!canSaveCover || isSavingCover)}
            title="ジャケット画像を選ぶ"
          >
            <ImagePlus size={20} strokeWidth={2.5} aria-hidden/>
          </button> : null}

          <button
            type="button"
            onClick={() => void commands.playPrev()}
            disabled={!canControl}
            style={fullIconButtonStyle(!canControl)}
            title="前へ（↑）"
          >
            <SkipBack size={20} strokeWidth={2.5} aria-hidden/>
          </button>

          <button
            type="button"
            onClick={() => void commands.playRewind()}
            disabled={!canControl}
            style={miniBarButtonStyle(!canControl)}
            title="巻き戻し（←）"
          >
            <Rewind/>
          </button>

          <button
            type="button"
            onClick={() => void togglePlayPauseLikeSpace()}
            disabled={!canControl}
            style={fullIconButtonStyle(!canControl)}
            title={isPlaying ? "一時停止" : "再生"}
          >
            {isPlaying
              ? <Pause size={20} strokeWidth={2.5} aria-hidden/>
              : <Play size={20} strokeWidth={2.5} aria-hidden/>}
          </button>

          <button
            type="button"
            onClick={() => void commands.playForward()}
            disabled={!canControl}
            style={miniBarButtonStyle(!canControl)}
            title="先送り（→）"
          >
            <FastForward/>
          </button>
          <button
            type="button"
            onClick={() => void commands.playNext()}
            disabled={!canControl}
            style={fullIconButtonStyle(!canControl)}
            title="次へ（↓）"
          >
            <SkipForward size={20} strokeWidth={2.5} aria-hidden/>
          </button>
        </div>
      </div>

      {variant === "full" ? <div style={{marginTop: 10}}>
        <audio ref={audioRef} controls preload="none" style={{width: "100%"}}/>
      </div> : null}

      <div style={{marginTop: 12, display: "grid", gap: 6}}>
        <InfoRow label="アルバム" value={nowTrackView?.albumTitle ?? "—"}/>
        <InfoRow label="アーティスト" value={nowTrackView?.originalArtist ?? "—"}/>
        <InfoRow label="ファイル" value={fileName}/>
        {dirName ? <InfoRow label="フォルダ" value={dirName}/> : null}
      </div>
      {filePath ? (
        <details style={{marginTop: 10}}>
          <summary style={{cursor: "pointer", fontSize: 12, opacity: 0.7}}>パス</summary>
          <div style={{fontSize: 11, opacity: 0.6, marginTop: 6, wordBreak: "break-all"}}>
            {filePath}
          </div>
        </details>
      ) : null}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        multiple={false}
        hidden
        onChange={onPickCoverFileAction}
      />
    </section>
  );
}

/**
 * ラベルと値を持つ情報の行を表示する機能コンポーネント。
 *
 * @param {Object} props - プロパティオブジェクト。
 * @param {string} props.label - 表示するラベルテキスト。
 * @param {string} props.value - 表示する値テキスト。
 * @return {JSX.Element} ラベルと値を含むスタイル付き行。
 */
function InfoRow(props: { label: string; value: string }): JSX.Element {
  const {label, value} = props;
  return (
    <div style={{display: "grid", gridTemplateColumns: "72px 1fr", gap: 10, minWidth: 0}}>
      <div style={{fontSize: 11, opacity: 0.55, whiteSpace: "nowrap"}}>{label}</div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.85,
          minWidth: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function fullIconButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 44,
    height: 34,
    borderRadius: 999,
    border: disabled ? "1px solid var(--panel-border)" : "1px solid rgba(0,0,0,0.18)",
    background: disabled ? "var(--panel)" : "rgba(0,0,0,0.06)",
    color: disabled ? "rgba(0,0,0,0.35)" : "var(--foreground)",
    fontWeight: 900,
    opacity: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "grid",
    placeItems: "center",
    lineHeight: 1,
  };
}

function miniBarButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 32,
    borderRadius: 999,
    border: "1px solid var(--panel-border)",
    background: "var(--panel)",
    color: "var(--foreground)",
    fontWeight: 900,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "grid",
    placeItems: "center",
    lineHeight: 1,
  };
}
