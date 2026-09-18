import React from "react";
import { Search, Compass, Disc3 } from "lucide-react";
import { NavTabType } from "./Navbar";

interface MobileBottomNavProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  onResetSearch?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onResetSearch,
}) => {
  return (
    <nav
      id="spotify-mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-stone-950/95 backdrop-blur-xl border-t border-stone-850/90 grid grid-cols-3 shadow-[0_-10px_25px_rgba(0,0,0,0.7)] select-none touch-manipulation"
    >
      {/* Search Tab */}
      <button
        id="mobile-tab-search"
        type="button"
        onClick={() => {
          if (activeTab === "search" && onResetSearch) {
            onResetSearch();
          }
          setActiveTab("search");
        }}
        className={`w-full h-full flex flex-col items-center justify-center py-1 transition-colors duration-150 cursor-pointer ${
          activeTab === "search"
            ? "text-[var(--color-accent-main)]"
            : "text-stone-400 hover:text-stone-200"
        }`}
      >
        <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
          <Search className="w-5 h-5 stroke-2" />
          <span
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--color-accent-main)] rounded-full transition-opacity duration-150 pointer-events-none ${
              activeTab === "search" ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
        <span className="text-[10px] tracking-tight font-medium mt-1 whitespace-nowrap">
          Search
        </span>
      </button>

      {/* Discover Tab */}
      <button
        id="mobile-tab-discover"
        type="button"
        onClick={() => setActiveTab("discover")}
        className={`w-full h-full flex flex-col items-center justify-center py-1 transition-colors duration-150 cursor-pointer ${
          activeTab === "discover"
            ? "text-[var(--color-secondary-main)]"
            : "text-stone-400 hover:text-stone-200"
        }`}
      >
        <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
          <Compass className="w-5 h-5 stroke-2" />
          <span
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--color-secondary-main)] rounded-full transition-opacity duration-150 pointer-events-none ${
              activeTab === "discover" ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
        <span className="text-[10px] tracking-tight font-medium mt-1 whitespace-nowrap">
          Discover
        </span>
      </button>

      {/* Your Vault (Your Library) Tab */}
      <button
        id="mobile-tab-vault"
        type="button"
        onClick={() => setActiveTab("vault")}
        className={`w-full h-full flex flex-col items-center justify-center py-1 transition-colors duration-150 cursor-pointer ${
          activeTab === "vault"
            ? "text-stone-100"
            : "text-stone-400 hover:text-stone-200"
        }`}
      >
        <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
          <Disc3 className="w-5 h-5 stroke-2" />
          <span
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-stone-100 rounded-full transition-opacity duration-150 pointer-events-none ${
              activeTab === "vault" ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
        <span className="text-[10px] tracking-tight font-medium mt-1 whitespace-nowrap">
          Your Vault
        </span>
      </button>
    </nav>
  );
};
