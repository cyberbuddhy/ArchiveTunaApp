import React, { useEffect, useRef, useState } from "react";
import { audioEngine } from "../services/audioEngine";

type VizMode = "bars" | "wave" | "ps1";
const MODES: VizMode[] = ["bars", "wave", "ps1"];
const MODE_KEY = "archivetuna_viz_mode";
// Music energy lives in the low bins; the top ~45% is near-silence, so all
// modes only read the active lower slice instead of drawing a dead tail.
const USE_RATIO = 0.55;
const W = 220;
const H = 36;

function loadMode(): VizMode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (m === "wave" || m === "ps1" || m === "bars") return m;
  } catch { /* noop */ }
  return "bars";
}

export const Waveform: React.FC<{ playing: boolean }> = ({ playing }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<VizMode>(loadMode);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let frame = 0;
    let accent = "#f59e0b";
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // PS1-mode particles: fixed pool, no allocation in the loop.
    const dots = Array.from({ length: 34 }, (_, i) => ({
      a: (i / 34) * Math.PI * 2,
      r: 8 + ((i * 7) % 9),
      s: 0.008 + ((i * 13) % 10) * 0.002,
    }));

    const readAccent = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--color-accent-main").trim();
      if (v) accent = v;
    };
    readAccent();

    const levelOf = (d: Uint8Array, from: number, to: number) => {
      let sum = 0;
      const s = Math.max(0, Math.floor(from));
      const e = Math.min(d.length, Math.max(s + 1, Math.floor(to)));
      for (let k = s; k < e; k++) sum += d[k];
      return sum / ((e - s) * 255);
    };

    const drawIdle = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, H / 2 - 1, W, 2);
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      frame++;
      if (frame % 120 === 0) readAccent();
      const a = audioEngine.getAnalyser();
      const m = modeRef.current;
      if (!a || !playing) {
        if (frame % 10 === 1) drawIdle();
        return;
      }
      const freq = new Uint8Array(a.frequencyBinCount);
      a.getByteFrequencyData(freq);
      const use = Math.max(8, Math.floor(freq.length * USE_RATIO));
      ctx.clearRect(0, 0, W, H);

      if (m === "wave") {
        // WMP scope: time-domain oscilloscope line.
        const td = new Uint8Array(a.fftSize);
        a.getByteTimeDomainData(td);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const step = Math.max(1, Math.floor(td.length / W));
        for (let x = 0; x < W; x += 2) {
          const v = td[Math.min(td.length - 1, x * step)] / 255;
          const y = H - v * H;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      if (m === "ps1") {
        // PS1 disc-player flavor: pulsing rings + orbiting particles, energy-driven.
        const bass = levelOf(freq, 0, use * 0.25);
        const mid = levelOf(freq, use * 0.25, use * 0.6);
        const cx = W / 2;
        const cy = H / 2;
        ctx.strokeStyle = accent;
        for (let r = 0; r < 3; r++) {
          const rad = 5 + r * 5 + bass * 7 + Math.sin(frame * 0.05 + r * 2.1) * 1.5;
          ctx.globalAlpha = 0.75 - r * 0.2;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1.5, rad), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        for (const d of dots) {
          d.a += d.s * (1 + mid * 4);
          const rad = d.r + bass * 6;
          const x = cx + Math.cos(d.a) * rad * 2.4;
          const y = cy + Math.sin(d.a) * rad * 0.85;
          if (x < 0 || x > W || y < 0 || y > H) continue;
          ctx.fillRect(x, y, 1.6, 1.6);
        }
        return;
      }

      // WMP bars across the active spectrum slice.
      const BARS = 40;
      ctx.fillStyle = accent;
      const w = W / BARS;
      for (let i = 0; i < BARS; i++) {
        const v = levelOf(freq, (i / BARS) * use, ((i + 1) / BARS) * use);
        const h = Math.max(3, v * H);
        ctx.fillRect(i * w + 1, (H - h) / 2, w - 2, h);
      }
    };

    if (reduced) {
      drawIdle();
      return;
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [playing, mode]);

  const cycle = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch { /* noop */ }
  };

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      role="img"
      aria-label={`Audio visualizer, ${mode} mode. Activate to switch mode.`}
      title={`Visualizer: ${mode} (click to switch)`}
      onClick={cycle}
      className="rounded-md bg-stone-900/60 border border-stone-800 cursor-pointer"
    />
  );
};
