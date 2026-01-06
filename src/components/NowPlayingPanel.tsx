"use client";

import Image from "next/image";
import React from "react";

type NowPlayingInfo = {
  title: string | null;
  path: string;
};

type TrackItem = {
  path: string;
};

type TrackViewLike = {
  item: TrackItem;
  index: number;
  displayTitle: string;
  releaseOrder: string;
  originalArtist?: string | null;
  coverUrl?: string | null;
};

type NowPlayingPanelProps = {
  nowPlaying: NowPlayingInfo | null;
  trackViews: readonly TrackViewLike[];

  audioRef: React.RefObject<HTMLAudioElement | null>;

  isContinuous: boolean;
  toggleContinuousAction: () => void;

  playPrevAction: () => Promise<void> | void;
  playNextAction: () => Promise<void> | void;

  stopAndResetAction: () => void;
};

export function NowPlayingPanel(props: NowPlayingPanelProps) {
  const {
    nowPlaying,
    trackViews,
    audioRef,
    isContinuous,
    toggleContinuousAction,
    playPrevAction,
    playNextAction,
    stopAndResetAction,
  } = props;

  const nowTrackView = nowPlaying
    ? trackViews.find((t) => t.item.path === nowPlaying.path) ?? null
    : null;

  const title = nowTrackView?.displayTitle ?? nowPlaying?.title ?? "未再生";
  const coverUrl = nowTrackView?.coverUrl ?? null;

  const subLine = nowTrackView
    ? `${nowTrackView.releaseOrder}${nowTrackView.originalArtist ? ` / 原曲: ${nowTrackView.originalArtist}` : ""}`
    : "";

  const canSkip = Boolean(nowPlaying);

  return (
    <section style={{marginTop: 16, padding: 14, border: "1px solid #ddd", borderRadius: 14}}>
      <div style={{display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap"}}>
        {/* 左：ジャケ */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            border: "1px solid #ddd",
            overflow: "hidden",
            background: "#fafafa",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
          }}
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              width={56}
              height={56}
              unoptimized
              style={{width: "100%", height: "100%", objectFit: "cover"}}
            />
          ) : (
            <span style={{fontSize: 12, opacity: 0.6}}>No Art</span>
          )}
        </div>

        {/* 中：曲情報 */}
        <div style={{minWidth: 240, flex: "1 1 auto"}}>
          <div style={{display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap"}}>
            <div style={{fontWeight: 900, fontSize: 18, lineHeight: 1.2}}>
              {title}
            </div>

            {subLine ? (
              <div style={{fontSize: 12, opacity: 0.75}}>
                {subLine}
              </div>
            ) : null}
          </div>

          {nowPlaying ? (
            <details style={{marginTop: 6}}>
              <summary style={{cursor: "pointer", fontSize: 12, opacity: 0.7}}>
                詳細（ファイルパス）
              </summary>
              <div style={{fontSize: 11, opacity: 0.6, marginTop: 6, wordBreak: "break-all"}}>
                {nowPlaying.path}
              </div>
            </details>
          ) : (
            <div style={{fontSize: 12, opacity: 0.7, marginTop: 6}}>
              未再生
            </div>
          )}
        </div>

        {/* 右：操作 */}
        <div style={{display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end"}}>
          <button
            onClick={() => void playPrevAction()}
            disabled={!canSkip}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #ccc",
              fontWeight: 700,
              opacity: canSkip ? 1 : 0.5
            }}
            title="前の曲へ（←）"
          >
            ◀ 前へ
          </button>

          <button
            onClick={stopAndResetAction}
            style={{padding: "6px 10px", borderRadius: 10, border: "1px solid #ccc"}}
            title="停止して先頭に戻す"
          >
            停止
          </button>

          <button
            onClick={() => void playNextAction()}
            disabled={!canSkip}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #ccc",
              fontWeight: 700,
              opacity: canSkip ? 1 : 0.5
            }}
            title="次の曲へ（→）"
          >
            次へ ▶
          </button>

          {/* 連続再生：スイッチ */}
          <label style={{display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none"}}>
            <span style={{fontSize: 13, opacity: 0.85}}>連続再生</span>

            <span
              style={{
                position: "relative",
                width: 44,
                height: 24,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
                background: isContinuous ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)",
                transition: "background 120ms ease",
              }}
            >
              <input
                type="checkbox"
                checked={isContinuous}
                onChange={toggleContinuousAction} // ※あなたが *Action に直してる場合
                style={{position: "absolute", inset: 0, opacity: 0, cursor: "pointer"}}
                aria-label="連続再生の切り替え"
              />

              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: isContinuous ? 22 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: isContinuous ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.70)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.35)", // これが効く
                  transition: "left 120ms ease, background 120ms ease",
                }}
              />
            </span>

            <span style={{fontSize: 12, opacity: 0.7}}>{isContinuous ? "ON" : "OFF"}</span>
          </label>

        </div>
      </div>

      {/* audio は挙動を変えないため、そのまま */}
      <div style={{marginTop: 10}}>
        <audio ref={audioRef} controls preload="none" style={{width: "100%"}}/>
      </div>
    </section>
  );
}
