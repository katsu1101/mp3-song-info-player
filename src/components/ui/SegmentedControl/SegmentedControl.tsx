"use client";

import React  from "react";
import styles from "./SegmentedControl.module.scss";

/**
 * セグメントコントロールコンポーネント内のオプションを表します。
 *
 * @template TValue PropertyKey を拡張し、オプションの値の型を表します。
 * @property {TValue} value このオプションに関連する固有の価値。
 * @property {string} label オプションに表示されるテキストラベル。
 * @property {React.ReactNode} [icon] ラベルの横に表示されるオプションのアイコン。
 * @property {boolean} [disabled] オプションが無効化され、非対話的であるかどうかを示します。
 */
export type SegmentedControlOption<TValue extends PropertyKey> = {
  value: TValue;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

/**
 * SegmentedControl コンポーネントの設定プロパティ。
 *
 * @template TValue SegmentedControl の値の型。
 *
 * @property {string} [label] コントロールの上部または近くに表示されるオプションのラベル。
 * @property {TValue} value SegmentedControl で現在選択されている値。
 * @property {readonly SegmentedControlOption<TValue>[]} options SegmentedControl で選択可能なオプションの一覧。
 * @property {(next: TValue) => void} onChangeAction 選択された値が変更されたときにトリガーされるコールバック関数。
 * @property {string} [ariaLabel] SegmentedControl のアクセシビリティラベル。ラベルが提供されていない場合、強く推奨され、ほぼ必須です。
 * @property {"start" | "end"} [align] ボタングループの右側での配置を指定します。有効なオプションは「start」または「end」です。
 * @property {boolean} [stackOnNarrow] 狭い幅でアイテムを縦方向に積み重ねるかどうかを示します。これにより、押しつぶされたりテキストが重なったりするレイアウトの問題を回避できます。
 * @property {boolean} [iconOnly] コントロールにアイコンのみを表示するかどうかを示します。スクリーンリーダー向けのラベルはアクセシビリティを確保するため引き続き提供されます。
 */
export type SegmentedControlProps<TValue extends PropertyKey> = {
  /**
   * オプションの文字列で、テキストラベルを表します。
   * UI要素の命名や識別など、表示目的で使用できます。
   */
  label?: string;

  value: TValue;
  options: readonly SegmentedControlOption<TValue>[];
  onChangeAction: (next: TValue) => void;

  /** アクセシビリティ用。labelが無い時は必須に近い */
  ariaLabel?: string;

  /** 右側ボタン群の寄せ */
  align?: "start" | "end";

  /** 狭い幅で縦積みにする（縦書き化や潰れを避ける） */
  stackOnNarrow?: boolean;

  /** アイコンだけ表示したい場合（ラベルはSRに残す） */
  iconOnly?: boolean;
};

/**
 * 複数の選択肢から選択できるセグメントコントロールコンポーネントをレンダリングします。
 *
 * @return {React.JSX.Element} セグメント化された制御コンポーネント。
 */
export function SegmentedControl<TValue extends PropertyKey>(
  props: SegmentedControlProps<TValue>
): React.JSX.Element {
  const {
    label,
    value,
    options,
    onChangeAction,
    ariaLabel,
    align = "end",
    stackOnNarrow = true,
    iconOnly = false,
  } = props;

  const groupLabel = ariaLabel ?? label ?? "segmented-control";

  return (
    <div
      className={styles.root}
      data-align={align}
      data-stack={stackOnNarrow ? "1" : "0"}
    >
      {label ? <span className={styles.label}>{label}</span> : null}

      <div className={styles.group} role="group" aria-label={groupLabel}>
        {options.map((opt) => {
          const isSelected = opt.value === value;

          return (
            <button
              key={String(opt.value)}
              type="button"
              className={styles.button}
              aria-pressed={isSelected}
              aria-label={opt.label}
              title={opt.label}
              disabled={Boolean(opt.disabled)}
              onClick={() => {
                if (opt.disabled) return;
                onChangeAction(opt.value);
              }}
            >
              {opt.icon ? (
                <span className={styles.icon} aria-hidden>
                  {opt.icon}
                </span>
              ) : null}

              {/* iconOnlyでもアクセシビリティは aria-label/title で担保 */}
              {!iconOnly ? <span className={styles.text}>{opt.label}</span> : null}

              {/* iconOnly の時だけ SR に文字を残したい場合 */}
              {iconOnly ? <span className={styles.srOnly}>{opt.label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
