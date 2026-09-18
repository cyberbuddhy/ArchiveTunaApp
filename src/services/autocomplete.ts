import { AutocompleteItem, getLocalAutocompleteSuggestions } from "../data/popularArtists";
import { getCachedAutocomplete, setCachedAutocomplete } from "./artistCache";

const MB_USER_AGENT = "MusicVaultApp/1.0.0 (https://github.com/my-app/music-vault)";

/**
 * Provides autocomplete items:
 * Synchronously returns local popular hits immediately (0ms),
 * and can optionally query MusicBrainz for expanded discovery.
 */
export async function fetchAutocompleteSuggestions(
  query: string,
  limit = 6
): Promise<AutocompleteItem[]> {
  const clean = query.trim();
  if (!clean || clean.length < 1) return [];

  // Check cache first
  const cached = getCachedAutocomplete(clean);
  if (cached && cached.length > 0) {
    return cached.slice(0, limit);
  }

  // 1. Instant local suggestions
  const localHits = getLocalAutocompleteSuggestions(clean, limit);

  // If we already have strong local matches or query is short, return local immediately
  if (localHits.length >= limit || clean.length < 2) {
    setCachedAutocomplete(clean, localHits);
    return localHits;
  }

  // 2. Fetch supplemental artists from MusicBrainz in background
  try {
    const mbUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(
      clean
    )}*&fmt=json&limit=5`;
    const res = await fetch(mbUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": MB_USER_AGENT,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const mbArtists: any[] = data.artists || [];
      const remoteHits: AutocompleteItem[] = mbArtists
        .filter((a) => a.name && !localHits.some((lh) => lh.name.toLowerCase() === a.name.toLowerCase()))
        .map((a) => ({
          name: a.name,
          category: a.type === "Group" ? "Band" : "Artist",
          country: a.country || (a.area ? a.area.name : undefined),
        }));

      const merged = [...localHits, ...remoteHits].slice(0, limit);
      setCachedAutocomplete(clean, merged);
      return merged;
    }
  } catch (err) {
    console.warn("Autocomplete MusicBrainz warning:", err);
  }

  setCachedAutocomplete(clean, localHits);
  return localHits;
}

/**
 * Computes ghost completion suffix for inline Tab autocomplete:
 * e.g. query "mac" with suggestion "Mac Miller" => suffix " Miller" (or " miller")
 * e.g. query "mac d" with suggestion "Mac DeMarco" => suffix "eMarco"
 */
export function computeGhostSuffix(query: string, topSuggestionName: string): string {
  if (!query || !topSuggestionName) return "";
  const qLower = query.toLowerCase();
  const sLower = topSuggestionName.toLowerCase();

  if (sLower.startsWith(qLower) && sLower.length > qLower.length) {
    // Return remaining characters matching the capitalization of the suggestion
    return topSuggestionName.slice(query.length);
  }

  return "";
}
