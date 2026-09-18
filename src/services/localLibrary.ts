/**
 * Local music library — folder/file picker + audio tag reader.
 *
 * Platform strategy (web now, Android later):
 * - Desktop Chromium: File System Access API (showDirectoryPicker). Directory
 *   handles persist in IndexedDB so "Resync" works across reloads.
 * - Everywhere else incl. mobile browsers: <input type="file"> fallback
 *   (webkitdirectory for folders, multiple+accept for single files).
 * - A future Capacitor build can swap pickMusicFolder()/resolveObjectUrl()
 *   for native-filesystem equivalents without touching the UI.
 *
 * Notes:
 * - Decoding needs no extra library: browsers play mp3/flac/ogg/m4a/wav/opus
 *   natively through the existing <audio> element.
 * - Browsers cannot watch the OS download folder, so ArchiveTuna downloads
 *   appear here when the user picks their download folder as the library
 *   folder (or drops those files in) and hits Resync.
 */
import type { Track } from "../types";

export const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "flac",
  "ogg",
  "oga",
  "opus",
  "m4a",
  "mp4",
  "wav",
  "webm",
  "aac",
]);

export interface LocalTrackMeta {
  id: string;
  title: string;
  artist: string;
  album: string;
  format: string;
  fileName: string;
  relativePath: string;
  size: number;
  duration: number;
  /** "folder" = came from a picked folder (resyncable), "files" = one-off picks. */
  origin: "folder" | "files";
}

/** Runtime entry: metadata + how to get the bytes back. Not serializable. */
export interface LocalTrackEntry extends LocalTrackMeta {
  file?: File;
  dirHandle?: FileSystemDirectoryHandle;
}

const INDEX_STORAGE_KEY = "tuna_local_library_index_v1";
const DIR_HANDLE_DB = "ArchiveTunaLocalLib";
const DIR_HANDLE_STORE = "handles";
const DIR_HANDLE_KEY = "musicDir";
const DIR_NAME_KEY = "tuna_local_library_dir_v1";

/* ------------------------------------------------------------------ */
/* Pure helpers (tested)                                               */
/* ------------------------------------------------------------------ */

export function isAudioFileName(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return false;
  return AUDIO_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

export function formatFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot === -1 ? "" : name.slice(dot + 1).toUpperCase();
  if (ext === "OGA") return "OGG";
  if (ext === "MP4") return "M4A";
  return ext || "AUDIO";
}

/** Stable id from path + size + mtime (FNV-1a). Retags keep the same id. */
export function makeTrackId(relativePath: string, size: number, lastModified: number): string {
  const s = `${relativePath}__${size}__${lastModified}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `local_${(h >>> 0).toString(36)}`;
}

/** "Artist - Title.mp3" -> { artist, title }; else title = basename. */
export function parseFilename(name: string): { artist: string; title: string } {
  const base = name.replace(/\.[^/.]+$/, "").trim();
  // Strip leading track numbers first: "03 - Title", "03_Title", "03. Title"
  const unnumbered = base.replace(/^\d{1,3}[\s._-]+/, "").trim();
  const sep = unnumbered.search(/\s+-\s+/);
  if (sep > 0) {
    const artist = unnumbered.slice(0, sep).trim();
    const title = unnumbered.slice(sep + 1).replace(/^[-\s]+/, "").trim();
    if (artist && title) return { artist, title };
  }
  return { artist: "Unknown Artist", title: unnumbered || base };
}

/* ------------------------------------------------------------------ */
/* Pickers                                                             */
/* ------------------------------------------------------------------ */

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

function pickViaInput(opts: { directory: boolean }): Promise<File[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,.mp3,.flac,.ogg,.oga,.opus,.m4a,.wav,.webm,.aac";
    if (opts.directory) {
      input.setAttribute("webkitdirectory", "");
    } else {
      input.multiple = true;
    }
    input.style.display = "none";
    const cleanup = () => input.remove();
    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : [];
      cleanup();
      resolve(files.length ? files : null);
    };
    input.oncancel = () => {
      cleanup();
      resolve(null);
    };
    document.body.appendChild(input);
    input.click();
  });
}

/** Folder pick: native picker where available, directory input otherwise. */
export async function pickMusicFolder(): Promise<{ dirName: string; files: File[]; dirHandle?: FileSystemDirectoryHandle } | null> {
  if (supportsDirectoryPicker()) {
    try {
      const dirHandle = await window.showDirectoryPicker!({ mode: "read" });
      const entries = await readDirectoryRecursive(dirHandle);
      const files = entries.map((e) => {
        const f = e.file as File & { __relPath?: string };
        f.__relPath = e.relativePath;
        return f as File;
      });
      if (!files.length) return { dirName: dirHandle.name, files, dirHandle };
      await saveDirectoryHandle(dirHandle, dirHandle.name);
      return { dirName: dirHandle.name, files, dirHandle };
    } catch (err) {
      // AbortError = user cancelled; anything else -> fall through to input
      if (err instanceof Error && err.name === "AbortError") return null;
    }
  }
  const files = await pickViaInput({ directory: true });
  if (!files) return null;
  const first = files[0] as File & { webkitRelativePath?: string };
  const dirName = (first.webkitRelativePath || "").split("/")[0] || "Local folder";
  return { dirName, files };
}

/** Multi-file pick — the mobile path (no folder pickers on mobile browsers). */
export function pickAudioFiles(): Promise<File[] | null> {
  return pickViaInput({ directory: false });
}

async function readDirectoryRecursive(
  dirHandle: FileSystemDirectoryHandle,
  prefix = "",
  out: Array<{ file: File; relativePath: string }> = []
): Promise<Array<{ file: File; relativePath: string }>> {
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "file") {
      if (!isAudioFileName(entry.name)) continue;
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        out.push({ file, relativePath: prefix ? `${prefix}/${entry.name}` : entry.name });
      } catch {
        // Unreadable file — skip, keep syncing the rest
      }
    } else if (entry.kind === "directory") {
      const name = entry.name;
      // Skip junk / metadata dirs
      if (name.startsWith(".") || name === "__MACOSX") continue;
      await readDirectoryRecursive(entry as FileSystemDirectoryHandle, prefix ? `${prefix}/${name}` : name, out);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Directory handle persistence (IndexedDB — handles aren't serializable) */
/* ------------------------------------------------------------------ */

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB unavailable"));
    }
    const req = indexedDB.open(DIR_HANDLE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DIR_HANDLE_STORE)) {
        req.result.createObjectStore(DIR_HANDLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle, dirName: string): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DIR_HANDLE_STORE, "readwrite");
      tx.objectStore(DIR_HANDLE_STORE).put(handle, DIR_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    try {
      localStorage.setItem(DIR_NAME_KEY, dirName);
    } catch { /* private mode — session only */ }
  } catch { /* persistence optional */ }
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb();
    const handle = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(DIR_HANDLE_STORE, "readonly");
      const req = tx.objectStore(DIR_HANDLE_STORE).get(DIR_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (
      handle &&
      typeof (handle as { values?: unknown }).values !== "function"
    ) {
      return null;
    }
    return (handle as FileSystemDirectoryHandle) || null;
  } catch {
    return null;
  }
}

export async function forgetDirectoryHandle(): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DIR_HANDLE_STORE, "readwrite");
      tx.objectStore(DIR_HANDLE_STORE).delete(DIR_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* noop */ }
  try {
    localStorage.removeItem(DIR_NAME_KEY);
  } catch { /* noop */ }
}

export function getSavedDirName(): string | null {
  try {
    return localStorage.getItem(DIR_NAME_KEY);
  } catch {
    return null;
  }
}

/** Re-read a saved directory handle. Requests read permission (user gesture). */
export async function resyncSavedDirectory(): Promise<{ dirName: string; files: File[]; dirHandle: FileSystemDirectoryHandle } | null> {
  const dirHandle = await loadDirectoryHandle();
  if (!dirHandle) return null;
  try {
    if (dirHandle.requestPermission) {
      const state = await dirHandle.requestPermission({ mode: "read" });
      if (state !== "granted") return null;
    }
    const entries = await readDirectoryRecursive(dirHandle);
    const files = entries.map((e) => {
      const f = e.file as File & { __relPath?: string };
      f.__relPath = e.relativePath;
      return f as File;
    });
    return { dirName: dirHandle.name, files, dirHandle };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Tag reading (jsmediatags, lazy-loaded so it never blocks first paint) */
/* ------------------------------------------------------------------ */

interface ReadTagsResult {
  title?: string;
  artist?: string;
  album?: string;
}

function readTagsWithTimeout(file: File, timeoutMs = 8000): Promise<ReadTagsResult> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: ReadTagsResult) => {
      if (!done) {
        done = true;
        resolve(r);
      }
    };
    const timer = setTimeout(() => finish({}), timeoutMs);
    void (async () => {
      try {
        const { default: jsmediatags } = await import("jsmediatags");
        jsmediatags.read(file, {
          onSuccess: (tag) => {
            clearTimeout(timer);
            finish({
              title: tag.tags.title,
              artist: tag.tags.artist,
              album: tag.tags.album,
            });
          },
          onError: () => {
            clearTimeout(timer);
            finish({});
          },
        });
      } catch {
        clearTimeout(timer);
        finish({});
      }
    })();
  });
}

function relativePathOf(file: File): string {
  const f = file as File & { webkitRelativePath?: string; __relPath?: string };
  if (f.__relPath) return f.__relPath;
  if (f.webkitRelativePath) {
    // webkitRelativePath includes the picked root folder — strip it
    const parts = f.webkitRelativePath.split("/");
    return parts.length > 1 ? parts.slice(1).join("/") : f.webkitRelativePath;
  }
  return file.name;
}

/** Index files: tags with bounded concurrency, filename fallback. */
export async function indexFiles(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<LocalTrackEntry[]> {
  const audio = files.filter((f) => isAudioFileName(f.name));
  const out: LocalTrackEntry[] = new Array(audio.length);
  const CONCURRENCY = 4;
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < audio.length) {
      const i = cursor++;
      const file = audio[i];
      const rel = relativePathOf(file);
      const fallback = parseFilename(file.name);
      let title = fallback.title;
      let artist = fallback.artist;
      let album = "";
      try {
        const tags = await readTagsWithTimeout(file);
        if (tags.title) title = tags.title;
        if (tags.artist) artist = tags.artist;
        if (tags.album) album = tags.album;
      } catch { /* filename fallback stands */ }
      out[i] = {
        id: makeTrackId(rel, file.size, file.lastModified),
        title,
        artist,
        album,
        format: formatFromName(file.name),
        fileName: file.name,
        relativePath: rel,
        size: file.size,
        duration: 0,
        origin: "files",
        file,
      };
      completed++;
      onProgress?.(completed, audio.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, audio.length) }, () => worker()));
  return out;
}

/** Attach a directory handle to entries that came from the picker (for replay). */
export function attachDirHandle(entries: LocalTrackEntry[], dirHandle?: FileSystemDirectoryHandle): LocalTrackEntry[] {
  if (!dirHandle) return entries;
  return entries.map((e) => ({ ...e, dirHandle }));
}

/* ------------------------------------------------------------------ */
/* Index persistence (metadata only — bytes stay on disk)               */
/* ------------------------------------------------------------------ */

export function loadIndex(): LocalTrackMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as LocalTrackMeta[])
      .filter((m) => m && typeof m.id === "string" && typeof m.fileName === "string")
      .map((m) => ({ ...m, origin: m.origin === "folder" ? "folder" as const : "files" as const }));
  } catch {
    return [];
  }
}

export function saveIndex(metas: LocalTrackMeta[]): void {
  try {
    localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(metas));
  } catch { /* quota/private mode — session only */ }
}

export function clearIndex(): void {
  try {
    localStorage.removeItem(INDEX_STORAGE_KEY);
  } catch { /* noop */ }
}

/* ------------------------------------------------------------------ */
/* Playback mapping                                                    */
/* ------------------------------------------------------------------ */

const urlCache = new Map<string, string>();

/** Object URL for an entry. Reuses the picker handle when the File is gone. */
export async function resolveObjectUrl(entry: LocalTrackEntry): Promise<string> {
  const hit = urlCache.get(entry.id);
  if (hit) return hit;
  let file = entry.file;
  if (!file && entry.dirHandle) {
    // Walk the saved handle down to the file (permission granted by Sync)
    const parts = entry.relativePath.split("/");
    let dir = entry.dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      try {
        const next = await dir.values();
        let found: FileSystemDirectoryHandle | null = null;
        for await (const e of next) {
          if (e.kind === "directory" && e.name === parts[i]) {
            found = e as FileSystemDirectoryHandle;
            break;
          }
        }
        if (!found) throw new Error("missing dir");
        dir = found;
      } catch {
        throw new Error("Local file no longer reachable — hit Resync");
      }
    }
    const leaf = parts[parts.length - 1];
    try {
      const vals = await dir.values();
      for await (const e of vals) {
        if (e.kind === "file" && e.name === leaf) {
          file = await (e as FileSystemFileHandle).getFile();
          break;
        }
      }
    } catch {
      throw new Error("Local file no longer reachable — hit Resync");
    }
  }
  if (!file) throw new Error("Local file unavailable — re-pick the folder");
  const url = URL.createObjectURL(file);
  urlCache.set(entry.id, url);
  return url;
}

export function dropObjectUrl(id: string): void {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

export function dropAllObjectUrls(): void {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}

export function toPlayerTrack(meta: LocalTrackMeta, url: string, trackNumber: number): Track {
  return {
    id: meta.id,
    title: meta.title,
    artist: meta.artist,
    album: meta.album || "Local files",
    albumId: "local_library",
    trackNumber,
    duration: meta.duration,
    streamUrl: url,
    audioUrl: url,
    format: meta.format,
    filename: meta.fileName,
    size: meta.size,
  };
}
