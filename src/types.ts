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
  notes?: string;
}

export type TierRank = "S" | "A" | "B" | "C" | "D" | "F";

export interface TierItem {
  albumId: string;
  rank: TierRank;
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

export interface LibraryDump {
  version: "1.0";
  exportedAt: string;
  appName: "ArchiveTuna";
  albums: Album[];
  playlists: Playlist[];
  tierLists?: TierList[];
  listenHistory: ListenHistoryItem[];
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
