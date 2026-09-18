import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Grid,
  List,
  Heart,
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
} from "lucide-react";
import { Album, Track, Playlist, TierList, ListenHistoryItem } from "../types";
import { getStoredHistory } from "../services/storage";
import { fetchAlbumDetails } from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import { linkForPlaylist } from "../services/share";
import { downloadAlbumZip, downloadTrackAudio } from "../utils/download";
import { TierListView } from "./TierListView";
import { LocalLibraryTab } from "./LocalLibraryTab";
import { TabHeader } from "./TabHeader";
import { TIER_CONFIG } from "../utils/tierList";
import { offlineCache, CachedAudioItem } from "../services/offlineCache";
import { formatTime } from "../utils/format";

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
  onCreatePlaylist: (name: string, description?: string) => void;
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
  const { playTrack, playAlbum, playRandomTracks, currentTrack, isPlaying } = usePlayer();

  // Tab switched here: focus vault search so it's ready to type (desktop pointers only)
  useEffect(() => {
    if (window.matchMedia?.("(pointer: fine)").matches) {
      const t = setTimeout(() => {
        (document.getElementById("vault-general-search") as HTMLInputElement | null)?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
  }, []);
  const SUBTABS: Array<"albums" | "offline" | "liked" | "artists" | "tierlists" | "playlists" | "songs"> = [
    "albums",
    "offline",
    "liked",
    "artists",
    "tierlists",
    "playlists",
    "songs",
  ];
  const [activeSubTab, setActiveSubTab] = useState<
    "albums" | "offline" | "liked" | "tierlists" | "playlists" | "songs" | "artists"
  >("albums");
  const [searchQuery, setSearchQuery] = useState("");
  const [offlineInnerTab, setOfflineInnerTab] = useState<"cached" | "local">("cached");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [playlistMenuTrackId, setPlaylistMenuTrackId] = useState<string | null>(null);

  // Offline Cached Audio state
  const [cachedAudioItems, setCachedAudioItems] = useState<CachedAudioItem[]>([]);
  const [cachedStats, setCachedStats] = useState<{ count: number; totalBytes: number }>({ count: 0, totalBytes: 0 });

  // Recently played (listen history) — hidden for now, flip to reuse later
  const SHOW_RECENTLY_PLAYED = false;
  const [recentHistory, setRecentHistory] = useState<ListenHistoryItem[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);

  React.useEffect(() => {
    const refreshCached = async () => {
      const items = await offlineCache.getAllCachedAudio();
      const stats = await offlineCache.getStorageStats();
      setCachedAudioItems(items);
      setCachedStats({ count: stats.trackCount, totalBytes: stats.totalBytes });
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

  const activePlaylist =
    playlists.find((p) => p.id === selectedPlaylistId) || playlists[0] || null;

  // All unique user tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    albums.forEach((a) => {
      (a.tags || []).forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [albums]);

  // Liked Albums
  const likedAlbums = useMemo(() => {
    return albums.filter((a) => a.isFavorite);
  }, [albums]);

  // Filtered albums based on active subtab & search
  const displayedAlbums = useMemo(() => {
    let source = albums;
    if (activeSubTab === "liked") {
      source = albums.filter((a) => a.isFavorite);
    }

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

  // Liked albums filtered by search
  const displayedLikedAlbums = useMemo(() => {
    return albums.filter((a) => a.isFavorite).filter((album) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (album.title || "").toLowerCase().includes(q) ||
          (album.artist || "").toLowerCase().includes(q) ||
          (album.userNotes || "").toLowerCase().includes(q) ||
          (album.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (album.tracks || []).some((t) => (t.title || "").toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [albums, searchQuery]);

  // Flattened all songs
  const allSongs = useMemo(() => {
    const list: { track: Track; album: Album }[] = [];
    albums.forEach((album) => {
      (album.tracks || []).forEach((track) => {
        list.push({ track, album });
      });
    });
    return list;
  }, [albums]);

  // Songs filtered by general vault search
  const displayedSongs = useMemo(() => {
    if (!searchQuery.trim()) return allSongs;
    const q = searchQuery.toLowerCase();
    return allSongs.filter(({ track, album }) => {
      return (
        (track.title || "").toLowerCase().includes(q) ||
        (track.artist || "").toLowerCase().includes(q) ||
        (album.title || "").toLowerCase().includes(q) ||
        (album.artist || "").toLowerCase().includes(q)
      );
    });
  }, [allSongs, searchQuery]);

  // Playlists filtered by general vault search
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

  const handleRandomPlayAllSongs = () => {
    const targetPool = displayedSongs.length > 0 ? displayedSongs : allSongs;
    if (targetPool.length === 0) {
      if (onShowToast) onShowToast("No songs in your vault yet to play.", "info");
      return;
    }

    const albumMap = new Map<string, Album>();
    targetPool.forEach(({ track, album }) => {
      albumMap.set(track.id, album);
    });

    playRandomTracks(
      targetPool.map((s) => s.track),
      (track) => albumMap.get(track.id)
    );

    if (onShowToast) {
      onShowToast(`Shuffling & playing all ${targetPool.length} songs from Vault!`, "success");
    }
  };

  const handlePlayAllSongsInOrder = () => {
    const targetPool = displayedSongs.length > 0 ? displayedSongs : allSongs;
    if (targetPool.length === 0) return;
    playTrack(targetPool[0].track, targetPool[0].album, targetPool.map((s) => s.track));
    if (onShowToast) {
      onShowToast(`Playing ${targetPool.length} songs from Vault in order`, "info");
    }
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
      const album = await fetchAlbumDetails(item.albumId);
      const track =
        album.tracks.find((t) => t.id === item.trackId) ||
        album.tracks.find((t) => t.title === item.title) ||
        album.tracks[0];
      if (!track) {
        onShowToast?.("Couldn't reload that recording.", "info");
        return;
      }
      playTrack(track, album, album.tracks);
    } catch {
      onShowToast?.("Couldn't reload that recording.", "info");
    } finally {
      setIsReplaying(false);
    }
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

  const handleCreatePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
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
      {/* 0. Vault header — same grid as Search / Discover */}
      <TabHeader
        icon={<Disc3 className="w-4 h-4" />}
        title="Your vault"
        subtitle={`${albums.length} album${albums.length === 1 ? "" : "s"} • ${playlists.length} playlist${playlists.length === 1 ? "" : "s"} • ${tierLists.length} tier list${tierLists.length === 1 ? "" : "s"}`}
      />
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
            className="w-full h-10 pl-9 pr-8 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl text-stone-100 placeholder-stone-400 text-xs leading-normal focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
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
          {activeSubTab === "playlists" && (
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              className="flex-1 sm:flex-none h-9 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New Playlist</span>
            </button>
          )}

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
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
              activeSubTab === "offline"
                ? "bg-emerald-500 text-stone-950 border-emerald-500 font-semibold shadow-xs"
                : "bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-stone-800"
            }`}
          >
            <Database className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === "offline" ? "text-stone-950 fill-stone-950" : "text-emerald-400"}`} />
            <span>Offline</span>
          </button>
          <button
            id="subtab-liked"
            onClick={() => setActiveSubTab("liked")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
              activeSubTab === "liked"
                ? "bg-rose-500 text-stone-950 border-rose-500 font-semibold shadow-xs"
                : "bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-stone-800"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === "liked" ? "fill-stone-950 text-stone-950" : "fill-rose-500 text-rose-500"}`} />
            <span>Liked</span>
          </button>
          <button
            id="subtab-artists"
            onClick={() => setActiveSubTab("artists")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 snap-start border ${
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
            <LocalLibraryTab searchQuery={searchQuery} onShowToast={onShowToast} />
          ) : (
          <>
          {/* Header Stats & Quick Action Bar */}
          <div className="p-4 rounded-2xl bg-stone-900/60 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Database className="w-5 h-5 fill-emerald-500/20" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-stone-100">Local-First Audio Cache</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                    IndexedDB / OPFS Active
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  {cachedAudioItems.length} cached track{cachedAudioItems.length === 1 ? "" : "s"} •{" "}
                  {(cachedStats.totalBytes / (1024 * 1024)).toFixed(1)} MB stored locally with zero network dependency.
                </p>
              </div>
            </div>

            {cachedAudioItems.length > 0 && (
              <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
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
          </div>

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

      {/* VIEW 1: ALBUMS / LIKED GRID */}
      {(activeSubTab === "albums" || activeSubTab === "liked") && (
        <div>
          {displayedAlbums.length === 0 ? (
            <div className="py-16 text-center space-y-3 rounded-xl bg-stone-900/30 border border-stone-800 p-8">
              <Disc3 className="w-10 h-10 text-stone-600 mx-auto" />
              <p className="text-xs text-stone-400">
                {searchQuery.trim()
                  ? `No albums match "${searchQuery}". Try checking the Playlists, All Songs, or Tier Lists tabs.`
                  : activeSubTab === "liked"
                  ? "No liked albums yet. Click the heart icon on any album view to like it."
                  : albums.length === 0
                  ? "Your vault is currently empty. Capture recordings from Archive.org or restore a backup."
                  : "No albums match your active filter."}
              </p>
              {albums.length === 0 && (
                <button
                  onClick={onOpenCaptureModal}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg transition-colors inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Capture First Album</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {displayedAlbums.map((album) => (
                <div
                  key={album.id}
                  className="group bg-stone-900/50 hover:bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl p-2.5 flex flex-col justify-between transition-colors cursor-pointer"
                  onClick={() => onSelectAlbum(album)}
                >
                  <div className="space-y-2">
                    {/* Clean Album Cover Art - No icons on top of the cover art */}
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-stone-950 border border-stone-800">
                      <img
                        src={album.coverUrl || "https://archive.org/images/notfound.png"}
                        alt={album.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://archive.org/images/notfound.png";
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold text-stone-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
                        {album.title}
                      </h3>
                      <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">{album.artist}</p>
                    </div>
                  </div>

                  {/* Clean footer info */}
                  <div className="pt-2 mt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px] text-stone-500">
                    <span>
                      {album.year ? `${album.year} • ` : ""}
                      {album.tracks?.length || 0} tracks
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {album.tier && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-black text-[9.5px] ${
                            TIER_CONFIG[album.tier]?.bgClass || "bg-stone-800"
                          } text-black`}
                          title={`Ranked ${album.tier} Tier`}
                        >
                          {album.tier}
                        </span>
                      )}
                      {album.isFavorite && (
                        <span title="Liked in Vault">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                        </span>
                      )}
                    </div>
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
          {/* Create playlist mini inline form */}
          {isCreatingPlaylist && (
            <form
              onSubmit={handleCreatePlaylistSubmit}
              className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-2 max-w-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-200">New Playlist</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingPlaylist(false)}
                  className="text-stone-500 hover:text-stone-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <div className="flex justify-end space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreatingPlaylist(false)}
                  className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-3 py-1 bg-amber-500 text-stone-950 text-xs font-semibold rounded-md hover:bg-amber-400 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {playlists.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500 rounded-xl bg-stone-900/30 border border-stone-800 space-y-2">
              <ListMusic className="w-8 h-8 mx-auto text-stone-600" />
              <p>No playlists yet. Create one to organize custom mixes across your albums.</p>
            </div>
          ) : displayedPlaylists.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500 rounded-xl bg-stone-900/30 border border-stone-800 space-y-2">
              <ListMusic className="w-8 h-8 mx-auto text-stone-600" />
              <p>No playlists match "{searchQuery}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Playlists sidebar selector */}
              <div className="md:col-span-4 space-y-1">
                {displayedPlaylists.map((pl) => {
                  const isSelected = activePlaylist?.id === pl.id;
                  return (
                    <button
                      key={pl.id}
                      onClick={() => setSelectedPlaylistId(pl.id)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300 font-medium"
                          : "bg-stone-900/50 hover:bg-stone-900 border-stone-800 text-stone-300"
                      }`}
                    >
                      <div className="truncate flex-1 mr-2">
                        <p className="truncate">{pl.name}</p>
                        <span className="text-[10px] text-stone-500">{pl.tracks.length} tracks</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active playlist tracks */}
              {activePlaylist && (
                <div className="md:col-span-8 bg-stone-900/50 border border-stone-800 rounded-xl p-4 space-y-3">
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
                          <h3 className="text-sm font-semibold text-stone-100 truncate">
                            {activePlaylist.name}
                          </h3>
                          <button
                            onClick={() => {
                              setEditPlaylistText(activePlaylist.name);
                              setEditingPlaylistTitle(true);
                            }}
                            className="text-stone-500 hover:text-stone-300"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {activePlaylist.tracks.length} tracks
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
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 text-stone-950 disabled:text-stone-600 font-semibold text-xs rounded-md flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-stone-950" />
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
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${activePlaylist.name}"?`)) {
                            onDeletePlaylist(activePlaylist.id);
                          }
                        }}
                        className="p-1 text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {activePlaylist.tracks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-stone-500">
                      Empty playlist. Add songs from your Albums or Discover view.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activePlaylist.tracks.map((track, idx) => {
                        const isCurrent = currentTrack?.id === track.id;
                        return (
                          <div
                            key={`${track.id}_${idx}`}
                            className={`group flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                              isCurrent ? "bg-amber-500/10 text-amber-300" : "hover:bg-stone-800/50 text-stone-200"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              <button
                                onClick={() => playTrack(track, undefined, activePlaylist.tracks)}
                                className="w-6 h-6 rounded bg-stone-800 group-hover:bg-amber-500 group-hover:text-stone-950 flex items-center justify-center shrink-0"
                              >
                                <Play className="w-3 h-3 ml-0.5" />
                              </button>
                              <span className="text-stone-500 text-[10px] w-4">{idx + 1}</span>
                              <div className="truncate min-w-0 flex-1">
                                <span className="font-medium truncate">{track.title}</span>
                                <span className="text-stone-500 text-[11px] ml-1.5">({track.artist})</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-stone-500 text-[11px]">
                              <span className="font-mono">{formatDuration(track.duration)}</span>
                              {track.streamUrl && (
                                <button
                                  onClick={(e) =>
                                    downloadTrackAudio(
                                      track.streamUrl,
                                      `${track.artist || "Track"} - ${track.title}`,
                                      e
                                    )
                                  }
                                  className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-colors cursor-pointer"
                                  title="Download track (MP3)"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleMovePlaylistTrack(idx, "up")}
                                  disabled={idx === 0}
                                  className="p-0.5 hover:text-stone-300 disabled:opacity-20"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleMovePlaylistTrack(idx, "down")}
                                  disabled={idx === activePlaylist.tracks.length - 1}
                                  className="p-0.5 hover:text-stone-300 disabled:opacity-20"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleRemovePlaylistTrack(idx)}
                                  className="p-0.5 hover:text-red-400 ml-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                <h3 className="text-sm sm:text-base font-bold text-stone-100 flex items-center space-x-2">
                  <span>All Vault Tracks</span>
                  <span className="text-xs font-semibold text-amber-400 font-mono">
                    ({displayedSongs.length})
                  </span>
                </h3>
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
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all duration-200 flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
                  title="Random play all songs directly from Vault"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle All</span>
                </button>

                {/* Play from Start In Order */}
                <button
                  id="btn-play-all-songs-in-order"
                  onClick={handlePlayAllSongsInOrder}
                  className="px-3.5 py-2 rounded-full bg-stone-850 hover:bg-stone-800 text-stone-200 text-xs font-medium transition-colors flex items-center space-x-1.5 border border-stone-750 cursor-pointer"
                  title="Play all songs in order"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Play In Order</span>
                </button>
              </div>
            )}
          </div>

          {/* Songs List */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800/50">
            <div className="px-3.5 py-2 bg-stone-950/60 text-[10px] uppercase font-semibold text-stone-500 flex items-center justify-between">
              <span>Title & Artist</span>
              <span>Duration & Actions</span>
            </div>
            {allSongs.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-500 p-4">
                <Music className="w-8 h-8 mx-auto text-stone-600 mb-2" />
                <p>No songs in your vault yet. Capture albums from Archive.org to explore tracks here.</p>
              </div>
            ) : displayedSongs.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-500 p-4">
                <Music className="w-8 h-8 mx-auto text-stone-600 mb-2" />
                <p>No songs match "{searchQuery}".</p>
              </div>
            ) : (
              displayedSongs.map(({ track, album }, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={`${track.id}_${idx}`}
                    className={`group px-3 py-2.5 flex items-center justify-between text-xs transition-colors min-h-[46px] ${
                      isCurrent ? "bg-amber-500/10 text-amber-300" : "hover:bg-stone-800/40 text-stone-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                      {/* Album Cover Thumbnail or Track Play Icon */}
                      <button
                        onClick={() => playTrack(track, album, displayedSongs.map((s) => s.track))}
                        className="relative w-8 h-8 rounded-lg overflow-hidden bg-stone-800 group-hover:border-amber-500/50 border border-stone-750 flex items-center justify-center shrink-0 cursor-pointer"
                        title="Play track"
                      >
                        {album.coverUrl ? (
                          <img
                            src={album.coverUrl}
                            alt={album.title}
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
                        <div className="font-semibold text-xs text-stone-100 truncate flex items-center gap-1.5">
                          <span className="truncate">{track.title}</span>
                          {isCurrent && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-stone-400 text-[11px] truncate mt-0.5">
                          {track.artist} <span className="text-stone-600">•</span> {album.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-mono text-[11px] text-stone-400">
                        {formatDuration(track.duration)}
                      </span>

                      {track.streamUrl && (
                        <button
                          onClick={(e) =>
                            downloadTrackAudio(
                              track.streamUrl,
                              `${track.artist || "Track"} - ${track.title}`,
                              e
                            )
                          }
                          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800 transition-colors cursor-pointer"
                          title="Download track (MP3)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Add to Playlist popup */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setPlaylistMenuTrackId(playlistMenuTrackId === track.id ? null : track.id)
                          }
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
                          title="Add to playlist"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {playlistMenuTrackId === track.id && (
                          <div className="absolute right-0 bottom-full mb-1 w-44 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-1 z-30 space-y-0.5">
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
            <div className="py-16 text-center space-y-3 rounded-xl bg-stone-900/30 border border-stone-800 p-8">
              <User className="w-10 h-10 text-stone-600 mx-auto" />
              <p className="text-xs text-stone-400">
                {searchQuery.trim()
                  ? `No artists match "${searchQuery}".`
                  : albums.length === 0
                  ? "No saved artists yet. Capture albums or recordings to your Vault to build your library."
                  : "No artists found in your vault."}
              </p>
              {albums.length === 0 && (
                <button
                  onClick={onOpenCaptureModal}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg transition-colors inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Capture First Album</span>
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
                  {/* Circular Artist Avatar with Quick Play */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-stone-950 border-2 border-stone-800 group-hover:border-amber-400 transition-colors mb-3 flex items-center justify-center shadow-inner">
                    {artist.coverUrl ? (
                      <img
                        src={artist.coverUrl}
                        alt={artist.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <User className="w-10 h-10 text-stone-600 group-hover:text-amber-400 transition-colors pointer-events-none" />
                    )}

                    {/* Quick Play Overlay */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (artist.albums[0]) {
                          playAlbum(artist.albums[0]);
                        }
                      }}
                      className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      title={`Play ${artist.name}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </button>
                  </div>

                  {/* Artist Details */}
                  <h4 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors truncate w-full">
                    {artist.name}
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-1">
                    {artist.albums.length} {artist.albums.length === 1 ? "album" : "albums"} • {artist.songCount} {artist.songCount === 1 ? "song" : "songs"}
                  </p>

                  {onOpenArtistDiscography && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenArtistDiscography(artist.name);
                      }}
                      className="mt-3 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-stone-800 hover:bg-amber-500/20 text-stone-300 hover:text-amber-300 border border-stone-700 hover:border-amber-500/40 transition-colors cursor-pointer"
                    >
                      View Discography
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
