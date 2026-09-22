import React from "react";
import { Search, Compass, Disc3, Settings } from "lucide-react";
import { ArchiveLogo } from "./ArchiveLogo";

export type NavTabType = "search" | "discover" | "vault";

interface NavbarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  onResetSearch?: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onResetSearch,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-stone-950/90 backdrop-blur-md border-b border-stone-850/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand with Archive.org Temple Icon */}
          <div
            id="brand-archive-tuner"
            onClick={() => {
              if (onResetSearch) {
                onResetSearch();
              }
              setActiveTab("search");
            }}
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            title="Reset to fresh search"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--color-secondary-main)]/15 border border-[var(--color-secondary-main)]/35 flex items-center justify-center text-[var(--color-secondary-main)] group-hover:bg-[var(--color-secondary-main)]/25 group-hover:border-[var(--color-secondary-main)]/60 transition-colors">
              <ArchiveLogo className="w-4.5 h-4.5 text-[var(--color-secondary-main)]" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-stone-100 group-hover:text-[var(--color-accent-main)] transition-colors">
              ArchiveTuna
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-400">
              Beta v2
            </span>
          </div>

          {/* Right Section: tabs + settings */}
          <div className="flex items-center space-x-2">
          {/* 3 Main Section Tabs: Search, Discover, Vault (Desktop only) */}
          <nav aria-label="Main Navigation" className="hidden sm:flex items-center bg-stone-900/90 border border-stone-800 p-0.5 rounded-xl">
            <button
              id="nav-tab-search"
              onClick={() => setActiveTab("search")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "search"
                  ? "bg-[var(--color-accent-main)] text-stone-950 font-semibold shadow-xs"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850/50"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            <button
              id="nav-tab-discover"
              onClick={() => setActiveTab("discover")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "discover"
                  ? "bg-[var(--color-secondary-main)] text-stone-950 font-semibold shadow-xs"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850/50"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Discover</span>
            </button>

            <button
              id="nav-tab-vault"
              onClick={() => setActiveTab("vault")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "vault"
                  ? "bg-stone-100 text-stone-950 font-semibold shadow-xs"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850/50"
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Vault</span>
            </button>
          </nav>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Settings, themes & audio"
              aria-label="Open settings"
              className="p-2 rounded-xl bg-stone-900/90 border border-stone-800 text-stone-400 hover:text-stone-100 hover:border-stone-700 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Mobile active-tab indicator */}
          <div className="flex items-center space-x-2 sm:hidden">
            <span
              className={`sm:hidden text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg text-center min-w-[68px] inline-block ${
                activeTab === "search"
                  ? "text-[var(--color-accent-main)] bg-[var(--color-accent-main)]/15 border border-[var(--color-accent-main)]/30"
                  : activeTab === "discover"
                  ? "text-[var(--color-secondary-main)] bg-[var(--color-secondary-main)]/15 border border-[var(--color-secondary-main)]/30"
                  : "text-stone-100 bg-stone-850 border border-stone-700"
              }`}
            >
              {activeTab === "search" ? "Search" : activeTab === "discover" ? "Discover" : "Vault"}
            </span>
          </div>
          </div>
        </div>
      </div>
    </header>
  );
};

