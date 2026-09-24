import React, { useEffect, useState } from "react";
import {
  X,
  Disc3,
  Mic,
  Calendar,
  Globe2,
  Tag,
  Radio,
  ExternalLink,
  Play,
  BookmarkPlus,
  Check,
  Loader2,
  AlertCircle,
  Search,
  Sparkles,
  ArrowLeft,
  Music,
  Disc,
  Download,
} from "lucide-react";
import { downloadAlbumZip } from "../utils/download";
import { fetchArtistDiscography, fetchAlbumDetails, searchStreamsForRelease } from "../services/api";
import { getCachedDiscography } from "../services/artistCache";
import { ArtistDiscographyData, OfficialRelease, ArchiveLiveTape, Album } from "../types";

interface ArtistDiscographyModalProps {
  artistName: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectAlbum: (identifier: string) => void;
  onCaptureToLibrary: (album: Album) => void;
  isAlbumInLibrary: (identifier: string) => boolean;
  onSearchQuery?: (query: string, field?: string) => void;
}

type DiscographyTab = "albums" | "eps" | "singles" | "live" | "other";

export const ArtistDiscographyModal: React.FC<ArtistDiscographyModalProps> = ({
  artistName,
  isOpen,
  onClose,
  onSelectAlbum,
  onCaptureToLibrary,
  isAlbumInLibrary,
  onSearchQuery,
}) => {
  const [data, setData] = useState<ArtistDiscographyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DiscographyTab>("albums");
  const [capturingIds, setCapturingIds] = useState<Record<string, boolean>>({});

  // Stream options state when an official release is clicked
  const [selectedRelease, setSelectedRelease] = useState<OfficialRelease | null>(null);
  const [releaseStreams, setReleaseStreams] = useState<ArchiveLiveTape[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !artistName) return;

    let isMounted = true;
    setSelectedRelease(null);
    setReleaseStreams([]);

    // Check if artist discography was already loaded and cached
    const cached = getCachedDiscography(artistName);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      setError(null);
      if (cached.officialAlbums.length > 0) {
        setActiveTab("albums");
      } else if (cached.officialEPs.length > 0) {
        setActiveTab("eps");
      } else if (cached.officialSingles.length > 0) {
        setActiveTab("singles");
      } else if (cached.liveTapes.length > 0) {
        setActiveTab("live");
      } else {
        setActiveTab("albums");
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchArtistDiscography(artistName)
      .then((discography) => {
        if (isMounted) {
          setData(discography);
          // Set initial tab based on available releases
          if (discography.officialAlbums.length > 0) {
            setActiveTab("albums");
          } else if (discography.officialEPs.length > 0) {
            setActiveTab("eps");
          } else if (discography.officialSingles.length > 0) {
            setActiveTab("singles");
          } else if (discography.liveTapes.length > 0) {
            setActiveTab("live");
          } else {
            setActiveTab("albums");
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load artist discography");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, artistName]);

  if (!isOpen) return null;

  const handleCaptureLiveTape = async (tape: ArchiveLiveTape, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAlbumInLibrary(tape.identifier) || capturingIds[tape.identifier]) return;

    setCapturingIds((prev) => ({ ...prev, [tape.identifier]: true }));
    try {
      const detailed = await fetchAlbumDetails(tape.identifier);
      onCaptureToLibrary(detailed);
    } catch (err) {
      console.error("Failed to capture live tape:", err);
    } finally {
      setCapturingIds((prev) => ({ ...prev, [tape.identifier]: false }));
    }
  };

  const handleSearchAlbumOnArchive = (album: OfficialRelease) => {
    if (onSearchQuery) {
      onSearchQuery(`"${album.title}"`, "title");
      onClose();
    }
  };

  // Open stream options panel when an official album / EP / single is clicked
  const handleOpenReleaseStreams = async (release: OfficialRelease) => {
    setSelectedRelease(release);
    setIsLoadingStreams(true);
    setReleaseStreams([]);

    try {
      const currentArtist = data?.artist?.name || artistName;
      const streams = await searchStreamsForRelease(currentArtist, release.title);
      setReleaseStreams(streams);
    } catch (err) {
      console.warn("Failed to search streams for release:", err);
      setReleaseStreams([]);
    } finally {
      setIsLoadingStreams(false);
    }
  };

  const currentTabReleases: OfficialRelease[] = (() => {
    if (!data) return [];
    switch (activeTab) {
      case "albums":
        return data.officialAlbums;
      case "eps":
        return data.officialEPs;
      case "singles":
        return data.officialSingles;
      case "other":
        return data.officialOther || [];
      default:
        return [];
    }
  })();

  return (
    <div
      id="artist-discography-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Artist discography"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="artist-discography-modal"
        className="relative w-full max-w-5xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="shrink-0 px-6 py-4 border-b border-stone-800 flex items-start justify-between bg-stone-950/80">
          <div className="space-y-2 pr-4 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {data?.artist?.country && (
                <button
                  type="button"
                  onClick={() => {
                    if (onSearchQuery && data?.artist?.country) {
                      onSearchQuery(data.artist.country, "all");
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-800 hover:bg-stone-700/80 text-stone-300 hover:text-amber-300 border border-stone-700/60 hover:border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title={`Search ArchiveTuna for artists & albums from ${data.artist.country}`}
                >
                  <Globe2 className="w-3 h-3 text-amber-400/80" />
                  <span>{data.artist.country}</span>
                </button>
              )}
              {data?.artist?.type && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-800/80 text-stone-400 border border-stone-800 shrink-0">
                  {data.artist.type}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3 truncate">
              {data?.artist?.name || artistName}
            </h1>

            {data?.artist?.disambiguation && (
              <p className="text-xs text-stone-400 italic line-clamp-1">{data.artist.disambiguation}</p>
            )}

            {/* Clickable Genre Tags */}
            {data?.artist?.tags && data.artist.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 max-h-20 overflow-y-auto pr-1">
                {data.artist.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (onSearchQuery) {
                        onSearchQuery(tag, "all");
                      }
                    }}
                    className="text-[10px] px-2.5 py-0.5 rounded-md bg-stone-800/80 hover:bg-amber-500/20 text-stone-300 hover:text-amber-300 border border-stone-700/60 hover:border-amber-500/40 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    title={`Search recordings with genre "${tag}"`}
                  >
                    <Tag className="w-2.5 h-2.5 text-amber-400/70" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <a
              id="artist-wikipedia-modal-link"
              href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(data?.artist?.name || artistName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-2 text-stone-300 hover:text-amber-300 bg-stone-850 hover:bg-stone-800 rounded-xl transition-all border border-stone-700/60 hover:border-amber-500/40 flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-sm"
              title={`View ${data?.artist?.name || artistName} on Wikipedia`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Wikipedia</span>
            </a>

            <button
              id="close-discography-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS (Studio Albums, EPs, Singles, Live Tapes, Other) */}
        {!selectedRelease && (
          <div className="shrink-0 px-6 py-2.5 border-b border-stone-800 bg-stone-900/95 flex items-center justify-between gap-3 overflow-x-auto scrollbar-thin">
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
              <button
                id="discography-tab-albums"
                onClick={() => setActiveTab("albums")}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  activeTab === "albums"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                }`}
              >
                <Disc3 className="w-4 h-4 text-amber-400" />
                <span>Studio Albums</span>
                {data && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-300 font-mono">
                    {data.officialAlbums.length}
                  </span>
                )}
              </button>

              <button
                id="discography-tab-eps"
                onClick={() => setActiveTab("eps")}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  activeTab === "eps"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                }`}
              >
                <Disc className="w-4 h-4 text-amber-400" />
                <span>EPs</span>
                {data && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-300 font-mono">
                    {data.officialEPs.length}
                  </span>
                )}
              </button>

              <button
                id="discography-tab-singles"
                onClick={() => setActiveTab("singles")}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  activeTab === "singles"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                }`}
              >
                <Music className="w-4 h-4 text-amber-400" />
                <span>Singles</span>
                {data && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-300 font-mono">
                    {data.officialSingles.length}
                  </span>
                )}
              </button>

              <button
                id="discography-tab-live"
                onClick={() => setActiveTab("live")}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  activeTab === "live"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                }`}
              >
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Live Tapes & Concerts</span>
                {data && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                    {data.totalLiveTapes || data.liveTapes.length}
                  </span>
                )}
              </button>

              {data?.officialOther && data.officialOther.length > 0 && (
                <button
                  id="discography-tab-other"
                  onClick={() => setActiveTab("other")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                    activeTab === "other"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 text-stone-400" />
                  <span>Compilations</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-300 font-mono">
                    {data.officialOther.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm">
                Retrieving official discography from MusicBrainz and searching Archive.org streams...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-950/20 border border-red-900/40 rounded-xl text-center space-y-2">
              <AlertCircle className="w-7 h-7 text-red-400 mx-auto" />
              <p className="text-sm font-medium text-red-200">{error}</p>
              <p className="text-xs text-stone-400">
                You can still search directly in the main search bar with the Artist filter enabled.
              </p>
            </div>
          ) : selectedRelease ? (
            /* =================== SECTION: STREAM OPTIONS FOR SELECTED RELEASE =================== */
            <div className="space-y-6 animate-fade-in">
              {/* Back to list button */}
              <button
                onClick={() => setSelectedRelease(null)}
                className="px-3 py-1.5 bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs font-medium border border-stone-700/60 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Back to {data?.artist?.name || artistName} Discography</span>
              </button>

              {/* Archive.org Stream Options Results */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-stone-200 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    Archive.org Stream Versions
                  </h3>
                  {releaseStreams.length > 0 && (
                    <span className="text-[11px] text-stone-500 font-mono">
                      {releaseStreams.length} stream{releaseStreams.length === 1 ? "" : "s"} found
                    </span>
                  )}
                </div>

                {isLoadingStreams ? (
                  <div className="py-14 flex flex-col items-center justify-center text-stone-400 space-y-3">
                    <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                    <p className="text-xs">
                      Searching Archive.org audio collections for "{selectedRelease.title}" streams...
                    </p>
                  </div>
                ) : releaseStreams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {releaseStreams.map((stream) => {
                      const isInLib = isAlbumInLibrary(stream.identifier);
                      const isCapturing = capturingIds[stream.identifier];

                      return (
                        <div
                          key={stream.identifier}
                          className="group bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/40 rounded-xl p-3.5 flex items-start space-x-3.5 transition-all shadow-sm"
                        >
                          <div
                            className="w-14 h-14 rounded-lg overflow-hidden bg-stone-800 border border-stone-800 shrink-0 relative cursor-pointer group-hover:border-amber-400/40 transition-colors"
                            onClick={() => {
                              onSelectAlbum(stream.identifier);
                              onClose();
                            }}
                          >
                            <img
                              src={stream.coverUrl}
                              alt={stream.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80";
                              }}
                            />
                            <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="w-5 h-5 text-amber-400 fill-amber-400" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <h4
                              onClick={() => {
                                onSelectAlbum(stream.identifier);
                                onClose();
                              }}
                              className="text-xs font-semibold text-stone-100 group-hover:text-amber-400 line-clamp-1 cursor-pointer transition-colors"
                              title={stream.title}
                            >
                              {stream.title}
                            </h4>

                            <div className="flex items-center gap-2 text-[11px] text-stone-500">
                              {stream.year && <span>{stream.year}</span>}
                              <span>•</span>
                              <span className="capitalize text-stone-400">
                                {stream.collection}
                              </span>
                              {stream.downloads !== undefined && (
                                <>
                                  <span>•</span>
                                  <span>{stream.downloads.toLocaleString()} listens</span>
                                </>
                              )}
                            </div>

                            <div className="pt-2 flex items-center gap-2">
                              <button
                                onClick={() => {
                                  onSelectAlbum(stream.identifier);
                                  onClose();
                                }}
                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-amber-300" />
                                <span>Play Stream</span>
                              </button>

                              <button
                                onClick={(e) => handleCaptureLiveTape(stream, e)}
                                disabled={isInLib || isCapturing}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                                  isInLib
                                    ? "bg-stone-800 text-amber-400 border-stone-700 cursor-default"
                                    : "bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700 hover:border-stone-600 cursor-pointer"
                                }`}
                              >
                                {isCapturing ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Saving...</span>
                                  </>
                                ) : isInLib ? (
                                  <>
                                    <Check className="w-3 h-3 text-amber-400" />
                                    <span>In Vault</span>
                                  </>
                                ) : (
                                  <>
                                    <BookmarkPlus className="w-3 h-3" />
                                    <span>Capture to Vault</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => downloadAlbumZip(stream.identifier, stream.title, e)}
                              className="p-1.5 rounded-full text-stone-500 hover:text-amber-400 hover:bg-white/10 transition-colors ml-auto cursor-pointer"
                                title="Download recording (ZIP)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={`https://archive.org/details/${stream.identifier}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-full text-stone-500 hover:text-stone-300 hover:bg-white/10 transition-colors ml-auto"
                                title="Open on Archive.org"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* =================== NO AVAILABLE STREAMS NOTIFICATION =================== */
                  <div className="py-10 px-6 bg-stone-950/60 border border-amber-500/20 rounded-2xl text-center space-y-3.5 shadow-inner">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                      <Disc3 className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-stone-200">
                        No available streams on Archive.org for "{selectedRelease.title}"
                      </h4>
                      <p className="text-xs text-stone-400 max-w-lg mx-auto leading-relaxed">
                        Commercial studio releases are typically protected by copyright and not hosted on public
                        internet repositories. You can explore live concert tapes, bootlegs, and tour tapers by{" "}
                        <span className="text-stone-200 font-medium">{data?.artist?.name || artistName}</span> on
                        Archive.org.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        onClick={() => {
                          setSelectedRelease(null);
                          setActiveTab("live");
                        }}
                        className="h-9 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-full transition-colors shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Explore Live Concert Tapes & Bootlegs</span>
                      </button>

                      <button
                        onClick={() => handleSearchAlbumOnArchive(selectedRelease)}
                        className="h-9 px-3.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Search All Archive Audio</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "live" ? (
            /* =================== SECTION: LIVE TAPES ON ARCHIVE.ORG =================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-stone-200 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    Live Concert Tapes & Audio Bootlegs ({data?.totalLiveTapes || data?.liveTapes.length || 0})
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Recorded live performances and soundboards preserved on the Internet Archive & Etree.
                  </p>
                </div>
              </div>

              {data?.liveTapes && data.liveTapes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.liveTapes.map((tape) => {
                    const isInLib = isAlbumInLibrary(tape.identifier);
                    const isCapturing = capturingIds[tape.identifier];

                    return (
                      <div
                        key={tape.identifier}
                        className="group bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/40 rounded-xl p-3.5 flex items-start space-x-3.5 transition-all shadow-sm"
                      >
                        {/* Artwork / Icon */}
                        <div
                          className="w-16 h-16 rounded-xl overflow-hidden bg-stone-800 border border-stone-800 shrink-0 relative cursor-pointer group-hover:border-amber-400/40 transition-colors"
                          onClick={() => {
                            onSelectAlbum(tape.identifier);
                            onClose();
                          }}
                        >
                          <img
                            src={tape.coverUrl}
                            alt={tape.title}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80";
                            }}
                          />
                        </div>

                        {/* Tape Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              onClick={() => {
                                onSelectAlbum(tape.identifier);
                                onClose();
                              }}
                              className="text-xs font-semibold text-stone-100 group-hover:text-amber-400 line-clamp-1 cursor-pointer transition-colors"
                              title={tape.title}
                            >
                              {tape.title}
                            </h4>
                            {tape.year && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 shrink-0">
                                {tape.year}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-stone-400 line-clamp-1">
                            {tape.description || `${tape.artist} recorded live`}
                          </p>

                          <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-500">
                            {tape.downloads !== undefined && (
                              <span>{tape.downloads.toLocaleString()} downloads</span>
                            )}
                            <span className="capitalize text-stone-400">{tape.collection}</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 flex items-center gap-2">
                            <button
                              id={`play-tape-${tape.identifier}`}
                              onClick={() => {
                                onSelectAlbum(tape.identifier);
                                onClose();
                              }}
                              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-amber-300" />
                              <span>Listen Show</span>
                            </button>

                            <button
                              id={`vault-tape-${tape.identifier}`}
                              onClick={(e) => handleCaptureLiveTape(tape, e)}
                              disabled={isInLib || isCapturing}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                                isInLib
                                  ? "bg-stone-800 text-amber-400 border-stone-700 cursor-default"
                                  : "bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700 hover:border-stone-600 cursor-pointer"
                              }`}
                            >
                              {isCapturing ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : isInLib ? (
                                <>
                                  <Check className="w-3 h-3 text-amber-400" />
                                  <span>In Vault</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3 h-3" />
                                  <span>Capture to Vault</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => downloadAlbumZip(tape.identifier, tape.title, e)}
                              className="p-1.5 rounded-full text-stone-500 hover:text-amber-400 hover:bg-white/10 transition-colors ml-auto cursor-pointer"
                              title="Download concert (ZIP)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={`https://archive.org/details/${tape.identifier}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-full text-stone-500 hover:text-stone-300 hover:bg-white/10 transition-colors ml-auto"
                              title="Open on Archive.org"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-3 rounded-2xl bg-stone-900/30 border border-stone-800 p-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                    <Disc3 className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-200">No live tapes yet</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                    No live tapes cataloged on Archive.org for {data?.artist?.name || artistName}.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* =================== SECTION: OFFICIAL RELEASES GRID (ALBUMS, EPS, SINGLES) =================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <h3 className="text-xs sm:text-sm font-semibold text-stone-200 flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-amber-400" />
                  {activeTab === "albums" && `Studio Albums (${currentTabReleases.length})`}
                  {activeTab === "eps" && `EPs & Extended Plays (${currentTabReleases.length})`}
                  {activeTab === "singles" && `Official Singles (${currentTabReleases.length})`}
                  {activeTab === "other" && `Compilations & Other Releases (${currentTabReleases.length})`}
                </h3>
              </div>

              {currentTabReleases.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {currentTabReleases.map((release) => (
                    <div
                      key={release.id}
                      onClick={() => handleOpenReleaseStreams(release)}
                      className="group bg-stone-900/50 hover:bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg cursor-pointer"
                    >
                      <div>
                        {/* Cover image */}
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-950 border border-stone-800 mb-2.5 shadow-inner flex items-center justify-center">
                          {release.coverUrl ? (
                            <img
                            src={release.coverUrl}
                            alt={release.title}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                                const fallback = (e.target as HTMLElement).nextElementSibling;
                                if (fallback) (fallback as HTMLElement).classList.remove("hidden");
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full items-center justify-center bg-stone-850 ${
                              release.coverUrl ? "hidden" : "flex"
                            }`}
                          >
                            <Disc3 className="w-10 h-10 text-stone-600 group-hover:text-amber-400 transition-colors" />
                          </div>
                        </div>

                        {/* Title & Metadata */}
                        <div className="space-y-0.5">
                          <h4
                            className="text-xs font-semibold text-stone-100 group-hover:text-amber-400 line-clamp-1 transition-colors"
                            title={release.title}
                          >
                            {release.title}
                          </h4>
                          {release.year && (
                            <p className="text-[11px] text-stone-400 font-mono">
                              {release.year}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center rounded-2xl bg-stone-900/30 border border-stone-800 p-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                    <Disc3 className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-200">Nothing here yet</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                    No {activeTab} found in the MusicBrainz catalog for {data?.artist?.name || artistName}.
                    Try switching to the Live Tapes tab to explore concert recordings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
