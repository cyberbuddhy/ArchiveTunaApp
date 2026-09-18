import React from "react";

interface ArchiveLogoProps {
  className?: string;
}

/**
 * Classical neoclassical temple pillars logo of the Internet Archive (Archive.org)
 */
export const ArchiveLogo: React.FC<ArchiveLogoProps> = ({ className = "w-5 h-5" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-label="Archive.org"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Triangular Pediment / Roof */}
      <path d="M12 2L2 7V8H22V7L12 2Z" />
      {/* Entablature / Architrave beam */}
      <rect x="2" y="8.75" width="20" height="1.5" rx="0.3" />
      {/* 4 Classical Neoclassical Pillars / Columns */}
      <rect x="3.75" y="11" width="2.75" height="8" rx="0.5" />
      <rect x="8.5" y="11" width="2.75" height="8" rx="0.5" />
      <rect x="13.25" y="11" width="2.75" height="8" rx="0.5" />
      <rect x="18" y="11" width="2.75" height="8" rx="0.5" />
      {/* Stepped Stylobate / Pedestal Base */}
      <rect x="2" y="19.5" width="20" height="1.5" rx="0.3" />
      <rect x="1" y="21.5" width="22" height="1.5" rx="0.3" />
    </svg>
  );
};
