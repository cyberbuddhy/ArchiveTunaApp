import React from "react";

/**
 * Shared page header — one grid for Search / Discover / Vault.
 * Same card, same padding, same title scale on every tab so switching tabs
 * feels like one app. Stacks on mobile, actions wrap under the title.
 */
interface TabHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Makes the whole title block a button (e.g. Discover's genre trigger). */
  onTitleClick?: () => void;
  titleId?: string;
  /** Trailing affordance next to the title (e.g. rotating chevron). */
  titleExtra?: React.ReactNode;
}

export const TabHeader: React.FC<TabHeaderProps> = ({
  icon,
  title,
  subtitle,
  actions,
  onTitleClick,
  titleId,
  titleExtra,
}) => {
  const titleBlock = (
    <>
      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs sm:text-sm font-bold text-stone-100 truncate">{title}</h2>
          {titleExtra}
        </div>
        {subtitle && <p className="text-[11px] text-stone-400 truncate mt-0.5">{subtitle}</p>}
      </div>
    </>
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-stone-900/90 border border-stone-800 rounded-2xl shadow-sm">
      {onTitleClick ? (
        <button
          id={titleId}
          type="button"
          onClick={onTitleClick}
          className="flex items-center space-x-3 text-left flex-1 min-w-0 cursor-pointer select-none"
        >
          {titleBlock}
        </button>
      ) : (
        <div className="flex items-center space-x-3 flex-1 min-w-0">{titleBlock}</div>
      )}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">{actions}</div>
      )}
    </div>
  );
};
