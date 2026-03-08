import { useRef } from "react";
import { useStyles } from "../../lib/api/hooks";
import type { components } from "../../lib/api/schema";

type DesignStyle = components["schemas"]["DesignStyle"];

interface StylePickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function StyleCarousel({ style }: { style: DesignStyle }) {
  const images = Object.entries(style.image_urls);
  const ref = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return <div className="w-full h-48 bg-base-200 rounded-t-box" />;
  }

  return (
    <div className="relative rounded-t-box overflow-hidden">
      <div ref={ref} className="carousel carousel-center w-full h-48 gap-2">
        {images.map(([room, url]) => (
          <div key={room} className="carousel-item w-3/4 shrink-0">
            <img
              src={url}
              alt={`${style.name} – ${room}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StylePicker({ selectedIds, onChange }: StylePickerProps) {
  const { data: styles, isLoading, error } = useStyles();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load styles.</span>
      </div>
    );
  }

  if (!styles || styles.length === 0) {
    return <p className="text-sm text-base-content/50">No styles available.</p>;
  }

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {styles.map((style) => {
        const selected = selectedIds.includes(style.name);
        return (
          <button
            key={style.name}
            type="button"
            onClick={() => toggle(style.name)}
            className={`card bg-base-100 card-border cursor-pointer transition-all hover:shadow-md text-left ${
              selected ? "ring-2 ring-primary border-primary" : ""
            }`}
          >
            <StyleCarousel style={style} />
            <div className="card-body card-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{style.name}</h3>
                {selected && (
                  <span className="badge badge-primary badge-sm">✓</span>
                )}
              </div>
              <p className="text-sm text-base-content/60 line-clamp-2">
                {style.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
