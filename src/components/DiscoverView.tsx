import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  Play,
  Plus,
  Check,
  Disc3,
  Loader2,
  Sparkles,
  Music,
  ExternalLink,
  Volume2,
  SlidersHorizontal,
  RotateCcw,
  Download,
  X,
  Search,
  Layers,
} from "lucide-react";
import { downloadAlbumZip } from "../utils/download";
import { GENRE_HIERARCHY, GenreNode } from "../data/genreHierarchy";
import { Album, SearchCollectionType, SearchEraType } from "../types";
import { searchArchive, fetchAlbumDetails } from "../services/api";
import { usePlayer } from "../context/PlayerContext";

interface DiscoverViewProps {
  onCaptureAlbum: (album: Album) => void;
  onSelectAlbumForDetail: (album: Album) => void;
  existingAlbumIds: Set<string>;
  onOpenArtistDiscography?: (artistName: string) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  onCaptureAlbum,
  onSelectAlbumForDetail,
  existingAlbumIds,
  onOpenArtistDiscography,
}) => {
  const { playAlbum, currentTrack, isPlaying } = usePlayer();

  // Hierarchy drill-down path: [Rock] -> [Psychedelic Rock] -> [Neo-Psychedelia]
  const [genrePath, setGenrePath] = useState<GenreNode[]>([]);
  // Drill-down path inside the explorer (e.g. Rock -> Psychedelic Rock)
  const [dropdownPath, setDropdownPath] = useState<GenreNode[]>([]);
  const [genreSearch, setGenreSearch] = useState("");

  // Current node inside dropdown explorer
  const currentDropdownNode: GenreNode | null =
    dropdownPath.length > 0 ? dropdownPath[dropdownPath.length - 1] : null;

  // Filter & Sort state
  const [collection, setCollection] = useState<SearchCollectionType>("all");
  const [era, setEra] = useState<SearchEraType>("all");
  const [sort, setSort] = useState<string>("downloads desc");
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(true);

  // Discover recordings state
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("Featured Archival Classics");
  const [capturingId, setCapturingId] = useState<string | null>(null);

  // Pagination
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Determine current node in hierarchy
  const currentNode: GenreNode | null =
    genrePath.length > 0 ? genrePath[genrePath.length - 1] : null;

  // Flattened catalogue for searching all genres & subgenres
  interface FlattenedGenreItem {
    node: GenreNode;
    path: GenreNode[];
    breadcrumbLabel: string;
  }

  const allFlattenedGenres: FlattenedGenreItem[] = useMemo(() => {
    const results: FlattenedGenreItem[] = [];
    const traverse = (node: GenreNode, currentPath: GenreNode[]) => {
      const newPath = [...currentPath, node];
      results.push({
        node,
        path: newPath,
        breadcrumbLabel: newPath.map((n) => n.name).join(" → "),
      });
      if (node.subgenres) {
        node.subgenres.forEach((sub) => traverse(sub, newPath));
      }
    };
    GENRE_HIERARCHY.forEach((root) => traverse(root, []));
    return results;
  }, []);

  // Filtered search results for dropdown search input
  const searchResults: FlattenedGenreItem[] = useMemo(() => {
    if (!genreSearch.trim()) return [];
    const q = genreSearch.toLowerCase();
    return allFlattenedGenres.filter(
      (item) =>
        item.node.name.toLowerCase().includes(q) ||
        (item.node.description || "").toLowerCase().includes(q) ||
        item.breadcrumbLabel.toLowerCase().includes(q)
    );
  }, [allFlattenedGenres, genreSearch]);

  // Sibling genres if at leaf node
  const parentNode: GenreNode | null =
    genrePath.length > 1 ? genrePath[genrePath.length - 2] : null;
  const siblingSubgenres: GenreNode[] = parentNode
    ? (parentNode.subgenres || []).filter((s) => s.id !== currentNode?.id)
    : [];

  // Automatically deployed subgenres for selected genre
  const deployedSubgenres: GenreNode[] = useMemo(() => {
    if (!currentNode) return [];
    if (currentNode.subgenres && currentNode.subgenres.length > 0) {
      return currentNode.subgenres;
    }
    if (parentNode && parentNode.subgenres && parentNode.subgenres.length > 0) {
      return parentNode.subgenres;
    }
    return [];
  }, [currentNode, parentNode]);

  const deployedSectionTitle = useMemo(() => {
    if (!currentNode) return "";
    if (currentNode.subgenres && currentNode.subgenres.length > 0) {
      return `Subgenres of ${currentNode.name}`;
    }
    if (parentNode) {
      return `Subgenres of ${parentNode.name} • Active: ${currentNode.name}`;
    }
    return `Subgenres of ${currentNode.name}`;
  }, [currentNode, parentNode]);

  const secondaryFiltersCount =
    (collection !== "all" ? 1 : 0) +
    (era !== "all" ? 1 : 0) +
    (sort !== "downloads desc" ? 1 : 0);

  const loadRecordings = async (
    queryStr: string,
    title: string,
    opts?: { collection?: SearchCollectionType; era?: SearchEraType; sort?: string }
  ) => {
    const activeCollection = opts?.collection !== undefined ? opts.collection : collection;
    const activeEra = opts?.era !== undefined ? opts.era : era;
    const activeSort = opts?.sort !== undefined ? opts.sort : sort;

    setCurrentQuery(queryStr);
    setCurrentPage(1);
    setIsLoading(true);
    setSectionTitle(title);
    try {
      const data = await searchArchive({
        query: queryStr,
        collection: activeCollection,
        era: activeEra,
        sort: activeSort,
        rows: 24,
        page: 1,
      });
      setRecordings(data.items || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      console.error("Failed to load recordings:", err);
      setRecordings([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFullPath = (path: GenreNode[]) => {
    if (path.length === 0) return;
    setGenrePath(path);
    setGenreSearch("");
    const targetNode = path[path.length - 1];
    const fullPathLabel = `Featured Archival Classics • ${path.map((n) => n.name).join(" → ")}`;
    loadRecordings(targetNode.query, fullPathLabel);
  };

  const handleSelectPrimaryGenre = (genre: GenreNode) => {
    handleSelectFullPath([genre]);
  };

  const handleSelectDropdownItem = (item: { node: GenreNode; path: GenreNode[] }) => {
    handleSelectFullPath(item.path);
  };

  const handleSelectSubgenre = (node: GenreNode) => {
    const newPath = [...genrePath, node];
    handleSelectFullPath(newPath);
  };

  const handleJumpToBreadcrumb = (index: number) => {
    if (index < 0) {
      // Jump to root — back to featured classics, the tab is never empty
      setGenrePath([]);
      setGenreSearch("");
      setDropdownPath([]);
      loadRecordings("", "Featured Archival Classics");
    } else {
      const newPath = genrePath.slice(0, index + 1);
      handleSelectFullPath(newPath);
    }
  };

  const handleSwitchSibling = (sibling: GenreNode) => {
    const newPath = [...genrePath.slice(0, genrePath.length - 1), sibling];
    handleSelectFullPath(newPath);
  };

  const handleExtendRecordings = async () => {
    if (!currentQuery || isLoadingMore || isLoading) return;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    try {
      const data = await searchArchive({
        query: currentQuery,
        collection,
        era,
        sort,
        rows: 24,
        page: nextPage,
      });
      const newItems = data.items || [];
      setRecordings((prev) => {
        const existingIds = new Set(prev.map((item) => item.identifier));
        const filteredNew = newItems.filter(
          (item: any) => !existingIds.has(item.identifier)
        );
        return [...prev, ...filteredNew];
      });
      setCurrentPage(nextPage);
    } catch (err) {
      console.error("Failed to load more recordings:", err);
    } finally {
      setIsLoadingMore(false);
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

  // Featured classics on mount — the genre list is always visible, never empty
  useEffect(() => {
    loadRecordings("", "Featured Archival Classics");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5 pb-12">
      {/* Genre list — always visible, no title, no dropdown */}
      <div
        id="genre-list"
        className="p-4 bg-stone-900/90 border border-stone-800 rounded-2xl shadow-sm space-y-3.5"
      >
            {/* Top Toolbar: Navigation / Breadcrumbs & Quick Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800 pb-3">
              <div className="flex items-center flex-wrap gap-2 text-xs">
                {genreSearch.trim() ? (
                  <>
                    <span className="font-semibold text-stone-200">Search Results</span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      ({searchResults.length})
                    </span>
                  </>
                ) : dropdownPath.length > 0 ? (
                  <div className="flex items-center flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDropdownPath((prev) => prev.slice(0, -1))}
                      className="px-2 py-1 bg-stone-850 hover:bg-stone-800 text-stone-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Navigate up one level"
                    >
                      <span>← Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDropdownPath([])}
                      className="px-2 py-1 text-stone-400 hover:text-stone-200 text-xs transition-colors cursor-pointer"
                    >
                      All Genres
                    </button>

                    {dropdownPath.map((node, idx) => {
                      const isLast = idx === dropdownPath.length - 1;
                      return (
                        <React.Fragment key={`drop_crumb_${node.id}`}>
                          <ChevronRight className="w-3 h-3 text-stone-600" />
                          <button
                            type="button"
                            onClick={() => setDropdownPath(dropdownPath.slice(0, idx + 1))}
                            className={`px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                              isLast
                                ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                                : "text-stone-300 hover:text-white"
                            }`}
                          >
                            {node.name}
                          </button>
                        </React.Fragment>
                      );
                    })}

                    {currentDropdownNode && (
                      <button
                        type="button"
                        onClick={() => handleSelectFullPath(dropdownPath)}
                        className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Listen to all {currentDropdownNode.name}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Fast genre search input */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={genreSearch}
                  onChange={(e) => setGenreSearch(e.target.value)}
                  placeholder="Search any genre or subgenre..."
                  className="w-full pl-8 pr-7 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                />
                {genreSearch && (
                  <button
                    type="button"
                    onClick={() => setGenreSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Genres in Dropdown */}
            {genreSearch.trim() ? (
              searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                  {searchResults.map((item) => (
                    <div
                      key={item.node.id}
                      onClick={() => handleSelectDropdownItem(item)}
                      className="group p-2.5 rounded-xl border border-stone-800 hover:border-amber-500/50 bg-stone-950/70 hover:bg-stone-850 text-stone-200 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold text-stone-100 group-hover:text-amber-300 transition-colors">
                          {item.node.name}
                        </span>
                        <a
                          href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
                            item.node.name + " music"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-stone-500 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors shrink-0"
                          title={`View ${item.node.name} on Wikipedia`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <span className="text-[10px] text-amber-400/80 truncate mt-1 font-mono">
                        {item.breadcrumbLabel}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-stone-500 text-xs">
                  No genres matching "{genreSearch}"
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                {(currentDropdownNode ? currentDropdownNode.subgenres || [] : GENRE_HIERARCHY).map((item) => {
                  const itemPath = [...dropdownPath, item];
                  const isCurrent =
                    genrePath.length > 0 &&
                    genrePath[genrePath.length - 1]?.id === item.id;
                  const subgenreCount = item.subgenres?.length || 0;

                  return (
                    <div
                      key={item.id}
                      id={`genre-card-${item.id}`}
                      className={`group p-2.5 rounded-xl border transition-all hover:scale-[1.01] flex flex-col justify-between ${
                        isCurrent
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold"
                          : "bg-stone-950/70 hover:bg-stone-850 border-stone-800 hover:border-amber-500/40 text-stone-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              subgenreCount > 0
                                ? setDropdownPath(itemPath)
                                : handleSelectFullPath(itemPath)
                            }
                            className="text-xs font-bold text-left group-hover:text-amber-300 transition-colors truncate cursor-pointer flex-1"
                            title={
                              subgenreCount > 0
                                ? `Open ${subgenreCount} subgenres`
                                : `Play ${item.name} classics`
                            }
                          >
                            {item.name}
                          </button>

                          <a
                            href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
                              item.name + " music"
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-stone-500 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors shrink-0"
                            title={
                              item.description
                                ? `${item.description} — View on Wikipedia`
                                : `View ${item.name} on Wikipedia`
                            }
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

      {/* Recordings — always rendered; featured classics load on mount */}
          {/* ========================================================================= */}
          {/* 1.25. DEDICATED INTERACTIVE HIERARCHICAL BREADCRUMB TRAIL */}
          {/* Enables clicking and navigating: All Genres -> Rock -> Psychedelic Rock -> Neo-Psychedelia */}
          {/* ========================================================================= */}
          <nav
            id="genre-breadcrumb-trail"
            aria-label="Genre Breadcrumb Trail"
            className="bg-stone-900/95 border border-stone-800 p-2.5 sm:p-3 rounded-2xl flex items-center flex-wrap gap-1.5 shadow-sm"
          >
            <div className="flex items-center space-x-1.5 mr-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider select-none">
              <span>Trail:</span>
            </div>

            {/* Root "All Genres" */}
            <button
              type="button"
              id="breadcrumb-btn-all-genres"
              onClick={() => handleJumpToBreadcrumb(-1)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Return to All Genres"
            >
              <Disc3 className="w-3.5 h-3.5 text-stone-500" />
              <span>All Genres</span>
            </button>

            {/* Breadcrumb Steps: Rock -> Psychedelic Rock -> Neo-Psychedelia */}
            {genrePath.map((node, index) => {
              const isCurrent = index === genrePath.length - 1;
              const hasSubgenres = node.subgenres && node.subgenres.length > 0;

              return (
                <React.Fragment key={`crumb_${node.id}_${index}`}>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  <button
                    type="button"
                    id={`breadcrumb-btn-${node.id}`}
                    onClick={() => handleJumpToBreadcrumb(index)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      isCurrent
                        ? "bg-amber-500 text-stone-950 shadow-sm"
                        : "text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
                    }`}
                    title={
                      isCurrent
                        ? `Currently active: ${node.name}`
                        : `Navigate back to ${node.name}`
                    }
                  >
                    <span>{node.name}</span>
                    {hasSubgenres && !isCurrent && (
                      <span className="text-[10px] opacity-75 font-mono">
                        ({node.subgenres?.length})
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}

            {/* Clear All Breadcrumbs Button */}
            <button
              type="button"
              id="breadcrumb-btn-clear-trail"
              onClick={() => handleJumpToBreadcrumb(-1)}
              className="ml-auto px-2 py-1 text-xs text-stone-500 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
              title="Clear genre path"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[11px]">Clear</span>
            </button>
          </nav>

          {/* ========================================================================= */}
          {/* 1.5. AUTOMATICALLY DEPLOYED SUBGENRES BAR (Shows subgenres when genre is selected) */}
          {/* ========================================================================= */}
          {deployedSubgenres.length > 0 && (
            <div
              id="discover-deployed-subgenres"
              className="bg-stone-900/90 border border-stone-800 p-3 sm:p-3.5 rounded-2xl space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-stone-200">
                    {deployedSectionTitle}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    ({deployedSubgenres.length})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {genrePath.length > 1 && parentNode && (
                    <button
                      type="button"
                      onClick={() => handleJumpToBreadcrumb(genrePath.indexOf(parentNode))}
                      className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors flex items-center space-x-1 cursor-pointer font-medium"
                      title={`Go up to ${parentNode.name}`}
                    >
                      <span>↑ Back to {parentNode.name}</span>
                    </button>
                  )}

                  {genrePath.length > 2 && genrePath[0] && (
                    <button
                      type="button"
                      onClick={() => handleJumpToBreadcrumb(0)}
                      className="text-[11px] text-stone-400 hover:text-stone-200 transition-colors flex items-center space-x-1 cursor-pointer"
                      title={`Go to top level ${genrePath[0].name}`}
                    >
                      <span>(Top: {genrePath[0].name})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Subgenre Chips / Pills - scrollable & swipeable on mobile */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none select-none touch-pan-x snap-x scroll-smooth">
                {deployedSubgenres.map((sub) => {
                  const isSelected = currentNode?.id === sub.id;
                  const hasNestedSubgenres = sub.subgenres && sub.subgenres.length > 0;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      id={`deployed-subgenre-chip-${sub.id}`}
                      onClick={() => {
                        if (isSelected) return;
                        if (currentNode && currentNode.subgenres?.some((s) => s.id === sub.id)) {
                          handleSelectSubgenre(sub);
                        } else if (parentNode && parentNode.subgenres?.some((s) => s.id === sub.id)) {
                          handleSwitchSibling(sub);
                        } else {
                          handleSelectSubgenre(sub);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shrink-0 snap-start ${
                        isSelected
                          ? "bg-amber-500 text-stone-950 font-bold shadow-sm ring-1 ring-amber-400"
                          : "bg-stone-950 hover:bg-stone-850 text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-amber-500/40"
                      }`}
                      title={
                        hasNestedSubgenres
                          ? `Click to explore nested subgenres inside ${sub.name} (${sub.subgenres?.length})`
                          : `Select ${sub.name}`
                      }
                    >
                      <span>{sub.name}</span>
                      {hasNestedSubgenres && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md flex items-center space-x-0.5 ${
                            isSelected
                              ? "bg-stone-950/25 text-stone-900 font-bold"
                              : "bg-stone-800 text-stone-300 group-hover:text-amber-300"
                          }`}
                        >
                          <span>→</span>
                          <span>{sub.subgenres?.length}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* FILTER & SORT CONTROLS */}
          <div className="bg-stone-900/80 border border-stone-800 p-3 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                id="toggle-discover-filters-btn"
                type="button"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isFiltersOpen || secondaryFiltersCount > 0
                    ? "bg-stone-800 text-amber-300 border-amber-500/40"
                    : "bg-stone-950 text-stone-400 hover:text-stone-200 border-stone-800"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters & Sort</span>
                {secondaryFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-stone-950 font-bold">
                    {secondaryFiltersCount}
                  </span>
                )}
              </button>

              {secondaryFiltersCount > 0 && (
                <button
                  id="reset-discover-filters-btn"
                  type="button"
                  onClick={() => {
                    setCollection("all");
                    setEra("all");
                    setSort("downloads desc");
                    if (currentQuery) {
                      loadRecordings(currentQuery, sectionTitle, {
                        collection: "all",
                        era: "all",
                        sort: "downloads desc",
                      });
                    }
                  }}
                  className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-colors flex items-center space-x-1 text-xs cursor-pointer"
                  title="Reset filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Reset Filters</span>
                </button>
              )}
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
                    id="discover-filter-collection-select"
                    value={collection}
                    onChange={(e) => {
                      const next = e.target.value as SearchCollectionType;
                      setCollection(next);
                      if (currentQuery) {
                        loadRecordings(currentQuery, sectionTitle, { collection: next });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">All Audio Collections</option>
                    <option value="etree">Live Concerts & Tapes (Etree)</option>
                    <option value="community">Community Audio & Masters</option>
                    <option value="78rpm">Vintage 78 RPMs & Cylinders</option>
                    <option value="netlabels">Digital Netlabels & CC</option>
                  </select>
                </div>

                {/* 2. Era / Decade */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-stone-400 block">
                    Decade / Era:
                  </label>
                  <select
                    id="discover-filter-era-select"
                    value={era}
                    onChange={(e) => {
                      const next = e.target.value as SearchEraType;
                      setEra(next);
                      if (currentQuery) {
                        loadRecordings(currentQuery, sectionTitle, { era: next });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">All Time Eras</option>
                    <option value="2020s">2020s (Modern / Contemporary)</option>
                    <option value="2010s">2010s</option>
                    <option value="2000s">2000s</option>
                    <option value="1990s">1990s (90s Alt, Grunge, Rock)</option>
                    <option value="1980s">1980s</option>
                    <option value="1970s">1970s</option>
                    <option value="vintage">Historical (1900–1969)</option>
                  </select>
                </div>

                {/* 3. Sort Order */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-stone-400 block">
                    Sort Results By:
                  </label>
                  <select
                    id="discover-filter-sort-select"
                    value={sort}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSort(next);
                      if (currentQuery) {
                        loadRecordings(currentQuery, sectionTitle, { sort: next });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
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

          {/* 3. FEATURED ARCHIVAL CLASSICS & RECORDINGS */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Disc3 className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs sm:text-sm font-semibold text-stone-200">{sectionTitle}</h2>
                <span className="text-[11px] text-stone-500 font-mono">
                  ({recordings.length}
                  {totalResults > 0 ? ` of ${totalResults.toLocaleString()} available` : " found"})
                </span>
              </div>

              {isLoading && (
                <div className="flex items-center space-x-1.5 text-xs text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading recordings...</span>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="py-20 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                <p className="text-xs text-stone-400">Loading master recordings from Archive.org...</p>
              </div>
            ) : recordings.length === 0 ? (
              <div className="py-16 text-center rounded-2xl bg-stone-900/30 border border-stone-800 p-8 space-y-2">
                <Music className="w-8 h-8 text-stone-600 mx-auto" />
                <p className="text-xs text-stone-400">
                  No audio matches found for this genre selection.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {recordings.map((item) => {
                  const inVault = existingAlbumIds.has(item.identifier) || existingAlbumIds.has(item.id);
                  const isCapturing = capturingId === item.identifier;
                  const isThisPlaying = currentTrack?.albumId === item.identifier && isPlaying;

                  return (
                    <div
                      key={item.identifier}
                      id={`discover-card-${item.identifier}`}
                      onClick={() => onSelectAlbumForDetail(item)}
                      className="group bg-stone-900/40 hover:bg-stone-850/80 border border-stone-800 hover:border-stone-700 rounded-2xl p-3 transition-all hover:shadow-xl cursor-pointer"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-stone-950 border border-stone-850 relative group-hover:shadow-md mb-2.5">
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-600">
                            <Disc3 className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <h3
                        className="text-xs font-semibold text-stone-200 group-hover:text-amber-400 transition-colors line-clamp-1"
                        title={item.title}
                      >
                        {item.title}
                      </h3>

                      <p
                        className="text-[11px] text-stone-400 mt-1 truncate"
                        title={item.artist}
                      >
                        {item.artist || "Unknown Artist"}
                        {item.year ? ` • ${item.year}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More Button */}
            {!isLoading && recordings.length > 0 && recordings.length < totalResults && (
              <div className="pt-4 text-center">
                <button
                  id="extend-discover-btn"
                  type="button"
                  disabled={isLoadingMore}
                  onClick={handleExtendRecordings}
                  className="px-6 py-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/40 text-stone-200 text-xs font-semibold rounded-xl transition-all shadow-md flex items-center space-x-2 mx-auto disabled:opacity-50 cursor-pointer"
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
                        Load More Classics ({recordings.length} of {totalResults.toLocaleString()})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
    </div>
  );
};

