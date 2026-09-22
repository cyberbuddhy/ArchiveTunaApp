/**
 * Lyrics via lrclib.net — free, keyless, CORS-open.
 * Live tapings and 78s often have no lyrics; callers must handle null.
 */
export interface LyricLine {
  t: number; // seconds
  line: string;
}

export interface LyricsResult {
  plain: string;
  synced: LyricLine[] | null;
  instrumental: boolean;
}

const cache = new Map<string, LyricsResult | null>();

/** Parse LRC "[mm:ss.xx] line" (centiseconds optional) into sorted lines. */
export function parseLRC(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (!m) continue;
    const t = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
    const line = m[3].trim();
    if (!line || !isFinite(t)) continue;
    out.push({ t, line });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Index of the line active at `time` (-1 if none yet). */
export function currentLyricIndex(lines: LyricLine[], time: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].t <= time) idx = i;
    else break;
  }
  return idx;
}

export async function fetchLyrics(
  artist: string,
  title: string,
  album?: string,
  duration?: number
): Promise<LyricsResult | null> {
  const key = `${artist}__${title}__${album || ""}`.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const finish = (res: LyricsResult | null): LyricsResult | null => {
    cache.set(key, res);
    return res;
  };
  try {
    const u = new URL("https://lrclib.net/api/get");
    u.searchParams.set("artist_name", artist);
    u.searchParams.set("track_name", title);
    if (album) u.searchParams.set("album_name", album);
    if (duration && duration > 0) u.searchParams.set("duration", String(Math.round(duration)));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    let r: Response;
    try {
      r = await fetch(u.toString(), { headers: { Accept: "application/json" }, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!r.ok) return finish(null);
    const j = (await r.json()) as {
      plainLyrics?: string;
      syncedLyrics?: string;
      instrumental?: boolean;
    };
    if (j.instrumental) return finish({ plain: "", synced: null, instrumental: true });
    if (!j || (!j.plainLyrics && !j.syncedLyrics)) return finish(null);
    const synced = j.syncedLyrics ? parseLRC(String(j.syncedLyrics)) : [];
    return finish({
      plain: String(j.plainLyrics || synced.map((l) => l.line).join("\n") || ""),
      synced: synced.length > 0 ? synced : null,
      instrumental: false,
    });
  } catch {
    return finish(null);
  }
}
