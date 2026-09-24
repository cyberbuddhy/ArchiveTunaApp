import { Album, DiscoveryResponse, ArtistDiscographyData, MatchedArtist, ArchiveLiveTape } from "../types";
import {
  getCachedArtistSearch,
  setCachedArtistSearch,
  getCachedDiscography,
  setCachedDiscography,
  getCachedReleaseStreams,
  setCachedReleaseStreams,
  getCachedArchiveSearch,
  setCachedArchiveSearch,
  getCachedAlbumDetails,
  setCachedAlbumDetails,
} from "./artistCache";

const inFlightAlbumRequests = new Map<string, Promise<Album>>();

export function computeRelevanceScore(
  item: { artist?: string; title?: string; downloads?: number },
  rawQuery: string
): number {
  if (!rawQuery) return 0;
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 0;

  const artist = (item.artist || "").toLowerCase();
  const title = (item.title || "").toLowerCase();
  const downloads = Number(item.downloads) || 0;

  let score = 0;

  // +1000 points if item.artist strictly equals or starts with the search query (case-insensitive)
  if (artist === q || artist.startsWith(q)) {
    score += 1000;
  } else if (artist.includes(q)) {
    // +500 points if item.artist contains the search query as a word/sub-phrase
    score += 500;
  }

  // +300 points if item.title contains the search query
  if (title.includes(q)) {
    score += 300;
  }

  // + (Math.log10(downloads + 1) * 10) points to give a slight boost to popular downloads without overwhelming metadata exactness
  score += Math.log10(downloads + 1) * 10;

  return score;
}

// Fail-fast JSON fetch: archive.org advancedsearch can stall for minutes.
// Every caller already treats a throw as "empty result", so aborting early
// turns an infinite spinner into an empty state instead.
export async function fetchArchiveJson(url: string, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Archive.org returned status ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchArchive(params: {
  query?: string;
  field?: string;
  collection?: string;
  era?: string;
  sort?: string;
  page?: number;
  rows?: number;
}) {  const query = (params.query || "").trim();
  const collection = (params.collection || "").trim();
  const field = (params.field || "all").trim();
  const era = (params.era || "all").trim();
  const sort = params.sort || "relevance";
  const page = params.page || 1;
  const rows = params.rows || 24;

  const cacheKey = `${query}__${field}__${collection}__${era}__${sort}__${page}__${rows}`;
  const cached = getCachedArchiveSearch(cacheKey);
  if (cached) {
    const items = cached.docs.map((doc: any) => {
      const id = doc.identifier;
      const creators = Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator || "Unknown Artist";
      const genres = Array.isArray(doc.genre)
        ? doc.genre.join(", ")
        : doc.genre || (Array.isArray(doc.subject) ? doc.subject.slice(0, 3).join(", ") : doc.subject || "");

      const downloads = Number(doc.downloads) || 0;
      const item = {
        id,
        identifier: id,
        title: doc.title || id,
        artist: creators,
        year: doc.year || (doc.date ? String(doc.date).substring(0, 4) : ""),
        description: typeof doc.description === "string" ? doc.description.replace(/<[^>]*>?/gm, "").substring(0, 240) : "",
        downloads,
        coverUrl: `https://archive.org/services/img/${id}`,
        archiveUrl: `https://archive.org/details/${id}`,
        source: "Archive.org",
        collection: Array.isArray(doc.collection) ? doc.collection[0] : doc.collection || "audio",
        genre: genres,
        relevanceScore: 0,
      };

      if (query) {
        item.relevanceScore = computeRelevanceScore(item, query);
      }

      return item;
    });

    if (query && (!sort || sort === "relevance")) {
      items.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return {
      items,
      total: cached.total,
      page,
      rows,
    };
  }

  const queryParts: string[] = ["mediatype:audio"];

  // Collection & Audio Format filtering (Vastest and most popular audio collections)
  if (collection && collection !== "all") {
    if (collection === "etree") {
      queryParts.push("(collection:etree OR collection:taperssection)");
    } else if (collection === "georgeblood78s" || collection === "78rpm") {
      queryParts.push("(collection:georgeblood78s OR collection:78rpm OR collection:great78)");
    } else if (collection === "netlabels") {
      queryParts.push("collection:netlabels");
    } else if (collection === "audio_music") {
      queryParts.push("collection:audio_music");
    } else if (collection === "opensource_audio" || collection === "community") {
      queryParts.push("(collection:opensource_audio OR collection:community)");
    } else if (collection === "hiphopmixtapes") {
      queryParts.push("(collection:hiphopmixtapes OR collection:datpiff)");
    } else if (collection === "flac") {
      queryParts.push("format:(\"Flac\" OR \"FLAC\")");
    } else if (collection === "vbr_mp3") {
      queryParts.push("format:(\"VBR MP3\" OR \"MP3\")");
    } else {
      queryParts.push(`collection:(${collection})`);
    }
  }

  // Era/Decade filtering (strictly decades)
  if (era && era !== "all") {
    switch (era) {
      case "2020s":
        queryParts.push("year:[2020 TO 2029]");
        break;
      case "2010s":
        queryParts.push("year:[2010 TO 2019]");
        break;
      case "2000s":
        queryParts.push("year:[2000 TO 2009]");
        break;
      case "1990s":
        queryParts.push("year:[1990 TO 1999]");
        break;
      case "1980s":
        queryParts.push("year:[1980 TO 1989]");
        break;
      case "1970s":
        queryParts.push("year:[1970 TO 1979]");
        break;
      case "1960s":
        queryParts.push("year:[1960 TO 1969]");
        break;
      case "1950s":
        queryParts.push("year:[1950 TO 1959]");
        break;
      case "vintage":
        queryParts.push("year:[1800 TO 1949]");
        break;
    }
  }

  // Query and Field targeted search
  if (query) {
    const cleanQ = query.replace(/"/g, "").trim();
    if (field === "artist") {
      queryParts.push(`creator:("${cleanQ}")`);
    } else if (field === "title") {
      queryParts.push(`title:("${cleanQ}")`);
    } else if (field === "genre") {
      queryParts.push(`subject:("${cleanQ}")`);
    } else {
      queryParts.push(`(creator:("${cleanQ}")^8 OR title:("${cleanQ}")^4 OR subject:("${cleanQ}")^2 OR ("${cleanQ}"))`);
    }
  } else if (!collection || collection === "all") {
    queryParts.push("(collection:etree OR collection:netlabels OR collection:georgeblood78s OR collection:audio_music)");
  }

  const archiveQuery = queryParts.join(" AND ");
  const searchUrl = new URL("https://archive.org/advancedsearch.php");
  searchUrl.searchParams.set("q", archiveQuery);
  searchUrl.searchParams.set("output", "json");
  searchUrl.searchParams.set("rows", rows.toString());
  searchUrl.searchParams.set("page", page.toString());
  if (sort && sort !== "relevance") {
    searchUrl.searchParams.set("sort[]", sort);
  }
  searchUrl.searchParams.append("fl[]", "identifier");
  searchUrl.searchParams.append("fl[]", "title");
  searchUrl.searchParams.append("fl[]", "creator");
  searchUrl.searchParams.append("fl[]", "year");
  searchUrl.searchParams.append("fl[]", "date");
  searchUrl.searchParams.append("fl[]", "description");
  searchUrl.searchParams.append("fl[]", "downloads");
  searchUrl.searchParams.append("fl[]", "mediatype");
  searchUrl.searchParams.append("fl[]", "collection");
  searchUrl.searchParams.append("fl[]", "genre");
  searchUrl.searchParams.append("fl[]", "subject");

  const response = await fetchArchiveJson(searchUrl.toString());
  const data = response;
  const docs = data?.response?.docs || [];
  const numFound = data?.response?.numFound || 0;

  // Cache raw response for instant 0ms retrieval on back-navigation or repeat searches
  setCachedArchiveSearch(cacheKey, { docs, total: numFound });

  const items = docs.map((doc: any) => {
    const id = doc.identifier;
    const creators = Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator || "Unknown Artist";
    const genres = Array.isArray(doc.genre)
      ? doc.genre.join(", ")
      : doc.genre || (Array.isArray(doc.subject) ? doc.subject.slice(0, 3).join(", ") : doc.subject || "");

    const downloads = Number(doc.downloads) || 0;
    const item = {
      id,
      identifier: id,
      title: doc.title || id,
      artist: creators,
      year: doc.year || (doc.date ? String(doc.date).substring(0, 4) : ""),
      description: typeof doc.description === "string" ? doc.description.replace(/<[^>]*>?/gm, "").substring(0, 240) : "",
      downloads,
      coverUrl: `https://archive.org/services/img/${id}`,
      archiveUrl: `https://archive.org/details/${id}`,
      source: "Archive.org",
      collection: Array.isArray(doc.collection) ? doc.collection[0] : doc.collection || "audio",
      genre: genres,
      relevanceScore: 0,
    };

    if (query) {
      item.relevanceScore = computeRelevanceScore(item, query);
    }

    return item;
  });

  if (query && (!sort || sort === "relevance")) {
    items.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  return {
    items,
    total: numFound,
    page,
    rows,
  };
}

function parseDurationString(val: any): number {
  if (typeof val === "number") return val;
  if (!val || typeof val !== "string") return 0;
  const str = val.trim();
  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    } else if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export async function fetchAlbumDetails(identifier: string): Promise<Album> {
  const cached = getCachedAlbumDetails(identifier);
  if (cached) return cached;

  if (inFlightAlbumRequests.has(identifier)) {
    return inFlightAlbumRequests.get(identifier)!;
  }

  const promise = (async () => {
    try {
      const metaUrl = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
      const response = await fetch(metaUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load item metadata (${response.status})`);
      }

      const data = await response.json();
      const metadata = data.metadata || {};
      const files: any[] = data.files || [];

      // Filter playable web audio formats
      const webAudioFiles = files.filter((f) => {
        const name = (f.name || "").toLowerCase();
        const format = (f.format || "").toLowerCase();
        if (
          name.endsWith(".shn") ||
          format.includes("shorten") ||
          name.endsWith(".xml") ||
          name.endsWith(".txt") ||
          name.endsWith(".torrent") ||
          name.endsWith(".afpk") ||
          name.endsWith("_thumb.jpg")
        ) {
          return false;
        }
        return (
          name.endsWith(".mp3") ||
          name.endsWith(".ogg") ||
          name.endsWith(".m4a") ||
          name.endsWith(".flac") ||
          format.includes("mp3") ||
          format.includes("vbr") ||
          format.includes("ogg")
        );
      });

      const mp3Files = webAudioFiles.filter(
        (f) =>
          (f.name || "").toLowerCase().endsWith(".mp3") ||
          (f.format || "").toLowerCase().includes("mp3")
      );
      const chosenFiles = mp3Files.length > 0 ? mp3Files : webAudioFiles;

      // Deduplicate files by base name
      const seenBaseNames = new Set<string>();
      const deduplicatedFiles: any[] = [];
      for (const f of chosenFiles) {
        const base = (f.name || "").replace(/\.[^/.]+$/, "").toLowerCase();
        if (!seenBaseNames.has(base)) {
          seenBaseNames.add(base);
          deduplicatedFiles.push(f);
        }
      }

      const tracks = deduplicatedFiles.map((f, idx) => {
        const rawTitle = f.title || f.name.replace(/\.[^/.]+$/, "").replace(/^[0-9]+[_\s.-]*/, "");
        const trackNumber = f.track ? parseInt(String(f.track).split("/")[0], 10) : idx + 1;
        const duration = parseDurationString(f.length || f.duration);
        const cleanPath = (f.name || "")
          .split("/")
          .map((part: string) => encodeURIComponent(part))
          .join("/");
        const streamUrl = `https://archive.org/download/${identifier}/${cleanPath}`;

        return {
          id: `${identifier}_${idx}_${encodeURIComponent(f.name)}`,
          title: rawTitle.trim() || `Track ${idx + 1}`,
          artist: f.creator || f.artist || metadata.creator || "Unknown Artist",
          album: metadata.title || identifier,
          albumId: identifier,
          trackNumber: isNaN(trackNumber) || trackNumber <= 0 ? idx + 1 : trackNumber,
          duration,
          streamUrl,
          format: f.format || "MP3",
          filename: f.name,
          size: f.size ? parseInt(f.size, 10) : 0,
        };
      });

      tracks.sort((a, b) => a.trackNumber - b.trackNumber);

      const creators = Array.isArray(metadata.creator)
        ? metadata.creator.join(", ")
        : metadata.creator || "Unknown Artist";
      const genres = Array.isArray(metadata.genre)
        ? metadata.genre.join(", ")
        : metadata.genre || (Array.isArray(metadata.subject) ? metadata.subject.join(", ") : metadata.subject || "");

      const album: Album = {
        id: identifier,
        identifier,
        title: metadata.title || identifier,
        artist: creators,
        year: metadata.year || (metadata.date ? String(metadata.date).substring(0, 4) : ""),
        description:
          typeof metadata.description === "string"
            ? metadata.description.replace(/<[^>]*>?/gm, "").substring(0, 800)
            : "",
        coverUrl: `https://archive.org/services/img/${identifier}`,
        archiveUrl: `https://archive.org/details/${identifier}`,
        collection: Array.isArray(metadata.collection) ? metadata.collection[0] : metadata.collection || "audio",
        genre: genres,
        tracks,
        source: "Archive.org",
        capturedAt: new Date().toISOString(),
      };

      setCachedAlbumDetails(identifier, album);
      return album;
    } finally {
      inFlightAlbumRequests.delete(identifier);
    }
  })();

  inFlightAlbumRequests.set(identifier, promise);
  return promise;
}

export async function resolveUrlOrIdentifier(url: string): Promise<{ resolvedType: string; identifier?: string; streamUrl?: string; title?: string }> {
  const trimmed = url.trim();
  let identifier = "";

  const matchDetails = trimmed.match(/archive\.org\/details\/([a-zA-Z0-9_\-.]+)/i);
  const matchDownload = trimmed.match(/archive\.org\/download\/([a-zA-Z0-9_\-.]+)/i);

  if (matchDetails && matchDetails[1]) {
    identifier = matchDetails[1];
  } else if (matchDownload && matchDownload[1]) {
    identifier = matchDownload[1];
  } else if (/^[a-zA-Z0-9_\-.]+$/.test(trimmed)) {
    identifier = trimmed;
  }

  if (identifier) {
    try {
      const metaUrl = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
      const metaRes = await fetch(metaUrl);
      if (metaRes.ok) {
        const data = await metaRes.json();
        if (data.metadata && Object.keys(data.metadata).length > 0) {
          return { resolvedType: "archive", identifier };
        }
      }
    } catch {
      // fallback
    }
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return {
      resolvedType: "direct_stream",
      streamUrl: trimmed,
      title: trimmed.split("/").pop() || "Direct Stream",
    };
  }

  throw new Error("Could not identify or resolve Archive.org album or audio link");
}

const MB_USER_AGENT = "MusicVaultApp/1.0.0 (https://github.com/my-app/music-vault)";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  MX: "Mexico",
  BR: "Brazil",
  SE: "Sweden",
  IE: "Ireland",
  NZ: "New Zealand",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  NO: "Norway",
  CL: "Chile",
  AR: "Argentina",
  CO: "Colombia",
};

/**
 * Intelligent Artist Search (Spotify-style):
 * Detects if a search query corresponds to an artist in MusicBrainz.
 */
export async function searchArtists(query: string): Promise<MatchedArtist[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  const cached = getCachedArtistSearch(cleanQuery);
  if (cached) return cached;

  try {
    const mbSearchUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(
      cleanQuery
    )}&fmt=json`;
    const mbRes = await fetch(mbSearchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": MB_USER_AGENT,
      },
    });

    if (!mbRes.ok) return [];

    const mbData = await mbRes.json();
    const rawArtists = mbData.artists || [];
    if (rawArtists.length === 0) return [];

    // Filter relevant artists
    // Prioritize high scores (>= 60) or case-insensitive exact match
    const lowerQ = cleanQuery.toLowerCase();
    const relevant = rawArtists.filter((a: any) => {
      const score = typeof a.score === "string" ? parseInt(a.score, 10) : a.score || 0;
      const name = (a.name || "").toLowerCase();
      return score >= 60 || name.includes(lowerQ) || lowerQ.includes(name);
    }).slice(0, 4);

    if (relevant.length === 0) return [];

    // Map into MatchedArtist and fetch top release group artwork for the top matches
    const matched: MatchedArtist[] = await Promise.all(
      relevant.map(async (a: any, idx: number) => {
        let coverUrl: string | undefined;

        // Fetch top release-group cover for the first 2 artists
        if (idx < 2 && a.id) {
          try {
            const rgUrl = `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(
              a.id
            )}&limit=1&fmt=json`;
            const rgRes = await fetch(rgUrl, {
              headers: { Accept: "application/json", "User-Agent": MB_USER_AGENT },
            });
            if (rgRes.ok) {
              const rgData = await rgRes.json();
              const rgs = rgData["release-groups"] || [];
              if (rgs.length > 0 && rgs[0].id) {
                coverUrl = `https://coverartarchive.org/release-group/${rgs[0].id}/front-250`;
              }
            }
          } catch {
            // non-fatal
          }
        }

        const score = typeof a.score === "string" ? parseInt(a.score, 10) : a.score || 0;
        const country =
          COUNTRY_NAMES[a.country] || a.country || (a.area ? a.area.name : undefined);
        const tags = Array.isArray(a.tags)
          ? a.tags.slice(0, 5).map((t: any) => t.name)
          : [];

        return {
          id: a.id,
          name: a.name || cleanQuery,
          score,
          type: a.type || "Artist",
          country,
          disambiguation: a.disambiguation || "",
          lifeSpan: a["life-span"]
            ? {
                begin: a["life-span"].begin ? String(a["life-span"].begin).substring(0, 4) : undefined,
                end: a["life-span"].end ? String(a["life-span"].end).substring(0, 4) : undefined,
                ended: a["life-span"].ended,
              }
            : undefined,
          tags,
          coverUrl,
        };
      })
    );

    setCachedArtistSearch(cleanQuery, matched);
    return matched;
  } catch (err) {
    console.warn("Artist search error:", err);
    return [];
  }
}

/**
 * Searches Archive.org for available streams, masters, and recordings of a specific official release
 */
export async function searchStreamsForRelease(
  artistName: string,
  releaseTitle: string
): Promise<ArchiveLiveTape[]> {
  const cleanArtist = artistName.replace(/["\\]/g, "").trim();
  const cleanTitle = releaseTitle.replace(/["\\]/g, "").trim();
  if (!cleanTitle) return [];

  const cached = getCachedReleaseStreams(cleanArtist, cleanTitle);
  if (cached) return cached;

  // Primary search: artist creator + release title in audio
  const primaryQuery = `creator:("${cleanArtist}") AND ("${cleanTitle}") AND mediatype:(audio)`;
  const archiveUrl = new URL("https://archive.org/advancedsearch.php");
  archiveUrl.searchParams.set("q", primaryQuery);
  archiveUrl.searchParams.set("output", "json");
  archiveUrl.searchParams.set("rows", "24");
  archiveUrl.searchParams.set("sort[]", "downloads desc");
  archiveUrl.searchParams.append("fl[]", "identifier");
  archiveUrl.searchParams.append("fl[]", "title");
  archiveUrl.searchParams.append("fl[]", "creator");
  archiveUrl.searchParams.append("fl[]", "year");
  archiveUrl.searchParams.append("fl[]", "date");
  archiveUrl.searchParams.append("fl[]", "downloads");
  archiveUrl.searchParams.append("fl[]", "collection");
  archiveUrl.searchParams.append("fl[]", "description");

  try {
    const res = await fetch(archiveUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const docs = data?.response?.docs || [];
      if (docs.length > 0) {
        const results = docs.map((doc: any) => {
          const id = doc.identifier;
          const col = Array.isArray(doc.collection) ? doc.collection[0] : doc.collection || "audio";
          return {
            id,
            identifier: id,
            title: doc.title || id,
            artist: Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator || cleanArtist,
            year: doc.year || (doc.date ? String(doc.date).substring(0, 4) : ""),
            date: doc.date || (doc.year ? String(doc.year) : ""),
            downloads: doc.downloads || 0,
            collection: col,
            coverUrl: `https://archive.org/services/img/${id}`,
            description:
              typeof doc.description === "string"
                ? doc.description.replace(/<[^>]*>?/gm, "").substring(0, 200)
                : "",
          };
        });
        setCachedReleaseStreams(cleanArtist, cleanTitle, results);
        return results;
      }
    }

    // Secondary relaxed query if primary had 0 results
    const relaxedQuery = `("${cleanArtist}") AND ("${cleanTitle}") AND mediatype:(audio)`;
    archiveUrl.searchParams.set("q", relaxedQuery);
    const res2 = await fetch(archiveUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (res2.ok) {
      const data2 = await res2.json();
      const docs2 = data2?.response?.docs || [];
      const results2 = docs2.map((doc: any) => {
        const id = doc.identifier;
        const col = Array.isArray(doc.collection) ? doc.collection[0] : doc.collection || "audio";
        return {
          id,
          identifier: id,
          title: doc.title || id,
          artist: Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator || cleanArtist,
          year: doc.year || (doc.date ? String(doc.date).substring(0, 4) : ""),
          date: doc.date || (doc.year ? String(doc.year) : ""),
          downloads: doc.downloads || 0,
          collection: col,
          coverUrl: `https://archive.org/services/img/${id}`,
          description:
            typeof doc.description === "string"
              ? doc.description.replace(/<[^>]*>?/gm, "").substring(0, 200)
              : "",
        };
      });
      setCachedReleaseStreams(cleanArtist, cleanTitle, results2);
      return results2;
    }

    setCachedReleaseStreams(cleanArtist, cleanTitle, []);
    return [];
  } catch (err) {
    console.warn("searchStreamsForRelease error:", err);
    return [];
  }
}

export async function fetchArtistDiscography(artistName: string): Promise<ArtistDiscographyData> {
  const cleanName = artistName.trim();
  if (!cleanName) throw new Error("Artist name is required");

  const cached = getCachedDiscography(cleanName);
  if (cached) return cached;

  let mbArtist: any = null;
  let releaseGroups: any[] = [];

  try {
    const mbSearchUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(cleanName)}&fmt=json`;
    const mbRes = await fetch(mbSearchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": MB_USER_AGENT,
      },
    });
    if (mbRes.ok) {
      const mbData = await mbRes.json();
      const artists = mbData.artists || [];
      if (artists.length > 0) {
        mbArtist = artists.find((a: any) => a.name.toLowerCase() === cleanName.toLowerCase()) || artists[0];
        if (mbArtist && mbArtist.id) {
          const rgUrl = `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(mbArtist.id)}&limit=100&fmt=json`;
          const rgRes = await fetch(rgUrl, {
            headers: {
              Accept: "application/json",
              "User-Agent": MB_USER_AGENT,
            },
          });
          if (rgRes.ok) {
            const rgData = await rgRes.json();
            releaseGroups = rgData["release-groups"] || [];
          }
        }
      }
    }
  } catch (err) {
    console.warn("MusicBrainz query warning:", err);
  }

  // Fetch Live Tapes & Concerts from Archive.org
  const cleanArtist = cleanName.replace(/"/g, "");
  const liveSearchQuery = `creator:("${cleanArtist}") AND mediatype:(audio)`;
  const archiveUrl = new URL("https://archive.org/advancedsearch.php");
  archiveUrl.searchParams.set("q", liveSearchQuery);
  archiveUrl.searchParams.set("output", "json");
  archiveUrl.searchParams.set("rows", "60");
  archiveUrl.searchParams.set("sort[]", "date desc");
  archiveUrl.searchParams.append("fl[]", "identifier");
  archiveUrl.searchParams.append("fl[]", "title");
  archiveUrl.searchParams.append("fl[]", "creator");
  archiveUrl.searchParams.append("fl[]", "year");
  archiveUrl.searchParams.append("fl[]", "date");
  archiveUrl.searchParams.append("fl[]", "downloads");
  archiveUrl.searchParams.append("fl[]", "collection");
  archiveUrl.searchParams.append("fl[]", "description");

  let liveTapes: any[] = [];
  let totalLiveTapes = 0;

  try {
    const arcRes = await fetch(archiveUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (arcRes.ok) {
      const arcData = await arcRes.json();
      const docs = arcData?.response?.docs || [];
      totalLiveTapes = arcData?.response?.numFound || 0;
      liveTapes = docs.map((doc: any) => {
        const id = doc.identifier;
        const col = Array.isArray(doc.collection) ? doc.collection[0] : doc.collection || "audio";
        return {
          id,
          identifier: id,
          title: doc.title || id,
          artist: Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator || cleanName,
          year: doc.year || (doc.date ? String(doc.date).substring(0, 4) : ""),
          date: doc.date || (doc.year ? String(doc.year) : ""),
          downloads: doc.downloads || 0,
          collection: col,
          coverUrl: `https://archive.org/services/img/${id}`,
          description: typeof doc.description === "string" ? doc.description.replace(/<[^>]*>?/gm, "").substring(0, 200) : "",
        };
      });
    }
  } catch (err) {
    console.warn("Archive.org live query warning:", err);
  }

  const officialAlbums: any[] = [];
  const officialEPs: any[] = [];
  const officialSingles: any[] = [];
  const officialLiveReleases: any[] = [];
  const officialOther: any[] = [];

  for (const rg of releaseGroups) {
    const pType = rg["primary-type"] || "Album";
    const sTypes: string[] = rg["secondary-types"] || [];
    const lowerTitle = (rg.title || "").toLowerCase();

    // Strictly exclude bootlegs, interviews, and spoken word from studio/official catalog
    const isBootlegOrUnofficial =
      sTypes.some((st: string) => ["bootleg", "interview", "spokenword", "audiobook", "demo", "promo"].includes(st.toLowerCase())) ||
      lowerTitle.includes("bootleg") ||
      lowerTitle.includes("unauthorized") ||
      lowerTitle.includes("interview");

    const isLive = sTypes.includes("Live") || pType === "Broadcast" || lowerTitle.includes("live at") || lowerTitle.includes("in concert");
    const isCompilation = sTypes.includes("Compilation") || sTypes.includes("Remix") || sTypes.includes("Soundtrack") || sTypes.includes("Boxset") || lowerTitle.includes("greatest hits") || lowerTitle.includes("best of");
    const title = rg.title || "Untitled";
    const year = rg["first-release-date"] ? String(rg["first-release-date"]).substring(0, 4) : "";

    const item = {
      id: rg.id,
      title,
      primaryType: pType,
      secondaryTypes: sTypes,
      firstReleaseDate: rg["first-release-date"] || "",
      year,
      coverUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
    };

    if (isLive) {
      if (!isBootlegOrUnofficial) {
        officialLiveReleases.push(item);
      }
    } else if (pType === "Album") {
      if (isCompilation) {
        if (!isBootlegOrUnofficial) officialOther.push(item);
      } else if (!isBootlegOrUnofficial) {
        officialAlbums.push(item);
      }
    } else if (pType === "EP") {
      if (!isBootlegOrUnofficial) officialEPs.push(item);
    } else if (pType === "Single") {
      if (!isBootlegOrUnofficial) officialSingles.push(item);
    } else if (isCompilation && !isBootlegOrUnofficial) {
      officialOther.push(item);
    }
  }

  officialAlbums.sort((a, b) => (b.firstReleaseDate || "").localeCompare(a.firstReleaseDate || ""));
  officialEPs.sort((a, b) => (b.firstReleaseDate || "").localeCompare(a.firstReleaseDate || ""));
  officialSingles.sort((a, b) => (b.firstReleaseDate || "").localeCompare(a.firstReleaseDate || ""));
  officialLiveReleases.sort((a, b) => (b.firstReleaseDate || "").localeCompare(a.firstReleaseDate || ""));
  officialOther.sort((a, b) => (b.firstReleaseDate || "").localeCompare(a.firstReleaseDate || ""));

  const formattedArtist = mbArtist ? {
    id: mbArtist.id,
    name: mbArtist.name || cleanName,
    country: COUNTRY_NAMES[mbArtist.country] || mbArtist.country || (mbArtist.area ? mbArtist.area.name : undefined),
    type: mbArtist.type || "Band / Artist",
    disambiguation: mbArtist.disambiguation || "",
    lifeSpan: mbArtist["life-span"] ? {
      begin: mbArtist["life-span"].begin ? String(mbArtist["life-span"].begin).substring(0, 4) : undefined,
      end: mbArtist["life-span"].end ? String(mbArtist["life-span"].end).substring(0, 4) : undefined,
      ended: mbArtist["life-span"].ended,
    } : undefined,
    tags: Array.isArray(mbArtist.tags) ? mbArtist.tags.slice(0, 5).map((t: any) => t.name) : [],
  } : {
    id: "custom",
    name: cleanName,
    type: "Artist",
  };

  const discographyResult: ArtistDiscographyData = {
    artist: formattedArtist,
    officialAlbums,
    officialEPs,
    officialSingles,
    officialOther,
    singlesAndEPs: [...officialEPs, ...officialSingles],
    officialLiveReleases,
    liveTapes,
    totalLiveTapes,
  };

  setCachedDiscography(cleanName, discographyResult);
  return discographyResult;
}

export async function getDiscoveries(history: any[] = [], library: Album[] = []): Promise<DiscoveryResponse> {
  // Aggregate user tastes
  const artists = new Set<string>();
  const genres = new Set<string>();
  const eras = new Set<string>();

  history.slice(0, 30).forEach((item: any) => {
    if (item.artist && item.artist !== "Unknown Artist") artists.add(item.artist);
    if (item.genre) {
      item.genre.split(/[,;/]/).forEach((g: string) => {
        const clean = g.trim();
        if (clean.length > 2) genres.add(clean);
      });
    }
    if (item.year) eras.add(String(item.year));
  });

  library.slice(0, 20).forEach((album: any) => {
    if (album.artist && album.artist !== "Unknown Artist") artists.add(album.artist);
    if (album.genre) {
      album.genre.split(/[,;/]/).forEach((g: string) => {
        const clean = g.trim();
        if (clean.length > 2) genres.add(clean);
      });
    }
    if (album.year) eras.add(String(album.year));
  });

  const artistList = Array.from(artists).slice(0, 10);
  const genreList = Array.from(genres).slice(0, 10);

  // Curated discoveries pool
  const curatedDiscoveries = [
    {
      artistOrProject: artistList[0] || "Grateful Dead",
      albumOrShowTitle: "Cornell 5/8/77 Live Recording (Barton Hall)",
      archiveSearchQuery: 'creator:"Grateful Dead" AND year:1977 AND "Barton Hall"',
      reason: "One of the most legendary soundboard recordings in the Live Music Archive, praised for its crystalline sound fidelity.",
      category: "Archival Landmark",
      tags: ["Live Concert", "Psychedelic Rock", "Soundboard"],
    },
    {
      artistOrProject: artistList[1] || "Smashing Pumpkins",
      albumOrShowTitle: "Live at Cabaret Metro, Chicago 1993",
      archiveSearchQuery: 'creator:"Smashing Pumpkins" mediatype:audio 1993',
      reason: "Electrifying archival taper performance capturing the Siamese Dream era in pristine fidelity.",
      category: "Live Taper Treasure",
      tags: ["Alternative Rock", "1990s", "Live Soundboard"],
    },
    {
      artistOrProject: "Deep Netlabels Collective",
      albumOrShowTitle: "Kahvifreak Ambient Electronic Sessions",
      archiveSearchQuery: 'collection:netlabels AND (ambient OR electronic) AND downloads:[1000 TO *]',
      reason: "Introspective soundscapes released by independent digital netlabel pioneers on Archive.org.",
      category: "Deep Netlabel Gem",
      tags: ["Ambient", "IDM", "Creative Commons"],
    },
    {
      artistOrProject: "Great 78 Project",
      albumOrShowTitle: "George Blood Historical 78rpm Shellac Gems",
      archiveSearchQuery: 'collection:georgeblood78s AND (jazz OR blues OR swing)',
      reason: "Preserved original 78rpm recordings from early 20th-century jazz, blues, and swing shellac pressings.",
      category: "Sonic Kindred",
      tags: ["78rpm", "Vintage Blues", "Historic Shellac"],
    },
  ];

  const profile = artistList.length > 0
    ? `Explorer of timeless sounds featuring ${artistList.slice(0, 3).join(", ")} and open-source archival recordings.`
    : "Explorer ready to dive into millions of live tapers, netlabel experiments, and historic 78rpm sound treasures.";

  const recommendedCollections = ["etree", "netlabels", "georgeblood78s", "audio_music"];

  // Fetch verified playable items directly from Archive.org in parallel
  const verifiedItems: any[] = [];
  await Promise.allSettled(
    curatedDiscoveries.map(async (disc) => {
      try {
        const sUrl = new URL("https://archive.org/advancedsearch.php");
        sUrl.searchParams.set("q", `mediatype:audio AND (${disc.archiveSearchQuery})`);
        sUrl.searchParams.set("output", "json");
        sUrl.searchParams.set("rows", "3");
        sUrl.searchParams.set("sort[]", "downloads desc");
        sUrl.searchParams.append("fl[]", "identifier");
        sUrl.searchParams.append("fl[]", "title");
        sUrl.searchParams.append("fl[]", "creator");
        sUrl.searchParams.append("fl[]", "year");
        sUrl.searchParams.append("fl[]", "description");
        sUrl.searchParams.append("fl[]", "downloads");
        sUrl.searchParams.append("fl[]", "collection");

        const data = await fetchArchiveJson(sUrl.toString());
        {
          const docs = data?.response?.docs || [];
          docs.forEach((doc: any) => {
            verifiedItems.push({
              id: doc.identifier,
              identifier: doc.identifier,
              title: doc.title || disc.albumOrShowTitle,
              artist: doc.creator || disc.artistOrProject,
              year: doc.year || "",
              coverUrl: `https://archive.org/services/img/${doc.identifier}`,
              archiveUrl: `https://archive.org/details/${doc.identifier}`,
              downloads: doc.downloads || 0,
              discoveryCategory: disc.category,
              recommendationReason: disc.reason,
              tags: disc.tags || [],
            });
          });
        }
      } catch {
        // ignore individual query errors
      }
    })
  );

  return {
    profile,
    recommendedCollections,
    discoveries: curatedDiscoveries,
    liveArchivedMatches: verifiedItems,
  };
}

// Time Capsules: fixed era snapshots (label year + genre terms). Year ranges
// are ±2 around the label — era-centered for hit rate, serverless like the rest.
export interface TimeCapsule {
  label: string;
  era: string;
  blurb: string;
  query: string;
}

export interface TimeCapsuleShelf extends TimeCapsule {
  items: Array<{
    identifier: string;
    title: string;
    artist: string;
    year: string;
    coverUrl: string;
  }>;
}

export const TIME_CAPSULES: TimeCapsule[] = [
  { label: "1990 · House", era: "1990", blurb: "Warehouse grooves at their peak", query: "year:[1988 TO 1992] AND (house)" },
  { label: "1985 · Disco", era: "1985", blurb: "Mirrorball afterglow", query: "year:[1983 TO 1987] AND (disco)" },
  { label: "1977 · Punk", era: "1977", blurb: "Three chords, no future", query: "year:[1975 TO 1979] AND (punk)" },
  { label: "1969 · Rock", era: "1969", blurb: "Woodstock summer", query: "year:[1967 TO 1971] AND (rock)" },
  { label: "1971 · Soul & Funk", era: "1971", blurb: "Deep grooves, horn sections", query: "year:[1969 TO 1973] AND (soul OR funk)" },
  { label: "1982 · Synth-Pop", era: "1982", blurb: "Neon keys and drum machines", query: "year:[1980 TO 1984] AND (synth OR \"new wave\")" },
  { label: "1967 · Psychedelia", era: "1967", blurb: "Summer of love static", query: "year:[1965 TO 1969] AND (psychedelic OR \"acid rock\")" },
  { label: "1973 · Prog Rock", era: "1973", blurb: "Side-long odysseys", query: "year:[1971 TO 1975] AND (progressive OR prog)" },
  { label: "1988 · Hip-Hop", era: "1988", blurb: "Golden age boom-bap", query: "year:[1986 TO 1990] AND (hip-hop OR rap)" },
  { label: "1994 · Grunge & Alt", era: "1994", blurb: "Flannel and feedback", query: "year:[1992 TO 1996] AND (grunge OR alternative)" },
  { label: "2005 · Indie", era: "2005", blurb: "Blog-rock and netlabel gems", query: "year:[2003 TO 2007] AND (indie OR lo-fi)" },
];

export async function fetchTimeCapsules(rows = 6): Promise<TimeCapsuleShelf[]> {
  const shelves = await Promise.allSettled(
    TIME_CAPSULES.map(async (cap) => {
      const sUrl = new URL("https://archive.org/advancedsearch.php");
      sUrl.searchParams.set("q", `mediatype:audio AND (${cap.query})`);
      sUrl.searchParams.set("output", "json");
      sUrl.searchParams.set("rows", String(rows));
      sUrl.searchParams.set("sort[]", "downloads desc");
      ["identifier", "title", "creator", "year"].forEach((f) => sUrl.searchParams.append("fl[]", f));
      const data = await fetchArchiveJson(sUrl.toString());
      const items = (data?.response?.docs || []).map((doc: any) => ({
        identifier: doc.identifier,
        title: doc.title || doc.identifier,
        artist: doc.creator || "Unknown Artist",
        year: doc.year || "",
        coverUrl: `https://archive.org/services/img/${doc.identifier}`,
      }));
      return { ...cap, items };
    })
  );
  return shelves
    .filter((r): r is PromiseFulfilledResult<TimeCapsuleShelf> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((s) => s.items.length > 0);
}
