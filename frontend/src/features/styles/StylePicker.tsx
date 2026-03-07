import { useStyles } from "../../lib/api/hooks";

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
      {styles.map((style) => {
        const selected = selectedIds.includes(style.name);
        return (
          <button
            key={style.name}
            type="button"
            onClick={() => toggle(style.name)}
            className={`card bg-base-100 card-border text-left transition-all cursor-pointer hover:shadow-md ${
              selected ? "ring-2 ring-primary border-primary" : ""
            }`}
          >
            <div className="w-full h-48 bg-base-200 rounded-t-box" />
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
