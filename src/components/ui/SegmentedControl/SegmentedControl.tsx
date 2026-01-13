"use client";

import React  from "react";
import styles from "./SegmentedControl.module.scss";

export type SegmentedControlOption<TValue extends PropertyKey> = {
  value: TValue;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export type SegmentedControlProps<TValue extends PropertyKey> = {
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
