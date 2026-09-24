import React, { useState, useEffect, useMemo } from "react";
import {
  FolderOpen,
  RefreshCw,
  Trash2,
  Play,
  Music,
  Shuffle,
  FolderX,
  Loader2,
  HardDrive,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { Album, Track } from "../types";
import { formatTime } from "../utils/format";
import { TabHeader } from "./TabHeader";
import {
  LocalTrackEntry,
  LocalTrackMeta,
  attachDirHandle,
  clearIndex,
  dropAllObjectUrls,
  dropObjectUrl,
  forgetDirectoryHandle,
  getSavedDirName,
  indexFiles,
  loadDirectoryHandle,
  loadIndex,
  pickMusicFolder,
  resolveObjectUrl,
  resyncSavedDirectory,
  saveIndex,
  toPlayerTrack,
} from "../services/localLibrary";

interface LocalLibraryTabProps {
  searchQuery: string;
  onShowToast?: (message: string, type?: "success" | "info") => void;
  onEntriesChange?: (entries: LocalTrackEntry[]) => void;
}

function metaOf(e: LocalTrackEntry): LocalTrackMeta {
  const { file: _file, dirHandle: _dir, ...meta } = e;
  return meta;
}

export const LocalLibraryTab: React.FC<LocalLibraryTabProps> = ({ searchQuery, onShowToast, onEntriesChange }) => {
  const { playTrack, playRandomTracks, currentTrack } = usePlayer();
  const [entries, setEntries] = useState<LocalTrackEntry[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [hasSavedDir, setHasSavedDir] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Rehydrate index on mount; reattach saved dir handle so tracks stay playable
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const metas = loadIndex();
      if (!metas.length) {
        setFolderName(getSavedDirName());
        setHasSavedDir((await loadDirectoryHandle()) !== null);
        return;
      }
      const dirHandle = await loadDirectoryHandle();
      if (cancelled) return;
      setHasSavedDir(!!dirHandle);
      setEntries(attachDirHandle(metas.map((m) => ({ ...m })), dirHandle || undefined));
      setFolderName(getSavedDirName());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Report entries up so All Songs can include local files
  useEffect(() => {
    onEntriesChange?.(entries);
  }, [entries, onEntriesChange]);

  const handlePickFolder = async () => {
    if (busy) return;
    setBusy("pick");
    try {
      const picked = await pickMusicFolder();
      if (!picked) return;
      setBusy("scan");
      setProgress({ done: 0, total: 0 });
      const fresh = await indexFiles(picked.files, (done, total) => setProgress({ done, total }));
      const withOrigin = attachDirHandle(
        fresh.map((e) => ({ ...e, origin: "folder" as const })),
        picked.dirHandle
      );
      setEntries((prev) => {
        const freshIds = new Set(withOrigin.map((e) => e.id));
        const kept = prev.filter((e) => e.origin !== "folder" || freshIds.has(e.id));
        const keptIds = new Set(kept.map((e) => e.id));
        const next = [...kept, ...withOrigin.filter((e) => !keptIds.has(e.id))];
        saveIndex(next.map(metaOf));
        return next;
      });
      setFolderName(picked.dirName);
      setHasSavedDir(!!picked.dirHandle || (await loadDirectoryHandle()) !== null);
      onShowToast?.(`Synced ${fresh.length} local track${fresh.length === 1 ? "" : "s"} from "${picked.dirName}"`, "success");
    } catch (err) {
      onShowToast?.("Couldn't read that folder.", "info");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const handleResync = async () => {
    if (busy) return;
    setBusy("scan");
    try {
      const synced = await resyncSavedDirectory();
      if (!synced) {
        onShowToast?.("Saved folder needs permission — pick the folder again.", "info");
        return;
      }
      const fresh = await indexFiles(synced.files, (done, total) => setProgress({ done, total }));
      const withOrigin = attachDirHandle(
        fresh.map((e) => ({ ...e, origin: "folder" as const })),
        synced.dirHandle
      );
      setEntries((prev) => {
        const freshIds = new Set(withOrigin.map((e) => e.id));
        const kept = prev.filter((e) => e.origin !== "folder" || freshIds.has(e.id));
        const keptIds = new Set(kept.map((e) => e.id));
        const next = [...kept, ...withOrigin.filter((e) => !keptIds.has(e.id))];
        saveIndex(next.map(metaOf));
        return next;
      });
      setFolderName(synced.dirName);
      onShowToast?.(`Resynced "${synced.dirName}" — ${fresh.length} tracks`, "success");
    } catch {
      onShowToast?.("Resync failed.", "info");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const handleForget = async () => {
    if (!confirm("Remove all local files from the library? (Your files on disk are untouched.)")) return;
    await forgetDirectoryHandle();
    dropAllObjectUrls();
    setEntries([]);
    clearIndex();
    setFolderName(null);
    setHasSavedDir(false);
    onShowToast?.("Local library cleared.", "info");
  };

  const handleRemove = (id: string, title: string) => {
    dropObjectUrl(id);
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveIndex(next.map(metaOf));
      return next;
    });
    onShowToast?.(`Removed "${title}" from local library`, "info");
  };

  const totalBytes = useMemo(() => entries.reduce((acc, e) => acc + (e.size || 0), 0), [entries]);

  const displayed = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.artist.toLowerCase().includes(q) ||
        (e.album && e.album.toLowerCase().includes(q)) ||
        e.fileName.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const buildQueue = async (list: LocalTrackEntry[]): Promise<{ tracks: Track[]; albums: Map<string, Album> } | null> => {
    const tracks: Track[] = [];
    const albums = new Map<string, Album>();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      try {
        const url = await resolveObjectUrl(e);
        tracks.push(toPlayerTrack(e, url, i + 1));
        albums.set(e.id, {
          id: "local_library",
          identifier: "local_library",
          title: e.album || folderName || "Local files",
          artist: e.artist,
          coverUrl: undefined,
          year: "",
          tracks: [],
          source: "local",
          capturedAt: new Date().toISOString(),
        });
      } catch {
        // Unreachable file (folder moved?) — skip, keep the queue going
      }
    }
    return tracks.length ? { tracks, albums } : null;
  };

  const handlePlay = async (entry: LocalTrackEntry) => {
    if (busy) return;
    setBusy("play");
    try {
      const idx = displayed.findIndex((e) => e.id === entry.id);
      const queue = await buildQueue(displayed);
      if (!queue) {
        onShowToast?.("That file isn't reachable — hit Resync or re-pick the folder.", "info");
        return;
      }
      const track = queue.tracks[idx === -1 ? 0 : idx];
      const album = queue.albums.get(track.id);
      playTrack(track, album, queue.tracks);
    } finally {
      setBusy(null);
    }
  };

  const handlePlayAll = async () => {
    if (!displayed.length || busy) return;
    setBusy("play");
    try {
      const queue = await buildQueue(displayed);
      if (!queue) return;
      playTrack(queue.tracks[0], queue.albums.get(queue.tracks[0].id), queue.tracks);
      onShowToast?.(`Playing ${queue.tracks.length} local tracks`, "success");
    } finally {
      setBusy(null);
    }
  };

  const handleShuffleAll = async () => {
    if (!displayed.length || busy) return;
    setBusy("play");
    try {
      const queue = await buildQueue(displayed);
      if (!queue) return;
      playRandomTracks(queue.tracks, (t) => queue.albums.get(t.id));
      onShowToast?.(`Shuffling ${queue.tracks.length} local tracks`, "success");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <TabHeader
        tone="sky"
        icon={<HardDrive className="w-4 h-4" />}
        title="Local Music"
        subtitle={
          <>
            {entries.length} local track{entries.length === 1 ? "" : "s"} •{" "}
            {(totalBytes / (1024 * 1024)).toFixed(1)} MB on this device.
          </>
        }
        actions={
          <>
            {displayed.length > 0 && (
              <>
                <button
                  onClick={handlePlayAll}
                  disabled={!!busy}
                  className="h-9 px-4 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-stone-950 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-stone-950" />
                  <span>Play all</span>
                </button>
                <button
                  onClick={handleShuffleAll}
                  disabled={!!busy}
                  className="h-9 px-4 rounded-full bg-stone-900 hover:bg-stone-850 disabled:opacity-50 text-stone-200 border border-stone-800 font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle</span>
                </button>
              </>
            )}
            <button
              onClick={handlePickFolder}
              disabled={!!busy}
              className="h-9 px-4 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-stone-950 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              {busy === "pick" || busy === "scan" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
              <span>Pick music folder</span>
            </button>
            {hasSavedDir && (
              <button
                onClick={handleResync}
                disabled={!!busy}
                title="Re-read the saved folder (picks up new downloads)"
                className="w-9 h-9 rounded-full grid place-items-center bg-stone-900 hover:bg-stone-850 disabled:opacity-50 text-stone-300 border border-stone-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy === "scan" ? "animate-spin" : ""}`} />
              </button>
            )}
            {entries.length > 0 && (
              <button
                onClick={handleForget}
                disabled={!!busy}
                title="Remove all local files from the library (disk untouched)"
                className="w-9 h-9 rounded-full grid place-items-center bg-stone-900 hover:bg-stone-850 disabled:opacity-50 text-stone-400 hover:text-red-400 border border-stone-800 transition-colors cursor-pointer"
              >
                <FolderX className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        }
      />

      {/* Scan progress */}
      {progress && progress.total > 0 && (
        <div className="px-4 py-2.5 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 flex items-center space-x-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-[width]"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] shrink-0">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}

      {/* List */}
      {entries.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-2xl bg-stone-900/30 border border-stone-800 p-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 mx-auto flex items-center justify-center text-sky-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-stone-200">No local music yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            Pick a music folder from your device — tags (artist, title, album) are read on-device, files never leave
            your machine. On mobile, use Pick files. Everything plays through the same player, offline, forever.
          </p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-12 text-center space-y-3 rounded-2xl bg-stone-900/30 border border-stone-800 p-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 mx-auto flex items-center justify-center text-sky-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-stone-200">No matches</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">No local tracks match "{searchQuery}".</p>
        </div>
      ) : (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden divide-y divide-white/5">
          <div className="px-3.5 py-2.5 bg-stone-950/60 text-[11px] uppercase tracking-[0.12em] font-semibold text-stone-500 flex items-center justify-between">
            <span>Local track & artist</span>
            <span>Format & playback</span>
          </div>
          {displayed.map((entry) => {
            const isCurrent = currentTrack?.id === entry.id;
            const sizeMb = (entry.size / (1024 * 1024)).toFixed(1);
            return (
              <div
                key={entry.id}
                className={`group px-3 py-2 flex items-center gap-3 text-xs border transition-colors ${
                  isCurrent
                    ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
                    : "border-transparent hover:bg-white/5 text-stone-200"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => handlePlay(entry)}
                    aria-label={`Play ${entry.title}`}
                    className="relative w-8 h-8 rounded-lg overflow-hidden bg-stone-800 border border-stone-800 flex items-center justify-center shrink-0 cursor-pointer group-hover:border-sky-500/50"
                    title="Play local track"
                  >
                    <Music className="w-3.5 h-3.5 text-stone-400" />
                    <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-3 h-3 text-sky-400 fill-sky-400 ml-0.5" />
                    </div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[13px] leading-tight text-stone-100 truncate flex items-center gap-1.5">
                      <span className="truncate">{entry.title}</span>
                      {isCurrent && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                      )}
                    </div>
                    <p className="text-stone-500 text-[11px] truncate leading-tight mt-0.5">
                      {entry.artist} <span className="text-stone-600">•</span> {entry.album || entry.relativePath}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] tabular-nums px-2 py-0.5 rounded bg-stone-800 text-sky-300">
                    {entry.format}
                  </span>
                  <span className="text-[10px] tabular-nums px-2 py-0.5 rounded bg-stone-800 text-stone-300 hidden sm:inline">
                    {sizeMb} MB
                  </span>
                  <span className="w-12 text-right text-[11px] tabular-nums text-stone-500">
                    {entry.duration > 0 ? formatTime(entry.duration, "—") : "—"}
                  </span>
                  <button
                    onClick={() => handlePlay(entry)}
                    aria-label={`Play ${entry.title}`}
                    className="p-1.5 rounded-full text-sky-400 hover:bg-white/10 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
                    title="Play local file"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => handleRemove(entry.id, entry.title)}
                    aria-label={`Remove ${entry.title} from local library`}
                    className="p-1.5 rounded-full text-stone-500 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
                    title="Remove from local library (disk untouched)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
