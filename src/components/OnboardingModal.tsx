import React, { useState } from "react";
import { X, DownloadCloud, Disc3, Sliders, Database, Heart, ChevronRight, ChevronLeft } from "lucide-react";

const SLIDES = [
  {
    icon: <DownloadCloud className="w-6 h-6 text-amber-400" />,
    title: "Capture anything",
    body: "Paste any archive.org link or ID (press C) to pull full albums with tracks into your vault. Free, unlimited, yours.",
  },
  {
    icon: <Disc3 className="w-6 h-6 text-amber-400" />,
    title: "Vault, playlists, tiers",
    body: "Rank albums S–F, build playlists, share them as short links. Everything lives in your browser — no account, ever.",
  },
  {
    icon: <Sliders className="w-6 h-6 text-amber-400" />,
    title: "Studio sound",
    body: "10-band EQ with savable profiles (T in settings), true-peak leveling, and a visualizer that follows your theme.",
  },
  {
    icon: <Database className="w-6 h-6 text-amber-400" />,
    title: "Offline for real",
    body: "Pin any track or album for subway-and-flight playback. Autoplay keeps the music going when the queue runs dry.",
  },
  {
    icon: <Heart className="w-6 h-6 text-rose-400" />,
    title: "Keep it alive",
    body: "ArchiveTuna is free and solo-built. If it earns a place in your day, a sponsorship keeps it that way — a tiny reminder appears after your first hour of listening, dismissable forever.",
  },
];

interface OnboardingModalProps {
  onDone: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onDone }) => {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-center space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1.5">
            {SLIDES.map((_, d) => (
              <span key={d} className={`w-1.5 h-1.5 rounded-full ${d === i ? "bg-amber-400" : "bg-stone-700"}`} />
            ))}
          </div>
          <button onClick={onDone} className="text-stone-500 hover:text-stone-300 cursor-pointer" aria-label="Skip tour">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
          {s.icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-100">{s.title}</h2>
          <p className="text-xs text-stone-400 leading-relaxed mt-1.5">{s.body}</p>
        </div>
        {last && (
          <a
            href="https://github.com/sponsors/cyberbuddhy"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold hover:bg-rose-500/25 transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Sponsor ArchiveTuna</span>
          </a>
        )}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setI(Math.max(0, i - 1))}
            disabled={i === 0}
            className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 disabled:opacity-30 flex items-center space-x-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <button
            onClick={() => (last ? onDone() : setI(i + 1))}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1"
          >
            <span>{last ? "Start listening" : "Next"}</span>
            {!last && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem("tuna_onboarded") === "1";
  } catch {
    // Storage blocked: show the tour so first-run users still get oriented
    return false;
  }
}
export function markOnboardingDone() {
  try {
    localStorage.setItem("tuna_onboarded", "1");
  } catch { /* noop */ }
}