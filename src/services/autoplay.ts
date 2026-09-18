import { Track } from "../types";

// Serverless autoplay: related tracks straight from archive.org advancedsearch.
export async function fetchRelatedTracks(seed: Track, excludeIds: string[], rows = 4): Promise<Track[]> {
  const artist = (seed.artist || "").replace(/"/g, "").trim();
  const queries = artist && artist !== "Unknown Artist"
    ? [`creator:("${artist.slice(0, 60)}")`, `(collection:etree OR collection:netlabels)`]
    : [`(collection:etree OR collection:netlabels)`];
  const exclude = new Set([...excludeIds, seed.id, seed.albumId]);
  for (const q of queries) {
    try {
      const u = new URL("https://archive.org/advancedsearch.php");
      u.searchParams.set("q", `mediatype:audio AND (${q})`);
      u.searchParams.set("output", "json");
      u.searchParams.set("rows", String(rows + exclude.size + 2));
      u.searchParams.set("sort[]", "downloads desc");
      ["identifier", "title", "creator", "year"].forEach((f) => u.searchParams.append("fl[]", f));
      const r = await fetch(u.toString(), { headers: { Accept: "application/json" } });
      if (!r.ok) continue;
      const j: any = await r.json();
      const docs = (j?.response?.docs || [])
        .filter((d: any) => !exclude.has(d.identifier))
        .slice(0, rows);
      const out: Track[] = [];
      for (const d of docs) {
        try {
          const m = await fetch(`https://archive.org/metadata/${encodeURIComponent(d.identifier)}`, { headers: { Accept: "application/json" } });
          if (!m.ok) continue;
          const md: any = await m.json();
          const f = (md.files || []).find((x: any) => /\.(mp3|ogg|m4a)$/i.test(x.name || ""));
          if (!f) continue;
          out.push({
            id: `${d.identifier}_0_${encodeURIComponent(f.name)}`,
            title: d.title || f.name, artist: d.creator || "Unknown",
            album: d.title, albumId: d.identifier, trackNumber: 1, duration: 0,
            streamUrl: `https://archive.org/download/${d.identifier}/${encodeURIComponent(f.name)}`,
            format: f.format || "MP3",
          });
        } catch { /* skip doc */ }
      }
      if (out.length) return out;
    } catch { /* try next query */ }
  }
  return [];
}
