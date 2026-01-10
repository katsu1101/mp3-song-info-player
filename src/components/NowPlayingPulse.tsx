import React  from "react";
import styles from "./NowPlayingRing.module.css";

type NowPlayingWaveProps = {
  isPaused?: boolean;
};

export function NowPlayingPulse(props: NowPlayingWaveProps): React.JSX.Element {
  const {isPaused = false} = props;

  return (
    <span
      className={`${styles.npRing}${isPaused ? ` ${styles.isPaused}` : ""}`}
      aria-hidden="true">
       {Array.from({length: 12}).map((_, i) => (
         <span key={i}/>
       ))}
    </span>
  );
}
