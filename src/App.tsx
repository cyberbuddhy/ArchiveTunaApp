import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import { PlayerProvider } from "./context/PlayerContext";
import { Navbar, NavTabType } from "./components/Navbar";
import { UpdateBanner } from "./components/UpdateBanner";
import { MobileBottomNav } from "./components/MobileBottomNav";
const PlayerBar = lazy(() => import("./components/PlayerBar").then((m) => ({ default: m.PlayerBar })));
const SearchView = lazy(() => import("./components/SearchView").then((m) => ({ default: m.SearchView })));
const DiscoverView = lazy(() => import("./components/DiscoverView").then((m) => ({ default: m.DiscoverView })));
const LibraryView = lazy(() => import("./components/LibraryView").then((m) => ({ default: m.LibraryView })));
const CaptureModal = lazy(() => import("./components/CaptureModal").then((m) => ({ default: m.CaptureModal })));
const DumpBackupModal = lazy(() => import("./components/DumpBackupModal").then((m) => ({ default: m.DumpBackupModal })));
const AlbumDetailModal = lazy(() => import("./components/AlbumDetailModal").then((m) => ({ default: m.AlbumDetailModal })));
const ArtistDiscographyModal = lazy(() => import("./components/ArtistDiscographyModal").then((m) => ({ default: m.ArtistDiscographyModal })));
const SettingsModal = lazy(() => import("./components/SettingsModal").then((m) => ({ default: m.SettingsModal })));
const KeyboardShortcutsModal = lazy(() => import("./components/KeyboardShortcutsModal").then((m) => ({ default: m.KeyboardShortcutsModal })));
const OnboardingModal = lazy(() => import("./components/OnboardingModal").then((m) => ({ default: m.OnboardingModal })));
import { hasSeenOnboarding, markOnboardingDone } from "./components/OnboardingModal";
import { fetchAlbumDetails } from "./services/api";
import {
  getStoredAlbums,
  saveStoredAlbums,
  getStoredPlaylists,
  saveStoredPlaylists,
  getStoredTierLists,
  saveStoredTierLists,
  getStoredHistory,
} from "./services/storage";
import { Album, Playlist, Track, ListenHistoryItem, TierList } from "./types";
import { CheckCircle2, Heart } from "lucide-react";
import { ArchiveLogo } from "./components/ArchiveLogo";
import { THEMES, getStoredThemeId, saveThemeId, applyThemeToDOM } from "./services/themes";

export default function App() {
  const getTabFromHash = (): NavTabType => {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (hash === "discover" || hash === "library" || hash === "search") {
      return hash as NavTabType;
    }
    return "search";
  };

  const [activeTab, setActiveTabState] = useState<NavTabType>(getTabFromHash);

  const setActiveTab = (tab: NavTabType) => {
    setActiveTabState(tab);
    if (window.location.hash !== `#${tab}`) {
      window.history.replaceState(null, "", `#${tab}`);
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTabState(getTabFromHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [tierLists, setTierLists] = useState<TierList[]>([]);
  const [history, setHistory] = useState<ListenHistoryItem[]>([]);
  const [searchResetKey, setSearchResetKey] = useState<number>(0);

  // Theme & Palette State
  const [themeId, setThemeId] = useState<string>(() => getStoredThemeId());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    applyThemeToDOM(themeId);
  }, [themeId]);

  const handleSelectTheme = useCallback((newThemeId: string) => {
    setThemeId(newThemeId);
    saveThemeId(newThemeId);
    applyThemeToDOM(newThemeId);
    const found = THEMES.find((t) => t.id === newThemeId);
    showToast(`Atmosphere switched to ${found?.name || newThemeId}`, "info");
  }, []);

  // Modals state
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [detailAlbum, setDetailAlbum] = useState<Album | null>(null);
  const [sharedMix, setSharedMix] = useState<{ name: string; tracks: Track[] } | null>(null);
  const [discographyArtist, setDiscographyArtist] = useState<string | null>(null);
  const [externalSearchQuery, setExternalSearchQuery] = useState<{ query: string; field?: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());

  // Global App-Level Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Escape key closes modals in precedence order
      if (e.key === "Escape") {
        if (isShortcutsModalOpen) {
          e.preventDefault();
          setIsShortcutsModalOpen(false);
          return;
        }
        if (isSettingsModalOpen) {
          e.preventDefault();
          setIsSettingsModalOpen(false);
          return;
        }
        if (isCaptureModalOpen) {
          e.preventDefault();
          setIsCaptureModalOpen(false);
          return;
        }
        if (isBackupModalOpen) {
          e.preventDefault();
          setIsBackupModalOpen(false);
          return;
        }
        if (discographyArtist) {
          e.preventDefault();
          setDiscographyArtist(null);
          return;
        }
        if (detailAlbum) {
          e.preventDefault();
          setDetailAlbum(null);
          return;
        }
        return;
      }

      // If user is actively typing in a search bar or text input, don't trigger tab or tool shortcuts
      if (isInputFocused) return;

      // 1, 2, 3: Tab navigation
      if (e.key === "1") {
        e.preventDefault();
        setActiveTab("search");
      } else if (e.key === "2") {
        e.preventDefault();
        setActiveTab("discover");
      } else if (e.key === "3") {
        e.preventDefault();
        setActiveTab("vault");
      } else if (e.key === "/") {
        // Quick Jump to search
        e.preventDefault();
        setActiveTab("search");
        setTimeout(() => {
          const input = document.getElementById("main-music-search-input") as HTMLInputElement | null;
          input?.focus();
          input?.select();
        }, 60);
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        // Toggle keyboard shortcuts cheatsheet
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.code === "KeyC" && !e.metaKey && !e.ctrlKey) {
        // C: Capture direct stream or archive item
        e.preventDefault();
        setIsCaptureModalOpen((prev) => !prev);
      } else if (e.code === "KeyB" && !e.metaKey && !e.ctrlKey) {
        // B: Backup & Export
        e.preventDefault();
        setIsBackupModalOpen((prev) => !prev);
      } else if (e.code === "KeyT" && !e.metaKey && !e.ctrlKey) {
        // T: Theme / Atmosphere & Settings
        e.preventDefault();
        setIsSettingsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    isShortcutsModalOpen,
    isSettingsModalOpen,
    isCaptureModalOpen,
    isBackupModalOpen,
    discographyArtist,
    detailAlbum,
  ]);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(
    null
  );

  const tabFallback = (
    <div className="py-20 text-center text-xs text-stone-500">Loading…</div>
  );

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Initial load from storage
  useEffect(() => {
    const loadedAlbums = getStoredAlbums();
    const loadedPlaylists = getStoredPlaylists();
    const loadedTierLists = getStoredTierLists();
    const loadedHistory = getStoredHistory();
    // Single-axis migration: legacy likes become taste (tier A), then the
    // flag is retired — vault membership is the only save state.
    let migrated = false;
    for (const a of loadedAlbums) {
      if (a.isFavorite) {
        if (!a.tier) {
          a.tier = "A";
          migrated = true;
        }
        if (a.isFavorite) {
          a.isFavorite = false;
          migrated = true;
        }
      }
    }
    if (migrated) saveStoredAlbums(loadedAlbums);

    setAlbums(loadedAlbums);
    setPlaylists(loadedPlaylists);
    setTierLists(loadedTierLists);
    setHistory(loadedHistory);
  }, []);

  // Shared links (#a= album, #s= song, #p= playlist, legacy #mix=)
  useEffect(() => {
    (async () => {
      try {
        const { parseSharedHash } = await import("./services/share");
        const open = await parseSharedHash();
        if (!open) return;
        window.history.replaceState(null, "", location.pathname + location.search);
        if (open.kind === "song") {
          window.dispatchEvent(new CustomEvent("archive_play_song", {
            detail: { albumId: open.albumId, track: open.track },
          }));
          return;
        }
        if (open.kind === "album") {
          try {
            const full = await fetchAlbumDetails(open.id);
            setSharedMix(null);
            handleSelectAlbumForDetail(full);
          } catch {
            showToast("Shared album couldn't be loaded.", "info");
          }
          return;
        }
        if (open.kind === "playlist") {
          const settled = await Promise.all(open.refs.map(async ([id, n]) => {
            try {
              const a = await fetchAlbumDetails(id);
              const t = a.tracks.find((x) => x.trackNumber === n) || a.tracks[n - 1];
              return t ? { ...t, album: open.name } : null;
            } catch {
              return null;
            }
          }));
          const tracks = settled.filter((t): t is Track => !!t);
          if (!tracks.length) {
            showToast("Shared playlist couldn't be loaded.", "info");
            return;
          }
          openSharedPlaylist(open.name, tracks);
          return;
        }
        // legacy full-data link
        if (open.tracks.length) openSharedPlaylist(open.name, open.tracks);
      } catch { /* noop */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSharedPlaylist = (name: string, tracks: Track[]) => {
    const first = tracks[0];
    const stamp = Date.now();
    const album: Album = {
      id: `shared_${stamp}`,
      identifier: `shared_${stamp}`,
      title: name,
      artist: "Shared mixtape",
      coverUrl: first.albumId ? `https://archive.org/services/img/${first.albumId}` : undefined,
      collection: "Shared Mixtape",
      tracks: tracks.map((t, i) => ({ ...t, trackNumber: i + 1, album: name })),
      source: "Shared link",
      capturedAt: new Date().toISOString(),
    };
    setSharedMix({ name, tracks: album.tracks });
    setDetailAlbum(album);
    setActiveTabState(getTabFromHash());
  };

  const handleSaveSharedMix = useCallback(() => {
    if (!sharedMix) return;
    setPlaylists((prev) => {
      if (prev.some((p) => p.name === sharedMix.name && p.tracks.length === sharedMix.tracks.length)) {
        showToast("Already in your vault.", "info");
        return prev;
      }
      const pl: Playlist = {
        id: `pl_${Date.now()}`, name: sharedMix.name,
        description: "Saved from a shared link",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        tracks: sharedMix.tracks,
      };
      const updated = [...prev, pl];
      saveStoredPlaylists(updated);
      showToast(`Saved "${sharedMix.name}" to your vault!`);
      return updated;
    });
  }, [sharedMix]);
  useEffect(() => {
    const syncHistory = () => {
      setHistory(getStoredHistory());
    };
    const onTrackError = (e: Event) => {
      showToast((e as CustomEvent<string>).detail || "Track unavailable — skipped ahead.", "info");
    };
    window.addEventListener("focus", syncHistory);
    window.addEventListener("archive_track_error", onTrackError);
    const interval = setInterval(syncHistory, 5000);
    return () => {
      window.removeEventListener("focus", syncHistory);
      window.removeEventListener("archive_track_error", onTrackError);
      clearInterval(interval);
    };
  }, []);

  const existingAlbumIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of albums) {
      if (a.id) ids.add(a.id);
      if (a.identifier) ids.add(a.identifier);
    }
    return ids;
  }, [albums]);

  const handleResetToSearch = useCallback(() => {
    setExternalSearchQuery(null);
    setDiscographyArtist(null);
    setDetailAlbum(null);
    setActiveTab("search");
    setSearchResetKey((prev) => prev + 1);
  }, []);

  const handleSelectAlbumForDetail = useCallback((album: Album) => {
    setAlbums((currentAlbums) => {
      const existing = currentAlbums.find(
        (a) => a.id === album.id || (album.identifier && a.identifier === album.identifier) || a.id === album.identifier
      );
      if (existing) {
        setDetailAlbum({
          ...album,
          ...existing,
          isFavorite: existing.isFavorite,
          tier: existing.tier,
          userRating: existing.userRating,
          userNotes: existing.userNotes || album.userNotes,
          tags: existing.tags || album.tags,
          tracks: existing.tracks && existing.tracks.length > 0 ? existing.tracks : album.tracks,
        });
      } else {
        setDetailAlbum(album);
      }
      return currentAlbums;
    });
  }, []);

  const handleAlbumCaptured = useCallback((newAlbum: Album) => {
    setAlbums((prev) => {
      if (prev.some((a) => a.id === newAlbum.id || (newAlbum.identifier && a.identifier === newAlbum.identifier))) {
        return prev;
      }
      const updated = [newAlbum, ...prev];
      saveStoredAlbums(updated);
      return updated;
    });
    showToast(`Added "${newAlbum.title}" to your Vault!`);
  }, []);

  const handleUpdateAlbum = useCallback((updated: Album) => {
    setAlbums((prev) => {
      const idx = prev.findIndex(
        (a) => a.id === updated.id || (updated.identifier && a.identifier === updated.identifier) || a.id === updated.identifier
      );
      let next: Album[];
      if (idx === -1) {
        next = [updated, ...prev];
        showToast(`Saved "${updated.title}" to your Vault!`);
      } else {
        next = [...prev];
        next[idx] = { ...next[idx], ...updated };
      }
      saveStoredAlbums(next);
      return next;
    });
    setDetailAlbum((current) => {
      if (!current) return null;
      if (
        current.id === updated.id ||
        (updated.identifier && current.identifier === updated.identifier) ||
        current.id === updated.identifier
      ) {
        return { ...current, ...updated };
      }
      return current;
    });
  }, []);

  // Vault save from the player (single axis): adds the album to the vault
  // when missing, never removes. Taste lives in tier ranks, not here.
  const handleToggleSaveAlbumFromPlayer = useCallback((albumToToggle: Album) => {
    setAlbums((prev) => {
      const idx = prev.findIndex(
        (a) => a.id === albumToToggle.id || (albumToToggle.identifier && a.identifier === albumToToggle.identifier)
      );
      if (idx === -1) {
        // Legacy flag retired: vault membership is the only save state.
        const next = [{ ...albumToToggle, isFavorite: false }, ...prev];
        saveStoredAlbums(next);
        showToast(`Saved "${albumToToggle.title}" to your Vault!`);
        return next;
      }
      showToast(`"${prev[idx].title}" is already in your vault.`, "info");
      return prev;
    });
  }, []);

  const handleDeleteAlbum = useCallback((albumId: string) => {
    setAlbums((prev) => {
      const filtered = prev.filter((a) => a.id !== albumId && a.identifier !== albumId);
      saveStoredAlbums(filtered);
      return filtered;
    });
    showToast("Album removed from your Vault.", "info");
  }, []);

  const handleCreatePlaylist = useCallback((name: string, description?: string) => {
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracks: [],
    };
    setPlaylists((prev) => {
      const updated = [...prev, newPlaylist];
      saveStoredPlaylists(updated);
      return updated;
    });
    showToast(`Playlist "${name}" created!`);
    return newPlaylist;
  }, []);

  const handleDeletePlaylist = useCallback((playlistId: string) => {
    setPlaylists((prev) => {
      const filtered = prev.filter((p) => p.id !== playlistId);
      saveStoredPlaylists(filtered);
      return filtered;
    });
    showToast("Playlist deleted.", "info");
  }, []);

  const handleUpdatePlaylist = useCallback((updated: Playlist) => {
    setPlaylists((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updated;
      saveStoredPlaylists(next);
      return next;
    });
  }, []);

  const handleAddTrackToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) => {
      const idx = prev.findIndex((p) => p.id === playlistId);
      if (idx === -1) return prev;
      const targetPl = prev[idx];
      const updatedTracks = [...targetPl.tracks, track];
      const updatedPl = {
        ...targetPl,
        tracks: updatedTracks,
        updatedAt: new Date().toISOString(),
        // Track has no coverUrl — keep the playlist's existing cover
        coverUrl: targetPl.coverUrl,
      };
      const next = [...prev];
      next[idx] = updatedPl;
      saveStoredPlaylists(next);
      showToast(`Added "${track.title}" to "${targetPl.name}"!`);
      return next;
    });
  }, []);

  const handleCreateTierList = useCallback((name: string, description?: string) => {
    const newTierList: TierList = {
      id: `tl_${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    };
    setTierLists((prev) => {
      const updated = [...prev, newTierList];
      saveStoredTierLists(updated);
      return updated;
    });
    showToast(`Tier list "${name}" created!`);
    return newTierList;
  }, []);

  const handleDeleteTierList = useCallback((tierListId: string) => {
    setTierLists((prev) => {
      const filtered = prev.filter((t) => t.id !== tierListId);
      saveStoredTierLists(filtered);
      return filtered;
    });
    showToast("Tier list deleted.", "info");
  }, []);

  const handleUpdateTierList = useCallback((updated: TierList) => {
    setTierLists((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updated;
      saveStoredTierLists(next);
      return next;
    });
  }, []);

  const handleLibraryRestored = () => {
    const loadedAlbums = getStoredAlbums();
    const loadedPlaylists = getStoredPlaylists();
    const loadedTierLists = getStoredTierLists();
    const loadedHistory = getStoredHistory();
    // Same single-axis migration as initial load (legacy likes → tier A).
    let migrated = false;
    for (const a of loadedAlbums) {
      if (a.isFavorite) {
        if (!a.tier) {
          a.tier = "A";
          migrated = true;
        }
        a.isFavorite = false;
        migrated = true;
      }
    }
    if (migrated) saveStoredAlbums(loadedAlbums);
    setAlbums(loadedAlbums);
    setPlaylists(loadedPlaylists);
    setTierLists(loadedTierLists);
    setHistory(loadedHistory);
    showToast("Vault collection restored successfully!");
  };

  return (
    <PlayerProvider>
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950 font-sans">
        {/* Sleek Minimal Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onResetSearch={handleResetToSearch}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div role="status" className="fixed top-16 right-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg bg-stone-900 border border-amber-500/40 text-stone-100 text-xs shadow-2xl animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        )}

        {/* Main Content Area: active tab only (code-split per tab for fast first paint) */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-5 pb-36 sm:pb-12">
          <UpdateBanner />
          <Suspense fallback={tabFallback}>
          {activeTab === "search" && (
            <SearchView
              onCaptureAlbum={handleAlbumCaptured}
              onSelectAlbumForDetail={handleSelectAlbumForDetail}
              existingAlbumIds={existingAlbumIds}
              vaultAlbums={albums}
              resetKey={searchResetKey}
              onOpenArtistDiscography={(artist) => setDiscographyArtist(artist)}
              initialSearch={externalSearchQuery}
            />
          )}

          {activeTab === "discover" && (
            <DiscoverView
              onCaptureAlbum={handleAlbumCaptured}
              onSelectAlbumForDetail={handleSelectAlbumForDetail}
              existingAlbumIds={existingAlbumIds}
              onOpenArtistDiscography={(artist) => setDiscographyArtist(artist)}
            />
          )}

          {activeTab === "vault" && (
            <LibraryView
              albums={albums}
              playlists={playlists}
              tierLists={tierLists}
              onSelectAlbum={handleSelectAlbumForDetail}
              onUpdateAlbum={handleUpdateAlbum}
              onDeleteAlbum={handleDeleteAlbum}
              onOpenCaptureModal={() => setIsCaptureModalOpen(true)}
              onOpenBackupModal={() => setIsBackupModalOpen(true)}
              onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
              onAddTrackToPlaylist={handleAddTrackToPlaylist}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onUpdatePlaylist={handleUpdatePlaylist}
              onCreateTierList={handleCreateTierList}
              onDeleteTierList={handleDeleteTierList}
              onUpdateTierList={handleUpdateTierList}
              onShowToast={showToast}
              onOpenArtistDiscography={(artist) => setDiscographyArtist(artist)}
            />
          )}
          </Suspense>
        </main>

        {/* Archival Information Footer */}
        <footer className="w-full border-t border-stone-900 bg-stone-950/80 py-8 px-4 pb-44 sm:pb-28 text-center select-none">
          <div className="max-w-md mx-auto flex flex-col items-center space-y-2">
            <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400/80 shadow-inner">
              <ArchiveLogo className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-stone-300">
                ArchiveTuna
              </h3>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed">
                Free forever, built solo. If the music moves you, a small donation keeps the tapes spinning and the app growing.
              </p>
              <a
                href="https://github.com/sponsors/cyberbuddhy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 mt-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-rose-500/50 text-[11px] font-medium text-stone-400 hover:text-rose-400 transition-colors"
                title="Support ArchiveTuna development"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Sponsor ArchiveTuna</span>
              </a>
            </div>
          </div>
        </footer>

        {/* Persistent Audio Player Bar (lazy: not needed for first paint) */}
        <Suspense fallback={null}>
        <PlayerBar
          onSelectAlbumForDetail={handleSelectAlbumForDetail}
          onOpenArtistDiscography={(artist) => setDiscographyArtist(artist)}
          onToggleSaveAlbum={handleToggleSaveAlbumFromPlayer}
          isAlbumSaved={(id) => existingAlbumIds.has(id)}
        />
        </Suspense>

        {/* Spotify-Style Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onResetSearch={handleResetToSearch}
        />

        {/* Lazy modals: chunks load only when opened */}
        <Suspense fallback={null}>
        {/* Capture Album Modal */}
        <CaptureModal
          isOpen={isCaptureModalOpen}
          onClose={() => setIsCaptureModalOpen(false)}
          onAlbumCaptured={handleAlbumCaptured}
          existingAlbumIds={existingAlbumIds}
        />

        {/* Backup & Dump Modal */}
        <DumpBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          albums={albums}
          playlists={playlists}
          onLibraryRestored={handleLibraryRestored}
        />

        {/* Album Details & Tracks Modal */}
        <AlbumDetailModal
          album={detailAlbum}
          isOpen={!!detailAlbum}
          onClose={() => { setDetailAlbum(null); setSharedMix(null); }}
          onUpdateAlbum={handleUpdateAlbum}
          onDeleteAlbum={handleDeleteAlbum}
          playlists={playlists}
          onAddTrackToPlaylist={handleAddTrackToPlaylist}
          onOpenArtistDiscography={(artist) => setDiscographyArtist(artist)}
          tierLists={tierLists}
          onUpdateTierList={handleUpdateTierList}
          onCreateTierList={handleCreateTierList}
          vaultAction={sharedMix ? { label: "Add playlist to my vault", onAction: handleSaveSharedMix } : undefined}
          isInVault={
            !!detailAlbum &&
            (existingAlbumIds.has(detailAlbum.id) ||
              (!!detailAlbum.identifier && existingAlbumIds.has(detailAlbum.identifier)))
          }
        />

        {/* Global Artist Discography Modal */}
        {discographyArtist && (
          <ArtistDiscographyModal
            artistName={discographyArtist}
            isOpen={!!discographyArtist}
            onClose={() => setDiscographyArtist(null)}
            onSelectAlbum={async (identifier) => {
              try {
                const full = await fetchAlbumDetails(identifier);
                handleSelectAlbumForDetail(full);
              } catch (err) {
                console.error("Failed to load album details:", err);
              }
            }}
            onCaptureToLibrary={handleAlbumCaptured}
            isAlbumInLibrary={(id) => existingAlbumIds.has(id)}
            onSearchQuery={(q, field) => {
              setDiscographyArtist(null);
              setDetailAlbum(null);
              setExternalSearchQuery({ query: q, field });
              setActiveTab("search");
            }}
          />
        )}

        {/* Vault & Player Settings Modal (includes Atmosphere & Palette, Audio Engine, Vault Storage) */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          activeThemeId={themeId}
          onSelectTheme={handleSelectTheme}
          albums={albums}
          playlists={playlists}
          onLibraryRestored={handleLibraryRestored}
          onShowToast={showToast}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        />

        {/* Keyboard Navigation & Shortcuts Guide Modal */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />

        {/* First-run onboarding tour */}
        {showOnboarding && (
          <Suspense fallback={null}>
            <OnboardingModal
              onDone={() => {
                markOnboardingDone();
                setShowOnboarding(false);
              }}
            />
          </Suspense>
        )}
        </Suspense>
      </div>
    </PlayerProvider>
  );
}
