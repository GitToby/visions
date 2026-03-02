import { $api } from "@/lib/api/client";
import { StyleCard } from "./StyleCard";

interface StylePickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function StylePicker({ selected, onChange }: StylePickerProps) {
  const {
    data: styles,
    isLoading,
    error,
  } = $api.useQuery("get", "/styles");

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {styles?.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          selected={selected.includes(style.id)}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}
