/**
 * Listening insights — pure selectors over local history + vault.
 * No network, no AI: continue-listening, stats, and smart mixes are all
 * derived from data already on the device.
 */
import type { Album, ListenHistoryItem, Track } from "../types";

export interface ContinueItem {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  listenedAt: string;
}

/** Latest distinct tracks, newest first. Unresolvable entries filtered out. */
export function getContinueListening(history: ListenHistoryItem[], limit = 8): ContinueItem[] {
  const seen = new Set<string>();
  const out: ContinueItem[] = [];
  for (const h of history) {
    if (!h || !h.trackId || h.albumId === "local_library" || seen.has(h.trackId)) continue;
    seen.add(h.trackId);
    out.push({
      trackId: h.trackId,
      title: h.title,
      artist: h.artist,
      album: h.album,
      albumId: h.albumId,
      listenedAt: h.listenedAt,
    });
    if (out.length >= limit) break;
  }
  return out;
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
 * All sources are local: history counts, vault recency, liked flags.
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

  // Forgotten favorites: liked albums untouched for 30+ days
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const recentIds = new Set(
    history
      .filter((h) => h && Date.parse(h.listenedAt) >= cutoff)
      .map((h) => h.trackId)
  );
  const forgotten = albums
    .filter((a) => a.isFavorite)
    .flatMap((a) => a.tracks || [])
    .filter((t) => t && t.streamUrl && !recentIds.has(t.id))
    .slice(0, 25);
  if (forgotten.length > 0) {
    mixes.push({
      id: "smart_forgotten",
      name: "Forgotten favorites",
      description: "Liked albums you haven't touched in 30 days",
      tracks: forgotten,
    });
  }

  return mixes;
}
