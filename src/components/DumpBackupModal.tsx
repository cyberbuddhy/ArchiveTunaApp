import React, { useState, useRef } from "react";
import {
  X,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  ListMusic,
  Disc3,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Album, Playlist, LibraryDump } from "../types";
import { dumpLibraryToFile, parseAndValidateDump, restoreLibraryFromDump } from "../services/storage";

interface DumpBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: Album[];
  playlists: Playlist[];
  onLibraryRestored: () => void;
}

export const DumpBackupModal: React.FC<DumpBackupModalProps> = ({
  isOpen,
  onClose,
  albums,
  playlists,
  onLibraryRestored,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedDump, setParsedDump] = useState<LibraryDump | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const totalTracks = albums.reduce((acc, a) => acc + (a.tracks?.length || 0), 0);
  const totalNotes = albums.filter((a) => !!a.userNotes).length;

  const handleExport = () => {
    dumpLibraryToFile();
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedDump(null);
    setRestoreStatus(null);

    if (!file.name.endsWith(".json")) {
      setParseError("Please upload a valid .json library backup file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseAndValidateDump(content);
      if (result.success && result.data) {
        setParsedDump(result.data);
      } else {
        setParseError(result.error || "Failed to parse backup file.");
      }
    };
    reader.onerror = () => {
      setParseError("Failed to read the selected file.");
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRestore = () => {
    if (!parsedDump) return;
    const { addedAlbums, addedPlaylists } = restoreLibraryFromDump(parsedDump, restoreMode);
    setRestoreStatus(
      restoreMode === "replace"
        ? `Library successfully restored! Loaded ${addedAlbums} albums and ${addedPlaylists} playlists.`
        : `Library merged! Added ${addedAlbums} new albums and ${addedPlaylists} new playlists.`
    );
    onLibraryRestored();
    setTimeout(() => {
      onClose();
      setSelectedFile(null);
      setParsedDump(null);
      setRestoreStatus(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        id="backup-dump-modal"
        className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-100">Library Backup & Restore</h2>
              <p className="text-xs text-stone-400">Dump your collection to a file and upload it back anytime</p>
            </div>
          </div>
          <button
            id="close-dump-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Dump to file */}
          <div className="p-5 rounded-xl bg-stone-950/80 border border-stone-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-200 flex items-center space-x-2">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Dump Library to File (Export)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Downloads a standalone JSON package containing all captured albums, organized tracks, custom notes, ratings, and playlists.
                </p>
              </div>
              <button
                id="dump-library-btn"
                onClick={handleExport}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 shrink-0 ml-4"
              >
                <Download className="w-4 h-4" />
                <span>Dump Library (.json)</span>
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-stone-900/90 border border-stone-800 flex items-center space-x-3">
                <Disc3 className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-base font-bold text-stone-100">{albums.length}</div>
                  <div className="text-[11px] text-stone-400">Albums</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-stone-900/90 border border-stone-800 flex items-center space-x-3">
                <FileJson className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="text-base font-bold text-stone-100">{totalTracks}</div>
                  <div className="text-[11px] text-stone-400">Tracks</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-stone-900/90 border border-stone-800 flex items-center space-x-3">
                <ListMusic className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-base font-bold text-stone-100">{playlists.length}</div>
                  <div className="text-[11px] text-stone-400">Playlists</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-stone-900/90 border border-stone-800 flex items-center space-x-3">
                <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-base font-bold text-stone-100">{totalNotes}</div>
                  <div className="text-[11px] text-stone-400">Custom Notes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Upload File Back to App */}
          <div className="p-5 rounded-xl bg-stone-950/80 border border-stone-800/80 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-200 flex items-center space-x-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Upload File Back to App (Restore)</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Upload your previously dumped JSON file to restore your organized music collection, albums, and playlists exactly as you put them.
              </p>
            </div>

            {/* Drag and Drop Zone */}
            <div
              id="upload-drop-zone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-amber-500 bg-amber-500/5 text-amber-300"
                  : "border-stone-800 hover:border-stone-700 bg-stone-900/40 text-stone-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="library-file-input"
              />
              <FileJson className="w-10 h-10 mb-2 opacity-80 text-amber-400" />
              <p className="text-xs font-medium text-stone-200 text-center">
                {selectedFile ? selectedFile.name : "Drag & drop your .json library dump here, or click to browse"}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">Supports all ArchiveTuna backup files</p>
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Success Message */}
            {restoreStatus && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{restoreStatus}</span>
              </div>
            )}

            {/* Parsed Dump Summary & Action */}
            {parsedDump && !restoreStatus && (
              <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valid backup detected</span>
                  </div>
                  <span className="text-[11px] text-stone-500">
                    Exported: {new Date(parsedDump.exportedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-stone-950/60 border border-stone-800/60">
                    <div className="text-sm font-semibold text-stone-200">{parsedDump.albums.length}</div>
                    <div className="text-[10px] text-stone-400">Albums</div>
                  </div>
                  <div className="p-2 rounded bg-stone-950/60 border border-stone-800/60">
                    <div className="text-sm font-semibold text-stone-200">{parsedDump.metadata.totalTracks}</div>
                    <div className="text-[10px] text-stone-400">Tracks</div>
                  </div>
                  <div className="p-2 rounded bg-stone-950/60 border border-stone-800/60">
                    <div className="text-sm font-semibold text-stone-200">{parsedDump.playlists.length}</div>
                    <div className="text-[10px] text-stone-400">Playlists</div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-stone-300">Restore Strategy</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="mode-merge-btn"
                      onClick={() => setRestoreMode("merge")}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                        restoreMode === "merge"
                          ? "border-amber-500 bg-amber-500/10 text-amber-300"
                          : "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700"
                      }`}
                    >
                      <div className="font-semibold">Merge with Existing</div>
                      <div className="text-[10px] opacity-75 mt-0.5">Keep current collection and add items</div>
                    </button>
                    <button
                      type="button"
                      id="mode-replace-btn"
                      onClick={() => setRestoreMode("replace")}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                        restoreMode === "replace"
                          ? "border-red-500/80 bg-red-500/10 text-red-300"
                          : "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700"
                      }`}
                    >
                      <div className="font-semibold">Replace Current Library</div>
                      <div className="text-[10px] opacity-75 mt-0.5">Overwrite completely with backup state</div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="execute-restore-btn"
                    onClick={handleRestore}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-xs rounded-xl transition-colors flex items-center space-x-2 shadow-md"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Upload & Restore Collection</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
