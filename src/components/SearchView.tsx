import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  X,
  Play,
  Check,
  Disc3,
  Loader2,
  ExternalLink,
  Volume2,
  SlidersHorizontal,
  User,
  Disc,
  Tag,
  RotateCcw,
  Globe2,
  Sparkles,
  History,
  Trash2,
  Clock,
  Download,
  Heart,
} from "lucide-react";
import { downloadAlbumZip } from "../utils/download";
import {
  Album,
  ListenHistoryItem,
  SearchFieldType,
  SearchCollectionType,
  SearchEraType,
  SearchFiltersState,
  MatchedArtist,
} from "../types";
import { searchArchive, fetchAlbumDetails, searchArtists } from "../services/api";
import { fetchAutocompleteSuggestions, computeGhostSuffix } from "../services/autocomplete";
import { AutocompleteItem, getLocalAutocompleteSuggestions, findMatchingArtistName, suggestCorrection } from "../data/popularArtists";
import {
  getStoredSearchHistory,
  addSearchHistoryItem,
  removeSearchHistoryItem,
  clearStoredSearchHistory,
  getStoredHistory,
} from "../services/storage";
import {
  getContinueAlbums,
  getListeningStats,
  timeAgo,
} from "../services/insights";
import { usePlayer } from "../context/PlayerContext";
import { ArchiveLogo } from "./ArchiveLogo";
import { TIER_CONFIG } from "../utils/tierList";

interface SearchViewProps {
  onCaptureAlbum: (album: Album) => void;
  onSelectAlbumForDetail: (album: Album) => void;
  existingAlbumIds: Set<string>;
  vaultAlbums?: Album[];
  resetKey?: number;
  onOpenArtistDiscography?: (artistName: string) => void;
  initialSearch?: { query: string; field?: string } | null;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onCaptureAlbum,
  onSelectAlbumForDetail,
  existingAlbumIds,
  vaultAlbums,
  resetKey,
  onOpenArtistDiscography,
  initialSearch,
}) => {
  const { playAlbum, playTrack, currentTrack, isPlaying } = usePlayer();

  // Home shelf: recent albums + stats, shown until the first search
  const [homeHistory, setHomeHistory] = useState<ListenHistoryItem[]>([]);
  const [openingAlbumId, setOpeningAlbumId] = useState<string | null>(null);
  useEffect(() => {
    setHomeHistory(getStoredHistory());
  }, []);
  const homeContinue = useMemo(() => getContinueAlbums(homeHistory, 8), [homeHistory]);
  const homeStats = useMemo(() => getListeningStats(homeHistory), [homeHistory]);

  const handleOpenContinueAlbum = async (albumId: string) => {
    if (openingAlbumId) return;
    setOpeningAlbumId(albumId);
    try {
      const full = await fetchAlbumDetails(albumId);
      onSelectAlbumForDetail(full);
    } catch {
      // Unresolvable album (deleted upstream?) — stay on search
    } finally {
      setOpeningAlbumId(null);
    }
  };

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tab switched here: focus search so it's ready to type (desktop pointers only)
  useEffect(() => {
    if (window.matchMedia?.("(pointer: fine)").matches) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, []);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [ghostSuffix, setGhostSuffix] = useState<string>("");
  const [topSuggestion, setTopSuggestion] = useState<AutocompleteItem | null>(null);
  const suppressSuggestionsRef = useRef<boolean>(false);

  // Search History dropdown state
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Advanced Search toggle: by default collapsed, showing only the search bar + "+" button
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Target Field: default "all"
  const [field, setField] = useState<SearchFieldType>("all");

  // Filters state - Sort defaults to "relevance"
  const [collection, setCollection] = useState<SearchCollectionType>("all");
  const [era, setEra] = useState<SearchEraType>("all");
  const [sort, setSort] = useState<string>("relevance");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Results & pagination
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capturingId, setCapturingId] = useState<string | null>(null);

  // Intelligent Spotify-like artist detection
  const [matchedArtists, setMatchedArtists] = useState<MatchedArtist[]>([]);
  const [isSearchingArtists, setIsSearchingArtists] = useState(false);

  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getStoredSearchHistory());
  }, []);

  // Active secondary filters count (excluding default field)
  const secondaryFiltersCount =
    (collection !== "all" ? 1 : 0) +
    (era !== "all" ? 1 : 0) +
    (sort !== "relevance" ? 1 : 0);

  // Close suggestions and history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Autocomplete calculation: local fast match + background remote expansion
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || suppressSuggestionsRef.current) {
      setSuggestions([]);
      setGhostSuffix("");
      setTopSuggestion(null);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    let isMounted = true;

    // Instant local suggestions from curated popular artists
    const localHits = getLocalAutocompleteSuggestions(searchQuery, 6);
    if (localHits.length > 0) {
      setSuggestions(localHits);
      if (!suppressSuggestionsRef.current) {
        setShowSuggestions(true);
      }
      const top = localHits[0];
      setTopSuggestion(top);
      const suffix = computeGhostSuffix(searchQuery, top.name);
      setGhostSuffix(suffix);
    } else {
      setGhostSuffix("");
      setTopSuggestion(null);
    }

    // Debounced remote query for artists not in the local top set
    const timer = setTimeout(async () => {
      try {
        const remoteItems = await fetchAutocompleteSuggestions(searchQuery, 6);
        if (isMounted && remoteItems.length > 0) {
          setSuggestions(remoteItems);
          const top = remoteItems[0];
          setTopSuggestion(top);
          const suffix = computeGhostSuffix(searchQuery, top.name);
          setGhostSuffix(suffix);
        }
      } catch (e) {
        // non-fatal
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Respond to initialSearch prop (e.g. from clicking genre/country in discography modal)
  useEffect(() => {
    if (initialSearch && initialSearch.query) {
      setSearchQuery(initialSearch.query);
      setActiveQuery(initialSearch.query);
      if (initialSearch.field) {
        setField(initialSearch.field as SearchFieldType);
      }
      executeSearch(initialSearch.query, {
        field: (initialSearch.field as SearchFieldType) || field,
      });
    }
  }, [initialSearch]);

  // Respond to logo / brand reset action: reset all state, input, and results
  useEffect(() => {
    if (resetKey && resetKey > 0) {
      setSearchQuery("");
      setActiveQuery("");
      setResults([]);
      setTotalResults(0);
      setHasSearched(false);
      setIsLoading(false);
      setSuggestions([]);
      setGhostSuffix("");
      setTopSuggestion(null);
      setMatchedArtists([]);
      setIsAdvancedOpen(false);
      setIsHistoryOpen(false);
      setField("all");
      setCollection("all");
      setEra("all");
      setSort("relevance");
      setCurrentSearchTerm("");
      setCurrentPage(1);
      if (inputRef.current && window.innerWidth >= 640) {
        inputRef.current.focus();
      }
    }
  }, [resetKey]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // TAB key - Accept top autocomplete suggestion or ghost suffix
    if (e.key === "Tab") {
      if (topSuggestion) {
        e.preventDefault();
        setSearchQuery(topSuggestion.name);
        setGhostSuffix("");
        setShowSuggestions(false);
        return;
      }
    }

    // ArrowRight at the end of the text input - also accepts ghost suggestion
    if (e.key === "ArrowRight") {
      const input = inputRef.current;
      if (input && input.selectionStart === searchQuery.length && topSuggestion) {
        e.preventDefault();
        setSearchQuery(topSuggestion.name);
        setGhostSuffix("");
        setShowSuggestions(false);
        return;
      }
    }

    // ArrowDown - navigate through suggestions list
    if (e.key === "ArrowDown") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setShowSuggestions(true);
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    // ArrowUp - navigate up suggestions list
    if (e.key === "ArrowUp") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setShowSuggestions(true);
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      }
      return;
    }

    // Enter key with a suggestion selected
    if (e.key === "Enter") {
      if (showSuggestions && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        e.preventDefault();
        acceptSuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
    }

    // Escape - hide suggestions, second press (or no suggestions) releases focus
    // back to global keybindings (Space/K/J/L/arrows)
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setIsHistoryOpen(false);
      inputRef.current?.blur();
      return;
    }
  };

  const acceptSuggestion = (item: AutocompleteItem) => {
    suppressSuggestionsRef.current = true;
    setSearchQuery(item.name);
    setActiveQuery(item.name);
    setShowSuggestions(false);
    setIsHistoryOpen(false);
    setGhostSuffix("");
    executeSearch(item.name);
  };

  const handleSelectHistoryItem = (term: string) => {
    suppressSuggestionsRef.current = true;
    setSearchQuery(term);
    setActiveQuery(term);
    setShowSuggestions(false);
    setIsHistoryOpen(false);
    setGhostSuffix("");
    executeSearch(term);
  };

  const handleRemoveHistoryItem = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeSearchHistoryItem(term);
    setSearchHistory(updated);
  };

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearStoredSearchHistory();
    setSearchHistory([]);
  };

  const handleCategorySearch = (categoryQuery: string, targetField: SearchFieldType = "all") => {
    const clean = categoryQuery.trim();
    if (!clean) return;
    suppressSuggestionsRef.current = true;
    setShowSuggestions(false);
    setIsHistoryOpen(false);
    setSearchQuery(clean);
    setActiveQuery(clean);
    setField(targetField);
    executeSearch(clean, { field: targetField });
  };

  // Perform search query to Archive.org and intelligent artist detection via MusicBrainz
  const executeSearch = async (
    term: string,
    overrideFilters?: Partial<SearchFiltersState>
  ) => {
    const q = term.trim();
    if (!q) return;

    // Immediately dismiss suggestions and history to keep UI clean
    suppressSuggestionsRef.current = true;
    setShowSuggestions(false);
    setIsHistoryOpen(false);
    setGhostSuffix("");

    // Persist to search history
    const updatedHistory = addSearchHistoryItem(q);
    setSearchHistory(updatedHistory);

    let activeField = overrideFilters?.field !== undefined ? overrideFilters.field : field;
    const activeCollection = overrideFilters?.collection !== undefined ? overrideFilters.collection : collection;
    const activeEra = overrideFilters?.era !== undefined ? overrideFilters.era : era;
    const activeSort = overrideFilters?.sort !== undefined ? overrideFilters.sort : sort;

    // Intelligent Query Match: If user searched with general/all field, check if query matches a known artist/band
    // e.g. "Daft Punk", "Radiohead", etc. Auto-enable the advanced "Artist / Band" search filter
    if (activeField === "all") {
      const matchedArtistName = findMatchingArtistName(q);
      if (matchedArtistName) {
        activeField = "artist";
        setField("artist");
        setIsAdvancedOpen(true);
      }
    }

    setCurrentSearchTerm(q);
    setCurrentPage(1);
    setIsLoading(true);
    setHasSearched(true);

    // Trigger intelligent artist detection concurrently (Spotify-like artist identification)
    setIsSearchingArtists(true);
    searchArtists(q)
      .then((artists) => {
        setMatchedArtists(artists);
        // If we haven't already switched to artist, and top artist from MusicBrainz is a strong match, switch to artist field
        if (artists.length > 0 && field === "all" && activeField === "all") {
          const top = artists[0].name.toLowerCase();
          const cleanQ = q.toLowerCase();
          if (top === cleanQ || top.startsWith(cleanQ)) {
            setField("artist");
            setIsAdvancedOpen(true);
          }
        }
      })
      .catch((err) => {
        console.warn("Artist search error:", err);
        setMatchedArtists([]);
      })
      .finally(() => {
        setIsSearchingArtists(false);
      });

    try {
      const data = await searchArchive({
        query: q,
        field: activeField,
        collection: activeCollection,
        era: activeEra,
        sort: activeSort,
        rows: 24,
        page: 1,
      });
      setResults(data.items || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    suppressSuggestionsRef.current = true;
    setShowSuggestions(false);
    setIsHistoryOpen(false);
    setGhostSuffix("");
    setActiveQuery(searchQuery.trim());
    executeSearch(searchQuery.trim());
  };

  const handleExtendSearch = async () => {
    if (!currentSearchTerm || isLoadingMore || isLoading) return;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    try {
      const data = await searchArchive({
        query: currentSearchTerm,
        field,
        collection,
        era,
        sort,
        rows: 24,
        page: nextPage,
      });
      const newItems = data.items || [];
      setResults((prev) => {
        const existingIds = new Set(prev.map((item) => item.identifier));
        const filteredNew = newItems.filter(
          (item: any) => !existingIds.has(item.identifier)
        );
        return [...prev, ...filteredNew];
      });
      setCurrentPage(nextPage);
    } catch (err) {
      console.error("Failed to load more results:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleFieldChange = (newField: SearchFieldType) => {
    setField(newField);
    if (searchQuery.trim()) {
      executeSearch(searchQuery.trim(), { field: newField });
    }
  };

  const handleResetFilters = () => {
    setField("all");
    setCollection("all");
    setEra("all");
    setSort("relevance");
    if (currentSearchTerm) {
      executeSearch(currentSearchTerm, {
        field: "all",
        collection: "all",
        era: "all",
        sort: "relevance",
      });
    }
  };

  const handlePlayAlbum = async (identifier: string) => {
    try {
      const fullAlbum = await fetchAlbumDetails(identifier);
      if (fullAlbum.tracks && fullAlbum.tracks.length > 0) {
        playAlbum(fullAlbum, 0);
      }
    } catch (err) {
      console.error("Playback preview failed:", err);
    }
  };

  const handleCaptureItem = async (identifier: string) => {
    setCapturingId(identifier);
    try {
      const fullAlbum = await fetchAlbumDetails(identifier);
      onCaptureAlbum(fullAlbum);
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setCapturingId(null);
    }
  };

  const handleOpenItemDetail = async (identifier: string) => {
    try {
      const existing = vaultAlbums?.find(
        (a) => a.id === identifier || a.identifier === identifier
      );
      if (existing && existing.tracks && existing.tracks.length > 0) {
        onSelectAlbumForDetail(existing);
        return;
      }
      const full = await fetchAlbumDetails(identifier);
      if (existing) {
        onSelectAlbumForDetail({
          ...full,
          ...existing,
          isFavorite: existing.isFavorite,
          tier: existing.tier,
          userRating: existing.userRating,
          userNotes: existing.userNotes || full.userNotes,
          tags: existing.tags || full.tags,
          tracks: existing.tracks && existing.tracks.length > 0 ? existing.tracks : full.tracks,
        });
      } else {
        onSelectAlbumForDetail(full);
      }
    } catch (err) {
      console.error("Failed to open album detail:", err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* SEARCH HEADER: Input Bar with Autocomplete + "+" Advanced Search Button */}
      <div className="space-y-3 pt-2">
        <div ref={searchContainerRef} className="relative">
          <form onSubmit={handleSearchSubmit} className="relative shadow-lg rounded-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 z-20">
              <Search className="w-5 h-5" />
            </div>

            {/* Ghost Text Overlay for Autocomplete Tab-completion */}
            {ghostSuffix && (
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 pl-12 pr-36 sm:pr-48 py-3.5 pointer-events-none flex items-center text-sm sm:text-base font-normal overflow-hidden whitespace-pre select-none z-10"
              >
                <span className="opacity-0">{searchQuery}</span>
                <span className="text-stone-500 font-normal">{ghostSuffix}</span>
                <span className="ml-2.5 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-800 text-amber-400 border border-stone-700 shadow-sm">
                  TAB ⇥
                </span>
              </div>
            )}

            <input
              ref={inputRef}
              id="main-music-search-input"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Search Archive.org music"
              value={searchQuery}
              onChange={(e) => {
                suppressSuggestionsRef.current = false;
                setIsHistoryOpen(false);
                setSearchQuery(e.target.value);
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={() => {
                if (!suppressSuggestionsRef.current && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={
                field === "artist"
                  ? 'Search artist/band name (e.g., "Mac Miller", "King Gizzard")...'
                  : field === "title"
                  ? 'Search album or track title (e.g., "Circles", "Aoxomoxoa")...'
                  : field === "genre"
                  ? 'Search genre or subject (e.g., "Post-Punk", "Bebop")...'
                  : "Search any artist, album, live bootleg, or genre..."
              }
              className="w-full pl-12 pr-44 sm:pr-60 py-3.5 bg-stone-900/90 hover:bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-2xl text-sm sm:text-base text-stone-100 placeholder-stone-400 focus:outline-none transition-colors shadow-inner relative z-0"
            />

            <div className="absolute right-2 top-2 bottom-2 flex items-center space-x-1.5 z-20">
              {/* Clear Button */}
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setGhostSuffix("");
                    setShowSuggestions(false);
                    setIsHistoryOpen(false);
                  }}
                  className="px-2 py-1 text-xs text-stone-400 hover:text-stone-200 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              ) : null}

              {/* History Toggle Button */}
              <button
                id="toggle-search-history-btn"
                type="button"
                onClick={() => {
                  const nextState = !isHistoryOpen;
                  setIsHistoryOpen(nextState);
                  if (nextState) {
                    suppressSuggestionsRef.current = true;
                    setShowSuggestions(false);
                    setGhostSuffix("");
                  }
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${
                  isHistoryOpen
                    ? "bg-[var(--color-accent-main)]/20 text-[var(--color-accent-light)] border-[var(--color-accent-main)]/40"
                    : "bg-stone-850/90 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border-stone-700/80"
                }`}
                title={isHistoryOpen ? "Close history" : "Search history"}
              >
                <History className="w-4 h-4 text-[var(--color-accent-main)] shrink-0" />
                <span className="hidden sm:inline">History</span>
              </button>

              {/* "+" Advanced Search Toggle Button */}
              <button
                id="toggle-advanced-search-btn"
                type="button"
                onClick={() => {
                  const nextState = !isAdvancedOpen;
                  setIsAdvancedOpen(nextState);
                  setIsHistoryOpen(false);
                  suppressSuggestionsRef.current = true;
                  setShowSuggestions(false);
                  setGhostSuffix("");
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${
                  isAdvancedOpen || field !== "all" || secondaryFiltersCount > 0
                    ? "bg-[var(--color-secondary-main)]/20 text-[var(--color-secondary-light)] border-[var(--color-secondary-main)]/40"
                    : "bg-stone-850/90 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border-stone-700/80"
                }`}
                title={isAdvancedOpen ? "Collapse advanced search" : "Advanced search & filters"}
              >
                {isAdvancedOpen ? (
                  <X className="w-4 h-4 text-[var(--color-secondary-main)] shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-[var(--color-secondary-main)] shrink-0" />
                )}
                <span className="hidden sm:inline">Advanced</span>
              </button>

              {/* Search Submit Button */}
              <button
                id="main-search-submit-btn"
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="px-4 py-1.5 bg-[var(--color-accent-main)] hover:bg-[var(--color-accent-light)] disabled:bg-stone-800 text-stone-950 disabled:text-stone-600 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                ) : (
                  <span>Search</span>
                )}
              </button>
            </div>
          </form>

          {/* Search History Dropdown */}
          {isHistoryOpen && (
            <div
              id="search-history-dropdown"
              className="absolute left-0 right-0 top-full mt-2 bg-stone-900 border border-stone-700/90 rounded-2xl shadow-2xl z-40 overflow-hidden divide-y divide-stone-800/60 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-4 py-2.5 bg-stone-950/90 flex items-center justify-between text-[11px] text-stone-400 font-medium">
                <span className="flex items-center gap-1.5 text-stone-300">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recent Searches</span>
                </span>
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="text-stone-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-stone-800"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear all</span>
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {searchHistory.length > 0 ? (
                  searchHistory.map((item) => (
                    <div
                      key={item}
                      onClick={() => handleSelectHistoryItem(item)}
                      className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-800/80 text-stone-200 group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 transition-colors shrink-0" />
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {item}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveHistoryItem(item, e)}
                        className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-stone-700/60 rounded-lg transition-colors cursor-pointer"
                        title="Remove from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-stone-500">
                    No recent searches yet. Search any artist, album, or genre.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && !isHistoryOpen && suggestions.length > 0 && (
            <div
              id="search-autocomplete-dropdown"
              className="absolute left-0 right-0 top-full mt-2 bg-stone-900 border border-stone-700/90 rounded-2xl shadow-2xl z-40 overflow-hidden divide-y divide-stone-800/60 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-4 py-2 bg-stone-950/90 flex items-center justify-between text-[11px] text-stone-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Suggestions</span>
                </span>
                <span className="text-[10px] text-stone-500 hidden sm:inline">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700 font-mono">TAB</kbd> to complete, <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700 font-mono">↵</kbd> to search
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {suggestions.map((item, idx) => {
                  const isSelected = idx === selectedSuggestionIndex;
                  return (
                    <div
                      key={`${item.name}-${idx}`}
                      onClick={() => acceptSuggestion(item)}
                      onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                      className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-500/15 text-amber-200"
                          : "hover:bg-stone-800/80 text-stone-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400 border border-stone-700/60 shrink-0">
                          {item.category === "Genre" ? (
                            <Tag className="w-3.5 h-3.5 text-amber-400/80" />
                          ) : (
                            <Disc3 className="w-3.5 h-3.5 text-amber-400/80" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-sm truncate block">
                            {item.name}
                          </span>
                          {item.country && (
                            <span className="text-[11px] text-stone-400 block truncate">
                              {item.country}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800/80 text-stone-400 border border-stone-700/60">
                          {item.category}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hidden sm:inline font-mono">
                            TAB
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* EXPANDABLE ADVANCED SEARCH SECTION: Target Pills + "Filters & Sort" */}
        {isAdvancedOpen && (
          <div className="bg-stone-900/80 border border-stone-800 p-3 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Target: All fields, Artist/Band, Album Title, Genre/Subject */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-medium text-stone-400 mr-1">
                  Target:
                </span>

                <button
                  id="filter-field-all"
                  type="button"
                  onClick={() => handleFieldChange("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    field === "all"
                      ? "bg-stone-100 text-stone-950 font-semibold shadow-xs"
                      : "bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800"
                  }`}
                >
                  All Fields
                </button>

                <button
                  id="filter-field-artist"
                  type="button"
                  onClick={() => handleFieldChange("artist")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 ${
                    field === "artist"
                      ? "bg-[var(--color-accent-main)] text-stone-950 font-semibold shadow-xs"
                      : "bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Artist / Band</span>
                </button>

                <button
                  id="filter-field-title"
                  type="button"
                  onClick={() => handleFieldChange("title")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 ${
                    field === "title"
                      ? "bg-[var(--color-secondary-main)] text-stone-950 font-semibold shadow-xs"
                      : "bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800"
                  }`}
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>Album Title</span>
                </button>

                <button
                  id="filter-field-genre"
                  type="button"
                  onClick={() => handleFieldChange("genre")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 ${
                    field === "genre"
                      ? "bg-[var(--color-accent-light)] text-stone-950 font-semibold shadow-xs"
                      : "bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Genre / Subject</span>
                </button>
              </div>

              {/* Filters & Sort Button */}
              <div className="flex items-center space-x-2">
                <button
                  id="toggle-filters-sort-btn"
                  type="button"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-all ${
                    isFiltersOpen || secondaryFiltersCount > 0
                      ? "bg-stone-850 text-[var(--color-secondary-light)] border-[var(--color-secondary-main)]/40"
                      : "bg-stone-950 text-stone-400 hover:text-stone-200 border-stone-800"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters & Sort</span>
                  {secondaryFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[var(--color-secondary-main)] text-stone-950 text-[10px] font-bold flex items-center justify-center">
                      {secondaryFiltersCount}
                    </span>
                  )}
                </button>

                {(field !== "all" || secondaryFiltersCount > 0) && (
                  <button
                    id="reset-filters-btn"
                    type="button"
                    onClick={handleResetFilters}
                    className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-colors"
                    title="Reset to default (all fields)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* COLLAPSIBLE FILTERS & SORT DRAWER */}
            {isFiltersOpen && (
              <div className="pt-3 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* 1. Collection / Format */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-stone-400 block">
                    Collection / Audio Format:
                  </label>
                  <select
                    id="filter-collection-select"
                    value={collection}
                    onChange={(e) => {
                      const next = e.target.value as SearchCollectionType;
                      setCollection(next);
                      if (searchQuery.trim()) {
                        executeSearch(searchQuery.trim(), { collection: next });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">All Audio Collections</option>
                    <option value="etree">Live Music Archive (Etree)</option>
                    <option value="georgeblood78s">The Great 78 Project (78 RPMs)</option>
                    <option value="netlabels">Netlabels (Free & CC Music)</option>
                    <option value="audio_music">Music, Arts & Culture</option>
                    <option value="opensource_audio">Community Audio Masters</option>
                    <option value="hiphopmixtapes">Hip Hop & Rap Mixtapes</option>
                    <option value="flac">Lossless FLAC Master Tapes</option>
                    <option value="vbr_mp3">VBR MP3 Recordings</option>
                  </select>
                </div>

                {/* 2. Era / Decade */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-stone-400 block">
                    Decade / Era:
                  </label>
                  <select
                    id="filter-era-select"
                    value={era}
                    onChange={(e) => {
                      const next = e.target.value as SearchEraType;
                      setEra(next);
                      if (searchQuery.trim()) {
                        executeSearch(searchQuery.trim(), { era: next });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">All Eras</option>
                    <option value="2020s">2020s</option>
                    <option value="2010s">2010s</option>
                    <option value="2000s">2000s</option>
                    <option value="1990s">1990s</option>
                    <option value="1980s">1980s</option>
                    <option value="1970s">1970s</option>
                    <option value="1960s">1960s</option>
                    <option value="1950s">1950s</option>
                    <option value="vintage">Pre-1950s</option>
                  </select>
                </div>

                {/* 3. Sort Order */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-stone-400 block">
                    Sort Results By:
                  </label>
                  <select
                    id="filter-sort-select"
                    value={sort}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSort(next);
                      if (searchQuery.trim()) {
                        executeSearch(searchQuery.trim(), { sort: next });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="downloads desc">Most Popular (Downloads)</option>
                    <option value="date desc">Date Published (Newest First)</option>
                    <option value="date asc">Date Published (Oldest First)</option>
                    <option value="publicdate desc">Recently Added to Archive</option>
                    <option value="title asc">Alphabetical (A - Z)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MINIMAL ARTIST MATCH (Name & Image only) */}
        {hasSearched && matchedArtists.length > 0 && onOpenArtistDiscography && (
          <div className="pt-1">
            <div
              id={`artist-match-${matchedArtists[0].id}`}
              onClick={() => onOpenArtistDiscography(matchedArtists[0].name)}
              className="group bg-stone-900/80 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/50 rounded-2xl p-3.5 sm:p-4 shadow-md transition-all duration-200 cursor-pointer flex items-center gap-4"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-stone-800 shrink-0 border-2 border-stone-800 group-hover:border-amber-400 transition-colors flex items-center justify-center">
                {matchedArtists[0].coverUrl ? (
                  <img
                    src={matchedArtists[0].coverUrl}
                    alt={matchedArtists[0].name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <User className="w-8 h-8 text-stone-500 group-hover:text-amber-400 transition-colors pointer-events-none" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xl sm:text-2xl font-bold text-white group-hover:text-amber-300 transition-colors tracking-tight truncate">
                  {matchedArtists[0].name}
                </h4>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HOME: continue listening + stats, only before the first search */}
      {!hasSearched && homeContinue.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-semibold text-stone-200">Continue listening</h3>
            <span className="font-mono text-[11px] text-stone-500">
              {homeStats.minutesListened >= 60
                ? `${(homeStats.minutesListened / 60).toFixed(1)}h`
                : `${homeStats.minutesListened}m`}
              {" "}· {homeStats.uniqueArtists} artists · {homeStats.totalListens} plays
              {homeStats.dayStreak > 1 && ` · ${homeStats.dayStreak}d streak`}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {homeContinue.map((c) => (
              <button
                key={c.albumId}
                type="button"
                onClick={() => handleOpenContinueAlbum(c.albumId)}
                disabled={openingAlbumId !== null}
                className="group w-28 shrink-0 text-left cursor-pointer disabled:opacity-60"
                title={`Open ${c.album}`}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-stone-900 border border-stone-800 mb-1.5">
                  <img
                    src={`https://archive.org/services/img/${c.albumId}`}
                    alt={c.album}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {openingAlbumId === c.albumId && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-stone-100 truncate group-hover:text-amber-300">
                  {c.album}
                </p>
                <p className="text-[11px] text-stone-400 truncate">{c.artist}</p>
                <p className="font-mono text-[10px] text-stone-500 truncate mt-0.5">
                  {c.plays} play{c.plays === 1 ? "" : "s"} · {timeAgo(c.listenedAt)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH RESULTS */}
      {hasSearched && (
        /* Results Grid */
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Disc3 className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-semibold text-stone-200">
                Audio Recordings for "{activeQuery || searchQuery}"
              </h2>
              <span className="text-[11px] text-stone-500 font-mono">
                ({results.length}
                {totalResults > 0 ? ` of ${totalResults.toLocaleString()} available` : " found"})
              </span>
            </div>

            {isLoading && (
              <div className="flex items-center space-x-1.5 text-xs text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching Archive.org audio...</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="py-20 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs text-stone-400">Searching master recordings from Archive.org...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center space-y-3 rounded-2xl bg-stone-900/30 border border-stone-800 p-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                <Disc3 className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-stone-200">No recordings found</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                No audio recordings found for "{activeQuery || searchQuery}" on Archive.org.
              </p>
              {(() => {
                const fix = suggestCorrection(activeQuery || searchQuery);
                return fix ? (
                  <button
                    onClick={() => {
                      suppressSuggestionsRef.current = true;
                      setSearchQuery(fix);
                      setActiveQuery(fix);
                      setShowSuggestions(false);
                      setIsHistoryOpen(false);
                      executeSearch(fix);
                    }}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors cursor-pointer"
                  >
                    Did you mean "{fix}"?
                  </button>
                ) : null;
              })()}
              {matchedArtists.length > 0 ? (
                <p className="text-[11px] text-amber-300/80">
                  However, you can explore the official discography for {matchedArtists[0].name} in the Artist section above!
                </p>
              ) : (
                <p className="text-[11px] text-stone-500">
                  Try switching the target field to "All Fields" or checking the spelling.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {results.map((item) => {
                const vaultAlbum = vaultAlbums?.find(
                  (a) => a.id === item.identifier || a.identifier === item.identifier
                );
                const inVault = existingAlbumIds.has(item.identifier) || existingAlbumIds.has(item.id) || !!vaultAlbum;
                const isFavorite = vaultAlbum?.isFavorite;
                const tier = vaultAlbum?.tier;
                const isCapturing = capturingId === item.identifier;
                const isThisPlaying = currentTrack?.albumId === item.identifier && isPlaying;

                return (
                  <div
                    key={item.identifier}
                    onClick={() => handleOpenItemDetail(item.identifier)}
                    className="group bg-stone-900/50 hover:bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-3 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    {/* Album / Item Cover Art */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-950 border border-stone-800 mb-2.5 shadow-inner">
                      <img
                        src={
                          item.coverUrl ||
                          `https://archive.org/services/img/${item.identifier}`
                        }
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80";
                        }}
                      />
                    </div>

                    {/* Title, Artist & Year — everything else lives in the detail view */}
                    <div className="space-y-0.5">
                      <h4
                        className="text-xs font-semibold text-stone-100 group-hover:text-amber-400 transition-colors line-clamp-1"
                        title={item.title}
                      >
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-stone-400 line-clamp-1">
                        {item.artist || item.creator || "Unknown Artist"}
                        {item.year ? ` • ${item.year}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Extend search results */}
          {!isLoading && results.length > 0 && results.length < totalResults && (
            <div className="pt-6 pb-2 text-center">
              <button
                id="extend-search-btn"
                type="button"
                disabled={isLoadingMore}
                onClick={handleExtendSearch}
                className="px-6 py-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/40 text-stone-200 text-xs font-semibold rounded-xl transition-all shadow-md flex items-center space-x-2 mx-auto disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Loading more recordings...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>
                      Load More Results ({results.length} of {totalResults.toLocaleString()})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
