import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "primary";
export type BadgePosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

export interface ImageBadge {
  content: ReactNode;
  variant?: BadgeVariant;
  /** Defaults to "sm" */
  size?: "xs" | "sm";
  /** Defaults to "top-right" */
  position?: BadgePosition;
}

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
  /** Badges overlaid on the image */
  badges?: ImageBadge[];
  /**
   * Content rendered when there is no src and no skeleton state.
   * Use absolute positioning in the fallback to fill the tile, e.g.:
   *   `<div className="absolute inset-0 flex items-center justify-center">…</div>`
   */
  fallback?: ReactNode;
  /** Extra classes for the root container */
  className?: string;
}

const POSITION_CLASSES: Record<BadgePosition, string> = {
  "top-right": "top-2 right-2",
  "top-left": "top-2 left-2",
  "bottom-right": "bottom-2 right-2",
  "bottom-left": "bottom-2 left-2",
};

export function ImageTile({
  src,
  alt = "",
  aspect = "video",
  skeleton = false,
  loading = false,
  error,
  externalLink = false,
  badges = [],
  fallback,
  className,
}: ImageTileProps) {
  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-video";

  // Group badges by position so we can render them in the same flex row
  const byPosition = new Map<BadgePosition, ImageBadge[]>();
  for (const badge of badges) {
    const pos = badge.position ?? "top-right";
    byPosition.set(pos, [...(byPosition.get(pos) ?? []), badge]);
  }

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

      {/* External link button — hover-revealed, top-right */}
      {externalLink && src && (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 btn btn-xs btn-square btn-ghost bg-base-100/70 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Open in new tab"
        >
          <ExternalLink size={12} />
        </a>
      )}

      {/* Badges */}
      {[...byPosition.entries()].map(([pos, posBadges]) => (
        <div
          key={pos}
          className={`absolute ${POSITION_CLASSES[pos]} flex gap-1`}
        >
          {posBadges.map((badge, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={`badge badge-${badge.size ?? "sm"} badge-${badge.variant ?? "neutral"} shadow gap-1`}
            >
              {badge.content}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
