import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Grid,
  List,
  Play,
  Music,
  Plus,
  Disc3,
  ListMusic,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  FolderArchive,
  Download,
  Layers,
  User,
  Shuffle,
  Database,
  Share2,
  History,
  MoreVertical,
} from "lucide-react";
import { Album, Track, Playlist, TierList, ListenHistoryItem } from "../types";
import { getStoredHistory } from "../services/storage";
import { fetchAlbumDetails } from "../services/api";
import { buildSmartMixes, loadHistoryPlayback, SmartMix } from "../services/insights";
import { usePlayer } from "../context/PlayerContext";
import { linkForPlaylist } from "../services/share";
import { downloadAlbumZip, downloadTrackAudio } from "../utils/download";
import { TierListView } from "./TierListView";
import { LocalLibraryTab } from "./LocalLibraryTab";
import { TIER_CONFIG } from "../utils/tierList";
import { offlineCache, CachedAudioItem } from "../services/offlineCache";
import { formatTime } from "../utils/format";
import { LocalTrackEntry, resolveObjectUrl, toPlayerTrack } from "../services/localLibrary";

interface VaultArtist {
  name: string;
  albums: Album[];
  songCount: number;
  coverUrl?: string;
}

interface LibraryViewProps {
  albums: Album[];
  playlists: Playlist[];
  tierLists?: TierList[];
  onSelectAlbum: (album: Album) => void;
  onUpdateAlbum?: (album: Album) => void;
  onDeleteAlbum: (albumId: string) => void;
  onOpenCaptureModal: () => void;
  onOpenBackupModal: () => void;
  onOpenSettingsModal?: () => void;
  onAddTrackToPlaylist: (playlistId: string, track: Track) => void;
  onCreatePlaylist: (name: string, description?: string) => Playlist | void;
  onDeletePlaylist: (playlistId: string) => void;
  onUpdatePlaylist: (updated: Playlist) => void;
  onCreateTierList?: (name: string, description?: string) => void;
  onDeleteTierList?: (tierListId: string) => void;
  onUpdateTierList?: (updated: TierList) => void;
  onShowToast?: (message: string, type?: "success" | "info") => void;
  onOpenArtistDiscography?: (artist: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  albums,
  playlists,
  tierLists = [],
  onSelectAlbum,
  onUpdateAlbum,
  onDeleteAlbum,
  onOpenCaptureModal,
  onOpenBackupModal,
  onAddTrackToPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onUpdatePlaylist,
  onCreateTierList,
  onDeleteTierList,
  onUpdateTierList,
  onShowToast,
  onOpenArtistDiscography,
}) => {
  const { playTrack, playRandomTracks, addToQueue, currentTrack, isPlaying } = usePlayer();

  // Tab switched here: focus vault search so it's ready to type (desktop pointers only)
  useEffect(() => {
    if (window.matchMedia?.("(pointer: fine)").matches) {
      const t = setTimeout(() => {
        (document.getElementById("vault-general-search") as HTMLInputElement | null)?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
  }, []);
  const SUBTABS: Array<"albums" | "offline" | "artists" | "tierlists" | "playlists" | "songs"> = [
    "albums",
    "offline",
    "artists",
    "tierlists",
    "playlists",
    "songs",
  ];
  const [activeSubTab, setActiveSubTab] = useState<
    "albums" | "offline" | "tierlists" | "playlists" | "songs" | "artists"
  >("albums");
  const [searchQuery, setSearchQuery] = useState("");
  const [offlineInnerTab, setOfflineInnerTab] = useState<"cached" | "local">("cached");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [playlistMenuTrackId, setPlaylistMenuTrackId] = useState<string | null>(null);
  // Overflow (⋮) menu for playlist + all-songs rows — viewport-anchored so it
  // never clips inside scrollable containers. `context` tells the shared
  // menu which actions apply (playlist rows can reorder/remove).
  const [songMenu, setSongMenu] = useState<{
    key: string;
    track: Track;
    context: "playlist" | "songs";
    playlistIndex: number;
    top: number;
    left: number;
  } | null>(null);
  const openSongMenu = (
    e: React.MouseEvent,
    key: string,
    track: Track,
    context: "playlist" | "songs",
    playlistIndex: number = -1
  ) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const w = 224;
    setSongMenu({
      key,
      track,
      context,
      playlistIndex,
      top: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - 260)),
      left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)),
    });
  };

  // Offline Cached Audio state
  const [cachedAudioItems, setCachedAudioItems] = useState<CachedAudioItem[]>([]);

  // Recently played (listen history) — hidden for now, flip to reuse later
  const SHOW_RECENTLY_PLAYED = false;
  const [recentHistory, setRecentHistory] = useState<ListenHistoryItem[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);

  React.useEffect(() => {
    const refreshCached = async () => {
      const items = await offlineCache.getAllCachedAudio();
      setCachedAudioItems(items);
    };
    refreshCached();
    const unsub = offlineCache.subscribe(refreshCached);
    return unsub;
  }, []);

  // Refresh listen history whenever the Cached inner tab is shown
  useEffect(() => {
    if (!SHOW_RECENTLY_PLAYED) return;
    if (activeSubTab === "offline" && offlineInnerTab === "cached") {
      const seen = new Set<string>();
      const deduped = getStoredHistory().filter((h) => {
        if (seen.has(h.trackId)) return false;
        seen.add(h.trackId);
        return true;
      });
      setRecentHistory(deduped.slice(0, 8));
    }
  }, [activeSubTab, offlineInnerTab]);

  // Mobile swipe gesture between subtabs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Detect intentional horizontal swipe
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.4 && duration < 500) {
      const currentIndex = SUBTABS.indexOf(activeSubTab);
      if (currentIndex !== -1) {
        if (diffX < 0 && currentIndex < SUBTABS.length - 1) {
          // Swiped left -> next tab
          setActiveSubTab(SUBTABS[currentIndex + 1]);
        } else if (diffX > 0 && currentIndex > 0) {
          // Swiped right -> prev tab
          setActiveSubTab(SUBTABS[currentIndex - 1]);
        }
      }
    }
  };

  // Playlists inner state
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(playlists[0]?.id || "");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [editingPlaylistTitle, setEditingPlaylistTitle] = useState(false);
  const [editPlaylistText, setEditPlaylistText] = useState("");

  // Smart mixes: rebuilt live from history + vault (never stored).
  // NOTE: declared up here — activePlaylist below reads smartMixes on every render.
  const [mixHistory, setMixHistory] = useState<ListenHistoryItem[]>([]);
  useEffect(() => {
    if (activeSubTab === "playlists") setMixHistory(getStoredHistory());
  }, [activeSubTab]);
  const smartMixes = useMemo(() => buildSmartMixes(mixHistory, albums), [mixHistory, albums]);

  const activeMix = smartMixes.find((m) => m.id === selectedPlaylistId) || null;
  const mixAsPlaylist = (m: SmartMix): Playlist => ({
    id: m.id,
    name: m.name,
    description: m.description,
    createdAt: "",
    updatedAt: "",
    tracks: m.tracks,
  });
  const activePlaylist =
    playlists.find((p) => p.id === selectedPlaylistId) ||
    (activeMix ? mixAsPlaylist(activeMix) : null) ||
    playlists[0] ||
    (smartMixes[0] ? mixAsPlaylist(smartMixes[0]) : null);
  const activeIsMix = !!activePlaylist && activePlaylist.id.startsWith("smart_");

  // Menu rows: user playlists + smart mixes, identical rows
  const filteredMixes = useMemo(() => {
    if (!searchQuery.trim()) return smartMixes;
    const q = searchQuery.toLowerCase();
    return smartMixes.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q)
    );
  }, [smartMixes, searchQuery]);

  // All unique user tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    albums.forEach((a) => {
      (a.tags || []).forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [albums]);

  // Filtered albums based on search (single axis: every vault album shows here)
  const displayedAlbums = useMemo(() => {
    const source = albums;

    return source.filter((album) => {
      if (selectedTag && !(album.tags || []).includes(selectedTag)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (album.title || "").toLowerCase().includes(q);
        const matchArtist = (album.artist || "").toLowerCase().includes(q);
        const matchNotes = (album.userNotes || "").toLowerCase().includes(q);
        const matchTags = (album.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchTracks = (album.tracks || []).some((t) => (t.title || "").toLowerCase().includes(q));
        const matchTier = album.tier ? album.tier.toLowerCase() === q : false;
        return matchTitle || matchArtist || matchNotes || matchTags || matchTracks || matchTier;
      }
      return true;
    });
  }, [albums, activeSubTab, selectedTag, searchQuery]);

  // Local device files reported up by the Local tab (for All Songs)
  const [localEntries, setLocalEntries] = useState<LocalTrackEntry[]>([]);

  const mapOfflineToTrack = (it: CachedAudioItem): Track => ({
    id: it.id,
    title: it.title,
    artist: it.artist,
    album: it.album,
    albumId: it.albumId,
    trackNumber: it.trackNumber || 1,
    duration: it.duration,
    streamUrl: it.streamUrl,
    audioUrl: it.streamUrl,
    format: it.mimeType?.includes("flac") ? "FLAC" : "MP3",
  });

  // Flattened all songs: vault albums + playlists + offline cache + local files
  const allSongs = useMemo(() => {
    const list: { track: Track; album: Album }[] = [];
    const seen = new Set<string>();
    const push = (track: Track | null | undefined, album: Album) => {
      if (!track || !track.id) return;
      // Same recording may legitimately repeat across vault/playlist/offline/local —
      // dedupe only exact same-track-in-same-context entries
      const key = `${track.id}__${album?.id || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ track, album });
    };
    const fallbackAlbum = (
      id: string,
      title: string,
      artist: string,
      source: string
    ): Album => ({
      id,
      identifier: id,
      title,
      artist,
      coverUrl: undefined,
      year: "",
      tracks: [],
      source,
      capturedAt: new Date().toISOString(),
    });
    albums.forEach((album) => {
      (album.tracks || []).forEach((track) => push(track, album));
    });
    playlists.forEach((pl) => {
      (pl.tracks || []).forEach((track) => {
        const vaultAlbum = albums.find((a) => a.id === track.albumId);
        push(
          track,
          vaultAlbum ||
            fallbackAlbum(
              track.albumId || pl.id,
              track.album || pl.name,
              track.artist || "Unknown Artist",
              "Playlist"
            )
        );
      });
    });
    cachedAudioItems.forEach((item) => {
      const parentAlbum = albums.find((a) => a.id === item.albumId);
      push(
        mapOfflineToTrack(item),
        parentAlbum ||
          fallbackAlbum(
            item.albumId || `album_${item.id}`,
            item.album || "Offline Storage",
            item.artist || "Unknown Artist",
            "local"
          )
      );
    });
    localEntries.forEach((entry, i) => {
      push(
        { ...toPlayerTrack(entry, "", i + 1) },
        fallbackAlbum(
          "local_library",
          entry.album || "Local files",
          entry.artist || "Unknown Artist",
          "local"
        )
      );
    });
    return list;
  }, [albums, playlists, cachedAudioItems, localEntries]);

  // Songs filtered by general vault search
  const displayedSongs = useMemo(() => {
    if (!searchQuery.trim()) return allSongs;
    const q = searchQuery.toLowerCase();
    return allSongs.filter(({ track, album }) => {
      return (
        (track.title || "").toLowerCase().includes(q) ||
        (track.artist || "").toLowerCase().includes(q) ||
        (track.filename || "").toLowerCase().includes(q) ||
        (album.title || "").toLowerCase().includes(q) ||
        (album.artist || "").toLowerCase().includes(q)
      );
    });
  }, [allSongs, searchQuery]);

  const handleSaveMix = (mix: SmartMix) => {
    const created = onCreatePlaylist(mix.name, mix.description) as Playlist | void;
    const pl =
      created && typeof created === "object"
        ? created
        : playlists.find((p) => p.name === mix.name);
    if (!pl) return;
    onUpdatePlaylist({ ...pl, tracks: mix.tracks, updatedAt: new Date().toISOString() });
    if (onShowToast) onShowToast(`Saved "${mix.name}" (${mix.tracks.length} tracks)`, "success");
  };
  const displayedPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const q = searchQuery.toLowerCase();
    return playlists.filter((pl) => {
      const matchName = (pl.name || "").toLowerCase().includes(q);
      const matchDesc = (pl.description || "").toLowerCase().includes(q);
      const matchTrack = (pl.tracks || []).some(
        (t) => (t.title || "").toLowerCase().includes(q) || (t.artist || "").toLowerCase().includes(q)
      );
      return matchName || matchDesc || matchTrack;
    });
  }, [playlists, searchQuery]);

  // Menu rows: user playlists + smart mixes, identical rows.
  // NOTE: declared here (after displayedPlaylists) — menuRows must not
  // run before the memos it reads (TDZ crash on every Vault render).
  const menuRows = useMemo(() => {
    const rows = displayedPlaylists.map((pl) => ({
      id: pl.id,
      name: pl.name,
      sub: `${pl.tracks.length} track${pl.tracks.length === 1 ? "" : "s"}`,
    }));
    for (const m of filteredMixes) {
      rows.push({
        id: m.id,
        name: m.name,
        sub: `${m.tracks.length} track${m.tracks.length === 1 ? "" : "s"}`,
      });
    }
    return rows;
  }, [displayedPlaylists, filteredMixes]);

  // Tier lists filtered by general vault search
  const displayedTierLists = useMemo(() => {
    if (!searchQuery.trim()) return tierLists;
    const q = searchQuery.toLowerCase();
    return tierLists.filter((tl) => {
      const matchName = (tl.name || "").toLowerCase().includes(q);
      const matchDesc = (tl.description || "").toLowerCase().includes(q);
      const matchItem = (tl.items || []).some(
        (it) => (it.albumTitle || "").toLowerCase().includes(q) || (it.artist || "").toLowerCase().includes(q)
      );
      return matchName || matchDesc || matchItem;
    });
  }, [tierLists, searchQuery]);

  // Vault artists computed from albums
  const vaultArtists = useMemo(() => {
    const map = new Map<string, VaultArtist>();

    albums.forEach((album) => {
      const artistName = (album.artist || "Unknown Artist").trim();
      if (!artistName) return;
      const key = artistName.toLowerCase();

      const existing = map.get(key);
      if (existing) {
        existing.albums.push(album);
        existing.songCount += (album.tracks || []).length;
        if (!existing.coverUrl && album.coverUrl) {
          existing.coverUrl = album.coverUrl;
        }
      } else {
        map.set(key, {
          name: artistName,
          albums: [album],
          songCount: (album.tracks || []).length,
          coverUrl: album.coverUrl,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [albums]);

  // Artists filtered by general vault search
  const displayedArtists = useMemo(() => {
    if (!searchQuery.trim()) return vaultArtists;
    const q = searchQuery.toLowerCase();
    return vaultArtists.filter((art) => art.name.toLowerCase().includes(q));
  }, [vaultArtists, searchQuery]);

  const formatDuration = (seconds: number) => formatTime(seconds, "--:--");

  const totalSongsDuration = useMemo(() => {
    return displayedSongs.reduce((acc, s) => acc + (s.track.duration || 0), 0);
  }, [displayedSongs]);

  const localEntryMap = useMemo(() => {
    const m = new Map<string, LocalTrackEntry>();
    localEntries.forEach((e) => m.set(e.id, e));
    return m;
  }, [localEntries]);

  // Local tracks carry no URL until resolved — hydrate them before queuing.
  // Pairs are keyed by track+album so the same recording can repeat in All Songs.
  const pairKey = (t: Track, a?: Album) => `${t.id}__${a?.id || ""}`;
  const resolveSongsQueue = async (pairs: { track: Track; album: Album }[]) => {
    const resolved: { track: Track; album: Album }[] = [];
    const albumsById = new Map<string, Album>();
    for (const { track, album } of pairs) {
      if (track.albumId === "local_library" && !track.streamUrl) {
        const entry = localEntryMap.get(track.id);
        if (!entry) continue;
        try {
          const url = await resolveObjectUrl(entry);
          const hydrated = { ...track, streamUrl: url, audioUrl: url };
          resolved.push({ track: hydrated, album });
          albumsById.set(pairKey(track, album), album);
          albumsById.set(track.id, album);
        } catch {
          // Unreachable file (folder moved?) — skip, keep the queue going
        }
      } else {
        resolved.push({ track, album });
        albumsById.set(pairKey(track, album), album);
        albumsById.set(track.id, album);
      }
    }
    return { pairs: resolved, tracks: resolved.map((p) => p.track), albumsById };
  };

  const handleRandomPlayAllSongs = async () => {
    const targetPool = displayedSongs.length > 0 ? displayedSongs : allSongs;
    if (targetPool.length === 0) {
      if (onShowToast) onShowToast("No songs anywhere yet to play.", "info");
      return;
    }

    const { tracks, albumsById } = await resolveSongsQueue(targetPool);
    if (tracks.length === 0) {
      if (onShowToast) onShowToast("Those local files aren't reachable right now.", "info");
      return;
    }

    playRandomTracks(tracks, (track) => albumsById.get(track.id));

    if (onShowToast) {
      onShowToast(`Shuffling & playing all ${tracks.length} songs!`, "success");
    }
  };

  const handlePlayAllSongsInOrder = async () => {
    const targetPool = displayedSongs.length > 0 ? displayedSongs : allSongs;
    if (targetPool.length === 0) return;
    const { pairs } = await resolveSongsQueue(targetPool);
    if (pairs.length === 0) return;
    playTrack(pairs[0].track, pairs[0].album, pairs.map((p) => p.track));
    if (onShowToast) {
      onShowToast(`Playing ${pairs.length} songs in order`, "info");
    }
  };

  const handlePlaySongFromAll = async (pair: { track: Track; album: Album }) => {
    const { pairs } = await resolveSongsQueue(displayedSongs);
    const idx = pairs.findIndex(
      (p) => p.track.id === pair.track.id && (p.album?.id || "") === (pair.album?.id || "")
    );
    if (idx === -1) {
      if (onShowToast) onShowToast("That file isn't reachable — hit Resync or re-pick the folder.", "info");
      return;
    }
    playTrack(pairs[idx].track, pairs[idx].album, pairs.map((p) => p.track));
  };

  // Offline Cached audio memoized list
  const displayedOfflineItems = useMemo(() => {
    if (!searchQuery.trim()) return cachedAudioItems;
    const q = searchQuery.toLowerCase();
    return cachedAudioItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.artist.toLowerCase().includes(q) ||
        (item.album && item.album.toLowerCase().includes(q))
    );
  }, [cachedAudioItems, searchQuery]);

  const handlePlayOfflineTrack = (item: CachedAudioItem) => {
    const parentAlbum = albums.find((a) => a.id === item.albumId);
    const track = mapOfflineToTrack(item);
    const fallbackAlbum: Album = parentAlbum || {
      id: item.albumId || `album_${item.id}`,
      identifier: item.albumId || `album_${item.id}`,
      title: item.album || "Offline Storage",
      artist: item.artist || "Unknown Artist",
      coverUrl: undefined,
      year: "",
      tracks: [track],
      source: "local",
      capturedAt: new Date().toISOString(),
    };
    const allTracks: Track[] = displayedOfflineItems.map(mapOfflineToTrack);
    playTrack(track, fallbackAlbum, allTracks);
    if (onShowToast) {
      onShowToast(`Playing "${item.title}" directly from offline cache (0ms latency)`, "success");
    }
  };

  const handleShuffleAllOffline = () => {
    if (displayedOfflineItems.length === 0) return;
    const allTracks: Track[] = displayedOfflineItems.map(mapOfflineToTrack);
    const albumMap = new Map<string, Album>();
    displayedOfflineItems.forEach((it) => {
      const existingAlbum = albums.find((a) => a.id === it.albumId);
      albumMap.set(
        it.id,
        existingAlbum || {
          id: it.albumId || `album_${it.id}`,
          identifier: it.albumId || `album_${it.id}`,
          title: it.album || "Offline Storage",
          artist: it.artist || "Unknown Artist",
          coverUrl: undefined,
          year: "",
          tracks: [],
          source: "local",
          capturedAt: new Date().toISOString(),
        }
      );
    });
    playRandomTracks(allTracks, (t) => albumMap.get(t.id));
    if (onShowToast) {
      onShowToast(`Shuffling ${allTracks.length} offline tracks`, "success");
    }
  };

  const handlePlayAllOffline = () => {
    if (displayedOfflineItems.length === 0) return;
    const allTracks = displayedOfflineItems.map(mapOfflineToTrack);
    playTrack(allTracks[0], undefined, allTracks);
    if (onShowToast) {
      onShowToast(`Playing ${allTracks.length} cached tracks in order`, "success");
    }
  };

  const handleReplayHistoryItem = async (item: ListenHistoryItem) => {
    if (isReplaying) return;
    if (!item.albumId || item.albumId === "local_library") {
      onShowToast?.("Local file replay lives in the Local files tab.", "info");
      return;
    }
    setIsReplaying(true);
    try {
      const loaded = await loadHistoryPlayback(item, fetchAlbumDetails);
      if (!loaded) {
        onShowToast?.("Couldn't reload that recording.", "info");
        return;
      }
      playTrack(loaded.track, loaded.album, loaded.album.tracks);
    } catch {
      onShowToast?.("Couldn't reload that recording.", "info");
    } finally {
      setIsReplaying(false);
    }
  };

  const goToSearchMusic = () => {
    if (window.location.hash === "#search") {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = "search";
    }
    setTimeout(() => {
      const input = document.getElementById("main-music-search-input") as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 120);
  };

  const handleRemoveOfflineItem = async (trackId: string, title: string) => {
    await offlineCache.removeCachedTrack(trackId);
    if (onShowToast) {
      onShowToast(`Removed "${title}" from offline cache`, "info");
    }
  };

  const handleClearAllOffline = async () => {
    if (confirm("Remove all cached tracks from offline browser storage?")) {
      await offlineCache.clearAllCache();
      if (onShowToast) {
        onShowToast("Cleared all offline cached audio", "info");
      }
    }
  };

  const defaultPlaylistName = `Playlist #${playlists.length + 1}`;

  const handleCreatePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim() || defaultPlaylistName;
    onCreatePlaylist(name, newPlaylistDesc.trim());
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    setIsCreatingPlaylist(false);
  };

  const handleMovePlaylistTrack = (index: number, direction: "up" | "down") => {
    if (!activePlaylist) return;
    const newTracks = [...activePlaylist.tracks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTracks.length) return;

    const temp = newTracks[index];
    newTracks[index] = newTracks[targetIndex];
    newTracks[targetIndex] = temp;

    onUpdatePlaylist({
      ...activePlaylist,
      tracks: newTracks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemovePlaylistTrack = (index: number) => {
    if (!activePlaylist) return;
    const newTracks = activePlaylist.tracks.filter((_, i) => i !== index);
    onUpdatePlaylist({
      ...activePlaylist,
      tracks: newTracks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveRename = () => {
    if (!activePlaylist || !editPlaylistText.trim()) return;
    onUpdatePlaylist({
      ...activePlaylist,
      name: editPlaylistText.trim(),
      updatedAt: new Date().toISOString(),
    });
    setEditingPlaylistTitle(false);
  };

  return (
    <div
      className="space-y-4 pb-8 select-none touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. General Vault Search Bar & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Prominent General Vault Search Input */}
        <div className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="vault-general-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              // Release focus back to global keybindings (Space/K/J/L/arrows)
              if (e.key === "Escape") (e.target as HTMLInputElement).blur();
            }}
            placeholder="Search vault albums, playlists, songs, tier lists..."
            aria-label="Search your vault"
            className="w-full h-10 pl-9 pr-8 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl text-stone-100 placeholder-stone-400 text-xs leading-normal focus:outline-none focus:border-amber-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-200 text-xs cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Buttons: uniform size */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            id="vault-capture-album-btn"
            onClick={onOpenCaptureModal}
            className="flex-1 sm:flex-none h-9 px-3 bg-[var(--color-secondary-main)] hover:bg-[var(--color-secondary-light)] text-stone-950 font-semibold text-xs rounded-xl transition-all shadow flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap"
            title="Capture album or show by Archive.org URL or ID"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Capture Album</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-tabs bar: Spotify-style horizontal filter pills with touch swipe & scrolling for mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-850">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1.5 sm:pb-0 scrollbar-none select-none touch-pan-x snap-x scroll-smooth">
          <button
            id="subtab-albums"
            onClick={() => setActiveSubTab("albums")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
              activeSubTab === "albums"
                ? "bg-[var(--color-accent-main)] text-stone-950 border-[var(--color-accent-main)] font-semibold shadow-xs"
                : "bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-stone-800"
            }`}
          >
            Albums
          </button>
          <button
            id="subtab-offline"
            onClick={() => setActiveSubTab("offline")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
              activeSubTab === "offline"
                ? "bg-emerald-500 text-stone-950 border-emerald-500 font-semibold shadow-xs"
                : "bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-stone-800"
            }`}
          >
            <Database className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === "offline" ? "text-stone-950 fill-stone-950" : "text-emerald-400"}`} />
            <span>Offline</span>
          </button>
          <button
            id="subtab-artists"
            onClick={() => setActiveSubTab("artists")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
              activeSubTab === "artists"
                ? "bg-[var(--color-secondary-main)] text-stone-950 border-[var(--color-secondary-main)] font-semibold shadow-xs"
                : "bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-stone-800"
            }`}
          >
            <User className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === "artists" ? "text-stone-950" : "text-[var(--color-secondary-main)]"}`} />
            <span>Artists</span>
          </button>
          <button
            id="subtab-tierlists"
            onClick={() => setActiveSubTab("tierlists")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
              activeSubTab === "tierlists"
                ? "bg-[var(--color-accent-light)] text-stone-950 border-[var(--color-accent-light)] font-semibold shadow-xs"
                : "bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-stone-800"
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === "tierlists" ? "text-stone-950" : "text-[var(--color-accent-light)]"}`} />
            <span>Tier Lists</span>
          </button>
          <button
            id="subtab-playlists"
            onClick={() => setActiveSubTab("playlists")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
              activeSubTab === "playlists"
                ? "bg-[var(--color-secondary-light)] text-stone-950 border-[var(--color-secondary-light)] font-semibold shadow-xs"
                : "bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-stone-800"
            }`}
          >
            Playlists
          </button>
          <button
            id="subtab-songs"
            onClick={() => setActiveSubTab("songs")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
              activeSubTab === "songs"
                ? "bg-stone-100 text-stone-950 border-stone-100 font-semibold shadow-xs"
                : "bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-stone-800"
            }`}
          >
            All Songs
          </button>
        </div>

        {/* Secondary filters: Tag pills */}
        <div className="flex items-center space-x-2">
          {allTags.length > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="px-2 py-0.5 rounded text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 cursor-pointer"
                >
                  #{selectedTag} ✕
                </button>
              )}
              <div className="hidden md:flex items-center space-x-1 max-w-[200px] overflow-x-auto">
                {allTags.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                      selectedTag === tag
                        ? "bg-amber-500 text-stone-950 font-semibold"
                        : "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIEW: OFFLINE CACHE (OPFS / INDEXEDDB) */}
      {activeSubTab === "offline" && (
        <div className="space-y-4">
          {/* Inner tabs: pinned cache vs device library */}
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-stone-900/60 border border-stone-800 w-fit">
            <button
              onClick={() => setOfflineInnerTab("cached")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                offlineInnerTab === "cached"
                  ? "bg-emerald-500 text-stone-950"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Cached
            </button>
            <button
              onClick={() => setOfflineInnerTab("local")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                offlineInnerTab === "local"
                  ? "bg-sky-500 text-stone-950"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Local files
            </button>
          </div>

          {offlineInnerTab === "local" ? (
            <LocalLibraryTab searchQuery={searchQuery} onShowToast={onShowToast} onEntriesChange={setLocalEntries} />
          ) : (
          <>
          {/* Cached quick actions (stats card removed) */}
          {cachedAudioItems.length > 0 && (
            <div className="flex items-center gap-2.5 justify-end flex-wrap">
              <button
                id="btn-offline-play-all"
                onClick={handlePlayAllOffline}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-stone-950" />
                <span>Play all</span>
              </button>
              <button
                id="btn-offline-shuffle-all"
                onClick={handleShuffleAllOffline}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-200 border border-stone-800 font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>
              <button
                id="btn-offline-clear-all"
                onClick={handleClearAllOffline}
                className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-red-400 border border-stone-800 text-xs transition-colors cursor-pointer"
                title="Clear all offline cached tracks"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Recently played — hidden for now (SHOW_RECENTLY_PLAYED), reuse later */}
          {SHOW_RECENTLY_PLAYED && recentHistory.length > 0 && (
            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden">
              <div className="px-3.5 py-2.5 bg-stone-950/60 text-[10px] uppercase font-semibold text-stone-500 flex items-center gap-1.5">
                <History className="w-3 h-3" />
                <span>Recently played</span>
              </div>
              <div className="divide-y divide-stone-800/50">
                {recentHistory.map((h) => (
                  <div
                    key={h.id}
                    className="group px-3 py-2 flex items-center justify-between text-xs hover:bg-stone-800/40 text-stone-200 transition-colors"
                  >
                    <button
                      onClick={() => handleReplayHistoryItem(h)}
                      disabled={isReplaying}
                      className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2 text-left cursor-pointer disabled:opacity-50"
                      title="Replay this recording"
                    >
                      <Play className="w-3 h-3 text-stone-500 group-hover:text-emerald-400 fill-current shrink-0" />
                      <span className="truncate font-medium text-stone-100">{h.title}</span>
                      <span className="text-stone-500 text-[11px] truncate">
                        {h.artist} <span className="text-stone-600">•</span> {h.album}
                      </span>
                    </button>
                    <span className="font-mono text-[10px] text-stone-500 shrink-0">
                      {new Date(h.listenedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Offline Tracks */}
          {cachedAudioItems.length === 0 ? (
            <div className="py-16 text-center space-y-3 rounded-2xl bg-stone-900/30 border border-stone-800 p-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-stone-200">No Offline Audio Cached Yet</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                Pin individual songs or full albums by clicking the database icon in the player bar, album menu, or track lists. Audio is stored directly in browser storage for instant 0ms latency playback on airplanes, subways, or without WiFi.
              </p>
              <button
                onClick={() => setActiveSubTab("albums")}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-xs rounded-xl transition-colors inline-flex items-center space-x-2 cursor-pointer shadow"
              >
                <Disc3 className="w-4 h-4" />
                <span>Explore Vault Albums to Pin</span>
              </button>
            </div>
          ) : displayedOfflineItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 bg-stone-900/30 border border-stone-800 rounded-xl">
              No offline tracks match "{searchQuery}".
            </div>
          ) : (
            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-800/50">
              <div className="px-3.5 py-2.5 bg-stone-950/60 text-[10px] uppercase font-semibold text-stone-500 flex items-center justify-between">
                <span>Cached Track & Artist</span>
                <span>Size & Playback</span>
              </div>
              {displayedOfflineItems.map((item) => {
                const isCurrent = currentTrack?.id === item.id;
                const sizeMb = (item.size / (1024 * 1024)).toFixed(1);
                const albumCover = albums.find((a) => a.id === item.albumId)?.coverUrl;
                return (
                  <div
                    key={item.id}
                    className={`group px-3 py-2.5 flex items-center justify-between text-xs transition-colors ${
                      isCurrent ? "bg-emerald-500/10 text-emerald-300" : "hover:bg-stone-800/40 text-stone-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                      <button
                        onClick={() => handlePlayOfflineTrack(item)}
                        className="relative w-8 h-8 rounded-lg overflow-hidden bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0 cursor-pointer group-hover:border-emerald-500/50"
                        title="Play offline track"
                      >
                        {albumCover ? (
                          <img src={albumCover} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-3.5 h-3.5 text-stone-400" />
                        )}
                        <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-3 h-3 text-emerald-400 fill-emerald-400 ml-0.5" />
                        </div>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-stone-100 truncate flex items-center gap-1.5">
                          <span className="truncate">{item.title}</span>
                          {isCurrent && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-stone-400 text-[11px] truncate mt-0.5">
                          {item.artist} <span className="text-stone-600">•</span> {item.album || "Offline Storage"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                        {sizeMb} MB
                      </span>
                      <span className="font-mono text-[11px] text-stone-400">
                        {formatDuration(item.duration)}
                      </span>
                      <button
                        onClick={() => handlePlayOfflineTrack(item)}
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        title="Play from offline storage"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => handleRemoveOfflineItem(item.id, item.title)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 cursor-pointer transition-colors"
                        title="Delete from offline cache"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
          )}
        </div>
      )}

      {/* VIEW 1: ALBUMS GRID */}
      {activeSubTab === "albums" && (
        <div>
          {displayedAlbums.length === 0 ? (
            <div className="py-16 text-center space-y-3 rounded-2xl bg-stone-900/30 border border-stone-800 p-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                <Disc3 className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-stone-200">
                Your vault is empty
              </h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                {searchQuery.trim()
                  ? `No albums match "${searchQuery}". Try checking the Playlists, All Songs, or Tier Lists tabs.`
                  : albums.length === 0
                    ? "Your vault is currently empty. Capture recordings from Archive.org or restore a backup."
                    : "No albums match your active filter."}
                </p>
              {albums.length === 0 && (
                <button
                  onClick={goToSearchMusic}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg transition-colors inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search music</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {displayedAlbums.map((album) => (
                <div
                  key={album.id}
                  className="group bg-stone-900/50 hover:bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl p-2.5 transition-colors cursor-pointer"
                  onClick={async () => {
                    // Vault copies captured during an outage can be trackless — refetch, else open as-is
                    if ((!album.tracks || album.tracks.length === 0) && album.identifier) {
                      try {
                        const full = await fetchAlbumDetails(album.identifier);
                        onSelectAlbum(full);
                        return;
                      } catch {
                        // fall through to the stored copy
                      }
                    }
                    onSelectAlbum(album);
                  }}
                >
                  {/* Clean Album Cover Art - No icons on top of the cover art */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-stone-950 border border-stone-800">
                    <img
                      src={album.coverUrl || "https://archive.org/images/notfound.png"}
                      alt={album.title}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://archive.org/images/notfound.png";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  <div className="mt-2">
                    <h3 className="text-xs font-semibold text-stone-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {album.title}
                    </h3>
                    <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                      {album.artist}
                      {album.year ? ` • ${album.year}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: TIER LISTS */}
      {activeSubTab === "tierlists" && (
        <TierListView
          albums={albums}
          tierLists={displayedTierLists}
          onCreateTierList={onCreateTierList || (() => {})}
          onDeleteTierList={onDeleteTierList || (() => {})}
          onUpdateTierList={onUpdateTierList || (() => {})}
          onSelectAlbumForDetail={onSelectAlbum}
          onUpdateAlbum={onUpdateAlbum || (() => {})}
          onShowToast={onShowToast || (() => {})}
        />
      )}

      {/* VIEW 2: PLAYLISTS */}
      {activeSubTab === "playlists" && (
        <div className="space-y-4">
          {(menuRows.length === 0 && (playlists.length > 0 || smartMixes.length > 0)) ? (
            <div className="py-12 text-center text-xs text-stone-500 rounded-xl bg-stone-900/30 border border-stone-800 space-y-2">
              <ListMusic className="w-8 h-8 mx-auto text-stone-600" />
              <p>No playlists match "{searchQuery}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-1">
              {/* Playlists sidebar selector */}
              <div className="md:col-span-1 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-1.5">
                    <ListMusic className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Playlists
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsCreatingPlaylist(true)}
                    className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Create new playlist"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="font-medium text-[11px]">New</span>
                  </button>
                </div>
                {isCreatingPlaylist && (
                  <form
                    onSubmit={handleCreatePlaylistSubmit}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-2.5 animate-in fade-in"
                  >
                    <h4 className="text-xs font-semibold text-stone-200">New Playlist</h4>
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder={defaultPlaylistName}
                      className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newPlaylistDesc}
                      onChange={(e) => setNewPlaylistDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingPlaylist(false)}
                        className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-xl"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                )}
                {menuRows.map((row) => {
                  const isSelected = activePlaylist?.id === row.id;
                  return (
                    <button
                      key={row.id}
                      onClick={() => setSelectedPlaylistId(row.id)}
                      className={`group w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm"
                          : "bg-stone-900/40 border-stone-800/80 hover:bg-stone-900/80 hover:border-stone-700 text-stone-300"
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <h4 className="text-xs font-semibold truncate group-hover:text-amber-300">
                          {row.name}
                        </h4>
                        <p className="text-[10px] text-stone-500 mt-0.5">
                          {row.sub}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active playlist tracks */}
              {activePlaylist ? (
                <div className="md:col-span-3 space-y-4">
                  <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
                    <div className="min-w-0 flex-1">
                      {editingPlaylistTitle ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            value={editPlaylistText}
                            onChange={(e) => setEditPlaylistText(e.target.value)}
                            className="px-2 py-0.5 bg-stone-950 border border-stone-700 rounded text-xs text-stone-100"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveRename}
                            className="p-1 bg-amber-500 text-stone-950 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <h2 className="text-base sm:text-lg font-bold text-stone-100 truncate">
                            {activePlaylist.name}
                          </h2>
                          {!activeIsMix && (
                            <button
                              onClick={() => {
                                setEditPlaylistText(activePlaylist.name);
                                setEditingPlaylistTitle(true);
                              }}
                              className="text-stone-500 hover:text-stone-300"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-stone-500 font-medium mt-0.5">
                        ({activePlaylist.tracks.length} track{activePlaylist.tracks.length === 1 ? "" : "s"})
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          if (activePlaylist.tracks.length > 0) {
                            playTrack(activePlaylist.tracks[0], undefined, activePlaylist.tracks);
                          }
                        }}
                        disabled={activePlaylist.tracks.length === 0}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 text-stone-950 disabled:text-stone-600 font-semibold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-stone-950" />
                        <span>Play All</span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard?.writeText(await linkForPlaylist(activePlaylist.name, activePlaylist.tracks));
                            if (onShowToast) onShowToast("Mixtape link copied — anyone opening it gets these tracks", "success");
                          } catch {
                            if (onShowToast) onShowToast("Couldn't copy link", "info");
                          }
                        }}
                        disabled={activePlaylist.tracks.length === 0}
                        className="p-1.5 text-stone-400 hover:text-amber-400 disabled:opacity-40"
                        title="Copy shareable mixtape link"
                        aria-label="Copy shareable mixtape link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      {activeIsMix ? (
                        <button
                          onClick={() => {
                            const mix = smartMixes.find((m) => m.id === activePlaylist.id);
                            if (mix) handleSaveMix(mix);
                          }}
                          disabled={activePlaylist.tracks.length === 0}
                          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-850 disabled:opacity-40 text-stone-200 border border-stone-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                          title="Save mix as a playlist"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${activePlaylist.name}"?`)) {
                              onDeletePlaylist(activePlaylist.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {activePlaylist.tracks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-stone-500">
                      Empty playlist. Add songs from your Albums or Discover view.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {activePlaylist.tracks.map((track, idx) => {
                        const isCurrent = currentTrack?.id === track.id;
                        return (
                          <div
                            key={`${track.id}_${idx}`}
                            onClick={() => playTrack(track, undefined, activePlaylist.tracks)}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                              isCurrent
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                : "border-transparent hover:bg-white/5 text-stone-200"
                            }`}
                          >
                            <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-stone-600">{idx + 1}</span>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playTrack(track, undefined, activePlaylist.tracks);
                                }}
                                aria-label={`Play ${track.title}`}
                                className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-amber-500 group-hover:text-stone-950 text-stone-300 grid place-items-center shrink-0 transition-colors cursor-pointer"
                              >
                                <Play className="w-3 h-3 ml-0.5" />
                              </button>
                              <div className="truncate min-w-0 flex-1">
                                <p className="font-medium text-[13px] truncate leading-tight">{track.title}</p>
                                <p className="text-stone-500 text-[11px] truncate leading-tight mt-0.5">{track.artist}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-stone-500 shrink-0">
                              <span className="w-12 text-right text-[11px] tabular-nums">{formatDuration(track.duration)}</span>
                              <button
                                type="button"
                                onClick={(e) => openSongMenu(e, `pl_${activePlaylist.id}_${track.id}_${idx}`, track, "playlist", idx)}
                                aria-label={`More options for ${track.title}`}
                                className="p-1.5 rounded-full text-stone-500 hover:text-stone-100 hover:bg-white/10 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
                                title="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              ) : (
                <div className="md:col-span-3 space-y-4">
                  <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-8 text-center space-y-2">
                  <ListMusic className="w-8 h-8 text-stone-600 mx-auto" />
                  <h3 className="text-sm font-bold text-stone-200">No playlists yet</h3>
                  <p className="text-xs text-stone-400">Hit New to create your first playlist.</p>
                  </div>
                </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ALL SONGS LIST */}
      {activeSubTab === "songs" && (
        <div className="space-y-3">
          {/* Spotify-style Header Action Card for All Songs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-b from-amber-500/10 via-stone-900/60 to-stone-900/40 border border-stone-800 rounded-2xl shadow-sm">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <Music className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                  {displayedSongs.length} {displayedSongs.length === 1 ? "track" : "tracks"}
                  {totalSongsDuration > 0 && ` • ~${formatDuration(totalSongsDuration)} total`}
                  {searchQuery.trim() && ` matching "${searchQuery}"`}
                </p>
              </div>
            </div>

            {displayedSongs.length > 0 && (
              <div className="flex items-center space-x-2">
                {/* Random Play All Songs Button */}
                <button
                  id="btn-random-play-all-songs"
                  onClick={handleRandomPlayAllSongs}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-md cursor-pointer"
                  title="Random play all songs directly from Vault"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle All</span>
                </button>

                {/* Play from Start In Order */}
                <button
                  id="btn-play-all-songs-in-order"
                  onClick={handlePlayAllSongsInOrder}
                  className="px-3.5 py-2 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-200 text-xs font-medium transition-colors flex items-center space-x-1.5 border border-stone-750 cursor-pointer"
                  title="Play all songs in order"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Play In Order</span>
                </button>
              </div>
            )}
          </div>

          {/* Songs List */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden divide-y divide-white/5">
            <div className="px-3.5 py-2 bg-stone-950/60 text-[10px] uppercase font-semibold text-stone-500 flex items-center justify-between">
              <span>Title & Artist</span>
              <span>Duration & Actions</span>
            </div>
            {allSongs.length === 0 ? (
              <div className="py-16 text-center space-y-3 p-8">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                  <Music className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-stone-200">No songs yet</h3>
                <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">Search music, sync a local folder, or pin tracks offline.</p>
              </div>
            ) : displayedSongs.length === 0 ? (
              <div className="py-16 text-center space-y-3 p-8">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                  <Music className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-stone-200">No matches</h3>
                <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">No songs match "{searchQuery}".</p>
              </div>
            ) : (
              displayedSongs.map(({ track, album }, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={`${track.id}_${idx}`}
                    onClick={() => handlePlaySongFromAll({ track, album })}
                    className={`group px-3 py-2 flex items-center gap-3 text-xs transition-colors min-h-[46px] border cursor-pointer ${
                      isCurrent
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "border-transparent hover:bg-white/5 text-stone-200"
                    }`}
                  >
                    <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-stone-600">{idx + 1}</span>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Album Cover Thumbnail or Track Play Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySongFromAll({ track, album });
                        }}
                        aria-label={`Play ${track.title}`}
                        className="relative w-8 h-8 rounded-lg overflow-hidden bg-stone-800 group-hover:border-amber-500/50 border border-stone-750 flex items-center justify-center shrink-0 cursor-pointer"
                        title="Play track"
                      >
                        {album.coverUrl ? (
                          <img
                            src={album.coverUrl}
                            alt={album.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-3.5 h-3.5 text-stone-400" />
                        )}
                        <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-3 h-3 text-amber-400 fill-amber-400 ml-0.5" />
                        </div>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[13px] leading-tight text-stone-100 truncate flex items-center gap-1.5">
                          <span className="truncate">{track.title}</span>
                          {isCurrent && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-stone-500 text-[11px] truncate leading-tight mt-0.5">
                          {track.artist} <span className="text-stone-600">•</span> {album.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-12 text-right text-[11px] tabular-nums text-stone-500">
                        {formatDuration(track.duration)}
                      </span>

                      {/* Overflow menu + Add to Playlist popup */}
                      <div className="relative">
                        <button
                          onClick={(e) => openSongMenu(e, `songs_${track.id}_${idx}`, track, "songs")}
                          aria-label={`More options for ${track.title}`}
                          className="p-1.5 rounded-full text-stone-500 hover:text-stone-100 hover:bg-white/10 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {playlistMenuTrackId === track.id && (
                          <div
                            className="absolute right-0 bottom-full mb-1 w-44 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-1 z-30 space-y-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-[9px] uppercase text-stone-500 px-2 py-1 font-semibold">
                              Add to Playlist:
                            </p>
                            {playlists.length === 0 ? (
                              <p className="text-[11px] text-stone-500 px-2 py-1">No playlists yet</p>
                            ) : (
                              playlists.map((pl) => (
                                <button
                                  key={pl.id}
                                  onClick={() => {
                                    onAddTrackToPlaylist(pl.id, track);
                                    setPlaylistMenuTrackId(null);
                                  }}
                                  className="w-full text-left px-2 py-1 rounded-lg text-xs text-stone-300 hover:bg-stone-800 flex items-center justify-between transition-colors"
                                >
                                  <span className="truncate">{pl.name}</span>
                                  <Plus className="w-3 h-3 text-amber-400 shrink-0" />
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW: ARTISTS GRID */}
      {activeSubTab === "artists" && (
        <div>
          {displayedArtists.length === 0 ? (
            <div className="py-16 text-center space-y-3 rounded-2xl bg-stone-900/30 border border-stone-800 p-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                <User className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-stone-200">No artists yet</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                {searchQuery.trim()
                  ? `No artists match "${searchQuery}".`
                  : albums.length === 0
                  ? "No saved artists yet. Search for music to start building your library."
                  : "No artists found in your vault."}
              </p>
              {albums.length === 0 && (
                <button
                  onClick={goToSearchMusic}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg transition-colors inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search music</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayedArtists.map((artist) => (
                <div
                  key={artist.name}
                  id={`vault-artist-${artist.name.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => {
                    if (onOpenArtistDiscography) {
                      onOpenArtistDiscography(artist.name);
                    } else if (artist.albums.length > 0) {
                      onSelectAlbum(artist.albums[0]);
                    }
                  }}
                  className="group bg-stone-900/50 hover:bg-stone-900 border border-stone-800 hover:border-amber-500/50 rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                >
                  {/* Circular Artist Avatar — clean image, colored ring border only */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-stone-950 border-2 border-stone-800 group-hover:border-amber-400 transition-colors mb-3 flex items-center justify-center shadow-inner">
                    {artist.coverUrl ? (
                      <img
                        src={artist.coverUrl}
                        alt={artist.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <User className="w-10 h-10 text-stone-600 group-hover:text-amber-400 transition-colors pointer-events-none" />
                    )}
                  </div>

                  {/* Artist Details */}
                  <h4 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors truncate w-full">
                    {artist.name}
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-1">
                    {artist.albums.length} {artist.albums.length === 1 ? "album" : "albums"} • {artist.songCount} {artist.songCount === 1 ? "song" : "songs"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Song row overflow (⋮) menu — viewport-anchored, shared by playlist + songs lists */}
      {songMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSongMenu(null)} />
          <div
            className="fixed z-50 w-56 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-1.5 space-y-0.5"
            style={{ top: songMenu.top, left: songMenu.left }}
          >
            <button
              type="button"
              onClick={() => {
                addToQueue(songMenu.track);
                if (onShowToast) onShowToast(`Added "${songMenu.track.title}" to queue`, "success");
                setSongMenu(null);
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
            >
              <ListMusic className="w-3.5 h-3.5 text-stone-500" />
              <span>Add to Playback Queue</span>
            </button>
            {songMenu.track.streamUrl && (
              <button
                type="button"
                onClick={(e) => {
                  downloadTrackAudio(
                    songMenu.track.streamUrl!,
                    `${songMenu.track.artist || "Track"} - ${songMenu.track.title}`,
                    e
                  );
                  setSongMenu(null);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>Download</span>
              </button>
            )}
            {songMenu.context === "songs" && (
              <button
                type="button"
                onClick={() => {
                  setPlaylistMenuTrackId(songMenu.track.id);
                  setSongMenu(null);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-stone-500" />
                <span>Add to Playlist</span>
              </button>
            )}
            {songMenu.context === "playlist" && activePlaylist && !activeIsMix && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleMovePlaylistTrack(songMenu.playlistIndex, "up");
                    setSongMenu(null);
                  }}
                  disabled={songMenu.playlistIndex === 0}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors disabled:opacity-30"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-stone-500" />
                  <span>Move up</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleMovePlaylistTrack(songMenu.playlistIndex, "down");
                    setSongMenu(null);
                  }}
                  disabled={songMenu.playlistIndex === activePlaylist.tracks.length - 1}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors disabled:opacity-30"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-stone-500" />
                  <span>Move down</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRemovePlaylistTrack(songMenu.playlistIndex);
                    setSongMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Remove from playlist</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
