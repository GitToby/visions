interface BeforeAfterDiffProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function BeforeAfterDiff({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel,
  className = "",
}: BeforeAfterDiffProps) {
  return (
    <div className={`relative ${className}`}>
      <figure
        className="diff aspect-video rounded-box shadow-md border border-base-200"
        tabIndex={0}
      >
        <div className="diff-item-1" role="img" tabIndex={0}>
          <img src={beforeSrc} alt={beforeLabel} />
        </div>
        <div className="diff-item-2" role="img">
          <img
            src={afterSrc}
            alt={afterLabel ? `${afterLabel} vision` : "After"}
          />
        </div>
        <div className="diff-resizer" />
      </figure>
      <span className="badge badge-soft badge-neutral badge-sm absolute top-3 left-3 z-10 pointer-events-none">
        Original
      </span>
      {afterLabel && (
        <span className="badge badge-soft badge-primary badge-sm absolute top-3 right-3 z-10 pointer-events-none">
          {afterLabel}
        </span>
      )}
    </div>
  );
}
