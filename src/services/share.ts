import { Playlist, Track } from "../types";

// Compact wire format: [title, artist, albumId, file, secs][] — stream URLs are
// rebuilt as https://archive.org/download/<albumId>/<file>, then gzipped.
type Slim = [string, string, string, string, number];
const slim = (t: Track): Slim => [
  t.title, t.artist, t.albumId,
  decodeURIComponent((t.filename || t.streamUrl.split("/").pop() || "").split("/").pop() || ""),
  Math.round(t.duration || 0),
];
const expand = (s: Slim, i: number): Track => ({
  id: `shared_${i}_${s[2]}_${i}`,
  title: s[0], artist: s[1], album: s[2], albumId: s[2],
  trackNumber: i + 1, duration: s[4] || 0,
  streamUrl: `https://archive.org/download/${s[2]}/${s[3].split("/").map(encodeURIComponent).join("/")}`,
  filename: s[3], format: "MP3",
});

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function pump(stream: CompressionStream | DecompressionStream, input: Uint8Array): Promise<Uint8Array> {
  const w = stream.writable.getWriter();
  try {
    await w.write(input as unknown as Uint8Array<ArrayBuffer>);
  } catch { /* decode will fail below, handled by callers */ }
  try {
    await w.close();
  } catch { /* noop */ }
  const chunks: Uint8Array[] = [];
  const r = stream.readable.getReader();
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  chunks.forEach((c) => { out.set(c, o); o += c.length; });
  return out;
}
async function gzip(raw: string): Promise<Uint8Array> {
  return pump(new CompressionStream("gzip"), new TextEncoder().encode(raw));
}
async function gunzip(bytes: Uint8Array): Promise<string> {
  return new TextDecoder().decode(await pump(new DecompressionStream("gzip"), bytes));
}

export interface SharedMix {
  name: string;
  tracks: Track[];
}

// Legacy (uncompressed) decoder for links made before gzip envelopes.
function decodeLegacy(s: string): Track[] {
  try {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    const arr = JSON.parse(decodeURIComponent(escape(atob(b)))) as any[];
    if (!Array.isArray(arr)) return [];
    return arr.map((a, i) => ({
      id: `shared_${i}_${a[2]?.slice(-12)}`, title: a[0], artist: a[1],
      album: a[3] || "Shared", albumId: a[3] || "shared", trackNumber: i + 1,
      duration: a[4] || 0, streamUrl: a[2], format: "MP3",
    }));
  } catch {
    return [];
  }
}

export async function encodeMixtape(name: string, tracks: Track[]): Promise<string> {
  const payload = JSON.stringify([name, tracks.map(slim)]);
  try {
    return b64urlEncode(await gzip(payload));
  } catch {
    return b64urlEncode(new TextEncoder().encode(payload));
  }
}

export async function decodeMixtape(s: string): Promise<SharedMix | null> {
  const bytes = b64urlDecode(s);
  let raw: string | null = null;
  try {
    raw = await gunzip(bytes);
  } catch {
    try {
      raw = new TextDecoder().decode(bytes);
    } catch {
      raw = null;
    }
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && Array.isArray(parsed[1])) {
        return { name: String(parsed[0] || "Shared Mixtape"), tracks: (parsed[1] as Slim[]).map(expand) };
      }
    } catch { /* fall through to legacy */ }
  }
  const legacy = decodeLegacy(s);
  return legacy.length ? { name: "Shared Mixtape", tracks: legacy } : null;
}

export async function mixtapeUrl(pl: Playlist): Promise<string> {
  return `${location.origin}${location.pathname}#mix=${await encodeMixtape(pl.name, pl.tracks)}`;
}

export function readSharedMixRaw(): string | null {
  const m = location.hash.match(/mix=([A-Za-z0-9\-_]+)/);
  return m ? m[1] : null;
}

// ---- Short reference links (internal shortener): ids only, resolved on open ----
export const linkForAlbum = (identifier: string) =>
  `${location.origin}${location.pathname}#a=${identifier}`;
export const linkForSong = (albumId: string, trackNumber: number) =>
  `${location.origin}${location.pathname}#s=${albumId}:${trackNumber}`;
export async function linkForPlaylist(name: string, tracks: Track[]): Promise<string> {
  const refs = tracks.map((t): [string, number] => [t.albumId, t.trackNumber || 1]);
  try {
    return `${location.origin}${location.pathname}#p=${b64urlEncode(await gzip(JSON.stringify([name, refs])))}`;
  } catch {
    return `${location.origin}${location.pathname}#p=${b64urlEncode(new TextEncoder().encode(JSON.stringify([name, refs])))}`;
  }
}

export type SharedOpen =
  | { kind: "album"; id: string }
  | { kind: "song"; albumId: string; track: number }
  | { kind: "playlist"; name: string; refs: [string, number][] }
  | { kind: "legacy"; name: string; tracks: Track[] };

export async function parseSharedHash(): Promise<SharedOpen | null> {
  const h = location.hash;
  let m = h.match(/#a=([A-Za-z0-9_\-.]+)/);
  if (m) return { kind: "album", id: m[1] };
  m = h.match(/#s=([A-Za-z0-9_\-.]+):(\d+)/);
  if (m) return { kind: "song", albumId: m[1], track: Math.max(1, parseInt(m[2], 10) || 1) };
  m = h.match(/#p=([A-Za-z0-9\-_]+)/);
  if (m) {
    try {
      let raw: string;
      try {
        raw = await gunzip(b64urlDecode(m[1]));
      } catch {
        raw = new TextDecoder().decode(b64urlDecode(m[1]));
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && Array.isArray(parsed[1])) {
        return { kind: "playlist", name: String(parsed[0] || "Shared Mixtape"), refs: parsed[1] as [string, number][] };
      }
    } catch { /* fall through */ }
    return null;
  }
  const legacyRaw = readSharedMixRaw();
  if (legacyRaw) {
    const legacy = await decodeMixtape(legacyRaw);
    if (legacy) return { kind: "legacy", name: legacy.name, tracks: legacy.tracks };
  }
  return null;
}

// ---- Back-compat sync helpers (kept for existing callers) ----
export function encodeTracks(tracks: Track[]): string {
  const arr = tracks.map((t) => [t.title, t.artist, t.streamUrl, t.albumId, t.duration]);
  return b64urlEncode(new TextEncoder().encode(JSON.stringify(arr)));
}
export function decodeTracks(s: string): Track[] {
  return decodeLegacy(s);
}
export function readSharedMix(): Track[] | null {
  const raw = readSharedMixRaw();
  return raw ? decodeLegacy(raw) : null;
}
