"use client";

import Image from "next/image";
import React from "react";

type TrackItem = {
  path: string;
};

export type TrackViewLike = {
  item: TrackItem;
  index: number;
  displayTitle: string;
  releaseOrder: string;
  originalArtist?: string | null;
  coverUrl?: string | null;
};

type TrackListProps = {
  trackViews: readonly TrackViewLike[];
  showFilePath: boolean;

  mp3Count: number;
  totalSizeBytes: number;

  onPlayAtIndexAction: (index: number) => void | Promise<void>;
};

const formatMegaBytes = (bytes: number): string => {
  const megaBytes = bytes / (1024 * 1024);
  return `${megaBytes.toFixed(2)} MB`;
};

export function TrackList(props: TrackListProps) {
  const {trackViews, showFilePath, mp3Count, totalSizeBytes, onPlayAtIndexAction} = props;

  return (
    <section style={{marginTop: 16}}>
      {/* サマリー */}
      <div style={{display: "flex", gap: 16, flexWrap: "wrap"}}>
        <div>MP3件数: <b>{mp3Count}</b></div>
        <div>合計サイズ: <b>{formatMegaBytes(totalSizeBytes)}</b></div>
      </div>

      {/* リスト */}
      {trackViews.length === 0 ? (
        <p style={{marginTop: 12, opacity: 0.7}}>曲がありません（フォルダを選択してください）</p>
      ) : (
        <ul style={{marginTop: 12, paddingLeft: 0, listStyle: "none"}}>
          {trackViews.map((t) => (
            <li
              key={t.item.path}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {/* ジャケ */}
              <div style={{
                width: 44, height: 44, borderRadius: 8, border: "1px solid #ddd",
                overflow: "hidden", display: "grid", placeItems: "center",
                background: "#fafafa", flex: "0 0 auto",
              }}>
                {t.coverUrl ? (
                  <Image
                    src={t.coverUrl}
                    alt=""
                    width={44}
                    height={44}
                    unoptimized
                    style={{width: "100%", height: "100%", objectFit: "cover"}}
                  />
                ) : (
                  <span style={{fontSize: 12, opacity: 0.6}}>No Art</span>
                )}
              </div>

              {/* 情報 */}
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

              {/* 操作 */}
              <button
                onClick={() => void onPlayAtIndexAction(t.index)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  flex: "0 0 auto",
                  fontWeight: 700,
                }}
                title="この曲を再生"
              >
                ▶ 再生
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
