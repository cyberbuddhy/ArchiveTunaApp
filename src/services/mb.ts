// MusicBrainz gateway — the ONLY module allowed to talk to musicbrainz.org.
//
// Why this exists: browsers can't send MusicBrainz a descriptive User-Agent,
// so every request runs under the anonymous 1 req/sec quota. The old code
// fired unpaced, unretried bursts (autocomplete keystrokes, cover fan-out,
// discography pages), so MusicBrainz answered 503 and whole artist pages
// rendered with zero official albums. Every MB call in the app funnels
// through here for pacing, retries, dedupe, and stale-request coalescing.
const MB_BASE = "https://musicbrainz.org/ws/2";

// Anonymous-quota etiquette: minimum gap between request starts.
const MIN_GAP_MS = 700;
// Fail-fast per attempt; retries (below) handle the flakes.
const ATTEMPT_TIMEOUT_MS = 8000;
// Retry budget per logical request (initial + 2 retries).
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1000, 2000];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class StaleRequestError extends Error {
  constructor() {
    super("Superseded by a newer request");
    this.name = "StaleRequestError";
  }
}

export function isStaleRequest(err: unknown): boolean {
  return err instanceof StaleRequestError;
}

// --- Single serialization lane -------------------------------------------
// Promise-chain lane: every MB request waits its turn, and starts at least
// MIN_GAP_MS after the previous start. Slots (e.g. "autocomplete") let a
// newer request cancel an older one that hasn't started yet — typing
// "daft punk" must not queue 10 artist searches.
interface LaneEntry {
  stale: boolean;
}

let laneTail: Promise<unknown> = Promise.resolve();
let lastStart = 0;
const latestBySlot = new Map<string, LaneEntry>();

function enqueue<T>(slot: string | null, work: () => Promise<T>): Promise<T> {
  const entry: LaneEntry = { stale: false };
  if (slot) {
    const prev = latestBySlot.get(slot);
    if (prev) prev.stale = true;
    latestBySlot.set(slot, entry);
  }
  const run: Promise<T> = laneTail.then(async () => {
    if (entry.stale) throw new StaleRequestError();
    const gap = MIN_GAP_MS - (Date.now() - lastStart);
    if (gap > 0) await sleep(gap);
    if (entry.stale) throw new StaleRequestError();
    lastStart = Date.now();
    return work();
  });
  // The lane never breaks: a rejection here must not stall later requests.
  laneTail = run.catch(() => undefined);
  return run;
}

// --- Transport -------------------------------------------------------------
function retryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function fetchOnce(url: string, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = new Error(`MusicBrainz returned status ${res.status}`) as Error & {
        status?: number;
      };
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string, timeoutMs: number, retries: number): Promise<any> {
  let attempt = 0;
  for (;;) {
    try {
      return await fetchOnce(url, timeoutMs);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      const retryable =
        attempt < retries &&
        (status === undefined || retryableStatus(status)) &&
        !isStaleRequest(err);
      if (!retryable) throw err;
      await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
      attempt += 1;
    }
  }
}

// --- In-flight dedupe -------------------------------------------------------
const inflight = new Map<string, Promise<any>>();

export interface MbRequestOptions {
  /** Coalescing slot: a newer request on the same slot cancels a queued older one. */
  slot?: string | null;
  timeoutMs?: number;
  retries?: number;
}

export function mbFetchJson(url: string, opts: MbRequestOptions = {}): Promise<any> {
  const { slot = null, timeoutMs = ATTEMPT_TIMEOUT_MS, retries = MAX_RETRIES } = opts;
  const key = url;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = enqueue(slot, () => fetchWithRetry(url, timeoutMs, retries)).finally(() => {
    if (inflight.get(key) === p) inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

// --- High-level endpoints ---------------------------------------------------
export async function mbSearchArtists(query: string, limit = 10): Promise<any[]> {
  const url = `${MB_BASE}/artist/?query=artist:${encodeURIComponent(query)}&fmt=json&limit=${limit}`;
  const data = await mbFetchJson(url, { slot: "artist-search" });
  return data.artists || [];
}

export interface ReleaseGroupPage {
  groups: any[];
  total: number;
}

/**
 * Fetch EVERY release group for an artist (MusicBrainz caps browse pages at
 * 100 rows; prolific artists like Daft Punk have 200+). Pages run
 * sequentially through the paced lane. Returns what was collected even if a
 * later page fails — partial catalogs beat empty ones.
 */
export async function mbBrowseAllReleaseGroups(
  artistMbid: string,
  opts: { slot?: string | null; maxPages?: number } = {}
): Promise<ReleaseGroupPage> {
  const { slot = "discography", maxPages = 5 } = opts;
  const groups: any[] = [];
  let total = 0;
  for (let page = 0; page < maxPages; page++) {
    const offset = page * 100;
    const url = `${MB_BASE}/release-group?artist=${encodeURIComponent(
      artistMbid
    )}&limit=100${offset > 0 ? `&offset=${offset}` : ""}&fmt=json`;
    let data;
    try {
      data = await mbFetchJson(url, { slot });
    } catch (err) {
      if (isStaleRequest(err)) throw err;
      // A failed later page keeps earlier pages (partial > empty).
      // A failed FIRST page means no catalog at all — propagate.
      if (page === 0) throw err;
      break;
    }
    if (page === 0) total = Number(data["release-group-count"] || 0);
    groups.push(...(data["release-groups"] || []));
    if (groups.length >= total || (data["release-groups"] || []).length < 100) break;
  }
  return { groups, total };
}
