import {
  AlertTriangle,
  Bath,
  Bed,
  CheckCircle,
  ChefHat,
  Home,
  type LucideIcon,
  Monitor,
  Plus,
  RefreshCw,
  Sofa,
  Trash2,
  Upload,
  UtensilsCrossed,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../../../lib/api/hooks";
import type { components } from "../../../lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];

interface RoomUploaderProps {
  propertyId: string;
  onRoomAdded: (room: RoomResponse) => void;
  initialRooms?: RoomResponse[];
}

const DEFAULT_ROOM_TYPES: Array<{ label: string; Icon: LucideIcon }> = [
  { label: "Bathroom", Icon: Bath },
  { label: "Bedroom", Icon: Bed },
  { label: "Dining Room", Icon: UtensilsCrossed },
  { label: "Kitchen", Icon: ChefHat },
  { label: "Living Room", Icon: Sofa },
  { label: "Office", Icon: Monitor },
  { label: "Utility Room", Icon: Wrench },
];

const DEFAULT_LABELS = new Set(DEFAULT_ROOM_TYPES.map((r) => r.label));

type SlotState =
  | { status: "empty" }
  | { status: "no-image"; room: RoomResponse }
  | { status: "uploading"; preview: string }
  | { status: "uploaded"; room: RoomResponse; preview: string }
  | { status: "error"; preview: string; message: string };

interface RoomSlotProps {
  label: string;
  Icon: LucideIcon;
  propertyId: string;
  state: SlotState;
  onStateChange: (state: SlotState) => void;
  onRoomAdded: (room: RoomResponse) => void;
  onRemove?: () => void;
  onDelete?: (label: string) => void;
}

function RoomSlot({
  label,
  Icon,
  propertyId,
  state,
  onStateChange,
  onRoomAdded,
  onRemove,
  onDelete,
}: RoomSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const roomId =
        state.status === "uploaded" || state.status === "no-image"
          ? state.room.id
          : null;
      if (!roomId) return;
      setIsDeleting(true);
      await apiClient.DELETE("/houses/{property_id}/rooms/{room_id}", {
        params: { path: { property_id: propertyId, room_id: roomId } },
      });
      setIsDeleting(false);
      onStateChange({ status: "empty" });
      onDelete?.(label);
    },
    [state, propertyId, label, onStateChange, onDelete],
  );

  const handleFile = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      onStateChange({ status: "uploading", preview });

      const formData = new FormData();
      formData.append("image", file);
      formData.append("label", label);

      const existingRoomId =
        state.status === "uploaded" || state.status === "no-image"
          ? state.room.id
          : null;

      const { data, error } = existingRoomId
        ? await apiClient.PUT("/houses/{property_id}/rooms/{room_id}", {
            params: { path: { property_id: propertyId, room_id: existingRoomId } },
            body: { image: file as unknown as string, label },
            bodySerializer: () => formData,
          })
        : await apiClient.POST("/houses/{property_id}/rooms", {
            params: { path: { property_id: propertyId } },
            body: { image: file as unknown as string, label },
            bodySerializer: () => formData,
          });

      if (error || !data) {
        onStateChange({
          status: "error",
          preview,
          message: "Upload failed. Try again.",
        });
        return;
      }

      onStateChange({ status: "uploaded", room: data, preview });
      onRoomAdded(data);
    },
    [label, propertyId, state, onStateChange, onRoomAdded],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const openPicker = () => {
    if (!isBusy) inputRef.current?.click();
  };

  const isUploading = state.status === "uploading";
  const isBusy = isUploading || isDeleting;
  const hasImage =
    state.status === "uploading" ||
    state.status === "uploaded" ||
    state.status === "error";
  const preview = hasImage ? (state as { preview: string }).preview : null;

  return (
    <div className="relative group">
      {onRemove && state.status === "empty" && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 z-10 btn btn-circle btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove room"
        >
          <X size={12} />
        </button>
      )}
      <button
        type="button"
        className={`card card-border bg-base-100 overflow-hidden select-none transition-all text-left w-full ${
          isBusy
            ? "cursor-wait"
            : "cursor-pointer hover:shadow-md hover:border-primary/40"
        } ${isDragOver ? "border-primary ring-2 ring-primary/30" : ""}`}
        onClick={openPicker}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Image / placeholder area */}
        <div className="relative aspect-video bg-base-200">
          {state.status === "no-image" ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-warning">
              <AlertTriangle size={36} strokeWidth={1.5} />
              <span className="text-xs">No image uploaded</span>
            </div>
          ) : hasImage && preview ? (
            <>
              <img
                src={preview}
                alt={label}
                className="w-full h-full object-cover"
              />
              {isUploading && (
                <div className="absolute inset-0 bg-base-100/50 flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              )}
              {state.status === "uploaded" && (
                <div className="absolute top-2 right-2">
                  <span className="badge badge-success badge-sm gap-1 shadow">
                    <CheckCircle size={10} />
                    Uploaded
                  </span>
                </div>
              )}
              {state.status === "error" && (
                <div className="absolute inset-0 bg-error/30 flex items-center justify-center p-2">
                  <span className="text-error text-xs font-semibold text-center">
                    {(state as { message: string }).message}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div
              className={`w-full h-full flex flex-col items-center justify-center gap-2 transition-colors ${
                isDragOver ? "text-primary" : "text-base-content/30"
              }`}
            >
              <Icon size={36} strokeWidth={1.5} />
              <span className="text-xs">Drop photo here</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 flex items-center justify-between min-h-9">
          <span className="text-sm font-medium">{label}</span>
          {!isBusy && (
            <span className="text-xs text-base-content/40 flex items-center gap-2">
              {state.status === "uploaded" || state.status === "no-image" ? (
                <>
                  <button type="button" className="btn btn-xs btn-ghost">
                    <RefreshCw size={11} />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="btn btn-xs btn-ghost hover:text-error"
                    title="Delete room"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              ) : (
                <>
                  <Upload size={11} />
                  Upload
                </>
              )}
            </span>
          )}
          {isDeleting && (
            <span className="loading loading-spinner loading-xs text-base-content/40" />
          )}
        </div>
      </button>
    </div>
  );
}

function AddRoomCard({ onAdd }: { onAdd: (label: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleConfirm = () => {
    const trimmed = label.trim();
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
            onChange={(e) => setLabel(e.target.value)}
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

export function RoomUploader({
  propertyId,
  onRoomAdded,
  initialRooms = [],
}: RoomUploaderProps) {
  const [customLabels, setCustomLabels] = useState<string[]>(() =>
    initialRooms
      .filter((r) => !DEFAULT_LABELS.has(r.label))
      .map((r) => r.label),
  );

  const [slotStates, setSlotStates] = useState<Record<string, SlotState>>(
    () => {
      const states: Record<string, SlotState> = Object.fromEntries(
        DEFAULT_ROOM_TYPES.map(({ label }) => [
          label,
          { status: "empty" as const },
        ]),
      );
      for (const room of initialRooms) {
        states[room.label] = room.image_url
          ? { status: "uploaded", room, preview: room.image_url }
          : { status: "no-image", room };
      }
      return states;
    },
  );

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const handleStateChange = useCallback((label: string, state: SlotState) => {
    setSlotStates((prev) => ({ ...prev, [label]: state }));
  }, []);

  const handleAddCustom = (label: string) => {
    if (label in slotStates) return; // already exists
    setCustomLabels((prev) => [...prev, label]);
    setSlotStates((prev) => ({ ...prev, [label]: { status: "empty" } }));
  };

  const handleRemoveCustom = (label: string) => {
    setCustomLabels((prev) => prev.filter((l) => l !== label));
    setSlotStates((prev) => {
      const next = { ...prev };
      delete next[label];
      return next;
    });
  };

  return (
    <div className="relative">
      {toast && (
        <div className="toast toast-end z-50 pointer-events-none">
          <div className="alert alert-success text-sm gap-2 py-2">
            <CheckCircle size={14} />
            <span>{toast}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {DEFAULT_ROOM_TYPES.map(({ label, Icon }) => (
          <RoomSlot
            key={label}
            label={label}
            Icon={Icon}
            propertyId={propertyId}
            state={slotStates[label]}
            onStateChange={(s) => handleStateChange(label, s)}
            onRoomAdded={onRoomAdded}
            onDelete={(l) => showToast(`${l} deleted`)}
          />
        ))}
        {customLabels.map((label) => (
          <RoomSlot
            key={label}
            label={label}
            Icon={Home}
            propertyId={propertyId}
            state={slotStates[label]}
            onStateChange={(s) => handleStateChange(label, s)}
            onRoomAdded={onRoomAdded}
            onRemove={() => handleRemoveCustom(label)}
            onDelete={(l) => {
              handleRemoveCustom(label);
              showToast(`${l} deleted`);
            }}
          />
        ))}
        <AddRoomCard onAdd={handleAddCustom} />
      </div>
    </div>
  );
}
