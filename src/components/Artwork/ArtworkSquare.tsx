"use client";

import Image  from "next/image";
import React  from "react";
import styles from "./ArtworkSquare.module.scss";

type ArtworkSquareProps = {
  url: string | null;
  size: number;        // px
  radius?: number;     // px
  alt?: string;        // 通常は空でOK
};

export function ArtworkSquare({url, size, radius = 12, alt = ""}: ArtworkSquareProps): React.JSX.Element {
  return (
    <span
      className={styles.box}
      aria-hidden
      style={{
        // CSS変数でサイズ/角丸を注入（再利用しやすい）
        ["--art-size" as never]: `${size}px`,
        ["--art-radius" as never]: `${radius}px`,
      }}
    >
      <span className={styles.inner} aria-hidden>
        {url ? (
          <Image
            src={url}
            alt={alt}
            fill
            unoptimized
            style={{
              objectFit: "cover",
              objectPosition: "50% 0%",
            }}
          />
        ) : null}
      </span>
    </span>
  );
}