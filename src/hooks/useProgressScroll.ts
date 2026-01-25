// src/hooks/useProgressScroll.ts
"use client";

import React, {useEffect, useRef} from "react";

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

type UseProgressScrollArgs = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  scrollRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;

  // ユーザー操作で一時停止する時間
  pauseMs?: number;

  // timeupdate だけだと粗いとき用
  useAnimationFrame?: boolean;

  // ✅ 追加: デッドゾーン比率（0〜0.49）
  deadZoneRatio?: number; // 例: 0.05 = 前後5%
};

/**
 * 要素のスクロールをオーディオ要素の再生進行状況と同期させます。
 *
 * @param {UseProgressScrollArgs} args - 動作を設定するための引数。
 * @param {React.RefObject<HTMLAudioElement>} args.audioRef - 再生進捗をソースとして使用するオーディオ要素への参照。
 * @param {React.RefObject<HTMLElement>} args.scrollRef - 再生進行状況を反映するスクロール可能要素への参照。
 * @param {boolean} args.enabled - 同期動作を有効にするかどうかを決定します。
 * @param {number} [args.pauseMs=2500] - ユーザー操作後のスクロールを一時停止する時間（ミリ秒単位）。
 * @param {boolean} [args.useAnimationFrame=false] - より滑らかな更新のために `requestAnimationFrame` を使用するかどうか。false の場合、更新はオーディオの `timeupdate` および `seeked` イベントに連動する。
 * @param {number} [args.deadZoneRatio=0.15] - オーディオ再生の開始時と終了時にスクロールがロックされる「デッドゾーン」の比率。0 から 0.49 の間で指定してください。
 */
export const useProgressScroll = (args: UseProgressScrollArgs): void => {
  const {
    audioRef,
    scrollRef,
    enabled,
    pauseMs = 2500,
    useAnimationFrame = false,
    deadZoneRatio = 0.15, // ✅ 追加
  } = args;

  const pauseUntilMsRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const pause = () => {
      pauseUntilMsRef.current = Date.now() + pauseMs;
    };

    // 触ったら一時停止（ホイール/タッチ/ドラッグ）
    el.addEventListener("wheel", pause, {passive: true});
    el.addEventListener("touchstart", pause, {passive: true});
    el.addEventListener("pointerdown", pause, {passive: true});

    return () => {
      el.removeEventListener("wheel", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("pointerdown", pause);
    };
  }, [scrollRef, pauseMs]);

  useEffect(() => {
    const audio = audioRef.current;
    const el = scrollRef.current;
    if (!audio || !el) return;
    if (!enabled) return;

    const update = () => {
      if (Date.now() < pauseUntilMsRef.current) return;

      const duration = audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      const maxScrollTop = el.scrollHeight - el.clientHeight;
      if (maxScrollTop <= 0) return;

      const p = clamp(audio.currentTime / duration, 0, 1);

      // ✅ デッドゾーン（前後は固定）
      const d = clamp(deadZoneRatio, 0, 0.49);

      let scrollProgress: number;
      if (p <= d) {
        scrollProgress = 0;
      } else if (p >= 1 - d) {
        scrollProgress = 1;
      } else {
        const span = 1 - 2 * d;
        scrollProgress = (p - d) / span; // 0..1
      }

      el.scrollTop = scrollProgress * maxScrollTop;
    };

    const stopRaf = () => {
      if (rafIdRef.current === null) return;
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };

    if (useAnimationFrame) {
      const tick = () => {
        update();
        rafIdRef.current = requestAnimationFrame(tick);
      };
      rafIdRef.current = requestAnimationFrame(tick);
      return () => stopRaf();
    }

    // 軽い版：timeupdate で更新
    const onTimeUpdate = () => update();
    audio.addEventListener("timeupdate", onTimeUpdate);

    // seek した時に即反映したい
    audio.addEventListener("seeked", onTimeUpdate);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("seeked", onTimeUpdate);
    };
  }, [audioRef, scrollRef, enabled, useAnimationFrame, deadZoneRatio]);
};
