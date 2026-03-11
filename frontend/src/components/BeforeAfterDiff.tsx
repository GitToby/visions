"use client";

import { ChevronsLeftRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";

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
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const { left, width } = el.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - left) / width) * 100));
    setPosition(pct);
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      updatePosition(e.clientX);
      const onMove = (ev: MouseEvent) => {
        if (dragging.current) updatePosition(ev.clientX);
      };
      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [updatePosition]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      dragging.current = true;
      updatePosition(e.touches[0].clientX);
      const onMove = (ev: TouchEvent) => {
        if (dragging.current) updatePosition(ev.touches[0].clientX);
      };
      const onEnd = () => {
        dragging.current = false;
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
    },
    [updatePosition]
  );

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Before/after comparison slider"
      aria-valuenow={position}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className={`relative aspect-video rounded-box shadow-md border border-base-200 overflow-hidden select-none cursor-col-resize ${className}`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* After (base layer) */}
      <img
        src={afterSrc}
        alt={afterLabel ? `${afterLabel} vision` : "After"}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before (clipped overlay) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ minWidth: containerRef.current?.offsetWidth ?? "100%" }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-base-100 shadow-md z-10"
        style={{ left: `${position}%` }}
      >
        {/* Handle */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-base-100 shadow-lg flex items-center justify-center">
          <ChevronsLeftRight
            className="w-4 h-4 text-base-content/60"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Labels */}
      <span className="badge badge-soft badge-sm absolute top-3 left-3 z-20 pointer-events-none">
        {beforeLabel}
      </span>
      {afterLabel && (
        <span className="badge badge-primary badge-sm absolute top-3 right-3 z-20 pointer-events-none">
          {afterLabel}
        </span>
      )}
    </div>
  );
}
