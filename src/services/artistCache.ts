import { MatchedArtist, ArtistDiscographyData, ArchiveLiveTape, Album } from "../types";
import { AutocompleteItem } from "../data/popularArtists";

// In-memory caches for instantaneous 0ms retrieval
const artistSearchMemoryCache = new Map<string, MatchedArtist[]>();
const discographyMemoryCache = new Map<string, ArtistDiscographyData>();
const releaseStreamsMemoryCache = new Map<string, ArchiveLiveTape[]>();
const autocompleteMemoryCache = new Map<string, AutocompleteItem[]>();
const archiveSearchMemoryCache = new Map<string, { docs: any[]; total: number }>();
const albumDetailsMemoryCache = new Map<string, Album>();

// Cache namespace — bump to invalidate stale entries app-wide after query
// builder fixes (stale empties otherwise survive the whole tab session).
const CACHE_VERSION = "v2";
function getFromSession<T>(key: string): T | null {  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToSession(key: string, data: any): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded or private browsing restrictions, safely ignore
  }
}

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/["\\]/g, "");
}

// --- Artist Search Cache ---
export function getCachedArtistSearch(query: string): MatchedArtist[] | null {
  const k = normalizeKey(query);
  if (!k) return null;
  if (artistSearchMemoryCache.has(k)) {
    return artistSearchMemoryCache.get(k)!;
  }
  const fromSession = getFromSession<MatchedArtist[]>(`mb_artist_${k}`);
  if (fromSession) {
    artistSearchMemoryCache.set(k, fromSession);
    return fromSession;
  }
  return null;
}

export function setCachedArtistSearch(query: string, data: MatchedArtist[]): void {
  const k = normalizeKey(query);
  if (!k) return;
  artistSearchMemoryCache.set(k, data);
  saveToSession(`mb_artist_${k}`, data);
}

// --- Artist Discography Cache ---
export function getCachedDiscography(artistName: string): ArtistDiscographyData | null {
  const k = normalizeKey(artistName);
  if (!k) return null;
  if (discographyMemoryCache.has(k)) {
    return discographyMemoryCache.get(k)!;
  }
  const fromSession = getFromSession<ArtistDiscographyData>(`mb_disco_${CACHE_VERSION}_${k}`);
  if (fromSession) {
    discographyMemoryCache.set(k, fromSession);
    return fromSession;
  }
  return null;
}

export function setCachedDiscography(artistName: string, data: ArtistDiscographyData): void {
  const k = normalizeKey(artistName);
  if (!k) return;
  discographyMemoryCache.set(k, data);
  saveToSession(`mb_disco_${CACHE_VERSION}_${k}`, data);
}

// --- Release Streams Cache ---
export function getCachedReleaseStreams(artist: string, title: string): ArchiveLiveTape[] | null {
  const k = `${normalizeKey(artist)}__${normalizeKey(title)}`;
  if (releaseStreamsMemoryCache.has(k)) {
    return releaseStreamsMemoryCache.get(k)!;
  }
  const fromSession = getFromSession<ArchiveLiveTape[]>(`stream_cache_${k}`);
  if (fromSession) {
    releaseStreamsMemoryCache.set(k, fromSession);
    return fromSession;
  }
  return null;
}

export function setCachedReleaseStreams(artist: string, title: string, data: ArchiveLiveTape[]): void {
  const k = `${normalizeKey(artist)}__${normalizeKey(title)}`;
  releaseStreamsMemoryCache.set(k, data);
  saveToSession(`stream_cache_${k}`, data);
}

// --- Autocomplete Cache ---
export function getCachedAutocomplete(query: string): AutocompleteItem[] | null {
  const k = normalizeKey(query);
  if (!k) return null;
  return autocompleteMemoryCache.get(k) || null;
}

export function setCachedAutocomplete(query: string, items: AutocompleteItem[]): void {
  const k = normalizeKey(query);
  if (!k) return;
  autocompleteMemoryCache.set(k, items);
}

// --- Archive Search Cache ---
export function getCachedArchiveSearch(cacheKey: string): { docs: any[]; total: number } | null {
  const k = normalizeKey(cacheKey);
  if (!k) return null;
  if (archiveSearchMemoryCache.has(k)) {
    return archiveSearchMemoryCache.get(k)!;
  }
  const fromSession = getFromSession<{ docs: any[]; total: number }>(`arch_s_${CACHE_VERSION}_${k}`);
  if (fromSession) {
    archiveSearchMemoryCache.set(k, fromSession);
    return fromSession;
  }
  return null;
}

export function setCachedArchiveSearch(cacheKey: string, data: { docs: any[]; total: number }): void {
  const k = normalizeKey(cacheKey);
  if (!k) return;
  // Limit memory map size to avoid unbounded memory
  if (archiveSearchMemoryCache.size > 80) {
    const firstKey = archiveSearchMemoryCache.keys().next().value;
    if (firstKey) archiveSearchMemoryCache.delete(firstKey);
  }
  archiveSearchMemoryCache.set(k, data);
  saveToSession(`arch_s_${CACHE_VERSION}_${k}`, data);
}

// --- Album Details Cache ---
export function getCachedAlbumDetails(identifier: string): Album | null {
  const k = normalizeKey(identifier);
  if (!k) return null;
  if (albumDetailsMemoryCache.has(k)) {
    return albumDetailsMemoryCache.get(k)!;
  }
  const fromSession = getFromSession<Album>(`arch_alb_${k}`);
  if (fromSession) {
    albumDetailsMemoryCache.set(k, fromSession);
    return fromSession;
  }
  return null;
}

export function setCachedAlbumDetails(identifier: string, album: Album): void {
  const k = normalizeKey(identifier);
  if (!k) return;
  if (albumDetailsMemoryCache.size > 150) {
    const firstKey = albumDetailsMemoryCache.keys().next().value;
    if (firstKey) albumDetailsMemoryCache.delete(firstKey);
  }
  albumDetailsMemoryCache.set(k, album);
  saveToSession(`arch_alb_${k}`, album);
}

