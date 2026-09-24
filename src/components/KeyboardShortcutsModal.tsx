import React from "react";
import { X, Keyboard, Command, Volume2, SkipForward, Play, Compass, Disc3, Search } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: "Global Navigation",
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
      shortcuts: [
        { key: "1", label: "Search & Browse Archive" },
        { key: "2", label: "Discover & Recommendations" },
        { key: "3", label: "My Music Vault & Playlists" },
        { key: "/", label: "Jump to Search Input from anywhere" },
        { key: "Esc", label: "Close modal / unfocus search (keybindings work when search is unfocused)" },
        { key: "↑ / ↓ in search", label: "Move through suggestions" },
        { key: "Enter in search", label: "Open top suggestion / run search" },
      ],
    },
    {
      title: "Audio & Playback",
      icon: <Play className="w-4 h-4 text-amber-400" />,
      shortcuts: [
        { key: "Space or K", label: "Play / Pause toggle" },
        { key: "J / L", label: "Previous / Next track" },
        { key: "← / →", label: "Seek -5s / +5s (Hold Shift: 15s)" },
        { key: "↑ / ↓", label: "Volume up / down (+5% / -5%)" },
        { key: "M", label: "Mute / Unmute audio" },
        { key: "S", label: "Toggle Shuffle queue" },
        { key: "R", label: "Cycle Repeat (Off → All → One)" },
      ],
    },
    {
      title: "Vault & Tools",
      icon: <Disc3 className="w-4 h-4 text-indigo-400" />,
      shortcuts: [
        { key: "C", label: "Capture direct stream or Archive URL" },
        { key: "B", label: "Backup & Export Vault data" },
        { key: "T", label: "Atmosphere theme & audio settings" },
        { key: "?", label: "Toggle this Keyboard Shortcuts cheatsheet" },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Keyboard className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="keyboard-shortcuts-title" className="text-lg font-semibold text-stone-100">
                Keyboard Navigation & Shortcuts
              </h2>
              <p className="text-xs text-stone-400">Full keyboard accessibility across all views</p>
            </div>
          </div>
          <button
            id="close-keyboard-shortcuts-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close shortcuts"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-2.5">
              <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-stone-200">
                {sec.icon}
                <span>{sec.title}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sec.shortcuts.map((sc) => (
                  <div
                    key={sc.key + sc.label}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-850/70 border border-stone-800/80 hover:border-stone-700 transition-colors"
                  >
                    <span className="text-xs text-stone-300 select-none pr-2">{sc.label}</span>
                    <kbd className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-stone-950 text-amber-400 border border-stone-700/80 shadow-xs whitespace-nowrap">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/40 flex items-center justify-between text-xs text-stone-400">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono">?</kbd> anywhere to toggle</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
