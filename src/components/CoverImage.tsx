import React, { useState } from "react";

// Single fallback for every cover in the app — one placeholder look
// everywhere instead of a mix of notfound.png / unsplash / hidden icons.
export const COVER_FALLBACK = "https://archive.org/images/notfound.png";

interface CoverImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "onError" | "loading" | "alt"> {
  src?: string;
  /** Accessible name: rendered as tooltip only, never as visible text. */
  alt: string;
  /** Above-the-fold art (player, hero): eager load + high fetch priority. */
  eager?: boolean;
  fallbackSrc?: string;
  /** Box classes: sizing, rounding, borders, rings (the pulse lives here). */
  className?: string;
  /** Image-effect classes: object-fit, hover scale, transitions. */
  imgClassName?: string;
}

/**
 * The only <img> the app renders for covers/artwork/avatars.
 * Sizing lives on the wrapper span (a bare <img> can't hold layout while
 * hidden), effects live on the <img>. While loading: blank pulsing block
 * (time-capsule skeleton style), zero text. Always: async decode,
 * no-referrer (coverartarchive 403s with referrers), lazy below the fold,
 * non-draggable, two-stage fallback (src → fallback → hidden) so a dead
 * host never leaves a broken icon.
 */
export const CoverImage: React.FC<CoverImageProps> = ({
  src,
  alt,
  eager = false,
  fallbackSrc = COVER_FALLBACK,
  className = "",
  imgClassName = "object-cover",
  ...rest
}) => {
  // 0 = primary, 1 = fallback, 2 = give up (render nothing)
  const [stage, setStage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  if (stage === 2) return null;
  return (
    <span
      aria-hidden
      className={`block overflow-hidden ${className} ${loaded ? "" : "animate-pulse bg-stone-800"}`}
    >
      <img
        src={stage === 0 ? src || fallbackSrc : fallbackSrc}
        alt=""
        title={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        fetchPriority={eager ? "high" : "auto"}
        className={`w-full h-full ${imgClassName} ${loaded ? "" : "opacity-0"}`}
        onLoad={(e) => {
          // Broken-image icons flash when the fallback itself 404s — hide fast.
          const el = e.target as HTMLImageElement;
          if (el.naturalWidth === 0) {
            setStage((s) => (s === 0 ? 1 : 2));
            return;
          }
          setLoaded(true);
        }}
        onError={() => {
          setLoaded(false);
          setStage((s) => (s === 0 ? 1 : 2));
        }}
        {...rest}
      />
    </span>
  );
};
