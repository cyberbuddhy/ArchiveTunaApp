import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Download,
  Share2,
  FileText,
  Copy,
  Check,
  Play,
  Disc3,
  Award,
  ChevronDown,
  Layers,
  X,
} from "lucide-react";
import { Album, TierList, TierItem, TierRank } from "../types";
import { usePlayer } from "../context/PlayerContext";
import {
  TIER_RANKS,
  TIER_CONFIG,
  formatTierListAsText,
  downloadTextFile,
  exportTierListAsImage,
} from "../utils/tierList";

interface TierListViewProps {
  albums: Album[];
  tierLists: TierList[];
  onCreateTierList: (name: string, description?: string) => void;
  onDeleteTierList: (id: string) => void;
  onUpdateTierList: (tierList: TierList) => void;
  onSelectAlbumForDetail: (album: Album) => void;
  onUpdateAlbum: (album: Album) => void;
  onShowToast: (msg: string, type?: "success" | "info") => void;
}

export const TierListView: React.FC<TierListViewProps> = ({
  albums,
  tierLists,
  onCreateTierList,
  onDeleteTierList,
  onUpdateTierList,
  onSelectAlbumForDetail,
  onUpdateAlbum,
  onShowToast,
}) => {
  const { playAlbum } = usePlayer();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");

  // Export menu state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Drag and drop state for seamless tier sorting
  const [draggedAlbumId, setDraggedAlbumId] = useState<string | null>(null);
  const [activeDropTier, setActiveDropTier] = useState<TierRank | null>(null);

  const activeList: TierList | null = useMemo(() => {
    const found = tierLists.find((t) => t.id === selectedListId);
    if (found) return found;
    return tierLists[0] || null;
  }, [selectedListId, tierLists]);

  const defaultListName = `Tierlist #${tierLists.length + 1}`;

  const handleCreateNewList = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newListName.trim() || defaultListName;
    onCreateTierList(name, newListDesc.trim());
    setNewListName("");
    setNewListDesc("");
    setIsCreatingList(false);
  };

  const handleChangeItemTier = (albumId: string, newRank: TierRank) => {
    if (!activeList) return;
    const nextItems = activeList.items.map((it) =>
      it.albumId === albumId ? { ...it, rank: newRank } : it
    );
    onUpdateTierList({
      ...activeList,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    });
    onShowToast(`Moved to ${newRank}-Tier`);
  };

  const handleRemoveItem = (albumId: string) => {
    if (!activeList) return;
    const nextItems = activeList.items.filter((it) => it.albumId !== albumId);
    onUpdateTierList({
      ...activeList,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    });
    onShowToast(`Removed from Tier List`, "info");
  };

  const handleExportImage = async () => {
    if (!activeList) return;
    try {
      setIsExportingImage(true);
      await exportTierListAsImage(activeList.name, activeList.items);
      onShowToast(`Tier List exported as image!`);
    } catch (err) {
      console.error(err);
      onShowToast(`Failed to export image`, "info");
    } finally {
      setIsExportingImage(false);
      setIsExportMenuOpen(false);
    }
  };

  const handleCopyText = (format: "markdown" | "plain") => {
    if (!activeList) return;
    const text = formatTierListAsText(activeList.name, activeList.items, format);
    navigator.clipboard.writeText(text);
    onShowToast(`Copied ${format === "markdown" ? "Markdown" : "Text"} to clipboard!`);
    setIsExportMenuOpen(false);
  };

  const handleDownloadText = (format: "markdown" | "plain") => {
    if (!activeList) return;
    const text = formatTierListAsText(activeList.name, activeList.items, format);
    const ext = format === "markdown" ? "md" : "txt";
    const filename = `${activeList.name.replace(/[/\\?%*:|"<>]/g, "-").toLowerCase()}-tierlist.${ext}`;
    downloadTextFile(text, filename);
    onShowToast(`Downloaded .${ext} file!`);
    setIsExportMenuOpen(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-1">
      {/* LEFT COLUMN: TIER LISTS MENU */}
      <div className="md:col-span-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Tier Lists
            </h3>
          </div>
          <button
            id="new-tier-list-btn"
            onClick={() => setIsCreatingList(true)}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs flex items-center space-x-1 cursor-pointer transition-colors"
            title="Create new Tier List"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="font-medium text-[11px]">New</span>
          </button>
        </div>

        {/* Create form */}
        {isCreatingList && (
          <form
            onSubmit={handleCreateNewList}
            className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-2.5 animate-in fade-in"
          >
            <h4 className="text-xs font-semibold text-stone-200">New Tier List</h4>
            <input
              type="text"
              placeholder={defaultListName}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newListDesc}
              onChange={(e) => setNewListDesc(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingList(false)}
                className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-md"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Tier lists list */}
        <div className="space-y-1">
          {/* Custom Tier Lists */}
          {tierLists.map((tl) => (
            <div
              key={tl.id}
              onClick={() => setSelectedListId(tl.id)}
              className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedListId === tl.id
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm"
                  : "bg-stone-900/40 border-stone-800/80 hover:bg-stone-900/80 hover:border-stone-700 text-stone-300"
              }`}
            >
              <div className="min-w-0 flex-1 mr-2">
                <h4 className="text-xs font-semibold truncate group-hover:text-amber-300">
                  {tl.name}
                </h4>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  {tl.items.length} album{tl.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                    if (confirm(`Delete Tier List "${tl.name}"?`)) {
                      onDeleteTierList(tl.id);
                      if (selectedListId === tl.id) {
                        setSelectedListId("");
                      }
                    }
                }}
                className="p-1 text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Tier List"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: DEPLOYED TIER LIST SHOWING */}
      <div className="md:col-span-3 space-y-4">
        {activeList ? (
          <>
        {/* Tier List Top Bar */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-100">{activeList.name}</h2>
              <span className="text-xs text-stone-500 font-medium">
                ({activeList.items.length} album{activeList.items.length === 1 ? "" : "s"})
              </span>
            </div>
            {activeList.description && (
              <p className="text-xs text-stone-400 mt-0.5">{activeList.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                id="export-tierlist-btn"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="px-3 py-1.5 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-200 border border-stone-750 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-1.5 z-40 space-y-1 text-xs animate-in fade-in">
                  <div className="text-[10px] uppercase font-bold text-stone-500 px-2 py-1">
                    Export Options
                  </div>

                  <button
                    onClick={handleExportImage}
                    disabled={isExportingImage}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-850 text-stone-200 flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isExportingImage ? "Exporting..." : "Export as Image (.png)"}</span>
                  </button>

                  <button
                    onClick={() => handleCopyText("markdown")}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-850 text-stone-200 flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>Copy Markdown</span>
                  </button>

                  <button
                    onClick={() => handleCopyText("plain")}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-850 text-stone-200 flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                    <span>Copy Plain Text</span>
                  </button>

                  <button
                    onClick={() => handleDownloadText("markdown")}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-850 text-stone-200 flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download .md</span>
                  </button>

                  <button
                    onClick={() => handleDownloadText("plain")}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-850 text-stone-200 flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download .txt</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DEPLOYED TIER ROWS (S, A, B, C, D, F) */}
        <div className="rounded-2xl border border-stone-800 overflow-hidden bg-stone-950 divide-y divide-stone-850 shadow-lg">
          {TIER_RANKS.map((rank) => {
            const cfg = TIER_CONFIG[rank];
            const itemsInTier = activeList.items.filter((it) => it.rank === rank);
            const isDragOver = activeDropTier === rank;

            return (
              <div
                key={rank}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (activeDropTier !== rank) setActiveDropTier(rank);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (activeDropTier === rank) setActiveDropTier(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const albumId = e.dataTransfer.getData("text/plain") || draggedAlbumId;
                  if (albumId) handleChangeItemTier(albumId, rank);
                  setActiveDropTier(null);
                  setDraggedAlbumId(null);
                }}
                className={`flex items-stretch min-h-[82px] transition-colors ${
                  isDragOver ? "bg-amber-500/10 ring-1 ring-amber-500/30 inset-0" : "bg-stone-900/30 hover:bg-stone-900/40"
                }`}
              >
                {/* Left Label Block with Authentic Tier Colors */}
                <div
                  className={`w-16 sm:w-20 shrink-0 flex items-center justify-center select-none ${cfg.bgClass}`}
                >
                  <span className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                    {rank}
                  </span>
                </div>

                {/* Right Container of Album Tiles */}
                <div className="flex-1 p-2 sm:p-2.5 flex items-center flex-wrap gap-2.5 min-h-[82px]">
                  {itemsInTier.map((item) => {
                    const fullAlbum = albums.find((a) => a.id === item.albumId);
                    return (
                      <div
                        key={item.albumId}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", item.albumId);
                          setDraggedAlbumId(item.albumId);
                        }}
                        onDragEnd={() => {
                          setDraggedAlbumId(null);
                          setActiveDropTier(null);
                        }}
                        onClick={() => {
                          if (fullAlbum) onSelectAlbumForDetail(fullAlbum);
                        }}
                        className="group relative w-20 sm:w-24 shrink-0 flex flex-col items-center cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105"
                        title={`${item.albumTitle} by ${item.artist} (Drag to change tier, click for details)`}
                      >
                        {/* Cover Art Tile */}
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-stone-900 border border-stone-800/90 group-hover:border-amber-500/60 shadow-sm transition-all">
                          <img
                            src={
                              item.coverUrl ||
                              `https://archive.org/services/img/${item.albumId}` ||
                              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80"
                            }
                            alt={item.albumTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80";
                            }}
                          />

                          {/* Hover Remove Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.albumId);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-stone-950/90 hover:bg-rose-500 text-stone-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer z-10"
                            title="Remove from tier list"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Title text */}
                        <p className="w-full text-[10px] font-medium text-stone-300 group-hover:text-amber-300 truncate text-center mt-1">
                          {item.albumTitle}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
          </>
        ) : (
          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-8 text-center space-y-2">
            <Layers className="w-8 h-8 text-stone-600 mx-auto" />
            <h3 className="text-sm font-bold text-stone-200">No tier lists yet</h3>
            <p className="text-xs text-stone-400">Hit New to create Tierlist #1.</p>
          </div>
        )}
      </div>
    </div>
  );
};
