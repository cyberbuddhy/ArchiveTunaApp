import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Upstream fetch with timeout so one hung provider can't stall an endpoint
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12000
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Re-Ranking helper for search relevance
function computeRelevanceScore(
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

// Search Archive.org audio items
app.get("/api/archive/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const collection = String(req.query.collection || "").trim();
    const field = String(req.query.field || "all").trim();
    const era = String(req.query.era || "all").trim();
    const sort = String(req.query.sort || "downloads desc");
    const page = parseInt(String(req.query.page || "1"), 10) || 1;
    const rows = parseInt(String(req.query.rows || "24"), 10) || 24;

    let queryParts = ["mediatype:audio"];

    // Multi-term tokenizing (mirrors the client builder): exact phrases keep
    // boosts, token-AND groups add recall across fields + identifier slugs.
    const SEARCH_STOPWORDS = new Set([
      "the", "a", "an", "of", "and", "on", "in", "at", "to", "for", "with", "by", "from", "vs",
    ]);
    const searchTerms = (rawQuery: string): string[] => {
      const words = rawQuery
        .replace(/["\\]/g, " ")
        .toLowerCase()
        .split(/[\s,;|/\\\-_]+/)
        .map((w) => w.replace(/[^a-z0-9]+/g, ""))
        .filter((w) => w.length > 1);
      const uniq = [...new Set(words)];
      const meaningful = uniq.filter((w) => !SEARCH_STOPWORDS.has(w));
      return meaningful.length > 0 ? meaningful : uniq;
    };
    const buildTextClause = (q: string, f: string): string => {
      const cleanQ = q.replace(/"/g, "").trim();
      const terms = searchTerms(cleanQ);
      const ff = (f || "all").trim();
      if (ff === "artist") {
        const exact = `creator:("${cleanQ}")^10`;
        if (terms.length <= 1) return exact;
        const wb = terms.map((t) => `(creator:${t} OR title:${t} OR subject:${t})`).join(" AND ");
        return `(${exact} OR (${wb}))`;
      }
      if (ff === "title") {
        const exact = `title:("${cleanQ}")`;
        if (terms.length <= 1) return exact;
        return `(${exact} OR (${terms.map((t) => `title:${t}`).join(" AND ")}))`;
      }
      if (ff === "genre") {
        const exact = `subject:("${cleanQ}")`;
        if (terms.length <= 1) return exact;
        return `(${exact} OR (${terms.map((t) => `subject:${t}`).join(" AND ")}))`;
      }
      const exact = `(creator:("${cleanQ}")^8 OR title:("${cleanQ}")^4 OR subject:("${cleanQ}")^2 OR collection:("${cleanQ}")^2 OR ("${cleanQ}"))`;
      if (terms.length <= 1) return exact;
      const fieldFor = (t: string) =>
        `(creator:${t} OR title:${t} OR subject:${t} OR collection:${t} OR identifier:${t}*${/^\d{3,4}$/.test(t) ? ` OR year:${t}` : ""})`;
      const anywhere = terms.map(fieldFor).join(" AND ");
      return `(${exact} OR (${anywhere}))`;
    };

    // Collection & Audio Format filtering (mirrors the client query builder)
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

    // Era/Decade filtering
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
        queryParts.push("year:[1900 TO 1969]");
        break;
      }
    }

    // Query and Field targeted search (exact phrases boosted, token-AND for recall)
    if (query) {
      queryParts.push(buildTextClause(query, field));
    } else if (!collection || collection === "all") {
      // If empty query, pull notable curated audio
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

    const response = await fetchWithTimeout(searchUrl.toString(), {
      headers: {
        "User-Agent": "ArchiveMusicVault/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Archive.org returned status ${response.status}`,
      });
    }

    const data = await response.json();
    const docs = data?.response?.docs || [];
    const numFound = data?.response?.numFound || 0;

    const items = docs.map((doc: any) => {
      const id = doc.identifier;
      const creators = Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator || "Unknown Artist";
      const genres = Array.isArray(doc.genre) ? doc.genre.join(", ") : doc.genre || (Array.isArray(doc.subject) ? doc.subject.slice(0, 3).join(", ") : doc.subject || "");
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

    return res.json({
      items,
      total: numFound,
      page,
      rows,
    });
  } catch (err: any) {
    console.error("Error searching Archive.org:", err);
    return res.status(500).json({ error: err.message || "Failed to search Archive.org" });
  }
});

// Fetch Artist Discography combining MusicBrainz (Free Open Database) and Archive.org Live Tapes
app.get("/api/artist/discography", async (req, res) => {
  try {
    const artistName = String(req.query.name || "").trim();
    if (!artistName) {
      return res.status(400).json({ error: "Artist name is required" });
    }

    // 1. Search MusicBrainz for artist
    const mbSearchUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(artistName)}&fmt=json`;
    let mbArtist: any = null;
    let releaseGroups: any[] = [];
    let mbDegraded = false;

    try {
      const mbRes = await fetchWithTimeout(mbSearchUrl, {
        headers: {
          "User-Agent": "ArchiveMusicVault/1.0.0 (https://archive.org)",
          Accept: "application/json",
        },
      }, 10000);

      if (mbRes.ok) {
        const mbData = await mbRes.json();
        const artists = mbData.artists || [];
        if (artists.length > 0) {
          // Exact name match or highest score
          mbArtist = artists.find((a: any) => a.name.toLowerCase() === artistName.toLowerCase()) || artists[0];
          
          if (mbArtist && mbArtist.id) {
            const rgUrl = `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(mbArtist.id)}&limit=100&fmt=json`;
            const rgRes = await fetchWithTimeout(rgUrl, {
              headers: {
                "User-Agent": "ArchiveMusicVault/1.0.0 (https://archive.org)",
                Accept: "application/json",
              },
            }, 10000);
            if (rgRes.ok) {
              const rgData = await rgRes.json();
              releaseGroups = rgData["release-groups"] || [];
            }
          }
        }
      }
    } catch (mbErr) {
      mbDegraded = true;
      console.warn("MusicBrainz query warning:", mbErr);
    }

    // 2. Fetch Live Tapes, Concerts & Audio from Archive.org
    const cleanArtist = artistName.replace(/"/g, "");
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
    let archiveDegraded = false;

    try {
      const arcRes = await fetchWithTimeout(archiveUrl.toString(), {
        headers: {
          "User-Agent": "ArchiveMusicVault/1.0.0",
          Accept: "application/json",
        },
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
            artist: Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator || artistName,
            year: doc.year || (doc.date ? String(doc.date).substring(0, 4) : ""),
            date: doc.date || (doc.year ? String(doc.year) : ""),
            downloads: doc.downloads || 0,
            collection: col,
            coverUrl: `https://archive.org/services/img/${id}`,
            description: typeof doc.description === "string" ? doc.description.replace(/<[^>]*>?/gm, "").substring(0, 200) : "",
          };
        });
      }
    } catch (arcErr) {
      archiveDegraded = true;
      console.warn("Archive.org artist query warning:", arcErr);
    }

    // Process release groups from MusicBrainz
    const officialAlbums: any[] = [];
    const singlesAndEPs: any[] = [];
    const officialLiveReleases: any[] = [];

    for (const rg of releaseGroups) {
      const pType = rg["primary-type"] || "Album";
      const sTypes: string[] = rg["secondary-types"] || [];
      const isLive = sTypes.includes("Live") || pType === "Broadcast";
      const title = rg.title || "Untitled";
      const year = rg["first-release-date"] ? String(rg["first-release-date"]).substring(0, 4) : "";
      
      const item = {
        id: rg.id,
        title,
        primaryType: pType,
        secondaryTypes: sTypes,
        firstReleaseDate: rg["first-release-date"] || "",
        year,
        // Cover Art Archive thumbnail
        coverUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
      };

      if (isLive) {
        officialLiveReleases.push(item);
      } else if (pType === "Album") {
        officialAlbums.push(item);
      } else if (pType === "EP" || pType === "Single") {
        singlesAndEPs.push(item);
      } else {
        singlesAndEPs.push(item);
      }
    }

    officialAlbums.sort((a, b) => (b.firstReleaseDate || "").localeCompare(a.firstReleaseDate || ""));
    singlesAndEPs.sort((a, b) => (b.firstReleaseDate || "").localeCompare(a.firstReleaseDate || ""));
    officialLiveReleases.sort((a, b) => (b.firstReleaseDate || "").localeCompare(a.firstReleaseDate || ""));

    const countryNames: Record<string, string> = {
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

    const formattedArtist = mbArtist ? {
      id: mbArtist.id,
      name: mbArtist.name || artistName,
      country: countryNames[mbArtist.country] || mbArtist.country || (mbArtist.area ? mbArtist.area.name : undefined),
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
      name: artistName,
      type: "Artist",
    };

    return res.json({
      artist: formattedArtist,
      officialAlbums,
      singlesAndEPs,
      officialLiveReleases,
      liveTapes,
      totalLiveTapes,
      partial: mbDegraded || archiveDegraded,
      warnings: [
        ...(mbDegraded ? ["MusicBrainz unavailable — official releases may be incomplete"] : []),
        ...(archiveDegraded ? ["Archive.org unavailable — live tapes may be incomplete"] : []),
      ],
    });
  } catch (err: any) {
    console.error("Error fetching artist discography:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch artist discography" });
  }
});

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

// Fetch detailed metadata and playable audio tracks for an Archive.org item
app.get("/api/archive/album/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required" });
    }

    const metaUrl = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
    const response = await fetchWithTimeout(metaUrl, {
      headers: {
        "User-Agent": "ArchiveMusicVault/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to load item metadata (${response.status})`,
      });
    }

    const data = await response.json();
    const metadata = data.metadata || {};
    const files: any[] = data.files || [];

    // Filter audio files: only playable formats in web browsers
    const webAudioFiles = files.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const format = (f.format || "").toLowerCase();
      // Exclude unsupported formats like shorten (.shn), spectrograms, text, torrent
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

    // Prefer MP3 for maximum browser compatibility; if MP3 exists, use MP3 files
    const mp3Files = webAudioFiles.filter(
      (f) =>
        (f.name || "").toLowerCase().endsWith(".mp3") ||
        (f.format || "").toLowerCase().includes("mp3")
    );
    const chosenFiles = mp3Files.length > 0 ? mp3Files : webAudioFiles;

    // Deduplicate by base name so we don't have multiple bitrates of the exact same track
    const seenBaseNames = new Set<string>();
    const deduplicatedFiles: any[] = [];
    for (const f of chosenFiles) {
      const base = (f.name || "").replace(/\.[^/.]+$/, "").toLowerCase();
      if (!seenBaseNames.has(base)) {
        seenBaseNames.add(base);
        deduplicatedFiles.push(f);
      }
    }

    // Map tracks
    const tracks = deduplicatedFiles.map((f, idx) => {
      const rawTitle = f.title || f.name.replace(/\.[^/.]+$/, "").replace(/^[0-9]+[_\s.-]*/, "");
      const trackNumber = f.track ? parseInt(String(f.track).split("/")[0], 10) : idx + 1;
      const duration = parseDurationString(f.length || f.duration);

      // Clean streaming URL directly from Archive.org
      const streamUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`;

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

    // Sort tracks by trackNumber if available
    tracks.sort((a, b) => a.trackNumber - b.trackNumber);

    const creators = Array.isArray(metadata.creator)
      ? metadata.creator.join(", ")
      : metadata.creator || "Unknown Artist";
    const genres = Array.isArray(metadata.genre)
      ? metadata.genre.join(", ")
      : metadata.genre || (Array.isArray(metadata.subject) ? metadata.subject.join(", ") : metadata.subject || "");

    const album = {
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

    return res.json({ album });
  } catch (err: any) {
    console.error("Error fetching album details:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch album details" });
  }
});

// Resolve custom URL or identifier (e.g. from Archive.org or direct URL)
app.post("/api/archive/resolve-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL or identifier is required" });
    }

    const trimmed = url.trim();
    let identifier = "";

    // Check if it's an archive.org URL
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
      // Redirect internally to album details
      const metaUrl = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
      const metaRes = await fetchWithTimeout(metaUrl, {}, 8000);
      if (metaRes.ok) {
        const data = await metaRes.json();
        if (data.metadata && Object.keys(data.metadata).length > 0) {
          // Valid Archive.org item
          return res.json({ resolvedType: "archive", identifier });
        }
      }
    }

    // If it's a direct audio stream URL (.mp3, .ogg, etc.)
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return res.json({
        resolvedType: "direct_stream",
        streamUrl: trimmed,
        title: trimmed.split("/").pop() || "Direct Stream",
      });
    }

    return res.status(404).json({ error: "Could not identify or resolve Archive.org album or audio link" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to resolve URL" });
  }
});

// Discovery Engine: metadata-grounded music recommendations (no AI services)
app.post("/api/discover", async (req, res) => {
  try {
    const { history = [], library = [] } = req.body;

    // Aggregate top artists from listened tracks & library for personalization
    const artists = new Set<string>();

    // Analyze listened history
    history.slice(0, 30).forEach((item: any) => {
      if (item.artist && item.artist !== "Unknown Artist") artists.add(item.artist);
    });

    // Also include top library items
    library.slice(0, 20).forEach((album: any) => {
      if (album.artist && album.artist !== "Unknown Artist") artists.add(album.artist);
    });

    const artistList = Array.from(artists).slice(0, 15);

    // Curated house discoveries, personalized with the listener's top artists
    const recommendations = {
        listeningProfile: artistList.length > 0 
          ? `Explorer of timeless sounds featuring ${artistList.slice(0, 3).join(", ")} and exploratory archival recordings.`
          : "Fresh explorer ready to dive into millions of live tapers, netlabel experiments, and historic 78rpm sound treasures.",
        recommendedCollections: ["etree", "netlabels", "georgeblood78s", "audio_music"],
        discoveries: [
          {
            artistOrProject: artistList[0] || "Grateful Dead",
            albumOrShowTitle: "Cornell 5/8/77 Live Recording (Barton Hall)",
            archiveSearchQuery: 'creator:"Grateful Dead" AND year:1977 AND "Barton Hall"',
            reason: "One of the most legendary soundboard recordings in the Live Music Archive, praised for its crystalline sound fidelity.",
            category: "Archival Landmark",
            tags: ["Live Concert", "Psychedelic Rock", "Soundboard"],
          },
          {
            artistOrProject: "Smashing Pumpkins",
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
        ],
      };

    // Now, run parallel Archive.org queries for the recommended search queries so user gets real, instantly playable albums!
    const verifiedItems: any[] = [];
    const queriesToFetch = recommendations.discoveries.slice(0, 4);

    await Promise.allSettled(
      queriesToFetch.map(async (disc: any) => {
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

          const res = await fetchWithTimeout(sUrl.toString(), {
            headers: { "User-Agent": "ArchiveMusicVault/1.0" },
          }, 10000);

          if (res.ok) {
            const data = await res.json();
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
        } catch (searchErr) {
          // ignore individual failed query
        }
      })
    );

    return res.json({
      profile: recommendations.listeningProfile,
      recommendedCollections: recommendations.recommendedCollections,
      discoveries: recommendations.discoveries,
      liveArchivedMatches: verifiedItems,
    });
  } catch (err: any) {
    console.error("Error in discover endpoint:", err);
    return res.status(500).json({ error: err.message || "Failed to generate discoveries" });
  }
});

// Audio streaming proxy — allowlisted to archive.org hosts only (no open proxy)
const PROXY_ALLOWED_HOSTS = new Set([
  "archive.org",
  "coverartarchive.org",
  "musicbrainz.org",
]);
function isProxyHostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  if (PROXY_ALLOWED_HOSTS.has(h)) return true;
  // Archive.org download nodes: ia801xxx.us.archive.org
  return /(^|\.)us\.archive\.org$/.test(h) || /(^|\.)archive\.org$/.test(h);
}

app.get("/api/audio-proxy", async (req, res) => {
  const controller = new AbortController();
  const onClose = () => controller.abort();
  req.on("close", onClose);

  try {
    const streamUrl = String(req.query.url || "");
    let parsed: URL;
    try {
      parsed = new URL(streamUrl);
    } catch {
      return res.status(400).send("Invalid stream URL");
    }
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !isProxyHostAllowed(parsed.hostname)) {
      return res.status(403).send("Stream host not allowed");
    }

    const range = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "ArchiveMusicVault/1.0",
    };
    if (range) {
      fetchHeaders["Range"] = range;
    }

    const audioRes = await fetchWithTimeout(streamUrl, {
      headers: fetchHeaders,
      signal: controller.signal,
    }, 30000);

    res.status(audioRes.status);
    const forwardHeaders = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];
    forwardHeaders.forEach((h) => {
      const val = audioRes.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    if (audioRes.body) {
      const reader = audioRes.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done || res.writableEnded) break;
          const ok = res.write(Buffer.from(value));
          if (!ok) {
            await new Promise<void>((resolve) => res.once("drain", () => resolve()));
          }
        }
      } catch {
        // aborted or disconnected
      } finally {
        try {
          await reader.cancel();
        } catch {}
      }
      if (!res.writableEnded) res.end();
    } else {
      res.end();
    }
  } catch (err: unknown) {
    if (!res.headersSent) {
      if (err instanceof Error && err.name === "AbortError") {
        res.status(504).send("Upstream stream timed out");
      } else {
        res.status(502).send("Failed to stream audio");
      }
    }
  } finally {
    req.off("close", onClose);
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
