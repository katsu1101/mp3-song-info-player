"use client";

import {NowPlayingPulse} from "@/components/NowPlayingPulse";
import {useSettings}     from "@/components/Settings/SettingsProvider";
import {PlayActions}                   from "@/types/actions";
import {TrackView}                     from "@/types/views";
import Image                           from "next/image";
import React, {JSX, useEffect, useRef} from "react";

/**
 * トラックリストコンポーネントのプロパティを表します。
 */
type TrackListProps = {
  trackViews: readonly TrackView[];
  playActions: PlayActions;
  nowPlayingID: number;
  isPlaying: boolean;
};

/**
 * トラックリストコンポーネントをレンダリングし、トラックの一覧を表示します。各トラックには、タイトル、アルバム、オリジナルアーティスト、ファイルパスなどの詳細情報が含まれます。
 * トラックを再生するためのインタラクティブな要素を備え、現在再生中のトラックをハイライト表示します。
 *
 * @param {TrackListProps} props - TrackList コンポーネントに渡されるプロパティ。
 * @param {Array} props.trackViews - 表示する各トラックの詳細を含むトラックビューオブジェクトの配列。
 * @param {Object} props.playActions - 特定のインデックスでトラックを再生するなど、再生アクション用の関数を格納したオブジェクト。
 * @param {string | null} props.nowPlayingID - 現在再生中のトラックのID。リスト内でハイライト表示するために使用されます。
 *
 * @return {JSX.Element} トラックの一覧とその詳細情報を表示するレンダリング済み TrackList コンポーネント。
 */
export function TrackList(props: TrackListProps): JSX.Element {
  const {trackViews, playActions, nowPlayingID, isPlaying} = props;

  const nowRowRef = useRef<HTMLTableRowElement | null>(null);

  const getScrollBehavior = (): ScrollBehavior => {
    // 省エネ設定の人は auto
    if (typeof window === "undefined") return "auto";
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
  };

  const {settings} = useSettings();

  const showFilePath = settings.ui.showFilePath;

  const THUMB = 20;

  useEffect(() => {
    if (!nowPlayingID) return;
    const row = nowRowRef.current;
    if (!row) return;

    row.scrollIntoView({
      behavior: getScrollBehavior(),
      block: "nearest",
      inline: "nearest",
    });
  }, [nowPlayingID]);

  return (
    <section style={{marginTop: 12}}>

      {trackViews.length === 0 ? (
        <p style={{marginTop: 10, opacity: 0.7, fontSize: 13}}>曲がありません（フォルダを選択してください）</p>
      ) : (
        <div
          data-scroll="song-list"
          style={{
            marginTop: 8,
            maxWidth: "100%",
            overflowX: showFilePath ? "auto" : "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {[
                <col key="no" style={{width: 28}}/>,
                <col key="art" style={{width: 28}}/>,
                <col key="action" style={{width: 32}}/>,
                // ✅ ここが肝：曲名は width 指定しない（余りを全部吸う）
                <col key="title"/>,

                // ✅ 右側は “狭い時は縮む / 広い時は広がりすぎない” clamp が強い
                <col key="ym" style={{width: "clamp(80px, 9vw, 120px)"}}/>,
                <col key="orig" style={{width: "clamp(60px, 9vw, 100px)"}}/>,

                ...(showFilePath ? [<col key="path" style={{width: 260}}/>] : []),
              ]}
            </colgroup>


            <thead>
            <tr style={{borderBottom: "1px solid var(--list-border)"}}>
              <th style={thStyle}>#</th>
              <th style={thStyle} aria-label="ジャケット"/>
              <th style={{...thStyle, textAlign: "right"}}>再生</th>
              <th style={thStyle}>曲名</th>
              <th style={thStyle}>アルバム</th>
              <th style={thStyle}>原曲</th>
              {showFilePath ? <th style={thStyle}>ファイル</th> : null}
            </tr>
            </thead>

            <tbody>
            {trackViews.map((t, index) => {
              const isNowPlaying = nowPlayingID === t.item.id;
              const releaseText = t.orderLabel;
              const originalText = t.originalArtist ?? "";

              return (
                <tr
                  key={t.item.path}
                  ref={(el) => {
                    if (isNowPlaying) nowRowRef.current = el;
                  }}
                  aria-current={isNowPlaying ? "true" : undefined}
                  style={{
                    borderBottom: "1px solid var(--list-border-soft)",
                    height: 24,
                    background: isNowPlaying
                      ? "linear-gradient(90deg, var(--sel-bg) 0%, transparent 70%)"
                      : "transparent",
                    boxShadow: isNowPlaying ? "inset 0 0 0 1px var(--sel-glow)" : "none",
                    transition: "background 120ms ease, box-shadow 120ms ease",
                    scrollMarginTop: 80,
                  }}
                >
                  <td>{index + 1}</td>
                  {/* art */}
                  <td
                    style={{
                      ...tdStyle,
                      padding: 0,
                      borderLeft: "3px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        width: THUMB,
                        height: THUMB,
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid var(--list-chip-border)",
                        background: "var(--list-chip-bg)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {t.coverUrl ? (
                        <Image
                          src={t.coverUrl}
                          alt=""
                          width={THUMB}
                          height={THUMB}
                          unoptimized
                          style={{width: "100%", height: "100%", objectFit: "cover"}}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                            letterSpacing: "0.02em",
                            color: "var(--no-fg)",
                            background: "var(--no-bg)",
                            borderRadius: 6,
                            padding: "1px 4px",
                            lineHeight: 1.1,
                          }}
                          aria-label="ジャケットなし"
                          title="ジャケットなし"
                        >
                          No
                        </span>
                      )}
                    </div>
                  </td>

                  {/* action */}
                  <td style={{...tdStyle, padding: 0}}>
                    <div style={{display: "grid", placeItems: "center"}}>
                      <button
                        onClick={() => void playActions.playAtIndex(index)}
                        style={{
                          height: 20,
                          width: 28,
                          padding: 0,
                          borderRadius: 999,
                          border: isNowPlaying
                            ? "1px solid var(--list-action-border-active)"
                            : "1px solid var(--list-action-border)",
                          background: isNowPlaying ? "var(--list-action-bg-active)" : "transparent",
                          color: "var(--foreground)",
                          fontWeight: 800,
                          lineHeight: "20px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="この曲を再生"
                      >
                        {isNowPlaying ? (isPlaying ? <NowPlayingPulse /> : "⏸") : "▶"}
                      </button>
                    </div>
                  </td>

                  {/* title */}
                  <td style={tdStyle}>
                    <div
                      style={{
                        ...oneLine15,
                        fontWeight: isNowPlaying ? 950 : oneLine15.fontWeight,
                        textShadow: isNowPlaying ? "0 1px 0 rgba(0,0,0,0.08)" : "none",
                      }}
                      title={t.displayTitle}
                    >
                      {t.displayTitle}
                    </div>
                  </td>

                  {/* releaseOrder */}
                  <td style={tdStyle}>
                    <div style={oneLine12} title={releaseText}>
                      {releaseText}
                    </div>
                  </td>

                  {/* originalArtist */}
                  <td style={tdStyle}>
                    <div style={oneLine12} title={originalText}>
                      {originalText || "—"}
                    </div>
                  </td>

                  {/* path (optional) */}
                  {showFilePath ? (
                    <td style={tdStyle}>
                      <div style={oneLine11dim} title={t.item.path}>
                        {t.item.path}
                      </div>
                    </td>
                  ) : null}

                </tr>
              );
            })}
            </tbody>

          </table>
        </div>
      )}
    </section>
  );
}

/**
 * テーブルヘッダー（th）要素に適用されるスタイルを表します。
 * パディング、フォントサイズ、フォントウェイト、不透明度、テキスト配置、および空白処理に関するCSSプロパティを含みます。
 */
const thStyle: React.CSSProperties = {
  padding: "2px 6px",
  fontSize: 11,
  fontWeight: 800,
  opacity: 0.85,
  textAlign: "left",
  whiteSpace: "nowrap",
};

/**
 * テーブルセル（td）要素に適用されるスタイルプロパティを表します。
 * このオブジェクトは、要素のレイアウトと外観を定義するために使用されます。
 */
const tdStyle: React.CSSProperties = {
  padding: "0 6px",
  verticalAlign: "middle",
  lineHeight: "24px",      // ✅ 行高に吸着させる
};

/**
 * テキスト関連のプロパティを設定するためのCSSスタイルオブジェクト。
 *
 * `oneLine15`オブジェクトは、単一行のテキストに適用される特定のスタイルを定義します。
 */
const oneLine15: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  lineHeight: "24px",      // ✅ ここも吸着
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/**
 * 特定の視覚的外観でテキストをスタイル設定するためのCSSプロパティオブジェクト。
 */
const oneLine12: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  lineHeight: 1.1,           // ✅ 行間を締める
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/**
 * テキスト要素が特定のフォントサイズ、透明度、およびオーバーフロー動作で単一行に表示されるようにするCSSスタイル。
 * このスタイルには、オーバーフローしたテキストを省略記号で切り詰める設定が含まれます。
 */
const oneLine11dim: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.55,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
