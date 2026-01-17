"use client";

import React, {useMemo, useState} from "react";
import styles                     from "./ArtworkSquare.module.scss";

type ArtworkSquareProps = {
  url: string | null | undefined;
  radius?: number;

  // 任意: 既存互換のため残してOK（渡せないなら省略でOK）
  size?: number;

  fallbackText?: string | null;
  seed?: string | null;
};

type CssVars = React.CSSProperties & {
  ["--hue"]?: number | string;
};

const pickFallbackLabel = (text: string | null | undefined): string => {
  const raw = (text ?? "").trim();
  if (!raw) return "♪";

  // 1) 先頭の「括弧/記号/空白っぽいもの」をスキップ
  // - 【「（『《〈〔［{ 等の括弧
  // - 記号類（!?,.・♪など）
  // - 空白（通常/全角）
  // NOTE: 記号を増やしたい場合はここに足す
  const SKIP_HEAD =
    /^[\s\u3000\[\](){}<>「」『』【】〔〕［］〈〉《》»“”‘’\uFF08\uFF09\uFF5B\uFF5D\u3014-\u301B\u301D\u301F\uFF5F\uFF60–—‐-‒~〜・…:;'"!！?？,，.。\/\\|]+/u;

  const stripped = raw.replace(SKIP_HEAD, "").trim();
  if (!stripped) return "♪";

  // 2) 先頭が数字 → 連続する数字を全部（ASCII/全角）
  const digitMatch = stripped.match(/^[0-9０-９]+/);
  if (digitMatch?.[0]) return digitMatch[0];

  // 3) 先頭がアルファベット → 連続する英字を最大3文字（ASCII/全角）
  const alphaMatch = stripped.match(/^[A-Za-zＡ-Ｚａ-ｚ]+/);
  if (alphaMatch?.[0]) return alphaMatch[0].slice(0, 3);

  // 4) その他 → 見た目の1文字（絵文字/結合文字に強い）
  try {
    const seg = new Intl.Segmenter("ja", {granularity: "grapheme"});
    const first = seg.segment(stripped)[Symbol.iterator]().next().value?.segment;
    if (typeof first === "string" && first) return first;
  } catch {
    // fallback
  }

  return Array.from(stripped)[0] ?? "♪";
};


const hashToHue = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
};

const calcFontInViewBox = (label: string): number => {
  const n = Math.max(1, Math.min(6, label.length));
  if (n === 1) return 56;
  if (n === 2) return 48;
  if (n === 3) return 40;
  if (n === 4) return 34;
  return 30;
};

export const ArtworkSquare = (props: ArtworkSquareProps): React.ReactElement => {
  const {url, size, radius = 12, fallbackText, seed} = props;

  const [isBroken, setIsBroken] = useState(false);

  const showFallback = !url || isBroken;

  const label = useMemo(
    () => pickFallbackLabel(fallbackText ?? seed ?? null),
    [fallbackText, seed]
  );

  const hue = useMemo(() => {
    const s = (seed ?? fallbackText ?? label).trim();
    return hashToHue(s || label);
  }, [seed, fallbackText, label]);

  const boxStyle: CssVars = {
    width: size ?? "100%",
    height: size ?? "100%",
    borderRadius: radius,
    "--hue": hue,
    objectFit: "cover",
    objectPosition: "top"
  };

  if (showFallback) {
    const fontSize = calcFontInViewBox(label);

    return (
      <div className={styles.fallback} style={boxStyle} aria-label="artwork placeholder">
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden style={{display: "block"}}>
          <defs>
            <radialGradient cx="20%" cy="10%" r="80%">
              <stop offset="0%" stopColor={`hsl(${hue} 90% 65% / 0.90)`}/>
              <stop offset="70%" stopColor="transparent"/>
            </radialGradient>
            <radialGradient cx="90%" cy="85%" r="90%">
              <stop offset="0%" stopColor={`hsl(${(hue + 60) % 360} 90% 55% / 0.85)`}/>
              <stop offset="75%" stopColor="transparent"/>
            </radialGradient>
          </defs>

          <rect width="100" height="100" fill="url(#g1)"/>
          <rect width="100" height="100" fill="url(#g2)"/>
          <rect width="100" height="100" fill="rgba(255,255,255,0.10)"/>

          <text
            x="50"
            y="52"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fontWeight={900}
            fill="rgba(255,255,255,0.96)"
            style={{
              paintOrder: "stroke",
              stroke: "rgba(0,0,0,0.25)",
              strokeWidth: 2,
            }}
          >
            {label}
          </text>
        </svg>
      </div>
    );
  }

  return (
    // サイズをCSSでコントロールしているためImageは使えない
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.img}
      src={url}
      alt=""
      // sizeが無いなら属性は付けない（親CSSに任せる）
      {...(size ? {width: size, height: size} : {})}
      style={boxStyle}
      onError={() => setIsBroken(true)}
      loading="lazy"
      decoding="async"
    />
  );
};
