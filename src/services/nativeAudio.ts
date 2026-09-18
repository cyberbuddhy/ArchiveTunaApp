/**
 * Native audio bridge (Android via Capacitor).
 *
 * Web builds never import the native plugins: every entry point first checks
 * the synchronous `window.Capacitor.isNative` flag and no-ops on web, so the
 * Capacitor chunks stay out of the critical path.
 *
 * Background playback = `capacitor-music-controls-plugin` foreground service
 * + media notification. Audio itself keeps decoding in the WebView <audio>
 * element; the service keeps the process alive with the screen off.
 */
import type { Album, Track } from "../types";

declare global {
  interface Window {
    Capacitor?: { isNative?: boolean };
  }
}

export function isNativePlatform(): boolean {
  try {
    return typeof window !== "undefined" && window.Capacitor?.isNative === true;
  } catch {
    return false;
  }
}

export interface NowPlayingInfo {
  track: Track;
  album?: Album | null;
  isPlaying: boolean;
}

export interface NativeControlHandlers {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

let controlsCreated = false;
let listenerAttached = false;

function httpCover(url?: string): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http://") || url.startsWith("https://") ? url : undefined;
}

/** Show/update the lockscreen notification + foreground service. No-op on web. */
export async function showNowPlaying(info: NowPlayingInfo): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { CapacitorMusicControls } = await import("capacitor-music-controls-plugin");
    await CapacitorMusicControls.create({
      track: info.track.title || "Archive Recording",
      artist: info.track.artist || info.album?.artist || "Unknown Artist",
      album: info.track.album || info.album?.title || "Archive.org Audio",
      cover: httpCover(info.album?.coverUrl),
      isPlaying: info.isPlaying,
      dismissable: false,
      hasPrev: true,
      hasNext: true,
      hasClose: false,
      duration: Math.max(0, Math.floor(info.track.duration || 0)),
      ticker: `Now playing "${info.track.title || "Archive Recording"}"`,
    });
    controlsCreated = true;
  } catch {
    // Plugin missing or pre-init — web fallback (MediaSession) already covers UI
  }
}

/** Push play/pause state to the notification. No-op on web. */
export async function updatePlayingState(isPlaying: boolean, elapsedSeconds: number): Promise<void> {
  if (!isNativePlatform() || !controlsCreated) return;
  try {
    const { CapacitorMusicControls } = await import("capacitor-music-controls-plugin");
    await CapacitorMusicControls.updateElapsed({
      isPlaying,
      elapsed: Math.max(0, Math.floor(elapsedSeconds || 0)),
    });
  } catch { /* notification may have been dismissed */ }
}

/** Tear down the notification/service (e.g. queue cleared). No-op on web. */
export async function hideNowPlaying(): Promise<void> {
  if (!isNativePlatform() || !controlsCreated) return;
  controlsCreated = false;
  try {
    const { CapacitorMusicControls } = await import("capacitor-music-controls-plugin");
    await CapacitorMusicControls.destroy();
  } catch { /* noop */ }
}

function dispatchMessage(message: string, h: NativeControlHandlers): void {
  switch (message) {
    case "music-controls-next":
      h.onNext();
      break;
    case "music-controls-previous":
      h.onPrev();
      break;
    case "music-controls-pause":
    case "music-controls-headset-unplugged":
      h.onPause();
      break;
    case "music-controls-play":
      h.onPlay();
      break;
    default:
      break;
  }
}

/**
 * Attach lockscreen/headset listeners once per session. Listens both ways:
 * plugin listener (iOS + newer Android) and DOM event (Android quirk where
 * notifyListeners doesn't fire — see plugin README).
 */
export async function ensureNativeControlsListener(h: NativeControlHandlers): Promise<void> {
  if (!isNativePlatform() || listenerAttached) return;
  listenerAttached = true;
  try {
    const { CapacitorMusicControls } = await import("capacitor-music-controls-plugin");
    await CapacitorMusicControls.addListener("controlsNotification", (info: { message?: string }) => {
      if (info?.message) dispatchMessage(info.message, h);
    });
  } catch { /* iOS-style listener unavailable — DOM fallback below still works */ }
  document.addEventListener("controlsNotification", (e: Event) => {
    const msg = (e as CustomEvent<{ message?: string }>).detail?.message
      || (e as unknown as { message?: string }).message;
    if (msg) dispatchMessage(msg, h);
  });
}
