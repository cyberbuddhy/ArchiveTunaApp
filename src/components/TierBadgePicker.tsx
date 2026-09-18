import React, { useState, useRef, useEffect } from "react";
import { Award, X } from "lucide-react";
import { TierRank } from "../types";
import { TIER_RANKS, TIER_CONFIG } from "../utils/tierList";

interface TierBadgePickerProps {
  currentTier?: TierRank;
  onSelectTier: (tier: TierRank | undefined) => void;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export const TierBadgePicker: React.FC<TierBadgePickerProps> = ({
  currentTier,
  onSelectTier,
  size = "md",
  showLabel = true,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeConfig = currentTier ? TIER_CONFIG[currentTier] : null;

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        id="tier-rate-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`rounded-lg border transition-all flex items-center space-x-1.5 cursor-pointer select-none ${
          size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        } ${
          activeConfig
            ? "bg-stone-900 border-stone-700 text-stone-100 shadow-sm hover:border-stone-600"
            : "bg-stone-850 hover:bg-stone-800 border-stone-750 text-stone-400 hover:text-stone-200"
        }`}
        title={activeConfig ? `Ranked as ${activeConfig.name} - Click to re-rank` : "Rate tier"}
      >
        {activeConfig ? (
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0 ${activeConfig.bgClass} ${activeConfig.textClass}`}
          >
            {activeConfig.label}
          </span>
        ) : (
          <Award className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        )}

        {showLabel && (
          <span className="font-medium whitespace-nowrap">
            {activeConfig ? activeConfig.name : "Rate"}
          </span>
        )}
      </button>

      {/* Popover showing popular tier colored balls */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 z-50 bg-stone-950 border border-stone-800 rounded-xl p-2 shadow-2xl flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 pl-0.5 pr-1 select-none">
            Tier:
          </span>

          {TIER_RANKS.map((rank) => {
            const cfg = TIER_CONFIG[rank];
            const isSelected = currentTier === rank;
            return (
              <button
                key={rank}
                type="button"
                id={`tier-ball-${rank}`}
                onClick={() => {
                  onSelectTier(rank);
                  setIsOpen(false);
                }}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform hover:scale-120 cursor-pointer ${
                  cfg.bgClass
                } ${cfg.textClass} ${
                  isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-stone-950 scale-110" : "opacity-90 hover:opacity-100"
                }`}
                title={`${cfg.name} (${cfg.description})`}
              >
                {rank}
              </button>
            );
          })}

          {currentTier && (
            <button
              type="button"
              id="tier-clear-btn"
              onClick={() => {
                onSelectTier(undefined);
                setIsOpen(false);
              }}
              className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-stone-900 transition-colors ml-0.5 cursor-pointer"
              title="Clear Tier"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
