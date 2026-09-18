import { Album, Playlist, ListenHistoryItem, LibraryDump, Track, TierList } from "../types";

const STORAGE_KEYS = {
  ALBUMS: "archive_vault_albums_v2",
  PLAYLISTS: "archive_vault_playlists_v2",
  TIER_LISTS: "archive_vault_tierlists_v1",
  HISTORY: "archive_vault_history_v2",
  CLEANSED_FLAG: "archive_vault_cleansed_v2",
  SEARCH_HISTORY: "archive_search_history_v1",
};

export function getStoredAlbums(): Album[] {
  try {
    // One-time migration/cleanse: clear out legacy seed data from previous versions
    if (!localStorage.getItem(STORAGE_KEYS.CLEANSED_FLAG)) {
      localStorage.removeItem("archive_vault_albums_v1");
      localStorage.removeItem("archive_vault_playlists_v1");
      localStorage.setItem(STORAGE_KEYS.CLEANSED_FLAG, "true");
      saveStoredAlbums([]);
      saveStoredPlaylists([]);
      return [];
    }

    const raw = localStorage.getItem(STORAGE_KEYS.ALBUMS);
    if (!raw) {
      saveStoredAlbums([]);
      return [];
    }
    const albums: Album[] = JSON.parse(raw);
    return albums;
  } catch (err) {
    console.error("Error reading stored albums", err);
    return [];
  }
}

export function saveStoredAlbums(albums: Album[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ALBUMS, JSON.stringify(albums));
  } catch (err) {
    console.error("Error saving albums", err);
  }
}

export function getStoredPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    if (!raw) {
      saveStoredPlaylists([]);
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading playlists", err);
    return [];
  }
}

export function saveStoredPlaylists(playlists: Playlist[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  } catch (err) {
    console.error("Error saving playlists", err);
  }
}

export function getStoredTierLists(): TierList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIER_LISTS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading tier lists", err);
    return [];
  }
}

export function saveStoredTierLists(tierLists: TierList[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIER_LISTS, JSON.stringify(tierLists));
  } catch (err) {
    console.error("Error saving tier lists", err);
  }
}

export function getStoredHistory(): ListenHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading history", err);
    return [];
  }
}

export function recordListen(track: Track, album?: Album): void {
  try {
    const history = getStoredHistory();
    const newItem: ListenHistoryItem = {
      id: `${track.id}_${Date.now()}`,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || album?.title || "Unknown Album",
      albumId: track.albumId || album?.id || "",
      genre: album?.genre,
      year: album?.year,
      collection: album?.collection,
      duration: track.duration,
      listenedAt: new Date().toISOString(),
    };
    // Keep max 200 items in history
    const updated = [newItem, ...history].slice(0, 200);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.error("Error recording listen", err);
  }
}

// "Dump" user library to downloadable file
export function dumpLibraryToFile(): void {
  const albums = getStoredAlbums();
  const playlists = getStoredPlaylists();
  const tierLists = getStoredTierLists();
  const history = getStoredHistory();

  const totalTracks = albums.reduce((acc, a) => acc + (a.tracks?.length || 0), 0);
  const userNoteCount = albums.filter((a) => !!a.userNotes).length;

  const dump: LibraryDump = {
    version: "1.0",
    appName: "ArchiveTuna",
    exportedAt: new Date().toISOString(),
    albums,
    playlists,
    tierLists,
    listenHistory: history,
    metadata: {
      totalAlbums: albums.length,
      totalTracks,
      totalPlaylists: playlists.length,
      userNoteCount,
    },
  };

  const jsonStr = JSON.stringify(dump, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `archive-music-vault-library-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Alias for dumpLibraryToFile
export const createLibraryDump = dumpLibraryToFile;


// Upload & restore file back to app
export function parseAndValidateDump(jsonString: string): {
  success: boolean;
  data?: LibraryDump;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object") {
      return { success: false, error: "Uploaded file is not a valid JSON object." };
    }
    if (!Array.isArray(parsed.albums)) {
      return { success: false, error: "Invalid backup format: missing 'albums' collection." };
    }
    const validatedDump: LibraryDump = {
      version: parsed.version || "1.0",
      appName: "ArchiveTuna",
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      albums: parsed.albums.map((a: any) => ({
        id: a.id || a.identifier || `album_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        identifier: a.identifier || a.id || "",
        title: a.title || "Untitled Album",
        artist: a.artist || "Unknown Artist",
        year: a.year || "",
        description: a.description || "",
        coverUrl: a.coverUrl || (a.identifier ? `https://archive.org/services/img/${a.identifier}` : ""),
        archiveUrl: a.archiveUrl || "",
        collection: a.collection || "audio",
        genre: a.genre || "",
        tracks: Array.isArray(a.tracks) ? a.tracks : [],
        source: a.source || "Archive.org",
        capturedAt: a.capturedAt || new Date().toISOString(),
        userNotes: a.userNotes || "",
        userRating: a.userRating || 0,
        tier: a.tier || undefined,
        tags: Array.isArray(a.tags) ? a.tags : [],
        isFavorite: Boolean(a.isFavorite),
      })),
      playlists: Array.isArray(parsed.playlists)
        ? parsed.playlists.map((p: any) => ({
            id: p.id || `pl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: p.name || "Restored Playlist",
            description: p.description || "",
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
            tracks: Array.isArray(p.tracks) ? p.tracks : [],
            coverUrl: p.coverUrl,
          }))
        : [],
      tierLists: Array.isArray(parsed.tierLists)
        ? parsed.tierLists.map((t: any) => ({
            id: t.id || `tier_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: t.name || "Restored Tier List",
            description: t.description || "",
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: t.updatedAt || new Date().toISOString(),
            items: Array.isArray(t.items) ? t.items : [],
          }))
        : [],
      listenHistory: Array.isArray(parsed.listenHistory) ? parsed.listenHistory : [],
      metadata: {
        totalAlbums: parsed.albums.length,
        totalTracks: parsed.albums.reduce((acc: number, a: any) => acc + (a.tracks?.length || 0), 0),
        totalPlaylists: Array.isArray(parsed.playlists) ? parsed.playlists.length : 0,
        userNoteCount: parsed.albums.filter((a: any) => !!a.userNotes).length,
      },
    };
    return { success: true, data: validatedDump };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to parse JSON backup file." };
  }
}

export function restoreLibraryFromDump(
  dump: LibraryDump,
  mode: "replace" | "merge"
): { addedAlbums: number; addedPlaylists: number } {
  if (mode === "replace") {
    saveStoredAlbums(dump.albums);
    saveStoredPlaylists(dump.playlists);
    if (dump.tierLists) {
      saveStoredTierLists(dump.tierLists);
    }
    if (dump.listenHistory) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(dump.listenHistory));
    }
    return { addedAlbums: dump.albums.length, addedPlaylists: dump.playlists.length };
  } else {
    // Merge mode
    const currentAlbums = getStoredAlbums();
    const existingAlbumIds = new Set(currentAlbums.map((a) => a.id));
    const mergedAlbums = [...currentAlbums];
    let newAlbumsCount = 0;

    dump.albums.forEach((dumpAlbum) => {
      if (!existingAlbumIds.has(dumpAlbum.id)) {
        mergedAlbums.push(dumpAlbum);
        existingAlbumIds.add(dumpAlbum.id);
        newAlbumsCount++;
      } else {
        // Update user notes or rating/tier if current doesn't have it
        const idx = mergedAlbums.findIndex((a) => a.id === dumpAlbum.id);
        if (idx !== -1) {
          if (!mergedAlbums[idx].userNotes && dumpAlbum.userNotes) {
            mergedAlbums[idx].userNotes = dumpAlbum.userNotes;
          }
          if (!mergedAlbums[idx].userRating && dumpAlbum.userRating) {
            mergedAlbums[idx].userRating = dumpAlbum.userRating;
          }
          if (!mergedAlbums[idx].tier && dumpAlbum.tier) {
            mergedAlbums[idx].tier = dumpAlbum.tier;
          }
        }
      }
    });
    saveStoredAlbums(mergedAlbums);

    const currentPlaylists = getStoredPlaylists();
    const existingPlaylistNames = new Set(currentPlaylists.map((p) => p.name.toLowerCase()));
    const mergedPlaylists = [...currentPlaylists];
    let newPlaylistsCount = 0;

    dump.playlists.forEach((p) => {
      if (!existingPlaylistNames.has(p.name.toLowerCase())) {
        mergedPlaylists.push(p);
        existingPlaylistNames.add(p.name.toLowerCase());
        newPlaylistsCount++;
      }
    });
    saveStoredPlaylists(mergedPlaylists);

    if (dump.tierLists && dump.tierLists.length > 0) {
      const currentTierLists = getStoredTierLists();
      const existingTierListNames = new Set(currentTierLists.map((t) => t.name.toLowerCase()));
      const mergedTierLists = [...currentTierLists];
      dump.tierLists.forEach((t) => {
        if (!existingTierListNames.has(t.name.toLowerCase())) {
          mergedTierLists.push(t);
          existingTierListNames.add(t.name.toLowerCase());
        }
      });
      saveStoredTierLists(mergedTierLists);
    }

    return { addedAlbums: newAlbumsCount, addedPlaylists: newPlaylistsCount };
  }
}

// Search History persistence
export function getStoredSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading search history", err);
    return [];
  }
}

export function addSearchHistoryItem(term: string): string[] {
  const clean = term.trim();
  if (!clean) return getStoredSearchHistory();
  try {
    const history = getStoredSearchHistory();
    // Case-insensitive deduplication, keeping the newest search at the front
    const filtered = history.filter((item) => item.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...filtered].slice(0, 15);
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Error saving search history", err);
    return [];
  }
}

export function removeSearchHistoryItem(term: string): string[] {
  try {
    const history = getStoredSearchHistory();
    const updated = history.filter((item) => item !== term);
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Error removing search history item", err);
    return [];
  }
}

export function clearStoredSearchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  } catch (err) {
    console.error("Error clearing search history", err);
  }
}
