// src/components/ui/ToggleControl/ToggleControl.tsx
"use client";

import React  from "react";
import styles from "./ToggleControl.module.scss";

export type ToggleControlProps = {
  checked: boolean;
  onChangeAction: (next: boolean) => void;
  disabled?: boolean;

  /** 必須: ラベル表示を外側でやる前提なので、読み上げ用だけ渡す */
  ariaLabel: string;
};

/**
 * クリックすると2つの状態を切り替えるトグル制御コンポーネント。
 */
export function ToggleControl(props: ToggleControlProps): React.JSX.Element {
  const {checked, onChangeAction, disabled = false, ariaLabel} = props;

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={ariaLabel}
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChangeAction(!checked);
      }}
    >
      <span className={styles.knob} aria-hidden/>
    </button>
  );
}
