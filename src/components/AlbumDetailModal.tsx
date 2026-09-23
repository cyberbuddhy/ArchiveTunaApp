import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Play,
  Tag,
  FileText,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  Disc3,
  Share2,
  Download,
  ListPlus,
  Layers,
  Database,
  Loader2,
  Mic,
  ListMusic,
  MoreVertical,
} from "lucide-react";
import { downloadAlbumZip, downloadTrackAudio } from "../utils/download";
import { linkForAlbum, linkForSong } from "../services/share";
import { Album, Track, Playlist, TierRank, TierList, TierItem } from "../types";
import { usePlayer } from "../context/PlayerContext";
import { TIER_RANKS, TIER_CONFIG } from "../utils/tierList";
import { offlineCache } from "../services/offlineCache";
import { formatTime, splitTitleSpec } from "../utils/format";
import { currentLyricIndex, fetchLyrics, LyricsResult } from "../services/lyrics";

interface AlbumDetailModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateAlbum: (updated: Album) => void;
  onDeleteAlbum?: (albumId: string) => void;
  playlists: Playlist[];
  onAddTrackToPlaylist: (playlistId: string, track: Track) => void;
  onCreatePlaylist?: (name: string, description?: string) => Playlist | void;
  onOpenArtistDiscography?: (artistName: string) => void;
  tierLists?: TierList[];
  onUpdateTierList?: (tierList: TierList) => void;
  onCreateTierList?: (name: string, description?: string) => TierList | void;
  vaultAction?: { label: string; onAction: () => void };
  isInVault?: boolean;
}

export const AlbumDetailModal: React.FC<AlbumDetailModalProps> = ({
  album,
  isOpen,
  onClose,
  onUpdateAlbum,
  onDeleteAlbum,
  playlists,
  onAddTrackToPlaylist,
  onCreatePlaylist,
  onOpenArtistDiscography,
  tierLists = [],
  onUpdateTierList,
  onCreateTierList,
  vaultAction,
  isInVault,
}) => {
  const { playTrack, playAlbum, addToQueue, currentTrack, currentTime, isPlaying } = usePlayer();
  const [activeTab, setActiveTab] = useState<"tracks" | "notes">("tracks");
  const [noteText, setNoteText] = useState(album?.userNotes || "");
  const [tagInput, setTagInput] = useState("");
  const [playlistMenuTrackId, setPlaylistMenuTrackId] = useState<string | null>(null);
  const [trackMenuId, setTrackMenuId] = useState<string | null>(null);
  const [albumMenuOpen, setAlbumMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [newSingleName, setNewSingleName] = useState("");
  const [isAddAllPlaylistOpen, setIsAddAllPlaylistOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Inline synced lyrics (lrclib) per track
  const [lyricsOpenId, setLyricsOpenId] = useState<string | null>(null);
  const [lyricsMap, setLyricsMap] = useState<Record<string, LyricsResult | null>>({});
  const [lyricsLoadingId, setLyricsLoadingId] = useState<string | null>(null);
  const lyricsScrollRef = useRef<HTMLDivElement | null>(null);

  const handleToggleLyrics = async (track: Track) => {
    if (lyricsOpenId === track.id) {
      setLyricsOpenId(null);
      return;
    }
    setLyricsOpenId(track.id);
    if (lyricsMap[track.id] !== undefined) return;
    setLyricsLoadingId(track.id);
    try {
      const res = await fetchLyrics(
        track.artist || album?.artist || "",
        track.title,
        album?.title,
        track.duration
      );
      setLyricsMap((m) => ({ ...m, [track.id]: res }));
    } finally {
      setLyricsLoadingId(null);
    }
  };

  // Follow the active lyric line inside its own scroll box only.
  // Manual container math on purpose: scrollIntoView() would also scroll
  // the modal / background page, stealing scroll from the UI.
  useEffect(() => {
    if (lyricsOpenId == null) return;
    const box = lyricsScrollRef.current;
    const el = box?.querySelector('[data-lr-active="1"]') as HTMLElement | null;
    if (!box || !el) return;
    const elTop = el.offsetTop - box.offsetTop;
    if (elTop < box.scrollTop) box.scrollTop = elTop - 8;
    else if (elTop + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = elTop + el.offsetHeight - box.clientHeight + 8;
    }
  }, [lyricsOpenId, currentTime, currentTrack?.id]);

  // Lock background scroll + chain inner scroll while the modal is open.
  // NOTE: must live above the early return or React throws a hooks-order error.
  // Lock both <html> and <body>: some browsers scroll the documentElement,
  // so locking body alone still lets the background move behind the dialog.
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [isOpen]);

  // Route wheel gestures over the fixed header/tabs into the tab-content
  // scroll box, so scrolling anywhere over the dialog scrolls the UI
  // (streaming-style) instead of chaining to the background page.
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const handlePanelWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.("[data-modal-scroll]")) return; // native nested scroll
    const el = contentScrollRef.current;
    if (!el || el.scrollHeight <= el.clientHeight) return; // nothing to scroll
    const canDown = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    const canUp = el.scrollTop > 0;
    if ((e.deltaY > 0 && canDown) || (e.deltaY < 0 && canUp)) {
      el.scrollTop += e.deltaY;
      e.preventDefault();
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard?.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  const [isCreatingNewPlaylistInline, setIsCreatingNewPlaylistInline] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  // Rate & Tier List Panel State
  const [isRateTierListOpen, setIsRateTierListOpen] = useState(false);
  const [isCreatingNewTierListInline, setIsCreatingNewTierListInline] = useState(false);
  const [newTierListName, setNewTierListName] = useState("");
  const [tierFeedback, setTierFeedback] = useState<string | null>(null);

  // Offline caching state
  const [cachedTrackIds, setCachedTrackIds] = useState<Set<string>>(new Set());
  const [cachingTrackIds, setCachingTrackIds] = useState<Set<string>>(new Set());
  const [isCachingEntireAlbum, setIsCachingEntireAlbum] = useState(false);
  const [cachingAlbumProgress, setCachingAlbumProgress] = useState<{ current: number; total: number } | null>(null);

  React.useEffect(() => {
    if (!album) return;
    const updateCacheSet = () => {
      const set = new Set<string>();
      album.tracks?.forEach((t) => {
        if (offlineCache.isTrackCachedSync(t.id)) {
          set.add(t.id);
        }
      });
      setCachedTrackIds(set);
    };

    updateCacheSet();
    const unsub = offlineCache.subscribe(updateCacheSet);
    return unsub;
  }, [album?.id, album?.tracks]);

  const handleToggleTrackPin = async (track: Track) => {
    if (!album) return;
    const isCached = cachedTrackIds.has(track.id);
    if (isCached) {
      await offlineCache.removeCachedTrack(track.id);
    } else {
      setCachingTrackIds((prev) => new Set(prev).add(track.id));
      try {
        await offlineCache.cacheTrack(track, album);
      } catch (err) {
        console.error("Failed to pin track offline:", err);
      } finally {
        setCachingTrackIds((prev) => {
          const next = new Set(prev);
          next.delete(track.id);
          return next;
        });
      }
    }
  };

  const handleCacheEntireAlbum = async () => {
    if (!album?.tracks || album.tracks.length === 0 || isCachingEntireAlbum) return;
    const tracksToCache = album.tracks.filter((t) => !offlineCache.isTrackCachedSync(t.id));
    if (tracksToCache.length === 0) {
      // If already all cached, prompt to unpin all
      for (const track of album.tracks) {
        await offlineCache.removeCachedTrack(track.id);
      }
      return;
    }
    setIsCachingEntireAlbum(true);
    setCachingAlbumProgress({ current: 0, total: tracksToCache.length });
    let completed = 0;
    for (const track of tracksToCache) {
      try {
        await offlineCache.cacheTrack(track, album);
      } catch (err) {
        console.error("Failed to cache track in album:", err);
      }
      completed++;
      setCachingAlbumProgress({ current: completed, total: tracksToCache.length });
    }
    setIsCachingEntireAlbum(false);
    setCachingAlbumProgress(null);
  };

  React.useEffect(() => {
    if (album) {
      setNoteText(album.userNotes || "");
    }
  }, [album?.id, album?.userNotes]);

  if (!isOpen || !album) return null;

  const { title: displayTitle, spec: titleSpec } = splitTitleSpec(album.title || "");

  const handleSetTier = (tier: TierRank | undefined) => {
    const updated = { ...album, tier };
    onUpdateAlbum(updated);
  };

  const handleAddAllToPlaylist = (playlistId: string, playlistName: string) => {
    if (!album.tracks || album.tracks.length === 0) return;
    album.tracks.forEach((track) => {
      onAddTrackToPlaylist(playlistId, track);
    });
    setAddedFeedback(`Added ${album.tracks.length} songs to "${playlistName}"`);
    setTimeout(() => {
      setAddedFeedback(null);
      setIsAddAllPlaylistOpen(false);
    }, 1500);
  };

  const handleCreateAndAddAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const plId = `pl_${Date.now()}`;
    if (onCreatePlaylist) {
      onCreatePlaylist(newPlaylistName.trim(), `Contains songs from ${album.title}`);
    }
    // Add tracks
    if (album.tracks && album.tracks.length > 0) {
      album.tracks.forEach((t) => {
        onAddTrackToPlaylist(plId, t);
      });
    }
    setAddedFeedback(`Created "${newPlaylistName}" and added ${album.tracks?.length || 0} songs`);
    setNewPlaylistName("");
    setIsCreatingNewPlaylistInline(false);
    setTimeout(() => {
      setAddedFeedback(null);
      setIsAddAllPlaylistOpen(false);
    }, 1500);
  };

  const handleSaveNotes = () => {
    const updated = { ...album, userNotes: noteText };
    onUpdateAlbum(updated);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    const currentTags = album.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      const updated = { ...album, tags: [...currentTags, tagInput.trim()] };
      onUpdateAlbum(updated);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = {
      ...album,
      tags: (album.tags || []).filter((t) => t !== tagToRemove),
    };
    onUpdateAlbum(updated);
  };

  const formatDuration = (seconds: number) => formatTime(seconds, "--:--");

  return (
    <div role="dialog" aria-modal="true" aria-label={`Details for ${album?.title || "album"}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overscroll-contain" onWheel={(e) => e.stopPropagation()} onClick={onClose}>
      <div
        id="album-detail-modal"
        className="w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        onWheel={handlePanelWheel}
      >
        {/* Top Header / Hero */}
        <div className="relative p-6 bg-gradient-to-b from-stone-850 to-stone-900 border-b border-stone-800">
          <button
            id="close-album-detail-btn"
            onClick={onClose}
            aria-label="Close album details"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex gap-4 sm:gap-5 items-start">
            <img
              src={album.coverUrl || "https://archive.org/images/notfound.png"}
              alt={album.title}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://archive.org/images/notfound.png";
              }}
              className="w-24 h-24 sm:w-36 sm:h-36 rounded-lg object-cover bg-stone-950 ring-1 ring-white/10 shadow-xl shrink-0"
            />

            <div className="flex-1 min-w-0 flex flex-col">
              <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500 font-semibold">
                {album.year ? <span className="font-semibold">Album · {album.year}</span> : <span className="font-semibold">Album</span>}
              </p>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100 line-clamp-2 leading-tight mt-1" title={album.title}>{displayTitle}</h2>

              <div className="flex items-center gap-2 mt-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenArtistDiscography && album.artist) {
                      onOpenArtistDiscography(album.artist);
                    }
                  }}
                  className="text-sm font-semibold text-stone-300 hover:text-amber-300 transition-colors truncate text-left"
                  title={`Explore full discography of ${album.artist}`}
                >
                  {album.artist}
                </button>
                {onOpenArtistDiscography && album.artist && (
                  <button
                    type="button"
                    onClick={() => onOpenArtistDiscography(album.artist)}
                    className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    Discography
                  </button>
                )}
              </div>
              {titleSpec && (
                <p className="text-[11px] text-stone-500 mt-1 truncate tabular-nums">
                  {titleSpec}
                </p>
              )}
            </div>
          </div>

          {/* Unified action row — streaming-style: primary play + like/vault + overflow left, source/share right */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <button
                id="play-entire-album-btn"
                onClick={() => { playAlbum(album, 0); onClose(); }}
                className="h-9 px-4 bg-lime-400 hover:bg-lime-300 text-stone-950 font-semibold text-xs rounded-full transition-colors inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Play className="w-4 h-4 fill-stone-950" />
                <span className="tabular-nums">Play All Tracks ({album.tracks?.length || 0})</span>
              </button>
              {/* Vault membership — the only save state (taste lives in tiers) */}
                {/* Add to Vault / In Vault — tap toggles instantly (no confirm) */}
                {isInVault ? (
                  <button
                    id="detail-vault-toggle-btn"
                    onClick={() => {
                      if (onDeleteAlbum) {
                        onDeleteAlbum(album.id);
                        onClose();
                      }
                    }}
                    className="h-9 inline-flex items-center gap-1.5 px-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 text-xs font-semibold transition-colors cursor-pointer"
                    title="Remove from your vault"
                    aria-label="Remove from your vault"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>In Vault</span>
                  </button>
                ) : (
                  <button
                    id="detail-add-to-vault-btn"
                    onClick={() => onUpdateAlbum(album)}
                    className="h-9 px-3 rounded-full border border-white/10 text-stone-300 hover:text-stone-100 hover:border-white/20 hover:bg-white/5 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    title="Save this album to your vault"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Add to Vault</span>
                  </button>
                )}

                {/* Rate / Tier List panel (opened from the ⋮ menu below) */}
                <div className="relative">
                  {isRateTierListOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between pb-1 border-b border-stone-850">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                          Rate & Tier Lists
                        </span>
                        <button
                          onClick={() => setIsRateTierListOpen(false)}
                          className="text-stone-500 hover:text-stone-300 text-[11px] p-0.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {tierFeedback && (
                        <div className="p-2 text-center text-emerald-400 bg-emerald-500/10 rounded-lg text-xs font-medium">
                          {tierFeedback}
                        </div>
                      )}

                      {/* Section 1: Set Master Vault Tier */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium">
                          <span className="font-semibold text-stone-300">Vault Tier Rank:</span>
                          {album.tier && (
                            <button
                              onClick={() => {
                                onUpdateAlbum({ ...album, tier: undefined });
                                setTierFeedback("Tier cleared from Vault");
                                setTimeout(() => setTierFeedback(null), 2000);
                              }}
                              className="text-stone-500 hover:text-red-400 text-[9px] underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 bg-stone-900/90 p-1.5 rounded-lg border border-stone-850">
                          {TIER_RANKS.map((r) => {
                            const cfg = TIER_CONFIG[r];
                            const isCurrent = album.tier === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => {
                                  onUpdateAlbum({ ...album, tier: r });
                                  setTierFeedback(`Rated as ${r} Tier in Vault`);
                                  setTimeout(() => setTierFeedback(null), 2000);
                                }}
                                className={`flex-1 h-7 rounded-md font-black text-xs flex items-center justify-center transition-all cursor-pointer ${
                                  cfg.bgClass
                                } text-black ${
                                  isCurrent
                                    ? "ring-2 ring-white scale-105 shadow-md z-10"
                                    : "opacity-75 hover:opacity-100 hover:scale-105"
                                }`}
                                title={`${cfg.name} (${cfg.description})`}
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 2: Custom Tier Lists */}
                      <div className="space-y-1.5 pt-1.5 border-t border-stone-850">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                            Add to Specific Tier List:
                          </span>
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
                          {tierLists.length === 0 ? (
                            <p className="text-[11px] text-stone-500 py-1.5 px-1">
                              No custom tier lists yet. Create one below!
                            </p>
                          ) : (
                            tierLists.map((tl) => {
                              const existingItem = tl.items.find((it) => it.albumId === album.id);
                              return (
                                <div
                                  key={tl.id}
                                  className="p-2 rounded-lg bg-stone-900/70 hover:bg-stone-900 border border-stone-850 flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-stone-200 truncate">
                                      {tl.name}
                                    </p>
                                    <p className="text-[10px] text-stone-500">
                                      {tl.items.length} album{tl.items.length === 1 ? "" : "s"}
                                    </p>
                                  </div>

                                  {existingItem ? (
                                    <div className="flex items-center space-x-1.5 shrink-0">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                          TIER_CONFIG[existingItem.rank].bgClass
                                        } text-black`}
                                      >
                                        {existingItem.rank}
                                      </span>
                                      <button
                                        onClick={() => {
                                          if (onUpdateTierList) {
                                            const updatedItems = tl.items.filter(
                                              (it) => it.albumId !== album.id
                                            );
                                            onUpdateTierList({
                                              ...tl,
                                              items: updatedItems,
                                              updatedAt: new Date().toISOString(),
                                            });
                                            setTierFeedback(`Removed from "${tl.name}"`);
                                            setTimeout(() => setTierFeedback(null), 2000);
                                          }
                                        }}
                                        className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors cursor-pointer"
                                        title="Remove from this Tier List"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      {TIER_RANKS.map((r) => (
                                        <button
                                          key={r}
                                          onClick={() => {
                                            if (onUpdateTierList) {
                                              const newItem: TierItem = {
                                                albumId: album.id,
                                                rank: r,
                                                albumTitle: album.title,
                                                artist: album.artist,
                                                coverUrl: album.coverUrl,
                                                year: album.year,
                                                addedAt: new Date().toISOString(),
                                              };
                                              onUpdateTierList({
                                                ...tl,
                                                items: [...tl.items, newItem],
                                                updatedAt: new Date().toISOString(),
                                              });
                                              setTierFeedback(
                                                `Added to "${tl.name}" (${r} Tier)`
                                              );
                                              setTimeout(() => setTierFeedback(null), 2000);
                                            }
                                          }}
                                          className={`w-4 h-4 rounded text-[8.5px] font-black flex items-center justify-center cursor-pointer transition-transform hover:scale-120 ${
                                            TIER_CONFIG[r].bgClass
                                          } text-black opacity-80 hover:opacity-100`}
                                          title={`Add to ${tl.name} as ${r} Tier`}
                                        >
                                          {r}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Inline Create New Tier List */}
                        {!isCreatingNewTierListInline ? (
                          <button
                            onClick={() => setIsCreatingNewTierListInline(true)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 border border-dashed border-amber-500/30 flex items-center space-x-1.5 transition-colors cursor-pointer mt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span className="font-semibold text-[11px]">New Tier List...</span>
                          </button>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!newTierListName.trim()) return;
                              if (onCreateTierList) {
                                const created = onCreateTierList(newTierListName.trim());
                                const targetList = created || {
                                  id: `tl_${Date.now()}`,
                                  name: newTierListName.trim(),
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                  items: [],
                                };
                                if (onUpdateTierList && targetList) {
                                  const rankToUse = album.tier || "S";
                                  const newItem: TierItem = {
                                    albumId: album.id,
                                    rank: rankToUse,
                                    albumTitle: album.title,
                                    artist: album.artist,
                                    coverUrl: album.coverUrl,
                                    year: album.year,
                                    addedAt: new Date().toISOString(),
                                  };
                                  onUpdateTierList({
                                    ...targetList,
                                    items: [...targetList.items, newItem],
                                    updatedAt: new Date().toISOString(),
                                  });
                                }
                                setTierFeedback(
                                  `Created "${newTierListName.trim()}" and added album!`
                                );
                                setTimeout(() => setTierFeedback(null), 2500);
                              }
                              setNewTierListName("");
                              setIsCreatingNewTierListInline(false);
                            }}
                            className="pt-1 space-y-1.5"
                          >
                            <input
                              type="text"
                              placeholder="Tier list name..."
                              value={newTierListName}
                              onChange={(e) => setNewTierListName(e.target.value)}
                              className="w-full px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                              autoFocus
                            />
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setIsCreatingNewTierListInline(false)}
                                className="px-2 py-0.5 text-[10px] text-stone-500 hover:text-stone-300 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!newTierListName.trim()}
                                className="px-2.5 py-0.5 bg-amber-500 text-stone-950 font-bold text-[10px] rounded cursor-pointer disabled:opacity-50"
                              >
                                Create & Add
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Overflow + library actions: more menu, delete — same baseline as play/like */}
              <div className="flex items-center gap-2 flex-wrap">

                {/* Shared-mixtape vault action replaces Add All to Playlist */}
                {vaultAction ? (
                  <button
                    onClick={vaultAction.onAction}
                    className="h-9 px-3 rounded-full border border-white/10 text-stone-200 hover:border-white/20 hover:bg-white/5 font-semibold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    title="Save this shared playlist to your vault"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{vaultAction.label}</span>
                  </button>
                ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAlbumMenuOpen(!albumMenuOpen)}
                    className="w-9 h-9 rounded-full grid place-items-center border border-white/10 text-stone-400 hover:text-stone-100 hover:border-white/20 hover:bg-white/5 transition-colors cursor-pointer"
                    title="More album options"
                    aria-label="More album options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {albumMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setAlbumMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-52 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-1.5 z-40 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAlbumMenuOpen(false);
                            setIsAddAllPlaylistOpen(false);
                            setIsRateTierListOpen(true);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>Rate / Tier List{album.tier ? ` (${album.tier})` : ""}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAlbumMenuOpen(false);
                            setIsRateTierListOpen(false);
                            setPlaylistMenuTrackId(null);
                            setMenuPos(null);
                            setIsAddAllPlaylistOpen(true);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                        >
                          <ListPlus className="w-3.5 h-3.5 text-stone-500" />
                          <span>Add All to Playlist</span>
                        </button>
                        {album.tracks && album.tracks.length > 0 && (
                          <button
                            type="button"
                            onClick={() => { setAlbumMenuOpen(false); handleCacheEntireAlbum(); }}
                            disabled={isCachingEntireAlbum}
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isCachingEntireAlbum ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            ) : (
                              <Database className={`w-3.5 h-3.5 ${cachedTrackIds.size === album.tracks.length ? "text-emerald-400" : "text-stone-500"}`} />
                            )}
                            <span>
                              {isCachingEntireAlbum
                                ? `Caching (${cachingAlbumProgress?.current}/${cachingAlbumProgress?.total})…`
                                : cachedTrackIds.size === album.tracks.length
                                ? "Cached Offline"
                                : cachedTrackIds.size > 0
                                ? `Pin Offline (${cachedTrackIds.size}/${album.tracks.length})`
                                : "Pin Offline"}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { setAlbumMenuOpen(false); downloadAlbumZip(album.id, album.title, e); }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-stone-500" />
                          <span>Download (ZIP)</span>
                        </button>
                      </div>
                    </>
                  )}

                  {isAddAllPlaylistOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-60 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between pb-1 border-b border-stone-850">
                        <span className="text-[10px] uppercase font-bold text-stone-400">
                          Add All Songs To:
                        </span>
                        <button
                          onClick={() => setIsAddAllPlaylistOpen(false)}
                          className="text-stone-500 hover:text-stone-300 text-[10px]"
                        >
                          ✕
                        </button>
                      </div>

                      {addedFeedback ? (
                        <div className="p-2 text-center text-emerald-400 bg-emerald-500/10 rounded-lg text-xs font-medium">
                          {addedFeedback}
                        </div>
                      ) : (
                        <>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {playlists.length === 0 ? (
                              <p className="text-[11px] text-stone-500 py-1.5 px-1">
                                No playlists yet. Create one below!
                              </p>
                            ) : (
                              playlists.map((pl) => (
                                <button
                                  key={pl.id}
                                  onClick={() => handleAddAllToPlaylist(pl.id, pl.name)}
                                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-stone-900 text-stone-200 hover:text-amber-400 flex items-center justify-between group/pitem cursor-pointer transition-colors"
                                >
                                  <span className="truncate font-medium">{pl.name}</span>
                                  <span className="text-[10px] text-stone-500">
                                    {pl.tracks.length} songs
                                  </span>
                                </button>
                              ))
                            )}
                          </div>

                          {/* Create new inline */}
                          {!isCreatingNewPlaylistInline ? (
                            <button
                              onClick={() => setIsCreatingNewPlaylistInline(true)}
                              className="w-full text-left px-2 py-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 border border-dashed border-amber-500/30 flex items-center space-x-1.5 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="font-semibold text-[11px]">New Playlist...</span>
                            </button>
                          ) : (
                            <form onSubmit={handleCreateAndAddAll} className="pt-1 space-y-1.5">
                              <input
                                type="text"
                                placeholder="Playlist Name"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                className="w-full px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                                autoFocus
                              />
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setIsCreatingNewPlaylistInline(false)}
                                  className="px-2 py-0.5 text-[10px] text-stone-500 hover:text-stone-300"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={!newPlaylistName.trim()}
                                  className="px-2.5 py-0.5 bg-amber-500 text-stone-950 font-semibold text-[10px] rounded"
                                >
                                  Create & Add
                                </button>
                              </div>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}

                {onDeleteAlbum && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${album.title}" from your library?`)) {
                        onDeleteAlbum(album.id);
                        onClose();
                      }
                    }}
                    className="w-9 h-9 rounded-full grid place-items-center border border-white/10 text-stone-500 hover:text-red-400 hover:border-red-500/30 hover:bg-white/5 transition-colors cursor-pointer"
                    title="Remove album from library"
                    aria-label="Remove album from library"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Source + share — muted right side, streaming-style secondary */}
              <div className="ml-auto flex items-center gap-1.5">
                {album.archiveUrl && (
                  <a
                    href={album.archiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 inline-flex items-center gap-1 px-2.5 rounded-full text-xs text-stone-500 hover:text-amber-300 hover:bg-white/5 transition-colors"
                  >
                    Archive.org <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  onClick={() => copyLink(linkForAlbum(album.identifier || album.id))}
                  className="w-9 h-9 rounded-full grid place-items-center border border-white/10 text-stone-500 hover:text-amber-300 hover:border-white/20 hover:bg-white/5 transition-colors cursor-pointer"
                  title="Copy shareable album link"
                  aria-label="Copy shareable album link"
                >
                  {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-4 border-t border-stone-800/80 mt-4 pt-3 text-xs font-medium">
            <button
              onClick={() => setActiveTab("tracks")}
              className={`pb-1 transition-colors border-b-2 ${
                activeTab === "tracks"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-stone-400 hover:text-stone-200"
              }`}
            >
              Tracks ({album.tracks?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`pb-1 transition-colors border-b-2 ${
                activeTab === "notes"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-stone-400 hover:text-stone-200"
              }`}
            >
              Notes & Custom Tags {album.userNotes ? "•" : ""}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div ref={contentScrollRef} data-modal-scroll className="px-3 sm:px-4 py-3 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {activeTab === "tracks" && (
            <div className="divide-y divide-white/5">
              {(!album.tracks || album.tracks.length === 0) ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  No streaming audio tracks detected for this recording.
                </div>
              ) : (
                album.tracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;

                  return (
                    <React.Fragment key={track.id || idx}>
                    <div
                      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors border ${
                        isCurrent
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          : "border-transparent hover:bg-white/5 text-stone-200"
                      }`}
                    >
                      <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-stone-600">
                        {track.trackNumber || idx + 1}
                      </span>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => { playTrack(track, album, album.tracks); onClose(); }}
                          aria-label={`Play ${track.title}`}
                          className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-amber-500 group-hover:text-stone-950 text-stone-300 grid place-items-center shrink-0 transition-colors"
                        >
                          {isCurrent && isPlaying ? (
                            <div className="flex items-center space-x-0.5">
                              <span className="w-0.5 h-3 bg-amber-400 animate-pulse" />
                              <span className="w-0.5 h-2 bg-amber-400 animate-pulse" />
                            </div>
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium truncate leading-tight">{track.title}</p>
                          <p className="text-[11px] text-stone-500 truncate leading-tight mt-0.5">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-stone-400 shrink-0 ml-2">
                        <span className="hidden sm:inline w-12 text-right text-[10px] uppercase tracking-wide text-stone-600">{track.format || "MP3"}</span>
                        <span className="w-12 text-right text-[11px] tabular-nums text-stone-500">{formatDuration(track.duration)}</span>

                        {/* Overflow menu: pin, download, link, lyrics, playlist */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setTrackMenuId(trackMenuId === track.id ? null : track.id)}
                            className="p-1.5 rounded-full text-stone-500 hover:text-stone-100 hover:bg-white/10 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
                            title="More options"
                            aria-label="More options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {trackMenuId === track.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setTrackMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 w-52 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-1.5 z-40 space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => { handleToggleTrackPin(track); setTrackMenuId(null); }}
                                  disabled={cachingTrackIds.has(track.id)}
                                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  {cachingTrackIds.has(track.id) ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                  ) : (
                                    <Database className={`w-3.5 h-3.5 ${cachedTrackIds.has(track.id) ? "text-emerald-400" : "text-stone-500"}`} />
                                  )}
                                  <span>
                                    {cachedTrackIds.has(track.id)
                                      ? "Remove offline pin"
                                      : cachingTrackIds.has(track.id)
                                      ? "Caching…"
                                      : "Pin offline"}
                                  </span>
                                </button>
                                {(track.audioUrl || track.streamUrl) && (
                                  <button
                                    type="button"
                                    onClick={(e) => { downloadTrackAudio((track.audioUrl || track.streamUrl)!, `${album.artist} - ${track.title}`, e); setTrackMenuId(null); }}
                                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5 text-stone-500" />
                                    <span>Download</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => { addToQueue(track); setTrackMenuId(null); }}
                                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                                >
                                  <ListMusic className="w-3.5 h-3.5 text-stone-500" />
                                  <span>Add to Playback Queue</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { copyLink(linkForSong(album.identifier || album.id, track.trackNumber || idx + 1)); setTrackMenuId(null); }}
                                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                                >
                                  {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-stone-500" />}
                                  <span>Copy link</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { handleToggleLyrics(track); setTrackMenuId(null); }}
                                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                                >
                                  <Mic className={`w-3.5 h-3.5 ${lyricsOpenId === track.id ? "text-amber-400" : "text-stone-500"}`} />
                                  <span>Lyrics</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setTrackMenuId(null);
                                    setIsAddAllPlaylistOpen(false);
                                    const r = e.currentTarget.getBoundingClientRect();
                                    const w = 224;
                                    setMenuPos({
                                      top: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - 240)),
                                      left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)),
                                    });
                                    setPlaylistMenuTrackId(track.id);
                                    setNewSingleName("");
                                  }}
                                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-stone-200 flex items-center gap-2.5 text-xs cursor-pointer transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5 text-stone-500" />
                                  <span>Add to playlist</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Add to Playlist Popup (viewport-anchored, never clipped) */}
                        <div>
                          {playlistMenuTrackId === track.id && menuPos && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => { setPlaylistMenuTrackId(null); setMenuPos(null); }} />
                              <div
                                className="fixed z-50 w-56 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-2 space-y-1.5"
                                style={{ top: menuPos.top, left: menuPos.left }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="text-[10px] text-stone-400 px-2 py-0.5 font-medium uppercase">
                                  Add to Playlist
                                </p>
                                <div className="max-h-44 overflow-y-auto space-y-1">
                                  {playlists.length === 0 ? (
                                    <p className="text-[11px] text-stone-500 px-2 py-1">No playlists yet — create one below</p>
                                  ) : (
                                    playlists.map((pl) => (
                                      <button
                                        key={pl.id}
                                        onClick={() => {
                                          onAddTrackToPlaylist(pl.id, track);
                                          setPlaylistMenuTrackId(null);
                                          setMenuPos(null);
                                        }}
                                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-stone-900 text-stone-200 hover:text-amber-400 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                                      >
                                        <span className="truncate font-medium text-xs">{pl.name}</span>
                                        <Plus className="w-3 h-3 text-amber-400 shrink-0" />
                                      </button>
                                    ))
                                  )}
                                </div>
                                <form
                                  onSubmit={(ev) => {
                                    ev.preventDefault();
                                    const name = newSingleName.trim();
                                    if (!name) return;
                                    const created = onCreatePlaylist?.(name) as Playlist | void;
                                    const id = created && typeof created === "object" ? created.id : playlists.find((p) => p.name === name)?.id;
                                    if (id) {
                                      onAddTrackToPlaylist(id, track);
                                      setPlaylistMenuTrackId(null);
                                      setMenuPos(null);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 pt-1 border-t border-stone-800/80"
                                >
                                  <input
                                    value={newSingleName}
                                    onChange={(e) => setNewSingleName(e.target.value)}
                                    placeholder="New playlist…"
                                    maxLength={40}
                                    className="flex-1 min-w-0 px-2 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                                  />
                                  <button
                                    type="submit"
                                    disabled={!newSingleName.trim()}
                                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                                  >
                                    Add
                                  </button>
                                </form>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {lyricsOpenId === track.id && (
                      <div
                        ref={lyricsScrollRef}
                        className="ml-10 mb-2 rounded-xl bg-stone-950/60 border border-stone-800/60 p-3 max-h-56 overflow-y-auto"
                      >
                        {(() => {
                          if (lyricsLoadingId === track.id) {
                            return (
                              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                <span>Looking for lyrics…</span>
                              </div>
                            );
                          }
                          const res = lyricsMap[track.id];
                          if (!res) {
                            return <p className="text-[11px] text-stone-500">No lyrics found for this one.</p>;
                          }
                          if (res.instrumental) {
                            return <p className="text-[11px] text-stone-500">Instrumental — no lyrics.</p>;
                          }
                          if (res.synced && res.synced.length > 0) {
                            const active =
                              isCurrent && currentTrack?.id === track.id
                                ? currentLyricIndex(res.synced, currentTime)
                                : -1;
                            return (
                              <div className="space-y-1">
                                {res.synced.map((l, i) => (
                                  <p
                                    key={i}
                                    data-lr-active={i === active ? "1" : undefined}
                                    className={`text-xs leading-relaxed transition-colors ${
                                      i === active ? "text-amber-300 font-semibold" : "text-stone-400"
                                    }`}
                                  >
                                    {l.line}
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return <p className="text-xs text-stone-300 whitespace-pre-line leading-relaxed">{res.plain}</p>;
                        })()}
                      </div>
                    )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-6">
              {/* Custom Notes Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-200 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Private Album Notes</span>
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add your personal thoughts, audio quality notes, taper information, favorite tracks, or concert history..."
                  rows={4}
                  className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 text-xs focus:outline-none focus:border-amber-500 leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>

              {/* Custom Tags Section */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-stone-200 flex items-center space-x-1.5">
                  <Tag className="w-4 h-4 text-sky-400" />
                  <span>Custom Tags</span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {(album.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 text-xs flex items-center space-x-1.5 border border-stone-700/60"
                    >
                      <span>#{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-stone-500 hover:text-stone-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <form onSubmit={handleAddTag} className="flex space-x-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="New tag (e.g. Master Tape, Psychedelic, Chill)..."
                    className="flex-1 px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-xl transition-colors"
                  >
                    Add Tag
                  </button>
                </form>
              </div>

              {/* Archival Description */}
              {album.description && (
                <div className="space-y-1 pt-2 border-t border-stone-800">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    Archival Description
                  </h4>
                  <p className="text-xs text-stone-400 leading-relaxed max-h-36 overflow-y-auto pr-1">
                    {album.description}
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
