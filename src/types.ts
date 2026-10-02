export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  trackNumber: number;
  duration: number; // in seconds
  streamUrl: string;
  audioUrl?: string;
  format?: string;
  filename?: string;
  size?: number;
  userRating?: number; // 1-5
  playCount?: number; // listen-history plays, attached by smart mixes only
  isFavorite?: boolean; // loved song (explicit or via loved album)
  notes?: string;
}

// One loved-song entry: explicit toggle and/or contributing loved albums.
// A track counts as loved while NOT muted AND (explicit OR >=1 album).
// Unliking a derived love mutes it so it stays out of Liked Songs.
export interface LovedTrackEntry {
  track: Track;
  explicit: boolean;
  albumIds: string[];
  muted: boolean;
}

export type TierRank = "S" | "A" | "B" | "C" | "D" | "F";

export interface TierItem {
  albumId: string;
  // Absent = waiting in the unrated tray below F, not ranked yet
  rank?: TierRank;
  albumTitle: string;
  artist: string;
  coverUrl?: string;
  year?: string;
  addedAt?: string;
}

export interface TierList {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  items: TierItem[];
}

export interface Album {
  id: string; // Archive.org identifier or unique id
  identifier: string;
  title: string;
  artist: string;
  year?: string;
  description?: string;
  coverUrl?: string;
  archiveUrl?: string;
  collection?: string;
  genre?: string;
  tracks: Track[];
  source: string; // "Archive.org" or "Direct Stream" etc.
  capturedAt: string; // ISO date
  userNotes?: string;
  userRating?: number; // 1-5 (legacy)
  tier?: TierRank; // S, A, B, C, D, F
  tags?: string[];
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tracks: Track[];
  coverUrl?: string;
}

export interface ListenHistoryItem {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  genre?: string;
  year?: string;
  collection?: string;
  listenedAt: string;
  duration: number;
}

export interface DiscoveryItem {
  artistOrProject: string;
  albumOrShowTitle: string;
  archiveSearchQuery: string;
  reason: string;
  category: string;
  tags?: string[];
}

export interface LiveArchivedMatch {
  id: string;
  identifier: string;
  title: string;
  artist: string;
  year?: string;
  coverUrl?: string;
  archiveUrl?: string;
  downloads?: number;
  discoveryCategory?: string;
  recommendationReason?: string;
  tags?: string[];
}

export interface DiscoveryResponse {
  profile: string;
  recommendedCollections: string[];
  discoveries: DiscoveryItem[];
  liveArchivedMatches: LiveArchivedMatch[];
}

import type { PlayerSettings } from "./services/playerSettings";

export interface LibraryDump {
  version: "1.0" | "2.0";
  exportedAt: string;
  appName: "ArchiveTuna";
  albums: Album[];
  playlists: Playlist[];
  tierLists?: TierList[];
  listenHistory: ListenHistoryItem[];
  // v2 session slices (absent in v1 dumps) — full 1:1 session restore
  playerSettings?: PlayerSettings;
  searchHistory?: string[];
  themeId?: string;
  lovedTracks?: Record<string, LovedTrackEntry>;
  dismissedMixes?: Record<string, string>;
  capsuleOffset?: number;
  metadata: {
    totalAlbums: number;
    totalTracks: number;
    totalPlaylists: number;
    userNoteCount: number;
  };
}

export type SearchFieldType = "all" | "artist" | "title" | "genre";
export type SearchCollectionType =
  | "all"
  | "etree"
  | "georgeblood78s"
  | "netlabels"
  | "audio_music"
  | "opensource_audio"
  | "hiphopmixtapes"
  | "flac"
  | "vbr_mp3";
export type SearchEraType =
  | "all"
  | "2020s"
  | "2010s"
  | "2000s"
  | "1990s"
  | "1980s"
  | "1970s"
  | "1960s"
  | "1950s"
  | "vintage";

export interface SearchFiltersState {
  field: SearchFieldType;
  collection: SearchCollectionType;
  era: SearchEraType;
  sort: string;
}

export interface MatchedArtist {
  id: string;
  name: string;
  score?: number;
  type?: string;
  country?: string;
  disambiguation?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  tags?: string[];
  coverUrl?: string;
}

export interface MusicBrainzArtist {
  id: string;
  name: string;
  country?: string;
  type?: string;
  disambiguation?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  tags?: string[];
}

export interface OfficialRelease {
  id: string;
  title: string;
  primaryType: "Album" | "Single" | "EP" | "Broadcast" | "Other" | string;
  secondaryTypes?: string[];
  firstReleaseDate?: string;
  year?: string;
  coverUrl?: string;
}

export interface ArchiveLiveTape {
  id: string;
  identifier: string;
  title: string;
  artist: string;
  year?: string;
  date?: string;
  downloads?: number;
  collection?: string;
  coverUrl?: string;
  description?: string;
}

export interface ArtistDiscographyData {
  artist: MusicBrainzArtist;
  officialAlbums: OfficialRelease[];
  officialEPs: OfficialRelease[];
  officialSingles: OfficialRelease[];
  officialOther?: OfficialRelease[];
  singlesAndEPs: OfficialRelease[];
  officialLiveReleases?: OfficialRelease[];
  liveTapes: ArchiveLiveTape[];
  totalLiveTapes: number;
}
