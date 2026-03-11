import { ImageCard } from "@/components/ImageCard";
import { useStyles } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";

type DesignStyle = components["schemas"]["DesignStyle"];

interface StylePickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
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
      {styles.map((style: DesignStyle) => {
        const selected = selectedIds.includes(style.name);
        const previewUrl = Object.values(style.image_urls)[0];
        return (
          <ImageCard
            key={style.name}
            onClick={() => toggle(style.name)}
            className={`cursor-pointer transition-all hover:shadow-md text-left ${
              selected ? "ring-2 ring-primary border-primary" : ""
            }`}
            image={{
              src: previewUrl ?? null,
              alt: style.name,
              aspect: "video",
            }}
            title={style.name}
            titleActions={
              selected ? (
                <span className="badge badge-primary badge-sm">✓</span>
              ) : undefined
            }
            body={
              <p className="text-sm text-base-content/60 line-clamp-2">
                {style.description}
              </p>
            }
          />
        );
      })}
    </div>
  );
}
