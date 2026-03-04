import {
  Bath,
  Bed,
  CheckCircle,
  ChefHat,
  type LucideIcon,
  Monitor,
  RefreshCw,
  Sofa,
  Upload,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { apiClient } from "../../../lib/api/hooks";
import type { components } from "../../../lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];

interface RoomUploaderProps {
  houseId: string;
  onRoomAdded: (room: RoomResponse) => void;
}

const ROOM_TYPES: Array<{ label: string; Icon: LucideIcon }> = [
  { label: "Bathroom", Icon: Bath },
  { label: "Bedroom", Icon: Bed },
  { label: "Dining Room", Icon: UtensilsCrossed },
  { label: "Kitchen", Icon: ChefHat },
  { label: "Living Room", Icon: Sofa },
  { label: "Office", Icon: Monitor },
  { label: "Utility Room", Icon: Wrench },
];

type SlotState =
  | { status: "empty" }
  | { status: "uploading"; preview: string }
  | { status: "uploaded"; room: RoomResponse; preview: string }
  | { status: "error"; preview: string; message: string };

interface RoomSlotProps {
  label: string;
  Icon: LucideIcon;
  houseId: string;
  state: SlotState;
  onStateChange: (state: SlotState) => void;
  onRoomAdded: (room: RoomResponse) => void;
}

function RoomSlot({
  label,
  Icon,
  houseId,
  state,
  onStateChange,
  onRoomAdded,
}: RoomSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      onStateChange({ status: "uploading", preview });

      const formData = new FormData();
      formData.append("image", file);
      formData.append("label", label);

      const { data, error } = await apiClient.POST("/houses/{house_id}/rooms", {
        params: { path: { house_id: houseId } },
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
    [label, houseId, onStateChange, onRoomAdded]
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
    if (state.status !== "uploading") inputRef.current?.click();
  };

  const isUploading = state.status === "uploading";
  const hasImage =
    state.status === "uploading" ||
    state.status === "uploaded" ||
    state.status === "error";
  const preview = hasImage ? (state as { preview: string }).preview : null;

  return (
    <button
      type="button"
      className={`card card-border bg-base-100 overflow-hidden select-none transition-all text-left w-full ${
        isUploading
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
        {hasImage && preview ? (
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
      <div className="px-3 py-2 flex items-center justify-between min-h-[36px]">
        <span className="text-sm font-medium">{label}</span>
        {!isUploading && (
          <span className="text-xs text-base-content/40 flex items-center gap-1">
            {state.status === "uploaded" ? (
              <>
                <RefreshCw size={11} />
                Replace
              </>
            ) : (
              <>
                <Upload size={11} />
                Upload
              </>
            )}
          </span>
        )}
      </div>
    </button>
  );
}

export function RoomUploader({ houseId, onRoomAdded }: RoomUploaderProps) {
  const [slotStates, setSlotStates] = useState<Record<string, SlotState>>(
    Object.fromEntries(
      ROOM_TYPES.map(({ label }) => [label, { status: "empty" as const }])
    )
  );

  const handleStateChange = useCallback((label: string, state: SlotState) => {
    setSlotStates((prev) => ({ ...prev, [label]: state }));
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {ROOM_TYPES.map(({ label, Icon }) => (
        <RoomSlot
          key={label}
          label={label}
          Icon={Icon}
          houseId={houseId}
          state={slotStates[label]}
          onStateChange={(s) => handleStateChange(label, s)}
          onRoomAdded={onRoomAdded}
        />
      ))}
    </div>
  );
}
