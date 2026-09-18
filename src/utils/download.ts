import type React from "react";

/**
 * Utility functions for downloading items and tracks from Archive.org
 */

export const getArchiveAlbumDownloadUrl = (identifier: string): string => {
  return `https://archive.org/compress/${encodeURIComponent(identifier)}`;
};

export const getArchiveDetailsDownloadUrl = (identifier: string): string => {
  return `https://archive.org/download/${encodeURIComponent(identifier)}`;
};

export const downloadAlbumZip = (identifier: string, albumTitle?: string, e?: React.MouseEvent) => {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const url = getArchiveAlbumDownloadUrl(identifier);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (albumTitle) {
    a.download = `${albumTitle.replace(/[/\\?%*:|"<>]/g, "-")}.zip`;
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadTrackAudio = (audioUrl: string, trackTitle?: string, e?: React.MouseEvent) => {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const a = document.createElement("a");
  a.href = audioUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (trackTitle) {
    a.download = `${trackTitle.replace(/[/\\?%*:|"<>]/g, "-")}.mp3`;
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
