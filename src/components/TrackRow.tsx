import {NowPlayingPulse} from "@/components/NowPlayingPulse";
import {TrackView}       from "@/types/views";
import Image             from "next/image";
import React             from "react";

const THUMB = 20;

export function TrackRow(props: {
  view: TrackView;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (id: number) => void;
}): React.JSX.Element {
  const {view, index, isActive, isPlaying, onPlay} = props;

  const handleActivate = (): void => {
    onPlay(index);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTableRowElement> = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleActivate();
  };

  return (
    <tr
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`再生: ${view.displayTitle}`}
      style={{
        cursor: "pointer",
        userSelect: "none",
        touchAction: "manipulation",
        background: isActive ? "rgba(0,0,0,0.06)" : "transparent",
      }}
      className="hover:bg-black/5"
    >

      {/* action */}
      <td style={{...tdStyle, padding: 0}}>
        <div style={{display: "grid", placeItems: "center"}}>
          <div
            style={{
              height: 20,
              width: 28,
              padding: 0,
              borderRadius: 999,
              border: isActive
                ? "1px solid var(--list-action-border-active)"
                : "1px solid var(--list-action-border)",
              background: isActive ? "var(--list-action-bg-active)" : "transparent",
              color: "var(--foreground)",
              fontWeight: 800,
              lineHeight: "20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="この曲を再生"
          >
            {isActive ? (isPlaying ? <NowPlayingPulse/> : "⏸") : "▶"}
          </div>
        </div>
      </td>

      <td style={{padding: "auto", textAlign: "right"}}>{index + 1}</td>

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
          {view.coverUrl ? (
            <Image
              src={view.coverUrl}
              alt=""
              width={THUMB}
              height={THUMB}
              unoptimized
              style={{width: "100%", height: "100%", objectFit: "cover"}}
            />
          ) : (
            <span
              style={{
                border: "1px solid var(--no-fg)",
                fontSize: 14,
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
              {view.orderLabel ?? view.originalArtist ?? "No"}
            </span>
          )}
        </div>
      </td>


      {/* title */}
      <td style={tdStyle}>
        <div
          style={{
            ...oneLine15,
            fontWeight: isPlaying ? 950 : oneLine15.fontWeight,
            textShadow: isPlaying ? "0 1px 0 var(--panel-hover)" : "none",
          }}
          title={view.displayTitle}
        >
          {view.displayTitle}
        </div>
      </td>


      {/* releaseOrder */}
      <td style={tdStyle}>
        <div style={oneLine12} title={view.orderLabel}>
          {view.orderLabel}
        </div>
      </td>

      {/* originalArtist */}
      <td style={tdStyle}>
        <div style={oneLine12} title={view.originalArtist || "—"}>
          {view.originalArtist || "—"}
        </div>
      </td>

    </tr>
  );
}

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
