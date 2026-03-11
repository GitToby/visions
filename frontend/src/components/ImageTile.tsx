import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export interface ImageTileProps {
  src?: string | null;
  alt?: string;
  /** "video" = 16:9, "square" = 1:1. Defaults to "video" */
  aspect?: "video" | "square";
  /** Show skeleton animation (e.g. pending generation) */
  skeleton?: boolean;
  /** Show spinner overlay (e.g. during upload) */
  loading?: boolean;
  /** Error message shown as an overlay */
  error?: string | null;
  /** Show a hover-revealed "open in new tab" button (requires parent or self to have group) */
  externalLink?: boolean;
  /** Content rendered in each corner of the image */
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  /**
   * Content rendered when there is no src and no skeleton state.
   * Use absolute positioning in the fallback to fill the tile, e.g.:
   *   `<div className="absolute inset-0 flex items-center justify-center">…</div>`
   */
  fallback?: ReactNode;
  /** Extra classes for the root container */
  className?: string;
}

export function ImageTile({
  src,
  alt = "",
  aspect = "video",
  skeleton = false,
  loading = false,
  error,
  externalLink = false,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  fallback,
  className,
}: ImageTileProps) {
  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-video";

  return (
    <div
      className={`relative bg-base-200 ${aspectClass} ${externalLink ? "group" : ""} ${className ?? ""}`}
    >
      {/* Skeleton */}
      {skeleton && <div className="w-full h-full skeleton rounded-none" />}

      {/* Image */}
      {!skeleton && src && (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      )}

      {/* Fallback: shown when there's no src, no skeleton, and no error */}
      {!skeleton && !src && !error && fallback}

      {/* Loading spinner overlay (e.g. during upload — shown on top of image) */}
      {loading && (
        <div className="absolute inset-0 bg-base-100/50 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-error/20 flex items-center justify-center p-3">
          <span className="text-error text-xs text-center font-semibold">
            {error}
          </span>
        </div>
      )}

      {/* Corners */}
      {(topLeft || (externalLink && src)) && (
        <div className="absolute top-2 left-2 flex gap-1">
          {externalLink && src && (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
              title="Open in new tab"
            >
              <ExternalLink size={12} />
            </a>
          )}
          {topLeft}
        </div>
      )}
      {topRight && (
        <div className="absolute top-2 right-2 flex gap-1">{topRight}</div>
      )}
      {bottomLeft && (
        <div className="absolute bottom-2 left-2 flex gap-1">{bottomLeft}</div>
      )}
      {bottomRight && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {bottomRight}
        </div>
      )}
    </div>
  );
}
