"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Plays a short confirmation sound when a to-do is checked off.
 *
 * Tries to play /sounds/check.mp3 (drop your own file there — see
 * public/sounds/README.md). If the file isn't present yet, it falls back to a
 * soft synthesized "tick" via the Web Audio API, so there's always feedback.
 */
export function useCheckSound(src = "/sounds/check.mp3") {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasFileRef = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 0.5;
    const onReady = () => {
      hasFileRef.current = true;
    };
    audio.addEventListener("canplaythrough", onReady);
    audioRef.current = audio;
    return () => {
      audio.removeEventListener("canplaythrough", onReady);
    };
  }, [src]);

  const playSynth = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = ctxRef.current ?? new Ctx();
      ctxRef.current = ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      /* audio not available — silently ignore */
    }
  }, []);

  return useCallback(() => {
    const audio = audioRef.current;
    if (audio && hasFileRef.current) {
      audio.currentTime = 0;
      audio.play().catch(() => playSynth());
    } else {
      playSynth();
    }
  }, [playSynth]);
}
