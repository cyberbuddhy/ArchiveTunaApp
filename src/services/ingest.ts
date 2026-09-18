import { fetchAlbumDetails, resolveUrlOrIdentifier } from "./api";
import { Album, Track } from "../types";
export type IngestQuality = "auto" | "mp3" | "flac";
export function negotiateTracks(tracks: Track[], q: IngestQuality): Track[] {
  if (q === "auto") return tracks;
  const want = q === "flac" ? [".flac", ".ogg", ".m4a", ".mp3"] : [".mp3", ".ogg", ".m4a", ".flac"];
  const byBase = new Map<string, Track[]>();
  tracks.forEach((t) => {
    const base = (t.filename || t.title).replace(/\.[^/.]+$/, "").toLowerCase();
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base)!.push(t);
  });
  const out: Track[] = [];
  byBase.forEach((group) => {
    group.sort((a, b) => want.indexOf("." + (a.filename || "").split(".").pop()!.toLowerCase()) - want.indexOf("." + (b.filename || "").split(".").pop()!.toLowerCase()));
    out.push(group[0]);
  });
  return out.sort((a, b) => a.trackNumber - b.trackNumber);
}
export async function ingestUrl(input: string, q: IngestQuality = "auto"): Promise<Album> {
  const r = await resolveUrlOrIdentifier(input.trim());
  if (r.resolvedType === "archive" && r.identifier) {
    const album = await fetchAlbumDetails(r.identifier);
    const tracks = negotiateTracks(album.tracks, q);
    return { ...album, tracks, genre: album.genre, description: album.description };
  }
  if (r.resolvedType === "direct_stream" && r.streamUrl) {
    const t = Date.now();
    return { id: `direct_${t}`, identifier: `direct_${t}`, title: r.title || "Direct Stream", artist: "Independent Stream", tracks: [{ id: `dt_${t}`, title: r.title || "Stream", artist: "Independent Stream", album: "Direct", albumId: `direct_${t}`, trackNumber: 1, duration: 0, streamUrl: r.streamUrl, format: "Stream" }], source: "Direct Stream", capturedAt: new Date().toISOString() };
  }
  throw new Error("Unresolvable input");
}
