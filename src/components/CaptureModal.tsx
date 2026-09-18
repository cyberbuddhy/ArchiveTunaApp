import React, { useState } from "react";
import { X, DownloadCloud, Music, AlertCircle, CheckCircle2, Loader2, Link2, ExternalLink } from "lucide-react";
import { ingestUrl, IngestQuality } from "../services/ingest";
import { Album } from "../types";

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlbumCaptured: (album: Album) => void;
  existingAlbumIds: Set<string>;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onAlbumCaptured,
  existingAlbumIds,
}) => {
  const [inputUrl, setInputUrl] = useState("");
  const [quality, setQuality] = useState<IngestQuality>("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAlbum, setPreviewAlbum] = useState<Album | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setPreviewAlbum(null);
    setSuccessMessage(null);

    try {
      const album = await ingestUrl(inputUrl.trim(), quality);
      setPreviewAlbum(album);
    } catch (err: any) {
      setError(err.message || "Failed to capture album from URL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLibrary = () => {
    if (!previewAlbum) return;
    onAlbumCaptured(previewAlbum);
    setSuccessMessage(`"${previewAlbum.title}" saved to your private library!`);
    setTimeout(() => {
      onClose();
      setInputUrl("");
      setPreviewAlbum(null);
      setSuccessMessage(null);
    }, 1200);
  };

  const isAlreadyInLibrary = previewAlbum ? existingAlbumIds.has(previewAlbum.id) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        id="capture-modal-container"
        className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <DownloadCloud className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-stone-100">Capture Music Album</h2>
          </div>
          <button
            id="close-capture-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <p className="text-sm text-stone-400 leading-relaxed">
            Enter any <strong className="text-stone-300">Archive.org details link</strong> (e.g.{" "}
            <code className="px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 text-xs">
              archive.org/details/gd77-05-08...
            </code>
            ), an item identifier, or a direct streaming link. The album and its full tracklist will be captured into your private collection.
          </p>

          <form onSubmit={handleResolve} className="space-y-3">
            <div className="flex gap-2">
              {(["auto", "mp3", "flac"] as IngestQuality[]).map((q) => (
                <button key={q} type="button" onClick={() => setQuality(q)} className={`px-2 py-1 text-[11px] rounded-lg border cursor-pointer ${quality === q ? "bg-amber-500 text-stone-950 border-amber-500 font-bold" : "bg-stone-950 text-stone-400 border-stone-800"}`}>{q.toUpperCase()}</button>
              ))}
              <span className="text-[10px] text-stone-500 self-center">format negotiation · ID3 preserved</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                id="capture-url-input"
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://archive.org/details/identifier or identifier"
                className="w-full pl-10 pr-24 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-sm"
              />
              <button
                id="fetch-album-btn"
                type="submit"
                disabled={isLoading || !inputUrl.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 text-stone-950 disabled:text-stone-600 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <span>Capture</span>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Preview Captured Album */}
          {previewAlbum && (
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="flex space-x-4">
                <img
                  src={previewAlbum.coverUrl || "https://archive.org/images/notfound.png"}
                  alt={previewAlbum.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://archive.org/images/notfound.png";
                  }}
                  className="w-20 h-20 rounded-lg object-cover bg-stone-800 border border-stone-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1">
                    {previewAlbum.collection || "Archive.org"}
                  </span>
                  <h3 className="text-sm font-semibold text-stone-100 truncate">{previewAlbum.title}</h3>
                  <p className="text-xs text-stone-400 mt-0.5">{previewAlbum.artist}</p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {previewAlbum.year ? `${previewAlbum.year} • ` : ""}
                    {previewAlbum.tracks.length} tracks detected
                  </p>
                </div>
              </div>

              {/* Tracks preview list */}
              {previewAlbum.tracks.length > 0 && (
                <div className="border-t border-stone-800/80 pt-3">
                  <p className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-2">
                    Detected Audio Tracks ({previewAlbum.tracks.length})
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {previewAlbum.tracks.slice(0, 10).map((t, i) => (
                      <div
                        key={t.id || i}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-stone-900/60 text-stone-300"
                      >
                        <span className="truncate flex-1 mr-2">
                          {i + 1}. {t.title}
                        </span>
                        <span className="text-stone-500 text-[10px] shrink-0">{t.format || "MP3"}</span>
                      </div>
                    ))}
                    {previewAlbum.tracks.length > 10 && (
                      <p className="text-[11px] text-stone-500 italic text-center pt-1">
                        + {previewAlbum.tracks.length - 10} more tracks
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {previewAlbum.archiveUrl && (
                  <a
                    href={previewAlbum.archiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-stone-400 hover:text-amber-400 transition-colors"
                  >
                    <span>View on Archive.org</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    id="save-captured-album-btn"
                    onClick={handleSaveToLibrary}
                    disabled={isAlreadyInLibrary}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 text-stone-950 disabled:text-stone-500 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-md"
                  >
                    {isAlreadyInLibrary ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Already In Library</span>
                      </>
                    ) : (
                      <>
                        <Music className="w-3.5 h-3.5" />
                        <span>Save to Private Library</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
