import { Check } from "lucide-react";
import type { components } from "@/lib/api/schema";

type Style = components["schemas"]["StyleResponse"];

interface StyleCardProps {
  style: Style;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function StyleCard({ style, selected, onToggle }: StyleCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(style.id)}
      className={`card w-full cursor-pointer border-2 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-base-300 bg-base-100 hover:border-primary/40"
      }`}
    >
      {style.preview_image_url && (
        <figure className="h-32 overflow-hidden">
          <img
            src={style.preview_image_url}
            alt={style.name}
            className="h-full w-full object-cover"
          />
        </figure>
      )}
      <div className="card-body p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{style.name}</h3>
          {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <p className="line-clamp-2 text-xs text-base-content/60">
          {style.description}
        </p>
        {style.is_builtin && (
          <span className="badge badge-outline badge-xs mt-1">Built-in</span>
        )}
      </div>
    </button>
  );
}
