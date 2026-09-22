import { describe, it, expect } from "vitest";
import {
  buildSmartMixes,
  getContinueListening,
  getListeningStats,
} from "./insights";
import type { Album, ListenHistoryItem, Track } from "../types";

function track(id: string, extra: Partial<Track> = {}): Track {
  return {
    id,
    title: `Title ${id}`,
    artist: "Artist",
    album: "Album",
    albumId: "alb1",
    trackNumber: 1,
    duration: 180,
    streamUrl: `https://archive.org/download/alb1/${id}.mp3`,
    ...extra,
  };
}

function album(id: string, extra: Partial<Album> = {}): Album {
  return {
    id,
    identifier: id,
    title: `Album ${id}`,
    artist: "Artist",
    tracks: [track(`${id}_t1`), track(`${id}_t2`)],
    source: "Archive.org",
    capturedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

function hist(trackId: string, listenedAt: string, extra: Partial<ListenHistoryItem> = {}): ListenHistoryItem {
  return {
    id: `${trackId}_${listenedAt}`,
    trackId,
    title: `Title ${trackId}`,
    artist: "Artist",
    album: "Album",
    albumId: "alb1",
    listenedAt,
    duration: 180,
    ...extra,
  };
}

describe("getContinueListening", () => {
  it("dedupes by track, newest first, skips local entries", () => {
    const h = [
      hist("t1", "2026-09-03T10:00:00.000Z"),
      hist("t1", "2026-09-02T10:00:00.000Z"),
      hist("t2", "2026-09-01T10:00:00.000Z", { albumId: "local_library" }),
      hist("t3", "2026-08-30T10:00:00.000Z"),
    ];
    const out = getContinueListening(h, 8);
    expect(out.map((c) => c.trackId)).toEqual(["t1", "t3"]);
  });

  it("respects the limit", () => {
    const h = [0, 1, 2, 3, 4].map((i) =>
      hist(`t${i}`, `2026-09-0${i + 1}T10:00:00.000Z`)
    );
    expect(getContinueListening(h, 3)).toHaveLength(3);
  });
});

describe("getListeningStats", () => {
  it("counts listens, artists, albums, minutes and top artists", () => {
    const h = [
      hist("t1", "2026-09-03T10:00:00.000Z", { artist: "A" }),
      hist("t2", "2026-09-03T11:00:00.000Z", { artist: "A" }),
      hist("t3", "2026-09-02T10:00:00.000Z", { artist: "B", albumId: "alb2" }),
    ];
    const s = getListeningStats(h);
    expect(s.totalListens).toBe(3);
    expect(s.uniqueArtists).toBe(2);
    expect(s.uniqueAlbums).toBe(2);
    expect(s.minutesListened).toBe(9);
    expect(s.topArtists[0]).toEqual({ name: "A", plays: 2 });
  });

  it("computes a consecutive-day streak", () => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString();
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return iso(d);
    };
    const h = [hist("t1", daysAgo(0)), hist("t2", daysAgo(1)), hist("t3", daysAgo(2))];
    expect(getListeningStats(h).dayStreak).toBe(3);
    const gapped = [hist("t1", daysAgo(0)), hist("t2", daysAgo(2))];
    expect(getListeningStats(gapped).dayStreak).toBe(1);
  });
});

describe("buildSmartMixes", () => {
  it("ranks most-played and skips untracked ids", () => {
    const a = album("alb1");
    const h = [
      hist("alb1_t2", "2026-09-03T10:00:00.000Z"),
      hist("alb1_t2", "2026-09-02T10:00:00.000Z"),
      hist("alb1_t1", "2026-09-01T10:00:00.000Z"),
      hist("ghost", "2026-09-01T09:00:00.000Z"),
    ];
    const mixes = buildSmartMixes(h, [a]);
    const most = mixes.find((m) => m.id === "smart_most_played");
    expect(most?.tracks.map((t) => t.id)).toEqual(["alb1_t2", "alb1_t1"]);
  });

  it("builds forgotten favorites from stale liked albums", () => {
    const liked = album("old", { isFavorite: true });
    const fresh = album("new", { isFavorite: true });
    const now = new Date().toISOString();
    const h = [hist("new_t1", now), hist("new_t2", now)];
    const mixes = buildSmartMixes(h, [liked, fresh]);
    const forgotten = mixes.find((m) => m.id === "smart_forgotten");
    expect(forgotten?.tracks.map((t) => t.id)).toEqual(["old_t1", "old_t2"]);
  });

  it("returns empty mixes for empty vaults", () => {
    expect(buildSmartMixes([], [])).toEqual([]);
  });
});
