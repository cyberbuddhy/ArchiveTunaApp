export interface PlayerSettings {
  // Theme
  themeId: string;

  // Audio Quality & Stream Preference
  audioQuality: "vbr320" | "standard128" | "flac";
  tapeWarmth: boolean;
  gainNormalization: boolean;

  // Playback & Transitions
  defaultPlaybackRate: number;
  crossfadeSeconds: number; // 0 (off), 2, 4, 6
  autoPlayNext: boolean;

  // Visuals & Data
  visualizerStyle: "dual-bars" | "glow" | "wave" | "minimal";
  dataSaver: boolean;

  // Sleep Timer (duration in minutes, 0 = off, -1 = end of track)
  sleepTimerMinutes: number;
  sleepTimerEndTime: number | null; // timestamp when sleep timer expires

  // Studio chain
  eq?: number[];
  preamp?: number;
  stereoPan?: number;
  radioInfinite?: boolean;

  // Offline: pin every played stream automatically (off by default)
  autoCachePlayed?: boolean;

  // Saved EQ profiles
  eqProfiles: EqProfile[];
  activeEqProfile: string;
}

export interface EqProfile {
  name: string;
  eq: number[];
}

const FLAT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const FACTORY_EQ_PROFILES: EqProfile[] = [
  { name: "Flat", eq: [...FLAT] },
  { name: "Bass Boost", eq: [6, 5, 4, 2, 1, 0, 0, 0, 0, 0] },
  { name: "Vocal", eq: [-1, 0, 1, 2, 4, 4, 3, 1, 0, -1] },
  { name: "Treble", eq: [0, 0, 0, 0, 0, 1, 3, 4, 5, 6] },
];

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  themeId: "matte-lavender",
  audioQuality: "vbr320",
  tapeWarmth: false,
  gainNormalization: true,
  defaultPlaybackRate: 1.0,
  crossfadeSeconds: 2,
  autoPlayNext: true,
  visualizerStyle: "dual-bars",
  dataSaver: false,
  sleepTimerMinutes: 0,
  sleepTimerEndTime: null,
  eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  preamp: 1,
  stereoPan: 0,
  radioInfinite: false,
  autoCachePlayed: false,
  eqProfiles: FACTORY_EQ_PROFILES.map((p) => ({ ...p, eq: [...p.eq] })),
  activeEqProfile: "Flat",
};

const SETTINGS_STORAGE_KEY = "archive_tuner_player_settings";

export function getStoredPlayerSettings(): PlayerSettings {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { ...DEFAULT_PLAYER_SETTINGS };
    }
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PLAYER_SETTINGS, ...parsed };
    }
  } catch (e) {
    // LocalStorage fallback
  }
  return { ...DEFAULT_PLAYER_SETTINGS };
}

export function savePlayerSettings(settings: Partial<PlayerSettings>): PlayerSettings {
  try {
    const current = getStoredPlayerSettings();
    const updated = { ...current, ...settings };
    if (typeof window === "undefined" || !window.localStorage) return updated;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event for cross-component immediate reactivity
    window.dispatchEvent(new CustomEvent("archive_settings_changed", { detail: updated }));
    return updated;
  } catch (e) {
    return { ...DEFAULT_PLAYER_SETTINGS, ...settings };
  }
}
