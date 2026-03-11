import {
  AlertTriangle,
  CheckCircle,
  Images,
  type LucideIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ImageTile } from "@/components/ImageTile";
import { apiClient } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];

export type SlotState =
  | { status: "empty" }
  | { status: "no-image"; room: RoomResponse }
  | { status: "uploading"; preview: string }
  | { status: "uploaded"; room: RoomResponse; preview: string }
  | { status: "error"; preview: string; message: string };

export interface RoomSlotProps {
  label: string;
  Icon: LucideIcon;
  propertyId: string;
  state: SlotState;
  onStateChange: (state: SlotState) => void;
  onRoomAdded: (room: RoomResponse) => void;
  onRoomClick?: (room: RoomResponse) => void;
  onRemove?: () => void;
  onDelete?: (label: string) => void;
  completedCount?: number;
  pendingCount?: number;
}

export function RoomSlot({
  label,
  Icon,
  propertyId,
  state,
  onStateChange,
  onRoomAdded,
  onRoomClick,
  onRemove,
  onDelete,
  completedCount = 0,
  pendingCount = 0,
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
      await apiClient.DELETE("/properties/{property_id}/rooms/{room_id}", {
        params: {
          path: { property_id: propertyId, room_id: roomId },
        },
      });
      setIsDeleting(false);
      onStateChange({ status: "empty" });
      onDelete?.(label);
    },
    [state, propertyId, label, onStateChange, onDelete]
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
        ? await apiClient.PUT("/properties/{property_id}/rooms/{room_id}", {
            params: {
              path: {
                property_id: propertyId,
                room_id: existingRoomId,
              },
            },
            body: { image: file as unknown as string, label },
            bodySerializer: () => formData,
          })
        : await apiClient.POST("/properties/{property_id}/rooms", {
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
    [label, propertyId, state, onStateChange, onRoomAdded]
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
    if (file?.type.startsWith("image/")) void handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const openPicker = () => {
    if (!isBusy) inputRef.current?.click();
  };

  const handleCardClick = () => {
    if (state.status === "uploaded" && onRoomClick) {
      onRoomClick(state.room);
    } else {
      openPicker();
    }
  };

  const isUploading = state.status === "uploading";
  const isBusy = isUploading || isDeleting;
  const preview =
    state.status === "uploading" ||
    state.status === "uploaded" ||
    state.status === "error"
      ? state.preview
      : null;

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
      {/* biome-ignore lint/a11y/useSemanticElements: card with role="button" needed for complex layout */}
      <div
        role="button"
        tabIndex={isBusy ? -1 : 0}
        className={`card card-border bg-base-100 overflow-hidden select-none transition-all text-left w-full ${
          isBusy
            ? "cursor-wait"
            : "cursor-pointer hover:shadow-md hover:border-primary/40"
        } ${isDragOver ? "border-primary ring-2 ring-primary/30" : ""}`}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleCardClick();
        }}
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

        <ImageTile
          src={preview}
          alt={label}
          aspect="video"
          loading={isUploading}
          externalLink
          error={state.status === "error" ? state.message : null}
          topRight={
            state.status === "uploaded" ? (
              <span className="badge badge-sm badge-success shadow">
                <CheckCircle size={10} />
              </span>
            ) : undefined
          }
          bottomLeft={
            state.status === "uploaded" &&
            (completedCount > 0 || pendingCount > 0) ? (
              <>
                {completedCount > 0 && (
                  <span className="badge badge-sm badge-neutral shadow gap-1">
                    <Images size={9} />
                    {completedCount}
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="badge badge-sm badge-warning shadow gap-1">
                    <span className="loading loading-dots loading-xs" />
                    {pendingCount}
                  </span>
                )}
              </>
            ) : undefined
          }
          fallback={
            state.status === "no-image" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-warning">
                <AlertTriangle size={36} strokeWidth={1.5} />
                <span className="text-xs">No image uploaded</span>
              </div>
            ) : (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors ${
                  isDragOver ? "text-primary" : "text-base-content/30"
                }`}
              >
                <Icon size={36} strokeWidth={1.5} />
                <span className="text-xs">Drop photo here</span>
              </div>
            )
          }
        />

        {/* Footer */}
        <div className="px-3 py-2 flex items-center justify-between min-h-9">
          <span className="text-sm font-medium">{label}</span>
          {!isBusy && (
            <span className="text-xs text-base-content/40 flex items-center gap-0.5">
              {state.status === "uploaded" || state.status === "no-image" ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-xs btn-ghost hover:text-error"
                  title="Delete room"
                >
                  <Trash2 size={11} />
                </button>
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
      </div>
    </div>
  );
}
