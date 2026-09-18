import React, { useState, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Disc3,
  Loader2,
  ChevronUp,
  ChevronDown,
  Trash2,
  Heart,
  Download,
  Shuffle,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Gauge,
  Music,
  X,
  Database,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { Album } from "../types";
import { fetchAlbumDetails } from "../services/api";
import { downloadAlbumZip, downloadTrackAudio } from "../utils/download";
import { Waveform } from "./Waveform";
import { formatTime } from "../utils/format";
import { getStoredPlayerSettings, savePlayerSettings } from "../services/playerSettings";

interface PlayerBarProps {
  onSelectAlbumForDetail?: (album: Album) => void;
  onOpenArtistDiscography?: (artistName: string) => void;
  onToggleFavoriteAlbum?: (album: Album) => void;
  isAlbumFavorite?: (albumId: string) => boolean;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

export const PlayerBar: React.FC<PlayerBarProps> = ({
  onSelectAlbumForDetail,
  onOpenArtistDiscography,
  onToggleFavoriteAlbum,
  isAlbumFavorite,
}) => {
  const {
    currentTrack,
    currentAlbum,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    playbackRate,
    togglePlay,
    seek,
    skipSeconds,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    setPlaybackRate,
    nextTrack,
    prevTrack,
    removeFromQueue,
    clearQueue,
    playTrack,
    isCurrentTrackOffline,
    isOfflineDownloading,
    togglePinCurrentTrack,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [autoplay, setAutoplay] = useState(() => !!getStoredPlayerSettings().radioInfinite);
  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    savePlayerSettings({ radioInfinite: next });
  };
  const autoplayPill = (
    <button
      type="button"
      onClick={toggleAutoplay}
      title={autoplay ? "Autoplay on: related tracks keep playing" : "Autoplay off"}
      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
        autoplay
          ? "bg-amber-500 text-stone-950 border-amber-500"
          : "bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200"
      }`}
    >
      Autoplay {autoplay ? "On" : "Off"}
    </button>
  );
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const mobileScrubberRef = useRef<HTMLDivElement | null>(null);
  const miniPlayerTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const queueTouchRef = useRef<{ y: number; time: number } | null>(null);
  const fullPlayerTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);

  if (!currentTrack) return null;

  const activeAlbumId = currentAlbum?.id || currentTrack.albumId;
  const isFav = activeAlbumId ? isAlbumFavorite?.(activeAlbumId) : false;

  const formatTimeLabel = (secs: number) => formatTime(secs, "0:00");

  const handleAlbumClick = async () => {
    if (!onSelectAlbumForDetail) return;
    const targetId = currentAlbum?.id || currentTrack.albumId;
    if (currentAlbum && currentAlbum.tracks && currentAlbum.tracks.length > 0) {
      onSelectAlbumForDetail(currentAlbum);
    } else if (targetId) {
      setIsFetchingDetail(true);
      try {
        const full = await fetchAlbumDetails(targetId);
        onSelectAlbumForDetail(full);
      } catch (err) {
        console.error("Failed to load album details:", err);
        if (currentAlbum) onSelectAlbumForDetail(currentAlbum);
      } finally {
        setIsFetchingDetail(false);
      }
    }
  };

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const artist = currentTrack.artist || currentAlbum?.artist;
    if (artist && onOpenArtistDiscography) {
      onOpenArtistDiscography(artist);
      setIsMobileExpanded(false);
    }
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleFavoriteAlbum) return;
    if (currentAlbum) {
      onToggleFavoriteAlbum(currentAlbum);
    } else if (currentTrack) {
      const fallbackAlbum: Album = {
        id: currentTrack.albumId || `arch_${Date.now()}`,
        identifier: currentTrack.albumId || currentTrack.id,
        title: currentTrack.album || currentTrack.title,
        artist: currentTrack.artist,
        coverUrl: "https://archive.org/images/notfound.png",
        archiveUrl: `https://archive.org/details/${currentTrack.albumId || currentTrack.id}`,
        capturedAt: new Date().toISOString(),
        source: "Archive.org",
        tracks: [currentTrack],
        isFavorite: true,
      };
      onToggleFavoriteAlbum(fallbackAlbum);
    }
  };

  const handleDownloadAlbum = (e: React.MouseEvent) => {
    if (!activeAlbumId) return;
    downloadAlbumZip(activeAlbumId, currentAlbum?.title || currentTrack.album, e);
  };

  // Scrubber hover handlers for desktop
  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = x / rect.width;
    setHoverTime(percent * duration);
    setHoverPosition(x);
  };

  const handleScrubberMouseLeave = () => {
    setHoverTime(null);
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = x / rect.width;
    seek(percent * duration);
  };

  const handleMobileScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mobileScrubberRef.current || !duration) return;
    const rect = mobileScrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = x / rect.width;
    seek(percent * duration);
  };

  // Mobile gesture handling: Swipe on mini player for next/prev song and opening queue
  const handleMiniPlayerTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      miniPlayerTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleMiniPlayerTouchEnd = (e: React.TouchEvent) => {
    if (!miniPlayerTouchRef.current || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - miniPlayerTouchRef.current.x;
    const diffY = touch.clientY - miniPlayerTouchRef.current.y;
    const durationMs = Date.now() - miniPlayerTouchRef.current.time;
    miniPlayerTouchRef.current = null;

    if (durationMs > 650) return;

    // Swipe up: Open queue
    if (diffY < -35 && Math.abs(diffY) > Math.abs(diffX) * 1.2) {
      setShowQueue(true);
      return;
    }

    // Horizontal swipe: Next / Prev song
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
      if (diffX < 0) {
        nextTrack();
      } else {
        prevTrack();
      }
    }
  };

  // Scroll wheel support on mini player to change tracks or open queue
  const handleMiniPlayerWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 40) {
      if (e.deltaX > 0) {
        nextTrack();
      } else {
        prevTrack();
      }
    } else if (e.deltaY < -40) {
      setShowQueue(true);
    }
  };

  // Mobile queue touch handlers: Swipe down to hide/dismiss queue
  const handleQueueTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      queueTouchRef.current = {
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleQueueTouchEnd = (e: React.TouchEvent) => {
    if (!queueTouchRef.current || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const diffY = touch.clientY - queueTouchRef.current.y;
    const durationMs = Date.now() - queueTouchRef.current.time;
    queueTouchRef.current = null;

    // Swipe down to dismiss queue
    if (diffY > 50 && durationMs < 650) {
      setShowQueue(false);
    }
  };

  // Full player touch handlers: Swipe down to close, swipe left/right for next/prev
  const handleFullPlayerTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      fullPlayerTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleFullPlayerTouchEnd = (e: React.TouchEvent) => {
    if (!fullPlayerTouchRef.current || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - fullPlayerTouchRef.current.x;
    const diffY = touch.clientY - fullPlayerTouchRef.current.y;
    const durationMs = Date.now() - fullPlayerTouchRef.current.time;
    fullPlayerTouchRef.current = null;

    if (durationMs > 700) return;

    // Swipe down: dismiss full player
    if (diffY > 60 && Math.abs(diffY) > Math.abs(diffX) * 1.3) {
      setIsMobileExpanded(false);
      return;
    }

    // Swipe left: next track
    if (diffX < -50 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      nextTrack();
      return;
    }

    // Swipe right: prev track
    if (diffX > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      prevTrack();
      return;
    }
  };

  const progressPercent = duration > 0 && !isNaN(currentTime) && !isNaN(duration) ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // Remaining queue time calculation
  const remainingQueueTime = (queue || [])
    .slice(queueIndex + 1)
    .reduce((acc, t) => acc + (t?.duration || 0), 0);

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. SPOTIFY-STYLE MOBILE FULL-SCREEN NOW PLAYING MODAL (visible when expanded) */}
      {/* ========================================================================= */}
      {isMobileExpanded && (
        <div
          id="spotify-mobile-fullscreen-player"
          onTouchStart={handleFullPlayerTouchStart}
          onTouchEnd={handleFullPlayerTouchEnd}
          className="fixed inset-0 z-50 bg-stone-950 text-stone-100 flex flex-col justify-between p-5 pb-8 sm:hidden select-none animate-in slide-in-from-bottom duration-200 touch-pan-y"
        >
          {/* Subtle swipe-down handle */}
          <div className="w-10 h-1 rounded-full bg-stone-700/80 mx-auto -mt-1 mb-1 cursor-grab shrink-0" />

          {/* Header Row */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setIsMobileExpanded(false)}
              className="p-2 text-stone-400 hover:text-stone-100 rounded-full cursor-pointer"
              title="Collapse"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="text-center min-w-0 px-2 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">
                PLAYING FROM VAULT
              </span>
              <span className="text-xs font-semibold text-stone-200 truncate block">
                {currentAlbum?.title || currentTrack.album || "Archive.org Audio"}
              </span>
            </div>

            <button
              onClick={handleHeartClick}
              className={`p-2 rounded-full cursor-pointer transition-colors ${
                isFav ? "text-rose-500" : "text-stone-400 hover:text-stone-200"
              }`}
              title={isFav ? "Liked" : "Like"}
            >
              <Heart className={`w-5 h-5 ${isFav ? "fill-rose-500" : ""}`} />
            </button>
          </div>

          {/* Large Album Artwork */}
          <div className="my-auto py-4 flex flex-col items-center">
            <div
              onClick={handleAlbumClick}
              className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-[0_15px_40px_rgba(0,0,0,0.8)] relative group cursor-pointer"
            >
              {currentAlbum?.coverUrl ? (
                <img
                  src={currentAlbum.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-600">
                  <Disc3 className="w-24 h-24" />
                </div>
              )}
              {isFetchingDetail && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
              )}
            </div>
          </div>

          {/* Track Info & Scrubber & Controls */}
          <div className="space-y-4">
            {/* Title & Artist & Quick Info */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-lg font-bold text-stone-100 truncate">
                  {currentTrack.title}
                </h3>
                <button
                  type="button"
                  onClick={handleArtistClick}
                  className="text-sm font-medium text-stone-400 hover:text-amber-400 truncate text-left block"
                >
                  {currentTrack.artist}
                </button>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                {isCurrentTrackOffline && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center space-x-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Offline</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={togglePinCurrentTrack}
                  disabled={isOfflineDownloading}
                  className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                    isCurrentTrackOffline
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : "bg-stone-900 border-stone-800 text-stone-400 hover:text-emerald-400"
                  }`}
                  title={isCurrentTrackOffline ? "Stored in offline cache" : "Pin offline"}
                >
                  {isOfflineDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : (
                    <Database className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-amber-400 font-semibold">
                  {currentTrack.format || "MP3"}
                </span>
              </div>
            </div>

            {/* Scrubber Bar */}
            <div className="space-y-1">
              <div
                ref={mobileScrubberRef}
                onClick={handleMobileScrubberClick}
                className="relative w-full h-3 flex items-center cursor-pointer select-none"
              >
                <div className="w-full h-1.5 bg-stone-850 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-accent-main)] rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div
                  className="absolute w-3.5 h-3.5 rounded-full bg-stone-100 shadow-sm pointer-events-none -ml-1.5"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
                <span>{formatTimeLabel(currentTime)}</span>
                <span>{formatTimeLabel(duration)}</span>
              </div>
            </div>

            {/* Playback Controls Row (Spotify Style) */}
            <div className="flex items-center justify-between pt-1">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full cursor-pointer relative ${
                  isShuffle ? "text-amber-400" : "text-stone-400 hover:text-stone-200"
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
                {isShuffle && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
                )}
              </button>

              {/* Prev */}
              <button
                onClick={prevTrack}
                className="p-2 text-stone-200 hover:text-white cursor-pointer"
                title="Previous"
              >
                <SkipBack className="w-6 h-6" />
              </button>

              {/* Big Play/Pause Button */}
              <button
                onClick={togglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="w-16 h-16 rounded-full bg-[var(--color-accent-main)] text-stone-950 flex items-center justify-center shadow-[0_0_25px_-5px_var(--color-accent-main)] active:scale-95 transition-transform cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7 fill-stone-950" />
                ) : (
                  <Play className="w-7 h-7 fill-stone-950 ml-1" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={nextTrack}
                className="p-2 text-stone-200 hover:text-white cursor-pointer"
                title="Next"
              >
                <SkipForward className="w-6 h-6" />
              </button>

              {/* Repeat */}
              <button
                onClick={cycleRepeatMode}
                className={`p-2 rounded-full cursor-pointer relative ${
                  repeatMode !== "off" ? "text-amber-400" : "text-stone-400 hover:text-stone-200"
                }`}
                title="Repeat"
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
                {repeatMode !== "off" && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
                )}
              </button>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-850/80">
              <button
                onClick={() => skipSeconds(-10)}
                className="p-2 text-stone-400 hover:text-amber-400 flex items-center space-x-1 text-xs"
                title="Rewind 10s"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="font-mono text-[10px]">-10s</span>
              </button>

              <button
                onClick={() => {
                  const nextRates = [0.75, 1.0, 1.25, 1.5, 2.0];
                  const curIdx = nextRates.indexOf(playbackRate);
                  const nextRate = nextRates[(curIdx + 1) % nextRates.length];
                  setPlaybackRate(nextRate);
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 font-mono text-xs font-semibold"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              <button
                onClick={() => skipSeconds(10)}
                className="p-2 text-stone-400 hover:text-amber-400 flex items-center space-x-1 text-xs"
                title="Fast forward 10s"
              >
                <RotateCw className="w-4 h-4" />
                <span className="font-mono text-[10px]">+10s</span>
              </button>

              {currentTrack.streamUrl && (
                <button
                  onClick={(e) =>
                    downloadTrackAudio(
                      currentTrack.streamUrl,
                      `${currentTrack.artist} - ${currentTrack.title}`,
                      e
                    )
                  }
                  className="p-2 text-stone-400 hover:text-amber-400"
                  title="Download track"
                >
                  <Download className="w-4.5 h-4.5" />
                </button>
              )}

              <button
                onClick={() => setShowQueue(!showQueue)}
                className={`p-2 rounded-lg cursor-pointer ${
                  showQueue ? "text-amber-400" : "text-stone-400 hover:text-stone-200"
                }`}
                title="Queue"
              >
                <ListMusic className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SPOTIFY-STYLE FLOATING MINI PLAYER ON MOBILE (floats right above bottom nav) */}
      {/* ========================================================================= */}
      <div
        id="spotify-mobile-mini-player"
        onTouchStart={handleMiniPlayerTouchStart}
        onTouchEnd={handleMiniPlayerTouchEnd}
        onWheel={handleMiniPlayerWheel}
        className="sm:hidden fixed bottom-18 left-2 right-2 z-40 bg-stone-900/95 backdrop-blur-2xl border border-stone-800/90 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.8)] overflow-hidden select-none touch-pan-x cursor-pointer"
        title="Swipe left/right for next/prev song • Swipe up for queue"
      >
        {/* Slim progress bar along top */}
        <div className="w-full h-1 bg-stone-800/80">
          <div
            className="h-full bg-[var(--color-accent-main)] transition-[width] duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="px-3 py-2 flex items-center justify-between gap-3">
          {/* Tapping anywhere on track info expands full-screen Spotify player */}
          <div
            onClick={() => setIsMobileExpanded(true)}
            className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-950 border border-stone-800 shrink-0">
              {currentAlbum?.coverUrl ? (
                <img
                  src={currentAlbum.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-600">
                  <Disc3 className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-stone-100 truncate">
                {currentTrack.title}
              </h4>
              <p className="text-[11px] text-stone-400 truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Quick Mini Controls */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQueue(!showQueue);
              }}
              className={`p-2 transition-colors cursor-pointer rounded-lg ${
                showQueue ? "text-amber-400 bg-stone-800" : "text-stone-400 hover:text-stone-200"
              }`}
              title="Queue (Swipe up on player)"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            <button
              onClick={handleHeartClick}
              className={`p-2 transition-colors cursor-pointer ${
                isFav ? "text-rose-500" : "text-stone-400 hover:text-stone-200"
              }`}
              title="Like"
            >
              <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500" : ""}`} />
            </button>

            <button
              onClick={togglePlay}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-9 h-9 rounded-full bg-[var(--color-accent-main)] hover:bg-[var(--color-accent-light)] text-stone-950 flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-stone-950" />
              ) : (
                <Play className="w-4 h-4 fill-stone-950 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.5. DEDICATED SPOTIFY-STYLE MOBILE QUEUE SHEET (Visible on mobile when showQueue is true) */}
      {/* ========================================================================= */}
      {showQueue && (
        <div
          id="spotify-mobile-queue-sheet"
          onTouchStart={handleQueueTouchStart}
          onTouchEnd={handleQueueTouchEnd}
          className="sm:hidden fixed inset-0 z-[60] bg-stone-950/98 backdrop-blur-2xl flex flex-col justify-between select-none animate-in slide-in-from-bottom duration-200 touch-pan-y"
        >
          {/* Drag handle to swipe down & close */}
          <div
            onClick={() => setShowQueue(false)}
            className="w-full py-1.5 flex justify-center cursor-grab active:cursor-grabbing bg-stone-950/80"
          >
            <div className="w-12 h-1 rounded-full bg-stone-700 hover:bg-stone-500 transition-colors" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-stone-850 bg-stone-950/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ListMusic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-100">Play Queue</h3>
                <p className="text-[11px] text-stone-400">
                  {queue.length} {queue.length === 1 ? "track" : "tracks"}
                  {remainingQueueTime > 0 && ` • ~${formatTimeLabel(remainingQueueTime)} remaining`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {autoplayPill}
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="px-2.5 py-1 text-xs font-semibold text-stone-400 hover:text-red-400 bg-stone-900 border border-stone-800 rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowQueue(false)}
                className="p-1.5 text-stone-400 hover:text-stone-100 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer"
                title="Close queue"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Now Playing Banner */}
          <div className="px-4 py-2.5 bg-amber-500/10 border-b border-stone-850 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 shrink-0">
                Now Playing
              </span>
              <span className="text-xs font-semibold text-stone-200 truncate">
                {currentTrack.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-stone-400 shrink-0">
              {formatTimeLabel(currentTime)} / {formatTimeLabel(duration)}
            </span>
          </div>

          {/* Scrollable Queue Track List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-1 divide-y divide-stone-900">
            {queue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
                <ListMusic className="w-12 h-12 text-stone-700 mb-2" />
                <p className="text-sm font-semibold text-stone-300">Your queue is empty</p>
                <p className="text-xs text-stone-500 mt-1 max-w-xs">
                  Tap any track in your Vault, Search, or Discover to queue songs up for continuous listening.
                </p>
              </div>
            ) : (
              (queue || []).map((track, i) => {
                if (!track) return null;
                const isCurrent = i === queueIndex;
                return (
                  <div
                    key={`mobile_q_${track.id || i}_${i}`}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-xs transition-colors ${
                      isCurrent
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-sm"
                        : "text-stone-200 hover:bg-stone-900/80 border border-transparent"
                    }`}
                  >
                    <div
                      onClick={() => playTrack(track, currentAlbum || undefined)}
                      className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer pr-2"
                    >
                      <span className="text-stone-500 text-[11px] font-mono w-5 text-center shrink-0">
                        {isCurrent && isPlaying ? (
                          <span className="flex items-center justify-center space-x-0.5">
                            <span className="w-0.5 h-3 bg-amber-400 animate-pulse" />
                            <span className="w-0.5 h-4 bg-[var(--color-secondary-main)] animate-pulse delay-75" />
                            <span className="w-0.5 h-2 bg-amber-400 animate-pulse delay-150" />
                          </span>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="truncate font-semibold block text-stone-100">{track.title}</span>
                        <span className="text-[11px] text-stone-400 truncate block mt-0.5">{track.artist}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-mono text-stone-400">
                        {formatTimeLabel(track.duration)}
                      </span>
                      {track.streamUrl && (
                        <button
                          type="button"
                          onClick={(e) =>
                            downloadTrackAudio(track.streamUrl, `${track.artist} - ${track.title}`, e)
                          }
                          className="p-1.5 text-stone-400 hover:text-amber-400 cursor-pointer"
                          title="Download MP3"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFromQueue(i)}
                        className="p-1.5 text-stone-400 hover:text-red-400 cursor-pointer"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-3.5 border-t border-stone-850 bg-stone-950 flex items-center justify-between text-xs">
            <span className="text-[11px] text-stone-400">
              Tap any track to play immediately
            </span>
            <button
              type="button"
              onClick={() => setShowQueue(false)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl shadow transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DESKTOP MODERN AUDIO PLAYER BAR (Standard bottom dock for screens >= sm) */}
      {/* ========================================================================= */}
      <div
        id="modern-audio-player-bar"
        className="hidden sm:block fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-2xl border-t border-stone-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
      >
        {/* Desktop Queue Drawer */}
        {showQueue && (
          <div
            id="player-queue-drawer"
            className="max-h-80 overflow-y-auto border-b border-stone-800 bg-stone-950/95 backdrop-blur-2xl p-4 divide-y divide-stone-850"
          >
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <ListMusic className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
                    Up Next in Queue
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {queue.length} {queue.length === 1 ? "track" : "tracks"}
                    {remainingQueueTime > 0 && ` • ~${formatTimeLabel(remainingQueueTime)} remaining`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
              {autoplayPill}
              <button
                onClick={clearQueue}
                className="px-2 py-1 text-[11px] font-medium text-stone-400 hover:text-red-400 bg-stone-900 hover:bg-stone-850 rounded-lg border border-stone-800 transition-colors cursor-pointer"
              >
                Clear Queue
              </button>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              {(queue || []).map((track, i) => {
                if (!track) return null;
                const isCurrent = i === queueIndex;
                return (
                  <div
                    key={`desk_q_${track.id || i}_${i}`}
                    className={`flex items-center justify-between py-2 px-2.5 rounded-xl text-xs transition-colors ${
                      isCurrent
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium"
                        : "text-stone-300 hover:bg-stone-900 border border-transparent"
                    }`}
                  >
                    <div
                      onClick={() => playTrack(track)}
                      className="flex items-center space-x-3 truncate cursor-pointer flex-1 mr-2"
                    >
                      <span className="text-stone-500 text-[10px] font-mono w-5 text-center">
                        {isCurrent && isPlaying ? (
                          <span className="flex items-center justify-center space-x-0.5">
                            <span className="w-0.5 h-2.5 bg-amber-400 animate-pulse" />
                            <span className="w-0.5 h-3.5 bg-[var(--color-secondary-main)] animate-pulse delay-75" />
                            <span className="w-0.5 h-1.5 bg-amber-400 animate-pulse delay-150" />
                          </span>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="truncate">{track.title}</span>
                      <span className="text-[11px] text-stone-500 truncate">({track.artist})</span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-mono text-stone-400">
                        {formatTimeLabel(track.duration)}
                      </span>
                      {track.streamUrl && (
                        <button
                          onClick={(e) =>
                            downloadTrackAudio(track.streamUrl, `${track.artist} - ${track.title}`, e)
                          }
                          className="p-1 text-stone-400 hover:text-amber-400 transition-colors cursor-pointer"
                          title="Download Track (MP3)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeFromQueue(i)}
                        className="p-1 text-stone-400 hover:text-red-400 cursor-pointer"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Interactive Desktop Scrubber / Seekbar with Hover Time Tooltip */}
        <div
          ref={scrubberRef}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={handleScrubberMouseLeave}
          onClick={handleScrubberClick}
          className="relative group w-full h-2 bg-stone-900 cursor-pointer select-none"
        >
          {/* Background track */}
          <div className="absolute inset-0 bg-stone-850/80 transition-all group-hover:h-2.5" />

          {/* Solid Progress Fill - No gradient */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-[var(--color-accent-main)] transition-[width] duration-75"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Scrubber Thumb on Hover */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--color-text-main)] shadow-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -ml-1.5"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700 text-stone-200 text-[10px] font-mono shadow-xl pointer-events-none z-50 whitespace-nowrap"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTimeLabel(hoverTime)}
            </div>
          )}
        </div>

        {/* Main Controls Bar */}
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Left Side: Track Details */}
          <div className="flex items-center space-x-3 min-w-0 flex-1 sm:max-w-sm">
            {/* Clickable Album Cover */}
            <div
              onClick={handleAlbumClick}
              className="w-12 h-12 rounded-xl overflow-hidden bg-stone-900 border border-stone-800 shrink-0 relative flex items-center justify-center cursor-pointer group/art hover:border-amber-500/60 transition-all shadow-md"
              title="Click to view album menu & tracks"
            >
              {currentAlbum?.coverUrl ? (
                <img
                  src={currentAlbum.coverUrl}
                  alt={currentTrack.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                  className="w-full h-full object-cover group-hover/art:scale-105 transition-transform duration-300"
                />
              ) : (
                <Disc3 className="w-6 h-6 text-stone-500 group-hover/art:text-amber-400 transition-colors" />
              )}
              {isFetchingDetail && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-semibold text-stone-100 truncate">
                {currentTrack.title}
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400 truncate">
                {/* Clickable Artist */}
                <button
                  type="button"
                  onClick={handleArtistClick}
                  className="hover:text-amber-300 font-medium transition-colors truncate text-left cursor-pointer"
                  title={`Explore ${currentTrack.artist} discography`}
                >
                  {currentTrack.artist}
                </button>
                {/* Clickable Album */}
                {(currentTrack.album || currentAlbum?.title) && (
                  <>
                    <span className="text-stone-600">•</span>
                    <button
                      type="button"
                      onClick={handleAlbumClick}
                      className="hover:text-amber-300 transition-colors truncate text-left cursor-pointer"
                      title="View album details & tracks"
                    >
                      {currentTrack.album || currentAlbum?.title}
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="inline-block text-[9px] uppercase tracking-wider font-semibold text-[var(--color-secondary-main)] bg-[var(--color-secondary-main)]/15 border border-[var(--color-secondary-main)]/30 px-1.5 py-0.5 rounded">
                  {currentTrack.format || "Archive.org Stream"}
                </span>
                {isCurrentTrackOffline && (
                  <span className="inline-flex items-center space-x-1 text-[9px] uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions: Favorite, Offline Pin & Download */}
            <div className="flex items-center space-x-1 shrink-0">
              {/* Local-First Offline Cache Pin Toggle */}
              <button
                id="player-offline-pin-btn"
                type="button"
                onClick={togglePinCurrentTrack}
                disabled={isOfflineDownloading}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isCurrentTrackOffline
                    ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30"
                    : isOfflineDownloading
                    ? "text-amber-400 bg-amber-500/10 animate-pulse"
                    : "text-stone-400 hover:text-emerald-400 hover:bg-stone-900"
                }`}
                title={
                  isCurrentTrackOffline
                    ? "Cached Offline in OPFS / IndexedDB. Click to remove from offline cache"
                    : isOfflineDownloading
                    ? "Caching track for offline flight playback..."
                    : "Pin track offline (IndexedDB / OPFS)"
                }
              >
                {isOfflineDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className={`w-4 h-4 ${isCurrentTrackOffline ? "fill-emerald-500/30" : ""}`} />
                )}
              </button>

              <button
                id="player-heart-btn"
                type="button"
                onClick={handleHeartClick}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isFav
                    ? "text-rose-500 hover:text-rose-400 bg-rose-500/10"
                    : "text-stone-400 hover:text-rose-400 hover:bg-stone-900"
                }`}
                title={isFav ? "Saved as Liked in Vault" : "Like album & save to Vault"}
              >
                <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500" : ""}`} />
              </button>

              {activeAlbumId && (
                <button
                  id="player-download-album-btn"
                  type="button"
                  onClick={handleDownloadAlbum}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-[var(--color-secondary-main)] hover:bg-stone-900 transition-colors cursor-pointer"
                  title="Download album (ZIP)"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Center: Full Modern Streaming Controls */}
          <div className="flex flex-col items-center space-y-1.5">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Shuffle Button */}
              <button
                id="player-shuffle-btn"
                onClick={toggleShuffle}
                className={`p-1.5 rounded-full transition-colors cursor-pointer relative ${
                  isShuffle
                    ? "text-[var(--color-secondary-main)] hover:text-[var(--color-secondary-light)] bg-[var(--color-secondary-main)]/15"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
                }`}
                title={isShuffle ? "Shuffle is ON" : "Shuffle is OFF"}
              >
                <Shuffle className="w-4 h-4" />
                {isShuffle && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--color-secondary-main)] rounded-full" />
                )}
              </button>

              {/* Previous Track */}
              <button
                id="player-prev-btn"
                onClick={prevTrack}
                className="p-1.5 rounded-full text-stone-300 hover:text-stone-100 hover:bg-stone-900 transition-colors cursor-pointer"
                title="Previous (or restart)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Quick Seek -10s */}
              <button
                id="player-skip-back-10"
                onClick={() => skipSeconds(-10)}
                className="p-1.5 rounded-full text-stone-400 hover:text-[var(--color-accent-main)] hover:bg-stone-900 transition-colors cursor-pointer flex items-center justify-center"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Play/Pause Button */}
              <button
                id="player-play-pause-btn"
                onClick={togglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="w-10 h-10 rounded-full bg-[var(--color-accent-main)] hover:bg-[var(--color-accent-light)] text-stone-950 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 fill-stone-950" />
                ) : (
                  <Play className="w-4 h-4 fill-stone-950 ml-0.5" />
                )}
              </button>

              {/* Quick Seek +10s */}
              <button
                id="player-skip-forward-10"
                onClick={() => skipSeconds(10)}
                className="p-1.5 rounded-full text-stone-400 hover:text-[var(--color-accent-main)] hover:bg-stone-900 transition-colors cursor-pointer flex items-center justify-center"
                title="Fast-forward 10 seconds"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Next Track */}
              <button
                id="player-next-btn"
                onClick={nextTrack}
                disabled={queueIndex >= queue.length - 1 && repeatMode !== "all" && !isShuffle}
                className="p-1.5 rounded-full text-stone-300 hover:text-stone-100 hover:bg-stone-900 disabled:opacity-30 transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Repeat Button */}
              <button
                id="player-repeat-btn"
                onClick={cycleRepeatMode}
                className={`p-1.5 rounded-full transition-colors cursor-pointer relative ${
                  repeatMode !== "off"
                    ? "text-[var(--color-secondary-main)] hover:text-[var(--color-secondary-light)] bg-[var(--color-secondary-main)]/15"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
                }`}
                title={`Repeat: ${repeatMode.toUpperCase()}`}
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
                {repeatMode !== "off" && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--color-secondary-main)] rounded-full" />
                )}
              </button>
            </div>

            {/* Time Display */}
            <div className="flex items-center space-x-1.5 text-[11px] font-mono text-stone-400">
              <span className="text-stone-300 font-medium">{formatTimeLabel(currentTime)}</span>
              <span className="text-stone-600">/</span>
              <span>{formatTimeLabel(duration)}</span>
            </div>
          </div>

          {/* Right Side: Speed, Volume & Queue */}
          <div className="flex items-center justify-end space-x-2.5 flex-1 sm:max-w-xs">
            <div className="hidden xl:flex items-center gap-2">
              <Waveform playing={isPlaying} />
            </div>
            {/* Playback Speed Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 rounded-lg text-[10px] font-mono font-semibold bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-amber-400 border border-stone-800 transition-colors cursor-pointer"
                title="Playback speed"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute right-0 bottom-full mb-2 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-1 z-50 flex flex-col space-y-0.5 min-w-[70px]">
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-lg text-left transition-colors cursor-pointer ${
                        playbackRate === rate
                          ? "bg-amber-500 text-stone-950 font-bold"
                          : "text-stone-300 hover:bg-stone-800"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-18 h-1.5 bg-stone-800 rounded-lg accent-amber-500 cursor-pointer"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* Queue Drawer Button */}
            <button
              id="toggle-queue-btn"
              onClick={() => setShowQueue(!showQueue)}
              className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                showQueue
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-stone-900 border-stone-800 text-stone-300 hover:text-stone-100 hover:bg-stone-850"
              }`}
              title="Queue"
            >
              <ListMusic className="w-4 h-4" />
              <span className="hidden lg:inline font-mono text-[11px]">{queue.length}</span>
              {showQueue ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
