import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Palette,
  Sliders,
  HardDrive,
  Check,
  Volume2,
  Clock,
  Radio,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Moon,
  Gauge,
  Wifi,
  Waves,
  Keyboard,
  CloudOff,
  Database,
  Trash,
} from "lucide-react";
import { THEMES, ThemeDefinition } from "../services/themes";
import {
  PlayerSettings,
  getStoredPlayerSettings,
  savePlayerSettings,
} from "../services/playerSettings";
import { EQ_FREQS } from "../services/audioEngine";
import { Album, Playlist } from "../types";
import { dumpLibraryToFile, parseAndValidateDump, restoreLibraryFromDump, getStoredHistory } from "../services/storage";
import { offlineCache } from "../services/offlineCache";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: string;
  onSelectTheme: (themeId: string) => void;
  albums: Album[];
  playlists: Playlist[];
  onLibraryRestored?: () => void;
  onShowToast?: (message: string, type?: "success" | "info") => void;
  onOpenShortcuts?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeThemeId,
  onSelectTheme,
  albums,
  playlists,
  onLibraryRestored,
  onShowToast,
  onOpenShortcuts,
}) => {
  const [activeTab, setActiveTab] = useState<"palette" | "audio" | "vault">("palette");
  const [settings, setSettings] = useState<PlayerSettings>(getStoredPlayerSettings());
  const [sleepRemainingText, setSleepRemainingText] = useState<string | null>(null);

  // Offline cache storage stats
  const [offlineStats, setOfflineStats] = useState<{
    trackCount: number;
    albumCount: number;
    totalBytes: number;
    formattedSize: string;
  }>({ trackCount: 0, albumCount: 0, totalBytes: 0, formattedSize: "0 MB" });
  const [isClearingOffline, setIsClearingOffline] = useState(false);

  // Restore file import states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [eqName, setEqName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredPlayerSettings());
      offlineCache.getStorageStats().then(setOfflineStats);
    }
  }, [isOpen]);

  const handleClearOffline = async () => {
    if (!window.confirm("Are you sure you want to clear all offline cached tracks? You will need an internet connection to re-download them.")) {
      return;
    }
    setIsClearingOffline(true);
    await offlineCache.clearAllCache();
    const refreshed = await offlineCache.getStorageStats();
    setOfflineStats(refreshed);
    setIsClearingOffline(false);
    if (onShowToast) onShowToast("Offline audio cache cleared", "info");
  };

  // Real-time sleep timer updater
  useEffect(() => {
    if (!settings.sleepTimerEndTime) {
      setSleepRemainingText(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = settings.sleepTimerEndTime! - now;
      if (diff <= 0) {
        setSleepRemainingText(null);
        const updated = savePlayerSettings({ sleepTimerMinutes: 0, sleepTimerEndTime: null });
        setSettings(updated);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setSleepRemainingText(`${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.sleepTimerEndTime]);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<PlayerSettings>) => {
    const updated = savePlayerSettings(partial);
    setSettings(updated);
  };

  // EQ helpers (eqName state lives with the other hooks above)
  const eq = settings.eq ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const eqProfiles = settings.eqProfiles ?? [];

  const handleEqBand = (i: number, v: number) => {
    const n = [...eq];
    n[i] = v;
    handleUpdate({ eq: n, activeEqProfile: "Custom" });
  };

  const handleApplyProfile = (name: string) => {
    const p = eqProfiles.find((x) => x.name === name);
    if (p) handleUpdate({ eq: [...p.eq], activeEqProfile: p.name });
  };

  const handleSaveProfile = () => {
    const name = eqName.trim().slice(0, 24);
    if (!name) return;
    const rest = eqProfiles.filter((x) => x.name !== name);
    handleUpdate({ eqProfiles: [...rest, { name, eq: [...eq] }], activeEqProfile: name });
    setEqName("");
    if (onShowToast) onShowToast(`EQ profile "${name}" saved`, "success");
  };

  const handleDeleteProfile = (name: string) => {
    if (name === "Flat") return;
    const rest = eqProfiles.filter((x) => x.name !== name);
    const patch: Partial<PlayerSettings> =
      settings.activeEqProfile === name
        ? { eqProfiles: rest, eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], activeEqProfile: "Flat" }
        : { eqProfiles: rest };
    handleUpdate(patch);
  };

  const handleSetSleepTimer = (minutes: number) => {
    if (minutes === 0) {
      handleUpdate({ sleepTimerMinutes: 0, sleepTimerEndTime: null });
      if (onShowToast) onShowToast("Sleep timer turned off", "info");
    } else if (minutes === -1) {
      handleUpdate({ sleepTimerMinutes: -1, sleepTimerEndTime: null });
      if (onShowToast) onShowToast("Sleep timer: Stop after current track", "info");
    } else {
      const endTime = Date.now() + minutes * 60 * 1000;
      handleUpdate({ sleepTimerMinutes: minutes, sleepTimerEndTime: endTime });
      if (onShowToast) onShowToast(`Sleep timer set for ${minutes} minutes`, "info");
    }
  };

  const handleExportBackup = () => {
    dumpLibraryToFile();
    if (onShowToast) onShowToast("Vault JSON backup downloaded!", "success");
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setRestoreError(null);
    setRestoreStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateDump(content);
      if (res.success && res.data) {
        try {
          const outcome = restoreLibraryFromDump(res.data, restoreMode);
          setRestoreStatus(
            `Restored ${outcome.addedAlbums} albums & ${outcome.addedPlaylists} playlists (${restoreMode} mode).`
          );
          if (onLibraryRestored) onLibraryRestored();
          if (onShowToast) onShowToast("Vault library restored successfully!", "success");
        } catch (err: any) {
          setRestoreError(err.message || "Failed to restore backup.");
        }
      } else {
        setRestoreError(res.error || "Invalid backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const totalTracks = albums.reduce((acc, a) => acc + (a.tracks?.length || 0), 0);
  const listenHistory = getStoredHistory();

  return (
    <div
      id="settings-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Vault and player settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="settings-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-850 bg-stone-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-100 flex items-center space-x-2">
                <span>Vault & Player Settings</span>
              </h2>
              <p className="text-[11px] text-stone-400">
                Atmosphere palette, audio engine, and archive vault preferences
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {onOpenShortcuts && (
              <button
                id="btn-settings-keybinds"
                onClick={onOpenShortcuts}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-stone-300 hover:text-amber-400 bg-stone-850 hover:bg-stone-800 border border-stone-750 transition-colors cursor-pointer flex items-center space-x-1.5"
                title="Keyboard navigation & shortcuts (Press ?)"
                aria-label="Open keyboard shortcuts"
              >
                <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold text-stone-200">Keybinds</span>
                <kbd className="text-[10px] text-stone-400 font-mono bg-stone-950 px-1 rounded border border-stone-700">?</kbd>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimalist Subtabs Navigation */}
        <div className="flex items-center space-x-1 px-4 pt-3 pb-1 border-b border-stone-850 bg-stone-950/40">
          <button
            onClick={() => setActiveTab("palette")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "palette"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-850"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Atmosphere & Palette</span>
          </button>

          <button
            onClick={() => setActiveTab("audio")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "audio"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-850"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio & Playback</span>
            {settings.sleepTimerMinutes !== 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "vault"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-850"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Vault & Storage</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: Palette & Atmosphere */}
          {activeTab === "palette" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-stone-300 font-semibold text-xs">Color Palettes</span>
                <span className="text-stone-500 text-[11px]">{THEMES.length} palettes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {THEMES.map((theme) => {
                  const isCurrent = theme.id === activeThemeId;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onSelectTheme(theme.id)}
                      className={`px-3.5 py-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer border ${
                        isCurrent
                          ? "bg-stone-850 border-[var(--color-accent-main)] shadow-sm"
                          : "bg-stone-900/90 border-stone-800 hover:border-stone-700 hover:bg-stone-850/60"
                      }`}
                    >
                      {/* Just the Name */}
                      <span
                        className={`text-xs truncate font-medium ${
                          isCurrent ? "text-stone-100 font-semibold" : "text-stone-300"
                        }`}
                      >
                        {theme.name}
                      </span>

                      {/* Just the Colours */}
                      <div className="flex items-center space-x-1.5 shrink-0 pl-3">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                          style={{ backgroundColor: theme.bg }}
                          title={`Background: ${theme.bg}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                          style={{ backgroundColor: theme.text }}
                          title={`Text: ${theme.text}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                          style={{ backgroundColor: theme.accent }}
                          title={`Primary: ${theme.accent}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                          style={{ backgroundColor: theme.secondary }}
                          title={`Secondary: ${theme.secondary}`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Audio & Playback */}
          {activeTab === "audio" && (
            <div className="space-y-6">
              {/* 1. Stream Quality */}
              <div className="p-3.5 rounded-xl bg-stone-950/40 border border-stone-850 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-stone-200">Archive Stream Fidelity</h4>
                      <p className="text-stone-400 text-[11px]">
                        Select preferred audio stream format when loading tapes from Archive.org
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: "vbr320", label: "VBR 320k", desc: "Best MP3 (Default)" },
                    { id: "standard128", label: "128k MP3", desc: "Low Bandwidth" },
                    { id: "flac", label: "Lossless / FLAC", desc: "Original Masters" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleUpdate({ audioQuality: item.id as any })}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        settings.audioQuality === item.id
                          ? "bg-amber-500/20 border-amber-500/60 text-amber-200"
                          : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-850"
                      }`}
                    >
                      <div className="font-semibold text-xs text-stone-100">{item.label}</div>
                      <div className="text-[10px] text-stone-400">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Sleep Timer */}
              <div className="p-3.5 rounded-xl bg-stone-950/40 border border-stone-850 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Moon className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-stone-200">Sleep Timer</h4>
                      <p className="text-stone-400 text-[11px]">
                        Gently stop playback when falling asleep to live concert recordings
                      </p>
                    </div>
                  </div>
                  {sleepRemainingText && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px]">
                      {sleepRemainingText} left
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { min: 0, label: "Off" },
                    { min: 15, label: "15 min" },
                    { min: 30, label: "30 min" },
                    { min: 45, label: "45 min" },
                    { min: 60, label: "60 min" },
                    { min: -1, label: "End of Track" },
                  ].map((btn) => (
                    <button
                      key={btn.min}
                      onClick={() => handleSetSleepTimer(btn.min)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        settings.sleepTimerMinutes === btn.min
                          ? "bg-amber-500 text-stone-950 font-semibold border-amber-500 shadow-sm"
                          : "bg-stone-900 border-stone-800 text-stone-300 hover:text-stone-100 hover:bg-stone-850"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Playback Speed & Crossfade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Playback Rate */}
                <div className="p-3.5 rounded-xl bg-stone-950/40 border border-stone-850 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-stone-200">Playback Speed</h4>
                  </div>
                  <p className="text-stone-400 text-[11px]">Default rate for tapes & spoken archive</p>
                  <div className="flex gap-1.5 pt-1">
                    {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleUpdate({ defaultPlaybackRate: rate })}
                        className={`flex-1 py-1.5 rounded-lg border text-center font-mono text-xs cursor-pointer transition-all ${
                          settings.defaultPlaybackRate === rate
                            ? "bg-amber-500/20 border-amber-500/60 text-amber-200 font-semibold"
                            : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smooth Crossfade */}
                <div className="p-3.5 rounded-xl bg-stone-950/40 border border-stone-850 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Waves className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-stone-200">Track Transition</h4>
                  </div>
                  <p className="text-stone-400 text-[11px]">Seamless gapless transition curve</p>
                  <div className="flex gap-1.5 pt-1">
                    {[
                      { sec: 0, label: "Gapless" },
                      { sec: 2, label: "2 sec" },
                      { sec: 4, label: "4 sec" },
                    ].map((item) => (
                      <button
                        key={item.sec}
                        onClick={() => handleUpdate({ crossfadeSeconds: item.sec })}
                        className={`flex-1 py-1.5 rounded-lg border text-center text-xs cursor-pointer transition-all ${
                          settings.crossfadeSeconds === item.sec
                            ? "bg-amber-500/20 border-amber-500/60 text-amber-200 font-semibold"
                            : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Common Sense Toggles: Soundboard Leveling, Tape Warmth, Continuous Playback */}
              <div className="space-y-2 pt-1">
                {/* Soundboard Gain Normalization */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/40 border border-stone-850">
                  <div className="space-y-0.5">
                    <div className="font-medium text-stone-200">
                      Archive Soundboard Normalization
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Equalizes volume variations between 1960s/70s tapers and modern digital soundboards
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleUpdate({ gainNormalization: !settings.gainNormalization })
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.gainNormalization ? "bg-amber-500" : "bg-stone-800"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-stone-950 transition-transform ${
                        settings.gainNormalization ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Simulated Tape Warmth */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/40 border border-stone-850">
                  <div className="space-y-0.5">
                    <div className="font-medium text-stone-200">Analog Tape Warmth Filter</div>
                    <div className="text-[11px] text-stone-400">
                      Subtle harmonic warmth curve tailored for vintage reels and cassette soundboards
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdate({ tapeWarmth: !settings.tapeWarmth })}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.tapeWarmth ? "bg-amber-500" : "bg-stone-800"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-stone-950 transition-transform ${
                        settings.tapeWarmth ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Low Bandwidth Data Saver */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/40 border border-stone-850">
                  <div className="space-y-0.5">
                    <div className="font-medium text-stone-200 flex items-center space-x-1.5">
                      <Wifi className="w-3.5 h-3.5 text-stone-400" />
                      <span>Data Saver Mode</span>
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Disables high-res cover art prefetching and streams compressed audio formats
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdate({ dataSaver: !settings.dataSaver })}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.dataSaver ? "bg-amber-500" : "bg-stone-800"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-stone-950 transition-transform ${
                        settings.dataSaver ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Auto-save played tracks to offline cache */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/40 border border-stone-850">
                  <div className="space-y-0.5">
                    <div className="font-medium text-stone-200 flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-stone-400" />
                      <span>Auto-save played tracks</span>
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Pin every played stream to offline cache automatically — played songs stay available offline
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdate({ autoCachePlayed: !settings.autoCachePlayed })}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.autoCachePlayed ? "bg-amber-500" : "bg-stone-800"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-stone-950 transition-transform ${
                        settings.autoCachePlayed ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 5. Graphic Equalizer + Saved Profiles */}
              <div className="p-3.5 rounded-xl bg-stone-950/40 border border-stone-850 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-stone-200">Graphic Equalizer</h4>
                    <p className="text-stone-400 text-[11px]">
                      10-band studio EQ applied live to playback
                    </p>
                  </div>
                </div>

                {/* Profile chips */}
                <div className="flex flex-wrap gap-1.5">
                  {eqProfiles.map((p) => {
                    const active = settings.activeEqProfile === p.name;
                    return (
                      <span
                        key={p.name}
                        className={`inline-flex items-center rounded-lg border text-[11px] transition-all ${
                          active
                            ? "bg-amber-500/20 border-amber-500/60 text-amber-200 font-semibold"
                            : "bg-stone-900 border-stone-800 text-stone-300"
                        }`}
                      >
                        <button
                          onClick={() => handleApplyProfile(p.name)}
                          className="px-2.5 py-1.5 cursor-pointer"
                        >
                          {p.name}
                        </button>
                        {p.name !== "Flat" && (
                          <button
                            onClick={() => handleDeleteProfile(p.name)}
                            className="pr-2 text-stone-500 hover:text-red-400 cursor-pointer"
                            title={`Delete ${p.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                  {settings.activeEqProfile === "Custom" && (
                    <span className="px-2.5 py-1.5 rounded-lg border text-[11px] bg-stone-800 border-stone-700 text-stone-300 italic">
                      Custom (unsaved tweaks)
                    </span>
                  )}
                </div>

                {/* Save current as profile */}
                <div className="flex gap-2">
                  <input
                    value={eqName}
                    onChange={(e) => setEqName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                    placeholder="Name this sound…"
                    maxLength={24}
                    className="flex-1 px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={!eqName.trim()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Save
                  </button>
                </div>

                {/* Bands */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                  {EQ_FREQS.map((f, i) => (
                    <label key={f} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-mono text-amber-400 h-3">
                        {eq[i] > 0 ? `+${eq[i]}` : eq[i]}
                      </span>
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={1}
                        value={eq[i] || 0}
                        aria-label={`Equalizer band ${f >= 1000 ? `${f / 1000} kilohertz` : `${f} hertz`}`}
                        onChange={(e) => handleEqBand(i, Number(e.target.value))}
                        className="accent-amber-500 cursor-pointer"
                        style={{ writingMode: "vertical-lr", direction: "rtl", width: "1.25rem", height: "6rem" } as React.CSSProperties}
                      />
                      <span className="text-[9px] font-mono text-stone-500">
                        {f >= 1000 ? `${f / 1000}k` : f}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Preamp + balance */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] text-stone-400">
                    Preamp {(settings.preamp ?? 1).toFixed(2)}x
                    <input
                      type="range"
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      value={settings.preamp ?? 1}
                      onChange={(e) => handleUpdate({ preamp: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </label>
                  <label className="text-[11px] text-stone-400">
                    Balance {settings.stereoPan ?? 0}
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.1}
                      value={settings.stereoPan ?? 0}
                      onChange={(e) => handleUpdate({ stereoPan: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Vault & Storage */}
          {activeTab === "vault" && (
            <div className="space-y-6">
              {/* Vault Overview Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-850 text-center">
                  <div className="text-lg font-bold text-amber-400">{albums.length}</div>
                  <div className="text-[11px] text-stone-500 uppercase tracking-[0.12em] font-semibold">Albums Saved</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-850 text-center">
                  <div className="text-lg font-bold text-stone-200">{totalTracks}</div>
                  <div className="text-[11px] text-stone-500 uppercase tracking-[0.12em] font-semibold">Total Tracks</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-850 text-center">
                  <div className="text-lg font-bold text-stone-200">{playlists.length}</div>
                  <div className="text-[11px] text-stone-500 uppercase tracking-[0.12em] font-semibold">Playlists</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-850 text-center">
                  <div className="text-lg font-bold text-stone-200">{listenHistory.length}</div>
                  <div className="text-[11px] text-stone-500 uppercase tracking-[0.12em] font-semibold">Plays Logged</div>
                </div>
              </div>

              {/* JSON Backup Export & Import */}
              <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-850 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-200">JSON Vault Backup</h4>
                    <p className="text-stone-400 text-[11px]">
                      Safely export your entire library, personal notes, tags, playlists, and tier lists to a portable file.
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-xl transition-all shadow flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Backup</span>
                  </button>
                </div>

                {/* Import / Restore */}
                <div className="pt-3 border-t border-stone-850/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-medium text-stone-300 text-xs">Restore Library from JSON:</span>
                    <div className="flex items-center space-x-1 bg-stone-900 border border-stone-800 p-0.5 rounded-lg">
                      <button
                        onClick={() => setRestoreMode("merge")}
                        className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                          restoreMode === "merge"
                            ? "bg-amber-500/20 text-amber-300 font-medium"
                            : "text-stone-400 hover:text-stone-200"
                        }`}
                      >
                        Merge
                      </button>
                      <button
                        onClick={() => setRestoreMode("replace")}
                        className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                          restoreMode === "replace"
                            ? "bg-rose-500/20 text-rose-300 font-medium"
                            : "text-stone-400 hover:text-stone-200"
                        }`}
                      >
                        Replace All
                      </button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-stone-700 hover:border-amber-500/60 bg-stone-900/60 hover:bg-stone-850/60 text-stone-300 text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-stone-400" />
                    <span>Select Backup .JSON File to Restore</span>
                  </button>

                  {restoreStatus && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-[11px] flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{restoreStatus}</span>
                    </div>
                  )}

                  {restoreError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[11px] flex items-center space-x-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{restoreError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Task 1: Local-First Offline Cache (OPFS / IndexedDB) */}
              <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-stone-200">Offline Audio Cache (OPFS / IndexedDB)</h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">
                          Local-First
                        </span>
                      </div>
                      <p className="text-stone-400 text-[11px]">
                        Pinned tracks are stored in browser blob storage for instant 0ms latency & offline flight playback.
                      </p>
                    </div>
                  </div>
                  {offlineStats.trackCount > 0 && (
                    <button
                      onClick={handleClearOffline}
                      disabled={isClearingOffline}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>{isClearingOffline ? "Clearing..." : "Clear Cache"}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-center">
                    <div className="text-base font-bold text-amber-400">{offlineStats.trackCount}</div>
                    <div className="text-[10px] text-stone-400">Pinned Tracks</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-center">
                    <div className="text-base font-bold text-stone-200">{offlineStats.albumCount}</div>
                    <div className="text-[10px] text-stone-400">Offline Albums</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-center">
                    <div className="text-base font-bold text-stone-200">{offlineStats.formattedSize}</div>
                    <div className="text-[10px] text-stone-400">Disk Used</div>
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts Action Card */}
              {onOpenShortcuts && (
                <div className="p-3.5 rounded-xl bg-stone-950/40 border border-stone-850 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-stone-850 border border-stone-750 flex items-center justify-center text-stone-300">
                      <Keyboard className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-200">Keyboard Navigation & Keybinds</h4>
                      <p className="text-stone-400 text-[11px]">
                        Full global keyboard controls for playback, search, volume, and tabs
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onOpenShortcuts}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 hover:text-amber-400 text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>View Keybinds</span>
                    <kbd className="text-[10px] bg-stone-950 px-1 py-0.5 rounded border border-stone-700 text-stone-400">?</kbd>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-850 bg-stone-950/80 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center space-x-2">
            <span>Palette:</span>
            <strong className="text-stone-200">
              {THEMES.find((t) => t.id === activeThemeId)?.name || "Matte Noir & Lavender"}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-850 hover:bg-stone-800 text-stone-200 font-medium rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
