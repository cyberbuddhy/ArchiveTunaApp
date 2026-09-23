/**
 * Listening insights — pure selectors over local history + vault.
 * No network, no AI: continue-listening, stats, and smart mixes are all
 * derived from data already on the device.
 */
import type { Album, ListenHistoryItem, Track } from "../types";

export interface ContinueAlbum {
  albumId: string;
  album: string;
  artist: string;
  plays: number;
  listenedAt: string;
}

/** Latest distinct albums, newest first — a few played songs surface the whole album. */
export function getContinueAlbums(history: ListenHistoryItem[], limit = 8): ContinueAlbum[] {
  const byAlbum = new Map<string, ContinueAlbum>();
  for (const h of history) {
    if (!h || !h.albumId || h.albumId === "local_library") continue;
    const key = h.albumId;
    const prev = byAlbum.get(key);
    if (!prev) {
      byAlbum.set(key, {
        albumId: h.albumId,
        album: h.album || "Unknown Album",
        artist: h.artist || "Unknown Artist",
        plays: 1,
        listenedAt: h.listenedAt,
      });
    } else {
      prev.plays++;
      if (h.listenedAt > prev.listenedAt) {
        prev.listenedAt = h.listenedAt;
        if (h.album) prev.album = h.album;
        if (h.artist) prev.artist = h.artist;
      }
    }
  }
  return Array.from(byAlbum.values())
    .sort((a, b) => (b.listenedAt || "").localeCompare(a.listenedAt || ""))
    .slice(0, limit);
}

/** Short relative time: "just now", "3h ago", "2d ago", or "Mar 4". */
export function timeAgo(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (isNaN(t)) return "";
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface ArtistPlay {
  name: string;
  plays: number;
}

export interface ListeningStats {
  totalListens: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  minutesListened: number;
  dayStreak: number;
  topArtists: ArtistPlay[];
}

/** Consecutive local-day streak ending today (or yesterday, still alive). */
function computeDayStreak(dayKeys: Set<string>): number {
  const day = new Date();
  // If today has no listens yet, the streak can still be alive via yesterday
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (!dayKeys.has(keyOf(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (dayKeys.has(keyOf(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export function getListeningStats(history: ListenHistoryItem[]): ListeningStats {
  const artists = new Map<string, number>();
  const albums = new Set<string>();
  const days = new Set<string>();
  let seconds = 0;

  for (const h of history) {
    if (!h) continue;
    const artist = (h.artist || "Unknown Artist").trim() || "Unknown Artist";
    artists.set(artist, (artists.get(artist) || 0) + 1);
    if (h.albumId) albums.add(h.albumId);
    else if (h.album) albums.add(`${h.artist}__${h.album}`);
    seconds += Number(h.duration) || 0;
    const d = new Date(h.listenedAt);
    if (!isNaN(d.getTime())) days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  const topArtists = Array.from(artists.entries())
    .map(([name, plays]) => ({ name, plays }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 5);

  return {
    totalListens: history.length,
    uniqueArtists: artists.size,
    uniqueAlbums: albums.size,
    minutesListened: Math.round(seconds / 60),
    dayStreak: computeDayStreak(days),
    topArtists,
  };
}

/** Reload a history entry into a playable track + album context. */
export async function loadHistoryPlayback(
  item: Pick<ListenHistoryItem, "trackId" | "title" | "albumId">,
  fetchAlbum: (id: string) => Promise<Album>
): Promise<{ track: Track; album: Album } | null> {
  if (!item.albumId || item.albumId === "local_library") return null;
  const album = await fetchAlbum(item.albumId);
  if (!album.tracks || album.tracks.length === 0) return null;
  const track =
    album.tracks.find((t) => t.id === item.trackId) ||
    album.tracks.find((t) => t.title === item.title) ||
    null;
  if (!track) return null;
  return { track, album };
}

export interface SmartMix {
  id: string;
  name: string;
  description: string;
  tracks: Track[];
}

function vaultTrackIndex(albums: Album[]): Map<string, Track> {
  const byId = new Map<string, Track>();
  for (const a of albums) {
    for (const t of a.tracks || []) {
      if (t && t.id && !byId.has(t.id)) byId.set(t.id, t);
    }
  }
  return byId;
}

/**
 * Virtual mixes, rebuilt live on every render — never stored.
 * All sources are local: history counts, vault recency, top-tier ranks.
 */
export function buildSmartMixes(history: ListenHistoryItem[], albums: Album[]): SmartMix[] {
  const byId = vaultTrackIndex(albums);
  const mixes: SmartMix[] = [];

  // Most played: rank vault tracks by history count
  const plays = new Map<string, number>();
  for (const h of history) {
    if (h && h.trackId) plays.set(h.trackId, (plays.get(h.trackId) || 0) + 1);
  }
  const mostPlayed = Array.from(plays.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((t): t is Track => !!t && !!t.streamUrl)
    .slice(0, 25);
  if (mostPlayed.length > 0) {
    mixes.push({
      id: "smart_most_played",
      name: "Most played",
      description: "Your heaviest rotation, ranked by plays",
      tracks: mostPlayed,
    });
  }

  // Recently added: newest vault albums first
  const recent = [...albums]
    .sort((a, b) => (b.capturedAt || "").localeCompare(a.capturedAt || ""))
    .flatMap((a) => a.tracks || [])
    .filter((t) => t && t.streamUrl)
    .slice(0, 25);
  if (recent.length > 0) {
    mixes.push({
      id: "smart_recently_added",
      name: "Recently added",
      description: "Fresh captures, newest first",
      tracks: recent,
    });
  }

  // Forgotten favorites: top-tier (S/A) albums untouched for 30+ days.
  // Taste comes from tier ranks now — the legacy like flag is retired.
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const recentIds = new Set(
    history
      .filter((h) => h && Date.parse(h.listenedAt) >= cutoff)
      .map((h) => h.trackId)
  );
  const forgotten = albums
    .filter((a) => a.tier === "S" || a.tier === "A")
    .flatMap((a) => a.tracks || [])
    .filter((t) => t && t.streamUrl && !recentIds.has(t.id))
    .slice(0, 25);
  if (forgotten.length > 0) {
    mixes.push({
      id: "smart_forgotten",
      name: "Forgotten favorites",
      description: "Top-tier albums you haven't touched in 30 days",
      tracks: forgotten,
    });
  }

  return mixes;
}
