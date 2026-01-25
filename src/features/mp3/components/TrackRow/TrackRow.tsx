"use client";

import {ArtworkSquare}    from "@/features/mp3/components/Artwork/ArtworkSquare";
import {NowPlayingPulse}  from "@/features/mp3/components/NowPlayingPulse/NowPlayingPulse";
import type {AppCommands} from "@/hooks/useAppCommands";
import type {TrackView}   from "@/types/views";
import {Pause, Play}      from "lucide-react";
import React              from "react";
import styles             from "../TrackList/TrackList.module.scss";

type TrackRowProps = {
  /**
   * 表示識別子またはインデックスを表す数値。
   * この変数はオプションであり、複数の表示要素を参照したり区別したりするために使用できます。
   * （未指定なら index+1）
   */
  displayNo?: number;

  /**
   * `TrackView`クラスのインスタンスを表します。
   * これは、アプリケーション内の特定のトラックまたはパスに関する情報を管理および表示するために使用されます。
   *
   * この変数は通常、対応するトラックデータのレンダリングや操作に必要なロジックとUI要素をカプセル化します。
   * 例えば、詳細の表示、状態の監視、ユーザー操作の処理などが含まれます。
   *
   * `trackView`インスタンスは、トラック関連の機能が必要な大規模なUIコンポーネントやワークフローの一部として頻繁に利用されます。
   */
  trackView: TrackView;

  /**
   * コレクションや配列内でインデックス付けに使用される現在の位置または数値識別子を表します。
   * この変数は通常、その位置に基づいて特定の要素や位置を参照するために使用されます。
   */
  index: number;

  /**
   * 現在再生中のメディア項目の固有識別子を表します。
   * この値は通常、再生中のメディアを追跡または参照するために使用されます。
   */
  nowPlayingID: number;

  /**
   * メディア項目（例：動画や音声）が現在再生中かどうかを示します。
   * 再生がアクティブな場合は値が `true`、それ以外は `false` です。
   */
  isPlaying: boolean;

  /**
   * 実行可能なアプリケーションレベルのコマンドの集合を表します。
   * この変数は、AppCommandsインスタンス内にカプセル化された様々な機能や操作へのアクセスを提供します。
   */
  commands: AppCommands;

  /** 再生中の行だけ scrollIntoView したいので、TrackList側でrefを持つ */
  setNowItemAction?: (el: HTMLButtonElement | null) => void;
};

/**
 * トラック行コンポーネントを、再生コントロールとメタデータ表示付きでレンダリングします。.
 */
export function TrackRow(props: TrackRowProps): React.JSX.Element {
  const {
    displayNo,
    trackView: t,
    index,
    nowPlayingID,
    isPlaying,
    commands,
    setNowItemAction,
  } = props;

  const shownNo = displayNo ?? (index + 1);
  const isActive = nowPlayingID === t.item.id;

  return (
    <li
      key={t.item.id ?? index}
      className={styles.item}
      data-now-playing={isActive ? "1" : "0"}
    >
      <button
        ref={isActive ? (node) => setNowItemAction?.(node) : undefined}
        type="button"
        className={styles.rowButton}
        onClick={() => commands.playAtIndex(index)}
      >
        <span className={styles.colAction} aria-hidden>
          {isActive
            ? (isPlaying
              ? <NowPlayingPulse/>
              : <Pause size={20} strokeWidth={2.5} aria-hidden/>)
            : <Play size={20} strokeWidth={2.5} aria-hidden/>}
        </span>

        <span className={styles.colNo}>{shownNo}</span>

        <span className={styles.colArt} aria-hidden>
          <span className={styles.artBox} aria-hidden>
            <span className={styles.artInner}>
              <ArtworkSquare
                url={t.artworkUrl}
                fallbackText={t.displayTitle ?? ""}
                seed={t.displayTitle ?? ""}
              />
            </span>
          </span>
        </span>

        <span className={styles.colTitle} title={t.displayTitle ?? ""}>
          {t.displayTitle ?? "（無題）"}
        </span>

        <span className={styles.colYm}>{t.albumTitle}</span>
        <span className={styles.colOrig}>{t.originalArtist}</span>

        <span className={styles.colPath} title={t.item.path ?? ""}>
          {t.item.path ?? "なし"}
        </span>

      </button>
    </li>
  );
}
