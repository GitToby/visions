import { Home, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AddRoomCardProps {
  onAdd: (label: string) => void;
}

export function AddRoomCard({ onAdd }: AddRoomCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleConfirm = () => {
    const trimmed = toTitleCase(label.trim());
    if (!trimmed) return;
    onAdd(trimmed);
    setLabel("");
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLabel("");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  };

  if (isEditing) {
    return (
      <div className="card card-border bg-base-100 overflow-hidden">
        <div className="aspect-video bg-base-200 flex flex-col items-center justify-center gap-3 px-4">
          <Home size={28} strokeWidth={1.5} className="text-base-content/30" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Room name"
            value={label}
            onChange={(e) => setLabel(toTitleCase(e.target.value))}
            onKeyDown={handleKeyDown}
            className="input input-sm w-full text-center"
            maxLength={100}
          />
        </div>
        <div className="px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm flex-1"
            onClick={handleConfirm}
            disabled={!label.trim()}
          >
            Add room
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCancel}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="card card-border bg-base-100 overflow-hidden select-none cursor-pointer hover:shadow-md hover:border-primary/40 transition-all text-left w-full border-dashed"
    >
      <div className="aspect-video flex flex-col items-center justify-center gap-2 text-base-content/30 hover:text-primary transition-colors">
        <Plus size={36} strokeWidth={1.5} />
        <span className="text-xs">Add room</span>
      </div>
    </button>
  );
}
