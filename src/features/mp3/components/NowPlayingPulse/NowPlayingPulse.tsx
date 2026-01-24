import React  from "react";
import styles from "./NowPlayingPulse.module.scss";

type NowPlayingWaveProps = {
  isPaused?: boolean;
  children?: React.ReactNode;
};

export function NowPlayingPulse(props: NowPlayingWaveProps): React.JSX.Element {
  const {isPaused = false, children} = props;

  return (
    <span
      className={`${styles.npRing}${isPaused ? ` ${styles.isPaused}` : ""}`}
      aria-hidden="true">
      {children}
      {Array.from({length: 12}).map((_, i) => (
        <span key={i}/>
      ))}
    </span>
  );
}
