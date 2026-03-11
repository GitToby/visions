import type { ReactNode } from "react";
import { ImageTile, type ImageTileProps } from "./ImageTile";

export interface ImageCardProps {
  /** Props forwarded to the ImageTile figure */
  image: ImageTileProps;
  /** Card title rendered in an h2.card-title */
  title: ReactNode;
  /** Buttons/badges rendered inline in the title row */
  titleActions?: ReactNode;
  /** Optional body content below the title */
  body?: ReactNode;
  /** Optional actions rendered in card-actions justify-end */
  actions?: ReactNode;
  /** When provided the card root renders as a <button> */
  onClick?: () => void;
  /** Extra classes for the card wrapper */
  className?: string;
}

export function ImageCard({
  image,
  title,
  titleActions,
  body,
  actions,
  onClick,
  className,
}: ImageCardProps) {
  const Root = onClick ? "button" : "div";
  return (
    <Root
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`card bg-base-100 card-border overflow-hidden ${className ?? ""}`}
    >
      <figure>
        <ImageTile {...image} />
      </figure>
      <div className="card-body card-sm">
        <h2 className="card-title">
          {title}
          {titleActions}
        </h2>
        {body}
        {actions && <div className="card-actions justify-end">{actions}</div>}
      </div>
    </Root>
  );
}
